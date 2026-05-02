import { useEffect, useState } from 'react'
import axios from 'axios'

export default function SignalChart({ itemId, signalCount }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const buildChart = async () => {
      try {
        const res = await axios.get(`/api/workitems/${itemId}`)
        const signals = res.data.raw_signals || []

        // Group signals by minute
        const buckets = {}
        signals.forEach(s => {
          const d = new Date(s.timestamp)
          const key = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
          buckets[key] = (buckets[key] || 0) + 1
        })

        const sorted = Object.entries(buckets)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-12) // last 12 minutes

        setChartData(sorted)
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    buildChart()
  }, [itemId, signalCount])

  if (loading || chartData.length === 0) return null

  const maxVal = Math.max(...chartData.map(d => d[1]), 1)

  return (
    <div style={{
      border: '1px solid #1a1f2e',
      borderRadius: 4,
      padding: '14px 16px',
      marginBottom: 20,
      background: 'rgba(0,0,0,0.2)'
    }}>
      <div style={{
        fontSize: 9,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.12em',
        marginBottom: 12
      }}>
        SIGNAL TIMELINE — SIGNALS PER MINUTE
      </div>

      {/* Chart bars */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        height: 80,
        marginBottom: 6
      }}>
        {chartData.map(([time, count], i) => {
          const pct = (count / maxVal) * 100
          const isLatest = i === chartData.length - 1
          return (
            <div key={time} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'flex-end',
              gap: 3
            }}>
              <div style={{
                fontSize: 8,
                color: isLatest ? '#00ff88' : 'rgba(255,255,255,0.3)',
                letterSpacing: '0.04em'
              }}>{count}</div>
              <div style={{
                width: '100%',
                height: `${Math.max(pct, 4)}%`,
                background: isLatest
                  ? 'rgba(0,255,136,0.6)'
                  : count > maxVal * 0.7
                    ? 'rgba(255,68,68,0.5)'
                    : 'rgba(0,200,255,0.35)',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.4s ease',
                boxShadow: isLatest ? '0 0 6px rgba(0,255,136,0.3)' : 'none'
              }} />
            </div>
          )
        })}
      </div>

      {/* X axis labels */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 5
      }}>
        {chartData.map(([time], i) => (
          <div key={time} style={{
            flex: 1,
            fontSize: 8,
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            letterSpacing: '0.02em',
            overflow: 'hidden'
          }}>
            {i % 3 === 0 ? time : ''}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 8,
        fontSize: 9,
        color: 'rgba(255,255,255,0.2)'
      }}>
        <span><span style={{color:'rgba(255,68,68,0.7)'}}>■</span> High volume</span>
        <span><span style={{color:'rgba(0,200,255,0.5)'}}>■</span> Normal</span>
        <span><span style={{color:'rgba(0,255,136,0.7)'}}>■</span> Latest</span>
      </div>
    </div>
  )
}