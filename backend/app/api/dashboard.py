from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..engine.recommendation import known_skill_ids_for

router = APIRouter(tags=["dashboard"])


@router.get("/learners/{learner_id}/dashboard", response_model=schemas.DashboardOut)
def dashboard(learner_id: int, db: Session = Depends(get_db)):
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")

    path = db.query(models.Path).filter_by(learner_id=learner_id).order_by(models.Path.id.desc()).first()
    nodes = path.nodes if path else []
    done_nodes = [n for n in nodes if n.status == "done"]
    progress_percent = round(100 * len(done_nodes) / len(nodes), 1) if nodes else 0.0

    milestones = sorted({n.milestone for n in nodes})
    milestones_done = len({n.milestone for n in done_nodes})

    known = known_skill_ids_for(db, learner)
    known_names = [
        s.name
        for s in db.query(models.Skill).all()
        if s.id in known and learner.experience_level in ("beginner", "intermediate", "advanced")
    ]

    next_actions = []
    for n in nodes:
        if n.status in ("queued", "in_progress"):
            next_actions.append(n.resource.title)
        if len(next_actions) == 3:
            break

    return schemas.DashboardOut(
        learner_id=learner_id,
        progress_percent=progress_percent,
        milestones_total=len(milestones),
        milestones_done=milestones_done,
        known_skills=sorted(set(known_names)),
        next_actions=next_actions,
    )