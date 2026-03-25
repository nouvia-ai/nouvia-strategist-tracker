import { useState, useEffect } from 'react';
import { getGoals, addGoal, updateGoal, deleteGoal, addGoalNote } from '../../services/clientCockpit';

const PILLAR_OPTIONS = [
  'Engineering & Design', 'Estimation & Quoting', 'Procurement & Sourcing',
  'Production Planning', 'Quality & Compliance', 'Delivery & Logistics',
];
const OWNER_OPTIONS = ['CFO', 'COO', 'CEO', 'CTO', 'VP Engineering', 'VP Operations', 'Other'];

function Toast({ message, color = 'bg-green-500' }) {
  return <div className={`fixed bottom-4 right-4 ${color} text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse`}>{message}</div>;
}

/* ── Goal Form Modal (Add + Edit) ── */
function GoalFormModal({ goal, onSave, onClose }) {
  const isEdit = !!goal;
  const [title, setTitle] = useState(goal?.title || '');
  const [owner, setOwner] = useState(goal?.owner || '');
  const [metric, setMetric] = useState(goal?.targetMetric || '');
  const [factorInput, setFactorInput] = useState('');
  const [factors, setFactors] = useState(goal?.contributingFactors || []);
  const [pillars, setPillars] = useState(goal?.linkedPillars || []);
  const canSubmit = title.trim() && owner && metric.trim();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Objective' : 'Add Business Objective'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Objective Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Reduce delivery cycle from 12 to 8 weeks"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Owner *</label>
            <select value={owner} onChange={e => setOwner(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select owner...</option>
              {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Target Metric *</label>
            <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="e.g. Delivery cycle: 12 weeks → 8 weeks"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Contributing Factors</label>
            <div className="flex gap-2">
              <input value={factorInput} onChange={e => setFactorInput(e.target.value)} placeholder="e.g. Data cleanliness"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => { if (e.key === 'Enter' && factorInput.trim()) { e.preventDefault(); setFactors(p => [...p, factorInput.trim()]); setFactorInput(''); } }} />
              <button onClick={() => { if (factorInput.trim()) { setFactors(p => [...p, factorInput.trim()]); setFactorInput(''); } }} className="bg-gray-100 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-200">Add</button>
            </div>
            {factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {factors.map((f, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {f}<button onClick={() => setFactors(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Linked SCOR Pillars</label>
            <div className="grid grid-cols-2 gap-2">
              {PILLAR_OPTIONS.map(p => (
                <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={pillars.includes(p)} onChange={e => setPillars(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500" />{p}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
          <button onClick={() => canSubmit && onSave({ title: title.trim(), owner, ownerName: owner, targetMetric: metric.trim(), contributingFactors: factors, linkedPillars: pillars })} disabled={!canSubmit}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isEdit ? 'Save Changes' : 'Add Objective'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirmation Modal ── */
function DeleteModal({ title, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Delete Objective?</h3>
        <p className="text-sm text-gray-500 mt-2">This will permanently remove "<span className="font-medium text-gray-700">{title}</span>". The action will be logged and Nouvia will be notified.</p>
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Reason (optional)</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being removed?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Goal Detail Panel (WS2) ── */
function GoalDetailPanel({ goal, onClose, onNoteAdded }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const notes = goal.notes || [];

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await addGoalNote(goal.id, noteText.trim());
    setNoteText('');
    setSaving(false);
    onNoteAdded(goal.id, { text: noteText.trim(), addedBy: 'client', timestamp: new Date().toISOString() });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Business Objective</div>
          <h2 className="text-xl font-semibold text-gray-900 mt-1 pr-8">{goal.title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block">{goal.ownerName || goal.owner}</span>
        </div>
        <div className="p-4 space-y-5 flex-1">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Target Metric</div>
            <div className="text-sm text-gray-700">{goal.targetMetric}</div>
          </div>
          <div className="space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Progress</div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">AI Enablement</span><span className="text-blue-500 font-semibold">{goal.enablementProgress || 0}%</span></div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${goal.enablementProgress || 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Business Outcome</span><span className="text-green-500 font-semibold">{goal.outcomeProgress || 0}%</span></div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${goal.outcomeProgress || 0}%` }} /></div>
            </div>
          </div>
          {goal.contributingFactors?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Contributing Factors</div>
              <div className="flex flex-wrap gap-1">{goal.contributingFactors.map((f, i) => <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{f}</span>)}</div>
            </div>
          )}
          {goal.linkedPillars?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Linked Pillars</div>
              <div className="flex flex-wrap gap-1">{goal.linkedPillars.map((p, i) => <span key={i} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">{p}</span>)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Notes</div>
            {notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {notes.map((n, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700">{n.text}</div>
                    <div className="text-xs text-gray-400 mt-1">{n.addedBy} · {new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            )}
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end mt-2">
              <button onClick={handleSaveNote} disabled={!noteText.trim() || saving}
                className={`bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 ${!noteText.trim() || saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Export ── */
export default function BusinessObjectives({ clientId }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showTooltip, setShowTooltip] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailGoal, setDetailGoal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const h = () => setShowTooltip(null);
    if (showTooltip) { document.addEventListener('click', h); return () => document.removeEventListener('click', h); }
  }, [showTooltip]);

  const loadGoals = () => { setLoading(true); getGoals(clientId).then(g => { setGoals(g); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { loadGoals(); }, [clientId]);

  const showToastMsg = (msg, color = 'bg-green-500') => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  const handleSave = async (data) => {
    if (editGoal) {
      await updateGoal(editGoal.id, data);
      showToastMsg('Objective updated');
    } else {
      await addGoal(clientId, { ...data, enablementProgress: 0, outcomeProgress: 0, status: 'active' });
      showToastMsg('Objective added');
    }
    setShowForm(false); setEditGoal(null); loadGoals();
  };

  const handleDelete = async (reason) => {
    await deleteGoal(deleteTarget.id, 'client', reason);
    setDeleteTarget(null); loadGoals();
    showToastMsg('Objective deleted — Nouvia notified', 'bg-red-500');
  };

  const handleNoteAdded = (goalId, note) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, notes: [...(g.notes || []), note] } : g));
    if (detailGoal?.id === goalId) setDetailGoal(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
  };

  if (loading) return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Objectives</h2>
      <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-full" />
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Business Objectives
        <span className="text-xs text-gray-400 font-normal ml-2">Owned by client — Nouvia tracks AI enablement only</span>
      </h2>

      {goals.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-400 text-sm">No objectives defined yet</p>
          <button onClick={() => { setEditGoal(null); setShowForm(true); }} className="text-blue-500 text-sm font-medium">Add Objective</button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {goals.map(goal => (
              <div key={goal.id} className="group bg-gray-100 rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setDetailGoal(goal)}>
                <div className="flex justify-between items-start">
                  <span className="text-base font-semibold text-gray-900">{goal.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{goal.ownerName || goal.owner}</span>
                    {/* Edit/Delete on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditGoal(goal); setShowForm(true); }}
                        className="text-gray-400 hover:text-blue-500 p-1" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(goal); }}
                        className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                    {/* Tooltip */}
                    <div className="relative inline-block">
                      <button onClick={e => { e.stopPropagation(); setShowTooltip(showTooltip === goal.id ? null : goal.id); }}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium border border-gray-300" aria-label="About these metrics">ⓘ</button>
                      {showTooltip === goal.id && (
                        <div className="absolute right-0 top-6 z-50 w-80 bg-gray-900 text-white text-xs rounded-xl p-4 shadow-2xl leading-relaxed">
                          <p className="font-semibold text-white mb-2">About These Metrics</p>
                          <p className="text-gray-300 mb-3"><span className="text-white font-medium">AI Enablement</span> tracks capabilities delivered by Nouvia under the agreed Statement of Work. This is Nouvia's area of accountability.</p>
                          <p className="text-gray-300 mb-3"><span className="text-white font-medium">Business Outcome</span> tracks progress toward your stated business goal. Achieving this objective depends on multiple factors including platform adoption, internal process changes, data quality, and market conditions — many of which are outside Nouvia's control.</p>
                          <p className="text-gray-400 text-[10px] border-t border-gray-700 pt-3 mt-1">Nouvia is responsible for AI capability delivery as defined in the SOW. Business outcomes are tracked for alignment purposes only and do not constitute a guarantee or commitment by Nouvia.</p>
                          <button onClick={e => { e.stopPropagation(); setShowTooltip(null); }} className="mt-3 text-gray-400 hover:text-white text-xs flex items-center gap-1">Close ✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{goal.targetMetric}</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-gray-500 font-medium">AI Enablement</span><span className="text-blue-500 font-semibold">{goal.enablementProgress || 0}%</span></div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${goal.enablementProgress || 0}%` }} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-gray-500 font-medium">Business Outcome</span><span className="text-green-500 font-semibold">{goal.outcomeProgress || 0}%</span></div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${goal.outcomeProgress || 0}%` }} /></div>
                  </div>
                </div>
                {goal.contributingFactors?.length > 0 && (
                  <div>
                    <button onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [goal.id]: !prev[goal.id] })); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
                      Contributing Factors
                      <svg className={`w-3 h-3 transition-transform ${expanded[goal.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {expanded[goal.id] && <div className="flex flex-wrap gap-1 mt-2">{goal.contributingFactors.map((f, i) => <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full">{f}</span>)}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => { setEditGoal(null); setShowForm(true); }} className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1 mt-2">+ Add Objective</button>
        </>
      )}

      {(showForm) && <GoalFormModal goal={editGoal} onSave={handleSave} onClose={() => { setShowForm(false); setEditGoal(null); }} />}
      {deleteTarget && <DeleteModal title={deleteTarget.title} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {detailGoal && <GoalDetailPanel goal={detailGoal} onClose={() => setDetailGoal(null)} onNoteAdded={handleNoteAdded} />}
      {toast && <Toast message={toast.msg} color={toast.color} />}
    </div>
  );
}
