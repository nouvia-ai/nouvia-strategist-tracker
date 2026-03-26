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
  const items = { priority: [], experiments: [], todos: [] };
  let loaded = { priority: false, experiments: false, todos: false };
  function emit() {
    if (!Object.values(loaded).every(Boolean)) return;
    callback([...items.priority, ...items.experiments, ...items.todos].sort((a, b) => a.priority - b.priority));
  }

  const unsubPQ = onSnapshot(
    collection(db, 'priority_queue'),
    snap => {
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
    }
  );

  const unsubExp = onSnapshot(
    collection(db, 'experiments'),
    snap => {
      items.experiments = snap.docs.map(d => {
        const data = d.data();
        if (data.status !== 'Hypothesis' && data.status !== 'Testing') return null;
        return {
          uid: `exp_${d.id}`, title: `Experiment: ${(data.hypothesis || '').substring(0, 60)}...`,
          stream: 'operate', status: 'backlog', effortHours: 1, client: null, priority: 4,
          dueDate: null, targetWeek: null, notes: data.metric || null,
          sourceSection: 'Experiments', source: 'experiments', sourceId: d.id, _raw: data
        };
      }).filter(Boolean);
      loaded.experiments = true; emit();
    }
  );

  const unsubTodos = onSnapshot(
    collection(db, 'weekly_todos'),
    snap => {
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
    }
  );

  return () => { unsubPQ(); unsubExp(); unsubTodos(); };
}

// ── SALES TENTACLE ────────────────────────────────────────
export function subscribeToSalesItems(callback) {
  return onSnapshot(
    collection(db, 'client_backlog'),
    snap => {
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
    }
  );
}

// ── MARKETING TENTACLE ────────────────────────────────────
export function subscribeToMarketingItems(callback) {
  return onSnapshot(
    collection(db, 'marketing_tasks'),
    snap => {
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
    }
  );
}

// ── MANUAL TENTACLE ───────────────────────────────────────
export function subscribeToManualItems(callback) {
  return onSnapshot(
    collection(db, 'master_backlog'),
    snap => {
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
    }
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
