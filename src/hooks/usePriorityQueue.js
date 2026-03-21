/**
 * usePriorityQueue — INT-001 TASK-10 (WS2)
 * Real-time hook for priority_queue/{auto_id} Firestore collection.
 *
 * Schema (snake_case — ADR-P02):
 *   title       string   — what needs doing
 *   priority    number   — 1 (highest) – 5 (lowest)
 *   status      string   — "Open" | "In Progress" | "Done" | "Blocked"
 *   context     string   — why this matters now
 *   due_date    string?  — ISO date string (optional)
 *   owner_id    string?  — reserved for future multi-user (ADR-P02)
 *   created_at  Timestamp
 *   updated_at  Timestamp
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'priority_queue';

export function usePriorityQueue() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('priority', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[usePriorityQueue]', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addItem = useCallback(async (data) => {
    await addDoc(collection(db, COL), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }, []);

  const updateItem = useCallback(async (id, data) => {
    await updateDoc(doc(db, COL, id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  }, []);

  const removeItem = useCallback(async (id) => {
    await deleteDoc(doc(db, COL, id));
  }, []);

  // Derived: open + in-progress items sorted by priority
  const activeItems = items.filter(i => i.status !== 'Done');
  const blockedItems = items.filter(i => i.status === 'Blocked');

  return { items, activeItems, blockedItems, loading, error, addItem, updateItem, removeItem };
}
