import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useClientBacklog() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'client_backlog'), orderBy('priority', 'asc'));
    const unsub = onSnapshot(
      q,
      snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error('[useClientBacklog]', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { items, loading, error };
}
