import { useState } from 'react'
import { api } from '../api.js'

const SUGGESTIONS = [
  'Why was the first item recommended before the next one?',
  'If I struggle with the basics, what should I do?',
  'Should I skip the checkpoint assessments?',
]

export default function Chat({ learner, onBack }) {
  const [q, setQ] = useState('')
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)

  async function ask(question) {
    const text = question.trim()
    if (!text || busy) return
    setBusy(true)
    setHistory((h) => [...h, { role: 'user', text }])
    try {
      const res = await api.chat(text, learner.id)
      setHistory((h) => [...h, { role: 'assistant', text: res.answer }])
    } catch {
      setHistory((h) => [
        ...h,
        { role: 'assistant', text: "Sorry, I couldn't reach the assistant. Try again." },
      ])
    } finally {
      setQ('')
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="flex-between">
        <h2>Ask the assistant</h2>
        <button className="ghost" onClick={onBack}>
          Back to roadmap
        </button>
      </div>

      <div className="chat-log">
        {history.length === 0 && (
          <div className="suggestions">
            <p className="muted">Try one of these:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="ghost small" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg assistant">Thinking…</div>}
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about your path…"
        />
        <button className="primary" disabled={busy || !q.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}