from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class LearnerCreate(BaseModel):
    name: str
    interests: list[str] = Field(default_factory=list)
    experience_level: str = "beginner"
    learning_style: str = "mixed"
    time_budget: int = 5


class LearnerUpdate(BaseModel):
    name: str | None = None
    interests: list[str] | None = None
    experience_level: str | None = None
    learning_style: str | None = None
    time_budget: int | None = None



class GoalInput(BaseModel):
    goal: str


class ParsedGoal(BaseModel):
    domain: str | None = None
    skill_targets: list[str] = Field(default_factory=list)
    weekly_hours: int | None = None


class LearnerOut(BaseModel):
    id: int
    name: str
    goal: str
    interests: list[str]
    experience_level: str
    learning_style: str
    time_budget: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ResourceOut(BaseModel):
    id: int
    type: str
    title: str
    url: str
    est_hours: int
    media_type: str
    skills_taught: list[str]
    domain: str = ""

    model_config = {"from_attributes": True}

    @field_validator("skills_taught", mode="before")
    @classmethod
    def _names(cls, v):
        return [getattr(s, "name", s) for s in v]

    @field_validator("domain", mode="before")
    @classmethod
    def _domain(cls, v, info):
        # computed from underlying ORM object if available
        data = info.data if hasattr(info, "data") else {}
        # info.data contains already-validated fields; try to infer from original object
        return v or ""


class PathNodeOut(BaseModel):
    id: int
    position: int
    milestone: int
    reason: str
    status: str
    resource: ResourceOut

    model_config = {"from_attributes": True}


class PathOut(BaseModel):
    id: int
    learner_id: int
    goal: str
    status: str
    version: int
    created_at: datetime
    nodes: list[PathNodeOut]

    model_config = {"from_attributes": True}


class CandidateOut(BaseModel):
    resource: ResourceOut
    score: float
    coverage: int
    reasons: list[str]


class ChatRequest(BaseModel):
    learner_id: int | None = None
    question: str


class ChatResponse(BaseModel):
    answer: str


class EnrollInput(BaseModel):
    resource_id: int


class ProgressInput(BaseModel):
    status: str = "done"
    score: float | None = None


class FeedbackInput(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class DashboardOut(BaseModel):
    learner_id: int
    progress_percent: float
    milestones_total: int
    milestones_done: int
    known_skills: list[str]
    next_actions: list[str]
    ongoing: list[ResourceOut] = Field(default_factory=list)
    recommended: list[ResourceOut] = Field(default_factory=list)