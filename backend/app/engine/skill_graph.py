from __future__ import annotations

import networkx as nx
from sqlalchemy.orm import Session

from .. import models


def build_skill_graph(db: Session) -> nx.DiGraph:
    G = nx.DiGraph()
    skills = db.query(models.Skill).all()
    for s in skills:
        G.add_node(s.id, name=s.name, domain=s.domain, difficulty=s.difficulty)
    for s in skills:
        for p in s.prereqs:
            G.add_edge(p.id, s.id)  # prereq skill -> skill
    return G


def topo_order(db: Session, graph: nx.DiGraph) -> list[int]:
    if not nx.is_directed_acyclic_graph(graph):
        raise ValueError("Skill graph contains a cycle; cannot order prerequisites")
    return list(nx.topological_sort(graph))


def needed_skills(graph: nx.DiGraph, target_skill_ids: set[int]) -> set[int]:
    """Every skill required before the learner reaches the targets (incl. targets)."""
    needed = set(target_skill_ids)
    for t in target_skill_ids:
        needed.update(nx.ancestors(graph, t))
    return needed


def gap_skills(
    graph: nx.DiGraph, topo: list[int], known_skill_ids: set[int], target_skill_ids: set[int]
) -> list[int]:
    """Missing skills required for the targets, ordered by prerequisites first."""
    needed = needed_skills(graph, set(target_skill_ids))
    return [sid for sid in topo if sid in needed and sid not in known_skill_ids]


def resource_meta_graph(selected: list[models.Resource], graph: nx.DiGraph) -> nx.DiGraph:
    """Resource-level DAG: resource A -> resource B when A teaches a skill that a skill taught by B depends on."""
    teaches: dict[int, set[int]] = {r.id: {s.id for s in r.skills_taught} for r in selected}
    ids = [r.id for r in selected]
    G = nx.DiGraph()
    G.add_nodes_from(ids)
    for a, b in ((aid, bid) for aid in ids for bid in ids):
        if a == b:
            continue
        if any(sa != sb and nx.has_path(graph, sa, sb) for sa in teaches[a] for sb in teaches[b]):
            G.add_edge(a, b)
    return G