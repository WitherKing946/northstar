import type {
  LearnerOut,
  CreateLearnerBody,
  GoalResponse,
  GoalBody,
  PathOut,
  DashboardData,
  ChatBody,
  ChatResponse,
  FeedbackBody,
} from './types';

/* ── Helpers ────────────────────────────────────────────────────── */

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(text || `Request failed (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

/* ── Learners ───────────────────────────────────────────────────── */

export function createLearner(body: CreateLearnerBody): Promise<LearnerOut> {
  return post<LearnerOut>('/api/learners', body);
}

export function getLearner(id: string): Promise<LearnerOut> {
  return request<LearnerOut>(`/api/learners/${id}`);
}

export function listLearners(): Promise<LearnerOut[]> {
  return request<LearnerOut[]>('/api/learners');
}

/* ── Goals ──────────────────────────────────────────────────────── */

export function postGoal(learnerId: string, body: GoalBody): Promise<GoalResponse> {
  return post<GoalResponse>(`/api/learners/${learnerId}/goals`, body);
}

/* ── Paths / Nodes ──────────────────────────────────────────────── */

export function createPath(learnerId: string): Promise<PathOut> {
  return post<PathOut>(`/api/learners/${learnerId}/paths`, {});
}

export function getPathNodes(pathId: string): Promise<PathOut> {
  return request<PathOut>(`/api/paths/${pathId}/nodes`);
}

export function markNodeDone(
  pathId: string,
  nodePosition: number,
): Promise<{ ok: boolean; version: number }> {
  return post(`/api/paths/${pathId}/nodes/${nodePosition}/done`, {});
}

export function postFeedback(
  pathId: string,
  nodePosition: number,
  body: FeedbackBody,
): Promise<unknown> {
  return post(`/api/paths/${pathId}/nodes/${nodePosition}/feedback`, body);
}

/* ── Dashboard ──────────────────────────────────────────────────── */

export function getDashboard(learnerId: string): Promise<DashboardData> {
  return request<DashboardData>(`/api/learners/${learnerId}/dashboard`);
}

/* ── Chat ───────────────────────────────────────────────────────── */

export function postChat(body: ChatBody): Promise<ChatResponse> {
  return post<ChatResponse>('/api/chat', body);
}
