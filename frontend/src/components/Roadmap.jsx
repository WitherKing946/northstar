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

  async function sendFeedback(node, rating) {
    setFeedback((f) => ({ ...f, [node.id]: rating }))
    try {
      await api.feedback(path.id, node.id, rating)
    } catch {
      /* feedback is best-effort */
    }
  }

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <div>
            <h2>Your roadmap</h2>
            <p className="muted">Goal: {path.goal}</p>
          </div>
          <div className="meta">
            <span className="badge">v{path.version}</span>
            <button className="ghost" onClick={() => onChat()}>
              Ask questions
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {milestones.map((m) => (
        <section key={m} className="milestone">
          <div className="milestone-head">
            <h3>Milestone {m}</h3>
          </div>
          <div className="nodes">
            {path.nodes
              .filter((n) => n.milestone === m)
              .map((n) => (
                <div key={n.id} className={`node ${n.status === 'done' ? 'done' : ''}`}>
                  <div className="node-top">
                    <span className={`type type-${n.resource.type}`}>{TYPE_LABEL[n.resource.type] || n.resource.type}</span>
                    <span className="muted">{n.resource.est_hours}h</span>
                  </div>
                  <h4>{n.resource.title}</h4>
                  <p className="reason">{n.reason}</p>
                  <p className="muted">Teaches: {n.resource.skills_taught.join(', ')}</p>
                  {n.resource.url && (
                    <a href={n.resource.url} target="_blank" rel="noreferrer" className="quiet-link">
                      View resource
                    </a>
                  )}
                  <div className="node-actions">
                    {n.status === 'done' ? (
                      <span className="done-tag">Done</span>
                    ) : (
                      <button
                        className="primary small"
                        disabled={busy === n.id}
                        onClick={() => markDone(n)}
                      >
                        {busy === n.id ? 'Updating…' : 'Mark done'}
                      </button>
                    )}
                    {n.status === 'done' && (
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            className={`star ${feedback[n.id] >= r ? 'on' : ''}`}
                            onClick={() => sendFeedback(n, r)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}