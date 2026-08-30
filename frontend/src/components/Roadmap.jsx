import { useState } from 'react'
import { api } from '../api.js'

const TYPE_ICON = {
  course: '📘',
  project: '🛠️',
  assessment: '✓',
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
      <div className="card">
        <div className="flex-between">
          <div>
            <h2>Your path</h2>
            <p className="muted">Tap an island to begin — progress is tracked automatically.</p>
          </div>
          <button className="ghost" onClick={() => onChat()}>
            Ask assistant
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="duolingo-path">
        <div className="path-spine" aria-hidden>
          <div className="path-spine-fill" style={{ height: `${fillPct}%` }} />
        </div>

        {path.nodes.map((n, idx) => {
          const isDone = n.status === 'done'
          const isCurrent = idx === firstUnfinished
          const isLocked = idx > firstUnfinished && firstUnfinished !== -1
          const isOpen = openId === n.id
          const isStarted = started[n.id]
          const offsets = [-72, 72, 44, -44, 0]
          const offset = offsets[idx % offsets.length]

          return (
            <div key={n.id} className="island-wrap" style={{ '--offset': `${offset}px` }}>
              <button
                className={`island ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} type-${n.resource.type}`}
                onClick={() => {
                  if (isLocked) return
                  setOpenId(isOpen ? null : n.id)
                }}
                disabled={isLocked}
                aria-label={n.resource.title}
                aria-expanded={isOpen}
                title={isLocked ? 'Complete the previous island to unlock' : n.resource.title}
              >
                <span className="island-icon">{TYPE_ICON[n.resource.type] || '●'}</span>
                {isDone && <span className="island-check">✓</span>}
                {isCurrent && !isDone && <span className="island-pulse" aria-hidden />}
              </button>
              <span className={`island-label ${isLocked ? 'muted' : ''}`}>{n.resource.title}</span>
              <span className="island-sub muted">{n.resource.est_hours}h · {n.resource.media_type}</span>

              {isOpen && (
                <div className="island-card">
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
                      <button className="primary small accent" onClick={() => handleStart(n)}>
                        Start learning →
                      </button>
                    ) : (
                      <button className="primary small" disabled={busy === n.id} onClick={() => markDone(n)}>
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
  )
}