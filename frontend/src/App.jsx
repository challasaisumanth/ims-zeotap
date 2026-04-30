import { useState } from 'react';
import IncidentFeed from './components/IncidentFeed';
import IncidentDetail from './components/IncidentDetail';

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="text-lg font-bold text-gray-900">Incident Management System</h1>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Incidents</h2>
          </div>
          <IncidentFeed
            onSelect={setSelectedId}
            selectedId={selectedId}
            key={refresh}
          />
        </aside>

        <main className="flex-1 overflow-y-auto">
          {selectedId ? (
            <IncidentDetail
              itemId={selectedId}
              onRefresh={() => setRefresh(r => r + 1)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select an incident to view details
            </div>
          )}
        </main>
      </div>
    </div>
  );
}