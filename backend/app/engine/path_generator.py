from __future__ import annotations

import networkx as nx
from sqlalchemy.orm import Session

from .. import models
from .recommendation import known_skill_ids_for, score_resources
from .skill_graph import build_skill_graph, needed_skills, resource_meta_graph, topo_order


def _select_resources(
    db: Session,
    learner: models.Learner,
    target_skill_ids: set[int],
    graph,
    topo: list[int],
) -> list[models.Resource]:
    known = known_skill_ids_for(db, learner)
    needed = needed_skills(graph, set(target_skill_ids))
    remaining = (needed - known) | set(target_skill_ids)
    scores = score_resources(db, learner, set(target_skill_ids), graph)
    ranked = [d for d in scores if d["coverage"] > 0 and d["resource"].type != "assessment"]

    by_skill: dict[int, list[dict]] = {}
    for d in ranked:
        for s in d["resource"].skills_taught:
            by_skill.setdefault(s.id, []).append(d)

    chosen: list[models.Resource] = []
    chosen_ids: set[int] = set()
    while remaining:
        picked = None
        for sid in topo:
            if sid not in remaining:
                continue
            if sid in by_skill:
                for d in by_skill[sid]:
                    if d["resource"].id not in chosen_ids:
                        picked = d["resource"]
                        break
            if picked:
                break
        if picked is None:
            break  # all remaining skills already covered by chosen, or no resource teaches them
        chosen.append(picked)
        chosen_ids.add(picked.id)
        covered = {s.id for s in picked.skills_taught}
        remaining -= covered
    return chosen


def _skill_depths(graph: nx.DiGraph, topo: list[int], needed: set[int]) -> dict[int, int]:
    """Longest prerequisite-distance from any source, within the needed skill set."""
    depths: dict[int, int] = {}
    for sid in topo:
        if sid not in needed:
            continue
        pred = {p for p in graph.predecessors(sid) if p in needed}
        depths[sid] = 1 + (max((depths[p] for p in pred), default=0))
    return depths


def _checkpoint_for(db: Session, domain: str) -> models.Resource | None:
    return (
        db.query(models.Resource)
        .filter(models.Resource.type == "assessment", models.Resource.title.ilike(f"%{domain}%"))
        .first()
    )


def _node_reason(resource: models.Resource, learner: models.Learner, gap: set[int]) -> str:
    gap_names = [s.name for s in resource.skills_taught if s.id in gap]
    taught = " + ".join(s.name for s in resource.skills_taught)
    if resource.type == "assessment":
        return "Checkpoint: verifies the milestone skills are solid before moving on"
    if gap_names:
        return f"Teaches {taught} - fills prerequisite gap ({', '.join(gap_names)}) your profile is missing"
    return f"Teaches {taught} needed for your goal{'; matches your level' if hasattr(learner, 'experience_level') else ''}"


def generate_path(
    db: Session,
    learner: models.Learner,
    target_skill_ids: set[int],
) -> list[dict]:
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    selected = _select_resources(db, learner, target_skill_ids, graph, topo)
    if not selected:
        return []

    meta = resource_meta_graph(selected, graph)
    scores = {d["resource"].id: d["score"] for d in score_resources(db, learner, set(target_skill_ids), graph)}
    ordered_ids = list(nx.lexicographical_topological_sort(meta, key=lambda rid: -scores.get(rid, 0)))
    sorted_resources = {r.id: r for r in selected}

    needed = needed_skills(graph, set(target_skill_ids))
    depths = _skill_depths(graph, topo, needed)
    known = known_skill_ids_for(db, learner)
    gap = needed - known

    nodes: list[dict] = []
    last_milestone = 0
    for rid in ordered_ids:
        res = sorted_resources[rid]
        milestone = max((depths.get(s.id, 1) for s in res.skills_taught), default=1)
        nodes.append(
            {
                "resource": res,
                "milestone": milestone,
                "reason": _node_reason(res, learner, gap),
            }
        )
        last_milestone = milestone

    if nodes:
        cp = _checkpoint_for(db, _domain_of(nodes[-1]["resource"]))
        if cp and cp.id not in {n["resource"].id for n in nodes}:
            nodes.append(
                {
                    "resource": cp,
                    "milestone": last_milestone,
                    "reason": "Final checkpoint: verifies the goal skills are solid before calling it done",
                }
            )
    return nodes


def _domain_of(resource: models.Resource) -> str:
    domains = {s.domain for s in resource.skills_taught}
    return next(iter(domains)) if domains else "General"


def rerank_remaining(db: Session, path: models.Path, target_skill_ids: set[int]) -> None:
    """Adaptive pass: re-order unfinished nodes by fresh scores, preserving prerequisite order."""
    graph = build_skill_graph(db)
    topo = topo_order(db, graph)
    learner = db.get(models.Learner, path.learner_id)
    if learner is None:
        return
    done = [n for n in path.nodes if n.status == "done"]
    remaining = [n for n in path.nodes if n.status != "done"]
    if len(remaining) <= 1:
        return

    scores = {d["resource"].id: d["score"] for d in score_resources(db, learner, set(target_skill_ids), graph)}
    res_by_id: dict[int, models.Resource] = {}
    for n in remaining:
        resource = db.get(models.Resource, n.resource_id)
        if resource is not None:
            res_by_id[resource.id] = resource
    remaining_res = list(res_by_id.values())
    meta = resource_meta_graph(remaining_res, graph)
    order = list(nx.lexicographical_topological_sort(meta, key=lambda rid: -scores.get(rid, 0)))
    settle = {rid: i for i, rid in enumerate(order)}

    remaining.sort(key=lambda n: (settle.get(n.resource_id, 10_000), n.id))
    new_order = done + remaining
    for i, n in enumerate(new_order):
        n.position = i