import { useState } from 'react'
import axios from 'axios'

const CATEGORIES = [
  'Hardware Failure', 'Software Bug', 'Configuration Error',
  'Capacity/Scaling Issue', 'Network Issue', 'External Dependency',
  'Human Error', 'Unknown'
]

const inputStyle = {
  width: '100%',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid #2a2f3e',
  borderRadius: 4,
  padding: '9px 12px',
  color: '#e2e8f0',
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  transition: 'border-color 0.15s'
}

const labelStyle = {
  display: 'block',
  fontSize: 9,
  color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.12em',
  marginBottom: 6
}

export default function RCAForm({ workItemId, onSuccess }) {
  const [form, setForm] = useState({
    incident_start: '',
    incident_end: '',
    root_cause_category: 'Software Bug',
    fix_applied: '',
    prevention_steps: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.incident_start || !form.incident_end) {
      setError('INCIDENT START AND END TIMES ARE REQUIRED')
      return
    }
    if (new Date(form.incident_end) <= new Date(form.incident_start)) {
      setError('END TIME MUST BE AFTER START TIME')
      return
    }
    if (form.fix_applied.length < 10) {
      setError('FIX APPLIED MUST BE AT LEAST 10 CHARACTERS')
      return
    }
    if (form.prevention_steps.length < 10) {
      setError('PREVENTION STEPS MUST BE AT LEAST 10 CHARACTERS')
      return
    }
    setSubmitting(true)
    try {
      await axios.patch(
        `/api/workitems/${workItemId}/transition`,
        {
          incident_start: new Date(form.incident_start).toISOString(),
          incident_end: new Date(form.incident_end).toISOString(),
          root_cause_category: form.root_cause_category,
          fix_applied: form.fix_applied,
          prevention_steps: form.prevention_steps,
        },
        { params: { new_state: 'CLOSED' } }
      )
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.detail || 'RCA SUBMISSION FAILED')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,214,0,0.03)',
      border: '1px solid rgba(255,214,0,0.2)',
      borderRadius: 4,
      padding: 20,
      fontFamily: "'JetBrains Mono', monospace"
    }}>
      <div style={{ fontSize: 9, color: 'rgba(255,214,0,0.6)', letterSpacing: '0.15em', marginBottom: 16 }}>
        ◈ ROOT CAUSE ANALYSIS — REQUIRED TO CLOSE INCIDENT
      </div>

      {error && (
        <div style={{
          background: 'rgba(255,68,68,0.08)',
          border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: 4,
          padding: '10px 12px',
          marginBottom: 16,
          fontSize: 10,
          color: '#ff6b6b',
          letterSpacing: '0.06em'
        }}>
          ✕ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>INCIDENT START</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.incident_start}
            onChange={e => set('incident_start', e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
            onBlur={e => e.target.style.borderColor = '#2a2f3e'}
          />
        </div>
        <div>
          <label style={labelStyle}>INCIDENT END</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.incident_end}
            onChange={e => set('incident_end', e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
            onBlur={e => e.target.style.borderColor = '#2a2f3e'}
          />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>ROOT CAUSE CATEGORY</label>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={form.root_cause_category}
          onChange={e => set('root_cause_category', e.target.value)}
          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
          onBlur={e => e.target.style.borderColor = '#2a2f3e'}
        >
          {CATEGORIES.map(c => <option key={c} style={{ background: '#0a0a0f' }}>{c}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          FIX APPLIED
          <span style={{ marginLeft: 8, color: form.fix_applied.length >= 10 ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.4)' }}>
            {form.fix_applied.length}/10 min
          </span>
        </label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
          placeholder="Describe the exact steps taken to resolve this incident..."
          value={form.fix_applied}
          onChange={e => set('fix_applied', e.target.value)}
          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
          onBlur={e => e.target.style.borderColor = '#2a2f3e'}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          PREVENTION STEPS
          <span style={{ marginLeft: 8, color: form.prevention_steps.length >= 10 ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.4)' }}>
            {form.prevention_steps.length}/10 min
          </span>
        </label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
          placeholder="What systemic changes will prevent recurrence?"
          value={form.prevention_steps}
          onChange={e => set('prevention_steps', e.target.value)}
          onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
          onBlur={e => e.target.style.borderColor = '#2a2f3e'}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px',
          background: submitting ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.1)',
          border: '1px solid rgba(0,255,136,0.4)',
          borderRadius: 4,
          color: '#00ff88',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.12em',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => { if (!submitting) e.target.style.background = 'rgba(0,255,136,0.15)' }}
        onMouseLeave={e => { if (!submitting) e.target.style.background = 'rgba(0,255,136,0.1)' }}
      >
        {submitting ? '◌ SUBMITTING RCA...' : '✓ SUBMIT RCA & CLOSE INCIDENT'}
      </button>
    </div>
  )
}