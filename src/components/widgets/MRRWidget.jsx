/**
 * MRRWidget — INT-001 TASK-11 (WS2)
 * Dashboard widget: current MRR, MoM growth, 6-month sparkbar, log form.
 */
import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useMRR } from '../../hooks/useMRR';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function SparkBars({ entries }) {
  const recent = [...entries].slice(0, 6).reverse(); // oldest → newest
  if (recent.length === 0) return null;
  const max = Math.max(...recent.map(e => e.mrr_usd ?? 0), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-1)', height: 40 }}>
      {recent.map((e) => {
        const pct = Math.max(4, ((e.mrr_usd ?? 0) / max) * 100);
        return (
          <div
            key={e.id}
            title={`${MONTH_NAMES[(e.month ?? 1) - 1]} ${e.year}: ${fmt(e.mrr_usd)}`}
            style={{
              flex: 1,
              height: `${pct}%`,
              backgroundColor: 'var(--color-accent)',
              opacity: 0.7,
              borderRadius: 'var(--radius-sm)',
              transition: 'height var(--duration-slow) var(--ease-default)',
            }}
          />
        );
      })}
    </div>
  );
}

const EMPTY = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, mrr_usd: '', client_count: '', notes: '' };

const inp = {
  width: '100%',
  backgroundColor: 'var(--color-bg-overlay)',
  border: '1px solid var(--color-border-muted)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 10px',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function MRRWidget() {
  const { entries, loading, error, saveEntry, currentMRR, momGrowth } = useMRR();
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const latest = entries[0] ?? null;

  const growthVariant = momGrowth == null ? 'gray'
    : momGrowth >= 0 ? 'green' : 'red';
  const growthLabel = momGrowth == null ? 'No prior month'
    : `${momGrowth >= 0 ? '+' : ''}${momGrowth.toFixed(1)}% MoM`;

  function openForm() {
    const now = new Date();
    setForm({
      year:         now.getFullYear(),
      month:        now.getMonth() + 1,
      mrr_usd:      latest?.mrr_usd ?? '',
      client_count: latest?.client_count ?? '',
      notes:        '',
    });
    setOpen(true);
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!form.mrr_usd) return;
    setSaving(true);
    try {
      await saveEntry(Number(form.year), Number(form.month), {
        mrr_usd:      Number(form.mrr_usd),
        client_count: form.client_count !== '' ? Number(form.client_count) : null,
        notes:        form.notes || null,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const headerRow = {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   'var(--space-3)',
  };

  const label = {
    fontSize:   'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color:      'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: 'var(--font-sans)',
  };

  const bigNum = {
    fontSize:   '2rem',
    fontWeight: 'var(--font-weight-bold)',
    color:      'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.1,
    marginBottom: 'var(--space-1)',
  };

  const subText = {
    fontSize: 'var(--font-size-xs)',
    color:    'var(--color-text-subtle)',
    fontFamily: 'var(--font-sans)',
  };

  const divider = {
    borderTop: '1px solid var(--color-border-default)',
    margin:    'var(--space-3) 0',
  };

  const formGrid = {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 'var(--space-2)',
    marginBottom:        'var(--space-2)',
  };

  return (
    <Card variant="elevated">
      <div style={headerRow}>
        <span style={label}>Monthly Recurring Revenue</span>
        <Badge variant={growthVariant}>{growthLabel}</Badge>
      </div>

      {loading && (
        <p style={{ ...subText, color: 'var(--color-text-subtle)' }}>Loading…</p>
      )}
      {error && (
        <p style={{ ...subText, color: 'var(--color-badge-red-text)' }}>{error}</p>
      )}

      {!loading && !error && (
        <>
          <div style={bigNum}>{fmt(currentMRR)}</div>
          {latest && (
            <p style={subText}>
              {latest.client_count != null ? `${latest.client_count} clients · ` : ''}
              {MONTH_NAMES[(latest.month ?? 1) - 1]} {latest.year}
            </p>
          )}

          {entries.length > 1 && (
            <>
              <div style={{ ...divider }} />
              <SparkBars entries={entries} />
            </>
          )}
        </>
      )}

      <div style={{ ...divider }} />

      {!open ? (
        <Button size="sm" variant="secondary" onClick={openForm} style={{ width: '100%' }}>
          + Log Month
        </Button>
      ) : (
        <div>
          <p style={{ ...label, marginBottom: 'var(--space-2)' }}>Log Monthly MRR</p>
          <div style={formGrid}>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>Year</p>
              <input
                style={inp}
                type="number"
                value={form.year}
                onChange={e => set('year', e.target.value)}
              />
            </div>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>Month (1–12)</p>
              <input
                style={inp}
                type="number"
                min={1} max={12}
                value={form.month}
                onChange={e => set('month', e.target.value)}
              />
            </div>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>MRR (USD) *</p>
              <input
                style={inp}
                type="number"
                placeholder="e.g. 5000"
                value={form.mrr_usd}
                onChange={e => set('mrr_usd', e.target.value)}
              />
            </div>
            <div>
              <p style={{ ...subText, marginBottom: 4 }}>Client Count</p>
              <input
                style={inp}
                type="number"
                placeholder="optional"
                value={form.client_count}
                onChange={e => set('client_count', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <p style={{ ...subText, marginBottom: 4 }}>Notes</p>
            <input
              style={inp}
              type="text"
              placeholder="optional context"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.mrr_usd || saving}
              style={{ flex: 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
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
