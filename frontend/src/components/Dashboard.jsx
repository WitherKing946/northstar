import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Dashboard({ learner, onTab, refreshKey }) {
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
  }, [learner.id, refreshKey])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="muted">Loading dashboard…</p>

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <div className="dash-grid">
        <div className="dash-tile">
          <span className="dash-num">{data.progress_percent}%</span>
          <span className="muted">path complete</span>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${data.progress_percent}%` }} />
          </div>
        </div>
        <div className="dash-tile">
          <span className="dash-num">
            {data.milestones_done}/{data.milestones_total}
          </span>
          <span className="muted">milestones done</span>
        </div>
        <div className="dash-tile">
          <span className="dash-num">{data.known_skills.length}</span>
          <span className="muted">skills started</span>
        </div>
      </div>

      <h3>Next actions</h3>
      {data.next_actions.length === 0 ? (
        <p className="muted">Path complete. Set a new goal from your profile to keep going!</p>
      ) : (
        <ul className="next-actions">
          {data.next_actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <h3>Known skills</h3>
      <div className="chips">
        {data.known_skills.length === 0 ? (
          <span className="muted">No skills tracked yet.</span>
        ) : (
          data.known_skills.map((s) => (
            <span key={s} className="chip chip-on">
              {s}
            </span>
          ))
        )}
      </div>

      <button className="ghost" onClick={() => onTab('roadmap')} style={{ marginTop: '16px' }}>
        Open My Path
      </button>
    </div>
  )
}