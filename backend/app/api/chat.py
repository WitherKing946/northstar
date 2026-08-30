from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..llm.client import LLMService

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    llm = LLMService(db)
    goal = "No goal set yet."
    summary = ""
    learner = None

    if payload.learner_id:
        learner = db.get(models.Learner, payload.learner_id)

    if learner is None:
        learner = db.query(models.Learner).order_by(models.Learner.id.desc()).first()

    if learner:
        goal = learner.goal or goal
        path = db.query(models.Path).filter_by(learner_id=learner.id).order_by(models.Path.id.desc()).first()
        if path:
            summary = "; ".join(
                f"Step {n.position + 1}: {n.resource.title} ({n.status})" for n in path.nodes[:8]
            )

    answer = llm.answer_question(payload.question, goal, summary or "No active path yet.")
    return schemas.ChatResponse(answer=answer)