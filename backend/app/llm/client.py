from __future__ import annotations

import json
import re
from typing import Any

import httpx
from sqlalchemy.orm import Session

from .. import models
from ..config import settings


class LLMService:
    """Hybrid AI Engine — live LLM when API key / server available, with grounded deterministic fallback."""

    def __init__(self, db: Session):
        self.db = db

    # -- goal parsing -----------------------------------------------------
    def parse_goal(self, goal_text: str) -> dict[str, Any]:
        if settings.OPENAI_API_KEY or settings.GROQ_API_KEY or settings.OLLAMA_BASE_URL:
            try:
                llm_parsed = self._llm_parse_goal(goal_text)
                if llm_parsed and (llm_parsed.get("domain") or llm_parsed.get("skill_targets")):
                    return llm_parsed
            except Exception as e:
                print(f"[LLMService] Live parse failed, using fallback: {e}")

        return self._fallback_parse(goal_text)

    def _llm_parse_goal(self, goal_text: str) -> dict[str, Any] | None:
        prompt = (
            f"Extract structured learning goal details from this text: '{goal_text}'.\n"
            "Return valid JSON strictly with format: "
            '{"domain": "web development|data science|digital marketing", "skill_targets": ["skill1", "skill2"], "weekly_hours": number or null}'
        )
        resp_text = self._call_llm_api(prompt, max_tokens=150)
        if not resp_text:
            return None

        m = re.search(r"\{.*\}", resp_text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        return None

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

    # -- explanations & Q&A -----------------------------------------------
    def explain_node(self, title: str, reason: str, goal: str) -> str:
        if not reason:
            return f"Next up: {title} — a solid step toward your goal."

        if settings.OPENAI_API_KEY or settings.GROQ_API_KEY:
            try:
                prompt = (
                    f"Explain why '{title}' is the next step for a learner whose goal is '{goal}'.\n"
                    f"Core prerequisite reason from engine: '{reason}'. Keep explanation under 2 sentences."
                )
                res = self._call_llm_api(prompt, max_tokens=100)
                if res:
                    return res.strip()
            except Exception as e:
                print(f"[LLMService] Live explain failed: {e}")

        goal_hint = goal.strip().split(".")[0][:80] if goal else title
        return f"{reason} That's why “{title}” comes next for your goal: {goal_hint}."

    def answer_question(self, question: str, goal: str, path_summary: str) -> str:
        if settings.OPENAI_API_KEY or settings.GROQ_API_KEY or settings.OLLAMA_BASE_URL:
            try:
                prompt = (
                    "You are North Star AI, a personalized learning assistant.\n"
                    f"Learner Goal: {goal}\n"
                    f"Current Roadmap Summary: {path_summary}\n\n"
                    f"Learner Question: {question}\n\n"
                    "Answer concisely, grounded strictly in the learner's goal and prerequisite roadmap."
                )
                res = self._call_llm_api(prompt, max_tokens=250)
                if res:
                    return res.strip()
            except Exception as e:
                print(f"[LLMService] Live Q&A failed: {e}")

        # Deterministic fallback answer
        q = question.lower()
        if "why" in q and "first" in q:
            return f"Your first step was chosen because it fills the earliest prerequisite gap for your goal: {goal}. {path_summary.split(chr(10))[0] if path_summary else ''}"
        if "skip" in q:
            return "You can skip a checkpoint, but finishing it helps us track your real progress. Milestones update automatically when you complete steps."
        if "stuck" in q or "struggle" in q:
            return "If you're stuck, try the previous step again or ask for a different media type. Your path re-ranks when you mark a step as finished."
        return f"For your goal “{goal}”, your current path is: {path_summary[:300]}. Ask about any step and I'll explain why it's there."

    # -- HTTP LLM Provider Dispatch ---------------------------------------
    def _call_llm_api(self, prompt: str, max_tokens: int = 200) -> str | None:
        timeout = settings.LLM_TIMEOUT

        # 1. Groq API
        if settings.GROQ_API_KEY:
            headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": settings.LLM_MODEL if settings.LLM_MODEL != "embedded" else "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            }
            with httpx.Client(timeout=timeout) as client:
                r = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if r.status_code == 200:
                    return r.json()["choices"][0]["message"]["content"]

        # 2. OpenAI API
        if settings.OPENAI_API_KEY:
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": settings.LLM_MODEL if settings.LLM_MODEL != "embedded" else "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            }
            with httpx.Client(timeout=timeout) as client:
                r = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if r.status_code == 200:
                    return r.json()["choices"][0]["message"]["content"]

        # 3. Ollama Local Endpoint
        if settings.OLLAMA_BASE_URL:
            url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
            payload = {
                "model": settings.LLM_MODEL if settings.LLM_MODEL != "embedded" else "gemma3:4b",
                "prompt": prompt,
                "stream": False,
            }
            with httpx.Client(timeout=timeout) as client:
                r = client.post(url, json=payload)
                if r.status_code == 200:
                    return r.json().get("response")

        return None
