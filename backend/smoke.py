"""Manual smoke run: seed, build a learner, generate a path, print roadmap."""
import os
import tempfile

tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(tmp, 'smoke.db')}"

from app.database import SessionLocal, init_db  # noqa: E402
from app import seed_catalog, models  # noqa: E402
from app.llm.client import LLMService  # noqa: E402
from app.engine import path_generator  # noqa: E402

init_db()
db = SessionLocal()
seed_catalog.seed(db)

learner = models.Learner(
    name="Demo",
    interests=["data science"],
    experience_level="beginner",
    learning_style="hands_on",
    time_budget=10,
)
db.add(learner)
db.commit()
db.refresh(learner)

goal = "I want to become a machine learning engineer, 15 hours a week"
parsed = LLMService(db).parse_goal(goal)
print("parsed:", parsed)

skills = {s.name: s for s in db.query(models.Skill).all()}
targets = {skills[s].id for s in parsed["skill_targets"]} if parsed["skill_targets"] else {skills["Machine Learning"].id}
print("targets:", parsed["skill_targets"] or ["Machine Learning"], "\n")

nodes = path_generator.generate_path(db, learner, targets)
for i, n in enumerate(nodes, 1):
    r = n["resource"]
    print(f"{i:>2}. [M{n['milestone']}] {r.type:<10} {r.title}  ({', '.join(s.name for s in r.skills_taught)})")
    print(f"     why: {n['reason']}")

db.close()