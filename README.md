# North Star

AI-Powered Personalized Learning Path Recommender.

Learners describe a goal in natural language. North Star profiles them, generates a structured, prerequisite-safe roadmap (courses, projects, checkpoints) from a skill graph, explains every recommendation, and adapts as they make progress.

## Tech Stack

- Backend / AI engine: Python 3, FastAPI, SQLAlchemy, networkx skill graph
- LLM: Groq (hosted cloud, OpenAI-compatible)
- Database: SQLite by default (PostgreSQL-ready)
- Frontend: React + Vite

## Project Structure

```
backend/            FastAPI app + AI engine
  app/              source code (api, engine, llm, models, schemas)
  config.json       App config / Groq API key
  requirements.txt  Python dependencies
  tests/            Pytest suite
frontend/           React + Vite app
  src/              components and API client
docs/plan.md        Full design document
```

## Groq API Key

North Star uses the Groq cloud API as its AI provider. The key is stored in `backend/config.json`:

```json
{
  "GROQ_API_KEY": "key given in instructions",
  "GROQ_MODEL": "openai/gpt-oss-120b",
  "LLM_TIMEOUT": "60"
}
```

If the key is ever revoked or you want to use your own, get a free key at https://console.groq.com/keys and replace the value in `backend/config.json`.

## Local Setup & Execution

### Prerequisites

- Python 3.11 or newer
- Node.js 18 or newer (with npm)
- A Groq API key (see above)

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) set the Groq key if you are not using config.json
# set GROQ_API_KEY=your_key_here

# Start the API server
uvicorn app.main:app --port 8000 --reload
```

The backend runs at http://localhost:8000. Interactive API docs are at http://localhost:8000/docs.

### 2. Frontend

Open a second terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend runs at http://localhost:5173 (open this in your browser).

### 3. Use it

1. Open http://localhost:5173 in your browser.
2. Complete the onboarding wizard (name, interests, skill level, goal).
3. North Star generates your personalized learning path.
4. Use Dashboard, My Path, Explore, Assistant, and My Profile from the navigation.

### Frontend pointing at a different backend

By default the frontend calls the backend at http://localhost:8000. To change it, create `frontend/.env`:

```
VITE_API_BASE=http://localhost:8000
```

### Database

SQLite is the default (a `northstar.db` file is created in `backend/`). No setup needed. For PostgreSQL at deployment, set `DATABASE_URL` accordingly.

## Configuration

All runtime settings are read from `backend/config.json` and `backend/.env` (if present). Environment variables override both. See `backend/.env.example` for the full list of available keys.

## Tests

```bash
cd backend
pytest tests -q
```

## Git Workflow

- Feature branches off `dev`, opened as pull requests into `dev`.
- `main` only receives demo-ready checkpoints merged from `dev`.
