import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

const SUGGESTIONS = [
  'Why was my first step chosen?',
  'What should I do if I get stuck?',
  'Can I skip a checkpoint?',
  'How does North Star decide the order?',
]

export default function Chat({ learner, onBack }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ns.chat') || '[]')
    } catch {
      return []
    }
  })
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('ns.chat', JSON.stringify(history.slice(-20)))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  async function ask(text) {
    const question = text.trim()
    if (!question || busy) return
    setHistory((h) => [...h, { role: 'user', text: question }])
    setInput('')
    setBusy(true)
    try {
      const res = await api.chat(question, learner.id)
      setHistory((h) => [...h, { role: 'assistant', text: res.answer }])
    } catch {
      setHistory((h) => [...h, { role: 'assistant', text: 'The assistant is offline right now. Try again in a moment.' }])
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setHistory([])
    localStorage.removeItem('ns.chat')
  }

  return (
    <div className="card">
      <div className="flex-between">
        <div>
          <h2>Assistant</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Embedded AI — grounded on your path, no external server needed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="ghost small" onClick={clear}>
            Clear
          </button>
          <button className="ghost small" onClick={onBack}>
            Back to path
          </button>
        </div>
      </div>

      <div className="chat-log" style={{ marginTop: '16px' }}>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <p className="muted">Ask about your path — I explain why each step is next.</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <span className="loading-dot" /> <span className="loading-dot" /> <span className="loading-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask why a step is next, or what to do if stuck…" />
        <button className="primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      <p className="muted" style={{ fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
        Dummy catalog · answers are templated and grounded on your engine reasons.
      </p>
    </div>
  )
}