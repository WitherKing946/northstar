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

  const milestones = [...new Set(path.nodes.map((n) => n.milestone))].sort((a, b) => a - b)

  return (
    <div>
      <div className="card">
        <div className="flex-between">
          <div>
            <h2>Your learning path</h2>
            <p className="muted">Tap an island to start — milestones unlock automatically as you finish.</p>
          </div>
          <button className="ghost" onClick={() => onChat()}>
            Ask assistant
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="duolingo-path">
        <div className="path-spine" aria-hidden />
        {milestones.map((m) => {
          const group = path.nodes.filter((n) => n.milestone === m)
          const done = group.filter((n) => n.status === 'done').length
          return (
            <div key={m} className="milestone-segment">
              <div className="milestone-banner">
                <span className="milestone-title">Milestone {m}</span>
                <span className="milestone-count">
                  {done}/{group.length}
                </span>
                <div className="milestone-bar">
                  <div className="milestone-bar-fill" style={{ width: `${(done / group.length) * 100}%` }} />
                </div>
              </div>

              {group.map((n) => {
                const idx = path.nodes.indexOf(n)
                const isDone = n.status === 'done'
                const isCurrent = idx === firstUnfinished
                const isLocked = idx > firstUnfinished && firstUnfinished !== -1
                const isOpen = openId === n.id
                const isStarted = started[n.id]
                // zig-zag offset
                const offsets = [-72, 72, 36, -36, 0]
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
                      title={isLocked ? 'Complete the previous step to unlock' : n.resource.title}
                    >
                      <span className="island-icon">{TYPE_ICON[n.resource.type] || '●'}</span>
                      {isDone && <span className="island-check">✓</span>}
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
                        <div className="node-actions" style={{ marginTop: '12px' }}>
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
                              Locked — finish the previous island first
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
                            Dummy resource — no external link. Finish to unlock the next island.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}