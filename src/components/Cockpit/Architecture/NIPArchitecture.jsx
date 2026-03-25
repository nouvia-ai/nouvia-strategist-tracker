import { useState, useEffect } from 'react';
import { NIP_STATUS } from './architectureData';
import { getArchitectureStatus, saveArchitectureStatus } from '../../../services/architectureService';

const STATUS_COLORS = {
  live:     { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: '● Live' },
  building: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400',  label: '◐ Building' },
  planned:  { bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-400',   label: '○ Planned' },
  agentic:  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400', label: '◇ Agentic' },
};

function StatusBadge({ status, small = false }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.planned;
  return (
    <span className={`${s.bg} ${s.text} ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded font-medium`}>
      {s.label}
    </span>
  );
}

function StatusDot({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.planned;
  return <span className={`inline-block w-2 h-2 rounded-full ${s.dot} flex-shrink-0 mt-1.5`} />;
}

function ModuleCard({ module, accentClass }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-sm font-medium ${accentClass}`}>{module.label}</span>
        <StatusBadge status={module.status} small />
      </div>
      {module.note && (
        <p className="text-xs text-gray-400 italic mb-2">{module.note}</p>
      )}
      {module.components && (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1"
          >
            {open ? '▾' : '▸'} {open ? 'Hide' : 'Show'} components ({module.components.length})
          </button>
          {open && (
            <div className="mt-2 space-y-1">
              {module.components.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <StatusDot status={c.status} />
                  <span className="text-xs text-gray-600">{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function countByStatus(data, targetStatus) {
  let n = 0;
  const countArr = (arr) => {
    if (!arr) return;
    arr.forEach(item => {
      if (item.status === targetStatus) n++;
      if (item.components) item.components.forEach(c => { if (c.status === targetStatus) n++; });
    });
  };
  countArr(data.studio?.modules);
  countArr(data.aims?.modules);
  countArr(data.aiAgents);
  countArr(data.intelligence);
  countArr(data.infrastructure);
  if (data.phase0?.syncPairs) data.phase0.syncPairs.forEach(p => { if (p.status === targetStatus) n++; });
  return n;
}

export default function NIPArchitecture() {
  const [status, setStatus] = useState(NIP_STATUS);
  const [loading, setLoading] = useState(false);
  const [updateLog, setUpdateLog] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getArchitectureStatus().then(saved => {
      if (saved) {
        setStatus(saved.status || NIP_STATUS);
        setLastSaved(saved.savedAt?.toDate?.()?.toLocaleDateString() || 'Previously saved');
      }
    }).catch(() => {});
  }, []);

  const counts = {
    live: countByStatus(status, 'live'),
    building: countByStatus(status, 'building'),
    planned: countByStatus(status, 'planned'),
    agentic: countByStatus(status, 'agentic'),
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    setUpdateLog(null);
    try {
      // Save current status snapshot with updated timestamp
      const updatedStatus = { ...status, lastUpdated: new Date().toLocaleDateString('en-CA') };
      setStatus(updatedStatus);
      await saveArchitectureStatus({ status: updatedStatus });
      setLastSaved(new Date().toLocaleDateString());
      setUpdateLog([
        '✅ Architecture status saved to Firestore',
        `📊 ${counts.live} Live · ${counts.building} Building · ${counts.planned} Planned · ${counts.agentic} Agentic`,
        '→ Edit architectureData.js to update component statuses, then click Update to persist',
      ]);
    } catch (err) {
      console.error('Update error:', err);
      setError('Update failed — ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">NIP Architecture</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated: {status.lastUpdated || 'Not yet updated'}
            {lastSaved && ` · Saved: ${lastSaved}`}
          </p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
            }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
              </svg>
              Update Status
            </>
          )}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* UPDATE LOG */}
      {updateLog && updateLog.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
            Status Report — {status.lastUpdated}
          </p>
          <ul className="space-y-1">
            {updateLog.map((line, i) => (
              <li key={i} className="text-sm text-purple-700">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div>
        <div className="flex rounded-full overflow-hidden h-2.5 mb-2">
          <div className="bg-green-500 transition-all duration-500" style={{ width: `${(counts.live / total) * 100}%` }} />
          <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(counts.building / total) * 100}%` }} />
          <div className="bg-blue-400 transition-all duration-500" style={{ width: `${(counts.planned / total) * 100}%` }} />
          <div className="bg-purple-400 transition-all duration-500" style={{ width: `${(counts.agentic / total) * 100}%` }} />
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span><span className="text-green-600 font-medium">{counts.live}</span> Live</span>
          <span><span className="text-amber-600 font-medium">{counts.building}</span> Building</span>
          <span><span className="text-blue-600 font-medium">{counts.planned}</span> Planned</span>
          <span><span className="text-purple-600 font-medium">{counts.agentic}</span> Agentic</span>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_COLORS).map(([key, s]) => (
          <span key={key} className={`${s.bg} ${s.text} text-xs px-2 py-1 rounded font-medium`}>{s.label}</span>
        ))}
      </div>

      {/* STUDIO + AIMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">Nouvia Studio</p>
          {status.studio?.modules?.map((m, i) => (
            <ModuleCard key={i} module={m} accentClass="text-purple-700" />
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">AI Management System — AIMS</p>
          {status.aims?.modules?.map((m, i) => (
            <ModuleCard key={i} module={m} accentClass="text-blue-700" />
          ))}
        </div>
      </div>

      {/* PHASE 0 BRIDGE */}
      <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-amber-700">Phase 0 — Closed-loop Firestore sync</p>
          <StatusBadge status={status.phase0?.status || 'building'} small />
        </div>
        <p className="text-xs text-amber-600 mb-3">{status.phase0?.description}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {status.phase0?.syncPairs?.map((pair, i) => (
            <div key={i} className="bg-white border border-amber-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-600 flex-1">{pair.from}</span>
              <span className="text-amber-400 flex-shrink-0">→</span>
              <span className="text-gray-600 flex-1 text-right">{pair.to}</span>
              <StatusBadge status={pair.status} small />
            </div>
          ))}
        </div>
      </div>

      {/* SUPPORTING LAYERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">AI Agents</p>
          {status.aiAgents?.map((a, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <StatusDot status={a.status} />
              <div>
                <p className="text-xs font-medium text-gray-700">{a.label}</p>
                {a.note && <p className="text-[10px] text-gray-400">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Intelligence Layers</p>
          {status.intelligence?.map((a, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <StatusDot status={a.status} />
              <div>
                <p className="text-xs font-medium text-gray-700">{a.label}</p>
                {a.note && <p className="text-[10px] text-gray-400">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Infrastructure</p>
          {status.infrastructure?.map((a, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <StatusDot status={a.status} />
              <div>
                <p className="text-xs font-medium text-gray-700">{a.label}</p>
                {a.note && <p className="text-[10px] text-gray-400">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
