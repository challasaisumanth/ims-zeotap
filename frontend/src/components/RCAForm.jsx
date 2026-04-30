import { useState } from 'react';
import axios from 'axios';

const CATEGORIES = [
  'Hardware Failure', 'Software Bug', 'Configuration Error',
  'Capacity/Scaling Issue', 'Network Issue', 'External Dependency',
  'Human Error', 'Unknown'
];

export default function RCAForm({ workItemId, onSuccess }) {
  const [form, setForm] = useState({
    incident_start: '',
    incident_end: '',
    root_cause_category: 'Software Bug',
    fix_applied: '',
    prevention_steps: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.incident_start || !form.incident_end) {
      setError('Start and end times are required');
      return;
    }
    if (form.fix_applied.length < 10) {
      setError('Fix applied must be at least 10 characters');
      return;
    }
    if (form.prevention_steps.length < 10) {
      setError('Prevention steps must be at least 10 characters');
      return;
    }
    setSubmitting(true);
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
      );
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit RCA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-800">
        Root Cause Analysis
      </h3>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Incident Start
          </label>
          <input
            type="datetime-local"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={form.incident_start}
            onChange={e => setForm({ ...form, incident_start: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Incident End
          </label>
          <input
            type="datetime-local"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={form.incident_end}
            onChange={e => setForm({ ...form, incident_end: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Root Cause Category
        </label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={form.root_cause_category}
          onChange={e => setForm({ ...form, root_cause_category: e.target.value })}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Fix Applied
        </label>
        <textarea
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="Describe exactly what was done to fix this incident..."
          value={form.fix_applied}
          onChange={e => setForm({ ...form, fix_applied: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Prevention Steps
        </label>
        <textarea
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          placeholder="What will prevent this from happening again?"
          value={form.prevention_steps}
          onChange={e => setForm({ ...form, prevention_steps: e.target.value })}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Submitting RCA...' : 'Submit RCA & Close Incident'}
      </button>
    </div>
  );
}