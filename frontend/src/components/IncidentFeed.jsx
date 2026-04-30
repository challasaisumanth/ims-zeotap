import { useEffect, useState } from 'react';
import axios from 'axios';

const SEVERITY_COLOR = {
  P0: 'bg-red-100 text-red-800 border border-red-300',
  P1: 'bg-orange-100 text-orange-800 border border-orange-300',
  P2: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  P3: 'bg-blue-100 text-blue-700 border border-blue-300',
};

const STATE_COLOR = {
  OPEN: 'text-red-600',
  INVESTIGATING: 'text-orange-500',
  RESOLVED: 'text-yellow-600',
  CLOSED: 'text-green-600',
};

export default function IncidentFeed({ onSelect, selectedId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/workitems/');
      console.log('Fetched items:', res.data);
      setItems(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="p-8 text-center text-gray-400 text-sm">Loading incidents...</div>
  );

  if (error) return (
    <div className="p-8 text-center text-red-400 text-sm">{error}</div>
  );

  if (items.length === 0) return (
    <div className="p-8 text-center text-gray-400 text-sm">No incidents yet</div>
  );

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
            selectedId === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-800 text-sm truncate mr-2">
              {item.component_id}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
              SEVERITY_COLOR[item.severity] || 'bg-gray-100 text-gray-600'
            }`}>
              {item.severity}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${STATE_COLOR[item.state] || 'text-gray-500'}`}>
              ● {item.state}
            </span>
            <span className="text-xs text-gray-400">
              {item.signal_count} signal{item.signal_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(item.created_at).toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  );
}