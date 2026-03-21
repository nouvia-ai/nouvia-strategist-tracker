/**
 * ExperimentSummary — INT-002 TASK-18
 * Top 3 active experiments + Testing Progress Funnel
 */
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

const FUNNEL_STAGES = ['Hypothesis', 'Testing', 'Validated', 'Invalidated'];
const STAGE_COLORS  = { Hypothesis: '#718096', Testing: '#F5A623', Validated: '#27AE60', Invalidated: '#E74C3C' };

const STATUS_STYLE = {
  Hypothesis: { bg: '#F7FAFC', color: '#718096' },
  Testing:    { bg: '#FFFBEB', color: '#F5A623' },
  Validated:  { bg: '#F0FFF4', color: '#27AE60' },
  Invalidated:{ bg: '#FFF5F5', color: '#E74C3C' },
  Pivoted:    { bg: '#FAF5FF', color: '#805AD5' },
};

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ height: 60, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
          <div style={{ height: 11, width: '80%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3, marginBottom: 8 }} />
          <div style={{ height: 11, width: '30%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function ExperimentSummary({ onNavigate }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'experiments'), orderBy('created_at', 'desc')),
      snap => { setExperiments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error('[ExperimentSummary]', err); setLoading(false); }
    );
    return unsub;
  }, []);

  if (loading) return <Skeleton />;

  const active = experiments.filter(e => ['Hypothesis', 'Testing'].includes(e.status)).slice(0, 3);
  const counts = FUNNEL_STAGES.reduce((acc, s) => { acc[s] = experiments.filter(e => e.status === s).length; return acc; }, {});
  const total  = experiments.length;

  return (
    <div>
      {/* Active experiments */}
      {active.length === 0 ? (
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
          No active experiments.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {active.map(e => {
            const ss = STATUS_STYLE[e.status] || STATUS_STYLE.Hypothesis;
            const dt = e.created_at?.toDate ? e.created_at.toDate() : null;
            return (
              <div key={e.id} style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                  {e.hypothesis}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ss.color, backgroundColor: ss.bg, padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--font-sans)' }}>{e.status}</span>
                  {dt && <span style={{ fontSize: 11, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>{dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </div>
              </div>
            );
          })}
          {experiments.filter(e => ['Hypothesis','Testing'].includes(e.status)).length > 3 && (
            <button onClick={onNavigate} style={{ fontSize: 12, color: 'var(--color-text-ghost)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', padding: 0 }}>
              View all →
            </button>
          )}
        </div>
      )}

      {/* Testing funnel */}
      {total > 0 && (
        <div style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Testing Funnel</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {FUNNEL_STAGES.map((stage, i) => (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <span style={{ color: 'var(--color-border-default)', fontSize: 14 }}>›</span>}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: STAGE_COLORS[stage], fontFamily: 'var(--font-sans)' }}>{counts[stage]}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>{stage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
