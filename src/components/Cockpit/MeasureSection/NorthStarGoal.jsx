/**
 * NorthStarGoal — INT-002 TASK-11
 * Reads goals collection (type=North Star, status=Active)
 * Answers: "Are we on track?" — primary goal signal
 */
import { useNorthStarGoals } from '../../../hooks/useGoals';

const STATUS_COLOR = {
  Active:   '#27AE60',
  'At Risk': '#F5A623',
  Achieved: '#27AE60',
  Abandoned: '#888',
};

function Skeleton() {
  return (
    <div style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ height: 28, width: '60%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 8, width: '100%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4 }} />
    </div>
  );
}

function GoalCard({ goal, primary }) {
  const pct = goal.target_value && goal.current_value != null
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : null;

  const deadlineDate = goal.deadline?.toDate ? goal.deadline.toDate() : goal.deadline ? new Date(goal.deadline) : null;
  const deadlineStr  = deadlineDate ? deadlineDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
  const color        = STATUS_COLOR[goal.status] || '#888';

  return (
    <div style={{
      padding:         primary ? 'var(--space-6)' : 'var(--space-4)',
      backgroundColor: 'var(--color-bg-elevated)',
      border:          `1px solid ${primary ? color + '40' : 'var(--color-border-default)'}`,
      borderLeft:      `3px solid ${color}`,
      borderRadius:    'var(--radius-lg)',
      marginBottom:    'var(--space-3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: primary ? 24 : 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, fontFamily: 'var(--font-sans)' }}>
            {goal.title}
          </div>
          {goal.target_value != null && (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>
              {goal.current_value ?? 0}{goal.target_unit || ''} of {goal.target_value}{goal.target_unit || ''} target
              {deadlineStr && <span style={{ marginLeft: 8, color: 'var(--color-text-ghost)' }}>· by {deadlineStr}</span>}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color, backgroundColor: color + '18', padding: '3px 10px', borderRadius: 20, marginLeft: 12, whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}>
          {goal.status}
        </div>
      </div>
      {pct !== null && (
        <div>
          <div style={{ height: primary ? 8 : 6, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4, overflow: 'hidden', marginTop: 'var(--space-2)' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-ghost)', marginTop: 4, textAlign: 'right', fontFamily: 'var(--font-sans)' }}>{pct}%</div>
        </div>
      )}
    </div>
  );
}

export default function NorthStarGoal({ onAddGoal }) {
  const { items, loading, error } = useNorthStarGoals();

  if (loading) return <Skeleton />;

  if (error) return (
    <div style={{ padding: 'var(--space-4)', color: '#E74C3C', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
      Unable to load goals. Retry.
    </div>
  );

  if (items.length === 0) return (
    <div style={{
      padding:         'var(--space-6)',
      backgroundColor: 'var(--color-bg-elevated)',
      border:          '1px dashed var(--color-border-default)',
      borderRadius:    'var(--radius-lg)',
      textAlign:       'center',
    }}>
      <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>◎</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-muted)', margin: 0, fontFamily: 'var(--font-sans)' }}>Set your North Star</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-ghost)', margin: '4px 0 16px', fontFamily: 'var(--font-sans)' }}>Define where Nouvia is headed</p>
      <button
        onClick={onAddGoal}
        style={{ minHeight: 44, padding: '0 24px', backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
      >
        + Add Goal
      </button>
    </div>
  );

  return (
    <div>
      {items.map((g, i) => <GoalCard key={g.id} goal={g} primary={i === 0} />)}
    </div>
  );
}
