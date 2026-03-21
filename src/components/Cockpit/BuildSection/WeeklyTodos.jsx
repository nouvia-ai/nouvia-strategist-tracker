/**
 * WeeklyTodos — INT-002 TASK-16
 * Checkbox list for current week. Only mutable element on cockpit surface.
 */
import { useWeeklyTodos } from '../../../hooks/useWeeklyTodos';

const SOURCE_COLORS = {
  priority: { bg: '#EBF4FF', color: '#3182CE', label: 'priority' },
  okr:      { bg: '#F0FFF4', color: '#27AE60', label: 'okr'      },
  manual:   { bg: 'var(--color-bg-overlay)', color: 'var(--color-text-ghost)', label: 'manual' },
};

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: 'var(--color-bg-overlay)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 12, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function WeeklyTodos() {
  const { items, loading, error, toggleComplete, weekStart } = useWeeklyTodos();

  if (loading) return <Skeleton />;

  if (error) return (
    <div style={{ fontSize: 13, color: '#E74C3C', fontFamily: 'var(--font-sans)' }}>Unable to load todos. Retry.</div>
  );

  const visible = items.slice(0, 7);

  if (visible.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
        No todos this week.<br/>Add via Claude: <code>add_weekly_todo</code>
      </div>
    );
  }

  const done    = visible.filter(t => t.completed).length;
  const pct     = Math.round((done / visible.length) * 100);

  return (
    <div>
      {/* Week header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
          Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? '#27AE60' : 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {done}/{visible.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#27AE60', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>

      {/* Todo list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(todo => {
          const sc = SOURCE_COLORS[todo.source_type] || SOURCE_COLORS.manual;
          return (
            <label
              key={todo.id}
              style={{
                display:         'flex',
                alignItems:      'center',
                gap:             12,
                minHeight:       48,
                cursor:          'pointer',
                padding:         '0 var(--space-2)',
                borderRadius:    'var(--radius-md)',
                backgroundColor: 'transparent',
                transition:      'background-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Checkbox — 48px touch target via label + padding */}
              <div
                onClick={(e) => { e.preventDefault(); toggleComplete(todo.id, todo.completed); }}
                style={{
                  width: 22, height: 22, borderRadius: 4,
                  border: `2px solid ${todo.completed ? '#27AE60' : 'var(--color-border-default)'}`,
                  backgroundColor: todo.completed ? '#27AE60' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {todo.completed && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{
                flex:           1,
                fontSize:       14,
                color:          todo.completed ? 'var(--color-text-ghost)' : 'var(--color-text-primary)',
                fontFamily:     'var(--font-sans)',
                textDecoration: todo.completed ? 'line-through' : 'none',
                overflow:       'hidden',
                textOverflow:   'ellipsis',
                whiteSpace:     'nowrap',
              }}>
                {todo.title}
              </span>
              {todo.source_type !== 'manual' && (
                <span style={{ fontSize: 10, fontWeight: 600, color: sc.color, backgroundColor: sc.bg, padding: '2px 6px', borderRadius: 8, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
                  {sc.label}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
