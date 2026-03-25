import { useState, useEffect } from 'react';
import { getIdeas, addIdea, updateIdeaStatus, addBacklogItem } from '../../services/clientCockpit';

const SOURCE_BADGE = {
  client: { bg: 'bg-blue-500', label: 'Client' },
  nouvia_ai: { bg: 'bg-green-500', label: 'Nouvia AI' },
  scor_gap: { bg: 'bg-orange-400', label: 'SCOR Gap' },
};

const STATUS_BADGE = {
  logged: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Logged' },
  submitted: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Logged' },
  under_review: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Under Review' },
  quoted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Quoted' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  declined: { bg: 'bg-red-100', text: 'text-red-600', label: 'Declined' },
};

const PILLAR_OPTIONS = ['Engineering & Design', 'Estimation & Quoting', 'Procurement & Sourcing', 'Production Planning', 'Quality & Compliance', 'Delivery & Logistics'];

function Toast({ message, color = 'bg-green-500' }) {
  return <div className={`fixed bottom-4 right-4 ${color} text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse`}>{message}</div>;
}

export default function IdeasQueue({ clientId }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fPillars, setFPillars] = useState([]);

  const loadIdeas = () => {
    setLoading(true);
    getIdeas(clientId, null).then(i => { setIdeas(i); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadIdeas(); }, [clientId]);
  const showToastMsg = (msg, color = 'bg-green-500') => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };
  const resetForm = () => { setFTitle(''); setFDesc(''); setFPillars([]); };

  const handleSubmit = async () => {
    if (!fTitle.trim()) return;
    await addIdea(clientId, { title: fTitle.trim(), description: fDesc.trim(), linkedPillars: fPillars, source: 'client', status: 'logged', aiGenerated: false });
    setShowModal(false); resetForm(); loadIdeas();
    showToastMsg('Idea submitted');
  };

  const handleRequestReview = async (id) => {
    await updateIdeaStatus(id, 'under_review');
    loadIdeas();
    showToastMsg('Sent for review');
  };

  const handleApproveToBacklog = async (idea) => {
    await updateIdeaStatus(idea.id, 'approved');
    await addBacklogItem(clientId, {
      title: idea.title, description: idea.description || '',
      stage: 'idea', linkedPillar: idea.linkedPillars?.[0] || 'engineering',
      estimatedEffort: 'M', priority: 99,
    });
    loadIdeas();
    showToastMsg('Added to backlog');
  };

  const handleDecline = async (id) => {
    await updateIdeaStatus(id, 'declined');
    loadIdeas();
  };

  if (loading) return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ideas & Suggestions</h2>
      <div className="animate-pulse bg-gray-200 rounded-xl h-24 w-full" />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Ideas & Suggestions</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">Submit Idea</button>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <div className="text-3xl">💡</div>
          <p className="text-gray-400 text-sm">No ideas submitted yet</p>
          <button onClick={() => setShowModal(true)} className="text-blue-500 text-sm font-medium">Submit Idea</button>
        </div>
      ) : (
        ideas.map(idea => {
          const source = SOURCE_BADGE[idea.source] || SOURCE_BADGE.client;
          const status = STATUS_BADGE[idea.status] || STATUS_BADGE.logged;
          return (
            <div key={idea.id} className="bg-gray-100 rounded-xl p-3 space-y-2 mb-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`${source.bg} text-white text-xs px-2 py-0.5 rounded-full`}>{source.label}</span>
                  {idea.aiGenerated && <span className="text-gray-400 text-xs">AI-generated</span>}
                </div>
                <span className={`${status.bg} ${status.text} text-xs font-medium px-2 py-0.5 rounded-full`}>{status.label}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{idea.title}</p>
              {idea.description && <p className="text-xs text-gray-500">{idea.description}</p>}
              {idea.linkedPillars?.length > 0 && (
                <div className="flex flex-wrap gap-1">{idea.linkedPillars.map((p, i) => <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{p.replace(/_/g, ' ')}</span>)}</div>
              )}
              <div className="flex gap-2 pt-1">
                {(idea.status === 'logged' || idea.status === 'submitted') && (
                  <button onClick={() => handleRequestReview(idea.id)} className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-600">Request Review</button>
                )}
                {idea.status === 'under_review' && (
                  <span className="text-gray-400 text-xs py-1">Waiting for Nouvia</span>
                )}
                {idea.status === 'quoted' && (
                  <>
                    <button onClick={() => handleApproveToBacklog(idea)} className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-600">Approve → Backlog</button>
                    <button onClick={() => handleDecline(idea.id)} className="text-red-500 text-xs font-medium hover:text-red-600 px-2 py-1">Decline</button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Submit Idea Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Submit an Idea</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Idea Title *</label>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="e.g. Automated RFQ Generation"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
                <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Describe the idea and why it matters..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Linked SCOR Pillars</label>
                <div className="grid grid-cols-2 gap-2">
                  {PILLAR_OPTIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={fPillars.includes(p)} onChange={e => setFPillars(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))} className="rounded border-gray-300 text-blue-500 focus:ring-blue-500" />{p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={handleSubmit} disabled={!fTitle.trim()}
                className={`bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 ${!fTitle.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>Submit Idea</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.msg} color={toast.color} />}
    </div>
  );
}
