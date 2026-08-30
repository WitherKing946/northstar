import { useState } from 'react'
import { api } from '../api.js'

const TYPE_META = {
  course: { icon: '📘', label: 'Course' },
  project: { icon: '▣', label: 'Project' },
  assessment: { icon: '✦', label: 'Checkpoint' },
}

const BRANCHES = [
  {
    id: 'web',
    domain: 'web development',
    label: 'Web Development',
    color: '#c07a1a',
    icon: '💻',
    goal: 'I want to become a frontend web developer',
    steps: ['HTML Basics', 'CSS Fundamentals', 'JavaScript Basics', 'React Fundamentals'],
  },
  {
    id: 'data',
    domain: 'data science',
    label: 'Data Science',
    color: '#2d6a4f',
    icon: '📊',
    goal: 'I want to become a data scientist specializing in machine learning',
    steps: ['Python for Data Science', 'Machine Learning Foundations', 'Deep Learning', 'ML Project'],
  },
  {
    id: 'marketing',
    domain: 'digital marketing',
    label: 'Digital Marketing',
    color: '#7c3aed',
    icon: '📣',
    goal: 'I want to become a digital marketing specialist',
    steps: ['Marketing Fundamentals', 'SEO Basics', 'Content Strategy', 'Social Media Project'],
  },
]

export default function Roadmap({ path, onRefresh, onChat }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({})
  const [openId, setOpenId] = useState(null)
  const [started, setStarted] = useState({})
  const [view, setView] = useState('timeline')
  const [switching, setSwitching] = useState(null)

  const firstUnfinished = path.nodes.findIndex((n) => n.status !== 'done')
  const doneCount = path.nodes.filter((n) => n.status === 'done').length
  const fillPct = path.nodes.length ? (doneCount / path.nodes.length) * 100 : 0
  const learnerDomain = (() => {
    try {
      const interests = JSON.parse(localStorage.getItem('ns.learner') || '{}').interests || []
      return interests[0] || 'data science'
    } catch {
      return 'data science'
    }
  })()

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

  async function switchBranch(branch) {
    const learner = JSON.parse(localStorage.getItem('ns.learner') || 'null')
    if (!learner) return
    setSwitching(branch.id)
    try {
      await api.setGoal(learner.id, branch.goal)
      const fresh = await api.generatePath(learner.id)
      localStorage.setItem('ns.path', JSON.stringify(fresh))
      onRefresh(fresh)
      setView('timeline')
    } catch (e) {
      setError(e.message)
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div>
      <div className="card path-header">
        <div className="flex-between">
          <div>
            <h2>Your path</h2>
            <p className="muted">Step through your trail — or peek at where the other roads lead.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="view-toggle">
              <button className={`view-btn ${view === 'timeline' ? 'on' : ''}`} onClick={() => setView('timeline')}>
                Timeline
              </button>
              <button className={`view-btn ${view === 'branches' ? 'on' : ''}`} onClick={() => setView('branches')}>
                Roadmaps
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
        <div className="branch-map">
          <div className="branch-start">
            <div className="branch-start-dot">You</div>
            <div className="branch-start-line" />
            <div className="branch-decision">
              <span>Choose your road</span>
            </div>
          </div>

          <div className="branch-svg-wrap" aria-hidden>
            <svg viewBox="0 0 640 80" preserveAspectRatio="none" className="branch-svg">
              <path d="M 320 0 C 320 28, 110 28, 110 80" fill="none" stroke="#e8ddd2" strokeWidth="3" strokeLinecap="round" />
              <path d="M 320 0 C 320 28, 320 28, 320 80" fill="none" stroke="#e8ddd2" strokeWidth="3" strokeLinecap="round" />
              <path d="M 320 0 C 320 28, 530 28, 530 80" fill="none" stroke="#e8ddd2" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          <div className="branch-grid">
            {BRANCHES.map((b) => {
              const isActive = b.domain === learnerDomain || path.goal.toLowerCase().includes(b.domain.split(' ')[0])
              return (
                <div key={b.id} className={`branch-col ${isActive ? 'active' : ''}`}>
                  <div className="branch-head" style={{ borderColor: b.color }}>
                    <span className="branch-icon">{b.icon}</span>
                    <h4>{b.label}</h4>
                    {isActive && <span className="branch-badge">You are here</span>}
                  </div>
                  <div className="branch-steps">
                    {b.steps.map((s, i) => {
                      const isStepDone = isActive && i < doneCount
                      return (
                        <div key={s} className={`branch-step ${isStepDone ? 'done' : ''} ${isActive && i === doneCount ? 'next' : ''}`}>
                          <span className="branch-step-dot">{isStepDone ? '✓' : i + 1}</span>
                          <span className="branch-step-title">{s}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    className={isActive ? 'ghost' : 'primary'}
                    style={{ width: '100%', marginTop: '14px' }}
                    disabled={switching !== null}
                    onClick={() => switchBranch(b)}
                  >
                    {switching === b.id ? 'Switching…' : isActive ? 'Current road' : `Switch to ${b.label} →`}
                  </button>
                  <p className="muted" style={{ fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
                    Dummy road — preview of a similar goal
                  </p>
                </div>
              )
            })}
          </div>

          <p className="muted" style={{ textAlign: 'center', marginTop: '18px', fontSize: '12px' }}>
            Pick a road to regenerate your path. Your current progress is saved; milestones re-track automatically.
          </p>
        </div>
      )}
    </div>
  )
}