from __future__ import annotations

import os
import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from .. import models
from ..config import settings


class LLMService:
    """Embedded AI primary, with optional live providers (OpenAI/Groq/Ollama) grounded on the skill graph."""

    def __init__(self, db: Session):
        self.db = db

    def _external_chat(self, messages: list[dict], *, temperature: float = 0.2, max_tokens: int = 512) -> str | None:
        # Try OpenAI, then Groq, then Ollama — all OpenAI-compatible
        headers: dict[str, str] = {"Content-Type": "application/json"}
        url: str | None = None
        model = settings.LLM_MODEL if settings.LLM_MODEL != "embedded" else "gpt-4o-mini"
        api_key = ""

        if settings.OPENAI_API_KEY:
            url = "https://api.openai.com/v1/chat/completions"
            api_key = settings.OPENAI_API_KEY
            headers["Authorization"] = f"Bearer {api_key}"
        elif settings.GROQ_API_KEY:
            url = "https://api.groq.com/openai/v1/chat/completions"
            api_key = settings.GROQ_API_KEY
            headers["Authorization"] = f"Bearer {api_key}"
            model = "llama-3.1-8b-instant" if model == "embedded" else model
        elif settings.OLLAMA_BASE_URL:
            url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/v1/chat/completions"
            model = settings.LLM_MODEL

        if not url:
            return None

        try:
            resp = httpx.post(
                url,
                headers=headers,
                json={"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
                timeout=settings.LLM_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            return None

    # -- goal parsing -----------------------------------------------------
    def parse_goal(self, goal_text: str) -> dict[str, Any]:
        # Keep deterministic for reliability; external LLM is for explanations/answers
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
        domains = sorted({d for (d,) in self.db.query(models.Skill.domain).distinct()})
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
        live = self._external_chat(
            [
                {
                    "role": "system",
                    "content": "You are a friendly learning coach. In 1-2 sentences, explain why the learner should study this item next, given their goal and the engine's reason. Do not invent material. Ground your answer strictly on the provided reason.",
                },
                {"role": "user", "content": f"Goal: {goal}\nItem: {title}\nReason: {reason}"},
            ]
        )
        if live:
            return live.strip()
        if not reason:
            return f"Next up: {title} — a solid step toward your goal."
        goal_hint = goal.strip().split(".")[0][:80] if goal else title
        return f"{reason} That's why “{title}” comes next for your goal: {goal_hint}."

    def answer_question(self, question: str, goal: str, path_summary: str) -> str:
        live = self._external_chat(
            [
                {
                    "role": "system",
                    "content": f"You are the North Star learning assistant. Answer concisely using ONLY the learner's goal and current roadmap below. If you do not know, say so.\nGoal: {goal}\nRoadmap: {path_summary}",
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
        return f"For your goal “{goal}”, your current path is: {path_summary[:300]}. Ask about any step and I'll explain why it's there."
