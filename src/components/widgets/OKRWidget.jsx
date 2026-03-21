/**
 * OKRWidget — INT-001 TASK-12 (WS2)
 * Dashboard widget: current quarter OKRs with KR progress bars.
 * Inline progress update — click a KR bar to edit its value.
 */
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { useOKRs } from '../../hooks/useOKRs';

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
}

function avgProgress(objectives) {
  if (!objectives?.length) return 0;
  const allKRs = objectives.flatMap(o => o.key_results ?? []);
  if (!allKRs.length) return 0;
  return Math.round(allKRs.reduce((s, kr) => s + (kr.progress ?? 0), 0) / allKRs.length);
}

function progressVariant(pct) {
  if (pct >= 70) return 'green';
  if (pct >= 40) return 'amber';
  return 'red';
}

export default function OKRWidget() {
  const { items, loading, error, updateKRProgress } = useOKRs();
  const { year, quarter } = currentQuarter();

  // Find the doc for this quarter (fallback to most recent)
  const doc = useMemo(() => {
    const id = `${year}_Q${quarter}`;
    return items.find(i => i.id === id) ?? items[0] ?? null;
  }, [items, year, quarter]);

  const [editing, setEditing] = useState(null); // { docId, objId, krId, value }
  const [saving,  setSaving]  = useState(false);

  const overallPct = avgProgress(doc?.objectives);

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

  const objTitle = {
    fontSize:   'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color:      'var(--color-text-primary)',
    fontFamily: 'var(--font-sans)',
    marginBottom: 'var(--space-2)',
  };

  const krRow = {
    display:        'flex',
    flexDirection:  'column',
    gap:            'var(--space-1)',
    marginBottom:   'var(--space-2)',
    cursor:         'pointer',
  };

  const krLabel = {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    fontSize:       'var(--font-size-xs)',
    color:          'var(--color-text-secondary)',
    fontFamily:     'var(--font-sans)',
  };

  const inp = {
    width:           60,
    backgroundColor: 'var(--color-bg-overlay)',
    border:          '1px solid var(--color-border-strong)',
    borderRadius:    'var(--radius-sm)',
    padding:         '2px 6px',
    fontSize:        'var(--font-size-xs)',
    color:           'var(--color-text-primary)',
    fontFamily:      'var(--font-mono)',
    outline:         'none',
    textAlign:       'right',
  };

  async function commitEdit() {
    if (!editing) return;
    const val = Math.min(100, Math.max(0, Number(editing.value)));
    setSaving(true);
    try {
      await updateKRProgress(editing.docId, editing.objId, editing.krId, val);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="elevated">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <span style={label}>OKRs</span>
        {doc && (
          <Badge variant="gray">
            {doc.year} Q{doc.quarter} · {overallPct}%
          </Badge>
        )}
      </div>

      {loading && <p style={subText}>Loading…</p>}
      {error   && <p style={{ ...subText, color: 'var(--color-badge-red-text)' }}>{error}</p>}

      {!loading && !error && !doc && (
        <p style={{ ...subText, textAlign: 'center', padding: 'var(--space-4) 0' }}>
          No OKRs set for {year} Q{quarter}.
        </p>
      )}

      {!loading && !error && doc && (
        <>
          {/* Overall progress */}
          <ProgressBar
            value={overallPct}
            max={100}
            variant={progressVariant(overallPct)}
            size="sm"
            label="Overall"
            showPercent
            style={{ marginBottom: 'var(--space-4)' }}
          />

          {/* Objectives */}
          {(doc.objectives ?? []).map(obj => (
            <div key={obj.id} style={{ marginBottom: 'var(--space-4)' }}>
              <p style={objTitle}>{obj.title}</p>
              {(obj.key_results ?? []).map(kr => {
                const isEditing = editing?.krId === kr.id;
                const pct = kr.progress ?? 0;
                return (
                  <div
                    key={kr.id}
                    style={krRow}
                    onClick={() => !isEditing && setEditing({ docId: doc.id, objId: obj.id, krId: kr.id, value: pct })}
                    title="Click to update progress"
                  >
                    <div style={krLabel}>
                      <span>{kr.title}</span>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <input
                            style={inp}
                            type="number"
                            min={0} max={100}
                            value={editing.value}
                            autoFocus
                            onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdit();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                          />
                          <span style={{ ...subText }}>{kr.unit ?? '%'}</span>
                          <Button size="sm" onClick={commitEdit} disabled={saving} style={{ padding: '2px 8px' }}>
                            {saving ? '…' : '✓'}
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
                          {pct}{kr.unit ?? '%'}
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      value={pct}
                      max={100}
                      variant={progressVariant(pct)}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </Card>
  );
}
