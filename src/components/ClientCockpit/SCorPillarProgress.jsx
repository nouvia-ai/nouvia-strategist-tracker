import { useState, useEffect } from 'react';
import { getPillars } from '../../services/clientCockpit';

const STATUS_MAP = {
  active: { dot: 'bg-green-500', text: 'text-green-600', label: 'Active' },
  next: { dot: 'bg-blue-500', text: 'text-blue-600', label: 'Next' },
  staged: { dot: 'bg-gray-400', text: 'text-gray-400', label: 'Staged' },
};

const CIRC = 2 * Math.PI * 32; // ~201

export default function SCorPillarProgress({ clientId }) {
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPillars(clientId).then(p => { setPillars(p); setLoading(false); }).catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div>
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">AI Transformation Progress</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Transformation Progress</h2>
        <span className="text-xs text-gray-400 font-normal">SCOR-Aligned Manufacturing Intelligence Framework</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map(pillar => {
          const status = STATUS_MAP[pillar.status] || STATUS_MAP.staged;
          const progress = pillar.enablementProgress || 0;
          const offset = CIRC - (progress / 100 * CIRC);

          return (
            <div key={pillar.id} className="bg-gray-100 rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start">
                <span className="text-base font-semibold text-gray-900">{pillar.label}</span>
                <span className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">{pillar.scorDomain}</span>
              </div>

              {/* Progress ring */}
              <div className="flex justify-center my-2">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="6" />
                  {progress > 0 && (
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#3B82F6" strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
                      transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dashoffset 0.6s ease-out' }} />
                  )}
                  <text x="40" y="44" textAnchor="middle" className="fill-gray-900 font-semibold" fontSize="16">
                    {progress}%
                  </text>
                </svg>
              </div>

              {/* Active capabilities */}
              <div className="flex flex-wrap gap-1">
                {pillar.activeCapabilities?.length > 0 ? (
                  pillar.activeCapabilities.map((c, i) => (
                    <span key={i} className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200">{c}</span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No capabilities yet</span>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                <span className={status.text}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
