import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useGoals({ type, status } = {}) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let q = query(collection(db, 'goals'), orderBy('order', 'asc'));
    if (type)   q = query(collection(db, 'goals'), where('type',   '==', type),   orderBy('order', 'asc'));
    if (status) q = query(collection(db, 'goals'), where('status', '==', status), orderBy('order', 'asc'));
    if (type && status) {
      q = query(collection(db, 'goals'), where('type', '==', type), where('status', '==', status), orderBy('order', 'asc'));
    }
    const unsub = onSnapshot(
      q,
      snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error('[useGoals]', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [type, status]);

  return { items, loading, error };
}

export function useActiveGoals() {
  return useGoals({ status: 'Active' });
}

export function useNorthStarGoals() {
  return useGoals({ type: 'North Star', status: 'Active' });
}
