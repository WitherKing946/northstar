import { useState } from 'react'
import { api } from '../api.js'

const LEVELS = ['beginner', 'intermediate', 'advanced']
const STYLES = ['mixed', 'visual', 'hands-on', 'reading']
const DOMAINS = [
  { value: 'web development', label: 'Web Development' },
  { value: 'data science', label: 'Data Science' },
  { value: 'digital marketing', label: 'Digital Marketing' },
]

export default function Profile({ onCreated }) {
  const [name, setName] = useState('')
  const [interests, setInterests] = useState([])
  const [level, setLevel] = useState('beginner')
  const [style, setStyle] = useState('mixed')
  const [hours, setHours] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function toggleInterest(d) {
    setInterests((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const learner = await api.createLearner({
        name: name.trim(),
        interests,
        experience_level: level,
        learning_style: style,
        time_budget: Number(hours) || 5,
      })
      onCreated(learner)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>Welcome to North Star</h2>
      <p className="muted">Tell us about yourself so we can build a learning path around you.</p>
      <form onSubmit={submit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
        </label>

        <label>
          Interests
          <div className="chips">
            {DOMAINS.map((d) => (
              <button
                type="button"
                key={d.value}
                className={`chip ${interests.includes(d.value) ? 'chip-on' : ''}`}
                onClick={() => toggleInterest(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </label>

        <div className="row">
          <label>
            Experience level
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Learning style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hours / week
            <input
              type="number"
              min="1"
              max="40"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}