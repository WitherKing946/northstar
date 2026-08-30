import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function request(url, opts = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail || body)
    throw new Error(detail || res.statusText)
  }
  return body
}

async function syncLearnerToSupabase(learner) {
  if (!supabase || !learner?.id) return
  try {
    await supabase.from('learners').upsert({ id: learner.id, name: learner.name, goal: learner.goal })
  } catch {}
}

export const api = {
  createLearner: async (p) => {
    const learner = await request('/learners', { method: 'POST', body: JSON.stringify(p) })
    syncLearnerToSupabase(learner)
    return learner
  },
  setGoal: (id, goal) =>
    request(`/learners/${id}/goals`, { method: 'POST', body: JSON.stringify({ goal }) }),
  getLearner: (id) => request(`/learners/${id}`),
  generatePath: (id) => request(`/learners/${id}/paths`, { method: 'POST', body: '{}' }),
  getPath: (pid) => request(`/paths/${pid}/nodes`),
  dashboard: (lid) => request(`/learners/${lid}/dashboard`),
  markDone: (pid, nid) =>
    request(`/paths/${pid}/nodes/${nid}/done`, { method: 'POST', body: '{}' }),
  feedback: (pid, nid, rating, comment = '') =>
    request(`/paths/${pid}/nodes/${nid}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
  chat: (question, learnerId) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ question, learner_id: learnerId }),
    }),
  resources: () => request('/resources'),
  enroll: (learnerId, resourceId) =>
    request(`/learners/${learnerId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ resource_id: resourceId }),
    }),
}

export const store = {
  get learner() {
    try {
      return JSON.parse(localStorage.getItem('ns.learner') || 'null')
    } catch {
      return null
    }
  },
  set learner(v) {
    localStorage.setItem('ns.learner', JSON.stringify(v))
  },
  get path() {
    try {
      return JSON.parse(localStorage.getItem('ns.path') || 'null')
    } catch {
      return null
    }
  },
  set path(v) {
    localStorage.setItem('ns.path', JSON.stringify(v))
  },
  clear() {
    localStorage.removeItem('ns.learner')
    localStorage.removeItem('ns.path')
  },
}