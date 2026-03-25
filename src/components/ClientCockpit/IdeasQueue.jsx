import { useState, useEffect } from 'react';
import { getIdeas, approveIdea, declineIdea } from '../../services/clientCockpit';

const SOURCE_BADGE = {
  client: { bg: 'bg-blue-500', label: 'Client' },
  nouvia_ai: { bg: 'bg-green-500', label: 'Nouvia AI' },
  scor_gap: { bg: 'bg-orange-400', label: 'SCOR Gap' },
};

export default function IdeasQueue({ clientId }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadIdeas = () => {
    setLoading(true);
    getIdeas(clientId, 'submitted').then(i => { setIdeas(i); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadIdeas(); }, [clientId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ideas & Suggestions</h2>
        <div className="space-y-3">
          <div className="animate-pulse bg-gray-200 rounded-xl h-24 w-full" />
          <div className="animate-pulse bg-gray-200 rounded-xl h-24 w-full" />
        </div>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Ideas & Suggestions</h2>
          <button className="bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
            Submit Idea
          </button>
        </div>
        <div className="text-center py-8 space-y-2">
          <div className="text-3xl">💡</div>
          <p className="text-gray-400 text-sm">No ideas submitted yet</p>
          <button className="text-blue-500 text-sm font-medium">Submit Idea</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Ideas & Suggestions</h2>
        <button className="bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
          Submit Idea
        </button>
      </div>

      {ideas.map(idea => {
        const source = SOURCE_BADGE[idea.source] || SOURCE_BADGE.client;
        return (
          <div key={idea.id} className="bg-gray-100 rounded-xl p-3 space-y-2 mb-3 shadow-sm hover:shadow-md transition-shadow">
            {/* Source badge */}
            <div className="flex justify-between items-start">
              <span className={`${source.bg} text-white text-xs px-2 py-0.5 rounded-full`}>{source.label}</span>
              {idea.aiGenerated && (
                <span className="text-gray-400 text-xs">AI-generated</span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-medium text-gray-900">{idea.title}</p>

            {/* Pillar chips */}
            {idea.linkedPillars?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {idea.linkedPillars.map((p, i) => (
                  <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{p.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { approveIdea(idea.id).then(loadIdeas); }} className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-600">
                Approve → Backlog
              </button>
              <button onClick={() => { declineIdea(idea.id).then(loadIdeas); }} className="text-red-500 text-xs font-medium hover:text-red-600 px-2 py-1">
                Decline
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
