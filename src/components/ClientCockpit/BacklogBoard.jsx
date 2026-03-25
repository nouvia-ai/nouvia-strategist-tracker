import { useState, useEffect } from 'react';
import { getBacklog } from '../../services/clientCockpit';

const STAGES = [
  { key: 'idea', label: 'Ideas' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

function groupByMonth(items) {
  const groups = {};
  items.forEach(item => {
    if (item.targetDate) {
      const date = new Date(item.targetDate.seconds ? item.targetDate.seconds * 1000 : item.targetDate);
      const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    } else {
      if (!groups['Unscheduled']) groups['Unscheduled'] = [];
      groups['Unscheduled'].push(item);
    }
  });
  return groups;
}

export default function BacklogBoard() {
  const [view, setView] = useState('board');
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBacklog('ivc').then(b => { setBacklog(b); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Backlog & Roadmap</h2>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-64 shrink-0 animate-pulse bg-gray-200 rounded-xl h-48" />)}
        </div>
      </div>
    );
  }

  const monthGroups = groupByMonth(backlog);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-6 pt-6">
        <h2 className="text-xl font-semibold text-gray-900">Backlog & Roadmap</h2>
        <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
          {['board', 'roadmap'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'board' ? 'Board' : 'Roadmap'}
            </button>
          ))}
        </div>
      </div>

      {backlog.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 w-full text-center space-y-2">
          <div className="text-3xl">📋</div>
          <p className="text-gray-900 font-medium">Backlog is empty</p>
          <p className="text-gray-400 text-sm">Your delivery pipeline is being built</p>
        </div>
      ) : view === 'board' ? (
        /* ── BOARD VIEW ── */
        <div className="overflow-x-auto px-6 pb-6">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const items = backlog.filter(i => i.stage === stage.key);
              return (
                <div key={stage.key} className="w-64 shrink-0">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3">
                    {stage.key === 'in_progress' ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-gray-700 font-semibold text-sm">{stage.label}</span>
                      </div>
                    ) : stage.key === 'idea' ? (
                      <span className="text-gray-400 font-semibold text-sm">{stage.label}</span>
                    ) : (
                      <span className="text-gray-700 font-semibold text-sm">{stage.label}</span>
                    )}
                    <span className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                  </div>

                  {/* Column body */}
                  <div className="bg-gray-100 rounded-xl p-3 min-h-48 space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">No items</div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200 capitalize">
                              {(item.linkedPillar || '').replace(/_/g, ' ')}
                            </span>
                            {item.estimatedEffort && (
                              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200">
                                {item.estimatedEffort}
                              </span>
                            )}
                          </div>
                          {/* Value badges */}
                          {(item.value || item.monthlyFee) && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.value > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  ${Math.round(item.value / 1000)}k
                                </span>
                              )}
                              {item.monthlyFee > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  ${Math.round(item.monthlyFee / 1000)}k/mo
                                </span>
                              )}
                            </div>
                          )}
                          {item.linkedGoalIds?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-xs text-blue-500 truncate">Goal linked</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── ROADMAP VIEW ── */
        <div className="overflow-x-auto px-6 pb-6">
          <div className="flex gap-6">
            {Object.entries(monthGroups).map(([month, items]) => (
              <div key={month} className="min-w-48 shrink-0">
                <div className={`text-xs font-medium uppercase tracking-wider mb-3 ${month === 'Unscheduled' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {month}
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded-lg px-3 py-2 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{(item.linkedPillar || '').replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
