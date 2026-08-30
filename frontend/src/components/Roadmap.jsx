import { useState } from 'react'
import { api } from '../api.js'

const TYPE_META = {
  course: { icon: '📘', label: 'Course' },
  project: { icon: '▣', label: 'Project' },
  assessment: { icon: '✦', label: 'Checkpoint' },
}

export default function Roadmap({ path, onRefresh, onChat }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({})
  const [openId, setOpenId] = useState(null)
  const [started, setStarted] = useState({})
  const [view, setView] = useState('timeline')

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
            <h2>Your path</h2>
            <p className="muted">Work through step by step — progress saves automatically.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="view-toggle">
              <button className={`view-btn ${view === 'timeline' ? 'on' : ''}`} onClick={() => setView('timeline')}>
                Timeline
              </button>
              <button className={`view-btn ${view === 'gallery' ? 'on' : ''}`} onClick={() => setView('gallery')}>
                Gallery
              </button>
            </div>
            <button className="ghost" onClick={() => onChat()}>
              Ask assistant
            </button>
          </div>
        </div>
        <div className="path-progress">
          <div className="path-progress-track">
            <div className="path-progress-fill" style={{ width: `${fillPct}%` }} />
          </div>
          <span className="muted" style={{ fontSize: '12px', fontWeight: 600 }}>
            {doneCount}/{path.nodes.length}
          </span>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {view === 'timeline' ? (
        <div className="timeline">
          <div className="timeline-rail" aria-hidden>
            <div className="timeline-rail-fill" style={{ height: `${fillPct}%` }} />
          </div>
          {path.nodes.map((n, idx) => {
            const isDone = n.status === 'done'
            const isCurrent = idx === firstUnfinished
            const isLocked = idx > firstUnfinished && firstUnfinished !== -1
            const isOpen = openId === n.id
            const isStarted = started[n.id]
            const meta = TYPE_META[n.resource.type] || TYPE_META.course
            return (
              <div key={n.id} className={`timeline-row ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} ${isOpen ? 'open' : ''}`}>
                <button
                  className={`timeline-dot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isLocked) return
                    setOpenId(isOpen ? null : n.id)
                  }}
                  disabled={isLocked}
                  aria-label={n.resource.title}
                >
                  {isDone ? '✓' : <span style={{ fontSize: '16px' }}>{meta.icon}</span>}
                  {isCurrent && !isDone && <span className="dot-pulse" aria-hidden />}
                </button>
                <div
                  className={`timeline-card ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isLocked) return
                    setOpenId(isOpen ? null : n.id)
                  }}
                >
                  <div className="timeline-card-top">
                    <span className={`type type-${n.resource.type}`}>{meta.label}</span>
                    <span className="muted" style={{ fontSize: '12px' }}>
                      {n.resource.est_hours}h · {n.resource.media_type}
                    </span>
                  </div>
                  <h4 className="timeline-title">{n.resource.title}</h4>
                  <p className="reason" style={{ marginBottom: isOpen ? '10px' : 0 }}>
                    {n.reason}
                  </p>
                  {isOpen ? (
                    <div className="timeline-detail">
                      <p className="muted" style={{ fontSize: '12px', margin: '0 0 12px' }}>
                        Teaches: {n.resource.skills_taught.join(', ')}
                      </p>
                      <div className="node-actions">
                        {isDone ? (
                          <>
                            <span className="done-tag">Completed</span>
                            <div className="stars">
                              {[1, 2, 3, 4, 5].map((r) => (
                                <button key={r} className={`star ${feedback[n.id] >= r ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); sendFeedback(n, r) }}>
                                  ★
                                </button>
                              ))}
                            </div>
                          </>
                        ) : isLocked ? (
                          <span className="muted" style={{ fontSize: '13px' }}>
                            Locked — finish the step above
                          </span>
                        ) : !isStarted ? (
                          <button className="primary" onClick={(e) => { e.stopPropagation(); handleStart(n) }}>
                            Start learning →
                          </button>
                        ) : (
                          <button className="primary" disabled={busy === n.id} onClick={(e) => { e.stopPropagation(); markDone(n) }}>
                            {busy === n.id ? 'Saving…' : 'Mark as finished'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="quiet-link" style={{ fontSize: '12px' }}>
                      {isDone ? 'Completed · tap to rate' : isLocked ? 'Locked' : isStarted ? 'In progress · tap to finish' : 'Tap to open'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="gallery">
          {path.nodes.map((n, idx) => {
            const isDone = n.status === 'done'
            const isCurrent = idx === firstUnfinished
            const isLocked = idx > firstUnfinished && firstUnfinished !== -1
            const isStarted = started[n.id]
            const meta = TYPE_META[n.resource.type] || TYPE_META.course
            const step = idx + 1
            return (
              <div key={n.id} className={`gallery-card ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}>
                <div className="gallery-top">
                  <span className="gallery-step">Step {step}</span>
                  <span className={`type type-${n.resource.type}`}>{meta.label}</span>
                  {isDone && <span className="gallery-check">✓ Done</span>}
                  {isCurrent && !isDone && <span className="gallery-current">Up next</span>}
                  {isLocked && <span className="gallery-lock">🔒 Locked</span>}
                </div>
                <div className="gallery-icon">{meta.icon}</div>
                <h4>{n.resource.title}</h4>
                <p className="reason">{n.reason}</p>
                <p className="muted" style={{ fontSize: '12px', margin: '8px 0 0' }}>
                  {n.resource.est_hours}h · {n.resource.media_type} · Teaches: {n.resource.skills_taught.join(', ')}
                </p>
                <div className="gallery-actions">
                  {isDone ? (
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button key={r} className={`star ${feedback[n.id] >= r ? 'on' : ''}`} onClick={() => sendFeedback(n, r)}>
                          ★
                        </button>
                      ))}
                    </div>
                  ) : isLocked ? (
                    <span className="muted" style={{ fontSize: '13px' }}>
                      Complete Step {step - 1} to unlock
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}