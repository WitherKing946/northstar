import { useEffect, useState } from 'react'
import { store } from './api.js'
import { ensureDemoLearner } from './demo.js'
import Roadmap from './components/Roadmap.jsx'
import Dashboard from './components/Dashboard.jsx'
import Chat from './components/Chat.jsx'
import Explore from './components/Explore.jsx'
import Goal from './components/Goal.jsx'
import Profile from './components/Profile.jsx'

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    path: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="3.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="12.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="12.5" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.5 8H10.5M10.5 5.2L7.2 8L10.5 10.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    explore: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 2.5V13.5M2.5 8H13.5M4.2 4.2L11.8 11.8M11.8 4.2L4.2 11.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      </svg>
    ),
    assistant: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2.5 3.5H13.5V10.5H5L2.5 13V3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="6" cy="7" r="0.9" fill="currentColor" />
        <circle cx="8.5" cy="7" r="0.9" fill="currentColor" />
        <circle cx="11" cy="7" r="0.9" fill="currentColor" />
      </svg>
    ),
  }
  return <span style={{ display: 'grid', placeItems: 'center', opacity: 0.85 }}>{icons[name]}</span>
}

export default function App() {
  const [learner, setLearner] = useState(store.learner)
  const [path, setPath] = useState(store.path)
  const [tab, setTab] = useState(store.learner ? 'dashboard' : 'dashboard')
  const [loading, setLoading] = useState(!store.learner)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setLoading(true)
      const { learner: l, path: p } = await ensureDemoLearner()
      if (cancelled) return
      if (l) setLearner(l)
      if (p) setPath(p)
      setTab(p ? 'dashboard' : 'goal')
      setLoading(false)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  function created(l) {
    store.learner = l
    setLearner(l)
    setTab('goal')
  }

  function gotPath(p) {
    store.path = p
    setPath(p)
    setTab('roadmap')
  }

  function refreshPath(p) {
    store.path = p
    setPath(p)
  }

  function switchToAlicia() {
    store.clear()
    setLearner(null)
    setPath(null)
    setLoading(true)
    ensureDemoLearner().then(({ learner: l, path: p }) => {
      setLearner(l)
      setPath(p)
      setTab(p ? 'dashboard' : 'goal')
      setLoading(false)
    })
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
          <p className="muted">Preparing Alicia's workspace…</p>
        </div>
      </div>
    )
  }

  const hasLearner = Boolean(learner)
  const hasPath = Boolean(path)

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2.5L13.7 9.2L20.5 11L13.7 12.8L12 19.5L10.3 12.8L3.5 11L10.3 9.2L12 2.5Z"
                  fill="#ffdf8a"
                  stroke="#ffdf8a"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="11" r="2.2" fill="#1a1a18" />
                <path
                  d="M12 7V5M12 17V15M7 11H5M19 11H17M8.2 7.2L6.8 5.8M17.2 16.2L15.8 14.8M15.8 7.2L17.2 5.8M6.8 16.2L8.2 14.8"
                  stroke="rgba(255,223,138,0.55)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="brand-wordmark">
              <span className="brand-name">
                North <em>Star</em>
              </span>
              <span className="brand-sub">Learn with direction</span>
            </div>
          </div>

          <div className="nav-center">
            <button className={`nav-tab ${tab === 'dashboard' ? 'on' : ''}`} onClick={() => setTab('dashboard')}>
              <NavIcon name="dashboard" /> Dashboard
            </button>
            <button
              className={`nav-tab ${tab === 'roadmap' ? 'on' : ''}`}
              onClick={() => hasPath && setTab('roadmap')}
              disabled={!hasPath}
              title={!hasPath ? 'Create a goal first' : ''}
            >
              <NavIcon name="path" /> My Path
            </button>
            <button className={`nav-tab ${tab === 'explore' ? 'on' : ''}`} onClick={() => setTab('explore')}>
              <NavIcon name="explore" /> Explore
            </button>
            <button
              className={`nav-tab ${tab === 'chat' ? 'on' : ''}`}
              onClick={() => hasPath && setTab('chat')}
              disabled={!hasPath}
            >
              <NavIcon name="assistant" /> Assistant
            </button>
          </div>

          <div className="nav-right">
            <div className="search-box">
              <span style={{ color: 'var(--muted)' }}>⌕</span>
              <input
                placeholder="Search courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) setTab('explore')
                }}
              />
            </div>
            <div className="user-chip" onClick={() => setTab('profile')} title="View profile">
              <div className="avatar">AB</div>
              <div className="user-meta">
                <span className="user-name">Alicia Bobster</span>
                <span className="user-role">Intermediate · Data Science</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="app">
        <main className="content">
          {tab === 'dashboard' && hasLearner && hasPath && (
            <>
              <div className="hero">
                <div className="hero-text">
                  <h1>Welcome back, Alicia</h1>
                  <p>
                    Your data science path is {Math.round(((path.nodes.filter((n) => n.status === 'done').length / path.nodes.length) * 100) || 0)}%
                    complete. Keep the momentum — your next milestone is waiting.
                  </p>
                </div>
                <div className="hero-stats">
                  <div className="stat">
                    <div className="stat-num">{path.nodes.length}</div>
                    <div className="stat-label">Steps</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">{path.nodes.filter((n) => n.status === 'done').length}</div>
                    <div className="stat-label">Done</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">{[...new Set(path.nodes.map((n) => n.milestone))].length}</div>
                    <div className="stat-label">Milestones</div>
                  </div>
                </div>
              </div>
              <Dashboard learner={learner} onTab={setTab} />
            </>
          )}

          {tab === 'dashboard' && (!hasLearner || !hasPath) && (
            <div className="card">
              <p className="muted">Setting up your dashboard…</p>
            </div>
          )}

          {tab === 'roadmap' && hasPath && (
            <Roadmap path={path} onRefresh={refreshPath} onChat={() => setTab('chat')} />
          )}

          {tab === 'explore' && <Explore onSelectDomain={() => setTab('roadmap')} />}

          {tab === 'chat' && hasLearner && <Chat learner={learner} onBack={() => setTab('roadmap')} />}

          {tab === 'goal' && hasLearner && <Goal learner={learner} onPath={gotPath} />}

          {tab === 'profile' && (
            <div className="card">
              <h2>Alicia Bobster</h2>
              <p className="muted">Intermediate · Visual learner · 8 hrs/week · Data Science</p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="chip chip-on">Data Science</span>
                <span className="chip">Visual</span>
                <span className="chip">Intermediate</span>
              </div>
              <p className="muted" style={{ marginTop: '16px' }}>
                This is a demo profile. Create another learner to test different paths.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="primary" onClick={() => setTab('goal')}>
                  Change goal
                </button>
                <button className="ghost" onClick={switchToAlicia}>
                  Reset demo
                </button>
              </div>
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <h3 style={{ margin: '0 0 8px' }}>Create a new learner</h3>
                <Profile onCreated={created} />
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          North Star — personalized learning paths · Demo by the team · Built with FastAPI + React · Data stays local
        </footer>
      </div>
    </>
  )
}