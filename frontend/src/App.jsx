import { useEffect, useState } from 'react'
import { api, store } from './api.js'
import Profile from './components/Profile.jsx'
import Goal from './components/Goal.jsx'
import Roadmap from './components/Roadmap.jsx'
import Dashboard from './components/Dashboard.jsx'
import Chat from './components/Chat.jsx'

export default function App() {
  const [learner, setLearner] = useState(store.learner)
  const [path, setPath] = useState(store.path)
  const [tab, setTab] = useState('setup')

  useEffect(() => {
    void api
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

  function reset() {
    store.clear()
    setLearner(null)
    setPath(null)
    setTab('setup')
  }

  const hasLearner = Boolean(learner)
  const hasPath = Boolean(path)

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <span className="brand-star">✦</span>
          <span>North Star</span>
        </div>
        <nav>
          {hasLearner && (
            <button className={tab === 'goal' ? 'tab on' : 'tab'} onClick={() => setTab('goal')}>
              Goal
            </button>
          )}
          {hasPath && (
            <>
              <button
                className={tab === 'roadmap' ? 'tab on' : 'tab'}
                onClick={() => setTab('roadmap')}
              >
                Roadmap
              </button>
              <button
                className={tab === 'dashboard' ? 'tab on' : 'tab'}
                onClick={() => setTab('dashboard')}
              >
                Dashboard
              </button>
              <button className={tab === 'chat' ? 'tab on' : 'tab'} onClick={() => setTab('chat')}>
                Assistant
              </button>
            </>
          )}
          {hasLearner && (
            <button className="tab" onClick={reset}>
              New learner
            </button>
          )}
        </nav>
      </header>

      <main className="content">
        {!hasLearner && <Profile onCreated={created} />}

        {hasLearner && tab === 'goal' && <Goal learner={learner} onPath={gotPath} />}

        {hasPath && tab === 'roadmap' && (
          <Roadmap path={path} onRefresh={refreshPath} onChat={() => setTab('chat')} />
        )}

        {hasPath && tab === 'dashboard' && (
          <Dashboard learner={learner} onTab={setTab} />
        )}

        {hasPath && tab === 'chat' && <Chat learner={learner} onBack={() => setTab('roadmap')} />}
      </main>
    </div>
  )
}