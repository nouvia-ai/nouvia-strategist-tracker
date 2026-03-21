/**
 * GoalManagement — INT-002 TASK-20
 * Full-page goal CRUD. Accessible from NorthStarGoal widget "+ Add Goal" button.
 */
import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useGoals } from '../../hooks/useGoals';

const GOAL_TYPES    = ['North Star', 'Annual', 'Quarterly'];
const GOAL_STATUSES = ['Active', 'Achieved', 'At Risk', 'Abandoned'];
const TARGET_UNITS  = ['$', '%', 'clients', 'projects', 'ARR', 'NRR'];
const NS_CAP = 3;

const STATUS_COLOR = { Active: '#27AE60', 'At Risk': '#F5A623', Achieved: '#3182CE', Abandoned: '#718096' };

const inp = {
  width: '100%', boxSizing: 'border-box',
  backgroundColor: 'var(--color-bg-overlay)',
  border: '1px solid var(--color-border-muted)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  minHeight: 44,
};
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, fontFamily: 'var(--font-sans)' };
const fw = { marginBottom: 16 };
const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 };
const err = { fontSize: 12, color: '#E74C3C', marginTop: 4, fontFamily: 'var(--font-sans)' };

const EMPTY = { title: '', type: 'North Star', deadline: '', target_value: '', target_unit: '$', order: '0' };

export default function GoalManagement({ onBack }) {
  const { items: goals, loading } = useGoals();
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const s = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const activeNS = goals.filter(g => g.type === 'North Star' && g.status === 'Active').length;
  const nsCapHit = activeNS >= NS_CAP && form.type === 'North Star' && !editId;

  const validate = () => {
    const e = {};
    if (!form.title.trim())   e.title    = 'Title is required';
    if (!form.deadline)        e.deadline = 'Deadline is required';
    if (nsCapHit)              e.ns_cap   = `Maximum ${NS_CAP} active North Star goals. Archive one first.`;
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setErrors({});
    try {
      // Direct Firestore write (UI-initiated)
      const deadline = new Date(form.deadline + 'T00:00:00');
      const data = {
        title:         form.title.trim(),
        type:          form.type,
        deadline:      Timestamp.fromDate(deadline),
        target_value:  form.target_value !== '' ? parseFloat(form.target_value) : null,
        target_unit:   form.target_unit  || null,
        order:         parseInt(form.order) || 0,
        updated_at:    serverTimestamp(),
      };
      if (!editId) {
        data.current_value = null;
        data.status        = 'Active';
        data.created_at    = serverTimestamp();
        await addDoc(collection(db, 'goals'), data);
      } else {
        await updateDoc(doc(db, 'goals', editId), data);
      }
      setForm(EMPTY);
      setEditId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal) => {
    const dl = goal.deadline?.toDate ? goal.deadline.toDate() : goal.deadline ? new Date(goal.deadline) : null;
    const dlStr = dl ? dl.toISOString().split('T')[0] : '';
    setForm({ title: goal.title || '', type: goal.type || 'North Star', deadline: dlStr, target_value: goal.target_value ?? '', target_unit: goal.target_unit || '$', order: goal.order ?? 0 });
    setEditId(goal.id);
    setErrors({});
    window.scrollTo(0, 0);
  };

  const handleArchive = async (goalId) => {
    await updateDoc(doc(db, 'goals', goalId), { status: 'Abandoned', updated_at: serverTimestamp() });
  };

  const handleCancel = () => { setForm(EMPTY); setEditId(null); setErrors({}); };

  const btnBase = { minHeight: 44, padding: '0 20px', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ ...btnBase, backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-default)', padding: '0 14px' }}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Goal Management</h2>
        <span style={{ fontSize: 12, color: 'var(--color-text-ghost)', marginLeft: 4 }}>{activeNS}/{NS_CAP} North Star active</span>
      </div>

      {/* Form */}
      <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
          {editId ? 'Edit Goal' : 'New Goal'}
        </div>

        <div style={fw}>
          <label style={label}>Title *</label>
          <input style={inp} value={form.title} onChange={e => s('title', e.target.value)} placeholder="e.g. Hit $500k ARR" />
          {errors.title && <div style={err}>{errors.title}</div>}
        </div>

        <div style={row}>
          <div>
            <label style={label}>Type</label>
            <select style={inp} value={form.type} onChange={e => s('type', e.target.value)}>
              {GOAL_TYPES.map(t => (
                <option key={t} value={t} disabled={t === 'North Star' && nsCapHit && !editId}>{t}{t === 'North Star' ? ` (${activeNS}/${NS_CAP})` : ''}</option>
              ))}
            </select>
            {errors.ns_cap && <div style={err}>{errors.ns_cap}</div>}
          </div>
          <div>
            <label style={label}>Deadline *</label>
            <input type="date" style={inp} value={form.deadline} onChange={e => s('deadline', e.target.value)} />
            {errors.deadline && <div style={err}>{errors.deadline}</div>}
          </div>
        </div>

        <div style={row}>
          <div>
            <label style={label}>Target Value</label>
            <input type="number" style={inp} value={form.target_value} onChange={e => s('target_value', e.target.value)} placeholder="e.g. 500000" />
          </div>
          <div>
            <label style={label}>Unit</label>
            <select style={inp} value={form.target_unit} onChange={e => s('target_unit', e.target.value)}>
              {TARGET_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={fw}>
          <label style={label}>Display Order</label>
          <input type="number" style={{ ...inp, width: 80 }} value={form.order} onChange={e => s('order', e.target.value)} min="0" />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || nsCapHit} style={{ ...btnBase, backgroundColor: nsCapHit ? '#ccc' : '#27AE60', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : editId ? 'Save Changes' : '+ Add Goal'}
          </button>
          {editId && (
            <button onClick={handleCancel} style={{ ...btnBase, backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-default)' }}>
              Cancel
            </button>
          )}
          {saved && <span style={{ fontSize: 13, color: '#27AE60', alignSelf: 'center' }}>✓ Saved</span>}
        </div>
      </div>

      {/* Goals list */}
      {loading ? (
        <div style={{ color: 'var(--color-text-ghost)', fontSize: 13 }}>Loading goals…</div>
      ) : goals.length === 0 ? (
        <div style={{ color: 'var(--color-text-ghost)', fontSize: 13 }}>No goals yet.</div>
      ) : (
        <div>
          {GOAL_TYPES.map(type => {
            const typeGoals = goals.filter(g => g.type === type);
            if (!typeGoals.length) return null;
            const nsActive = typeGoals.filter(g => g.status === 'Active').length;
            return (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                  {type}{type === 'North Star' ? ` — ${nsActive}/${NS_CAP} active` : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {typeGoals.map(g => {
                    const color = STATUS_COLOR[g.status] || '#888';
                    const dl    = g.deadline?.toDate ? g.deadline.toDate() : null;
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-md)' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{g.title}</span>
                          {dl && <span style={{ fontSize: 12, color: 'var(--color-text-ghost)', marginLeft: 8 }}>· {dl.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                          {g.target_value != null && <span style={{ fontSize: 12, color: 'var(--color-text-ghost)', marginLeft: 8 }}>· Target: {g.target_value}{g.target_unit || ''}</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color, backgroundColor: color + '18', padding: '2px 8px', borderRadius: 10 }}>{g.status}</span>
                        <button onClick={() => handleEdit(g)} style={{ fontSize: 12, color: 'var(--color-text-ghost)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 8px' }}>edit</button>
                        {g.status === 'Active' && (
                          <button onClick={() => handleArchive(g.id)} style={{ fontSize: 12, color: '#E74C3C', background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 8px' }}>archive</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
