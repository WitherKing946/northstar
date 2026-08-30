# North Star — Design & Implementation Plan

**Project:** AI-Powered Personalized Learning Path Recommender

## Goal

An AI learning assistant that takes a learner's goal (in natural language), builds a profile from their history/skill level, and generates a structured, personalized roadmap of courses, projects, and assessments — then explains, adapts, and tracks progress.

## 1. Tech Stack

| Layer | Choice | Why it supports the AI |
|---|---|---|
| AI / Recommendation engine | **Python** (FastAPI) | Best ecosystem for the actual intelligence: `networkx` for the prerequisite skill graph, `scikit-learn` for similarity/gap analysis. API-first so any UI can use it. |
| LLM (natural-language goals + explanations) | **Ollama local model** (e.g. `gemma3:4b`), swappable to any OpenAI-compatible endpoint | Runs "inside the app" with no paid API key; language is inherent to the stack. |
| Frontend | **React + Vite** (chat UI, profile form, dashboard) | Component-based; easy to render roadmap/timeline and skill radar charts. |
| Database | **SQLite** (dev) → PostgreSQL (prod) | SQLite keeps the prototype zero-config; schema ports cleanly. |
| Repo/DVCS | **Git + GitHub** (dev → main via PR) | PR workflow per request. |

Why not pure-LLM: LLMs hallucinate prerequisite order and can't track a real progress graph. North Star uses a **hybrid engine**: a deterministic skill-graph core for correct path generation + an LLM for natural-language understanding and human-readable explanations.

## 2. Architecture

```
React frontend (chat / profile / dashboard)
        │  REST + WebSocket
        ▼
FastAPI backend
  ├── Learner Profile Service      (store interests, level, history, style)
  ├── Recommendation Engine        (skill graph + scoring → candidate resources)
  ├── Path Generator               (topo-sort prerequisites → milestones)
  ├── LLM Service                  (Ollama/OpenAI: parse goals, explain why)
  └── Progress Service             (completed items → re-generate path)
        │
        ▼
SQLite (learners, skills, courses, projects, assessments, paths, progress, feedback)
```

## 3. Data Model

```
learners      id, name, goal, interests[], experience_level, learning_style, created_at
skills        id, name, domain, difficulty, prerequisites[] (skill refs)
resources     id, type (course|project|assessment), title, source_url,
              skills_taught[], prerequisites[], est_hours, media_type
paths         id, learner_id, goal, status, version, created_at
path_nodes    id, path_id, resource_id, position, milestone, status(queued|in_progress|done|skipped)
progress      id, learner_id, resource_id, status, score, completed_at, updated_at
feedback      id, path_node_id, rating, comment, created_at
```

## 4. The AI Engine (core value)

### 4.1 Learner Profiling
- Goal parsed from natural language (LLM → structured: `{domain, skill targets, time budget}`).
- Experience level from self-report + completed-item history; interests stored as domain tags.

### 4.2 Skill Graph
- Directed graph: `skill → next-skill` edges encode prerequisites.
- Prerequisites are the backbone of correct learning order (LLMs can't be trusted here).

### 4.3 Recommendation
- Score each resource by: alignment with goal skills, baseline vs. current level, prerequisite completeness (gap analysis), learning-style match, available time.
- Returns **candidates** + reasons; the path generator topologically sorts them.

### 4.4 Path Generation
- Produces milestones with prerequisite chains, sequenced courses → projects → assessments.
- Each node carries an explanation ("this covers X, which you need before Y").

### 4.5 Explanation Assistant
- LLM answers "why was this recommended?" with the engine's reasons as grounding (no hallucinated ordering).
- Answers learner questions (chat) using profile + path context.

### 4.6 Adaptivity
- Completing/rating items updates `progress`/`feedback` → engine re-scores and re-orders remaining nodes.
- Stuck twice on a node → suggest easier prerequisite or different media type.

## 5. REST API (draft)

```
POST /learners                   create profile (or from first chat)
POST /learners/{id}/goals        parse natural-language goal (LLM)
POST /learners/{id}/paths        generate/regenerate learning path
GET  /learners/{id}/paths        list paths + roadmap
GET  /paths/{id}/nodes           full sequenced roadmap w/ milestones
POST /paths/{id}/nodes/{n}/done  mark progress → triggers re-rank
POST /paths/{id}/nodes/{n}/feedback
POST /chat                       Q&A with explanation assistant
GET  /learners/{id}/dashboard    progress, skill levels, next actions
```

## 6. UI Screens

1. **Welcome/Goal chat** — describe goal in natural language.
2. **Profile form** — experience level, interests, learning style, time budget.
3. **Roadmap view** — milestone timeline of courses/projects/assessments with prerequisites drawn as links.
4. **Explanation panel** — "why this next?" per node + open chat.
5. **Dashboard** — progress %, skill radar chart, milestones done, next recommended action.

## 7. Build Phases (dev branch → PRs to main)

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 1. Seed data + models | SQLite schema, ~40 resources across 3 domains, skill graph | `describe` queries return clean data |
| 2. Recommendation core | Gap analysis + resource scoring + topo-sort path gen | Unit tests: paths respect prerequisites |
| 3. LLM service | Goal parsing + explanations via Ollama | Parses sample goals; explains nodes |
| 4. FastAPI | All endpoints above | API tests pass |
| 5. React UI | Goal chat, profile, roadmap, dashboard | End-to-end walkthrough works |
| 6. Adaptivity | Feedback loop + re-ranking on completion | Path changes after mock completions |
| 7. Polish | Styling, empty/error states, seed demo user | Demo-ready |

## 8. Team Workflow (4 devs)

- **Branch per feature, per person**: every task = its own branch (`feature/name`) off `dev` → PR into `dev` → tested → merge.
- **`dev` is integration**: all features merge here. `main` is only bumped at demo-ready checkpoints via PR from `dev`.
- **Alpha owns approvals**: the alpha (project lead) is the sole reviewer/merger and may take over any in-flight task at any time (reassign PR, close branches, or branch off a peer's work).
- Suggested rough split (renegotiable, alpha can reassign):
  | Member | Focus |
  |---|---|
  | Alpha | Architecture + AI engine (skill graph, recommendation, path gen) + final approvals |
  | 2 | Backend: FastAPI endpoints + DB schema + tests |
  | 3 | LLM service (Ollama parsing, explanations, chat) |
  | 4 | React frontend (chat, roadmap, dashboard) |
- Rules to keep it conflict-free: commit small, never work the same file as someone else (grab a file assignment first), PR title = prefix + task (e.g. `feat: recommendation engine`).

## 9. Decisions Log
| Decision | Choice |
|---|---|
| Deployment | Local hosting (localhost) for now |
| Accounts | No logins — multiple learner *profiles*, profile picker at start |
| Course data | Live Udemy scraping (stretch) — **seed a static catalog matching Udemy's structure first**; live scraping is ToS-dubious + anti-bot fragile, so seed data is the demo-safe path |
| Assessments | Lightweight checkpoints per milestone (3-5 quick questions) to verify prerequisites → enables real path re-ranking; no full quiz engine |

Assessments in one sentence: they're the feedback signal that makes the path *adaptive* instead of just a static calendar.