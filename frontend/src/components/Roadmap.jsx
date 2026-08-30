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
              <button className={`view-btn ${view === 'flowchart' ? 'on' : ''}`} onClick={() => setView('flowchart')}>
                Flowchart
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
        <div className="flow-redesign">
          <div className="flow-intro">
            <p className="muted" style={{ textAlign: 'center', fontSize: '13px' }}>
              Your current road is highlighted. The other branches are previews of similar goals — switch anytime, progress saves.
            </p>
          </div>

          <div className="flow-start">
            <div className="flow-start-pill">Start — your goal</div>
            <div className="flow-start-sub muted">{path.goal}</div>
          </div>

          <div className="flow-bend">
            <svg viewBox="0 0 640 60" preserveAspectRatio="none" className="flow-bend-svg" aria-hidden>
              <path d="M 320 0 L 320 20 C 320 32 320 32 180 46 C 110 54 110 58 110 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 320 0 L 320 20 C 320 32 320 32 320 46 L 320 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 320 0 L 320 20 C 320 32 320 32 460 46 C 530 54 530 58 530 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="320" cy="8" r="4" fill="#c07a1a" />
            </svg>
            <div className="flow-bend-label">Choose your direction</div>
          </div>

          <div className="flow-branches">
            {BRANCHES.map((b) => {
              const isActive = b.domain === learnerDomain || path.goal.toLowerCase().includes(b.domain.split(' ')[0])
              const activeDone = isActive ? doneCount : 0
              return (
                <div key={b.id} className={`flow-branch ${isActive ? 'active' : ''}`}>
                  <div className="flow-branch-head" style={{ borderTopColor: b.color }}>
                    <span className="flow-branch-icon">{b.icon}</span>
                    <h4>{b.label}</h4>
                    {isActive && <span className="flow-branch-badge">You are here</span>}
                  </div>
                  <div className="flow-branch-track">
                    {b.steps.map((s, i) => {
                      const done = isActive && i < activeDone
                      const next = isActive && i === activeDone
                      return (
                        <div key={s} className={`flow-step ${done ? 'done' : ''} ${next ? 'next' : ''}`}>
                          <span className="flow-step-dot">{done ? '✓' : i + 1}</span>
                          <span className="flow-step-title">{s}</span>
                          {next && <span className="flow-step-next">• next</span>}
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
                    {switching === b.id ? 'Switching…' : isActive ? 'Current road' : `Try ${b.label} →`}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flow-merge">
            <svg viewBox="0 0 640 60" preserveAspectRatio="none" className="flow-bend-svg" aria-hidden>
              <path d="M 110 0 L 110 14 C 110 28 110 32 320 46 L 320 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 320 0 L 320 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 530 0 L 530 14 C 530 28 530 32 320 46 L 320 60" fill="none" stroke="#e8ddd2" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="flow-merge-pill">Continue — milestones track automatically</div>
          </div>
        </div>
      )}
    </div>
  )
}