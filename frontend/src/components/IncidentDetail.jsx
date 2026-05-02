import { useEffect, useState } from 'react'
import axios from 'axios'
import RCAForm from './RCAForm'
import SignalChart from './SignalChart'

const NEXT_STATE = {
  OPEN: 'INVESTIGATING',
  INVESTIGATING: 'RESOLVED',
  RESOLVED: null,
}

const SEV_COLOR = { P0: '#ff4444', P1: '#ff9500', P2: '#ffd600', P3: '#00c8ff' }
const STATE_COLOR = { OPEN: '#ff4444', INVESTIGATING: '#ff9500', RESOLVED: '#ffd600', CLOSED: '#00ff88' }
const STATE_ICON = { OPEN: '◉', INVESTIGATING: '◎', RESOLVED: '◌', CLOSED: '●' }

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid #1a1f2e',
      borderRadius: 4,
      padding: '12px 16px',
      flex: 1
    }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || '#e2e8f0', letterSpacing: '0.02em' }}>{value}</div>
    </div>
  )
}

export default function IncidentDetail({ itemId, onRefresh }) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/workitems/${itemId}`)
      setItem(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [itemId])

  const advance = async () => {
    const next = NEXT_STATE[item.state]
    if (!next) return
    setAdvancing(true)
    try {
      await axios.patch(`/api/workitems/${itemId}/transition`, null, {
        params: { new_state: next }
      })
      await load()
      onRefresh()
    } catch (e) {
      alert('Transition failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: '0.1em' }}>
      LOADING INCIDENT DATA...
    </div>
  )

  if (!item) return null

  const sevColor = SEV_COLOR[item.severity] || '#888'
  const stateColor = STATE_COLOR[item.state] || '#888'
  const nextState = NEXT_STATE[item.state]
  const createdAt = new Date(item.created_at)

  return (
    <div className="fade-in" style={{ padding: 28, fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 2,
                background: `${sevColor}22`, border: `1px solid ${sevColor}66`,
                color: sevColor, letterSpacing: '0.15em', fontWeight: 600
              }}>{item.severity}</span>
              <span style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 2,
                background: `${stateColor}15`, border: `1px solid ${stateColor}44`,
                color: stateColor, letterSpacing: '0.12em'
              }}>{STATE_ICON[item.state]} {item.state}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>{item.component_type}</span>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
              {item.component_id}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.06em' }}>
              OPENED {createdAt.toUTCString().replace('GMT', 'UTC')}
            </div>
          </div>
          {item.mttr_minutes != null && (
            <div style={{ border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4, padding: '12px 20px', textAlign: 'center', background: 'rgba(0,255,136,0.05)' }}>
              <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.5)', letterSpacing: '0.15em', marginBottom: 4 }}>MTTR</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#00ff88' }}>{Math.round(item.mttr_minutes)}m</div>
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <StatCard label="SIGNALS RECEIVED" value={item.signal_count} color="#e2e8f0" />
          <StatCard label="COMPONENT TYPE" value={item.component_type} color="#00c8ff" />
          <StatCard label="CURRENT STATE" value={item.state} color={stateColor} />
          <StatCard label="MTTR" value={item.mttr_minutes ? `${Math.round(item.mttr_minutes)}m` : 'OPEN'} color={item.mttr_minutes ? '#00ff88' : 'rgba(255,255,255,0.3)'} />
        </div>

        {/* ✅ NEW: Signal Timeline Chart */}
        <SignalChart itemId={itemId} signalCount={item.signal_count} />

        {/* State timeline */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1f2e', borderRadius: 4, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 12 }}>INCIDENT LIFECYCLE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((s, i) => {
              const states = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']
              const currentIdx = states.indexOf(item.state)
              const isActive = i === currentIdx
              const isDone = i < currentIdx
              const c = isDone ? '#00ff88' : isActive ? STATE_COLOR[s] : 'rgba(255,255,255,0.15)'
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: `1px solid ${c}`,
                      background: isDone ? 'rgba(0,255,136,0.1)' : isActive ? `${c}15` : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: c,
                      boxShadow: isActive ? `0 0 10px ${c}44` : 'none'
                    }}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 8, color: c, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{s}</span>
                  </div>
                  {i < 3 && (
                    <div style={{
                      flex: 1, height: 1,
                      background: isDone ? '#00ff88' : 'rgba(255,255,255,0.1)',
                      margin: '0 4px', marginBottom: 18
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Advance button */}
        {nextState && (
          <button
            onClick={advance}
            disabled={advancing}
            style={{
              padding: '10px 20px', background: 'transparent',
              border: '1px solid rgba(0,255,136,0.4)', borderRadius: 4,
              color: '#00ff88', fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
              cursor: advancing ? 'not-allowed' : 'pointer',
              opacity: advancing ? 0.5 : 1, marginBottom: 20, transition: 'all 0.15s'
            }}
            onMouseEnter={e => { if (!advancing) e.target.style.background = 'rgba(0,255,136,0.08)' }}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {advancing ? 'TRANSITIONING...' : `→ MOVE TO ${nextState}`}
          </button>
        )}
      </div>

      {/* RCA Form */}
      {item.state === 'RESOLVED' && (
        <div style={{ marginBottom: 24 }}>
          <RCAForm workItemId={itemId} onSuccess={() => { load(); onRefresh() }} />
        </div>
      )}

      {/* Submitted RCA */}
      {item.rca && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.5)', letterSpacing: '0.15em', marginBottom: 12 }}>✓ RCA SUBMITTED</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 4 }}>CATEGORY</div>
              <div style={{ fontSize: 12, color: '#00ff88' }}>{item.rca.root_cause_category}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 4 }}>DURATION</div>
              <div style={{ fontSize: 12, color: '#e2e8f0' }}>
                {item.rca.incident_start && item.rca.incident_end
                  ? `${Math.round((new Date(item.rca.incident_end) - new Date(item.rca.incident_start)) / 60000)}m`
                  : '—'}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 4 }}>FIX APPLIED</div>
            <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.6 }}>{item.rca.fix_applied}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 4 }}>PREVENTION STEPS</div>
            <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.6 }}>{item.rca.prevention_steps}</div>
          </div>
        </div>
      )}

      {/* Raw signals */}
      <div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: 10 }}>
          RAW SIGNALS — {item.signal_count} TOTAL {item.raw_signals?.length < item.signal_count ? `(SHOWING ${item.raw_signals?.length})` : ''}
        </div>
        <div style={{ border: '1px solid #1a1f2e', borderRadius: 4, maxHeight: 280, overflowY: 'auto', background: 'rgba(0,0,0,0.3)' }}>
          {(item.raw_signals || []).length === 0 && (
            <div style={{ padding: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>No signals found</div>
          )}
          {(item.raw_signals || []).map((s, i) => (
            <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, fontSize: 10 }}>
                {new Date(s.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ color: SEV_COLOR[s.severity] || '#888', flexShrink: 0, fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>
                [{s.severity}]
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.error_message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}