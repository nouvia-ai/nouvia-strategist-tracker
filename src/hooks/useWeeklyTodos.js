import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

function currentMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function useWeeklyTodos(weekStart) {
  const ws = weekStart || currentMonday();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'weekly_todos'),
      where('week_start', '==', ws),
      orderBy('order', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error('[useWeeklyTodos]', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [ws]);

  const toggleComplete = useCallback(async (id, completed) => {
    await updateDoc(doc(db, 'weekly_todos', id), { completed: !completed });
  }, []);

  return { items, loading, error, toggleComplete, weekStart: ws };
}

export { currentMonday };
