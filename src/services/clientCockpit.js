/**
 * clientCockpit.js — Firestore service for IVC AI Cockpit
 * Collections: ivc_goals, ivc_issues, ivc_pillars, ivc_ideas, ivc_backlog, ivc_audit_log
 */
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as firestoreLimit, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Goals ────────────────────────────────────────
export async function getGoals(clientId) {
  const q = query(collection(db, 'ivc_goals'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addGoal(clientId, data) {
  return addDoc(collection(db, 'ivc_goals'), { ...data, clientId, createdAt: serverTimestamp() });
}

export async function updateGoalProgress(goalId, outcomeProgress, enablementProgress) {
  return updateDoc(doc(db, 'ivc_goals', goalId), { outcomeProgress, enablementProgress });
}

export async function updateGoal(goalId, data) {
  return updateDoc(doc(db, 'ivc_goals', goalId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteGoal(goalId, deletedBy, reason) {
  const ref = doc(db, 'ivc_goals', goalId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await addDoc(collection(db, 'ivc_audit_log'), {
      type: 'goal_deleted', entityId: goalId, entityTitle: snap.data().title,
      snapshot: snap.data(), deletedBy, reason, clientId: 'ivc',
      timestamp: serverTimestamp(), notifyNouvia: true,
    });
  }
  return deleteDoc(ref);
}

export async function addGoalNote(goalId, text, addedBy = 'client') {
  return updateDoc(doc(db, 'ivc_goals', goalId), {
    notes: arrayUnion({ text, addedBy, timestamp: new Date().toISOString() }),
    updatedAt: serverTimestamp(),
  });
}

// ─── Issues ───────────────────────────────────────
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export async function getIssues(clientId) {
  const q = query(collection(db, 'ivc_issues'), where('clientId', '==', clientId), where('status', '==', 'open'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

export async function addIssue(clientId, data) {
  return addDoc(collection(db, 'ivc_issues'), { ...data, clientId, createdAt: serverTimestamp() });
}

export async function resolveIssue(issueId) {
  return updateDoc(doc(db, 'ivc_issues', issueId), { status: 'resolved', resolvedAt: serverTimestamp() });
}

export async function updateIssue(issueId, data) {
  return updateDoc(doc(db, 'ivc_issues', issueId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteIssue(issueId, deletedBy, reason) {
  const ref = doc(db, 'ivc_issues', issueId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await addDoc(collection(db, 'ivc_audit_log'), {
      type: 'issue_deleted', entityId: issueId, entityTitle: snap.data().title,
      snapshot: snap.data(), deletedBy, reason, clientId: 'ivc',
      timestamp: serverTimestamp(), notifyNouvia: true,
    });
  }
  return deleteDoc(ref);
}

export async function addIssueNote(issueId, text, addedBy = 'client') {
  return updateDoc(doc(db, 'ivc_issues', issueId), {
    notes: arrayUnion({ text, addedBy, timestamp: new Date().toISOString() }),
    updatedAt: serverTimestamp(),
  });
}

// ─── Audit Log ────────────────────────────────────
export async function getAuditLog(clientId, limit = 20) {
  const q = query(collection(db, 'ivc_audit_log'), where('clientId', '==', clientId), where('notifyNouvia', '==', true), orderBy('timestamp', 'desc'), firestoreLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Pillars ──────────────────────────────────────
export async function getPillars(clientId) {
  const q = query(collection(db, 'ivc_pillars'), where('clientId', '==', clientId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updatePillarProgress(pillarId, progress, capabilities) {
  return updateDoc(doc(db, 'ivc_pillars', pillarId), { enablementProgress: progress, activeCapabilities: capabilities });
}

// ─── Ideas ────────────────────────────────────────
export async function getIdeas(clientId, status) {
  // If status is null/undefined, fetch all non-terminal statuses (no orderBy to avoid index requirement)
  if (!status) {
    const q = query(collection(db, 'ivc_ideas'), where('clientId', '==', clientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(i => !['approved', 'declined', 'rejected'].includes(i.status))
      .sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
  }
  const q = query(collection(db, 'ivc_ideas'), where('clientId', '==', clientId), where('status', '==', status), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addIdea(clientId, data) {
  return addDoc(collection(db, 'ivc_ideas'), { ...data, clientId, createdAt: serverTimestamp() });
}

export async function approveIdea(ideaId) {
  return updateDoc(doc(db, 'ivc_ideas', ideaId), { status: 'approved', approvedAt: serverTimestamp() });
}

export async function declineIdea(ideaId) {
  return updateDoc(doc(db, 'ivc_ideas', ideaId), { status: 'rejected' });
}

export async function updateIdeaStatus(ideaId, status) {
  return updateDoc(doc(db, 'ivc_ideas', ideaId), { status, updatedAt: serverTimestamp() });
}

// ─── Backlog ──────────────────────────────────────
export async function getBacklog(clientId) {
  const q = query(collection(db, 'ivc_backlog'), where('clientId', '==', clientId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addBacklogItem(clientId, data) {
  return addDoc(collection(db, 'ivc_backlog'), { ...data, clientId, createdAt: serverTimestamp() });
}

export async function updateBacklogStage(itemId, stage) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), { stage, updatedAt: serverTimestamp() });
}

export async function updateBacklogNotes(itemId, notes) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), { notes, updatedAt: serverTimestamp() });
}

export async function updateBacklogPriority(itemId, priority) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), { priority, updatedAt: serverTimestamp() });
}

export async function updateBacklogTargetDate(itemId, targetDate) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), { targetDate, updatedAt: serverTimestamp() });
}

export async function moveToManagedSupport(itemId) {
  return updateDoc(doc(db, 'ivc_backlog', itemId), { stage: 'managed', managedSince: serverTimestamp(), updatedAt: serverTimestamp() });
}
