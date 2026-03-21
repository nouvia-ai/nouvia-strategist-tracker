/**
 * useOKRs — INT-001 TASK-10 (WS2)
 * Real-time hook for okrs/{year}_Q{quarter} Firestore documents.
 * Each document is a full OKR set for that quarter.
 *
 * Schema (snake_case — ADR-P02):
 *   year        number   — e.g. 2026
 *   quarter     number   — 1 | 2 | 3 | 4
 *   objectives  Array<{
 *     id          string
 *     title       string
 *     key_results Array<{
 *       id        string
 *       title     string
 *       progress  number  — 0–100
 *       unit      string  — e.g. "%" | "clients" | "$k MRR"
 *     }>
 *   }>
 *   updated_at  Timestamp
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, doc, setDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'okrs';

export function useOKRs() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('year', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[useOKRs]', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Upsert a full OKR document — id is "{year}_Q{quarter}"
  const saveOKR = useCallback(async (year, quarter, objectives) => {
    const id = `${year}_Q${quarter}`;
    await setDoc(doc(db, COL, id), {
      year,
      quarter,
      objectives,
      updated_at: serverTimestamp(),
    }, { merge: true });
  }, []);

  // Update progress on a single key result
  const updateKRProgress = useCallback(async (docId, objectiveId, krId, progress) => {
    const snap = items.find(i => i.id === docId);
    if (!snap) return;
    const objectives = snap.objectives.map(obj =>
      obj.id !== objectiveId ? obj : {
        ...obj,
        key_results: obj.key_results.map(kr =>
          kr.id !== krId ? kr : { ...kr, progress }
        ),
      }
    );
    await setDoc(doc(db, COL, docId), { objectives, updated_at: serverTimestamp() }, { merge: true });
  }, [items]);

  return { items, loading, error, saveOKR, updateKRProgress };
}
