/**
 * PriorityQueueWidget — INT-001 TASK-13 (WS2)
 * Dashboard widget: active priority queue items, inline add/status-change.
 */
import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { usePriorityQueue } from '../../hooks/usePriorityQueue';

const STATUS_VARIANT = {
  'Open':        'gray',
  'In Progress': 'blue',
  'Done':        'green',
  'Blocked':     'red',
};

const PRIORITY_LABEL = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5' };
const PRIORITY_COLOR = {
  1: 'var(--color-badge-red-text)',
  2: 'var(--color-badge-amber-text)',
  3: 'var(--color-accent)',
  4: 'var(--color-text-muted)',
  5: 'var(--color-text-subtle)',
};

const STATUSES = ['Open', 'In Progress', 'Done', 'Blocked'];

const inp = {
  width:           '100%',
  backgroundColor: 'var(--color-bg-overlay)',
  border:          '1px solid var(--color-border-muted)',
  borderRadius:    'var(--radius-md)',
  padding:         '6px 10px',
  fontSize:        'var(--font-size-sm)',
  color:           'var(--color-text-primary)',
  fontFamily:      'var(--font-sans)',
  outline:         'none',
  boxSizing:       'border-box',
};

const sel = {
  ...inp,
  cursor: 'pointer',
};

const EMPTY = { title: '', priority: 2, status: 'Open', context: '', due_date: '' };

export default function PriorityQueueWidget() {
  const { activeItems, blockedItems, loading, error, addItem, updateItem, removeItem } = usePriorityQueue();
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleAdd() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addItem({
        title:    form.title.trim(),
        priority: Number(form.priority),
        status:   form.status,
        context:  form.context.trim() || null,
        due_date: form.due_date || null,
      });
      setForm(EMPTY);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function cycleStatus(item) {
    const idx  = STATUSES.indexOf(item.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    await updateItem(item.id, { status: next });
  }

  const label = {
    fontSize:      'var(--font-size-xs)',
    fontWeight:    'var(--font-weight-medium)',
    color:         'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily:    'var(--font-sans)',
  };

  const subText = {
    fontSize:   'var(--font-size-xs)',
    color:      'var(--color-text-subtle)',
    fontFamily: 'var(--font-sans)',
  };

  const itemRow = {
    display:        'flex',
    alignItems:     'flex-start',
    gap:            'var(--space-2)',
    padding:        'var(--space-2) 0',
    borderBottom:   '1px solid var(--color-border-default)',
  };

  const divider = {
    borderTop: '1px solid var(--color-border-default)',
    margin:    'var(--space-3) 0',
  };

  const displayItems = [...activeItems].sort((a, b) => a.priority - b.priority);
  const total        = activeItems.length;
  const blocked      = blockedItems.length;

  return (
    <Card variant="elevated">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <span style={label}>Priority Queue</span>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {blocked > 0 && <Badge variant="red">{blocked} blocked</Badge>}
          <Badge variant="gray">{total} active</Badge>
        </div>
      </div>

      {loading && <p style={subText}>Loading…</p>}
      {error   && <p style={{ ...subText, color: 'var(--color-badge-red-text)' }}>{error}</p>}

      {!loading && !error && displayItems.length === 0 && (
        <p style={{ ...subText, textAlign: 'center', padding: 'var(--space-4) 0' }}>
          Queue is clear.
        </p>
      )}

      {!loading && !error && displayItems.length > 0 && (
        <div>
          {displayItems.map(item => (
            <div key={item.id} style={itemRow}>
              {/* Priority badge */}
              <span style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    'var(--font-size-xs)',
                fontWeight:  'var(--font-weight-bold)',
                color:       PRIORITY_COLOR[item.priority] || 'var(--color-text-muted)',
                minWidth:    24,
                paddingTop:  2,
              }}>
                {PRIORITY_LABEL[item.priority] ?? `P${item.priority}`}
              </span>

              {/* Title + context */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize:     'var(--font-size-sm)',
                  color:        'var(--color-text-primary)',
                  fontFamily:   'var(--font-sans)',
                  marginBottom: item.context ? 2 : 0,
                  whiteSpace:   'nowrap',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.title}
                </p>
                {item.context && (
                  <p style={{ ...subText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.context}
                  </p>
                )}
                {item.due_date && (
                  <p style={{ ...subText, color: 'var(--color-badge-amber-text)', marginTop: 2 }}>
                    Due {item.due_date}
                  </p>
                )}
              </div>

              {/* Status — click to cycle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span
                  onClick={() => cycleStatus(item)}
                  title="Click to advance status"
                  style={{ cursor: 'pointer' }}
                >
                  <Badge variant={STATUS_VARIANT[item.status] ?? 'gray'}>
                    {item.status}
                  </Badge>
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  title="Remove"
                  style={{
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    color:      'var(--color-text-subtle)',
                    fontSize:   '0.65rem',
                    padding:    0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={divider} />

      {!open ? (
        <Button size="sm" variant="secondary" onClick={() => { setForm(EMPTY); setOpen(true); }} style={{ width: '100%' }}>
          + Add Item
        </Button>
      ) : (
        <div>
          <p style={{ ...label, marginBottom: 'var(--space-2)' }}>New Queue Item</p>

          <div style={{ marginBottom: 'var(--space-2)' }}>
            <p style={{ ...subText, marginBottom: 4 }}>Title *</p>
            <input style={inp} type="text" placeholder="What needs doing?" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>Priority</p>
              <select style={sel} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}{n===1?' (highest)':n===5?' (lowest)':''}</option>)}
              </select>
            </div>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>Status</p>
              <select style={sel} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-2)' }}>
            <p style={{ ...subText, marginBottom: 4 }}>Context</p>
            <input style={inp} type="text" placeholder="Why this matters now" value={form.context} onChange={e => set('context', e.target.value)} />
          </div>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <p style={{ ...subText, marginBottom: 4 }}>Due Date (optional)</p>
            <input style={inp} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button size="sm" onClick={handleAdd} disabled={!form.title.trim() || saving} style={{ flex: 1 }}>
              {saving ? 'Saving…' : 'Add to Queue'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
