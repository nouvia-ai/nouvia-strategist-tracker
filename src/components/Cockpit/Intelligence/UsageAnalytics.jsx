import { useState, useEffect } from 'react';
import { searchDocs, getStaleDocuments, getPromotionCandidates, promoteToLayer2, archiveDocument, updateDoc_intelligence } from '../../../services/intelligenceService';

export default function UsageAnalytics() {
  const [mostUsed, setMostUsed] = useState([]);
  const [neverUsed, setNeverUsed] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      searchDocs('', null).then(docs => docs.sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, 10)),
      getStaleDocuments().then(docs => docs.filter(d => d.use_count === 0).slice(0, 15)),
      getPromotionCandidates(),
    ]).then(([mu, nu, pr]) => { setMostUsed(mu); setNeverUsed(nu); setPromotions(pr); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handlePromote = async (pat) => {
    await promoteToLayer2(pat.id, pat.content);
    setPromotions(prev => prev.filter(p => p.id !== pat.id));
    showToast('Promoted — now a Layer 2 rule');
  };

  const handleKeep = async (pat) => {
    await updateDoc_intelligence('intelligence_patterns', pat.id, { promoted_to_l2: false, confidence: 0.5 });
    setPromotions(prev => prev.filter(p => p.id !== pat.id));
    showToast('Kept as Layer 3');
  };

  const handleArchive = async (d) => {
    await archiveDocument(d._col, d.id);
    setNeverUsed(prev => prev.filter(x => x.id !== d.id));
    showToast('Archived');
  };

  if (loading) return <div className="animate-pulse bg-gray-200 rounded-xl h-32" />;

  const maxUse = mostUsed[0]?.use_count || 1;

  return (
    <div className="space-y-6">
      {/* Most used */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Most Used (all time)</h3>
        {mostUsed.filter(d => d.use_count > 0).length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No usage data yet</p>
        ) : (
          <div className="space-y-2">
            {mostUsed.filter(d => d.use_count > 0).map(d => (
              <div key={d.id} className="flex items-center gap-3 py-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
                <span className="text-sm text-gray-700 w-48 truncate">{d.title}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(d.use_count / maxUse) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-600 w-8 text-right">{d.use_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Never used */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Never Used — archive candidates</h3>
        {neverUsed.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">All documents have been used</p>
        ) : (
          <div className="space-y-1.5">
            {neverUsed.map(d => (
              <div key={d.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-gray-50">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{d.title}</span>
                <span className="text-[10px] text-gray-400">{d.cluster_name}</span>
                <button onClick={() => handleArchive(d)} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Archive</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promotion candidates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Promotion Candidates — Layer 3 → Layer 2</h3>
        {promotions.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No high-confidence patterns ready for promotion</p>
        ) : (
          <div className="space-y-3">
            {promotions.map(pat => (
              <div key={pat.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">{pat.title}</span>
                  <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{Math.round((pat.confidence || 0) * 100)}% confidence</span>
                  {pat.client && <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded">{pat.client}</span>}
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 italic mb-3 border-l-2 border-purple-300">
                  "{pat.content}"
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePromote(pat)} className="bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-600">Promote to Layer 2</button>
                  <button onClick={() => handleKeep(pat)} className="text-gray-400 text-xs font-medium hover:text-gray-600">Keep as Layer 3</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 right-4 bg-green-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}
    </div>
  );
}
