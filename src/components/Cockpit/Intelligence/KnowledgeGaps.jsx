import { useState, useEffect } from 'react';
import { computeGaps, getStaleDocuments, archiveDocument } from '../../../services/intelligenceService';

export default function KnowledgeGaps() {
  const [gaps, setGaps] = useState([]);
  const [stale, setStale] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([computeGaps(), getStaleDocuments()])
      .then(([g, s]) => { setGaps(g); setStale(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleArchive = async (doc) => {
    await archiveDocument(doc._col, doc.id);
    setStale(prev => prev.filter(d => d.id !== doc.id));
    setToast('Archived'); setTimeout(() => setToast(null), 2000);
  };

  if (loading) return <div className="animate-pulse bg-gray-200 rounded-xl h-32" />;

  const borderColors = { critical: 'border-l-red-500', high: 'border-l-amber-400', stale: 'border-l-gray-300' };
  const badgeColors = { critical: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700', stale: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Knowledge Gaps</h3>
        {gaps.length === 0 ? (
          <div className="text-center py-8"><span className="text-3xl opacity-40">✓</span><p className="text-gray-400 text-sm mt-2">No knowledge gaps detected</p></div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div key={i} className={`bg-white border border-gray-200 rounded-xl p-4 border-l-4 ${borderColors[gap.type]}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${badgeColors[gap.type]}`}>{gap.type}</span>
                  <span className="text-xs text-gray-400">L{gap.layer} · {gap.cluster_name}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">{gap.message}</p>
                <p className="text-xs text-gray-500">{gap.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Stale Documents — never used</h3>
        {stale.length === 0 ? (
          <div className="text-center py-8"><span className="text-3xl opacity-40">✓</span><p className="text-gray-400 text-sm mt-2">No stale documents</p></div>
        ) : (
          <div className="space-y-2">
            {stale.slice(0, 20).map(d => (
              <div key={d.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{d.title}</span>
                <span className="text-[10px] text-gray-400">{d.daysSinceUse ? `${d.daysSinceUse}d` : 'Never used'}</span>
                <button onClick={() => handleArchive(d)} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Archive</button>
              </div>
            ))}
            {stale.length > 20 && <p className="text-xs text-gray-400 text-center">+ {stale.length - 20} more</p>}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 right-4 bg-green-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
    </div>
  );
}
