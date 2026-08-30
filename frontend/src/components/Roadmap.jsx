import { useState } from 'react'
import { api } from '../api.js'

const TYPE_LABEL = {
  course: 'Course',
  project: 'Project',
  assessment: 'Checkpoint',
}

export default function Roadmap({ path, onRefresh, onChat }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({})
  const [openId, setOpenId] = useState(null)
  const [started, setStarted] = useState({})

  const milestones = [...new Set(path.nodes.map((n) => n.milestone))].sort((a, b) => a - b)

  async function markDone(node) {
    setBusy(node.id)
    setError('')
    try {
      await api.markDone(path.id, node.id)
      const fresh = await api.getPath(path.id)
      onRefresh(fresh)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  function handleStart(node) {
    setStarted((s) => ({ ...s, [node.id]: true }))
    if (node.resource.url) window.open(node.resource.url, '_blank', 'noopener,noreferrer')
  }

  async function sendFeedback(node, rating) {
    setFeedback((f) => ({ ...f, [node.id]: rating }))
    try {
      await api.feedback(path.id, node.id, rating)
    } catch {}
  }

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <div>
            <h2>Your learning path</h2>
            <p className="muted">Goal: {path.goal} · Auto-tracked milestones</p>
          </div>
          <div className="meta">
            <span className="badge">v{path.version}</span>
            <button className="ghost" onClick={() => onChat()}>
              Ask assistant
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {milestones.map((m) => {
        const group = path.nodes.filter((n) => n.milestone === m)
        const done = group.filter((n) => n.status === 'done').length
        const pct = Math.round((done / group.length) * 100)
        return (
          <section key={m} className="milestone">
            <div className="milestone-head">
              <h3>Milestone {m}</h3>
              <span className="milestone-badge">
                {done}/{group.length} done
              </span>
              <div className="milestone-line" />
              <div className="milestone-progress" aria-hidden>
                <div className="milestone-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="nodes">
              {group.map((n) => {
                const isOpen = openId === n.id
                const isStarted = started[n.id]
                const isDone = n.status === 'done'
                return (
                  <div
                    key={n.id}
                    className={`node ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''}`}
                    onClick={() => setOpenId(isOpen ? null : n.id)}
                  >
                    <div className="node-top">
                      <span className={`type type-${n.resource.type}`}>
                        {TYPE_LABEL[n.resource.type] || n.resource.type}
                      </span>
                      <span className="muted">{n.resource.est_hours}h · {n.resource.media_type}</span>
                    </div>
                    <h4>{n.resource.title}</h4>
                    <p className="reason">{n.reason}</p>
                    {isOpen && (
                      <div className="node-detail" onClick={(e) => e.stopPropagation()}>
                        <p className="muted">Teaches: {n.resource.skills_taught.join(', ')}</p>
                        <div className="node-actions">
                          {isDone ? (
                            <>
                              <span className="done-tag">Completed</span>
                              <div className="stars">
                                {[1, 2, 3, 4, 5].map((r) => (
                                  <button
                                    key={r}
                                    className={`star ${feedback[n.id] >= r ? 'on' : ''}`}
                                    onClick={() => sendFeedback(n, r)}
                                    title={`${r} stars`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : !isStarted ? (
                            <button className="primary small accent" onClick={() => handleStart(n)}>
                              Start learning →
                            </button>
                          ) : (
                            <button
                              className="primary small"
                              disabled={busy === n.id}
                              onClick={() => markDone(n)}
                            >
                              {busy === n.id ? 'Saving…' : 'Mark as finished'}
                            </button>
                          )}
                          {!isDone && isStarted && n.resource.url && (
                            <a href={n.resource.url} target="_blank" rel="noreferrer" className="ghost small" style={{ textDecoration: 'none', display: 'inline-block', padding: '7px 14px' }}>
                              Reopen
                            </a>
                          )}
                        </div>
                        {!isDone && !isStarted && (
                          <p className="muted" style={{ marginTop: '10px', fontSize: '12px' }}>
                            Click Start learning to open the resource. Finish it, then mark it complete — your milestone updates automatically.
                          </p>
                        )}
                      </div>
                    )}
                    {!isOpen && <span className="quiet-link">{isDone ? 'Completed · rate it' : isStarted ? 'In progress · click to finish' : 'Click to open'}</span>}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}