import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useForecastCache() {
  const [forecast, setForecast] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'forecast_cache', 'latest'),
      snap => {
        const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
        setForecast(exists ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      err => { console.error('[useForecastCache]', err); setError(err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  return { forecast, loading, error };
}
