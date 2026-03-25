/**
 * usePortalData — Client Portal V2-Final data hooks
 * Commitment lifecycle: Requested → Scoping → Estimated → Approved for Delivery 🔒 → Building 🔒 → Delivered → Managed Support
 */
import { useState, useEffect, useCallback } from 'react';

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Lock point: items at or past approved_for_delivery are locked
const LOCKED_STAGES = ['approved_for_delivery', 'building', 'delivered', 'managed_support'];
export const isLocked = (stage) => LOCKED_STAGES.includes(stage);

/* ═══════════ SEED DATA (V2-Final) ═══════════ */
function seedProjects(clientId) {
  const now = new Date().toISOString();
  return [
    {
      id: uuid(), client_id: clientId,
      title: "IVC AI Platform — Phase 1 Floorplan Takeoff",
      description: "Complete AI annotation platform: AI Annotation Engine, Learning Library, Data Layer, Output Generation, Admin Interface, GCP Infrastructure. 84%+ accuracy on floorplan takeoffs.",
      stage: "delivered", locked: true, priority_order: 1,
      estimated_value_usd: 30000, actual_value_usd: 30000,
      estimated_start: "2026-02-15", estimated_delivery: "2026-03-19", delivered_date: "2026-03-19",
      components: ["AI Annotation Engine", "Learning Library", "Data Layer", "Output Generation", "Admin Interface", "GCP Infrastructure"],
      waiting_on_client: false, waiting_reason: "",
      notes: "Phase 1 complete. Ready for acceptance.", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      id: uuid(), client_id: clientId,
      title: "IVC Managed Platform — Monthly Retainer",
      description: "Platform monitoring, maintenance, incident response, ongoing improvements, monthly review, priority access to Nouvia engineering.",
      stage: "estimated", locked: false, priority_order: 2,
      estimated_value_usd: 60000, monthly_value_usd: 5000,
      estimated_start: "2026-04-01", estimated_delivery: null,
      components: ["Platform Monitoring", "Maintenance & Patches", "Incident Response", "Monthly Review", "Priority Access"],
      waiting_on_client: true, waiting_reason: "SOW pending signature",
      notes: "$5,000/month recurring", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      id: uuid(), client_id: clientId,
      title: "ChatGPT Enterprise Migration — 11 Users",
      description: "Transitioning from Gemini Enterprise to ChatGPT Enterprise for 11 IVC team members.",
      stage: "building", locked: true, priority_order: 3,
      estimated_value_usd: null,
      estimated_start: "2026-03-19", estimated_delivery: "2026-03-24",
      components: [], waiting_on_client: false, waiting_reason: "",
      notes: "Migration in progress", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      id: uuid(), client_id: clientId,
      title: "Design Scoping Solution",
      description: "AI-powered design scoping that connects SolidWorks PDM part geometry with Genius ERP costing data to auto-generate scoped BOMs and cost estimates from engineering drawings. Replaces manual lookup across disconnected systems.",
      stage: "scoping", locked: false, priority_order: 4,
      estimated_value_usd: null,
      estimated_start: "2026-03-24", estimated_delivery: "2026-04-15",
      components: ["PDM Data Bridge", "ERP Cost Lookup", "BOM Generator", "Scoping Interface"],
      waiting_on_client: true,
      waiting_reason: "3 data items needed: (1) ERP data cleansing workstream owner, (2) costing method confirmation in Genius, (3) acceptable threshold between standard cost and last purchase price",
      notes: "Connects SolidWorks PDM \u2192 Genius ERP to auto-scope designs. Blocked until IVC provides 3 data items.", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      id: uuid(), client_id: clientId,
      title: "Engineering Scoping Solution — AI Estimation Platform",
      description: "Floorplan \u2192 part codes \u2192 Genius ERP \u2192 BOM \u2192 cost estimate. The path to bringing estimation in-house and replacing the $150k offshore process.",
      stage: "scoping", locked: false, priority_order: 5,
      estimated_value_usd: null,
      estimated_start: "2026-04-15", estimated_delivery: "2026-05-15",
      components: [], waiting_on_client: false, waiting_reason: "",
      notes: "Depends on ERP integration completion", client_visible: true,
      created_at: now, updated_at: now,
    },
    {
      id: uuid(), client_id: clientId,
      title: "ESSOR Discovery — Revenue Qu\u00e9bec Grant",
      description: "Formal discovery phase for the approved Investissement Qu\u00e9bec ESSOR grant. Covers AI platform assessment and expansion roadmap.",
      stage: "scoping", locked: false, priority_order: 6,
      estimated_value_usd: null,
      estimated_start: "2026-04-01", estimated_delivery: "2026-05-01",
      components: [], waiting_on_client: false, waiting_reason: "",
      notes: "Grant approved. Discovery starting April.", client_visible: true,
      created_at: now, updated_at: now,
    },
  ];
}

function seedActivity(clientId) {
  return [
    { client_id: clientId, date: "2026-03-24", description: "ChatGPT Enterprise migration in progress \u2014 11 users transitioning", type: "status_change", badge: "In Progress" },
    { client_id: clientId, date: "2026-03-24", description: "Design Scoping Solution scoped \u2014 awaiting 3 data items from IVC", type: "status_change", badge: "Waiting on IVC" },
    { client_id: clientId, date: "2026-03-19", description: "Phase 1 Floorplan Takeoff Platform delivered \u2014 6 components, 84%+ accuracy", type: "delivery", badge: "Delivered" },
    { client_id: clientId, date: "2026-03-19", description: "Investment summary sent for review", type: "document", badge: "Document" },
    { client_id: clientId, date: "2026-03-17", description: "Engineering estimation solution scoped \u2014 path to replacing $150k offshore process", type: "status_change", badge: "Scoping" },
    { client_id: clientId, date: "2026-03-15", description: "ESSOR grant (Revenue Qu\u00e9bec) approved \u2014 discovery phase starting April", type: "milestone", badge: "Milestone" },
  ];
}

/* ═══════════ HOOKS ═══════════ */
const SEED_VERSION = 'v2-final-4';

export function usePortalProjects(clientId) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = `portal:projects:${clientId}`;
  const VERSION_KEY = `portal:seed-version:${clientId}`;

  useEffect(() => {
    if (!clientId) return;
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const cached = localStorage.getItem(STORAGE_KEY);

    if (storedVersion === SEED_VERSION && cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) { setProjects(parsed); setLoading(false); return; }
      } catch (e) { /* ignore */ }
    }

    // Seed or reseed
    const seeded = seedProjects(clientId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    localStorage.setItem(VERSION_KEY, SEED_VERSION);
    setProjects(seeded);
    setLoading(false);
  }, [clientId]);

  const updateProject = useCallback((titleOrId, updates) => {
    setProjects(prev => {
      const next = prev.map(p =>
        (p.title === titleOrId || p.id === titleOrId)
          ? { ...p, ...updates, locked: isLocked(updates.stage || p.stage), updated_at: new Date().toISOString() }
          : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [STORAGE_KEY]);

  const addProject = useCallback((data) => {
    setProjects(prev => {
      const newP = {
        id: uuid(), client_id: clientId, ...data,
        locked: isLocked(data.stage || 'requested'),
        priority_order: prev.length + 1,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const next = [...prev, newP];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [clientId, STORAGE_KEY]);

  const reorderProjects = useCallback((reorderedIds) => {
    setProjects(prev => {
      const next = prev.map(p => {
        const idx = reorderedIds.indexOf(p.id);
        return idx >= 0 ? { ...p, priority_order: idx + 1 } : p;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [STORAGE_KEY]);

  return { projects, loading, updateProject, addProject, reorderProjects };
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
  return { documents: [], loading: false };
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
      ...data, id: uuid(), client_id: clientId,
      stage: 'requested', locked: false,
      priority_order: 999,
      status: 'new', submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
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
