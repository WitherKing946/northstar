from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..llm.client import LLMService
from ..engine.recommendation import known_skill_ids_for

router = APIRouter(prefix="/learners", tags=["learners"])


@router.post("", response_model=schemas.LearnerOut)
def create_learner(payload: schemas.LearnerCreate, db: Session = Depends(get_db)):
    learner = models.Learner(**payload.model_dump())
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


@router.get("", response_model=list[schemas.LearnerOut])
def list_learners(db: Session = Depends(get_db)):
    return db.query(models.Learner).all()


@router.get("/{learner_id}", response_model=schemas.LearnerOut)
def get_learner(learner_id: int, db: Session = Depends(get_db)):
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")
    return learner


@router.patch("/{learner_id}", response_model=schemas.LearnerOut)
def update_learner(learner_id: int, payload: schemas.LearnerUpdate, db: Session = Depends(get_db)):
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(learner, key, val)
    db.commit()
    db.refresh(learner)
    return learner



@router.post("/{learner_id}/goals", response_model=schemas.ParsedGoal)
def parse_goal(learner_id: int, payload: schemas.GoalInput, db: Session = Depends(get_db)):
    learner = db.get(models.Learner, learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")
    parsed = LLMService(db).parse_goal(payload.goal)
    learner.goal = payload.goal
    domain = parsed.get("domain")
    if domain and domain not in learner.interests:
        learner.interests.append(domain)
    weekly = parsed.get("weekly_hours")
    if weekly:
        learner.time_budget = weekly
    db.commit()
    return parsed