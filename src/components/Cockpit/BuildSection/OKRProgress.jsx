/**
 * OKRProgress — INT-002 TASK-14
 * Current quarter OKR cards with status signal (green/amber/red)
 */
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
}

function quarterProgress() {
  const now   = new Date();
  const q     = Math.ceil((now.getMonth() + 1) / 3);
  const start = new Date(now.getFullYear(), (q - 1) * 3, 1);
  const end   = new Date(now.getFullYear(), q * 3, 0);
  return (now - start) / (end - start);
}

function statusColor(objProgress) {
  const elapsed = quarterProgress();
  const diff    = objProgress / 100 - elapsed;
  if (diff >= -0.1) return '#27AE60';
  if (diff >= -0.2) return '#F5A623';
  return '#E74C3C';
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[0,1].map(i => (
        <div key={i} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ height: 14, width: '50%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3, marginBottom: 10 }} />
          <div style={{ height: 8, width: '100%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

export default function OKRProgress({ onNavigate }) {
  const [okr, setOkr]       = useState(null);
  const [loading, setLoading] = useState(true);
  const { year, quarter }   = currentQuarter();

  useEffect(() => {
    const q = query(
      collection(db, 'okrs'),
      where('year', '==', year),
      where('quarter', '==', quarter)
    );
    const unsub = onSnapshot(q, snap => {
      setOkr(snap.docs.length === 0 ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
      setLoading(false);
    });
    return unsub;
  }, [year, quarter]);

  if (loading) return <Skeleton />;

  if (!okr || !(okr.objectives || []).length) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
        No OKRs set for {year} Q{quarter}. Use <code>set_okr</code> in Claude to add them.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {(okr.objectives || []).map(obj => {
        const krs      = obj.key_results || [];
        const avgProg  = krs.length ? Math.round(krs.reduce((s, kr) => s + (kr.progress || 0), 0) / krs.length) : 0;
        const color    = statusColor(avgProg);
        return (
          <div key={obj.id} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: `1px solid var(--color-border-default)`, borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>{obj.title}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-sans)' }}>{avgProg}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${avgProg}%`, backgroundColor: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-ghost)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>
              {krs.length} key result{krs.length !== 1 ? 's' : ''} · Q{quarter} {year}
            </div>
          </div>
        );
      })}
    </div>
  );
}
