"""End-to-end API tests through FastAPI TestClient (Ollama forced offline -> fallback path)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _new_learner(client, name="Tester"):
    resp = client.post(
        "/learners",
        json={"name": name, "interests": [], "experience_level": "beginner", "time_budget": 10},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_goal_parsing_fallback_is_deterministic(client):
    learner_id = _new_learner(client)
    resp = client.post("/learners/{id}/goals".format(id=learner_id), json={"goal": "I want to learn machine learning"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["domain"] == "data science"
    assert "Machine Learning" in body["skill_targets"]


def test_full_flow_generate_path_and_dashboard(client):
    learner_id = _new_learner(client, "Flow")
    client.post("/learners/{id}/goals".format(id=learner_id), json={"goal": "become a data scientist"})
    resp = client.post("/learners/{id}/paths".format(id=learner_id))
    assert resp.status_code == 200, resp.text
    path = resp.json()
    assert path["nodes"], "no roadmap generated"
    assert path["nodes"][0]["reason"], "first node should explain itself"

    # prerequisite order: first node teaches foundational skill of the domain
    first_skills = path["nodes"][0]["resource"]["skills_taught"]
    assert first_skills == ["Python Basics"]

    node_id = path["nodes"][0]["id"]
    path_id = path["id"]
    done = client.post(f"/paths/{path_id}/nodes/{node_id}/done")
    assert done.status_code == 200, done.text

    dash = client.get(f"/learners/{learner_id}/dashboard")
    assert dash.status_code == 200
    assert dash.json()["progress_percent"] > 0

    feedback = client.post(
        f"/paths/{path_id}/nodes/{node_id}/feedback", json={"rating": 5, "comment": "clear"}
    )
    assert feedback.status_code == 200


def test_chat_has_fallback_answer(client):
    learner_id = _new_learner(client, "Chat")
    resp = client.post("/chat", json={"learner_id": learner_id, "question": "why study this?"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["answer"]


def test_list_and_patch_learners(client):
    learner_id = _new_learner(client, "PatchTest")
    
    # Test listing
    all_learners = client.get("/learners").json()
    assert any(l["id"] == learner_id for l in all_learners)

    # Test patch
    patch_resp = client.patch(
        f"/learners/{learner_id}",
        json={"name": "Patched Name", "experience_level": "intermediate", "time_budget": 15},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["name"] == "Patched Name"
    assert data["experience_level"] == "intermediate"
    assert data["time_budget"] == 15

    # Confirm GET /learners/{id} returns updated data
    fetched = client.get(f"/learners/{learner_id}").json()
    assert fetched["name"] == "Patched Name"


def test_unknown_learner_404(client):
    assert client.get("/learners/999999").status_code == 404
    assert client.get("/learners/999999/dashboard").status_code == 404