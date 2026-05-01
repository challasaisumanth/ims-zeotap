import { useState } from 'react'
import axios from 'axios'

const COMPONENTS = [
  { id: 'POSTGRES_PRIMARY_01', type: 'RDBMS' },
  { id: 'REDIS_CLUSTER_01', type: 'CACHE' },
  { id: 'MCP_HOST_01', type: 'MCP' },
  { id: 'API_GATEWAY_01', type: 'API' },
  { id: 'KAFKA_BROKER_01', type: 'QUEUE' },
  { id: 'MONGODB_01', type: 'NOSQL' },
]

const ERRORS = {
  RDBMS: ['Connection refused: too many clients', 'Deadlock detected on table orders', 'Replication lag exceeded 30s', 'Disk usage at 95%'],
  CACHE: ['Cache miss rate exceeded 90%', 'Redis OOM — maxmemory reached', 'Cluster node unreachable', 'Latency spike 800ms'],
  MCP: ['Health check timeout after 30s', 'MCP host not responding', 'Circuit breaker OPEN', 'Memory pressure critical'],
  API: ['HTTP 502 Bad Gateway spike', 'P99 latency exceeded 5000ms', 'Error rate 45% on /checkout', 'Rate limit exhausted'],
  QUEUE: ['Consumer lag 500K messages', 'Producer connection dropped', 'Partition leader election', 'Queue depth critical'],
  NOSQL: ['Write concern timeout', 'Replica set election', 'Index build blocking writes', 'Document size limit hit'],
}

const inputStyle = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid #2a2f3e',
  borderRadius: 4,
  padding: '7px 10px',
  color: '#e2e8f0',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  width: '100%'
}

export default function SignalIngestor({ onSignalSent }) {
  const [selected, setSelected] = useState(COMPONENTS[0])
  const [severity, setSeverity] = useState('P0')
  const [count, setCount] = useState(1)
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [open, setOpen] = useState(false)

  const send = async () => {
    setSending(true)
    setLastResult(null)
    const errors = ERRORS[selected.type] || ERRORS.API
    const errorMsg = errors[Math.floor(Math.random() * errors.length)]

    try {
      if (count === 1) {
        await axios.post('/api/signals/ingest', {
          component_id: selected.id,
          component_type: selected.type,
          error_message: errorMsg,
          severity,
          metadata: { source: 'manual-inject', host: 'prod-01' }
        })
      } else {
        const signals = Array.from({ length: count }, (_, i) => ({
          component_id: selected.id,
          component_type: selected.type,
          error_message: `${errorMsg} (burst ${i + 1})`,
          severity,
          metadata: { source: 'manual-inject', host: 'prod-01' }
        }))
        await axios.post('/api/signals/ingest/batch', signals)
      }
      setLastResult({ ok: true, msg: `✓ ${count} signal${count > 1 ? 's' : ''} injected` })
      if (onSignalSent) onSignalSent()
    } catch (e) {
      setLastResult({ ok: false, msg: `✕ ${e.response?.data?.detail || e.message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ borderBottom: '1px solid #1a1f2e' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(255,149,0,0.6)', letterSpacing: '0.12em' }}>⚡ SIGNAL INJECTOR</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 5 }}>COMPONENT</div>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={selected.id}
              onChange={e => setSelected(COMPONENTS.find(c => c.id === e.target.value))}
            >
              {COMPONENTS.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#0a0a0f' }}>
                  {c.id} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 5 }}>SEVERITY</div>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={severity}
                onChange={e => setSeverity(e.target.value)}
              >
                {['P0', 'P1', 'P2', 'P3'].map(s => (
                  <option key={s} style={{ background: '#0a0a0f' }}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 5 }}>COUNT</div>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={count}
                onChange={e => setCount(Number(e.target.value))}
              >
                {[1, 5, 10, 50, 100, 500].map(n => (
                  <option key={n} style={{ background: '#0a0a0f' }}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={send}
            disabled={sending}
            style={{
              width: '100%',
              padding: '8px',
              background: sending ? 'rgba(255,149,0,0.05)' : 'rgba(255,149,0,0.08)',
              border: '1px solid rgba(255,149,0,0.3)',
              borderRadius: 4,
              color: '#ff9500',
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'INJECTING...' : `INJECT ${count} SIGNAL${count > 1 ? 'S' : ''}`}
          </button>

          {lastResult && (
            <div style={{
              marginTop: 8,
              fontSize: 10,
              letterSpacing: '0.06em',
              color: lastResult.ok ? '#00ff88' : '#ff6b6b'
            }}>
              {lastResult.msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}