/**
 * BacklogPipeline — INT-002 TASK-13
 * Compact horizontal pipeline bar: Queued → In Progress → Delivered → Invoiced
 */
import { useClientBacklog } from '../../../hooks/useClientBacklog';

const SEGMENTS = [
  { key: 'Queued',      label: 'Queued',      color: '#718096' },
  { key: 'In Progress', label: 'In Progress', color: '#F5A623' },
  { key: 'Delivered',   label: 'Delivered',   color: '#27AE60' },
  { key: 'Invoiced',    label: 'Invoiced',    color: '#3182CE' },
];

const fmt = (n) => n >= 1000 ? `$${Math.round(n/1000)}k` : `$${Math.round(n)}`;

function Skeleton() {
  return (
    <div style={{ height: 48, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: '0 var(--space-4)', display: 'flex', alignItems: 'center' }}>
      <div style={{ height: 12, width: '100%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 6 }} />
    </div>
  );
}

export default function BacklogPipeline() {
  const { items, loading } = useClientBacklog();

  if (loading) return <Skeleton />;

  if (items.length === 0) {
    return (
      <div style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
        No backlog items yet
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
      {SEGMENTS.map((seg, i) => {
        const segItems = items.filter(it => it.status === seg.key);
        const val = segItems.reduce((s, it) => s + (it.estimated_value_usd || it.actual_value_usd || 0), 0);
        return (
          <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            {i > 0 && <span style={{ color: 'var(--color-border-default)', fontSize: 16 }}>›</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: seg.color, flexShrink: 0 }} />
              <div style={{ fontFamily: 'var(--font-sans)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{seg.label}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-ghost)', marginLeft: 4 }}>
                  {segItems.length} {val > 0 ? `· ${fmt(val)}` : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
        {items.length} total
      </div>
    </div>
  );
}
