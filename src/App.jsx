import { useState, useEffect, useCallback } from "react";
import { getData, setData } from './storage';
import { auth } from './firebase';
import Navigation from './components/layout/Navigation';
import AppShell from './components/layout/AppShell';
import { useTrackerEvents } from './hooks/useTrackerEvents';
import IPLibraryTab    from './tabs/IPLibraryTab';
import DashboardTab    from './tabs/DashboardTab';
import PipelineTab     from './tabs/PipelineTab';
import CompetitiveLandscapeTab from './tabs/CompetitiveLandscapeTab';
import GoalManagement  from './components/Goals/GoalManagement';
import NIPArchitecture from './components/Cockpit/Architecture/NIPArchitecture';
import DSIShell from './components/Cockpit/DSI/DSIShell';
import MasterBacklog from './components/Cockpit/MasterBacklog/MasterBacklog';
import useAdoptionScores from './hooks/useAdoptionScores';
import { NASDetail, NASEditForm } from './components/NAS/NASWidget';
import useRiskAssessments from './hooks/useRiskAssessments';
import { RiskDetail, RiskEditForm } from './components/Risk/RiskWidget';
import useChannels from './hooks/useChannels';
import { ChannelDetail, ChannelEditForm } from './components/Channels/ChannelsWidget';
import useGovernanceQueue from './hooks/useGovernanceQueue';
import { GovernanceDetail } from './components/Governance/GovernanceWidget';

// ─── CONSTANTS ──────────────────────────────────
const STORAGE_KEYS = {
  clients:        "strategist:clients",
  experiments:    "strategist:experiments",
  decisions:      "strategist:decisions",
  trends:         "strategist:trends",
  canvas:         "strategist:canvas",
  coworkers:      "strategist:coworkers",
  skills:         "strategist:skills",
  mcp_connectors: "strategist:mcp_connectors",
};

const ADOPTION_STAGES   = ["Innovator", "Early Adopter", "Chasm", "Early Majority", "Late Majority"];
const EXPERIMENT_STATUS = ["Hypothesis", "Testing", "Validated", "Invalidated", "Pivoted"];
const COWORKER_STATUS   = ["Active", "Needs Update", "Planned", "Gap"];
const SKILL_STATUS      = ["Active", "Needs Update", "Planned", "Gap"];
const CONNECTOR_STATUS  = ["Active", "Degraded", "Offline", "Planned"];

const BMC_BLOCKS = [
  { id: "key_partners",         label: "Key Partners",         short: "KP" },
  { id: "key_activities",       label: "Key Activities",       short: "KA" },
  { id: "key_resources",        label: "Key Resources",        short: "KR" },
  { id: "value_propositions",   label: "Value Propositions",   short: "VP" },
  { id: "customer_relationships",label: "Customer Relationships",short: "CR" },
  { id: "channels",             label: "Channels",             short: "CH" },
  { id: "customer_segments",    label: "Customer Segments",    short: "CS" },
  { id: "cost_structure",       label: "Cost Structure",       short: "CO" },
  { id: "revenue_streams",      label: "Revenue Streams",      short: "RS" },
];

const DEFAULT_CANVAS = {};
BMC_BLOCKS.forEach(b => { DEFAULT_CANVAS[b.id] = []; });

const uuid       = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = (d) => { if (!d) return ""; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const today      = () => new Date().toISOString().split("T")[0];

// ─── STORAGE ────────────────────────────────────
async function loadData(key, fallback = []) {
  const result = await getData(key);
  return result !== null ? result : fallback;
}
async function saveData(key, data) {
  await setData(key, data);
}

// ─── UI PRIMITIVES ──────────────────────────────
function Badge({ children, variant = "default" }) {
  const c = {
    default: "bg-[var(--color-badge-gray-bg)] text-[var(--color-badge-gray-text)]",
    blue:    "bg-[var(--color-badge-blue-bg)] text-[var(--color-badge-blue-text)]",
    green:   "bg-[var(--color-badge-green-bg)] text-[var(--color-badge-green-text)]",
    amber:   "bg-[var(--color-badge-amber-bg)] text-[var(--color-badge-amber-text)]",
    red:     "bg-[var(--color-badge-red-bg)] text-[var(--color-badge-red-text)]",
    purple:  "bg-[var(--color-badge-purple-bg)] text-[var(--color-badge-purple-text)]",
    cyan:    "bg-[var(--color-badge-cyan-bg)] text-[var(--color-badge-cyan-text)]",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c[variant]}`}>{children}</span>;
}

const stageBV      = (s) => ({ Innovator: "purple", "Early Adopter": "blue", Chasm: "red", "Early Majority": "green", "Late Majority": "amber" }[s] || "default");
const statusBV     = (s) => ({ Hypothesis: "default", Testing: "blue", Validated: "green", Invalidated: "red", Pivoted: "amber" }[s] || "default");
const cwStatusBV   = (s) => ({ Active: "green", "Needs Update": "amber", Planned: "blue", Gap: "red" }[s] || "default");
const connStatusBV = (s) => ({ Active: "green", Degraded: "amber", Offline: "red", Planned: "blue" }[s] || "default");

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-[var(--color-text-subtle)]">
      <div className="text-3xl mb-2 opacity-40">{icon}</div>
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)]";
const sel = inp + " appearance-none";
const ta  = inp + " resize-none";

function Btn({ children, primary, onClick, small, className = "" }) {
  const base  = small ? "text-xs px-3 py-1 rounded-lg" : "text-sm py-2 rounded-lg flex-1";
  const style = primary
    ? "bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] font-medium hover:bg-[var(--color-btn-primary-hover)]"
    : "bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]";
  return <button onClick={onClick} className={`${base} ${style} transition-colors ${className}`}>{children}</button>;
}

// ─── NIP SECTIONS ───────────────────────────────
const NIP_SECTIONS = [
  {
    id: "cockpit", label: "Nouvia Studio", icon: "◈",
    subTabs: [
      { id: "master_backlog", label: "Master Backlog", icon: "▣" },
      { id: "overview",       label: "Dashboard",      icon: "◈" },
      { id: "architecture",   label: "Architecture",   icon: "⬡" },
    ],
  },
  {
    id: "bsp", label: "BSI", icon: "▣",
    subTabs: [
      { id: "canvas",      label: "Canvas",      icon: "▣" },
      { id: "experiments", label: "Experiments", icon: "△" },
      { id: "decisions",   label: "Decisions",   icon: "◆" },
      { id: "trends",      label: "Trends",      icon: "〜" },
      { id: "competitive", label: "Competitive",  icon: "⚔" },
    ],
  },
  {
    id: "funnel", label: "SI", icon: "◉",
    subTabs: [
      { id: "clients",  label: "Clients",  icon: "◉" },
      { id: "pipeline", label: "Pipeline", icon: "📊" },
    ],
  },
  {
    id: "os", label: "DSI", icon: "⚙",
    subTabs: [
      { id: "dsi_intel",   label: "Client Intelligence", icon: "◉" },
      { id: "coworkers",   label: "Coworkers",  icon: "⚙" },
      { id: "skills",      label: "Skills",     icon: "◇" },
      { id: "connectors",  label: "Connectors", icon: "◈" },
      { id: "ip_library",  label: "IP Library", icon: "◎" },
    ],
  },
];

// ─── CLIENTS ────────────────────────────────────
function ClientForm({ onSave, onCancel, initial }) {
  const [f, sF] = useState(initial || { name: "", industry: "", adoptionStage: "Early Adopter", notes: "" });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Client Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. IVC" /></Field>
      <Field label="Industry"><input className={inp} value={f.industry} onChange={e => s("industry", e.target.value)} placeholder="e.g. Pharmacy / Retail" /></Field>
      <Field label="Adoption Stage"><select className={sel} value={f.adoptionStage} onChange={e => s("adoptionStage", e.target.value)}>{ADOPTION_STAGES.map(st => <option key={st}>{st}</option>)}</select></Field>
      <Field label="Notes"><textarea className={ta} rows={3} value={f.notes} onChange={e => s("notes", e.target.value)} placeholder="Key context..." /></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function ClientNoteForm({ onSave, onCancel }) {
  const [f, sF] = useState({ content: "", insights: "", nextSteps: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Date"><input type="date" className={inp} value={f.date} onChange={e => s("date", e.target.value)} /></Field>
      <Field label="Meeting Notes"><textarea className={ta} rows={4} value={f.content} onChange={e => s("content", e.target.value)} placeholder="What happened?" /></Field>
      <Field label="Key Insights"><textarea className={ta} rows={3} value={f.insights} onChange={e => s("insights", e.target.value)} placeholder="What did you learn?" /></Field>
      <Field label="Next Steps"><textarea className={ta} rows={2} value={f.nextSteps} onChange={e => s("nextSteps", e.target.value)} placeholder="Actions..." /></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Add Note</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function ClientDetail({ client, onAddNote, onBack, onUpdateStage }) {
  const [show, setShow] = useState(false);
  const notes = client.entries || [];
  return (
    <div>
      <button onClick={onBack} className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text-secondary)] mb-4">← All Clients</button>
      <div className="flex items-start justify-between mb-4">
        <div><h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{client.name}</h3><p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{client.industry}</p></div>
        <select className="bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)]" value={client.adoptionStage} onChange={e => onUpdateStage(e.target.value)}>
          {ADOPTION_STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {client.notes && <p className="text-sm text-[var(--color-text-muted)] mb-4 italic">"{client.notes}"</p>}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Meeting Notes</h4>
        <Btn small primary onClick={() => setShow(true)}>+ Add Note</Btn>
      </div>
      {show && <div className="mb-4 p-3 rounded-lg border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><ClientNoteForm onSave={n => { onAddNote(n); setShow(false); }} onCancel={() => setShow(false)} /></div>}
      {notes.length === 0 && <p className="text-sm text-[var(--color-text-ghost)] py-6 text-center">No notes yet.</p>}
      {[...notes].reverse().map((n, i) => (
        <div key={i} className="mb-3 p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
          <p className="text-xs text-[var(--color-text-subtle)] mb-2">{formatDate(n.date)}</p>
          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{n.content}</p>
          {n.insights  && <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]"><p className="text-xs text-[var(--color-text-subtle)] font-medium mb-0.5">Insights</p><p className="text-sm text-[var(--color-text-muted)]">{n.insights}</p></div>}
          {n.nextSteps && <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]"><p className="text-xs text-[var(--color-text-subtle)] font-medium mb-0.5">Next Steps</p><p className="text-sm text-[var(--color-text-muted)]">{n.nextSteps}</p></div>}
        </div>
      ))}
    </div>
  );
}

function ClientsTab({ clients, setClients, saveClients, track }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const add = (f) => { const id = uuid(); const u = [...clients, { ...f, id, entries: [], createdAt: today() }]; setClients(u); saveClients(u); setShowForm(false); track('item_added', { tab: 'clients', entity_type: 'client', entity_id: id }); };
  const addNote = (cid, n) => { const u = clients.map(c => c.id === cid ? { ...c, entries: [...(c.entries || []), { ...n, id: uuid() }] } : c); setClients(u); saveClients(u); setSelected(u.find(c => c.id === cid)); track('item_added', { tab: 'clients', entity_type: 'client_note', entity_id: cid }); };
  const updStage = (cid, st) => { const u = clients.map(c => c.id === cid ? { ...c, adoptionStage: st } : c); setClients(u); saveClients(u); setSelected(u.find(c => c.id === cid)); track('status_changed', { tab: 'clients', entity_type: 'client', entity_id: cid, metadata: { to_status: st } }); };
  if (selected) return <ClientDetail client={selected} onBack={() => setSelected(null)} onAddNote={n => addNote(selected.id, n)} onUpdateStage={s => updStage(selected.id, s)} />;
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Client Intel</h2><Btn small primary onClick={() => setShowForm(true)}>+ New Client</Btn></div>
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><ClientForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {clients.length === 0 && !showForm && <EmptyState icon="◉" title="No clients yet" subtitle="Add your first client" />}
      <div className="space-y-2">
        {clients.map(c => (
          <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left p-3 rounded-lg border border-[var(--color-border-default)] hover:border-[var(--color-border-muted)] transition-all" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between">
              <div><span className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</span><span className="text-xs text-[var(--color-text-ghost)] ml-2">{c.industry}</span></div>
              <div className="flex items-center gap-2"><Badge variant={stageBV(c.adoptionStage)}>{c.adoptionStage}</Badge><span className="text-xs text-[var(--color-text-ghost)]">{(c.entries||[]).length} notes</span></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── EXPERIMENTS ────────────────────────────────
function ExperimentForm({ onSave, onCancel }) {
  const [f, sF] = useState({ hypothesis: "", status: "Hypothesis", metric: "", description: "", canvasBlocks: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Hypothesis"><input className={inp} value={f.hypothesis} onChange={e => s("hypothesis", e.target.value)} placeholder="We believe that..." /></Field>
      <Field label="Description"><textarea className={ta} rows={2} value={f.description} onChange={e => s("description", e.target.value)} placeholder="What we're testing..." /></Field>
      <Field label="Success Metric"><input className={inp} value={f.metric} onChange={e => s("metric", e.target.value)} placeholder="How will we know?" /></Field>
      <Field label="Canvas Blocks Affected"><input className={inp} value={f.canvasBlocks} onChange={e => s("canvasBlocks", e.target.value)} placeholder="e.g. Value Propositions, Revenue Streams" /></Field>
      <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{EXPERIMENT_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function ExperimentsTab({ experiments, setExperiments, saveExperiments, track }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const add = (f) => { const id = uuid(); const u = [...experiments, { ...f, id }]; setExperiments(u); saveExperiments(u); setShowForm(false); track('item_added', { tab: 'experiments', entity_type: 'experiment', entity_id: id }); };
  const updStatus = (id, st) => { const u = experiments.map(e => e.id === id ? { ...e, status: st } : e); setExperiments(u); saveExperiments(u); track('status_changed', { tab: 'experiments', entity_type: 'experiment', entity_id: id, metadata: { to_status: st } }); };
  const updResult = (id, r) => { const u = experiments.map(e => e.id === id ? { ...e, result: r } : e); setExperiments(u); saveExperiments(u); setEditId(null); track('item_added', { tab: 'experiments', entity_type: 'experiment_result', entity_id: id }); };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Experiments</h2><Btn small primary onClick={() => setShowForm(true)}>+ New Experiment</Btn></div>
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><ExperimentForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {experiments.length === 0 && !showForm && <EmptyState icon="△" title="No experiments yet" subtitle="Track Build-Measure-Learn cycles" />}
      <div className="space-y-2">
        {[...experiments].reverse().map(exp => (
          <div key={exp.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] flex-1 pr-3">{exp.hypothesis}</p>
              <select className="bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] flex-shrink-0" value={exp.status} onChange={e => updStatus(exp.id, e.target.value)}>{EXPERIMENT_STATUS.map(st => <option key={st}>{st}</option>)}</select>
            </div>
            {exp.description && <p className="text-xs text-[var(--color-text-subtle)] mb-1">{exp.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant={statusBV(exp.status)}>{exp.status}</Badge>
              {exp.metric      && <span className="text-xs text-[var(--color-text-ghost)]">Metric: {exp.metric}</span>}
              {exp.canvasBlocks && <span className="text-xs text-[var(--color-badge-cyan-text)]">Canvas: {exp.canvasBlocks}</span>}
              <span className="text-xs text-[var(--color-text-ghost)]">{formatDate(exp.date)}</span>
            </div>
            {exp.result && <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]"><p className="text-xs text-[var(--color-text-subtle)] font-medium mb-0.5">Result</p><p className="text-sm text-[var(--color-text-muted)]">{exp.result}</p></div>}
            {editId === exp.id
              ? <div className="mt-2"><textarea className={ta} rows={2} defaultValue={exp.result||""} placeholder="What did we learn?" onBlur={e => updResult(exp.id, e.target.value)} autoFocus /></div>
              : <button onClick={() => setEditId(exp.id)} className="text-xs text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] mt-1">{exp.result ? "Edit result" : "+ Add result"}</button>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DECISIONS ──────────────────────────────────
function DecisionForm({ onSave, onCancel }) {
  const [f, sF] = useState({ topic: "", decision: "", reasoning: "", frameworks: "", canvasBlocks: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Topic"><input className={inp} value={f.topic} onChange={e => s("topic", e.target.value)} placeholder="e.g. Pricing model change" /></Field>
      <Field label="Decision"><textarea className={ta} rows={2} value={f.decision} onChange={e => s("decision", e.target.value)} placeholder="What did we decide?" /></Field>
      <Field label="Reasoning"><textarea className={ta} rows={3} value={f.reasoning} onChange={e => s("reasoning", e.target.value)} placeholder="Why? What evidence?" /></Field>
      <Field label="Frameworks Applied"><input className={inp} value={f.frameworks} onChange={e => s("frameworks", e.target.value)} placeholder="e.g. Zero to One, BMC" /></Field>
      <Field label="Canvas Blocks Affected"><input className={inp} value={f.canvasBlocks} onChange={e => s("canvasBlocks", e.target.value)} placeholder="e.g. Revenue Streams, Value Propositions" /></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function DecisionsTab({ decisions, setDecisions, saveDecisions }) {
  const [showForm, setShowForm] = useState(false);
  const add = (f) => { const u = [...decisions, { ...f, id: uuid() }]; setDecisions(u); saveDecisions(u); setShowForm(false); };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Strategic Decisions</h2><Btn small primary onClick={() => setShowForm(true)}>+ Log Decision</Btn></div>
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><DecisionForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {decisions.length === 0 && !showForm && <EmptyState icon="◆" title="No decisions logged" subtitle="Record decisions and reasoning" />}
      <div className="space-y-2">
        {[...decisions].reverse().map(d => (
          <div key={d.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold text-[var(--color-text-primary)]">{d.topic}</p><span className="text-xs text-[var(--color-text-ghost)]">{formatDate(d.date)}</span></div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">{d.decision}</p>
            {d.reasoning && <p className="text-xs text-[var(--color-text-subtle)] mt-1">{d.reasoning}</p>}
            <div className="mt-2 flex gap-1 flex-wrap">
              {d.frameworks  && d.frameworks.split(",").map((f, i)  => <Badge key={i}      variant="purple">{f.trim()}</Badge>)}
              {d.canvasBlocks && d.canvasBlocks.split(",").map((b, i) => <Badge key={"c"+i} variant="cyan">{b.trim()}</Badge>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TRENDS ─────────────────────────────────────
function TrendForm({ onSave, onCancel }) {
  const [f, sF] = useState({ observation: "", implications: "", source: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Observation"><textarea className={ta} rows={3} value={f.observation} onChange={e => s("observation", e.target.value)} placeholder="What did you notice?" /></Field>
      <Field label="Implications for Nouvia"><textarea className={ta} rows={2} value={f.implications} onChange={e => s("implications", e.target.value)} placeholder="What does this mean?" /></Field>
      <Field label="Source"><input className={inp} value={f.source} onChange={e => s("source", e.target.value)} placeholder="IVC meeting, news, etc." /></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function TrendsTab({ trends, setTrends, saveTrends }) {
  const [showForm, setShowForm] = useState(false);
  const add = (f) => { const u = [...trends, { ...f, id: uuid() }]; setTrends(u); saveTrends(u); setShowForm(false); };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Industry Trends</h2><Btn small primary onClick={() => setShowForm(true)}>+ Log Trend</Btn></div>
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><TrendForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {trends.length === 0 && !showForm && <EmptyState icon="〜" title="No trends logged" subtitle="Track market signals" />}
      <div className="space-y-2">
        {[...trends].reverse().map(t => (
          <div key={t.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-[var(--color-text-primary)]">{t.observation}</p><span className="text-xs text-[var(--color-text-ghost)] flex-shrink-0 ml-2">{formatDate(t.date)}</span></div>
            {t.implications && <p className="text-xs text-[var(--color-text-subtle)] mt-1">→ {t.implications}</p>}
            {t.source       && <p className="text-xs text-[var(--color-text-ghost)] mt-1">Source: {t.source}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BUSINESS MODEL CANVAS ──────────────────────
const GRID_LAYOUT = {
  key_partners:           { gridColumn: "1 / 3",  gridRow: "1 / 3" },
  key_activities:         { gridColumn: "3 / 5",  gridRow: "1 / 2" },
  key_resources:          { gridColumn: "3 / 5",  gridRow: "2 / 3" },
  value_propositions:     { gridColumn: "5 / 7",  gridRow: "1 / 3" },
  customer_relationships: { gridColumn: "7 / 9",  gridRow: "1 / 2" },
  channels:               { gridColumn: "7 / 9",  gridRow: "2 / 3" },
  customer_segments:      { gridColumn: "9 / 11", gridRow: "1 / 3" },
  cost_structure:         { gridColumn: "1 / 6",  gridRow: "3 / 4" },
  revenue_streams:        { gridColumn: "6 / 11", gridRow: "3 / 4" },
};

const BLOCK_COLORS = {
  key_partners:           "border-zinc-600",
  key_activities:         "border-blue-800",
  key_resources:          "border-blue-800",
  value_propositions:     "border-emerald-800",
  customer_relationships: "border-amber-800",
  channels:               "border-amber-800",
  customer_segments:      "border-amber-800",
  cost_structure:         "border-red-900",
  revenue_streams:        "border-purple-800",
};

const HEADER_COLORS = {
  key_partners:           "text-zinc-400",
  key_activities:         "text-blue-400",
  key_resources:          "text-blue-400",
  value_propositions:     "text-emerald-400",
  customer_relationships: "text-amber-400",
  channels:               "text-amber-400",
  customer_segments:      "text-amber-400",
  cost_structure:         "text-red-400",
  revenue_streams:        "text-purple-400",
};

function CanvasBlock({ block, items, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const handleAdd = () => { if (text.trim()) { onAdd(text.trim()); setText(""); setAdding(false); } };
  return (
    <div className={`border ${BLOCK_COLORS[block.id]} rounded-lg p-2.5 flex flex-col min-h-0 overflow-hidden`} style={{ ...GRID_LAYOUT[block.id], backgroundColor: "var(--color-bg-elevated)" }}>
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex-shrink-0 ${HEADER_COLORS[block.id]}`}>{block.label}</h4>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-1">
            <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">• {item}</span>
            <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-ghost)] hover:text-red-400 text-xs flex-shrink-0 transition-opacity">×</button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="mt-1.5 flex-shrink-0">
          <input className="w-full bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-ghost)] focus:outline-none focus:border-[var(--color-border-strong)]"
            value={text} onChange={e => setText(e.target.value)} placeholder="Add item..." autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            onBlur={() => { if (!text.trim()) setAdding(false); }}
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-1.5 flex-shrink-0 text-xs text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] text-left transition-colors">+ add</button>
      )}
    </div>
  );
}

function CanvasTab({ canvas, setCanvas, saveCanvas }) {
  const addItem    = (bid, text) => { const u = { ...canvas, [bid]: [...(canvas[bid] || []), text] }; setCanvas(u); saveCanvas(u); };
  const removeItem = (bid, idx)  => { const u = { ...canvas, [bid]: (canvas[bid] || []).filter((_, i) => i !== idx) }; setCanvas(u); saveCanvas(u); };
  const totalItems = Object.values(canvas).reduce((s, a) => s + (a || []).length, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Business Model Canvas</h2>
          <p className="text-xs text-[var(--color-text-ghost)] mt-0.5">Nouvia's living strategic blueprint — {totalItems} items across {BMC_BLOCKS.filter(b => (canvas[b.id]||[]).length > 0).length}/9 blocks</p>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "minmax(160px, 1fr) minmax(160px, 1fr) minmax(110px, auto)" }}>
        {BMC_BLOCKS.map(block => <CanvasBlock key={block.id} block={block} items={canvas[block.id] || []} onAdd={text => addItem(block.id, text)} onRemove={idx => removeItem(block.id, idx)} />)}
      </div>
      <p className="text-xs text-[var(--color-text-ghost)] mt-3 text-center">Click "+ add" in any block. Hover items to remove. All changes persist across sessions.</p>
    </div>
  );
}

// ─── COWORKERS PANE ─────────────────────────────
function CoworkerForm({ onSave, onCancel }) {
  const [f, sF] = useState({ name: "", purpose: "", status: "Active", keyActivities: "", skills: "", notes: "" });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Coworker Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Compass, Forge..." /></Field>
      <Field label="Purpose"><textarea className={ta} rows={2} value={f.purpose} onChange={e => s("purpose", e.target.value)} placeholder="What does this coworker do?" /></Field>
      <Field label="Key Activities Served"><input className={inp} value={f.keyActivities} onChange={e => s("keyActivities", e.target.value)} placeholder="e.g. Client consulting, AI platform dev..." /></Field>
      <Field label="Skills Used"><input className={inp} value={f.skills} onChange={e => s("skills", e.target.value)} placeholder="e.g. business-strategist, nouvia-estimation..." /></Field>
      <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{COWORKER_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
      <Field label="Notes"><textarea className={ta} rows={2} value={f.notes} onChange={e => s("notes", e.target.value)} /></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function CoworkersPane({ coworkers, setCoworkers, saveCoworkers, canvas }) {
  const [showForm, setShowForm] = useState(false);
  const add      = (f)      => { const u = [...coworkers, { ...f, id: uuid() }]; setCoworkers(u); saveCoworkers(u); setShowForm(false); };
  const updStatus = (id, st) => { const u = coworkers.map(c => c.id === id ? { ...c, status: st } : c); setCoworkers(u); saveCoworkers(u); };
  const remove   = (id)     => { const u = coworkers.filter(c => c.id !== id); setCoworkers(u); saveCoworkers(u); };
  const canvasActivities = canvas.key_activities || [];
  const toArr = (v) => Array.isArray(v) ? v : (v || "").split(",").map(s => s.trim()).filter(Boolean);
  const coveredSet = coworkers.filter(c => c.status === "Active").flatMap(c => toArr(c.canvasActivities || c.keyActivities).map(a => a.toLowerCase())).filter(Boolean);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-ghost)]">{coworkers.length} registered · {coworkers.filter(c => c.status === "Gap").length} gaps</p>
        </div>
        <Btn small primary onClick={() => setShowForm(true)}>+ Register Coworker</Btn>
      </div>
      {canvasActivities.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Key Activities Coverage</p>
          <div className="space-y-1">
            {canvasActivities.map((a, i) => {
              const hit = coveredSet.some(ca => a.toLowerCase().includes(ca) || ca.includes(a.toLowerCase()));
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hit ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className={`text-xs ${hit ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)] font-medium"}`}>{a}</span>
                  {!hit && <span className="text-xs text-red-400/70">— gap</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><CoworkerForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {coworkers.length === 0 && !showForm && <EmptyState icon="⚙" title="No coworkers registered" subtitle="Map your Claude coworkers to the business model" />}
      <div className="space-y-2">
        {coworkers.map(cw => (
          <div key={cw.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{cw.name}</span>
                <select className="bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]" value={cw.status} onChange={e => updStatus(cw.id, e.target.value)}>{COWORKER_STATUS.map(st => <option key={st}>{st}</option>)}</select>
              </div>
              <button onClick={() => remove(cw.id)} className="text-xs text-[var(--color-text-ghost)] hover:text-red-400 transition-colors">remove</button>
            </div>
            {(cw.purpose || cw.role) && <p className="text-xs text-[var(--color-text-muted)] mb-1">{cw.purpose || cw.role}</p>}
            <div className="flex gap-1 flex-wrap mt-1.5">
              <Badge variant={cwStatusBV(cw.status)}>{cw.status}</Badge>
              {toArr(cw.canvasActivities || cw.keyActivities).map((a, i) => <Badge key={i} variant="cyan">{a}</Badge>)}
              {toArr(cw.skills).map((sk, i) => <Badge key={"s"+i} variant="purple">{sk}</Badge>)}
            </div>
            {cw.notes && <p className="text-xs text-[var(--color-text-ghost)] mt-1.5">{cw.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SKILLS PANE ────────────────────────────────
function SkillForm({ onSave, onCancel }) {
  const [f, sF] = useState({ name: "", description: "", status: "Active", coworkers: "", skillFilePath: "", version: "" });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Skill Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. business-strategist, frontend-design" /></Field>
      <Field label="Description"><textarea className={ta} rows={3} value={f.description} onChange={e => s("description", e.target.value)} placeholder="What does this skill do and when is it used?" /></Field>
      <Field label="Coworkers Using This Skill"><input className={inp} value={f.coworkers} onChange={e => s("coworkers", e.target.value)} placeholder="e.g. Compass, Forge, Blueprint" /></Field>
      <Field label="Skill File Path"><input className={inp} value={f.skillFilePath} onChange={e => s("skillFilePath", e.target.value)} placeholder="e.g. /mnt/skills/user/business-strategist/SKILL.md" /></Field>
      <Field label="Version / Last Updated"><input className={inp} value={f.version} onChange={e => s("version", e.target.value)} placeholder="e.g. v1.0, 2026-03-19" /></Field>
      <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{SKILL_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function SkillsPane({ skills, setSkills, saveSkills }) {
  const [showForm, setShowForm] = useState(false);
  const add       = (f)      => { const u = [...skills, { ...f, id: uuid(), createdAt: today() }]; setSkills(u); saveSkills(u); setShowForm(false); };
  const updStatus = (id, st) => { const u = skills.map(sk => sk.id === id ? { ...sk, status: st } : sk); setSkills(u); saveSkills(u); };
  const remove    = (id)     => { const u = skills.filter(sk => sk.id !== id); setSkills(u); saveSkills(u); };
  const gaps = skills.filter(sk => sk.status === "Gap").length;
  const needsUpdate = skills.filter(sk => sk.status === "Needs Update").length;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-ghost)]">
            {skills.length} registered
            {gaps > 0        ? ` · ${gaps} gaps`             : ""}
            {needsUpdate > 0 ? ` · ${needsUpdate} need update` : ""}
          </p>
        </div>
        <Btn small primary onClick={() => setShowForm(true)}>+ Register Skill</Btn>
      </div>
      {gaps > 0 && (
        <div className="mb-3 p-3 bg-red-900/20 rounded-lg border border-red-800/30">
          <p className="text-xs font-semibold text-red-400 mb-1">Skills with Gap status</p>
          {skills.filter(sk => sk.status === "Gap").map(sk => (
            <p key={sk.id} className="text-xs text-red-300/70">{sk.name}{sk.description ? ` — ${sk.description.substring(0, 60)}...` : ""}</p>
          ))}
        </div>
      )}
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><SkillForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {skills.length === 0 && !showForm && <EmptyState icon="◈" title="No skills registered" subtitle="Register Claude skills (SKILL.md files) and their status" />}
      <div className="space-y-2">
        {skills.map(sk => (
          <div key={sk.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{sk.name}</span>
                <select className="bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]" value={sk.status} onChange={e => updStatus(sk.id, e.target.value)}>{SKILL_STATUS.map(st => <option key={st}>{st}</option>)}</select>
              </div>
              <button onClick={() => remove(sk.id)} className="text-xs text-[var(--color-text-ghost)] hover:text-red-400 transition-colors">remove</button>
            </div>
            {sk.description && <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{sk.description}</p>}
            <div className="flex gap-1 flex-wrap mt-1">
              <Badge variant={cwStatusBV(sk.status)}>{sk.status}</Badge>
              {sk.coworkers && (Array.isArray(sk.coworkers) ? sk.coworkers : sk.coworkers.split(",")).map((c, i) => <Badge key={i} variant="cyan">{typeof c === 'string' ? c.trim() : c}</Badge>)}
              {sk.version   && <Badge variant="default">{sk.version}</Badge>}
            </div>
            {sk.skillFilePath && <p className="text-xs text-[var(--color-text-ghost)] mt-1.5 font-mono truncate">{sk.skillFilePath}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONNECTORS PANE ────────────────────────────
function ConnectorForm({ onSave, onCancel }) {
  const [f, sF] = useState({ name: "", url: "", status: "Active", description: "", toolsCount: "", connectedCoworkers: "", lastVerified: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <Field label="Connector Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Gmail, Google Calendar, Nouvia Strategist" /></Field>
      <Field label="MCP Server URL"><input className={inp} value={f.url} onChange={e => s("url", e.target.value)} placeholder="e.g. https://gmail.mcp.claude.com/mcp" /></Field>
      <Field label="Description"><textarea className={ta} rows={2} value={f.description} onChange={e => s("description", e.target.value)} placeholder="What does this connector enable?" /></Field>
      <Field label="Number of Tools Exposed"><input className={inp} type="number" value={f.toolsCount} onChange={e => s("toolsCount", e.target.value)} placeholder="e.g. 7" /></Field>
      <Field label="Connected Coworkers"><input className={inp} value={f.connectedCoworkers} onChange={e => s("connectedCoworkers", e.target.value)} placeholder="e.g. Nouvia Strategist, Compass" /></Field>
      <Field label="Last Verified"><input type="date" className={inp} value={f.lastVerified} onChange={e => s("lastVerified", e.target.value)} /></Field>
      <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{CONNECTOR_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
      <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
    </div>
  );
}

function ConnectorsPane({ connectors, setConnectors, saveConnectors }) {
  const [showForm, setShowForm] = useState(false);
  const add       = (f)      => { const u = [...connectors, { ...f, id: uuid(), createdAt: today() }]; setConnectors(u); saveConnectors(u); setShowForm(false); };
  const updStatus = (id, st) => { const u = connectors.map(c => c.id === id ? { ...c, status: st } : c); setConnectors(u); saveConnectors(u); };
  const remove    = (id)     => { const u = connectors.filter(c => c.id !== id); setConnectors(u); saveConnectors(u); };
  const issues = connectors.filter(c => c.status === "Degraded" || c.status === "Offline");
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-ghost)]">
            {connectors.length} registered
            {issues.length > 0 ? ` · ${issues.length} need attention` : ""}
          </p>
        </div>
        <Btn small primary onClick={() => setShowForm(true)}>+ Register Connector</Btn>
      </div>
      {issues.length > 0 && (
        <div className="mb-3 p-3 bg-amber-900/20 rounded-lg border border-amber-800/30">
          <p className="text-xs font-semibold text-amber-400 mb-1">⚠ Connectors Needing Attention</p>
          {issues.map(c => <p key={c.id} className="text-xs text-amber-300/70">{c.name} — {c.status}</p>)}
        </div>
      )}
      {showForm && <div className="mb-4 p-4 rounded-xl border border-[var(--color-border-muted)]" style={{ backgroundColor: "var(--color-bg-overlay)" }}><ConnectorForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
      {connectors.length === 0 && !showForm && <EmptyState icon="⟳" title="No connectors registered" subtitle="Track your MCP server connections and their status" />}
      <div className="space-y-2">
        {connectors.map(cn => (
          <div key={cn.id} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{cn.name}</span>
                <select className="bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]" value={cn.status} onChange={e => updStatus(cn.id, e.target.value)}>{CONNECTOR_STATUS.map(st => <option key={st}>{st}</option>)}</select>
              </div>
              <button onClick={() => remove(cn.id)} className="text-xs text-[var(--color-text-ghost)] hover:text-red-400 transition-colors">remove</button>
            </div>
            {cn.description && <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{cn.description}</p>}
            {cn.url         && <p className="text-xs text-[var(--color-text-ghost)] font-mono mb-1.5 truncate">{cn.url}</p>}
            <div className="flex gap-1 flex-wrap mt-1">
              <Badge variant={connStatusBV(cn.status)}>{cn.status}</Badge>
              {cn.toolsCount          && <Badge variant="default">{cn.toolsCount} tools</Badge>}
              {cn.connectedCoworkers  && cn.connectedCoworkers.split(",").map((c, i) => <Badge key={i} variant="cyan">{c.trim()}</Badge>)}
            </div>
            {cn.lastVerified && <p className="text-xs text-[var(--color-text-ghost)] mt-1.5">Last verified: {formatDate(cn.lastVerified)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COWORKERS TAB (container with sub-nav) ─────
const COWORKER_SUB_TABS = [
  { id: "coworkers",  label: "Coworkers",  icon: "⚙" },
  { id: "skills",     label: "Skills",     icon: "◈" },
  { id: "connectors", label: "Connectors", icon: "⟳" },
];

function CoworkersTab({ coworkers, setCoworkers, saveCoworkers, canvas, skills, setSkills, saveSkills, connectors, setConnectors, saveConnectors }) {
  const [subTab, setSubTab] = useState("coworkers");
  return (
    <div>
      {/* Sub-nav */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Coworker Registry</h2>
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: "var(--color-bg-overlay)" }}>
          {COWORKER_SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${subTab === t.id ? "bg-[var(--color-bg-sunken)] text-[var(--color-text-primary)]" : "text-[var(--color-text-subtle)] hover:text-[var(--color-text-secondary)]"}`}>
              <span className="mr-1 opacity-70">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>
      {subTab === "coworkers"  && <CoworkersPane  coworkers={coworkers}   setCoworkers={setCoworkers}   saveCoworkers={saveCoworkers}   canvas={canvas} />}
      {subTab === "skills"     && <SkillsPane     skills={skills}         setSkills={setSkills}         saveSkills={saveSkills} />}
      {subTab === "connectors" && <ConnectorsPane connectors={connectors} setConnectors={setConnectors} saveConnectors={saveConnectors} />}
    </div>
  );
}

// ─── DASHBOARD ──────────────────────────────────
function Dashboard({ clients, experiments, decisions, trends, canvas, coworkers, skills, connectors, setTab }) {
  const activeExp   = experiments.filter(e => e.status === "Testing" || e.status === "Hypothesis");
  const canvasItems = Object.values(canvas).reduce((s, a) => s + (a||[]).length, 0);
  const filledBlocks = BMC_BLOCKS.filter(b => (canvas[b.id]||[]).length > 0).length;
  const gaps        = coworkers.filter(c => c.status === "Gap").length;
  const skillGaps   = skills.filter(sk => sk.status === "Gap").length;
  const connIssues  = connectors.filter(c => c.status === "Degraded" || c.status === "Offline").length;
  const allNotes    = clients.flatMap(c => (c.entries || []).map(n => ({ ...n, clientName: c.name })));
  const recentNotes = [...allNotes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  return (
    <div>
      <div className="mb-8"><h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1 tracking-tight">Strategy Dashboard</h2><p className="text-sm text-[var(--color-text-subtle)]">Your living strategic operating system</p></div>
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Clients",     value: clients.length,     icon: "◉", tab: "clients"     },
          { label: "Canvas",      value: canvasItems,        sub: `${filledBlocks}/9 blocks`, icon: "▣", tab: "canvas" },
          { label: "Experiments", value: experiments.length, icon: "△", tab: "experiments" },
          { label: "Coworkers",   value: coworkers.length,   sub: gaps > 0 ? `${gaps} gaps` : null, icon: "⚙", tab: "coworkers" },
        ].map(s => (
          <button key={s.label} onClick={() => setTab(s.tab)} className="rounded-xl p-4 text-center border border-[var(--color-border-default)] hover:border-[var(--color-border-muted)] transition-all group" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="text-lg text-[var(--color-text-subtle)] mb-1.5 group-hover:scale-110 transition-transform">{s.icon}</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{s.value}</div>
            <div className="text-xs text-[var(--color-text-subtle)] mt-0.5 font-medium">{s.label}</div>
            {s.sub && <div className="text-xs text-amber-500/70 mt-1">{s.sub}</div>}
          </button>
        ))}
      </div>
      {/* Infrastructure row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "Skills",     value: skills.length,     sub: skillGaps  > 0 ? `${skillGaps} gaps`    : "all good", icon: "◈", tab: "coworkers", warn: skillGaps  > 0 },
          { label: "Connectors", value: connectors.length, sub: connIssues > 0 ? `${connIssues} issues` : "all green", icon: "⟳", tab: "coworkers", warn: connIssues > 0 },
        ].map(s => (
          <button key={s.label} onClick={() => setTab(s.tab)} className="rounded-xl p-3 text-center border border-[var(--color-border-default)] hover:border-[var(--color-border-muted)] transition-all group flex items-center gap-3 px-4" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
            <div className="text-xl text-[var(--color-text-subtle)] group-hover:scale-110 transition-transform">{s.icon}</div>
            <div className="text-left">
              <div className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums leading-tight">{s.value} <span className="text-sm font-medium text-[var(--color-text-muted)]">{s.label}</span></div>
              <div className={`text-xs mt-0.5 ${s.warn ? "text-amber-500/70" : "text-[var(--color-text-ghost)]"}`}>{s.sub}</div>
            </div>
          </button>
        ))}
      </div>
      {/* Canvas mini-map */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Business Model Canvas</h3><button onClick={() => setTab("canvas")} className="text-xs text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] font-medium">Open canvas →</button></div>
        <div className="grid grid-cols-5 gap-1">
          {BMC_BLOCKS.slice(0, 7).map(b => (
            <div key={b.id} className="p-1.5 rounded text-center border" style={{ backgroundColor: (canvas[b.id]||[]).length > 0 ? "var(--color-bg-overlay)" : "var(--color-bg-elevated)", borderColor: (canvas[b.id]||[]).length > 0 ? "var(--color-border-muted)" : "var(--color-border-default)" }}>
              <div className="text-xs font-bold text-[var(--color-text-subtle)]">{b.short}</div>
              <div className={`text-lg font-bold ${(canvas[b.id]||[]).length > 0 ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-ghost)]"}`}>{(canvas[b.id]||[]).length}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {BMC_BLOCKS.slice(7).map(b => (
            <div key={b.id} className="p-1.5 rounded text-center border" style={{ backgroundColor: (canvas[b.id]||[]).length > 0 ? "var(--color-bg-overlay)" : "var(--color-bg-elevated)", borderColor: (canvas[b.id]||[]).length > 0 ? "var(--color-border-muted)" : "var(--color-border-default)" }}>
              <div className="text-xs font-bold text-[var(--color-text-subtle)]">{b.short}</div>
              <div className={`text-lg font-bold ${(canvas[b.id]||[]).length > 0 ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-ghost)]"}`}>{(canvas[b.id]||[]).length}</div>
            </div>
          ))}
        </div>
      </div>
      {activeExp.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Active Experiments</h3><button onClick={() => setTab("experiments")} className="text-xs text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] font-medium">View all →</button></div>
          <div className="space-y-2">{activeExp.slice(0, 3).map(e => <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}><p className="text-sm text-[var(--color-text-secondary)] truncate flex-1 pr-3">{e.hypothesis}</p><Badge variant={statusBV(e.status)}>{e.status}</Badge></div>)}</div>
        </div>
      )}
      {recentNotes.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Recent Client Notes</h3><button onClick={() => setTab("clients")} className="text-xs text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] font-medium">View all →</button></div>
          <div className="space-y-2">{recentNotes.map((n, i) => <div key={i} className="p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-[var(--color-text-muted)]">{n.clientName}</span><span className="text-xs text-[var(--color-text-ghost)]">{formatDate(n.date)}</span></div><p className="text-sm text-[var(--color-text-subtle)] truncate">{n.content}</p></div>)}</div>
        </div>
      )}
      {clients.length === 0 && experiments.length === 0 && <div className="text-center py-8"><p className="text-sm text-[var(--color-text-subtle)]">Start by filling in the Business Model Canvas and registering your coworkers.</p></div>}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────
export default function App() {
  const [section, setSection] = useState("cockpit");
  const [dsiUnread, setDsiUnread] = useState(0);
  const [subTab, setSubTab]   = useState("overview");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("strategist:theme") || "dark");
  const track = useTrackerEvents();

  // NAS state
  const nas = useAdoptionScores();
  const [nasDetailClient, setNasDetailClient] = useState(null);
  const [nasEditing, setNasEditing]           = useState(false);

  // Risk state
  const riskData = useRiskAssessments();
  const [riskDetailItem, setRiskDetailItem] = useState(null);
  const [riskEditing, setRiskEditing]       = useState(false);

  // Channel state
  const channelData = useChannels();
  const [channelDetailItem, setChannelDetailItem] = useState(null);
  const [channelEditing, setChannelEditing]       = useState(false);
  const [channelAdding, setChannelAdding]         = useState(false);

  // Governance state
  const govData = useGovernanceQueue();
  const [govDetailItem, setGovDetailItem] = useState(null);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("strategist:theme", next);
  };

  const handleNavigate = (sec, sub) => {
    setSection(sec);
    setSubTab(sub);
    setNasDetailClient(null);
    setNasEditing(false);
    setRiskDetailItem(null);
    setRiskEditing(false);
    setChannelDetailItem(null);
    setChannelEditing(false);
    setChannelAdding(false);
  };

  // Legacy setTab bridge for components that call setTab('goals') etc.
  const setTab = (tabId) => {
    if (tabId === 'goals') { setSection('cockpit'); setSubTab('goals'); return; }
    if (tabId === 'experiments') { setSection('bsp'); setSubTab('experiments'); return; }
    if (tabId === 'coworkers') { setSection('os'); setSubTab('coworkers'); return; }
    // Default: navigate to cockpit overview
    setSection('cockpit'); setSubTab('overview');
  };

  // Derive active tab for content rendering
  const activeView = subTab || section;

  // Track tab navigation
  useEffect(() => {
    track('tab_viewed', { tab: activeView });
  }, [activeView, track]);

  const [clients,     setClients]     = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [decisions,   setDecisions]   = useState([]);
  const [trends,      setTrends]      = useState([]);
  const [canvas,      setCanvas]      = useState(DEFAULT_CANVAS);
  const [coworkers,   setCoworkers]   = useState([]);
  const [skills,      setSkills]      = useState([]);
  const [connectors,  setConnectors]  = useState([]);

  useEffect(() => {
    (async () => {
      const [c, e, d, t, cv, cw, sk, cn] = await Promise.all([
        loadData(STORAGE_KEYS.clients),
        loadData(STORAGE_KEYS.experiments),
        loadData(STORAGE_KEYS.decisions),
        loadData(STORAGE_KEYS.trends),
        loadData(STORAGE_KEYS.canvas, DEFAULT_CANVAS),
        loadData(STORAGE_KEYS.coworkers),
        loadData(STORAGE_KEYS.skills),
        loadData(STORAGE_KEYS.mcp_connectors),
      ]);
      setClients(c);
      setExperiments(e);
      setDecisions(d);
      setTrends(t);
      setCanvas(cv && typeof cv === "object" && !Array.isArray(cv) ? cv : DEFAULT_CANVAS);
      setCoworkers(cw);
      setSkills(sk);
      setConnectors(cn);
      setLoading(false);
    })();
  }, []);

  const sc   = useCallback(d => saveData(STORAGE_KEYS.clients,        d), []);
  const se   = useCallback(d => saveData(STORAGE_KEYS.experiments,    d), []);
  const sd   = useCallback(d => saveData(STORAGE_KEYS.decisions,      d), []);
  const stv  = useCallback(d => saveData(STORAGE_KEYS.trends,         d), []);
  const sv   = useCallback(d => { saveData(STORAGE_KEYS.canvas, d); channelData.updateCanvasLastModified(new Date().toISOString()); }, [channelData.updateCanvasLastModified]);
  const sw   = useCallback(d => saveData(STORAGE_KEYS.coworkers,      d), []);
  const sskl = useCallback(d => saveData(STORAGE_KEYS.skills,         d), []);
  const scn  = useCallback(d => saveData(STORAGE_KEYS.mcp_connectors, d), []);

  if (loading) return (
    <div data-theme={theme} className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <div className="text-sm" style={{ color: "var(--color-text-subtle)" }}>Loading...</div>
    </div>
  );

  // Inject DSI unread badge
  const sectionsWithBadge = NIP_SECTIONS.map(s => {
    if (s.id === "os" && dsiUnread > 0) {
      return {
        ...s,
        subTabs: s.subTabs.map(st =>
          st.id === "dsi_intel"
            ? { ...st, label: `Client Intelligence (${dsiUnread})` }
            : st
        ),
      };
    }
    return s;
  });

  const nav = (
    <Navigation
      sections={sectionsWithBadge}
      activeSection={section}
      activeSubTab={subTab}
      onNavigate={handleNavigate}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSignOut={() => auth.signOut()}
    />
  );

  return (
    <div data-theme={theme}>
      <AppShell nav={nav} wideContent={activeView === "canvas"}>
        {/* Nouvia Studio — Master Backlog sub-tab */}
        {activeView === "master_backlog" && <MasterBacklog />}

        {/* Management Cockpit — Cockpit (overview) sub-tab */}
        {activeView === "overview" && !nasDetailClient && !riskDetailItem && !channelDetailItem && !channelAdding && <DashboardTab mode="overview" clients={clients} experiments={experiments} canvas={canvas} coworkers={coworkers} skills={skills} connectors={connectors} setTab={setTab} onNavigate={handleNavigate} governancePendingCount={govData.pendingCount} nasProps={{
          scores: nas.scores, configs: nas.configs, aggregateNAS: nas.aggregateNAS,
          loading: nas.loading, updateScore: nas.updateScore, getConfig: nas.getConfig,
          onNavigateToDetail: (score) => setNasDetailClient(score),
        }} riskProps={{
          risks: riskData.risks,
          loading: riskData.loading,
          onSelectRisk: (risk) => setRiskDetailItem(risk),
        }} channelsProps={{
          channels: channelData.channels,
          loading: channelData.loading,
          canvasLastModified: channelData.canvasLastModified,
          onSelectChannel: (ch) => setChannelDetailItem(ch),
        }} />}
        {activeView === "overview" && nasDetailClient && !nasEditing && (
          <NASDetail
            score={nasDetailClient}
            config={nas.getConfig(nasDetailClient.client_id)}
            onBack={() => setNasDetailClient(null)}
            onEdit={() => setNasEditing(true)}
          />
        )}
        {activeView === "overview" && nasDetailClient && nasEditing && (
          <NASEditForm
            score={nasDetailClient}
            onSave={async (updates) => {
              await nas.updateScore(nasDetailClient.client_id, updates);
              setNasDetailClient({ ...nasDetailClient, ...updates });
              setNasEditing(false);
            }}
            onCancel={() => setNasEditing(false)}
          />
        )}
        {activeView === "overview" && riskDetailItem && !riskEditing && (
          <RiskDetail
            risk={riskDetailItem}
            onBack={() => setRiskDetailItem(null)}
            onUpdate={() => setRiskEditing(true)}
          />
        )}
        {activeView === "overview" && riskDetailItem && riskEditing && (
          <RiskEditForm
            risk={riskDetailItem}
            onSave={async (updates) => {
              await riskData.updateRisk(riskDetailItem.id, updates);
              setRiskDetailItem({ ...riskDetailItem, ...updates });
              setRiskEditing(false);
            }}
            onCancel={() => setRiskEditing(false)}
          />
        )}
        {activeView === "overview" && channelDetailItem && !channelEditing && (
          <ChannelDetail
            channel={channelDetailItem}
            canvasLastModified={channelData.canvasLastModified}
            onBack={() => setChannelDetailItem(null)}
            onEdit={() => setChannelEditing(true)}
            onDelete={async () => {
              await channelData.deleteChannel(channelDetailItem.id);
              setChannelDetailItem(null);
            }}
          />
        )}
        {activeView === "overview" && channelDetailItem && channelEditing && (
          <ChannelEditForm
            channel={channelDetailItem}
            onSave={async (updates) => {
              await channelData.updateChannel(channelDetailItem.id, updates);
              setChannelDetailItem({ ...channelDetailItem, ...updates });
              setChannelEditing(false);
            }}
            onCancel={() => setChannelEditing(false)}
          />
        )}
        {activeView === "overview" && channelAdding && (
          <ChannelEditForm
            onSave={async (data) => {
              await channelData.addChannel(data);
              setChannelAdding(false);
            }}
            onCancel={() => setChannelAdding(false)}
          />
        )}

        {/* Nouvia Studio — Architecture sub-tab */}
        {activeView === "architecture" && <NIPArchitecture />}

        {/* BSP sub-tabs */}
        {activeView === "canvas"      && <CanvasTab canvas={canvas} setCanvas={setCanvas} saveCanvas={sv} />}
        {activeView === "experiments" && <ExperimentsTab experiments={experiments} setExperiments={setExperiments} saveExperiments={se} track={track} />}
        {activeView === "decisions"   && <DecisionsTab decisions={decisions} setDecisions={setDecisions} saveDecisions={sd} />}
        {activeView === "trends"      && <TrendsTab trends={trends} setTrends={setTrends} saveTrends={stv} />}
        {activeView === "competitive" && <CompetitiveLandscapeTab />}

        {/* Funnel sub-tabs */}
        {activeView === "clients"     && <ClientsTab clients={clients} setClients={setClients} saveClients={sc} track={track} />}
        {activeView === "pipeline"    && <PipelineTab clients={clients} />}

        {/* OS / DSI sub-tabs */}
        {activeView === "dsi_intel"   && <DSIShell onUnreadCount={(n) => setDsiUnread(n)} />}
        {activeView === "coworkers"   && <CoworkersPane coworkers={coworkers} setCoworkers={setCoworkers} saveCoworkers={sw} canvas={canvas} />}
        {activeView === "skills"      && <SkillsPane skills={skills} setSkills={setSkills} saveSkills={sskl} />}
        {activeView === "connectors"  && <ConnectorsPane connectors={connectors} setConnectors={setConnectors} saveConnectors={scn} />}
        {activeView === "ip_library"  && <IPLibraryTab />}

        {/* Goals (accessed from Dashboard) */}
        {activeView === "goals"       && <GoalManagement onBack={() => handleNavigate("cockpit", "overview")} />}
      </AppShell>
    </div>
  );
}
