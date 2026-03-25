import { useState, useEffect } from 'react';
import { getGoals } from '../../services/clientCockpit';

export default function BusinessObjectives({ clientId }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    getGoals(clientId).then(g => { setGoals(g); setLoading(false); }).catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Objectives</h2>
        <div className="space-y-3">
          <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-full" />
          <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-full" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Objectives</h2>
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-400 text-sm">No objectives defined yet</p>
          <button className="text-blue-500 text-sm font-medium">Add Objective</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Business Objectives
        <span className="text-xs text-gray-400 font-normal ml-2">
          Owned by client — Nouvia tracks AI enablement only
        </span>
      </h2>

      <div className="space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="bg-gray-100 rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start">
              <span className="text-base font-semibold text-gray-900">{goal.title}</span>
              <div className="flex items-center gap-2">
                <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {goal.ownerName || goal.owner}
                </span>
                <button className="text-gray-400 hover:text-gray-600 text-sm" title="AI Enablement reflects capabilities delivered by Nouvia. Business Outcome progress depends on adoption, process changes, and conditions outside Nouvia's control.">
                  ⓘ
                </button>
              </div>
            </div>

            {/* Target metric */}
            <p className="text-sm text-gray-500">{goal.targetMetric}</p>

            {/* Progress bars */}
            <div className="space-y-2">
              {/* AI Enablement */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">AI Enablement</span>
                  <span className="text-blue-500 font-semibold">{goal.enablementProgress || 0}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${goal.enablementProgress || 0}%` }} />
                </div>
              </div>

              {/* Business Outcome */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-medium">Business Outcome</span>
                  <span className="text-green-500 font-semibold">{goal.outcomeProgress || 0}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${goal.outcomeProgress || 0}%` }} />
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            {goal.contributingFactors?.length > 0 && (
              <div>
                <button onClick={() => setExpanded(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
                  Contributing Factors
                  <svg className={`w-3 h-3 transition-transform ${expanded[goal.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {expanded[goal.id] && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {goal.contributingFactors.map((f, i) => (
                      <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => console.log('Add Objective — Sprint 2')} className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1 mt-2">
        + Add Objective
      </button>
    </div>
  );
}
