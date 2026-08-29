from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..engine import path_generator

router = APIRouter(tags=["paths"])


def _target_skills(db: Session, learner: models.Learner, parsed: dict) -> set[int]:
    names = parsed.get("skill_targets") or []
    skills = db.query(models.Skill).all()
    by_name = {s.name.lower(): s for s in skills}
    ids = {by_name[n.lower()].id for n in names if n.lower() in by_name}
    if not ids and parsed.get("domain"):
        domain_skills = db.query(models.Skill).filter_by(domain=parsed["domain"]).all()
        if domain_skills:
            # default to the most advanced skill in the domain
            order = {"beginner": 0, "intermediate": 1, "advanced": 2}
            ids = {max(domain_skills, key=lambda s: order.get(s.difficulty, 0)).id}
    return ids


@router.post("/learners/{learner_id}/paths", response_model=schemas.PathOut)
def create_path(learner_id: int, db: Session = Depends(get_db)):
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")

    parsed = {"domain": None, "skill_targets": []}
    # reuse a goal parse already stored on the learner? We re-parse from the stored goal text.
    if learner.goal:
        from ..llm.client import LLMService

        parsed = LLMService(db).parse_goal(learner.goal)
    targets = _target_skills(db, learner, parsed)
    if not targets:
        raise HTTPException(400, "Could not determine target skills. Set a goal first.")

    nodes = path_generator.generate_path(db, learner, targets)
    if not nodes:
        raise HTTPException(404, "No learning path available for this goal")

    path = models.Path(learner_id=learner.id, goal=learner.goal or "personalized path")
    db.add(path)
    db.flush()
    for i, n in enumerate(nodes):
        db.add(
            models.PathNode(
                path_id=path.id,
                resource_id=n["resource"].id,
                position=i,
                milestone=n["milestone"],
                reason=n["reason"],
            )
        )
    db.commit()
    db.refresh(path)
    return path


@router.get("/paths/{path_id}/nodes", response_model=schemas.PathOut)
def get_path(path_id: int, db: Session = Depends(get_db)):
    path = db.get(models.Path, path_id)
    if path is None:
        raise HTTPException(404, "Path not found")
    return path


@router.post("/paths/{path_id}/nodes/{node_id}/done")
def complete_node(path_id: int, node_id: int, db: Session = Depends(get_db)):
    node = db.get(models.PathNode, node_id)
    if node is None or node.path_id != path_id:
        raise HTTPException(404, "Node not found")
    node.status = "done"
    db.add(
        models.Progress(
            learner_id=node.path.learner_id,
            resource_id=node.resource_id,
            status="done",
            completed_at=datetime.datetime.now(),
        )
    )
    # prevent echo: recompute once, one version bump
    path = db.get(models.Path, path_id)
    learner = db.get(models.Learner, path.learner_id)
    from ..llm.client import LLMService

    parsed = LLMService(db).parse_goal(learner.goal or "personalized path") if learner.goal else {
        "skill_targets": []
    }
    targets = _target_skills(db, learner, parsed) if learner.goal else set()
    if targets:
        path.version += 1
        try:
            path_generator.rerank_remaining(db, path, targets)
        except ValueError:
            pass
        db.commit()
    else:
        db.commit()
    return {"ok": True, "version": path.version}


@router.post("/paths/{path_id}/nodes/{node_id}/feedback")
def add_feedback(path_id: int, node_id: int, payload: schemas.FeedbackInput, db: Session = Depends(get_db)):
    node = db.get(models.PathNode, node_id)
    if node is None or node.path_id != path_id:
        raise HTTPException(404, "Node not found")
    db.add(models.Feedback(path_node_id=node_id, rating=payload.rating, comment=payload.comment))
    db.commit()
    return {"ok": True}