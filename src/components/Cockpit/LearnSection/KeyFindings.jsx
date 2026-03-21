/**
 * KeyFindings — INT-002 TASK-17
 * Derived client-side: experiments (Validated/Invalidated, 90d) + trends (30d) + decisions (30d)
 * No new Firestore collection — ADR-02
 */
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

const SOURCE_STYLE = {
  Experiment: { color: '#27AE60', bg: '#F0FFF4' },
  Trend:      { color: '#3182CE', bg: '#EBF4FF' },
  Decision:   { color: '#F5A623', bg: '#FFFBEB' },
};

function isWithin(ts, days) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Date.now() - d.getTime() < days * 86400000;
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ height: 56, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
          <div style={{ height: 11, width: '40%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3, marginBottom: 8 }} />
          <div style={{ height: 11, width: '80%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

export default function KeyFindings() {
  const [findings, setFindings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let loaded = 0;
    let experiments = [], trends = [], decisions = [];

    const check = () => {
      if (++loaded < 3) return;
      const results = [
        ...experiments
          .filter(e => ['Validated','Invalidated'].includes(e.status) && isWithin(e.updated_at, 90))
          .map(e => ({ text: e.hypothesis, source: 'Experiment', status: e.status, date: e.updated_at })),
        ...trends
          .filter(t => isWithin(t.created_at, 30))
          .map(t => ({ text: t.observation || t.title || t.description, source: 'Trend', date: t.created_at })),
        ...decisions
          .filter(d => isWithin(d.created_at, 30))
          .map(d => ({ text: d.decision || d.title || d.description, source: 'Decision', date: d.created_at })),
      ].sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const db_ = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return db_ - da;
      }).slice(0, 5);
      setFindings(results);
      setLoading(false);
    };

    const u1 = onSnapshot(collection(db, 'experiments'), snap => { experiments = snap.docs.map(d => ({ id: d.id, ...d.data() })); check(); });
    const u2 = onSnapshot(collection(db, 'trends'),      snap => { trends      = snap.docs.map(d => ({ id: d.id, ...d.data() })); check(); });
    const u3 = onSnapshot(collection(db, 'decisions'),   snap => { decisions   = snap.docs.map(d => ({ id: d.id, ...d.data() })); check(); });
    return () => { u1(); u2(); u3(); };
  }, []);

  if (loading) return <Skeleton />;

  if (findings.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
        No recent findings. Validate an experiment or log a trend to see insights here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {findings.map((f, i) => {
        const ss  = SOURCE_STYLE[f.source] || SOURCE_STYLE.Decision;
        const dt  = f.date?.toDate ? f.date.toDate() : f.date ? new Date(f.date) : null;
        const dtStr = dt ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        return (
          <div key={i} style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: ss.color, backgroundColor: ss.bg, padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--font-sans)' }}>
                {f.source}{f.status ? ` · ${f.status}` : ''}
              </span>
              {dtStr && <span style={{ fontSize: 11, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>{dtStr}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {f.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
