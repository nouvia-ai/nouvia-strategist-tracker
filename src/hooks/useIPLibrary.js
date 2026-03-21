/**
 * useIPLibrary — INT-001 FIX-1
 * Reads from users/{uid}/data/strategist:core_components (getData/setData pattern)
 * to stay in sync with the Nouvia Strategist MCP server which writes camelCase fields.
 *
 * Field mapping (MCP camelCase → UI snake_case for display):
 *   nccId            → ncc_id
 *   reusePotential   → reuse_potential
 *   firstClient      → source_project
 *   atlasSowLanguage → sow_reference
 *   driveUrl         → file_path
 *   createdAt        → created_at
 *   name, description, status, type, notes — pass through
 *
 * Returns { items, loading, error, addItem, updateItem, removeItem, refresh }
 */

import { useState, useEffect, useCallback } from 'react';
import { getData, setData } from '../storage';

const KEY = 'strategist:core_components';

/** Normalize a raw MCP camelCase item → UI snake_case display shape. */
function normalize(raw) {
  const id = raw.id || raw.nccId || raw.ncc_id || `ncc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    ncc_id:          raw.nccId          || raw.ncc_id          || '',
    name:            raw.name           || '',
    description:     raw.description    || '',
    type:            raw.type           || '',
    status:          raw.status         || '',
    reuse_potential: raw.reusePotential || raw.reuse_potential || '',
    source_project:  raw.firstClient    || raw.source_project  || '',
    sow_reference:   raw.atlasSowLanguage || raw.sow_reference || '',
    file_path:       raw.driveUrl       || raw.file_path       || '',
    notes:           raw.notes          || '',
    created_at:      raw.createdAt      || raw.created_at      || null,
    // Preserve MCP-only fields so round-trip doesn't lose them
    version:         raw.version        || '',
    targetVerticals: raw.targetVerticals || '',
    licensingModel:  raw.licensingModel  || '',
  };
}

/** Convert UI display item back to MCP camelCase for storage. */
function toRaw(display) {
  return {
    id:               display.id,
    nccId:            display.ncc_id        || '',
    name:             display.name          || '',
    description:      display.description   || '',
    type:             display.type          || '',
    status:           display.status        || '',
    reusePotential:   display.reuse_potential || '',
    firstClient:      display.source_project || '',
    atlasSowLanguage: display.sow_reference  || '',
    driveUrl:         display.file_path      || '',
    notes:            display.notes          || '',
    createdAt:        display.created_at     || new Date().toISOString(),
    version:          display.version        || '',
    targetVerticals:  display.targetVerticals || '',
    licensingModel:   display.licensingModel  || '',
  };
}

export function useIPLibrary() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      const raw = await getData(KEY);
      const arr = Array.isArray(raw) ? raw : [];
      setItems(arr.map(normalize));
      setError(null);
    } catch (err) {
      console.error('[useIPLibrary]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Persist a new display-shape item to the storage array. */
  const addItem = useCallback(async (displayData) => {
    const id = displayData.id || displayData.ncc_id || `ui-${Date.now()}`;
    const raw = toRaw({ ...displayData, id, created_at: displayData.created_at || new Date().toISOString() });
    const current = await getData(KEY);
    const arr = Array.isArray(current) ? current : [];
    await setData(KEY, [...arr, raw]);
    await load();
  }, [load]);

  /** Update an existing item by id. */
  const updateItem = useCallback(async (id, displayData) => {
    const current = await getData(KEY);
    const arr = Array.isArray(current) ? current : [];
    const updated = arr.map(item => {
      const itemId = item.id || item.nccId || item.ncc_id;
      if (itemId !== id) return item;
      return { ...item, ...toRaw({ ...normalize(item), ...displayData, id }) };
    });
    await setData(KEY, updated);
    await load();
  }, [load]);

  /** Remove an item by id. */
  const removeItem = useCallback(async (id) => {
    const current = await getData(KEY);
    const arr = Array.isArray(current) ? current : [];
    const filtered = arr.filter(item => {
      const itemId = item.id || item.nccId || item.ncc_id;
      return itemId !== id;
    });
    await setData(KEY, filtered);
    await load();
  }, [load]);

  return { items, loading, error, addItem, updateItem, removeItem, refresh: load };
}
