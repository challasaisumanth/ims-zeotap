import { useEffect, useState } from 'react'
import axios from 'axios'

const SEV = {
  P0: { bg: 'rgba(255,68,68,0.15)', border: 'rgba(255,68,68,0.4)', text: '#ff6b6b' },
  P1: { bg: 'rgba(255,149,0,0.15)', border: 'rgba(255,149,0,0.4)', text: '#ffaa00' },
  P2: { bg: 'rgba(255,214,0,0.12)', border: 'rgba(255,214,0,0.35)', text: '#ffd600' },
  P3: { bg: 'rgba(0,200,255,0.1)', border: 'rgba(0,200,255,0.3)', text: '#00c8ff' },
}

const STATE_COLOR = {
  OPEN: '#ff4444', INVESTIGATING: '#ff9500', RESOLVED: '#ffd600', CLOSED: '#00ff88',
}

export default function IncidentFeed({ onSelect, selectedId, wsItems }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Prefer websocket data
  useEffect(() => {
    if (wsItems !== undefined) {
      setItems(Array.isArray(wsItems) ? wsItems : [])
      setLoading(false)
      setLastUpdate(new Date())
    }
  }, [wsItems])

  // Fallback polling if no websocket
  useEffect(() => {
    if (wsItems !== undefined) return
    const fetch = async () => {
      try {
        const res = await axios.get('/api/workitems/')
        setItems(Array.isArray(res.data) ? res.data : [])
        setLastUpdate(new Date())
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
    const i = setInterval(fetch, 5000)
    return () => clearInterval(i)
  }, [wsItems])

  const renderItem = (item) => {
    const sev = SEV[item.severity] || SEV.P3
    const isSelected = selectedId === item.id
    return (
      <button
        key={item.id}
        className="incident-card"
        onClick={() => onSelect(item.id)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '11px 16px',
          background: isSelected ? 'rgba(0,255,136,0.04)' : 'transparent',
          borderLeft: isSelected ? '2px solid #00ff88' : '2px solid transparent',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: '1px solid #1a1f2e',
          cursor: 'pointer',
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: isSelected ? '#00ff88' : '#e2e8f0',
            letterSpacing: '0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '65%'
          }}>
            {item.component_id}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2,
            background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text,
            letterSpacing: '0.1em', flexShrink: 0
          }}>
            {item.severity}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: STATE_COLOR[item.state] || '#888',
              boxShadow: item.state === 'OPEN' ? `0 0 5px ${STATE_COLOR[item.state]}` : 'none'
            }} />
            <span style={{ fontSize: 9, color: STATE_COLOR[item.state] || '#888', letterSpacing: '0.07em' }}>
              {item.state}
            </span>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{item.signal_count} sig</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
          {item.component_type} · {new Date(item.created_at).toLocaleTimeString()}
        </div>
      </button>
    )
  }

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  )

  if (items.length === 0) return (
    <div style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>NO INCIDENTS</div>
      <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.3)', marginTop: 6 }}>All systems operational</div>
    </div>
  )

  const open = items.filter(i => i.state !== 'CLOSED')
  const closed = items.filter(i => i.state === 'CLOSED')

  return (
    <div>
      {open.length > 0 && (
        <div>
          <div style={{ padding: '5px 16px', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,68,68,0.5)', borderBottom: '1px solid #1a1f2e', background: 'rgba(255,68,68,0.025)' }}>
            ACTIVE — {open.length}
          </div>
          {open.map(renderItem)}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <div style={{ padding: '5px 16px', fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,255,136,0.35)', borderBottom: '1px solid #1a1f2e', background: 'rgba(0,255,136,0.015)' }}>
            CLOSED — {closed.length}
          </div>
          {closed.map(renderItem)}
        </div>
      )}
      {lastUpdate && (
        <div style={{ padding: '5px 16px', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: '0.05em', borderTop: '1px solid #1a1f2e' }}>
          UPDATED {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}