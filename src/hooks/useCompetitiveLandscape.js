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
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      name: "Traditional IT Consultancies",
      type: "Direct",
      description: "Large firms (Accenture, Deloitte, PwC) offering AI/digital transformation services. High-cost, long timelines, team-based delivery.",
      threat_level: "Medium",
      key_differentiator: "Brand recognition, enterprise relationships, large teams",
      weakness: "Slow delivery, high cost, no self-evolving platform IP, project-based not outcome-based",
      website: null,
      notes: "Nouvia wins on speed, cost, and the self-evolving delivery system. They sell hours; we sell outcomes.",
      matrix_positions: { market_position: { x: 85, y: 65 } },
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      name: "Boutique AI Agencies",
      type: "Direct",
      description: "Small AI shops (5-20 people) building custom AI solutions. Similar size to Nouvia but without the platform approach.",
      threat_level: "High",
      key_differentiator: "Similar agility, lower overhead, custom solutions",
      weakness: "No reusable platform IP, no self-evolving system, no adoption guarantee, rebuild from scratch each engagement",
      website: null,
      notes: "Closest competitive threat. Differentiation is the Nouvia OS (coworkers, skills, core components) and the adoption guarantee.",
      matrix_positions: { market_position: { x: 35, y: 25 } },
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      name: "Vertical SaaS Platforms",
      type: "Adjacent",
      description: "Industry-specific software (e.g., PlanSwift, Bluebeam for construction). Pre-built solutions, subscription model.",
      threat_level: "Low",
      key_differentiator: "Ready-to-use, established user base, lower risk for buyers",
      weakness: "Not customizable, no AI adaptation, can't handle unique client workflows, one-size-fits-all",
      website: null,
      notes: "IVC considered these before Nouvia. They failed because IVC's workflow is too unique. This is our wedge.",
      matrix_positions: { market_position: { x: 55, y: 50 } },
      created_at: now,
      updated_at: now,
    },
    {
      id: uuid(),
      name: "In-House AI Teams",
      type: "Adjacent",
      description: "Companies building AI capabilities internally. Hiring ML engineers, data scientists.",
      threat_level: "Medium",
      key_differentiator: "Deep domain knowledge, full control, no vendor dependency",
      weakness: "Expensive ($150k+ per hire), slow to build, high failure rate, no cross-client learning",
      website: null,
      notes: "Nouvia's pitch: 'We're your AI team, but we bring cross-industry patterns and a platform that gets smarter with every engagement.'",
      matrix_positions: { market_position: { x: 30, y: 30 } },
      created_at: now,
      updated_at: now,
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

  // Seed some known comparisons for Traditional IT Consultancies
  const tradId = competitors[0].id;
  matrix[tradId].pricing = { status: "advantage", notes: "Nouvia: outcome-based pricing. Big firms: hourly/day rates." };
  matrix[tradId].delivery = { status: "advantage", notes: "Nouvia: AI-augmented solo delivery. Big firms: large teams, slow." };
  matrix[tradId].ai_depth = { status: "advantage", notes: "Nouvia: AI-native from day one. Big firms: AI bolted onto legacy." };
  matrix[tradId].self_evolving = { status: "advantage", notes: "Nouvia OS is unique. No equivalent at big firms." };
  matrix[tradId].client_size = { status: "disadvantage", notes: "Big firms handle enterprise. Nouvia targets SMB/mid-market." };

  // Seed comparisons for Boutique AI Agencies
  const boutId = competitors[1].id;
  matrix[boutId].pricing = { status: "parity", notes: "Similar project-based pricing. Nouvia moving to managed platform." };
  matrix[boutId].delivery = { status: "advantage", notes: "AI coworker chain vs. manual coding." };
  matrix[boutId].platform_ip = { status: "advantage", notes: "Nouvia OS accumulates IP. Boutiques rebuild each time." };
  matrix[boutId].adoption_guarantee = { status: "advantage", notes: "Unique to Nouvia. No boutique offers this." };
  matrix[boutId].vertical = { status: "parity", notes: "Both flexible across verticals." };

  // Seed comparisons for Vertical SaaS
  const saasId = competitors[2].id;
  matrix[saasId].pricing = { status: "disadvantage", notes: "SaaS is cheaper per-seat. Nouvia is custom build cost." };
  matrix[saasId].ai_depth = { status: "advantage", notes: "Nouvia: deep AI integration. SaaS: minimal AI features." };
  matrix[saasId].vertical = { status: "parity", notes: "SaaS is vertical-specific. Nouvia builds vertical-specific too." };
  matrix[saasId].self_evolving = { status: "advantage", notes: "SaaS is static. Nouvia's platform learns and evolves." };

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
      // Reseed if missing matrix_positions (CBM upgrade) or Nouvia self-entry
      const needsReseed = !data || !data.competitors || data.competitors.length === 0
        || !data.competitors.find(c => c.is_self)
        || !data.competitors.some(c => c.matrix_positions);
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
