"""Prerequisite ordering is law: generated paths must never violate a skill edge."""
import networkx as nx

from app import models
from app.engine.skill_graph import (
    build_skill_graph,
    gap_skills,
    needed_skills,
    topo_order,
)
from app.engine import path_generator


def _position_of_titles(nodes):
    return [n["resource"].title for n in nodes]


def test_gap_analysis_finds_full_chain(db, skills, beginner):
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    target = {skills["Machine Learning"].id}
    gap = gap_skills(graph, topo, set(), target)
    names = {graph.nodes[sid]["name"] for sid in gap}
    # beginner needs every ancestor, including the target
    for expected in ["Python Basics", "NumPy", "Pandas", "Statistics", "Linear Algebra", "Machine Learning"]:
        assert expected in names


def test_gap_analysis_shrinks_for_advanced_learner(db, skills):
    learner = models.Learner(
        name="Pro", interests=["data science"], experience_level="advanced", time_budget=10
    )
    db.add(learner)
    db.commit()
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    from app.engine.recommendation import known_skill_ids_for

    known = known_skill_ids_for(db, learner)
    gap = gap_skills(graph, topo, known, {skills["Deep Learning"].id})
    names = {graph.nodes[sid]["name"] for sid in gap}
    assert names == {"Deep Learning"}  # advanced data-science baseline covers everything below it


def test_generated_path_violates_no_prerequisite(db, skills, beginner):
    targets = {skills["Machine Learning"].id}
    nodes = path_generator.generate_path(db, beginner, targets)
    graph = build_skill_graph(db)

    skills_reached: set[int] = set()
    for node in nodes:
        for sid in (s.id for s in node["resource"].skills_taught):
            for prereq in graph.predecessors(sid):
                # if the prereq is part of what this path needs, it must be learned already
                if prereq in needed_skills(graph, targets):
                    assert prereq in skills_reached, (
                        f"{node['resource'].title} teaches {graph.nodes[sid]['name']} "
                        f"but its prerequisite {graph.nodes[prereq]['name']} comes earlier"
                    )
        skills_reached.update(s.id for s in node["resource"].skills_taught)


def test_generated_path_covers_all_gap_skills(db, skills, beginner):
    targets = {skills["Machine Learning"].id}
    nodes = path_generator.generate_path(db, beginner, targets)
    taught = {s.id for n in nodes for s in n["resource"].skills_taught if n["resource"].type != "assessment"}
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    gap = gap_skills(graph, topo, set(), targets)
    assert set(gap) <= taught


def test_path_ends_with_assessment_checkpoint(db, skills, beginner):
    nodes = path_generator.generate_path(db, beginner, {skills["Machine Learning"].id})
    assert nodes[-1]["resource"].type == "assessment"


def test_assessments_are_never_selected_as_learning_resources(db, skills, beginner):
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    selected = path_generator._select_resources(db, beginner, {skills["Machine Learning"].id}, graph, topo)
    assert all(r.type != "assessment" for r in selected)


def test_skill_graph_is_acyclic(db):
    graph = build_skill_graph(db)
    assert nx.is_directed_acyclic_graph(graph)