import { useState } from 'react'
import { api, store } from '../api.js'

const STEPS = ['Welcome', 'Name', 'Interests', 'Level', 'Goal']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    interests: [],
    experience_level: 'beginner',
    learning_style: 'mixed',
    time_budget: 5,
    goal: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function toggleInterest(v) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter((x) => x !== v) : [...f.interests, v],
    }))
  }

  async function finish() {
    if (!form.name.trim() || !form.goal.trim()) {
      setError('Please fill in your name and goal.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const learner = await api.createLearner({
        name: form.name.trim(),
        interests: form.interests,
        experience_level: form.experience_level,
        learning_style: form.learning_style,
        time_budget: Number(form.time_budget) || 5,
      })
      await api.setGoal(learner.id, form.goal.trim())
      const path = await api.generatePath(learner.id)
      store.learner = learner
      store.path = path
      onComplete(learner, path)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: i <= step ? 'var(--text)' : 'var(--bg2)',
                color: i <= step ? '#fff' : 'var(--muted)',
                border: `1px solid ${i <= step ? 'var(--text)' : 'var(--line)'}`,
                display: 'grid',
                placeItems: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div style={{ width: '24px', height: '2px', background: i < step ? 'var(--text)' : 'var(--line)' }} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ textAlign: 'center' }}>
          <h2>Welcome to North Star</h2>
          <p className="muted">We’ll ask you a few quick questions to build your personalized learning path. Takes ~30 seconds.</p>
          <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>✦ Personalized roadmaps</p>
            <p style={{ fontSize: '14px', margin: '8px 0 0' }}>✦ Prerequisite-aware ordering</p>
            <p style={{ fontSize: '14px', margin: '8px 0 0' }}>✦ Progress that tracks automatically</p>
          </div>
          <button className="primary" onClick={() => setStep(1)} style={{ marginTop: '20px' }}>
            Get started →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2>What should we call you?</h2>
          <p className="muted">This is how your dashboard will greet you.</p>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Rivera" autoFocus />
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="primary" disabled={!form.name.trim()} onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>What are you interested in?</h2>
          <p className="muted">Pick at least one — we’ll tailor your path around it.</p>
          <div className="chips" style={{ marginTop: '12px' }}>
            {['web development', 'data science', 'digital marketing'].map((d) => (
              <button key={d} type="button" className={`chip ${form.interests.includes(d) ? 'chip-on' : ''}`} onClick={() => toggleInterest(d)}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="primary" disabled={form.interests.length === 0} onClick={() => setStep(3)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Tell us about your learning style</h2>
          <div className="row">
            <label>
              Level
              <select value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              Style
              <select value={form.learning_style} onChange={(e) => setForm({ ...form, learning_style: e.target.value })}>
                <option value="mixed">Mixed</option>
                <option value="visual">Visual</option>
                <option value="hands-on">Hands-on</option>
                <option value="reading">Reading</option>
              </select>
            </label>
            <label>
              Hours / week
              <input type="number" min="1" max="40" value={form.time_budget} onChange={(e) => setForm({ ...form, time_budget: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="primary" onClick={() => setStep(4)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>What’s your goal?</h2>
          <p className="muted">Describe in your own words — e.g. “I want to become a data scientist”.</p>
          <textarea rows="3" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="I want to build my own websites and land a frontend job…" autoFocus />
          {error && <p className="error">{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="ghost" onClick={() => setStep(3)}>
              Back
            </button>
            <button className="primary" disabled={busy || !form.goal.trim()} onClick={finish}>
              {busy ? 'Building your path…' : 'Create my path →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}