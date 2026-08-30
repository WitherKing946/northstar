# Implementation Plan — Supabase & External AI Provider Integration

We will connect **Supabase** as the hosted cloud database for North Star (storing learner profiles, skill graphs, resources, paths, and progress) and add support for external AI LLM providers (OpenAI, Groq, or Ollama) alongside the embedded AI assistant.

## User Review Required

> [!IMPORTANT]
> - **Supabase Connection**: The backend will connect to Supabase's hosted PostgreSQL using SQLAlchemy + `psycopg`. Setting `DATABASE_URL` in `.env` to your Supabase Postgres connection string (e.g. `postgresql+psycopg://postgres.[ref]:[password]@...supabase.com:6543/postgres`) automatically provisions the schema and seeds the skill catalog.
> - **Frontend Supabase SDK**: We will add `@supabase/supabase-js` to `frontend`, creating a `supabase.js` helper.
> - **AI Assistant Enhancements**: We will update the backend `LLMService` to support OpenAI / Groq / Ollama API keys (`OPENAI_API_KEY`, `GROQ_API_KEY`, or `OLLAMA_BASE_URL`) for live natural language responses while preserving the grounded prerequisite engine fallback.

## Proposed Changes

### Backend Components

#### [MODIFY] [config.py](file:///c:/Projects/north%20star/backend/app/config.py)
- Support Supabase PostgreSQL connection string format auto-conversions (e.g. converting `postgres://` or `postgresql://` to `postgresql+psycopg://`).
- Add environment variables for `OPENAI_API_KEY`, `GROQ_API_KEY`, and `SUPABASE_URL` / `SUPABASE_KEY`.

#### [MODIFY] [database.py](file:///c:/Projects/north%20star/backend/app/database.py)
- Configure SSL and connection pooling options required for Supabase pooled connections (e.g. `sslmode=require`, `prepared_statement_cache_size=0`).

#### [MODIFY] [client.py](file:///c:/Projects/north%20star/backend/app/llm/client.py)
- Integrate HTTP API client for OpenAI / Groq / Ollama endpoints so that when an API key is provided, the AI assistant uses live LLM capabilities grounded on the skill graph path context.

#### [NEW] [supabase_seed.py](file:///c:/Projects/north%20star/backend/app/supabase_seed.py) / [MODIFY] [.env.example](file:///c:/Projects/north%20star/backend/.env.example)
- Provide environment templates and script for one-click Supabase database setup.

---

### Frontend Components

#### [MODIFY] [package.json](file:///c:/Projects/north%20star/frontend/package.json)
- Add `@supabase/supabase-js` dependency.

#### [NEW] [supabase.js](file:///c:/Projects/north%20star/frontend/src/supabase.js)
- Initialize Supabase JS client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

#### [MODIFY] [api.js](file:///c:/Projects/north%20star/frontend/src/api.js)
- Optionally sync learner state with Supabase client when configured.

---

## Branching & PR Strategy

Per repository design guidelines and user rules:
1. Branch off `dev`: `feat/supabase-and-ai-integration`.
2. Implement backend & frontend Supabase + AI integration.
3. Verify test suite and Vite production build.
4. Commit, push, and open PR into `dev`.

---

## Verification Plan

### Automated Tests
- Run `pytest` in `backend/` verifying DB models compile and pass against Postgres / SQLite.
- Run `npx vite build` in `frontend/` to ensure bundling succeeds with `@supabase/supabase-js`.

### Manual Verification
- Test Supabase PostgreSQL connection string parsing.
- Test AI assistant responses with and without API keys.
