/**
 * intelligenceService.js — Intelligence Layer knowledge management
 * Reads/writes intelligence_foundations (L1), intelligence_rules (L2),
 * intelligence_patterns (L3), intelligence_inject_queue
 */
import { db } from '../firebase';
import {
  collection, doc, getDocs, addDoc, updateDoc,
  onSnapshot, query, orderBy, where,
  getDoc, serverTimestamp, increment
} from 'firebase/firestore';

// ── CLUSTER DEFINITIONS ───────────────────────────────────
export const CLUSTERS = {
  1:  { name: 'Human behavior',      layer: 1, target: 20 },
  2:  { name: 'Revenue models',      layer: 1, target: 18 },
  3:  { name: 'Validation',          layer: 1, target: 15 },
  4:  { name: 'UX design',           layer: 1, target: 20 },
  5:  { name: 'Momentum',            layer: 1, target: 12 },
  6:  { name: 'Client selling',      layer: 1, target: 16 },
  7:  { name: 'Data strategy',       layer: 1, target: 14 },
  8:  { name: 'SCOR manufacturing',  layer: 1, target: 40 },
  21: { name: 'Hook design',         layer: 2, target: 8  },
  22: { name: 'UX constraints',      layer: 2, target: 7  },
  23: { name: 'Discovery method',    layer: 2, target: 6  },
  24: { name: 'Pricing behavior',    layer: 2, target: 6  },
  25: { name: 'Retention mechanics', layer: 2, target: 5  },
  26: { name: 'Data governance',     layer: 2, target: 5  },
  31: { name: 'IVC patterns',        layer: 3, target: 30 },
  32: { name: 'Hockey Prospect',     layer: 3, target: 10 },
};

export function getCollectionForCluster(cluster) {
  const def = CLUSTERS[cluster];
  if (!def) return 'intelligence_foundations';
  if (def.layer === 1) return 'intelligence_foundations';
  if (def.layer === 2) return 'intelligence_rules';
  if (def.layer === 3) return 'intelligence_patterns';
  return 'intelligence_foundations';
}

// ── READ FUNCTIONS ────────────────────────────────────────
export async function getDocsByCluster(cluster) {
  const col = getCollectionForCluster(cluster);
  const snap = await getDocs(query(
    collection(db, col),
    where('cluster', '==', cluster)
  ));
  return snap.docs.map(d => ({ id: d.id, _col: col, ...d.data() }))
    .filter(d => d.status !== 'archived')
    .sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
}

export async function getAllDocsForMap() {
  const results = {};
  Object.entries(CLUSTERS).forEach(([k, v]) => {
    results[k] = { ...v, cluster: parseInt(k), count: 0, use_total: 0, stale_count: 0 };
  });
  const collections = ['intelligence_foundations', 'intelligence_rules', 'intelligence_patterns'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'archived') return;
        const c = data.cluster;
        if (results[c]) {
          results[c].count++;
          results[c].use_total += (data.use_count || 0);
          if (data.use_count === 0) results[c].stale_count++;
        }
      });
    } catch (e) { console.warn(`Intelligence: ${col} read failed`, e.message); }
  }
  return Object.values(results);
}

export async function searchDocs(searchQuery, layerFilter) {
  const cols = [];
  if (!layerFilter || layerFilter === 1) cols.push('intelligence_foundations');
  if (!layerFilter || layerFilter === 2) cols.push('intelligence_rules');
  if (!layerFilter || layerFilter === 3) cols.push('intelligence_patterns');
  const all = [];
  for (const col of cols) {
    try {
      const snap = await getDocs(collection(db, col));
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'archived') return;
        const q = (searchQuery || '').toLowerCase();
        if (!q || data.title?.toLowerCase().includes(q) || data.content?.toLowerCase().includes(q) || data.cluster_name?.toLowerCase().includes(q)) {
          all.push({ id: d.id, _col: col, ...data });
        }
      });
    } catch (e) { console.warn(`Intelligence search: ${col} failed`, e.message); }
  }
  return all.sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
}

// ── GAP DETECTION ─────────────────────────────────────────
export async function computeGaps() {
  const clusterMap = await getAllDocsForMap();
  const gaps = [];
  clusterMap.forEach(cluster => {
    const fillPct = cluster.target > 0 ? cluster.count / cluster.target : 0;
    if (cluster.count === 0) {
      gaps.push({ type: 'critical', cluster: cluster.cluster, cluster_name: cluster.name, layer: cluster.layer,
        message: `${cluster.name} — 0 documents`, detail: `This cluster has no documents.`, action: 'inject', count: 0 });
    } else if (fillPct < 0.4) {
      gaps.push({ type: 'high', cluster: cluster.cluster, cluster_name: cluster.name, layer: cluster.layer,
        message: `${cluster.name} — thin coverage (${cluster.count}/${cluster.target} docs)`, detail: `Under-represented cluster.`, action: 'inject', count: cluster.count });
    }
    if (cluster.stale_count > 0 && cluster.count > 0) {
      gaps.push({ type: 'stale', cluster: cluster.cluster, cluster_name: cluster.name, layer: cluster.layer,
        message: `${cluster.stale_count} stale in ${cluster.name}`, detail: `Documents with 0 uses.`, action: 'review', count: cluster.stale_count });
    }
  });
  return gaps.sort((a, b) => ({ critical: 0, high: 1, stale: 2 }[a.type] || 3) - ({ critical: 0, high: 1, stale: 2 }[b.type] || 3));
}

export async function getStaleDocuments() {
  const all = [];
  for (const col of ['intelligence_foundations', 'intelligence_rules', 'intelligence_patterns']) {
    try {
      const snap = await getDocs(collection(db, col));
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status !== 'active') return;
        if (data.use_count === 0) all.push({ id: d.id, _col: col, ...data, daysSinceUse: null });
      });
    } catch (e) {}
  }
  return all;
}

export async function getPromotionCandidates() {
  try {
    const snap = await getDocs(collection(db, 'intelligence_patterns'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.status === 'active' && (d.confidence || 0) >= 0.8 && !d.promoted_to_l2);
  } catch (e) { return []; }
}

// ── WRITE FUNCTIONS ───────────────────────────────────────
export async function updateDoc_intelligence(col, id, updates) {
  await updateDoc(doc(db, col, id), { ...updates, updated_at: serverTimestamp() });
}

export async function archiveDocument(col, id) {
  await updateDoc(doc(db, col, id), { status: 'archived', updated_at: serverTimestamp() });
}

export async function incrementUseCount(col, id) {
  await updateDoc(doc(db, col, id), { use_count: increment(1), last_used_at: serverTimestamp() });
}

export async function promoteToLayer2(patternId, ruleText) {
  await addDoc(collection(db, 'intelligence_rules'), {
    layer: 2, cluster: 23, cluster_name: 'Promoted from Layer 3', domain: 'client_patterns',
    title: ruleText.substring(0, 80), content: ruleText, source: 'Promoted from client pattern',
    coworkers: ['Blueprint', 'Compass', 'Strategist'], use_count: 0, last_used_at: null,
    created_at: serverTimestamp(), updated_at: serverTimestamp(), version: 'v1.0', status: 'active',
    rule_number: null, promoted_from_pattern: patternId,
  });
  await updateDoc(doc(db, 'intelligence_patterns', patternId), { promoted_to_l2: true, updated_at: serverTimestamp() });
}

// ── INJECT QUEUE ──────────────────────────────────────────
export async function addToInjectQueue(item) {
  return await addDoc(collection(db, 'intelligence_inject_queue'), { ...item, status: 'pending', created_at: serverTimestamp() });
}

export async function getInjectQueue() {
  try {
    const snap = await getDocs(collection(db, 'intelligence_inject_queue'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.status === 'pending');
  } catch (e) { return []; }
}

export async function approveInjection(queueId, documents) {
  const col = documents[0]?.layer === 1 ? 'intelligence_foundations' : documents[0]?.layer === 2 ? 'intelligence_rules' : 'intelligence_patterns';
  for (const docData of documents) {
    await addDoc(collection(db, col), {
      ...docData, use_count: 0, last_used_at: null, created_at: serverTimestamp(), updated_at: serverTimestamp(), status: 'active',
    });
  }
  await updateDoc(doc(db, 'intelligence_inject_queue', queueId), { status: 'approved', approved_at: serverTimestamp() });
}
