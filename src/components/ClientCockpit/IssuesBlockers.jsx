import { useState, useEffect } from 'react';
import { getIssues, addIssue, updateIssue, deleteIssue, addIssueNote } from '../../services/clientCockpit';

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
const PILLAR_OPTIONS = ['Engineering & Design', 'Estimation & Quoting', 'Procurement & Sourcing', 'Production Planning', 'Quality & Compliance', 'Delivery & Logistics'];

function Toast({ message, color = 'bg-green-500' }) {
  return <div className={`fixed bottom-4 right-4 ${color} text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse`}>{message}</div>;
}

/* ── Issue Form Modal (Add + Edit) ── */
function IssueFormModal({ issue, onSave, onClose }) {
  const isEdit = !!issue;
  const [title, setTitle] = useState(issue?.title || '');
  const [desc, setDesc] = useState(issue?.description || '');
  const [severity, setSeverity] = useState(issue?.severity || '');
  const [pillars, setPillars] = useState(issue?.linkedPillars || []);
  const [raisedBy, setRaisedBy] = useState(issue?.raisedBy || 'client');
  const canSubmit = title.trim() && severity;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Issue' : 'Log Issue or Blocker'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Issue Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Historical job data quality"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the issue and its impact..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Severity *</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[{ val: 'high', label: 'High', active: 'bg-red-500 text-white' }, { val: 'medium', label: 'Medium', active: 'bg-orange-400 text-white' }, { val: 'low', label: 'Low', active: 'bg-green-500 text-white' }].map(s => (
                <button key={s.val} onClick={() => setSeverity(s.val)} className={`flex-1 py-2 text-sm font-medium transition-colors ${severity === s.val ? s.active : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Linked Pillars</label>
            <div className="grid grid-cols-2 gap-2">
              {PILLAR_OPTIONS.map(p => (
                <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={pillars.includes(p)} onChange={e => setPillars(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))} className="rounded border-gray-300 text-blue-500 focus:ring-blue-500" />{p}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Raised By</label>
            <div className="flex gap-4">
              {['client', 'nouvia'].map(r => (
                <label key={r} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="raisedBy" checked={raisedBy === r} onChange={() => setRaisedBy(r)} className="text-blue-500 focus:ring-blue-500" />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
          <button onClick={() => canSubmit && onSave({ title: title.trim(), description: desc.trim(), severity, linkedPillars: pillars, raisedBy })} disabled={!canSubmit}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isEdit ? 'Save Changes' : 'Log Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Issue Detail Panel ── */
function IssueDetailPanel({ issue, onClose, onNoteAdded }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const sev = SEV[issue.severity] || SEV.low;
  const notes = issue.notes || [];

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await addIssueNote(issue.id, noteText.trim());
    setNoteText(''); setSaving(false);
    onNoteAdded(issue.id, { text: noteText.trim(), addedBy: 'client', timestamp: new Date().toISOString() });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Issue / Blocker</div>
          <h2 className="text-xl font-semibold text-gray-900 mt-1 pr-8">{issue.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
            <span className={`${sev.text} text-xs font-medium`}>{sev.label} severity</span>
          </div>
        </div>
        <div className="p-4 space-y-5 flex-1">
          {issue.description && <div><div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Description</div><div className="text-sm text-gray-700">{issue.description}</div></div>}
          {issue.linkedPillars?.length > 0 && <div><div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Linked Pillars</div><div className="flex flex-wrap gap-1">{issue.linkedPillars.map((p, i) => <span key={i} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full capitalize">{p.replace(/_/g, ' ')}</span>)}</div></div>}
          <div className="flex gap-4"><div><div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Raised By</div><div className="text-sm text-gray-700 capitalize">{issue.raisedBy}</div></div><div><div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</div><div className="text-sm text-gray-700 capitalize">{issue.status}</div></div></div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Notes</div>
            {notes.length > 0 && <div className="space-y-2 mb-3">{notes.map((n, i) => <div key={i} className="bg-gray-50 rounded-lg p-3"><div className="text-sm text-gray-700">{n.text}</div><div className="text-xs text-gray-400 mt-1">{n.addedBy} · {new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div></div>)}</div>}
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end mt-2">
              <button onClick={handleSaveNote} disabled={!noteText.trim() || saving} className={`bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 ${!noteText.trim() || saving ? 'opacity-50 cursor-not-allowed' : ''}`}>{saving ? 'Saving...' : 'Save Note'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Export ── */
export default function IssuesBlockers({ clientId }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);
  const [toast, setToast] = useState(null);

  const loadIssues = () => { setLoading(true); getIssues(clientId).then(i => { setIssues(i); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { loadIssues(); }, [clientId]);
  const showToastMsg = (msg, color = 'bg-green-500') => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  const handleSave = async (data) => {
    if (editIssue) { await updateIssue(editIssue.id, data); showToastMsg('Issue updated'); }
    else { await addIssue(clientId, { ...data, status: 'open' }); showToastMsg('Issue logged'); }
    setShowForm(false); setEditIssue(null); loadIssues();
  };

  const handleDelete = async (reason) => {
    await deleteIssue(deleteTarget.id, 'client', reason);
    setDeleteTarget(null); loadIssues();
    showToastMsg('Issue deleted — Nouvia notified', 'bg-red-500');
  };

  const handleNoteAdded = (issueId, note) => {
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, notes: [...(i.notes || []), note] } : i));
    if (detailIssue?.id === issueId) setDetailIssue(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
  };

  if (loading) return <div><h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Blockers</h2><div className="animate-pulse bg-gray-200 rounded-lg h-12 w-full" /></div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues & Blockers</h2>
      {issues.length === 0 ? (
        <div className="text-center py-8 space-y-2"><div className="text-3xl">✓</div><p className="text-gray-400 text-sm">No open issues</p><button onClick={() => { setEditIssue(null); setShowForm(true); }} className="text-blue-500 text-sm font-medium">Log Issue</button></div>
      ) : (
        <>
          <div>
            {issues.map(issue => {
              const sev = SEV[issue.severity] || SEV.low;
              const status = STATUS[issue.status] || STATUS.open;
              return (
                <div key={issue.id} className="group flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0 cursor-pointer"
                  onClick={() => setDetailIssue(issue)}>
                  <div className="flex items-center gap-1.5 w-20 shrink-0"><div className={`w-2 h-2 rounded-full ${sev.dot}`} /><span className={`${sev.text} text-xs font-medium`}>{sev.label}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{issue.title}</div>
                    {issue.linkedPillars?.length > 0 && <div className="flex gap-1 mt-0.5">{issue.linkedPillars.map((p, i) => <span key={i} className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full capitalize">{p.replace(/_/g, ' ')}</span>)}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditIssue(issue); setShowForm(true); }} className="text-gray-400 hover:text-blue-500 p-1" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(issue); }} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1"><span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span><span className="text-xs text-gray-400 capitalize">{issue.raisedBy}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => { setEditIssue(null); setShowForm(true); }} className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1 mt-2">+ Log Issue</button>
        </>
      )}
      {showForm && <IssueFormModal issue={editIssue} onSave={handleSave} onClose={() => { setShowForm(false); setEditIssue(null); }} />}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Delete Issue?</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently remove this issue. Nouvia will be notified.</p>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => setDeleteTarget(null)} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={() => handleDelete('')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
      {detailIssue && <IssueDetailPanel issue={detailIssue} onClose={() => setDetailIssue(null)} onNoteAdded={handleNoteAdded} />}
      {toast && <Toast message={toast.msg} color={toast.color} />}
    </div>
  );
}
