import { useEffect, useState } from 'react'
import axios from 'axios'

const COMPONENTS = [
  { id: 'API',    label: 'API Gateway',  x: 340, y: 40,  type: 'API' },
  { id: 'RDBMS',  label: 'PostgreSQL',   x: 160, y: 140, type: 'RDBMS' },
  { id: 'CACHE',  label: 'Redis Cache',  x: 340, y: 140, type: 'CACHE' },
  { id: 'NOSQL',  label: 'MongoDB',      x: 520, y: 140, type: 'NOSQL' },
  { id: 'QUEUE',  label: 'Kafka Queue',  x: 220, y: 250, type: 'QUEUE' },
  { id: 'MCP',    label: 'MCP Host',     x: 460, y: 250, type: 'MCP' },
]

const EDGES = [
  ['API','RDBMS'], ['API','CACHE'], ['API','NOSQL'],
  ['API','QUEUE'], ['API','MCP'],
  ['QUEUE','RDBMS'], ['MCP','CACHE'],
]

export default function SystemTopology({ wsItems }) {
  const [incidents, setIncidents] = useState({})
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await axios.get('/api/workitems/')
        const map = {}
        res.data.forEach(item => {
          if (item.state !== 'CLOSED') {
            if (!map[item.component_type] ||
                ['P0','P1','P2','P3'].indexOf(item.severity) <
                ['P0','P1','P2','P3'].indexOf(map[item.component_type].severity)) {
              map[item.component_type] = item
            }
          }
        })
        setIncidents(map)
      } catch(e) { console.error(e) }
    }
    fetchActive()
  }, [wsItems])

  const getNodeColor = (type) => {
    const inc = incidents[type]
    if (!inc) return { fill: 'rgba(0,255,136,0.08)', stroke: 'rgba(0,255,136,0.25)', text: '#00ff88', glow: false }
    const sevColors = {
      P0: { fill: 'rgba(255,30,30,0.15)', stroke: 'rgba(255,30,30,0.6)', text: '#ff4444', glow: true },
      P1: { fill: 'rgba(255,149,0,0.15)', stroke: 'rgba(255,149,0,0.5)', text: '#ff9500', glow: true },
      P2: { fill: 'rgba(255,214,0,0.12)', stroke: 'rgba(255,214,0,0.4)', text: '#ffd600', glow: false },
      P3: { fill: 'rgba(0,200,255,0.1)', stroke: 'rgba(0,200,255,0.35)', text: '#00c8ff', glow: false },
    }
    return sevColors[inc.severity] || sevColors.P3
  }

  const nodeById = Object.fromEntries(COMPONENTS.map(c => [c.id, c]))

  return (
    <div style={{
      border: '1px solid #1a1f2e',
      borderRadius: 4,
      padding: '14px 16px',
      marginBottom: 20,
      background: 'rgba(0,0,0,0.2)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <span style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.12em'
        }}>SYSTEM TOPOLOGY — LIVE HEALTH MAP</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 9 }}>
          <span><span style={{color:'#00ff88'}}>●</span> Healthy</span>
          <span><span style={{color:'#ff4444'}}>●</span> P0</span>
          <span><span style={{color:'#ff9500'}}>●</span> P1</span>
          <span><span style={{color:'#ffd600'}}>●</span> P2</span>
        </div>
      </div>

      <svg width="100%" viewBox="0 0 680 310" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes pulse-node {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .pulse-incident { animation: pulse-node 1.5s ease-in-out infinite; }
        `}</style>

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const na = nodeById[a]
          const nb = nodeById[b]
          const hasIncident = incidents[a] || incidents[b]
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x} y1={na.y}
              x2={nb.x} y2={nb.y}
              stroke={hasIncident ? 'rgba(255,68,68,0.25)' : 'rgba(255,255,255,0.07)'}
              strokeWidth={hasIncident ? 1.5 : 1}
              strokeDasharray={hasIncident ? '4 4' : 'none'}
            />
          )
        })}

        {/* Nodes */}
        {COMPONENTS.map(comp => {
          const color = getNodeColor(comp.type)
          const inc = incidents[comp.type]
          const isHovered = hovered === comp.id

          return (
            <g
              key={comp.id}
              transform={`translate(${comp.x}, ${comp.y})`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(comp.id)}
              onMouseLeave={() => setHovered(null)}
              className={inc && (inc.severity === 'P0' || inc.severity === 'P1') ? 'pulse-incident' : ''}
            >
              {/* Outer glow ring for incidents */}
              {inc && (
                <circle
                  r={38}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth={0.5}
                  opacity={0.4}
                  filter={inc.severity === 'P0' ? 'url(#glow-red)' : undefined}
                />
              )}

              {/* Main circle */}
              <circle
                r={32}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={isHovered ? 1.5 : 1}
                filter={!inc ? 'url(#glow-green)' : undefined}
              />

              {/* Status dot */}
              <circle
                cx={22} cy={-22}
                r={5}
                fill={color.text}
                opacity={0.9}
              />

              {/* Component type label */}
              <text
                textAnchor="middle"
                y={-6}
                style={{
                  fontSize: 9,
                  fill: color.text,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.08em',
                  fontWeight: 600
                }}
              >{comp.id}</text>

              {/* Component name */}
              <text
                textAnchor="middle"
                y={7}
                style={{
                  fontSize: 8,
                  fill: 'rgba(255,255,255,0.4)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >{comp.label}</text>

              {/* Incident badge */}
              {inc && (
                <text
                  textAnchor="middle"
                  y={20}
                  style={{
                    fontSize: 8,
                    fill: color.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                    letterSpacing: '0.06em'
                  }}
                >{inc.severity} · {inc.signal_count}sig</text>
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <g transform="translate(35, -50)">
                  <rect
                    x={0} y={0}
                    width={130} height={inc ? 52 : 30}
                    rx={4}
                    fill="rgba(10,10,15,0.95)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={0.5}
                  />
                  <text x={8} y={14} style={{ fontSize: 9, fill: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {comp.label}
                  </text>
                  {inc ? (
                    <>
                      <text x={8} y={28} style={{ fontSize: 8, fill: color.text, fontFamily: "'JetBrains Mono', monospace" }}>
                        {inc.severity} · {inc.state}
                      </text>
                      <text x={8} y={42} style={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {inc.signal_count} signals received
                      </text>
                    </>
                  ) : (
                    <text x={8} y={22} style={{ fontSize: 8, fill: '#00ff88', fontFamily: "'JetBrains Mono', monospace" }}>
                      ● All systems operational
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}