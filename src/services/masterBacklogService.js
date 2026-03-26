/**
 * masterBacklogService.js — Master Backlog octopus head
 * Reads from 7 source collections, normalises items,
 * writes back to source collections on status change.
 */
import { db } from '../firebase';
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, where,
  getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { subscribeToBacklog, updateIVCBacklogItem } from './dsiService';
import { computeGaps, getStaleDocuments, getPromotionCandidates, getInjectQueue } from './intelligenceService';

// ── NORMALISATION HELPERS ─────────────────────────────────
function ivcStageToMBStatus(stage) {
  if (['in_progress'].includes(stage)) return 'this_week';
  if (['approved'].includes(stage)) return 'next_week';
  if (['done', 'managed'].includes(stage)) return 'done';
  return 'backlog';
}
function priorityStatusToMBStatus(status) {
  if (status === 'In Progress') return 'this_week';
  if (status === 'Done') return 'done';
  return 'backlog';
}
function archStatusToMBStatus(status) {
  if (status === 'building') return 'this_week';
  if (status === 'live') return 'done';
  return 'backlog';
}
function mbStatusToArchStatus(mbStatus) {
  if (mbStatus === 'this_week' || mbStatus === 'next_week') return 'building';
  if (mbStatus === 'done') return 'live';
  return 'planned';
}

// ── ARCHITECTURE TENTACLE ─────────────────────────────────
export async function getArchitectureItems() {
  const snap = await getDoc(doc(db, 'nip_architecture', 'current_status'));
  const data = snap.exists() ? snap.data().status : null;
  const { NIP_STATUS } = await import('../components/Cockpit/Architecture/architectureData');
  const src = data || NIP_STATUS;
  const items = [];

  src.studio?.modules?.forEach(module => {
    module.components?.forEach(comp => {
      if (comp.status === 'live') return;
      items.push({
        uid: `arch_${module.id}_${comp.label}`, title: comp.label, stream: 'build',
        status: archStatusToMBStatus(comp.status), effortHours: null, client: null,
        priority: comp.status === 'building' ? 1 : 3, dueDate: null, targetWeek: null,
        notes: null, sourceSection: module.label.replace(/^[A-Z]+ — /, ''),
        source: 'architecture', sourceId: `${module.id}|||${comp.label}`, _raw: comp
      });
    });
  });

  src.aims?.modules?.forEach(module => {
    module.components?.forEach(comp => {
      if (comp.status === 'live') return;
      items.push({
        uid: `arch_aims_${module.id}_${comp.label}`, title: comp.label, stream: 'deliver',
        status: archStatusToMBStatus(comp.status), effortHours: null, client: 'IVC',
        priority: comp.status === 'building' ? 1 : 3, dueDate: null, targetWeek: null,
        notes: `AIMS: ${module.label}`, sourceSection: `AIMS — ${module.label}`,
        source: 'architecture', sourceId: `aims_${module.id}|||${comp.label}`, _raw: comp
      });
    });
  });

  src.phase0?.syncPairs?.forEach((pair, i) => {
    if (pair.status === 'live') return;
    items.push({
      uid: `arch_phase0_${i}`, title: `${pair.from} → ${pair.to}`, stream: 'build',
      status: archStatusToMBStatus(pair.status), effortHours: null, client: 'IVC',
      priority: 1, dueDate: null, targetWeek: null, notes: 'Phase 0 sync pair',
      sourceSection: 'Phase 0 — Closed-loop sync', source: 'architecture',
      sourceId: `phase0|||${pair.from}`, _raw: pair
    });
  });

  [
    { arr: src.aiAgents, stream: 'build', section: 'AI Agents' },
    { arr: src.intelligence, stream: 'build', section: 'Intelligence Layers' },
    { arr: src.infrastructure, stream: 'build', section: 'Infrastructure' },
  ].forEach(({ arr, stream, section }) => {
    arr?.forEach(item => {
      if (item.status === 'live') return;
      items.push({
        uid: `arch_${section}_${item.label}`, title: item.label, stream,
        status: archStatusToMBStatus(item.status), effortHours: null, client: null,
        priority: item.status === 'building' ? 1 : 3, dueDate: null, targetWeek: null,
        notes: item.note || null, sourceSection: section, source: 'architecture',
        sourceId: `${section}|||${item.label}`, _raw: item
      });
    });
  });
  return items;
}

export async function updateArchitectureItemStatus(sourceId, newStatus) {
  const docRef = doc(db, 'nip_architecture', 'current_status');
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = { ...snap.data() };
  const status = { ...(data.status || {}) };
  const archStatus = mbStatusToArchStatus(newStatus);
  const [section, label] = sourceId.split('|||');

  function updateInArray(arr) {
    return arr?.map(item => item.label === label ? { ...item, status: archStatus } : item);
  }

  if (section === 'AI Agents') status.aiAgents = updateInArray(status.aiAgents);
  else if (section === 'Intelligence Layers') status.intelligence = updateInArray(status.intelligence);
  else if (section === 'Infrastructure') status.infrastructure = updateInArray(status.infrastructure);
  else if (section.startsWith('phase0')) {
    status.phase0 = { ...status.phase0, syncPairs: status.phase0?.syncPairs?.map(p => p.from === label ? { ...p, status: archStatus } : p) };
  } else if (section.startsWith('aims_')) {
    const moduleId = section.replace('aims_', '');
    status.aims = { ...status.aims, modules: status.aims?.modules?.map(m => m.id === moduleId ? { ...m, components: updateInArray(m.components) } : m) };
  } else {
    status.studio = { ...status.studio, modules: status.studio?.modules?.map(m => ({ ...m, components: updateInArray(m.components) })) };
  }

  await setDoc(docRef, { ...data, status }, { merge: true });
}

// ── IVC DELIVER TENTACLE ──────────────────────────────────
export function subscribeToDeliverItems(callback) {
  return subscribeToBacklog(items => {
    const normalised = items
      .filter(item => !['obsolete'].includes(item.stage))
      .map(item => ({
        uid: `ivc_backlog_${item.id}`, title: item.title || '', stream: 'deliver',
        status: ivcStageToMBStatus(item.stage), effortHours: item.benTimeHours || null,
        client: 'IVC', priority: item.priority || 2, dueDate: item.targetDate || null,
        targetWeek: null, notes: item.notes || null, sourceSection: item.linkedPillar || null,
        source: 'ivc_backlog', sourceId: item.id, _raw: item
      }));
    callback(normalised);
  });
}

// ── OPERATE TENTACLE ──────────────────────────────────────
export function subscribeToOperateItems(callback) {
  const items = { priority: [], todos: [] };
  let loaded = { priority: false, todos: false };
  function emit() {
    if (!Object.values(loaded).every(Boolean)) return;
    callback([...items.priority, ...items.todos].sort((a, b) => a.priority - b.priority));
  }

  const errHandler = (src) => (err) => {
    console.warn(`MB operate: ${src} subscription error`, err.message);
    // Mark as loaded so other streams still render
    loaded[src] = true;
    emit();
  };

  const unsubPQ = onSnapshot(
    collection(db, 'priority_queue'),
    (snap) => {
      items.priority = snap.docs.map(d => {
        const data = d.data();
        if (data.status === 'Done') return null;
        return {
          uid: `pq_${d.id}`, title: data.title, stream: 'operate',
          status: priorityStatusToMBStatus(data.status), effortHours: null, client: null,
          priority: data.priority || 3, dueDate: data.due_date || null, targetWeek: null,
          notes: data.context || null, sourceSection: 'Priority Queue',
          source: 'priority_queue', sourceId: d.id, _raw: data
        };
      }).filter(Boolean);
      loaded.priority = true; emit();
    },
    errHandler('priority')
  );

  const unsubTodos = onSnapshot(
    collection(db, 'weekly_todos'),
    (snap) => {
      items.todos = snap.docs.map(d => {
        const data = d.data();
        if (data.completed) return null;
        return {
          uid: `todo_${d.id}`, title: data.title, stream: 'operate', status: 'this_week',
          effortHours: null, client: null, priority: data.order || 3, dueDate: null,
          targetWeek: data.week_start || null, notes: null, sourceSection: 'This Week',
          source: 'weekly_todos', sourceId: d.id, _raw: data
        };
      }).filter(Boolean);
      loaded.todos = true; emit();
    },
    errHandler('todos')
  );

  return () => { unsubPQ(); unsubTodos(); };
}

// ── SALES TENTACLE ────────────────────────────────────────
export function subscribeToSalesItems(callback) {
  return onSnapshot(
    collection(db, 'client_backlog'),
    (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data();
        if (data.status === 'Paid') return null;
        return {
          uid: `sales_${d.id}`, title: data.title, stream: 'sales',
          status: data.status === 'In Progress' ? 'this_week' : 'backlog',
          effortHours: null, client: data.client || null, priority: data.priority || 2,
          dueDate: data.estimated_delivery || null, targetWeek: null,
          notes: data.notes || null, sourceSection: data.revenue_type || null,
          source: 'client_backlog', sourceId: d.id, _raw: data
        };
      }).filter(Boolean);
      callback(items);
    },
    (err) => { console.warn('MB sales error:', err.message); callback([]); }
  );
}

// ── MARKETING TENTACLE ────────────────────────────────────
export function subscribeToMarketingItems(callback) {
  return onSnapshot(
    collection(db, 'marketing_tasks'),
    (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          uid: `mkt_${d.id}`, title: data.title, stream: 'marketing',
          status: data.status || 'backlog', effortHours: data.effort_hours || null,
          client: data.client || null, priority: data.priority || 2,
          dueDate: data.due_date || null, targetWeek: data.week_target || null,
          notes: data.notes || null, sourceSection: data.category || null,
          source: 'marketing_tasks', sourceId: d.id, _raw: data
        };
      });
      callback(items);
    },
    (err) => { console.warn('MB marketing error:', err.message); callback([]); }
  );
}

// ── MANUAL TENTACLE ───────────────────────────────────────
export function subscribeToManualItems(callback) {
  return onSnapshot(
    collection(db, 'master_backlog'),
    (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          uid: `manual_${d.id}`, title: data.title, stream: data.stream || 'manual',
          status: data.status || 'backlog', effortHours: data.effort_hours || null,
          client: data.client || null, priority: data.priority || 3,
          dueDate: data.due_date || null, targetWeek: data.week_target || null,
          notes: data.notes || null, sourceSection: null,
          source: 'master_backlog', sourceId: d.id, _raw: data
        };
      });
      callback(items);
    },
    (err) => { console.warn('MB manual error:', err.message); callback([]); }
  );
}

// ── ADD ITEM ──────────────────────────────────────────────
export async function addMasterBacklogItem(item) {
  if (item.stream === 'marketing') {
    return await addDoc(collection(db, 'marketing_tasks'), {
      title: item.title, status: item.status || 'backlog',
      effort_hours: item.effortHours || null, client: item.client || null,
      priority: item.priority || 2, due_date: item.dueDate || null,
      week_target: item.targetWeek || null, notes: item.notes || null,
      category: item.category || null, created_at: serverTimestamp(),
    });
  }
  return await addDoc(collection(db, 'master_backlog'), {
    title: item.title, stream: item.stream, status: item.status || 'backlog',
    effort_hours: item.effortHours || null, client: item.client || null,
    priority: item.priority || 3, due_date: item.dueDate || null,
    week_target: item.targetWeek || null, notes: item.notes || null,
    created_at: serverTimestamp(),
  });
}

// ── WRITE-BACK ────────────────────────────────────────────
export async function updateMasterBacklogItemStatus(item, newStatus) {
  switch (item.source) {
    case 'architecture':
      await updateArchitectureItemStatus(item.sourceId, newStatus);
      break;
    case 'ivc_backlog': {
      const stageMap = { this_week: 'in_progress', next_week: 'approved', backlog: 'approved', done: 'done' };
      await updateIVCBacklogItem(item.sourceId, { stage: stageMap[newStatus] || 'approved' });
      break;
    }
    case 'priority_queue': {
      const pqMap = { this_week: 'In Progress', next_week: 'Open', backlog: 'Open', done: 'Done' };
      await updateDoc(doc(db, 'priority_queue', item.sourceId), { status: pqMap[newStatus] || 'Open' });
      break;
    }
    case 'experiments':
      if (newStatus === 'done') await updateDoc(doc(db, 'experiments', item.sourceId), { status: 'Validated' });
      break;
    case 'weekly_todos':
      if (newStatus === 'done') await updateDoc(doc(db, 'weekly_todos', item.sourceId), { completed: true });
      break;
    case 'client_backlog':
    case 'marketing_tasks':
    case 'master_backlog':
      await updateDoc(doc(db, item.source, item.sourceId), { status: newStatus });
      break;
  }
}

export async function deleteMasterBacklogItem(item) {
  const deleteable = ['marketing_tasks', 'master_backlog', 'priority_queue'];
  if (deleteable.includes(item.source)) {
    await deleteDoc(doc(db, item.source, item.sourceId));
  }
}

// ── LEARN STREAM ──────────────────────────────────────────
export async function getLearnItems() {
  const items = [];
  try {
    const gaps = await computeGaps();
    gaps.filter(g => g.type !== 'stale').forEach(gap => {
      items.push({
        uid: `learn_gap_${gap.cluster}`, title: gap.message, stream: 'learn',
        status: gap.type === 'critical' ? 'this_week' : 'next_week',
        effortHours: gap.type === 'critical' ? 2 : 1, client: null,
        priority: gap.type === 'critical' ? 1 : 2, dueDate: null, targetWeek: null,
        notes: gap.detail, sourceSection: `Layer ${gap.layer} — ${gap.cluster_name}`,
        source: 'intelligence_gaps', sourceId: `gap_${gap.cluster}`, action: 'inject', _raw: gap,
      });
    });
  } catch (e) { console.warn('LEARN: gaps failed', e.message); }

  try {
    const stale = await getStaleDocuments();
    if (stale.length > 0) {
      items.push({
        uid: 'learn_stale_batch', title: `${stale.length} stale documents to review`, stream: 'learn',
        status: 'backlog', effortHours: 0.5, client: null, priority: 3,
        dueDate: null, targetWeek: null, notes: 'Documents with 0 uses. Archive or refresh.',
        sourceSection: 'Usage — Stale docs', source: 'intelligence_stale',
        sourceId: 'stale_batch', action: 'archive', _raw: stale,
      });
    }
  } catch (e) { console.warn('LEARN: stale failed', e.message); }

  try {
    const promotions = await getPromotionCandidates();
    promotions.forEach(pat => {
      items.push({
        uid: `learn_promote_${pat.id}`, title: `Promote: ${pat.title}`, stream: 'learn',
        status: 'backlog', effortHours: 0.25, client: pat.client || null, priority: 2,
        dueDate: null, targetWeek: null, notes: (pat.content || '').substring(0, 120),
        sourceSection: 'Layer 3 → Layer 2', source: 'intelligence_patterns',
        sourceId: pat.id, action: 'promote', _raw: pat,
      });
    });
  } catch (e) { console.warn('LEARN: promotions failed', e.message); }

  try {
    const queue = await getInjectQueue();
    queue.forEach(item => {
      items.push({
        uid: `learn_inject_${item.id}`, title: `Ready: ${item.doc_count} documents`, stream: 'learn',
        status: 'this_week', effortHours: 0.25, client: null, priority: 1,
        dueDate: null, targetWeek: null, notes: `Cluster: ${item.tags?.cluster_name || ''}`,
        sourceSection: 'Inject queue', source: 'intelligence_inject_queue',
        sourceId: item.id, action: 'approve', _raw: item,
      });
    });
  } catch (e) { console.warn('LEARN: queue failed', e.message); }

  return items;
}
