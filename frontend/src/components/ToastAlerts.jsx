import { useEffect, useState } from 'react'

const SEV_STYLE = {
  P0: { bg: 'rgba(255,30,30,0.95)', border: 'rgba(255,80,80,0.6)', icon: '🚨', label: 'CRITICAL' },
  P1: { bg: 'rgba(200,100,0,0.95)', border: 'rgba(255,149,0,0.6)', icon: '⚠️', label: 'HIGH' },
  P2: { bg: 'rgba(150,120,0,0.95)', border: 'rgba(255,214,0,0.5)', icon: '⚡', label: 'MEDIUM' },
  P3: { bg: 'rgba(0,100,160,0.95)', border: 'rgba(0,200,255,0.4)', icon: 'ℹ️', label: 'LOW' },
}

let toastId = 0

// Global toast emitter — call this from anywhere
export function emitToast(incident) {
  const event = new CustomEvent('ims-toast', { detail: incident })
  window.dispatchEvent(event)
}

export default function ToastAlerts() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const incident = e.detail
      const id = ++toastId
      setToasts(prev => [...prev.slice(-3), { id, ...incident }])

      // Auto remove after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 6000)

      // Browser notification for P0
      if (incident.severity === 'P0' && 'Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(`🚨 P0 ALERT: ${incident.component_id}`, {
              body: `${incident.component_type} incident detected. Check IMS dashboard immediately.`,
              icon: '/favicon.ico'
            })
          }
        })
      }
    }

    window.addEventListener('ims-toast', handler)
    return () => window.removeEventListener('ims-toast', handler)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 320
    }}>
      {toasts.map(toast => {
        const sev = SEV_STYLE[toast.severity] || SEV_STYLE.P3
        return (
          <div
            key={toast.id}
            style={{
              background: sev.bg,
              border: `1px solid ${sev.border}`,
              borderRadius: 6,
              padding: '12px 14px',
              fontFamily: "'JetBrains Mono', monospace",
              animation: 'slideIn 0.2s ease',
              backdropFilter: 'blur(8px)',
              boxShadow: toast.severity === 'P0'
                ? '0 0 20px rgba(255,30,30,0.4)'
                : '0 4px 20px rgba(0,0,0,0.4)'
            }}
          >
            <style>{`
              @keyframes slideIn {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{sev.icon}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '0.12em'
                }}>
                  {sev.label} — {toast.severity}
                </span>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '0 2px',
                  lineHeight: 1
                }}
              >×</button>
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#fff',
              marginBottom: 3
            }}>
              {toast.component_id}
            </div>
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.04em'
            }}>
              NEW INCIDENT CREATED · {toast.component_type}
            </div>
          </div>
        )
      })}
    </div>
  )
}