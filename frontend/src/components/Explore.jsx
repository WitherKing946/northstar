import { useEffect, useMemo, useState } from 'react'
import { api, store } from '../api.js'

const DOMAINS = ['All', 'web development', 'data science', 'digital marketing']
const TYPES = ['All', 'course', 'project', 'assessment']

export default function Explore({ onSelectDomain, searchQuery = '' }) {
  const [resources, setResources] = useState([])
  const [q, setQ] = useState(searchQuery)
  const [domain, setDomain] = useState('All')
  const [type, setType] = useState('All')
  const [skill, setSkill] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setQ(searchQuery)
  }, [searchQuery])
  const [enrolled, setEnrolled] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('ns.enrolled') || '[]'))
    } catch {
      return new Set()
    }
  })
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    api.resources().then(setResources).catch(() => setResources([])).finally(() => setLoading(false))
  }, [])

  const allSkills = useMemo(() => [...new Set(resources.flatMap((r) => r.skills_taught))].slice(0, 10), [resources])

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const text = `${r.title} ${r.skills_taught.join(' ')} ${r.domain}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (domain !== 'All' && (r.domain || '').toLowerCase() !== domain.toLowerCase()) return false
      if (type !== 'All' && r.type !== type) return false
      if (skill !== 'All' && !r.skills_taught.includes(skill)) return false
      return true
    })
  }, [resources, q, domain, type, skill])

  async function enroll(r) {
    const learner = store.learner
    if (!learner) return
    setBusy(r.id)
    try {
      await api.enroll(learner.id, r.id)
      const next = new Set(enrolled)
      next.add(r.id)
      setEnrolled(next)
      localStorage.setItem('ns.enrolled', JSON.stringify([...next]))
    } catch {}
    setBusy(null)
  }

  if (loading) return <p className="muted">Loading catalog…</p>

  return (
    <div>
      <div className="card">
        <h2>Explore</h2>
        <p className="muted">Browse the full catalog. Filter works live — try domain or type. Everything is dummy — Enroll adds it to your Dashboard.</p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <input placeholder="Search by title or skill…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: '180px' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          {DOMAINS.map((d) => (
            <button key={d} className={`chip ${domain === d ? 'chip-on' : ''}`} onClick={() => setDomain(d)}>
              {d === 'All' ? 'All domains' : d}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          {TYPES.map((t) => (
            <button key={t} className={`chip ${type === t ? 'chip-on' : ''}`} onClick={() => setType(t)}>
              {t === 'All' ? 'All types' : t}
            </button>
          ))}
        </div>
        {allSkills.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '11px', fontWeight: 600 }}>Tags:</span>
            <button className={`chip ${skill === 'All' ? 'chip-on' : ''}`} onClick={() => setSkill('All')}>
              All
            </button>
            {allSkills.map((s) => (
              <button key={s} className={`chip ${skill === s ? 'chip-on' : ''}`} onClick={() => setSkill(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <p className="muted" style={{ marginTop: '12px', fontSize: '12px' }}>
          Showing {filtered.length} of {resources.length} resources
        </p>
      </div>

      <div className="explore-grid">
        {filtered.map((r) => {
          const isEnrolled = enrolled.has(r.id)
          return (
            <div key={r.id} className="explore-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className={`type type-${r.type}`}>{r.type}</span>
                <span className="muted" style={{ fontSize: '12px' }}>
                  {r.est_hours}h · {r.media_type}
                </span>
              </div>
              <h4 style={{ margin: '0 0 6px' }}>{r.title}</h4>
              <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
                {r.domain ? `${r.domain} · ` : ''}Teaches: {r.skills_taught.join(', ') || '—'}
              </p>
              <div className="chips" style={{ marginTop: '8px' }}>
                {r.skills_taught.slice(0, 3).map((s) => (
                  <button key={s} className={`chip ${skill === s ? 'chip-on' : ''}`} style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => setSkill(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button className={isEnrolled ? 'ghost' : 'primary'} disabled={busy === r.id || isEnrolled} onClick={() => enroll(r)} style={{ flex: 1 }}>
                  {isEnrolled ? 'Enrolled ✓' : busy === r.id ? 'Enrolling…' : 'Enroll'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: '20px' }}>No matches — try a broader filter.</p>}

      <div className="card" style={{ marginTop: '16px', textAlign: 'center' }}>
        <p className="muted">Want these sequenced by prerequisites?</p>
        <button className="ghost" onClick={() => onSelectDomain && onSelectDomain()}>
          Go to My Path
        </button>
      </div>
    </div>
  )
}