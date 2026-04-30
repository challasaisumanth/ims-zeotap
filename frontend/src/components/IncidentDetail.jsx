import { useEffect, useState } from 'react';
import axios from 'axios';
import RCAForm from './RCAForm';

const NEXT_STATE = {
  OPEN: 'INVESTIGATING',
  INVESTIGATING: 'RESOLVED',
  RESOLVED: null,
};

export default function IncidentDetail({ itemId, onRefresh }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/workitems/${itemId}`);
      setItem(res.data);
    } catch (e) {
      setError('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [itemId]);

  const advance = async () => {
    const next = NEXT_STATE[item.state];
    if (!next) return;
    try {
      await axios.patch(`/api/workitems/${itemId}/transition`, null, {
        params: { new_state: next },
      });
      await load();
      onRefresh();
    } catch (e) {
      alert('Transition failed: ' + (e.response?.data?.detail || e.message));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      Loading...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full text-red-400 text-sm">
      {error}
    </div>
  );

  if (!item) return null;

  const SEVERITY_BG = {
    P0: 'bg-red-100 text-red-800',
    P1: 'bg-orange-100 text-orange-800',
    P2: 'bg-yellow-100 text-yellow-700',
    P3: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{item.component_id}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {item.component_type} &nbsp;·&nbsp;
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BG[item.severity]}`}>
              {item.severity}
            </span>
            &nbsp;·&nbsp;
            <span className="font-medium">{item.state}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Created: {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
        {item.mttr_minutes != null && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-green-600 font-medium">MTTR</div>
            <div className="text-2xl font-bold text-green-700">
              {Math.round(item.mttr_minutes)}m
            </div>
          </div>
        )}
      </div>

      {/* Advance state button */}
      {NEXT_STATE[item.state] && (
        <button
          onClick={advance}
          className="bg-gray-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Move to {NEXT_STATE[item.state]} →
        </button>
      )}

      {/* RCA Form — only when RESOLVED */}
      {item.state === 'RESOLVED' && (
        <RCAForm
          workItemId={itemId}
          onSuccess={() => { load(); onRefresh(); }}
        />
      )}

      {/* Submitted RCA */}
      {item.rca && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-green-800 text-sm">✓ RCA Submitted</h4>
          <p className="text-sm text-green-700">
            <span className="font-medium">Category:</span> {item.rca.root_cause_category}
          </p>
          <p className="text-sm text-green-700">
            <span className="font-medium">Fix applied:</span> {item.rca.fix_applied}
          </p>
          <p className="text-sm text-green-700">
            <span className="font-medium">Prevention:</span> {item.rca.prevention_steps}
          </p>
        </div>
      )}

      {/* Raw signals */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Raw Signals ({item.signal_count} total
          {item.raw_signals?.length < item.signal_count
            ? `, showing ${item.raw_signals?.length}`
            : ''})
        </h4>
        <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg border border-gray-100 p-2">
          {(item.raw_signals || []).length === 0 && (
            <p className="text-xs text-gray-400 p-2">No raw signals found</p>
          )}
          {(item.raw_signals || []).map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600">
              <span className="text-gray-400">
                {new Date(s.timestamp).toLocaleTimeString()}
              </span>{' '}
              <span className={`font-medium ${
                s.severity === 'P0' ? 'text-red-600' :
                s.severity === 'P1' ? 'text-orange-500' :
                s.severity === 'P2' ? 'text-yellow-600' : 'text-blue-500'
              }`}>[{s.severity}]</span>{' '}
              {s.error_message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}