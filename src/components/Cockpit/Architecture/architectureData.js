export const NIP_STATUS = {
  lastUpdated: "2026-03-25",

  studio: {
    label: "Nouvia Studio",
    color: "purple",
    modules: [
      {
        id: "bsi",
        label: "BSI — Business Strategy Intelligence",
        status: "live",
        components: [
          { label: "Canvas", status: "live" },
          { label: "Experiments", status: "live" },
          { label: "Decisions", status: "live" },
          { label: "Trends", status: "live" },
          { label: "Competitive landscape", status: "live" },
        ]
      },
      {
        id: "si",
        label: "SI — Sales Intelligence",
        status: "live",
        components: [
          { label: "Pipeline (Funnel)", status: "live" },
          { label: "Prospect tracking", status: "live" },
          { label: "DEI methodology", status: "live" },
        ]
      },
      {
        id: "dsi",
        label: "DSI — Delivery System Intelligence",
        status: "building",
        note: "Core OS live. Phase 0 bridge building.",
        components: [
          { label: "Coworker registry", status: "live" },
          { label: "Skills registry", status: "live" },
          { label: "NCC core component registry", status: "live" },
          { label: "Weekly todos + OKRs", status: "live" },
          { label: "Activity feed (audit log)", status: "building" },
          { label: "Ideas queue + quote flow", status: "building" },
          { label: "Pillar manager (SCOR progress)", status: "building" },
          { label: "Requests feed (change + pause)", status: "building" },
          { label: "Backlog manager + admin fields", status: "building" },
          { label: "Health metrics (Sentinel)", status: "planned" },
        ]
      }
    ]
  },

  phase0: {
    label: "Phase 0 — Closed-loop Firestore sync",
    status: "building",
    description: "DSI reads all 6 ivc_* collections in real-time. Ben manages AIMS engagement from Studio. Changes write back to AIMS instantly.",
    syncPairs: [
      { from: "ivc_ideas (client submits)", to: "DSI Ideas Queue", status: "building" },
      { from: "ivc_audit_log (client deletes)", to: "DSI Activity Feed", status: "building" },
      { from: "ivc_backlog (change requests)", to: "DSI Requests Feed", status: "building" },
      { from: "DSI Pillar Manager (Ben updates)", to: "AIMS Command Center", status: "building" },
      { from: "DSI Ideas Queue (Ben quotes)", to: "AIMS Ideas (Quoted status)", status: "building" },
    ]
  },

  aims: {
    label: "AI Management System — AIMS",
    color: "blue",
    modules: [
      {
        id: "command",
        label: "Command Center",
        status: "live",
        components: [
          { label: "Business objectives (goals)", status: "live" },
          { label: "Issues & blockers", status: "live" },
          { label: "SCOR pillar progress (6 pillars)", status: "live" },
          { label: "Ideas & suggestions queue", status: "live" },
          { label: "Contributing factors + legal tooltip", status: "live" },
        ]
      },
      {
        id: "backlog",
        label: "Backlog & Roadmap",
        status: "live",
        components: [
          { label: "Kanban board (5 stages + managed)", status: "live" },
          { label: "Gantt roadmap timeline", status: "live" },
          { label: "Drag-to-reschedule (unlocked items)", status: "live" },
          { label: "Change request flow (locked items)", status: "live" },
          { label: "Backlog effort capacity summary", status: "live" },
          { label: "Managed support column", status: "live" },
          { label: "benTimeHours (admin hidden field)", status: "building" },
          { label: "nccDependencies (admin hidden field)", status: "building" },
        ]
      },
      {
        id: "health",
        label: "Health",
        status: "planned",
        components: [
          { label: "Feature adoption metrics (60-day)", status: "planned" },
          { label: "Incident management + SLA", status: "planned" },
          { label: "System status dashboard", status: "planned" },
          { label: "Sentinel adoption monitoring", status: "planned" },
        ]
      },
      {
        id: "investment",
        label: "Investment",
        status: "planned",
        components: [
          { label: "Spend to date", status: "planned" },
          { label: "ROI against business objectives", status: "planned" },
          { label: "Monthly capacity utilization", status: "planned" },
          { label: "Upcoming commitments", status: "planned" },
        ]
      }
    ]
  },

  aiAgents: [
    { label: "Nouvia Strategist", status: "live", note: "Claude Sonnet 4.6 via MCP" },
    { label: "Blueprint + Forge (Claude Code)", status: "live", note: "Session-driven builds" },
    { label: "Ideas Engine (SCOR gap analysis)", status: "building", note: "Phase 0" },
    { label: "Sentinel (adoption monitoring)", status: "planned", note: "Phase 2" },
  ],

  intelligence: [
    { label: "Layer 1 — 62 books / 7 clusters", status: "live" },
    { label: "Layer 2 — 48 application rules", status: "live" },
    { label: "Layer 3 — IVC client patterns (24)", status: "live" },
    { label: "SCOR manufacturing framework", status: "building", note: "Harvesting in progress" },
    { label: "NCC registry (14 components)", status: "live" },
  ],

  infrastructure: [
    { label: "Firebase Hosting + Firestore", status: "live" },
    { label: "Firebase Auth (Google sign-in)", status: "live" },
    { label: "GCP Cloud Run (MCP server)", status: "live" },
    { label: "GitHub Actions CI/CD", status: "live" },
    { label: "React 19 + Vite 8 + Tailwind", status: "live" },
    { label: "Firestore clientId scoping rules", status: "building" },
    { label: "Blueprint auto-publish pipeline", status: "agentic" },
    { label: "Forge staging + QA gates", status: "agentic" },
    { label: "Multi-client NCC layer", status: "agentic" },
  ]
};
