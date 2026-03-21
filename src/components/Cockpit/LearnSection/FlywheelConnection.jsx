/**
 * FlywheelConnection — INT-002 TASK-19
 * Callout card when experiment validated/invalidated in last 7 days.
 * Accept → add_priority_item (via Firestore direct write)
 * Dismiss → localStorage
 */
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useExperiments } from '../../../hooks/useExperiments';

const DISMISSED_KEY = 'cockpit:flywheel:dismissed';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}
function addDismissed(id) {
  const list = getDismissed();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...list, id])]));
}

export default function FlywheelConnection() {
  const { items: experiments } = useExperiments();
  const [candidate, setCandidate] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted,  setAccepted]  = useState(false);

  useEffect(() => {
    const dismissed_ids = getDismissed();
    const cutoff        = Date.now() - 7 * 86400000;
    const recent = experiments
      .filter(e => {
        if (!['Validated','Invalidated'].includes(e.status)) return false;
        if (dismissed_ids.includes(e.id)) return false;
        const updated = e.updated_at?.toDate ? e.updated_at.toDate() : new Date(e.updated_at || 0);
        return updated.getTime() >= cutoff;
      })
      .sort((a, b) => {
        const da = a.updated_at?.toDate ? a.updated_at.toDate() : new Date(0);
        const db_ = b.updated_at?.toDate ? b.updated_at.toDate() : new Date(0);
        return db_ - da;
      });
    setCandidate(recent[0] || null);
  }, [experiments]);

  if (!candidate || dismissed || accepted) return null;

  const isValidated = candidate.status === 'Validated';
  const action      = isValidated
    ? `Add to BUILD priorities: ${candidate.hypothesis?.slice(0, 60)}${candidate.hypothesis?.length > 60 ? '…' : ''}`
    : `Design pivot experiment for: ${candidate.hypothesis?.slice(0, 60)}${candidate.hypothesis?.length > 60 ? '…' : ''}`;
  const color = isValidated ? '#27AE60' : '#E74C3C';

  const handleAccept = async () => {
    if (!isValidated) return; // open experiment creation — no-op for now
    setAccepting(true);
    try {
      await addDoc(collection(db, 'priority_queue'), {
        title:      `[From Experiment] ${candidate.hypothesis?.slice(0, 80)}`,
        priority:   2,
        status:     'Open',
        context:    `Experiment validated on ${new Date().toLocaleDateString()}`,
        due_date:   '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      setAccepted(true);
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = () => {
    addDismissed(candidate.id);
    setDismissed(true);
  };

  return (
    <div style={{
      padding:         'var(--space-4)',
      backgroundColor: 'var(--color-bg-elevated)',
      border:          `1px solid ${color}40`,
      borderLeft:      `3px solid ${color}`,
      borderRadius:    'var(--radius-lg)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
        🔄 Flywheel Signal
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
        New finding: <em>"{candidate.hypothesis?.slice(0, 80)}{candidate.hypothesis?.length > 80 ? '…' : ''}"</em> was <strong style={{ color }}>{candidate.status.toLowerCase()}</strong>.
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        Suggested action: {action}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {isValidated && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{ minHeight: 44, padding: '0 16px', backgroundColor: color, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: accepting ? 0.7 : 1 }}
          >
            {accepting ? 'Adding…' : '+ Add to Priorities'}
          </button>
        )}
        <button
          onClick={handleDismiss}
          style={{ minHeight: 44, padding: '0 16px', backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
