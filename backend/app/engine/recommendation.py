from __future__ import annotations

from sqlalchemy.orm import Session

from .. import models
from .skill_graph import needed_skills

DIFFICULTY_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}

# learning_style -> matching media types
STYLE_MEDIA = {
    "visual": {"video"},
    "reading": {"reading"},
    "hands_on": {"hands_on", "project"},
    "mixed": {"video", "reading", "hands_on", "project"},
}

WEIGHTS = {"alignment": 0.4, "gap": 0.25, "level": 0.15, "style": 0.1, "time": 0.1}


def domain_interests(learner: models.Learner) -> set[str]:
    return {d.strip().lower() for d in (learner.interests or []) if isinstance(d, str) and d.strip()}


def known_skill_ids_for(db: Session, learner: models.Learner) -> set[int]:
    """Skills the learner demonstrably has: completed resource skills + baseline by experience level."""
    known: set[int] = set()
    progress = db.query(models.Progress).filter_by(learner_id=learner.id, status="done").all()
    for p in progress:
        r = db.get(models.Resource, p.resource_id)
        if r:
            known.update(s.id for s in r.skills_taught)

    level = DIFFICULTY_ORDER.get(learner.experience_level, 0)
    if level >= 1:
        baseline_levels = {"beginner"} if level == 1 else {"beginner", "intermediate"}
        interests = domain_interests(learner)
        skills = db.query(models.Skill).all()
        for s in skills:
            if s.difficulty in baseline_levels and (not interests or s.domain.lower() in interests):
                known.add(s.id)
    return known


def _level_fit(learner: models.Learner, taught_difficulties: list[str]) -> float:
    learner_idx = DIFFICULTY_ORDER.get(learner.experience_level, 0)
    if not taught_difficulties:
        return 0.5
    # Prefer content around the learner's level; penalize big jumps upward.
    scores = []
    for d in taught_difficulties:
        idx = DIFFICULTY_ORDER.get(d, 0)
        if learner_idx == 0 and idx > 1:
            scores.append(0.0)
        elif idx <= learner_idx:
            scores.append(1.0 if idx == learner_idx else 0.8)
        elif idx == learner_idx + 1:
            scores.append(0.6)
        else:
            scores.append(0.2)
    return sum(scores) / len(scores)


def _style_fit(learner: models.Learner, resource: models.Resource) -> float:
    style = (learner.learning_style or "mixed").lower()
    if style == "mixed":
        return 0.8
    return 1.0 if resource.media_type in STYLE_MEDIA.get(style, set()) else 0.4


def score_resources(
    db: Session,
    learner: models.Learner,
    target_skill_ids: set[int],
    graph,
    include_completed: bool = False,
) -> list[dict]:
    known = known_skill_ids_for(db, learner)
    needed = needed_skills(graph, target_skill_ids)
    gap = needed - known
    completed = {
        p.resource_id
        for p in db.query(models.Progress).filter_by(learner_id=learner.id, status="done")
    }

    results: list[dict] = []
    for r in db.query(models.Resource).all():
        if not include_completed and r.id in completed:
            continue
        taught = {s.id for s in r.skills_taught}
        taught_diffs = [s.difficulty for s in r.skills_taught]

        overlap = taught & needed
        coverage = len(overlap)
        # What share of this resource's content is on-target for the goal?
        relevance = (len(overlap) / len(taught)) if taught else 0.0
        gap_cov = (len(overlap & gap) / len(gap)) if gap else 0.0
        level = _level_fit(learner, taught_diffs)
        style = _style_fit(learner, r)
        weekly = max(1, r.est_hours)
        time_fit = min(1.0, learner.time_budget / weekly) if learner.time_budget else 0.5

        score = (
            WEIGHTS["alignment"] * relevance
            + WEIGHTS["gap"] * gap_cov
            + WEIGHTS["level"] * level
            + WEIGHTS["style"] * style
            + WEIGHTS["time"] * time_fit
        )

        reasons = []
        overlap = {s.id for s in r.skills_taught} & needed
        if overlap:
            names = [s.name for s in r.skills_taught if s.id in overlap]
            reasons.append(f"Covers {' + '.join(names)}, which your goal needs")
        gap_overlap = overlap & gap
        if gap_overlap:
            names = [s.name for s in r.skills_taught if s.id in gap_overlap]
            reasons.append(f"Fills prerequisite gap: {' + '.join(names)}")
        if len(reasons) < 2 and level >= 0.6:
            reasons.append("Matches your experience level")
        if len(reasons) < 2 and style >= 0.8:
            reasons.append("Matches your learning style")

        results.append(
            {
                "resource": r,
                "score": round(score, 3),
                "coverage": coverage,
                "reasons": reasons,
            }
        )
    results.sort(key=lambda d: d["score"], reverse=True)
    return results