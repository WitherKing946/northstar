from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from .. import models


class LLMService:
    """Embedded AI — no external server. Deterministic, grounded, always available."""

    def __init__(self, db: Session):
        self.db = db

    # -- goal parsing -----------------------------------------------------
    def parse_goal(self, goal_text: str) -> dict[str, Any]:
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
        if not reason:
            return f"Next up: {title} — a solid step toward your goal."
        # Embedded templated explanation grounded on engine reason
        goal_hint = goal.strip().split(".")[0][:80] if goal else title
        return f"{reason} That's why “{title}” comes next for your goal: {goal_hint}."

    def answer_question(self, question: str, goal: str, path_summary: str) -> str:
        q = question.lower()
        if "why" in q and "first" in q:
            return f"Your first step was chosen because it fills the earliest prerequisite gap for your goal: {goal}. {path_summary.split(chr(10))[0] if path_summary else ''}"
        if "skip" in q:
            return "You can skip a checkpoint, but finishing it helps us track your real progress. Milestones update automatically when you complete steps."
        if "stuck" in q or "struggle" in q:
            return "If you're stuck, try the previous step again or ask for a different media type. Your path re-ranks when you mark a step as finished."
        # Generic grounded answer
        return f"For your goal “{goal}”, your current path is: {path_summary[:300]}. Ask about any step and I'll explain why it's there."
