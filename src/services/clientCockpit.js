/**
 * clientCockpit.js — Firestore service for IVC AI Cockpit
 * New collections: ivc_goals, ivc_issues, ivc_pillars, ivc_ideas, ivc_backlog
 * Matches codebase import style (Firestore v9 modular SDK)
 */
import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Goals ────────────────────────────────────────
export async function getGoals(clientId) {
  const q = query(
    collection(db, 'ivc_goals'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addGoal(clientId, data) {
  return addDoc(collection(db, 'ivc_goals'), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
  });
}

export async function updateGoalProgress(goalId, outcomeProgress, enablementProgress) {
  return updateDoc(doc(db, 'ivc_goals', goalId), {
    outcomeProgress,
    enablementProgress,
  });
}

// ─── Issues ───────────────────────────────────────
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export async function getIssues(clientId) {
  const q = query(
    collection(db, 'ivc_issues'),
    where('clientId', '==', clientId),
    where('status', '==', 'open'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

export async function addIssue(clientId, data) {
  return addDoc(collection(db, 'ivc_issues'), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
  });
}

export async function resolveIssue(issueId) {
  return updateDoc(doc(db, 'ivc_issues', issueId), {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
  });
}

// ─── Pillars ──────────────────────────────────────
export async function getPillars(clientId) {
  const q = query(
    collection(db, 'ivc_pillars'),
    where('clientId', '==', clientId),
    orderBy('order', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePillarProgress(pillarId, progress, capabilities) {
  return updateDoc(doc(db, 'ivc_pillars', pillarId), {
    enablementProgress: progress,
    activeCapabilities: capabilities,
  });
}

// ─── Ideas ────────────────────────────────────────
export async function getIdeas(clientId, status) {
  const q = query(
    collection(db, 'ivc_ideas'),
    where('clientId', '==', clientId),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addIdea(clientId, data) {
  return addDoc(collection(db, 'ivc_ideas'), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
  });
}

export async function approveIdea(ideaId) {
  return updateDoc(doc(db, 'ivc_ideas', ideaId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
}

export async function declineIdea(ideaId) {
  return updateDoc(doc(db, 'ivc_ideas', ideaId), {
    status: 'rejected',
  });
}

// ─── Backlog ──────────────────────────────────────
export async function getBacklog(clientId) {
  const q = query(
    collection(db, 'ivc_backlog'),
    where('clientId', '==', clientId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addBacklogItem(clientId, data) {
  return addDoc(collection(db, 'ivc_backlog'), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
  });
}

export async function updateBacklogStage(itemId, stage) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), {
    stage,
    updatedAt: serverTimestamp(),
  });
}
