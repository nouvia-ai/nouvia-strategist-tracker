/**
 * usePortalData — Client Portal data hooks
 * Reads from portal_* Firestore collections, filtered by client_id.
 * Seeds IVC demo data on first load.
 */
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ═══════════ SEED DATA ═══════════ */
function seedProjects(clientId) {
  const now = new Date().toISOString();
  return [
    {
      client_id: clientId, title: "IVC AI Platform — Phase 1 Floorplan Takeoff",
      description: "Complete AI annotation platform: AI Annotation Engine, Learning Library, Data Layer, Output Generation, Admin Interface, GCP Infrastructure. 84%+ accuracy on floorplan takeoffs.",
      stage: "delivered", estimated_value_usd: 30000, estimated_delivery: "2026-03-19",
      delivered_date: "2026-03-19", phase: "Phase 1",
      components: ["AI Annotation Engine", "Learning Library", "Data Layer", "Output Generation", "Admin Interface", "GCP Infrastructure"],
      waiting_on_client: false, waiting_reason: "", notes: "Phase 1 complete. Ready for acceptance.", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      client_id: clientId, title: "IVC Managed Platform — Monthly Retainer",
      description: "Platform monitoring, maintenance, incident response, ongoing improvements, monthly review, priority access to Nouvia engineering.",
      stage: "estimated", estimated_value_usd: 60000, estimated_delivery: "2026-04-01",
      delivered_date: null, phase: "Phase 3",
      components: ["Platform Monitoring", "Maintenance & Patches", "Incident Response", "Monthly Review", "Priority Access"],
      waiting_on_client: true, waiting_reason: "SOW pending signature", notes: "$5,000/month recurring", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      client_id: clientId, title: "ChatGPT Enterprise Migration — 11 Users",
      description: "Transitioning from Gemini Enterprise to ChatGPT Enterprise for 11 IVC team members.",
      stage: "in_progress", estimated_value_usd: null, estimated_delivery: "2026-03-24",
      delivered_date: null, phase: "Phase 2",
      components: [], waiting_on_client: false, waiting_reason: "", notes: "Migration in progress", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      client_id: clientId, title: "SolidWorks PDM + Genius ERP Integration",
      description: "AI layer connecting part geometry data from SolidWorks PDM with costed BOM data in Genius ERP.",
      stage: "scoping", estimated_value_usd: null, estimated_delivery: "2026-03-31",
      delivered_date: null, phase: "Phase 2",
      components: [], waiting_on_client: true,
      waiting_reason: "3 data items needed: (1) ERP data cleansing workstream owner, (2) costing method confirmation in Genius, (3) acceptable threshold between standard cost and last purchase price",
      notes: "Blocked until IVC provides data items", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      client_id: clientId, title: "Engineering Scoping Solution — AI Estimation Platform",
      description: "Floorplan → part codes → Genius ERP → BOM → cost estimate. The path to bringing estimation in-house and replacing the $150k offshore process.",
      stage: "scoping", estimated_value_usd: null, estimated_delivery: "2026-04-30",
      delivered_date: null, phase: "Phase 2",
      components: [], waiting_on_client: false, waiting_reason: "", notes: "Depends on ERP integration completion", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      client_id: clientId, title: "ESSOR Discovery — Revenue Québec Grant",
      description: "Formal discovery phase for the approved Investissement Québec ESSOR grant. Covers AI platform assessment and expansion roadmap.",
      stage: "scoping", estimated_value_usd: null, estimated_delivery: null,
      delivered_date: null, phase: "Phase 2",
      components: [], waiting_on_client: false, waiting_reason: "", notes: "Grant approved. Discovery starting April.", client_visible: true,
      created_at: now, updated_at: now,
    },
  ];
}

function seedActivity(clientId) {
  return [
    { client_id: clientId, date: "2026-03-24", description: "ChatGPT Enterprise migration in progress — 11 users transitioning", type: "status_change", badge: "In Progress" },
    { client_id: clientId, date: "2026-03-24", description: "SolidWorks PDM + Genius ERP integration scoped — awaiting 3 data items from IVC", type: "status_change", badge: "Waiting on IVC" },
    { client_id: clientId, date: "2026-03-19", description: "Phase 1 Floorplan Takeoff Platform delivered — 6 components, 84%+ accuracy", type: "delivery", badge: "Delivered" },
    { client_id: clientId, date: "2026-03-19", description: "Investment summary sent for review", type: "document", badge: "Document" },
    { client_id: clientId, date: "2026-03-17", description: "Engineering estimation solution scoped — path to replacing $150k offshore process", type: "status_change", badge: "Scoping" },
    { client_id: clientId, date: "2026-03-15", description: "ESSOR grant (Revenue Québec) approved — discovery phase starting April", type: "milestone", badge: "Milestone" },
  ];
}

function seedDocuments(clientId) {
  return [
    { client_id: clientId, title: "IVC AI Platform — Phase 1 Investment Summary", category: "estimate", status: "sent", uploaded_at: "2026-03-19", notes: "Detailed breakdown of Phase 1 investment and deliverables" },
    { client_id: clientId, title: "Managed Platform SOW — $5,000/month", category: "contract", status: "pending_signature", uploaded_at: "2026-03-20", notes: "Monthly retainer for ongoing platform management" },
  ];
}

/* ═══════════ HOOKS ═══════════ */

export function usePortalProjects(clientId) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = `portal:projects:${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    // Try localStorage first for instant render
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) { setProjects(parsed); setLoading(false); }
      } catch (e) { /* ignore */ }
    }
    // Seed if empty
    if (!cached || JSON.parse(cached).length === 0) {
      const seeded = seedProjects(clientId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      setProjects(seeded);
    }
    setLoading(false);
  }, [clientId]);

  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev => {
      const next = prev.map(p => p === prev.find(pp => pp.title === projectId) || p.title === projectId
        ? { ...p, ...updates, updated_at: new Date().toISOString() }
        : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [STORAGE_KEY]);

  return { projects, loading, updateProject };
}

export function usePortalActivity(clientId) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = `portal:activity:${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) { setActivity(parsed); setLoading(false); return; }
      } catch (e) { /* ignore */ }
    }
    const seeded = seedActivity(clientId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    setActivity(seeded);
    setLoading(false);
  }, [clientId]);

  return { activity, loading };
}

export function usePortalDocuments(clientId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = `portal:documents:${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) { setDocuments(parsed); setLoading(false); return; }
      } catch (e) { /* ignore */ }
    }
    const seeded = seedDocuments(clientId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    setDocuments(seeded);
    setLoading(false);
  }, [clientId]);

  return { documents, loading };
}

export function usePortalRequests(clientId) {
  const [requests, setRequests] = useState([]);
  const STORAGE_KEY = `portal:requests:${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try { setRequests(JSON.parse(cached)); } catch (e) { /* ignore */ }
    }
  }, [clientId]);

  const submitRequest = useCallback((data) => {
    const newReq = {
      ...data,
      client_id: clientId,
      status: 'new',
      submitted_at: new Date().toISOString(),
    };
    setRequests(prev => {
      const next = [newReq, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return newReq;
  }, [clientId, STORAGE_KEY]);

  return { requests, submitRequest };
}
