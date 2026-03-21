/**
 * useExperiments — INT-002 FIX-3
 * Reads from users/{uid}/data/strategist:experiments (getData/setData pattern)
 * to match the Nouvia Strategist MCP which stores experiments as a JSON blob.
 */
import { useState, useEffect, useCallback } from 'react';
import { getData } from '../storage';

const KEY = 'strategist:experiments';

export function useExperiments() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      const raw = await getData(KEY);
      setItems(Array.isArray(raw) ? raw : []);
      setError(null);
    } catch (err) {
      console.error('[useExperiments]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, refresh: load };
}
