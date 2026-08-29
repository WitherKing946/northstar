from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


resource_skills = Table(
    "resource_skills",
    Base.metadata,
    Column("resource_id", ForeignKey("resources.id"), primary_key=True),
    Column("skill_id", ForeignKey("skills.id"), primary_key=True),
)

skill_edges = Table(
    "skill_edges",
    Base.metadata,
    Column("skill_id", ForeignKey("skills.id"), primary_key=True),
    Column("prereq_id", ForeignKey("skills.id"), primary_key=True),
)

resource_prereqs = Table(
    "resource_prereqs",
    Base.metadata,
    Column("resource_id", ForeignKey("resources.id"), primary_key=True),
    Column("prereq_id", ForeignKey("resources.id"), primary_key=True),
)


class Learner(Base):
    __tablename__ = "learners"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    goal: Mapped[str] = mapped_column(Text, default="")
    interests: Mapped[list] = mapped_column(JSON, default=list)
    experience_level: Mapped[str] = mapped_column(String(20), default="beginner")
    learning_style: Mapped[str] = mapped_column(String(20), default="mixed")
    time_budget: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    paths: Mapped[list[Path]] = relationship(back_populates="learner")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    domain: Mapped[str] = mapped_column(String(50), index=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")

    prereqs: Mapped[list[Skill]] = relationship(
        secondary=skill_edges,
        primaryjoin=id == skill_edges.c.skill_id,
        secondaryjoin=id == skill_edges.c.prereq_id,
        backref="dependents",
    )


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(400), default="")
    est_hours: Mapped[int] = mapped_column(Integer, default=10)
    media_type: Mapped[str] = mapped_column(String(20), default="video")

    skills_taught: Mapped[list[Skill]] = relationship(secondary=resource_skills)

    direct_prereqs: Mapped[list[Resource]] = relationship(
        secondary=resource_prereqs,
        primaryjoin=id == resource_prereqs.c.resource_id,
        secondaryjoin=id == resource_prereqs.c.prereq_id,
    )


class Path(Base):
    __tablename__ = "paths"

    id: Mapped[int] = mapped_column(primary_key=True)
    learner_id: Mapped[int] = mapped_column(ForeignKey("learners.id"))
    goal: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    learner: Mapped[Learner] = relationship(back_populates="paths")
    nodes: Mapped[list[PathNode]] = relationship(back_populates="path", order_by="PathNode.position")


class PathNode(Base):
    __tablename__ = "path_nodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    path_id: Mapped[int] = mapped_column(ForeignKey("paths.id"))
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    position: Mapped[int] = mapped_column(Integer)
    milestone: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="queued")

    path: Mapped[Path] = relationship(back_populates="nodes")
    resource: Mapped[Resource] = relationship()


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    learner_id: Mapped[int] = mapped_column(ForeignKey("learners.id"))
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    status: Mapped[str] = mapped_column(String(20), default="done")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    path_node_id: Mapped[int] = mapped_column(ForeignKey("path_nodes.id"))
    rating: Mapped[int] = mapped_column(Integer, default=3)
    comment: Mapped[str] = mapped_column(Text, default="")