/**
 * useMRR — INT-001 TASK-10 (WS2)
 * Real-time hook for mrr_entries/{YYYY_MM} Firestore documents.
 *
 * Schema (snake_case — ADR-P02):
 *   year        number   — e.g. 2026
 *   month       number   — 1–12
 *   mrr_usd     number   — total MRR in USD
 *   client_count number  — active paying clients
 *   notes       string   — optional context
 *   updated_at  Timestamp
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, doc, setDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'mrr_entries';

export function useMRR() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('year', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) =>
          b.year !== a.year ? b.year - a.year : b.month - a.month
        ));
        setLoading(false);
      },
      (err) => {
        console.error('[useMRR]', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Upsert a monthly MRR entry — id is "YYYY_MM"
  const saveEntry = useCallback(async (year, month, data) => {
    const id = `${year}_${String(month).padStart(2, '0')}`;
    await setDoc(doc(db, COL, id), {
      year,
      month,
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true });
  }, []);

  // Derived: current MRR (most recent entry)
  const currentMRR = entries.length > 0 ? entries[0].mrr_usd ?? 0 : 0;

  // Derived: MoM growth %
  const momGrowth = entries.length >= 2
    ? entries[1].mrr_usd > 0
      ? ((entries[0].mrr_usd - entries[1].mrr_usd) / entries[1].mrr_usd) * 100
      : null
    : null;

  return { entries, loading, error, saveEntry, currentMRR, momGrowth };
}
