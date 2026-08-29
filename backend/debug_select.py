import os
import tempfile

tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tmp, 's.db')}"

from app.database import SessionLocal, init_db
from app import seed_catalog, models
from app.engine.skill_graph import build_skill_graph, topo_order, needed_skills
from app.engine.recommendation import score_resources
from app.engine import path_generator

init_db()
db = SessionLocal()
seed_catalog.seed(db)

learner = models.Learner(name="D", interests=["data science"], experience_level="beginner", time_budget=10)
db.add(learner)
db.commit()
db.refresh(learner)

skills = {s.name: s for s in db.query(models.Skill).all()}
targets = {skills["Machine Learning"].id}
graph = build_skill_graph(db)
topo = topo_order(db, graph)
needed = needed_skills(graph, targets)
print("needed:", [graph.nodes[n]["name"] for n in needed])
print("topo needed order:", [graph.nodes[n]["name"] for n in topo if n in needed])

ml = skills["Machine Learning"].id
ranked = [d for d in score_resources(db, learner, targets, graph) if d["coverage"] > 0]
for d in ranked:
    taught = [s.name for s in d["resource"].skills_taught]
    print(f"score={d['score']:.3f} cov={d['coverage']} {d['resource'].title} -> {taught}")
print("ML candidates:")
for d in ranked:
    if ml in {s.id for s in d["resource"].skills_taught}:
        print("  ", d["resource"].title, d["score"])

sel = path_generator._select_resources(db, learner, targets, graph, topo)
print("selected:", [r.title for r in sel])
db.close()