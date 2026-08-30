import { useState } from 'react'
import { api } from '../api.js'

const TYPE_META = {
  course: { icon: '📘', label: 'Course' },
  project: { icon: '🛠️', label: 'Build' },
  assessment: { icon: '◆', label: 'Checkpoint' },
}

export default function Roadmap({ path, onRefresh, onChat }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({})
  const [openId, setOpenId] = useState(null)
  const [started, setStarted] = useState({})

  const firstUnfinished = path.nodes.findIndex((n) => n.status !== 'done')
  const doneCount = path.nodes.filter((n) => n.status === 'done').length
  const fillPct = path.nodes.length ? (doneCount / path.nodes.length) * 100 : 0

  async function markDone(node) {
    setBusy(node.id)
    setError('')
    try {
      await api.markDone(path.id, node.id)
      const fresh = await api.getPath(path.id)
      onRefresh(fresh)
      setOpenId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  function handleStart(node) {
    setStarted((s) => ({ ...s, [node.id]: true }))
  }

  async function sendFeedback(node, rating) {
    setFeedback((f) => ({ ...f, [node.id]: rating }))
    try {
      await api.feedback(path.id, node.id, rating)
    } catch {}
  }

  return (
    <div>
      <div className="card path-header">
        <div className="flex-between">
          <div>
            <h2>Your journey</h2>
            <p className="muted">Follow the trail — each island unlocks the next. Progress saves automatically.</p>
          </div>
          <button className="ghost" onClick={() => onChat()}>
            Ask assistant
          </button>
        </div>
        <div className="path-progress">
          <div className="path-progress-track">
            <div className="path-progress-fill" style={{ width: `${fillPct}%` }} />
          </div>
          <span className="muted" style={{ fontSize: '12px', fontWeight: 600 }}>
            {doneCount}/{path.nodes.length} completed
          </span>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="journey-map">
        <svg className="journey-svg" viewBox="0 0 640 1200" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 320 0 C 120 120 520 220 320 340 C 120 460 520 560 320 680 C 120 800 520 900 320 1020"
            fill="none"
            stroke="#ede0cc"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="22 18"
            opacity="0.7"
          />
          <path
            d="M 320 0 C 120 120 520 220 320 340 C 120 460 520 560 320 680 C 120 800 520 900 320 1020"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${fillPct * 9} 1200`}
            opacity="0.95"
          />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d6a4f" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>

        <div className="islands">
          {path.nodes.map((n, idx) => {
            const isDone = n.status === 'done'
            const isCurrent = idx === firstUnfinished
            const isLocked = idx > firstUnfinished && firstUnfinished !== -1
            const isOpen = openId === n.id
            const isStarted = started[n.id]
            const meta = TYPE_META[n.resource.type] || TYPE_META.course

            return (
              <div key={n.id} className={`journey-node ${isOpen ? 'open' : ''}`}>
                <button
                  className={`journey-island ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isLocked) return
                    setOpenId(isOpen ? null : n.id)
                  }}
                  disabled={isLocked}
                  aria-label={n.resource.title}
                  aria-expanded={isOpen}
                >
                  <span className="journey-icon">{meta.icon}</span>
                  {isDone && <span className="journey-check">✓</span>}
                  {isCurrent && !isDone && <span className="journey-ring" aria-hidden />}
                  <span className="journey-type">{meta.label}</span>
                </button>

                <div className="journey-label">
                  <span className={`journey-title ${isLocked ? 'muted' : ''}`}>{n.resource.title}</span>
                  <span className="journey-meta muted">
                    {n.resource.est_hours}h · {n.resource.media_type}
                  </span>
                </div>

                {isOpen && (
                  <div className="journey-sheet">
                    <div className="journey-sheet-head">
                      <span className={`type type-${n.resource.type}`}>{meta.label}</span>
                      <button className="ghost small" onClick={() => setOpenId(null)}>
                        Close
                      </button>
                    </div>
                    <h4>{n.resource.title}</h4>
                    <p className="reason">{n.reason}</p>
                    <p className="muted" style={{ fontSize: '12px' }}>
                      Teaches: {n.resource.skills_taught.join(', ')}
                    </p>
                    <div className="node-actions" style={{ marginTop: '14px' }}>
                      {isDone ? (
                        <>
                          <span className="done-tag">Completed</span>
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
                        </>
                      ) : isLocked ? (
                        <span className="muted" style={{ fontSize: '13px' }}>
                          Locked — finish the island above first
                        </span>
                      ) : !isStarted ? (
                        <button className="primary" onClick={() => handleStart(n)}>
                          Start learning →
                        </button>
                      ) : (
                        <button className="primary" disabled={busy === n.id} onClick={() => markDone(n)}>
                          {busy === n.id ? 'Saving…' : 'Mark as finished'}
                        </button>
                      )}
                    </div>
                    {!isDone && !isLocked && !isStarted && (
                      <p className="muted" style={{ marginTop: '8px', fontSize: '11px' }}>
                        Dummy resource — finish to grow and unlock the next island.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}