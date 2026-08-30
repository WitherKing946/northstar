import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const DOMAINS = ['All', 'web development', 'data science', 'digital marketing']
const TYPES = ['All', 'course', 'project', 'assessment']

export default function Explore({ onSelectDomain }) {
  const [resources, setResources] = useState([])
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState('All')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.resources().then(setResources).catch(() => setResources([])).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const text = `${r.title} ${r.skills_taught.join(' ')}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (domain !== 'All' && !r.skills_taught.some(() => true)) {
        // domain filter via title heuristic + skills
        const d = domain.toLowerCase()
        const hay = `${r.title} ${r.skills_taught.join(' ')}`.toLowerCase()
        if (d === 'web development' && !hay.match(/web|react|javascript|html|css|node/)) return false
        if (d === 'data science' && !hay.match(/python|data|machine|learning|pandas|numpy|deep/)) return false
        if (d === 'digital marketing' && !hay.match(/marketing|seo|content|social/)) return false
      }
      if (type !== 'All' && r.type !== type) return false
      return true
    })
  }, [resources, q, domain, type])

  if (loading) return <p className="muted">Loading catalog…</p>

  return (
    <div>
      <div className="card">
        <h2>Explore</h2>
        <p className="muted">Browse the full catalog. Everything here is dummy — no external links. Filter and search to preview what North Star can sequence for you.</p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <input
            placeholder="Search by title or skill…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: '180px' }}
          />
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

        <p className="muted" style={{ marginTop: '12px', fontSize: '12px' }}>
          Showing {filtered.length} of {resources.length} resources · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{filtered.filter((r) => r.type === 'course').length} courses</span>
        </p>
      </div>

      <div className="explore-grid">
        {filtered.map((r) => (
          <div key={r.id} className="explore-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className={`type type-${r.type}`}>{r.type}</span>
              <span className="muted" style={{ fontSize: '12px' }}>
                {r.est_hours}h · {r.media_type}
              </span>
            </div>
            <h4 style={{ margin: '0 0 6px' }}>{r.title}</h4>
            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
              Teaches: {r.skills_taught.join(', ') || '—'}
            </p>
            <div className="chips" style={{ marginTop: '10px' }}>
              {r.skills_taught.slice(0, 3).map((s) => (
                <span key={s} className="chip" style={{ fontSize: '11px', padding: '4px 8px' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: '20px' }}>No matches — try a broader filter.</p>}

      <div className="card" style={{ marginTop: '16px', textAlign: 'center' }}>
        <p className="muted">Want these sequenced by prerequisites?</p>
        <button className="primary" onClick={() => onSelectDomain && onSelectDomain()}>
          Go to My Path
        </button>
      </div>
    </div>
  )
}