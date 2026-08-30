import { useState } from 'react'
import { api } from '../api.js'

export default function Goal({ learner, onPath }) {
  const [goal, setGoal] = useState('')
  const [parsed, setParsed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!goal.trim()) return
    setBusy(true)
    setError('')
    try {
      setParsed(await api.setGoal(learner.id, goal.trim()))
      const path = await api.generatePath(learner.id)
      onPath(path)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>What do you want to learn?</h2>
      <p className="muted">Describe your goal in a sentence or two — e.g. "I want to become a data scientist".</p>
      <form onSubmit={submit}>
        <textarea
          rows="3"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="I want to build my own websites and land a frontend job…"
        />
        {error && <p className="error">{error}</p>}
        {parsed && (
          <div className="parsed">
            <strong>Understood as:</strong> domain <code>{parsed.domain || 'any'}</code>
            {parsed.skill_targets?.length > 0 && (
              <span>
                {' '}· targets <code>{parsed.skill_targets.join(', ')}</code>
              </span>
            )}
          </div>
        )}
        <button className="primary" disabled={busy || !goal.trim()}>
          {busy ? 'Finding your path…' : 'Generate my roadmap'}
        </button>
      </form>
    </div>
  )
}