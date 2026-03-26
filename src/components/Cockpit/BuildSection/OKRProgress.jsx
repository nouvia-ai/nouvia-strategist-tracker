/**
 * OKRProgress — INT-002 TASK-14
 * Current quarter OKR cards with status signal (green/amber/red)
 */
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

function quarterProgress(year, quarter) {
  const now   = new Date();
  const start = new Date(year, (quarter - 1) * 3, 1);
  const end   = new Date(year, quarter * 3, 0);
  // If OKR is for a future quarter, treat as 0% elapsed
  if (now < start) return 0;
  // If OKR is for a past quarter, treat as 100% elapsed
  if (now > end)   return 1;
  return (now - start) / (end - start);
}

function statusColor(objProgress, year, quarter) {
  const elapsed = quarterProgress(year, quarter);
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
  const [okr, setOkr]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show the latest OKR by year+quarter (not hardcoded to current quarter)
    const q = query(
      collection(db, 'okrs'),
      orderBy('year', 'desc'),
      orderBy('quarter', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, snap => {
      setOkr(snap.docs.length === 0 ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
      setLoading(false);
    }, err => { console.error('[OKRProgress]', err); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <Skeleton />;

  // objectives may be stored as JSON string by MCP set_okr tool
  let objectives = okr?.objectives || [];
  if (typeof objectives === 'string') {
    try { objectives = JSON.parse(objectives); } catch { objectives = []; }
  }
  if (!Array.isArray(objectives)) objectives = [];

  if (!okr || !objectives.length) {
    return (
      <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)' }}>
        No OKRs found. Use <code>set_okr</code> in Claude to add them.
      </div>
    );
  }

  const { year: okrYear, quarter: okrQuarter } = okr;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {objectives.map(obj => {
        const krs      = obj.key_results || [];
        const avgProg  = krs.length ? Math.round(krs.reduce((s, kr) => s + (kr.progress || 0), 0) / krs.length) : 0;
        const color    = statusColor(avgProg, okrYear, okrQuarter);
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
              {krs.length} key result{krs.length !== 1 ? 's' : ''} · Q{okrQuarter} {okrYear}
            </div>
          </div>
        );
      })}
    </div>
  );
}
