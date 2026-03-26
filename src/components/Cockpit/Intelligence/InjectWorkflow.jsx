import { useState } from 'react';
import { CLUSTERS, addToInjectQueue, approveInjection } from '../../../services/intelligenceService';

export default function InjectWorkflow() {
  const [step, setStep] = useState(1);
  const [rawContent, setRawContent] = useState('');
  const [tags, setTags] = useState({ layer: 1, cluster: 8, coworkers: 'Blueprint, Forge, Compass, Strategist', client: null });
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queueId, setQueueId] = useState(null);
  const [error, setError] = useState(null);

  const clusterOptions = Object.entries(CLUSTERS).filter(([, v]) => v.layer === tags.layer).map(([k, v]) => ({ id: parseInt(k), name: v.name }));

  const handleAIStructure = async () => {
    setLoading(true); setError(null);
    try {
      const prompt = `You are structuring knowledge for the Nouvia Intelligence Platform.
Raw content:
${rawContent}
Target: Layer ${tags.layer}, Cluster ${tags.cluster} (${CLUSTERS[tags.cluster]?.name})
Create individual knowledge documents. Each should be self-contained.
For L1: one doc per major concept. For L2: one doc per actionable rule. For L3: one doc per behavioral observation.
Respond ONLY with valid JSON array:
[{"title":"...","content":"2-4 sentences","source":"...","layer":${tags.layer},"cluster":${tags.cluster},"cluster_name":"${CLUSTERS[tags.cluster]?.name || ''}","domain":"...","coworkers":${JSON.stringify(tags.coworkers.split(',').map(s => s.trim()))},"version":"v1.0"}]`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const raw = (data.content?.[0]?.text || '[]').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const structured = JSON.parse(raw);
      const ref = await addToInjectQueue({ raw_content: rawContent, tags, proposed_documents: structured, doc_count: structured.length });
      setQueueId(ref.id); setPreview(structured); setStep(3);
    } catch (e) { setError('Structuring failed: ' + e.message); }
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveInjection(queueId, preview);
      setStep(4);
    } catch (e) { setError('Approval failed: ' + e.message); }
    setLoading(false);
  };

  const reset = () => { setStep(1); setRawContent(''); setPreview([]); setQueueId(null); setError(null); };

  return (
    <div className="max-w-2xl">
      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex items-center gap-1.5 ${s <= step ? 'text-purple-600' : 'text-gray-300'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${s < step ? 'bg-purple-600 text-white' : s === step ? 'bg-purple-100 text-purple-700 border-2 border-purple-600' : 'bg-gray-100 text-gray-400'}`}>{s < step ? '✓' : s}</span>
            <span className="text-xs font-medium">{['Paste', 'Tag', 'Preview', 'Done'][s - 1]}</span>
            {s < 4 && <span className="text-gray-200 mx-1">—</span>}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-900">Paste your harvested content</p>
          <textarea value={rawContent} onChange={e => setRawContent(e.target.value)} rows={8} placeholder="Paste book highlights, meeting notes, observations, framework content..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button onClick={() => setStep(2)} disabled={!rawContent.trim()}
            className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 ${!rawContent.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Next: Tag it →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-900">Tag the knowledge</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Layer</label>
              <select value={tags.layer} onChange={e => setTags(p => ({ ...p, layer: parseInt(e.target.value), cluster: Object.entries(CLUSTERS).find(([, v]) => v.layer === parseInt(e.target.value))?.[0] || 1 }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value={1}>Layer 1 — Foundations</option>
                <option value={2}>Layer 2 — Rules</option>
                <option value={3}>Layer 3 — Patterns</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Cluster</label>
              <select value={tags.cluster} onChange={e => setTags(p => ({ ...p, cluster: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {clusterOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">Coworkers</label>
            <input value={tags.coworkers} onChange={e => setTags(p => ({ ...p, coworkers: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="text-gray-500 text-sm">← Back</button>
            <button onClick={handleAIStructure} disabled={loading}
              className={`bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 ${loading ? 'opacity-50' : ''}`}>
              {loading ? <><span className="animate-spin">⟳</span> Structuring...</> : 'Structure with AI →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-900">AI structured your content</p>
          <p className="text-xs text-gray-400">{preview.length} documents will be created</p>
          <div className="space-y-2">
            {preview.map((d, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">NEW</span>
                  <span className="text-sm font-medium text-gray-900">{d.title}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{d.content}</p>
              </div>
            ))}
          </div>
          <button onClick={handleApprove} disabled={loading}
            className={`w-full bg-purple-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-purple-700 ${loading ? 'opacity-50' : ''}`}>
            {loading ? 'Approving...' : `Approve all ${preview.length} documents`}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-12 space-y-3">
          <span className="inline-block w-12 h-12 rounded-full bg-green-100 text-green-600 text-xl leading-[48px]">✓</span>
          <p className="text-lg font-semibold text-gray-900">{preview.length} documents added</p>
          <p className="text-sm text-gray-400">Available in all sessions.</p>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={reset} className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700">Inject more</button>
          </div>
        </div>
      )}
    </div>
  );
}
