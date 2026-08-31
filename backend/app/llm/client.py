from __future__ import annotations

import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from .. import models


class LLMService:
    """Ollama local primary, embedded deterministic fallback.

    Ollama is always tried first. If it's down or slow, the embedded
    grounded fallback kicks in so the app never breaks.
    """

    def __init__(self, db: Session):
        self.db = db

    def _ollama_chat(
        self,
        messages: list[dict],
        *,
        temperature: float = 0.2,
        max_tokens: int = 512,
    ) -> str | None:
        """Call Ollama's OpenAI-compatible chat endpoint."""
        base = settings.OLLAMA_BASE_URL.rstrip("/")
        if not base:
            return None
        try:
            resp = httpx.post(
                f"{base}/v1/chat/completions",
                headers={"Content-Type": "application/json"},
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=settings.LLM_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            return None

    # -- goal parsing -----------------------------------------------------
    def parse_goal(self, goal_text: str) -> dict[str, Any]:
        live = self._ollama_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a learning-path parser. Given a learner's goal, "
                        "return a JSON object with exactly these keys:\n"
                        "- domain: one of the following: 'web development', 'data science', 'digital marketing'\n"
                        "- skill_targets: a list of skill names (lowercase) the learner wants to acquire\n"
                        "- weekly_hours: integer or null if not mentioned\n\n"
                        "Return ONLY the JSON object, no markdown fences, no explanation."
                    ),
                },
                {"role": "user", "content": goal_text},
            ]
        )
        if live:
            import json
            try:
                cleaned = live.strip().removeprefix("```json").removesuffix("```").strip()
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict) and "domain" in parsed:
                    return parsed
            except Exception:
                pass
        return self._fallback_parse(goal_text)

    def _fallback_parse(self, goal_text: str) -> dict[str, Any]:
        domain = self._match_domain(goal_text) or "web development"
        target_skills = self._keyword_skills(goal_text, domain)
        return {
            "domain": domain,
            "skill_targets": target_skills,
            "weekly_hours": self._extract_weekly_hours(goal_text),
        }

    def _match_domain(self, text: str) -> str | None:
        text = (text or "").lower()
        try:
            domains = sorted({d for (d,) in self.db.query(models.Skill.domain).distinct()})
        except Exception:
            return None
        aliases: dict[str, list[str]] = {
            "web development": ["web", "frontend", "react", "javascript", "node", "full stack", "developer"],
            "data science": ["data", "machine learning", "ml", "analytics", "python"],
            "digital marketing": ["marketing", "seo", "social media", "content"],
        }
        for domain in domains:
            key = domain.lower()
            if key in text:
                return domain
        for domain, words in aliases.items():
            if any(w in text for w in words):
                return domain
        return None

    def _keyword_skills(self, goal_text: str, domain: str | None) -> list[str]:
        goals = goal_text.lower()
        hits = []
        for s in self.db.query(models.Skill).all():
            if s.name.lower() in goals and (domain is None or s.domain == domain):
                hits.append(s.name)
        return hits

    def _extract_weekly_hours(self, text: str) -> int | None:
        m = re.search(r"(\d+)\s*(?:hrs?|hours?)", text, re.IGNORECASE)
        if m:
            return int(m.group(1))
        return None

    # -- explanations -----------------------------------------------------
    def explain_node(self, title: str, reason: str, goal: str) -> str:
        live = self._ollama_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a friendly learning coach. In 1-2 sentences, explain "
                        "why the learner should study this item next, given their goal "
                        "and the engine's reason. Do not invent material. Ground your "
                        "answer strictly on the provided reason."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Goal: {goal}\nItem: {title}\nReason: {reason}",
                },
            ]
        )
        if live:
            return live.strip()
        if not reason:
            return f"Next up: {title} — a solid step toward your goal."
        goal_hint = goal.strip().split(".")[0][:80] if goal else title
        return f"{reason} That's why \"{title}\" comes next for your goal: {goal_hint}."

    # -- Q&A --------------------------------------------------------------
    def answer_question(self, question: str, goal: str, path_summary: str) -> str:
        live = self._ollama_chat(
            [
                {
                    "role": "system",
                    "content": (
                        f"You are the North Star learning assistant. Answer concisely "
                        f"using ONLY the learner's goal and current roadmap below. "
                        f"If you do not know, say so.\n"
                        f"Goal: {goal}\nRoadmap: {path_summary}"
                    ),
                },
                {"role": "user", "content": question},
            ]
        )
        if live:
            return live.strip()
        q = question.lower()
        if "why" in q and "first" in q:
            return f"Your first step was chosen because it fills the earliest prerequisite gap for your goal: {goal}. {path_summary.split(chr(10))[0] if path_summary else ''}"
        if "skip" in q:
            return "You can skip a checkpoint, but finishing it helps us track your real progress. Milestones update automatically when you complete steps."
        if "stuck" in q or "struggle" in q:
            return "If you're stuck, try the previous step again or ask for a different media type. Your path re-ranks when you mark a step as finished."
        return f"For your goal \"{goal}\", your current path is: {path_summary[:300]}. Ask about any step and I'll explain why it's there."
