import { useState, useEffect, useRef, useCallback } from 'react'
import IncidentFeed from './components/IncidentFeed'
import IncidentDetail from './components/IncidentDetail'
import MetricsDashboard from './components/MetricsDashboard'
import SignalIngestor from './components/SignalIngestor'
import ToastAlerts, { emitToast } from './components/ToastAlerts'
import SystemTopology from './components/SystemTopology'
import axios from 'axios'

export default function App() {
  const [selectedId, setSelectedId] = useState(null)
  const [detailRefresh, setDetailRefresh] = useState(0)
  const [health, setHealth] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [wsData, setWsData] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [showTopology, setShowTopology] = useState(false)
  const wsRef = useRef(null)
  const prevItemsRef = useRef([])

  // WebSocket — stable, never causes full re-render
  useEffect(() => {
    let reconnectTimer = null
    let mounted = true

    const connect = () => {
      if (!mounted) return
      try {
        // Close any existing connection cleanly first
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.onclose = null // prevent reconnect loop
          wsRef.current.close()
        }

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(`${proto}//${window.location.host}/ws/live`)
        wsRef.current = ws

        ws.onopen = () => {
          if (mounted) setWsConnected(true)
        }

        ws.onmessage = (e) => {
          if (!mounted) return
          try {
            const data = JSON.parse(e.data)
            const newJson = JSON.stringify(data.items)
            const oldJson = JSON.stringify(prevItemsRef.current)

            if (newJson !== oldJson) {
              if (prevItemsRef.current.length > 0) {
                const prevIds = new Set(prevItemsRef.current.map(i => i.id))
                data.items?.forEach(item => {
                  if (!prevIds.has(item.id)) emitToast(item)
                })
              }
              prevItemsRef.current = data.items || []
              setWsData(data)
            }
          } catch {}
        }

        ws.onclose = () => {
          if (!mounted) return
          setWsConnected(false)
          // Reconnect after 4 seconds
          reconnectTimer = setTimeout(connect, 4000)
        }

        ws.onerror = () => {
          // Let onclose handle reconnect
          ws.close()
        }
      } catch {
        if (mounted) {
          reconnectTimer = setTimeout(connect, 4000)
        }
      }
    }

    // Small initial delay so Vite proxy is ready
    reconnectTimer = setTimeout(connect, 500)

    return () => {
      mounted = false
      clearTimeout(reconnectTimer)
      try {
        if (wsRef.current) {
          wsRef.current.onclose = null
          wsRef.current.close()
        }
      } catch {}
    }
  }, [])

  // Health polling — separate, doesn't affect incident list
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get('/health')
        setHealth(res.data)
      } catch { setHealth(null) }
    }
    fetchHealth()
    const hi = setInterval(fetchHealth, 10000) // every 10s not 5s
    const ti = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { clearInterval(hi); clearInterval(ti) }
  }, [])

  // Only refresh detail panel when needed
  const handleRefresh = useCallback(() => {
    setDetailRefresh(r => r + 1)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 2px; }
        .pulse-dot { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 50%{opacity:0} }
        .incident-card { transition: transform 0.1s ease; }
        .incident-card:hover { transform: translateX(2px); }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        .grid-bg {
          background-image:
            linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        select option { background: #0a0a0f; color: #e2e8f0; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        button { font-family: inherit; }
      `}</style>

      <ToastAlerts />

      {/* Status bar */}
      <div style={{
        padding: '4px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, letterSpacing: '0.09em',
        color: 'rgba(0,255,136,0.5)',
        background: 'rgba(0,255,136,0.03)',
        borderBottom: '1px solid rgba(0,255,136,0.1)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>ZEOTAP IMS v1.0.0</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span>SRE OPS CENTER</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span style={{ color: wsConnected ? '#00ff88' : '#ff6b6b' }}>
            WS: {wsConnected ? 'CONNECTED' : 'RECONNECTING...'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {health && <>
            <span>PG <span style={{ color: health.postgres ? '#00ff88' : '#ff4444' }}>●</span></span>
            <span>REDIS <span style={{ color: health.redis ? '#00ff88' : '#ff4444' }}>●</span></span>
            <span>Q:<span style={{ color: '#00c8ff' }}>{health.queue_size || 0}</span></span>
            <span>SIG/S:<span style={{ color: '#00ff88' }}>{wsData?.throughput?.signals_per_sec ?? health.signals_per_sec ?? '0.0'}</span></span>
          </>}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {currentTime.toUTCString().replace('GMT', 'UTC')}
          </span>
        </div>
      </div>

      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1a1f2e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '0.04em', color: '#fff' }}>
              INCIDENT MANAGEMENT SYSTEM
            </div>
            <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.4)', letterSpacing: '0.14em', marginTop: 1 }}>
              PRODUCTION MONITORING · DISTRIBUTED STACK · REAL-TIME
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setShowTopology(t => !t)}
            style={{
              padding: '6px 12px',
              background: showTopology ? 'rgba(0,200,255,0.1)' : 'transparent',
              border: `1px solid ${showTopology ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 4,
              color: showTopology ? '#00c8ff' : 'rgba(255,255,255,0.4)',
              fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            🗺 TOPOLOGY
          </button>

          {wsData && (
            <div style={{ display: 'flex', gap: 14, fontSize: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                TOTAL <span style={{ color: '#e2e8f0' }}>{wsData.items?.length || 0}</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                OPEN <span style={{ color: '#ff4444' }}>
                  {wsData.items?.filter(i => i.state === 'OPEN').length || 0}
                </span>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="pulse-dot" style={{
              width: 6, height: 6, borderRadius: '50%',
              background: wsConnected ? '#00ff88' : '#ff4444',
              boxShadow: `0 0 8px ${wsConnected ? '#00ff88' : '#ff4444'}`
            }} />
            <span style={{ fontSize: 10, color: wsConnected ? '#00ff88' : '#ff4444', letterSpacing: '0.1em' }}>
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — no key prop, never remounts */}
        <div style={{
          width: 290,
          borderRight: '1px solid #1a1f2e',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0, overflowY: 'auto'
        }}>
          <MetricsDashboard wsData={wsData} />
          <SignalIngestor onSignalSent={handleRefresh} />
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid #1a1f2e',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)' }}>
              INCIDENTS
            </span>
            <span className="blink" style={{ fontSize: 9, color: '#00ff88', letterSpacing: '0.1em' }}>
              ● LIVE
            </span>
          </div>

          {/* No key prop — feed updates smoothly via wsItems prop */}
          <IncidentFeed
            onSelect={setSelectedId}
            selectedId={selectedId}
            wsItems={wsData?.items}
          />
        </div>

        {/* Main content */}
        <div className="grid-bg" style={{ flex: 1, overflowY: 'auto' }}>

          {showTopology && (
            <div style={{ padding: '20px 28px 0' }}>
              <SystemTopology wsItems={wsData?.items} />
            </div>
          )}

          {selectedId ? (
            <IncidentDetail
              key={selectedId}
              itemId={selectedId}
              onRefresh={handleRefresh}
              externalRefresh={detailRefresh}
            />
          ) : (
            <div style={{
              height: showTopology ? 'auto' : '100%',
              minHeight: showTopology ? '200px' : '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '40px 0'
            }}>
              <div style={{
                width: 52, height: 52,
                border: '1px solid rgba(0,255,136,0.12)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,255,136,0.03)'
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(0,255,136,0.25)" strokeWidth="1">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
                  SELECT AN INCIDENT
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 4 }}>
                  view signals, lifecycle, and submit RCA
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.08)' }}>
                use signal injector in sidebar to create incidents
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}