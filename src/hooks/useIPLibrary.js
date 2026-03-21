/**
 * useIPLibrary — INT-001 TASK-06 (NCC-006)
 * Real-time onSnapshot hook for ip_library/{auto_id} Firestore collection.
 * Returns { items, loading, error, addItem, updateItem, removeItem }
 *
 * Schema (all snake_case — ADR-P02):
 *   name            string   — e.g. "Nouvia Design Token System"
 *   ncc_id          string   — e.g. "NCC-003"
 *   type            string   — Component | Pattern | Hook | System
 *   status          string   — Candidate | Active | Deprecated | Proposed
 *   reuse_potential string   — High | Medium | Low
 *   description     string
 *   source_project  string   — e.g. "INT-001 Tracker"
 *   sow_reference   string   — e.g. "SOW-IVC-001" (optional)
 *   file_path       string   — e.g. "src/styles/tokens.css" (optional)
 *   notes           string   (optional)
 *   created_at      Timestamp
 *   updated_at      Timestamp
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'ip_library';

export function useIPLibrary() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[useIPLibrary]', err);
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

  return { items, loading, error, addItem, updateItem, removeItem };
}
