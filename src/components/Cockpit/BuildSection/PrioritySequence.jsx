/**
 * PrioritySequence — INT-002 TASK-15
 * Top 5 priority items: number badge, title, status, due date
 */
import { usePriorityQueue } from '../../../hooks/usePriorityQueue';

const STATUS_STYLES = {
  Open:        { bg: '#EBF4FF', color: '#3182CE' },
  'In Progress':{ bg: '#FFFBEB', color: '#F5A623' },
  Blocked:     { bg: '#FFF5F5', color: '#E74C3C' },
  Done:        { bg: '#F0FFF4', color: '#27AE60' },
};

function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date(new Date().toDateString());
}

function isRecentlyDone(item) {
  if (item.status !== 'Done') return false;
  if (!item.updated_at) return true;
  const updated = item.updated_at.toDate ? item.updated_at.toDate() : new Date(item.updated_at);
  return Date.now() - updated.getTime() < 48 * 3600 * 1000;
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ height: 48, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '0 var(--space-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-bg-overlay)' }} />
          <div style={{ flex: 1, height: 12, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function PrioritySequence({ onNavigate }) {
  const { items, loading, error } = usePriorityQueue();

  if (loading) return <Skeleton />;

  if (error) return (
    <div style={{ padding: 'var(--space-4)', color: '#E74C3C', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
      Unable to load priority queue. Retry.
    </div>
  );

  const visible = items
    .filter(i => i.status !== 'Done' || isRecentlyDone(i))
    .slice(0, 5);

  if (visible.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
        No priority items. Add via Claude: <code>add_priority_item</code>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {visible.map((item, idx) => {
        const ss       = STATUS_STYLES[item.status] || STATUS_STYLES.Open;
        const overdue  = isOverdue(item.due_date);
        return (
          <div key={item.id} style={{
            minHeight:       48,
            display:         'flex',
            alignItems:      'center',
            gap:             'var(--space-3)',
            padding:         '0 var(--space-3)',
            backgroundColor: 'var(--color-bg-elevated)',
            border:          '1px solid var(--color-border-default)',
            borderRadius:    'var(--radius-md)',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--color-bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
              P{item.priority}
            </div>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title}
            </span>
            {item.due_date && (
              <span style={{ fontSize: 11, color: overdue ? '#E74C3C' : 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
                {overdue ? '⚠ ' : ''}{new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: ss.color, backgroundColor: ss.bg, padding: '2px 8px', borderRadius: 10, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
