"""Recommendation engine: scoring must reward gap-filling and punish already-known content."""
from app import models
from app.engine.recommendation import (
    known_skill_ids_for,
    score_resources,
)
from app.engine.skill_graph import build_skill_graph


def test_known_skills_from_completed_courses(db, beginner, skills):
    python = db.query(models.Resource).filter_by(title="Python for Data Science").one()
    db.add(
        models.Progress(learner_id=beginner.id, resource_id=python.id, status="done")
    )
    db.commit()
    known = known_skill_ids_for(db, beginner)
    assert skills["Python Basics"].id in known


def test_gap_covering_resource_scores_higher_than_unrelated(db, beginner):
    graph = build_skill_graph(db)
    targets = {next(s for s in db.query(models.Skill).all() if s.name == "Machine Learning").id}
    scores = score_resources(db, beginner, targets, graph)
    by_title = {d["resource"].title: d for d in scores}
    assert by_title["Machine Learning Foundations"]["score"] > by_title["SEO: Search Engine Optimization"]["score"]


def test_completed_resources_are_excluded(db, beginner):
    python = db.query(models.Resource).filter_by(title="Python for Data Science").one()
    db.add(models.Progress(learner_id=beginner.id, resource_id=python.id, status="done"))
    db.commit()
    graph = build_skill_graph(db)
    scores = score_resources(db, beginner, {python.skills_taught[0].id}, graph)
    titles = {d["resource"].title for d in scores}
    assert "Python for Data Science" not in titles


def test_matches_learner_learning_style(db):
    learner = models.Learner(
        name="Reader", interests=["data science"], experience_level="intermediate", learning_style="reading"
    )
    db.add(learner)
    db.commit()
    graph = build_skill_graph(db)
    scores = score_resources(db, learner, set(), graph, include_completed=True)
    reading = [d for d in scores if d["resource"].media_type == "reading"]
    video = [d for d in scores if d["resource"].media_type == "video"]
    assert reading[0]["score"] > video[0]["score"]