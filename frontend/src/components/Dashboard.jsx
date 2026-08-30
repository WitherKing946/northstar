import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Dashboard({ learner, onTab }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api
      .dashboard(learner.id)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [learner.id])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading dashboard…</p>

  const isNew = data.progress_percent === 0

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Welcome */}
      <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <h2 style={{ fontSize: '20px' }}>{isNew ? 'Welcome, Alicia — your journey starts here' : 'Welcome back, Alicia'}</h2>
          <p className="muted" style={{ marginTop: '6px' }}>
            {isNew
              ? "You're new here, so we built you a fresh path from scratch. Start with the first step — we'll track every milestone for you automatically."
              : `You're ${data.progress_percent}% through your path. Keep going — the next step is ready for you.`}
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button className="primary accent" onClick={() => onTab('roadmap')}>
              {isNew ? 'Start learning →' : 'Continue learning →'}
            </button>
            <button className="ghost" onClick={() => onTab('explore')}>
              Explore courses
            </button>
          </div>
        </div>
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fff7e8 0%, #fef3c7 100%)',
            border: '1px solid var(--line)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '36px',
            flexShrink: 0,
          }}
        >
          {isNew ? '🌱' : '✦'}
        </div>
      </div>

      {/* Progress overview */}
      <div className="card">
        <div className="flex-between">
          <h3 style={{ margin: 0 }}>Your progress</h3>
          <span className="badge">
            {data.milestones_done}/{data.milestones_total} milestones
          </span>
        </div>
        <div className="dash-grid" style={{ marginTop: '16px' }}>
          <div className="dash-tile">
            <span className="dash-num">{data.progress_percent}%</span>
            <span className="muted">path complete</span>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${data.progress_percent}%` }} />
            </div>
            <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
              {isNew ? 'No steps finished yet — milestones fill as you complete courses.' : 'Milestones update automatically when you finish a course.'}
            </p>
          </div>
          <div className="dash-tile">
            <span className="dash-num">{data.milestones_done}</span>
            <span className="muted">milestones unlocked</span>
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--muted)' }}>
              {isNew ? 'Finish your first course to unlock Milestone 1.' : `${data.milestones_total - data.milestones_done} to go`}
            </div>
          </div>
          <div className="dash-tile">
            <span className="dash-num">{data.known_skills.length}</span>
            <span className="muted">skills started</span>
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--muted)' }}>
              {isNew ? 'Skills appear here as you learn.' : 'Keep building your skill map'}
            </div>
          </div>
        </div>
      </div>

      {/* Next up */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Up next</h3>
        {data.next_actions.length === 0 ? (
          <p className="muted">Path complete. Set a new goal from your profile to keep going!</p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: '12px' }}>
              {isNew ? 'Your first recommended step — open it and hit Start learning.' : 'Picked for you based on prerequisites and your goal.'}
            </p>
            <ul className="next-actions">
              {data.next_actions.map((a, i) => (
                <li key={a} style={{ fontWeight: i === 0 ? 600 : 400 }}>
                  {a} {i === 0 && <span className="badge" style={{ marginLeft: 'auto' }}>Next</span>}
                </li>
              ))}
            </ul>
            <button className="primary" onClick={() => onTab('roadmap')} style={{ marginTop: '12px' }}>
              Open My Path
            </button>
          </>
        )}
      </div>

      {/* Skills */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Skills on your radar</h3>
        {data.known_skills.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--line)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <p className="muted">No skills yet — that's normal for a new learner.</p>
            <p className="muted" style={{ fontSize: '12px' }}>Complete a course and your skills light up here automatically.</p>
          </div>
        ) : (
          <div className="chips">
            {data.known_skills.map((s) => (
              <span key={s} className="chip chip-on">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* How it works for new users */}
      {isNew && (
        <div className="card" style={{ background: 'var(--bg2)' }}>
          <h3 style={{ marginTop: 0 }}>How North Star works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '12px' }}>
            <div>
              <strong>1. Open a course</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>Tap any card in My Path and hit Start learning.</p>
            </div>
            <div>
              <strong>2. Mark finished</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>When done, mark it as finished.</p>
            </div>
            <div>
              <strong>3. Milestones track themselves</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>No buttons — progress fills automatically.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}