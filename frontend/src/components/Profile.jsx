import { useState } from 'react'
import { api } from '../api.js'

const LEVELS = ['beginner', 'intermediate', 'advanced']
const STYLES = ['mixed', 'visual', 'hands-on', 'reading']

export default function Profile({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    interests: [],
    experience_level: 'beginner',
    learning_style: 'mixed',
    time_budget: 5,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const learner = (() => {
    try {
      return JSON.parse(localStorage.getItem('ns.learner') || 'null')
    } catch {
      return null
    }
  })()

  function toggleInterest(v) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter((x) => x !== v) : [...f.interests, v],
    }))
  }

  async function create(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const l = await api.createLearner({
        name: form.name.trim(),
        interests: form.interests,
        experience_level: form.experience_level,
        learning_style: form.learning_style,
        time_budget: Number(form.time_budget) || 5,
      })
      localStorage.setItem('ns.learner', JSON.stringify(l))
      localStorage.removeItem('ns.path')
      localStorage.removeItem('ns.chat')
      setSuccess(`Created ${l.name} — now set a goal to generate their path.`)
      onCreated && onCreated(l)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdits(e) {
    e.preventDefault()
    if (!learner) return
    // For demo we just update localStorage; backend has no PATCH for learner
    const updated = { ...learner, ...form, name: form.name || learner.name }
    localStorage.setItem('ns.learner', JSON.stringify(updated))
    setSuccess('Profile updated locally (demo).')
    setTimeout(() => window.location.reload(), 600)
  }

  const isEditing = Boolean(learner)

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {learner && (
        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1a1a18 0%, #2d2d2a 100%)',
              color: '#ffdf8a',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {learner.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{learner.name}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {learner.experience_level} · {learner.learning_style} · {learner.time_budget}h/week · {(learner.interests || []).join(', ') || 'No interests yet'}
            </p>
            <p className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              ID {learner.id} · Goal: {learner.goal || 'Not set yet'}
            </p>
          </div>
          <button
            className="ghost"
            onClick={() => {
              localStorage.clear()
              window.location.reload()
            }}
          >
            Switch user
          </button>
        </div>
      )}

      <div className="card">
        <h2>{isEditing ? 'Edit profile' : 'Create profile'}</h2>
        <p className="muted">{isEditing ? 'Changes save locally for this demo (no backend patch yet).' : 'Create a new learner to test different paths.'}</p>

        <form onSubmit={isEditing ? saveEdits : create}>
          <label>
            Display name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={learner?.name || 'e.g. Alex Rivera'} />
          </label>

          <label>Interests</label>
          <div className="chips">
            {['web development', 'data science', 'digital marketing'].map((d) => (
              <button key={d} type="button" className={`chip ${form.interests.includes(d) ? 'chip-on' : ''}`} onClick={() => toggleInterest(d)}>
                {d}
              </button>
            ))}
          </div>

          <div className="row">
            <label>
              Level
              <select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Style
              <select value={form.learning_style} onChange={(e) => setForm({ ...form, learning_style: e.target.value })}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hours / week
              <input type="number" min="1" max="40" value={form.time_budget} onChange={(e) => setForm({ ...form, time_budget: e.target.value })} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
            <button className="primary" disabled={busy || (!form.name.trim() && !isEditing)}>
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create learner'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="ghost"
                onClick={() => setForm({ name: learner.name, interests: learner.interests || [], experience_level: learner.experience_level, learning_style: learner.learning_style, time_budget: learner.time_budget })}
              >
                Reset
              </button>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          {success && <p style={{ color: '#2d6a4f', fontSize: '13px', background: '#f0fdf4', border: '1px solid #c8e6c9', borderRadius: '8px', padding: '10px 12px', marginTop: '12px' }}>{success}</p>}
        </form>
      </div>

      <div className="card" style={{ background: 'var(--bg2)' }}>
        <h3 style={{ marginTop: 0 }}>Account</h3>
        <p className="muted" style={{ fontSize: '12px' }}>
          Demo mode — no passwords. Learners are profiles stored in the DB; switching just changes localStorage. Add a backend PATCH /learners/{`{id}`} later for true persistence.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <span className="badge">DB: {localStorage.getItem('ns.learner') ? 'connected' : 'empty'}</span>
          <span className="badge">AI: embedded</span>
          <span className="badge">Catalog: dummy</span>
        </div>
      </div>
    </div>
  )
}