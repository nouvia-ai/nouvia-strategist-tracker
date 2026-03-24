/**
 * useCompetitiveLandscape — NIP Competitive Landscape
 * Manages competitors, comparison matrix, and competitive analysis from localStorage.
 * Seeds baseline data on first load.
 */
import { useState, useEffect, useCallback } from "react";
import { getData, setData } from "../storage";

const STORAGE_KEY = "strategist:competitive_landscape";

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ── Constants ───────────────────────────────── */
export const COMPETITOR_TYPES = ["Direct", "Adjacent", "Emerging"];
export const THREAT_LEVELS = ["High", "Medium", "Low"];

export const COMPARISON_DIMENSIONS = [
  { id: "pricing", label: "Pricing Model" },
  { id: "delivery", label: "Delivery Approach" },
  { id: "ai_depth", label: "AI Integration Depth" },
  { id: "vertical", label: "Vertical Focus" },
  { id: "self_evolving", label: "Self-Evolving System" },
  { id: "adoption_guarantee", label: "Adoption Guarantee" },
  { id: "platform_ip", label: "Platform IP / Reusability" },
  { id: "client_size", label: "Target Client Size" },
];

export const COMPARISON_STATUS = {
  advantage: { label: "Nouvia Advantage", color: "var(--color-success)", variant: "green" },
  parity: { label: "Parity", color: "var(--color-warning)", variant: "amber" },
  disadvantage: { label: "Disadvantage", color: "var(--color-error)", variant: "red" },
  unknown: { label: "Unknown", color: "var(--color-text-muted)", variant: "gray" },
  not_applicable: { label: "N/A", color: "var(--color-text-subtle)", variant: "gray" },
};

export const MATRIX_CONFIGS = [
  {
    id: "market_position",
    name: "Market Position",
    x_axis_left: "SMB / Mid-Market",
    x_axis_right: "Enterprise",
    y_axis_bottom: "Project Delivery (build & leave)",
    y_axis_top: "Ongoing Partnership (adopt & evolve)",
    quadrant_labels: {
      top_left: "Platform Partners",
      top_right: "Enterprise Managed Services",
      bottom_left: "Build Shops",
      bottom_right: "Systems Integrators",
    },
  },
  {
    id: "tech_vs_adoption",
    name: "Technology vs Adoption Focus",
    x_axis_left: "Generic AI",
    x_axis_right: "Domain-Specific AI",
    y_axis_bottom: "Technology Focus",
    y_axis_top: "Adoption Focus",
    quadrant_labels: {
      top_left: "Adoption Generalists",
      top_right: "Domain Adoption Leaders",
      bottom_left: "AI Tool Builders",
      bottom_right: "Vertical Tech Specialists",
    },
  },
];

function buildSeedData() {
  const now = new Date().toISOString();

  const competitors = [
    // ── Nouvia (self) ──
    {
      id: "nouvia",
      name: "Nouvia",
      type: "Direct",
      is_self: true,
      description: "AI-native delivery consultancy with self-evolving platform (Nouvia OS). Solo AI-augmented delivery, outcome-based pricing, adoption guarantee.",
      threat_level: null,
      key_differentiator: "Self-evolving delivery system, AI coworker chain, adoption guarantee, reusable Core Components",
      weakness: "Single-person capacity, no brand recognition yet, one client track record",
      website: "https://nouvia.ai",
      notes: "",
      matrix_positions: { market_position: { x: 25, y: 85 } },
      created_at: now, updated_at: now,
    },
    // ── Boutique AI Agencies (Montr\u00e9al \u2014 Direct) ──
    {
      id: uuid(),
      name: "Moov AI",
      type: "Direct",
      description: "Applied AI and data solutions that drive real business outcomes. Montr\u00e9al-based, 358 Beaubien.",
      threat_level: "Medium",
      key_differentiator: "Applied AI focus, local Montr\u00e9al presence, established brand",
      weakness: "No evidence of adoption methodology or ongoing managed services",
      website: "https://moov.ai",
      notes: "Most similar to Nouvia's positioning but no evidence of adoption methodology or ongoing managed services.",
      matrix_positions: { market_position: { x: 30, y: 30 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "IA Expert Consulting",
      type: "Direct",
      description: "Embedded AI consultants who work directly within your teams. Montr\u00e9al-based. 6-month embedded engagements.",
      threat_level: "High",
      key_differentiator: "Embedded model, worked with construction/estimating client (Balcon Expert)",
      weakness: "No platform thinking or Sentinel-style monitoring. Build-and-leave model.",
      website: "https://iaexpert.ca",
      notes: "CLOSEST COMPETITOR. Embedded model. Worked with a construction/estimating client (Balcon Expert). Claims 6-month embedded engagements. No evidence of platform thinking or Sentinel-style monitoring. Build-and-leave model.",
      matrix_positions: { market_position: { x: 25, y: 45 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "AIMpact Consult",
      type: "Direct",
      description: "Where technology meets humanity \u2014 Microsoft Copilot and AI implementation.",
      threat_level: "Low",
      key_differentiator: "Microsoft-centric (Copilot, M365), established ecosystem",
      weakness: "Different tech stack than Nouvia. Not a direct competitor for custom platform builds.",
      website: "https://aimpactconsult.com",
      notes: "Microsoft-centric. Could compete on the 'help us adopt AI' positioning but different tech ecosystem.",
      matrix_positions: { market_position: { x: 35, y: 25 } },
      created_at: now, updated_at: now,
    },
    // ── Vertical SaaS (Construction Takeoff/Estimation) ──
    {
      id: uuid(),
      name: "Togal.AI",
      type: "Adjacent",
      description: "AI-powered automated takeoffs for commercial construction. $299/user/month.",
      threat_level: "Medium",
      key_differentiator: "Specialized takeoff tool, fast, established product",
      weakness: "Only solves one piece. No custom integration with client ERP/PLM. No adoption guarantee.",
      website: "https://togal.ai",
      notes: "Specialized takeoff tool. Fast but only solves one piece. Threat if IVC decides a SaaS tool is 'good enough' for takeoff.",
      matrix_positions: { market_position: { x: 60, y: 40 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "Beam AI (Attentive.ai)",
      type: "Adjacent",
      description: "AI takeoff software for construction and field services \u2014 claims 98% accuracy. Automated from aerial imagery and PDFs.",
      threat_level: "Medium",
      key_differentiator: "98% takeoff accuracy claim, mature product for standard construction",
      weakness: "Cannot handle IVC's specific SolidWorks + Genius ERP + custom floorplan workflow",
      website: "https://ibeam.ai",
      notes: "More mature product for standard construction takeoff. Cannot handle IVC's specific workflow.",
      matrix_positions: { market_position: { x: 55, y: 45 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "Kreo",
      type: "Adjacent",
      description: "AI takeoff and estimating \u2014 automate measurements, eliminate errors, bid 10x faster. Cloud-based, 2D/3D support.",
      threat_level: "Low",
      key_differentiator: "Cloud-based 2D/3D support, generic construction estimating",
      weakness: "No manufacturing/pharmacy retail focus. No custom integration capability.",
      website: "https://kreo.net",
      notes: "Generic construction estimating. No manufacturing/pharmacy retail focus.",
      matrix_positions: { market_position: { x: 50, y: 35 } },
      created_at: now, updated_at: now,
    },
    // ── Traditional IT / Big 4 (Enterprise \u2014 Indirect) ──
    {
      id: uuid(),
      name: "CGI",
      type: "Adjacent",
      description: "Enterprise-grade IT solutions, cybersecurity, digital transformation. Montr\u00e9al-headquartered global firm.",
      threat_level: "Low",
      key_differentiator: "Montr\u00e9al HQ, global scale, enterprise relationships, government contracts",
      weakness: "Engagement too small for IVC-sized clients, too hands-on. Would never serve a 30-person manufacturer.",
      website: "https://cgi.com",
      notes: "Indirect threat only if they build a downmarket AI practice.",
      matrix_positions: { market_position: { x: 90, y: 55 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "KPMG Canada AI",
      type: "Adjacent",
      description: "Enterprise AI strategy, governance, and implementation. Compliance and governance focus.",
      threat_level: "Low",
      key_differentiator: "Brand trust, compliance frameworks, enterprise relationships",
      weakness: "Would never serve a 30-person manufacturer. Watch for their frameworks influencing enterprise buyer expectations.",
      website: "https://kpmg.com/ca",
      notes: "AI and emerging tech practice. Watch for their frameworks influencing what enterprise buyers expect.",
      matrix_positions: { market_position: { x: 85, y: 50 } },
      created_at: now, updated_at: now,
    },
    {
      id: uuid(),
      name: "Gestisoft",
      type: "Adjacent",
      description: "Microsoft Copilot and Dynamics 365 AI consulting. 25+ years in CRM/ERP consulting.",
      threat_level: "Low",
      key_differentiator: "Microsoft-certified, 25+ years CRM/ERP, public sector experience",
      weakness: "Could compete on ERP integration angle if clients used Dynamics instead of Genius. Different tech ecosystem.",
      website: "https://gestisoft.com",
      notes: "25+ years in CRM/ERP consulting. Could compete on the ERP integration angle if IVC used Dynamics instead of Genius. Different tech ecosystem.",
      matrix_positions: { market_position: { x: 45, y: 30 } },
      created_at: now, updated_at: now,
    },
  ];

  // Build comparison matrix: competitor_id -> dimension_id -> { status, notes }
  const matrix = {};
  competitors.forEach(c => {
    matrix[c.id] = {};
    COMPARISON_DIMENSIONS.forEach(d => {
      matrix[c.id][d.id] = { status: "unknown", notes: "" };
    });
  });

  // Seed known comparisons by finding competitors by name
  const byName = (n) => competitors.find(c => c.name === n);

  // IA Expert — closest competitor
  const iaExpert = byName("IA Expert Consulting");
  if (iaExpert) {
    matrix[iaExpert.id].pricing = { status: "parity", notes: "Both project-based. Nouvia moving to managed platform model." };
    matrix[iaExpert.id].delivery = { status: "advantage", notes: "AI coworker chain vs. manual embedded consulting." };
    matrix[iaExpert.id].platform_ip = { status: "advantage", notes: "Nouvia OS accumulates IP. IA Expert rebuilds each time." };
    matrix[iaExpert.id].adoption_guarantee = { status: "advantage", notes: "Unique to Nouvia. IA Expert has no adoption methodology." };
    matrix[iaExpert.id].self_evolving = { status: "advantage", notes: "Nouvia OS is unique. No equivalent." };
    matrix[iaExpert.id].vertical = { status: "parity", notes: "Both serve construction/manufacturing." };
  }

  // Moov AI
  const moov = byName("Moov AI");
  if (moov) {
    matrix[moov.id].delivery = { status: "advantage", notes: "Nouvia: AI-augmented solo delivery. Moov: traditional team." };
    matrix[moov.id].adoption_guarantee = { status: "advantage", notes: "Unique to Nouvia." };
    matrix[moov.id].platform_ip = { status: "advantage", notes: "Nouvia OS vs. project-by-project builds." };
  }

  // Togal.AI — vertical SaaS
  const togal = byName("Togal.AI");
  if (togal) {
    matrix[togal.id].pricing = { status: "disadvantage", notes: "$299/user/month SaaS vs. custom build cost." };
    matrix[togal.id].ai_depth = { status: "advantage", notes: "Nouvia: deep custom AI integration. Togal: point solution." };
    matrix[togal.id].self_evolving = { status: "advantage", notes: "SaaS is static. Nouvia's platform learns and evolves." };
    matrix[togal.id].vertical = { status: "parity", notes: "Both serve construction." };
  }

  // CGI — enterprise indirect
  const cgi = byName("CGI");
  if (cgi) {
    matrix[cgi.id].client_size = { status: "disadvantage", notes: "CGI handles enterprise/government. Nouvia targets SMB." };
    matrix[cgi.id].delivery = { status: "advantage", notes: "Nouvia: weeks. CGI: months to years." };
    matrix[cgi.id].pricing = { status: "advantage", notes: "Nouvia: outcome-based. CGI: day rates, large teams." };
  }

  const analysis = {
    summary: "Nouvia occupies a unique position: AI-native delivery with a self-evolving platform (Nouvia OS) that accumulates IP across engagements. No direct competitor combines solo AI-augmented delivery, outcome-based pricing, an adoption guarantee, and reusable platform components. The main competitive risks are: (1) boutique agencies matching our agility without our platform overhead, and (2) vertical SaaS platforms being 'good enough' for less complex workflows.",
    strengths: [
      "Self-evolving delivery system (Nouvia OS) \u2014 no competitor has this",
      "AI coworker chain enables solo delivery at team-level output",
      "Adoption guarantee \u2014 unique in the market",
      "Core Components accumulate IP across clients",
      "Speed of delivery \u2014 weeks not months",
    ],
    weaknesses: [
      "Single-person delivery \u2014 capacity ceiling",
      "No brand recognition yet \u2014 requires proof through IVC",
      "Higher cost than SaaS alternatives for simple use cases",
      "No track record beyond IVC",
    ],
    opportunities: [
      "Owner-operated businesses underserved by big consultancies",
      "Construction/manufacturing verticals ripe for AI adoption",
      "Managed platform model creates recurring revenue moat",
      "Cross-client learning library becomes competitive advantage over time",
    ],
    threats: [
      "Boutique agencies could copy the coworker model",
      "Big tech (Microsoft Copilot, Google) making AI accessible without consultants",
      "Economic downturn reducing AI investment budgets",
      "IVC failure would remove only proof point",
    ],
    updated_at: now,
    data_source: "manual",
  };

  return { competitors, matrix, analysis };
}

export function useCompetitiveLandscape() {
  const [competitors, setCompetitors] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load
  useEffect(() => {
    (async () => {
      const data = await getData(STORAGE_KEY);
      // Reseed if missing real competitors (v2 upgrade) or Nouvia self-entry
      const needsReseed = !data || !data.competitors || data.competitors.length === 0
        || !data.competitors.find(c => c.is_self)
        || !data.competitors.find(c => c.name === "Moov AI");
      if (needsReseed) {
        const seed = buildSeedData();
        await setData(STORAGE_KEY, seed);
        setCompetitors(seed.competitors);
        setMatrix(seed.matrix);
        setAnalysis(seed.analysis);
      } else {
        setCompetitors(data.competitors || []);
        setMatrix(data.matrix || {});
        setAnalysis(data.analysis || null);
      }
      setLoading(false);
    })();
  }, []);

  const save = useCallback(async (c, m, a) => {
    await setData(STORAGE_KEY, { competitors: c, matrix: m, analysis: a });
  }, []);

  const addCompetitor = useCallback(async (comp) => {
    const newComp = { ...comp, id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const newComps = [...competitors, newComp];
    const newMatrix = { ...matrix, [newComp.id]: {} };
    COMPARISON_DIMENSIONS.forEach(d => { newMatrix[newComp.id][d.id] = { status: "unknown", notes: "" }; });
    setCompetitors(newComps);
    setMatrix(newMatrix);
    await save(newComps, newMatrix, analysis);
    return newComp;
  }, [competitors, matrix, analysis, save]);

  const updateCompetitor = useCallback(async (id, updates) => {
    const newComps = competitors.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
    setCompetitors(newComps);
    await save(newComps, matrix, analysis);
  }, [competitors, matrix, analysis, save]);

  const deleteCompetitor = useCallback(async (id) => {
    const newComps = competitors.filter(c => c.id !== id);
    const newMatrix = { ...matrix };
    delete newMatrix[id];
    setCompetitors(newComps);
    setMatrix(newMatrix);
    await save(newComps, newMatrix, analysis);
  }, [competitors, matrix, analysis, save]);

  const updateMatrixCell = useCallback(async (compId, dimId, status, notes) => {
    const newMatrix = { ...matrix, [compId]: { ...matrix[compId], [dimId]: { status, notes: notes || "" } } };
    setMatrix(newMatrix);
    await save(competitors, newMatrix, analysis);
  }, [competitors, matrix, analysis, save]);

  const updateAnalysis = useCallback(async (updates) => {
    const newAnalysis = { ...analysis, ...updates, updated_at: new Date().toISOString() };
    setAnalysis(newAnalysis);
    await save(competitors, matrix, newAnalysis);
  }, [competitors, matrix, analysis, save]);

  const updatePosition = useCallback(async (compId, matrixId, x, y) => {
    const newComps = competitors.map(c =>
      c.id === compId
        ? { ...c, matrix_positions: { ...(c.matrix_positions || {}), [matrixId]: { x, y } }, updated_at: new Date().toISOString() }
        : c
    );
    setCompetitors(newComps);
    await save(newComps, matrix, analysis);
  }, [competitors, matrix, analysis, save]);

  // Compute gap analysis from matrix
  const gapAnalysis = competitors.length > 0 ? COMPARISON_DIMENSIONS.map(dim => {
    const cells = competitors.map(c => ({
      competitor: c.name,
      ...((matrix[c.id] && matrix[c.id][dim.id]) || { status: "unknown", notes: "" }),
    }));
    const disadvantages = cells.filter(c => c.status === "disadvantage");
    const advantages = cells.filter(c => c.status === "advantage");
    return {
      dimension: dim,
      cells,
      disadvantageCount: disadvantages.length,
      advantageCount: advantages.length,
      status: disadvantages.length > advantages.length ? "gap" : advantages.length > 0 ? "strong" : "neutral",
    };
  }) : [];

  return {
    competitors,
    matrix,
    analysis,
    gapAnalysis,
    loading,
    addCompetitor,
    updateCompetitor,
    deleteCompetitor,
    updateMatrixCell,
    updateAnalysis,
    updatePosition,
  };
}
