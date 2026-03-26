import { useState, useEffect } from 'react';
import { getAllDocsForMap, CLUSTERS, getDocsByCluster } from '../../../services/intelligenceService';

export default function IntelligenceMap() {
  const [clusters, setClusters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getAllDocsForMap().then(c => { setClusters(c); setLoading(false); }).catch(() => setLoading(false)); }, []);

  useEffect(() => {
    if (selected) getDocsByCluster(selected).then(setDetail).catch(() => setDetail([]));
    else setDetail([]);
  }, [selected]);

  if (loading) return <div className="animate-pulse bg-gray-200 rounded-xl h-48" />;

  const totalDocs = clusters.reduce((s, c) => s + c.count, 0);
  const totalTarget = clusters.reduce((s, c) => s + c.target, 0);
  const coverage = totalTarget > 0 ? Math.round((totalDocs / totalTarget) * 100) : 0;
  const gapCount = clusters.filter(c => c.count === 0 || c.count / c.target < 0.4).length;
  const staleCount = clusters.reduce((s, c) => s + c.stale_count, 0);

  const l1 = clusters.filter(c => c.layer === 1);
  const l2 = clusters.filter(c => c.layer === 2);
  const l3 = clusters.filter(c => c.layer === 3);

  function ClusterCard({ c }) {
    const pct = c.target > 0 ? Math.min(100, (c.count / c.target) * 100) : 0;
    const isGap = c.count === 0;
    const isLow = !isGap && pct < 40;
    const isSel = selected === c.cluster;
    const barColor = isGap ? 'bg-red-400' : pct < 40 ? 'bg-amber-400' : pct < 80 ? 'bg-blue-400' : 'bg-green-500';
    return (
      <div onClick={() => setSelected(isSel ? null : c.cluster)}
        className={`bg-white border rounded-xl p-3 cursor-pointer transition-all ${isSel ? 'border-purple-600 border-[1.5px] shadow-md' : isGap ? 'border-red-300 bg-red-50' : isLow ? 'border-amber-300' : 'border-gray-200 hover:border-purple-400'}`}>
        <p className={`text-[13px] font-medium ${isGap ? 'text-red-700' : 'text-gray-800'}`}>{c.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{isGap ? '0 docs — GAP' : `${c.count} docs · ${c.use_total > 0 ? 'active' : 'low'} usage`}</p>
        <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { v: totalDocs, l: 'Total documents', c: 'text-gray-900' },
          { v: `${coverage}%`, l: 'Coverage score', c: coverage > 70 ? 'text-green-600' : 'text-amber-600' },
          { v: gapCount, l: 'Gaps detected', c: gapCount > 0 ? 'text-red-600' : 'text-green-600' },
          { v: staleCount, l: 'Stale docs', c: staleCount > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className={`text-xl font-semibold ${m.c}`}>{m.v}</div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">{m.l}</div>
          </div>
        ))}
      </div>

      {/* Layer 1 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Layer 1 — Framework foundations</p>
        <div className="grid grid-cols-3 gap-3">{l1.map(c => <ClusterCard key={c.cluster} c={c} />)}</div>
      </div>
      {/* Layer 2 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Layer 2 — Application rules</p>
        <div className="grid grid-cols-3 gap-3">{l2.map(c => <ClusterCard key={c.cluster} c={c} />)}</div>
      </div>
      {/* Layer 3 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Layer 3 — Client patterns</p>
        <div className="grid grid-cols-2 gap-3">{l3.map(c => <ClusterCard key={c.cluster} c={c} />)}</div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{CLUSTERS[selected]?.name}</span>
              <span className="bg-purple-100 text-purple-700 text-[10px] font-medium px-1.5 py-0.5 rounded">L{CLUSTERS[selected]?.layer}</span>
              <span className="text-xs text-gray-400">{detail.length} docs</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="space-y-1.5">
            {detail.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === 'active' ? 'bg-green-500' : d.status === 'stale' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700 flex-1 truncate">{d.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(d.use_count || 0) > 10 ? 'bg-green-100 text-green-700' : (d.use_count || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                  {d.use_count || 0} uses
                </span>
                <span className="text-[10px] text-gray-300">{d.version}</span>
              </div>
            ))}
            {detail.length > 5 && <p className="text-xs text-gray-400 pt-1">+ {detail.length - 5} more</p>}
          </div>
        </div>
      )}
    </div>
  );
}
