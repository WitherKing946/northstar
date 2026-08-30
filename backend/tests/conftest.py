import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
# Force all LLM calls to fail fast so tests exercise the deterministic fallback path.
os.environ["OLLAMA_BASE_URL"] = "http://127.0.0.1:1"
os.environ["LLM_TIMEOUT"] = "0.5"

import pytest  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app import seed_catalog, models  # noqa: E402


@pytest.fixture()
def db() -> Session:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal

    session = SessionLocal()
    seed_catalog.seed(session)
    session.expire_all()
    yield session
    session.close()


@pytest.fixture()
def skills(db):
    return {s.name: s for s in db.query(models.Skill).all()}


@pytest.fixture()
def beginner(db):
    learner = models.Learner(name="Beginner", interests=["data science"], experience_level="beginner", time_budget=10)
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


def make_learner(db, **kwargs):
    learner = models.Learner(**kwargs)
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner