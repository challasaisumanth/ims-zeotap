import { useEffect, useState } from 'react'
import axios from 'axios'

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid #1a1f2e',
      borderRadius: 4,
      padding: '10px 12px',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        fontSize: 8,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.1em',
        marginBottom: 6,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>{label}</div>
      <div style={{
        fontSize: 20,
        fontWeight: 600,
        color: color || '#e2e8f0',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>{value ?? '—'}</div>
      {sub && (
        <div style={{
          fontSize: 8,
          color: 'rgba(255,255,255,0.2)',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>{sub}</div>
      )}
    </div>
  )
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 9, color: '#e2e8f0', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color || '#00ff88',
          borderRadius: 1,
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  )
}

export default function MetricsDashboard({ wsData }) {
  const [metrics, setMetrics] = useState(null)

  const fetchMetrics = async () => {
    try {
      const res = await axios.get('/api/metrics/summary')
      setMetrics(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchMetrics()
    const i = setInterval(fetchMetrics, 5000)
    return () => clearInterval(i)
  }, [])

  const sigPerSec = wsData?.throughput?.signals_per_sec ?? metrics?.signals_per_sec ?? 0
  const queueSize = wsData?.throughput?.queue_size ?? metrics?.queue_size ?? 0

  if (!metrics) return (
    <div style={{ padding: '16px', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
      LOADING METRICS...
    </div>
  )

  const total = metrics.total_incidents || 1

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1f2e' }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 10 }}>
        SYSTEM METRICS
      </div>

      {/* 2x2 grid instead of 4-column row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        <StatBox
          label="ACTIVE P0"
          value={metrics.active_p0}
          color={metrics.active_p0 > 0 ? '#ff4444' : '#00ff88'}
          sub={metrics.active_p0 > 0 ? 'CRITICAL' : 'CLEAR'}
        />
        <StatBox
          label="INCIDENTS"
          value={metrics.total_incidents}
          color="#e2e8f0"
        />
        <StatBox
          label="AVG MTTR"
          value={metrics.avg_mttr_minutes ? `${Math.round(metrics.avg_mttr_minutes)}m` : '—'}
          color="#00ff88"
          sub="time to repair"
        />
        <StatBox
          label="SIG/SEC"
          value={sigPerSec}
          color="#00c8ff"
          sub={`queue: ${queueSize}`}
        />
      </div>

      {/* State bars */}
      <MiniBar label="OPEN" value={metrics.open} max={total} color="#ff4444" />
      <MiniBar label="INVESTIGATING" value={metrics.investigating} max={total} color="#ff9500" />
      <MiniBar label="RESOLVED" value={metrics.resolved} max={total} color="#ffd600" />
      <MiniBar label="CLOSED" value={metrics.closed} max={total} color="#00ff88" />

      {/* Component breakdown */}
      {metrics.by_component_type?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: 6 }}>
            BY COMPONENT
          </div>
          {metrics.by_component_type.map(b => (
            <MiniBar key={b.type} label={b.type} value={b.count} max={total} color="#7c6eff" />
          ))}
        </div>
      )}
    </div>
  )
}