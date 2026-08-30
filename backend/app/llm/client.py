from __future__ import annotations

import json
import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from .. import models
from ..config import settings


class LLMService:
    def __init__(self, db: Session):
        self.db = db
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.LLM_MODEL
        self.timeout = settings.LLM_TIMEOUT

    def _chat(self, messages: list[dict], *, temperature: float = 0.2, max_tokens: int = 512) -> str | None:
        try:
            resp = httpx.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception:
            return None

    # -- goal parsing -----------------------------------------------------
    def parse_goal(self, goal_text: str) -> dict[str, Any]:
        llm = self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You extract learning goals into JSON. Reply with ONLY a JSON object of the form "
                        '{"domain": "<one of: web development | data science | digital marketing | other>", '
                        '"skill_targets": ["<skill name>"], "weekly_hours": <int or null>}. '
                        "Use an empty array when no target skill is obvious."
                    ),
                },
                {"role": "user", "content": goal_text},
            ],
            temperature=0.1,
        )
        parsed = self._parse_json(llm) if llm else None
        if parsed is not None:
            return self._normalize(parsed, goal_text)
        return self._fallback_parse(goal_text)

    def _parse_json(self, text: str) -> dict[str, Any] | None:
        try:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            return json.loads(text[start : end + 1])
        except Exception:
            return None

    def _normalize(self, parsed: dict[str, Any], goal_text: str) -> dict[str, Any]:
        domain = self._match_domain(str(parsed.get("domain", "")))
        skills = parsed.get("skill_targets")
        target_skills = (
            [str(s).strip() for s in skills if isinstance(s, str) and s.strip()]
            if isinstance(skills, list)
            else []
        )
        weekly = parsed.get("weekly_hours")
        if not isinstance(weekly, int):
            weekly = self._extract_weekly_hours(goal_text)
        if not target_skills:
            target_skills = self._keyword_skills(goal_text, domain)
        return {"domain": domain, "skill_targets": target_skills, "weekly_hours": weekly}

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
        llm = self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a friendly learning coach. In 1-2 sentences, explain why the learner should "
                        "study this item next, given their goal and the engine's reason. Do not invent material."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Goal: {goal}\nItem: {title}\nReason: {reason}",
                },
            ]
        )
        return llm.strip() if llm else reason

    def answer_question(self, question: str, goal: str, path_summary: str) -> str:
        llm = self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "You are the North Star learning assistant. Answer concisely using ONLY the learner's "
                        "goal and current roadmap below. If you do not know, say so.\n"
                        f"Goal: {goal}\nRoadmap: {path_summary}"
                    ),
                },
                {"role": "user", "content": question},
            ]
        )
        if llm:
            return llm.strip()
        return "I can't reach my language model right now. Try again in a moment."