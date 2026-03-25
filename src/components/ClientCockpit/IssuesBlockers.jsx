import { useState, useEffect } from 'react';
import { getIssues } from '../../services/clientCockpit';

const SEV = {
  high: { dot: 'bg-red-500', text: 'text-red-500', label: 'High' },
  medium: { dot: 'bg-orange-400', text: 'text-orange-400', label: 'Medium' },
  low: { dot: 'bg-green-500', text: 'text-green-500', label: 'Low' },
};

const STATUS = {
  open: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Open' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'In Progress' },
  resolved: { bg: 'bg-green-100', text: 'text-green-600', label: 'Resolved' },
};

export default function IssuesBlockers({ clientId }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIssues(clientId).then(i => { setIssues(i); setLoading(false); }).catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Blockers</h2>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-12 w-full" />)}
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Blockers</h2>
        <div className="text-center py-8 space-y-2">
          <div className="text-3xl">✓</div>
          <p className="text-gray-400 text-sm">No open issues</p>
          <button className="text-blue-500 text-sm font-medium">Log Issue</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Blockers</h2>

      <div>
        {issues.map(issue => {
          const sev = SEV[issue.severity] || SEV.low;
          const status = STATUS[issue.status] || STATUS.open;
          return (
            <div key={issue.id} className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0">
              {/* Severity */}
              <div className="flex items-center gap-1.5 w-20 shrink-0">
                <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
                <span className={`${sev.text} text-xs font-medium`}>{sev.label}</span>
              </div>

              {/* Center */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{issue.title}</div>
                {issue.linkedPillars?.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {issue.linkedPillars.map((p, i) => (
                      <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{p.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                <span className="text-xs text-gray-400 capitalize">{issue.raisedBy}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => console.log('Log Issue — Sprint 2')} className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1 mt-2">
        + Log Issue
      </button>
    </div>
  );
}
