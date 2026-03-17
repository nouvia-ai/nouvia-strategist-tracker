import { useState, useEffect, useCallback } from "react";
import { getData, setData } from './storage';

// ─── CONSTANTS ───────────────────────────────────
const STORAGE_KEYS = {
  clients: "strategist:clients",
  experiments: "strategist:experiments",
  decisions: "strategist:decisions",
  trends: "strategist:trends",
  canvas: "strategist:canvas",
  coworkers: "strategist:coworkers",
};

const ADOPTION_STAGES = ["Innovator", "Early Adopter", "Chasm", "Early Majority", "Late Majority"];
const EXPERIMENT_STATUS = ["Hypothesis", "Testing", "Validated", "Invalidated", "Pivoted"];
const COWORKER_STATUS = ["Active", "Needs Update", "Planned", "Gap"];

const BMC_BLOCKS = [
  { id: "key_partners", label: "Key Partners", short: "KP" },
  { id: "key_activities", label: "Key Activities", short: "KA" },
  { id: "key_resources", label: "Key Resources", short: "KR" },
  { id: "value_propositions", label: "Value Propositions", short: "VP" },
  { id: "customer_relationships", label: "Customer Relationships", short: "CR" },
  { id: "channels", label: "Channels", short: "CH" },
  { id: "customer_segments", label: "Customer Segments", short: "CS" },
  { id: "cost_structure", label: "Cost Structure", short: "CO" },
  { id: "revenue_streams", label: "Revenue Streams", short: "RS" },
];

const DEFAULT_CANVAS = {};
BMC_BLOCKS.forEach(b => { DEFAULT_CANVAS[b.id] = []; });

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = (d) => { if (!d) return ""; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const today = () => new Date().toISOString().split("T")[0];

// ─── STORAGE ─────────────────────────────────────
async function loadData(key, fallback = []) {
  const result = await getData(key);
  return result !== null ? result : fallback;
}
async function saveData(key, data) {
  await setData(key, data);
}

// ─── UI PRIMITIVES ───────────────────────────────
function Badge({ children, variant = "default" }) {
  const c = { default: "bg-zinc-700 text-zinc-200", blue: "bg-blue-900/60 text-blue-300", green: "bg-emerald-900/60 text-emerald-300", amber: "bg-amber-900/60 text-amber-300", red: "bg-red-900/60 text-red-300", purple: "bg-purple-900/60 text-purple-300", cyan: "bg-cyan-900/60 text-cyan-300" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c[variant]}`}>{children}</span>;
}
const stageBV = (s) => ({ Innovator: "purple", "Early Adopter": "blue", Chasm: "red", "Early Majority": "green", "Late Majority": "amber" }[s] || "default");
const statusBV = (s) => ({ Hypothesis: "default", Testing: "blue", Validated: "green", Invalidated: "red", Pivoted: "amber" }[s] || "default");
const cwStatusBV = (s) => ({ Active: "green", "Needs Update": "amber", Planned: "blue", Gap: "red" }[s] || "default");

function EmptyState({ icon, title, subtitle }) {
  return <div className="flex flex-col items-center justify-center py-14 text-zinc-500"><div className="text-3xl mb-2 opacity-40">{icon}</div><p className="text-sm font-medium text-zinc-400">{title}</p><p className="text-xs mt-1">{subtitle}</p></div>;
}
function Field({ label, children }) {
  return <div className="mb-3"><label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>{children}</div>;
}
const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500";
const sel = inp + " appearance-none";
const ta = inp + " resize-none";

function Btn({ children, primary, onClick, small, className = "" }) {
  const base = small ? "text-xs px-3 py-1 rounded-lg" : "text-sm py-2 rounded-lg flex-1";
  const style = primary ? "bg-zinc-100 text-zinc-900 font-medium hover:bg-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700";
  return <button onClick={onClick} className={`${base} ${style} transition-colors ${className}`}>{children}</button>;
}

// ─── TABS ────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "canvas", label: "Canvas", icon: "▣" },
  { id: "clients", label: "Clients", icon: "◉" },
  { id: "experiments", label: "Experiments", icon: "△" },
  { id: "decisions", label: "Decisions", icon: "◆" },
  { id: "trends", label: "Trends", icon: "〜" },
  { id: "coworkers", label: "Coworkers", icon: "⚙" },
];

// ─── CLIENTS ─────────────────────────────────────
function ClientForm({ onSave, onCancel, initial }) {
  const [f, sF] = useState(initial || { name: "", industry: "", adoptionStage: "Early Adopter", notes: "" });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Client Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. IVC" /></Field>
    <Field label="Industry"><input className={inp} value={f.industry} onChange={e => s("industry", e.target.value)} placeholder="e.g. Pharmacy / Retail" /></Field>
    <Field label="Adoption Stage"><select className={sel} value={f.adoptionStage} onChange={e => s("adoptionStage", e.target.value)}>{ADOPTION_STAGES.map(st => <option key={st}>{st}</option>)}</select></Field>
    <Field label="Notes"><textarea className={ta} rows={3} value={f.notes} onChange={e => s("notes", e.target.value)} placeholder="Key context..." /></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function ClientNoteForm({ onSave, onCancel }) {
  const [f, sF] = useState({ content: "", insights: "", nextSteps: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Date"><input type="date" className={inp} value={f.date} onChange={e => s("date", e.target.value)} /></Field>
    <Field label="Meeting Notes"><textarea className={ta} rows={4} value={f.content} onChange={e => s("content", e.target.value)} placeholder="What happened?" /></Field>
    <Field label="Key Insights"><textarea className={ta} rows={3} value={f.insights} onChange={e => s("insights", e.target.value)} placeholder="What did you learn?" /></Field>
    <Field label="Next Steps"><textarea className={ta} rows={2} value={f.nextSteps} onChange={e => s("nextSteps", e.target.value)} placeholder="Actions..." /></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Add Note</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function ClientDetail({ client, onAddNote, onBack, onUpdateStage }) {
  const [show, setShow] = useState(false);
  const notes = client.entries || [];
  return <div>
    <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-4">← All Clients</button>
    <div className="flex items-start justify-between mb-4">
      <div><h3 className="text-lg font-semibold text-zinc-100">{client.name}</h3><p className="text-xs text-zinc-500 mt-0.5">{client.industry}</p></div>
      <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300" value={client.adoptionStage} onChange={e => onUpdateStage(e.target.value)}>
        {ADOPTION_STAGES.map(s => <option key={s}>{s}</option>)}
      </select>
    </div>
    {client.notes && <p className="text-sm text-zinc-400 mb-4 italic">"{client.notes}"</p>}
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Meeting Notes</h4>
      <Btn small primary onClick={() => setShow(true)}>+ Add Note</Btn>
    </div>
    {show && <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"><ClientNoteForm onSave={n => { onAddNote(n); setShow(false); }} onCancel={() => setShow(false)} /></div>}
    {notes.length === 0 && <p className="text-sm text-zinc-600 py-6 text-center">No notes yet.</p>}
    {[...notes].reverse().map((n, i) => <div key={i} className="mb-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-2">{formatDate(n.date)}</p>
      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{n.content}</p>
      {n.insights && <div className="mt-2 pt-2 border-t border-zinc-800"><p className="text-xs text-zinc-500 font-medium mb-0.5">Insights</p><p className="text-sm text-zinc-400">{n.insights}</p></div>}
      {n.nextSteps && <div className="mt-2 pt-2 border-t border-zinc-800"><p className="text-xs text-zinc-500 font-medium mb-0.5">Next Steps</p><p className="text-sm text-zinc-400">{n.nextSteps}</p></div>}
    </div>)}
  </div>;
}

function ClientsTab({ clients, setClients, saveClients }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const add = (f) => { const u = [...clients, { ...f, id: uuid(), entries: [], createdAt: today() }]; setClients(u); saveClients(u); setShowForm(false); };
  const addNote = (cid, n) => { const u = clients.map(c => c.id === cid ? { ...c, entries: [...(c.entries || []), { ...n, id: uuid() }] } : c); setClients(u); saveClients(u); setSelected(u.find(c => c.id === cid)); };
  const updStage = (cid, st) => { const u = clients.map(c => c.id === cid ? { ...c, adoptionStage: st } : c); setClients(u); saveClients(u); setSelected(u.find(c => c.id === cid)); };

  if (selected) return <ClientDetail client={selected} onBack={() => setSelected(null)} onAddNote={n => addNote(selected.id, n)} onUpdateStage={s => updStage(selected.id, s)} />;
  return <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Client Intel</h2><Btn small primary onClick={() => setShowForm(true)}>+ New Client</Btn></div>
    {showForm && <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"><ClientForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
    {clients.length === 0 && !showForm && <EmptyState icon="◉" title="No clients yet" subtitle="Add your first client" />}
    <div className="space-y-2">{clients.map(c => <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left p-3 bg-zinc-800/40 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all">
      <div className="flex items-center justify-between"><div><span className="text-sm font-medium text-zinc-200">{c.name}</span><span className="text-xs text-zinc-600 ml-2">{c.industry}</span></div><div className="flex items-center gap-2"><Badge variant={stageBV(c.adoptionStage)}>{c.adoptionStage}</Badge><span className="text-xs text-zinc-600">{(c.entries||[]).length} notes</span></div></div>
    </button>)}</div>
  </div>;
}

// ─── EXPERIMENTS ──────────────────────────────────
function ExperimentForm({ onSave, onCancel }) {
  const [f, sF] = useState({ hypothesis: "", status: "Hypothesis", metric: "", description: "", canvasBlocks: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Hypothesis"><input className={inp} value={f.hypothesis} onChange={e => s("hypothesis", e.target.value)} placeholder="We believe that..." /></Field>
    <Field label="Description"><textarea className={ta} rows={2} value={f.description} onChange={e => s("description", e.target.value)} placeholder="What we're testing..." /></Field>
    <Field label="Success Metric"><input className={inp} value={f.metric} onChange={e => s("metric", e.target.value)} placeholder="How will we know?" /></Field>
    <Field label="Canvas Blocks Affected"><input className={inp} value={f.canvasBlocks} onChange={e => s("canvasBlocks", e.target.value)} placeholder="e.g. Value Propositions, Revenue Streams" /></Field>
    <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{EXPERIMENT_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function ExperimentsTab({ experiments, setExperiments, saveExperiments }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const add = (f) => { const u = [...experiments, { ...f, id: uuid() }]; setExperiments(u); saveExperiments(u); setShowForm(false); };
  const updStatus = (id, st) => { const u = experiments.map(e => e.id === id ? { ...e, status: st } : e); setExperiments(u); saveExperiments(u); };
  const updResult = (id, r) => { const u = experiments.map(e => e.id === id ? { ...e, result: r } : e); setExperiments(u); saveExperiments(u); setEditId(null); };

  return <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Experiments</h2><Btn small primary onClick={() => setShowForm(true)}>+ New Experiment</Btn></div>
    {showForm && <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"><ExperimentForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
    {experiments.length === 0 && !showForm && <EmptyState icon="△" title="No experiments yet" subtitle="Track Build-Measure-Learn cycles" />}
    <div className="space-y-2">{[...experiments].reverse().map(exp => <div key={exp.id} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-medium text-zinc-200 flex-1 pr-3">{exp.hypothesis}</p>
        <select className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-400 flex-shrink-0" value={exp.status} onChange={e => updStatus(exp.id, e.target.value)}>{EXPERIMENT_STATUS.map(st => <option key={st}>{st}</option>)}</select>
      </div>
      {exp.description && <p className="text-xs text-zinc-500 mb-1">{exp.description}</p>}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <Badge variant={statusBV(exp.status)}>{exp.status}</Badge>
        {exp.metric && <span className="text-xs text-zinc-600">Metric: {exp.metric}</span>}
        {exp.canvasBlocks && <span className="text-xs text-cyan-700">Canvas: {exp.canvasBlocks}</span>}
        <span className="text-xs text-zinc-700">{formatDate(exp.date)}</span>
      </div>
      {exp.result && <div className="mt-2 pt-2 border-t border-zinc-800"><p className="text-xs text-zinc-500 font-medium mb-0.5">Result</p><p className="text-sm text-zinc-400">{exp.result}</p></div>}
      {editId === exp.id ? <div className="mt-2"><textarea className={ta} rows={2} defaultValue={exp.result||""} placeholder="What did we learn?" onBlur={e => updResult(exp.id, e.target.value)} autoFocus /></div>
        : <button onClick={() => setEditId(exp.id)} className="text-xs text-zinc-600 hover:text-zinc-400 mt-1">{exp.result ? "Edit result" : "+ Add result"}</button>}
    </div>)}</div>
  </div>;
}

// ─── DECISIONS ───────────────────────────────────
function DecisionForm({ onSave, onCancel }) {
  const [f, sF] = useState({ topic: "", decision: "", reasoning: "", frameworks: "", canvasBlocks: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Topic"><input className={inp} value={f.topic} onChange={e => s("topic", e.target.value)} placeholder="e.g. Pricing model change" /></Field>
    <Field label="Decision"><textarea className={ta} rows={2} value={f.decision} onChange={e => s("decision", e.target.value)} placeholder="What did we decide?" /></Field>
    <Field label="Reasoning"><textarea className={ta} rows={3} value={f.reasoning} onChange={e => s("reasoning", e.target.value)} placeholder="Why? What evidence?" /></Field>
    <Field label="Frameworks Applied"><input className={inp} value={f.frameworks} onChange={e => s("frameworks", e.target.value)} placeholder="e.g. Zero to One, BMC" /></Field>
    <Field label="Canvas Blocks Affected"><input className={inp} value={f.canvasBlocks} onChange={e => s("canvasBlocks", e.target.value)} placeholder="e.g. Revenue Streams, Value Propositions" /></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function DecisionsTab({ decisions, setDecisions, saveDecisions }) {
  const [showForm, setShowForm] = useState(false);
  const add = (f) => { const u = [...decisions, { ...f, id: uuid() }]; setDecisions(u); saveDecisions(u); setShowForm(false); };
  return <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Strategic Decisions</h2><Btn small primary onClick={() => setShowForm(true)}>+ Log Decision</Btn></div>
    {showForm && <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"><DecisionForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
    {decisions.length === 0 && !showForm && <EmptyState icon="◆" title="No decisions logged" subtitle="Record decisions and reasoning" />}
    <div className="space-y-2">{[...decisions].reverse().map(d => <div key={d.id} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold text-zinc-200">{d.topic}</p><span className="text-xs text-zinc-600">{formatDate(d.date)}</span></div>
      <p className="text-sm text-zinc-300 mb-1">{d.decision}</p>
      {d.reasoning && <p className="text-xs text-zinc-500 mt-1">{d.reasoning}</p>}
      <div className="mt-2 flex gap-1 flex-wrap">
        {d.frameworks && d.frameworks.split(",").map((f, i) => <Badge key={i} variant="purple">{f.trim()}</Badge>)}
        {d.canvasBlocks && d.canvasBlocks.split(",").map((b, i) => <Badge key={"c"+i} variant="cyan">{b.trim()}</Badge>)}
      </div>
    </div>)}</div>
  </div>;
}

// ─── TRENDS ──────────────────────────────────────
function TrendForm({ onSave, onCancel }) {
  const [f, sF] = useState({ observation: "", implications: "", source: "", date: today() });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Observation"><textarea className={ta} rows={3} value={f.observation} onChange={e => s("observation", e.target.value)} placeholder="What did you notice?" /></Field>
    <Field label="Implications for Nouvia"><textarea className={ta} rows={2} value={f.implications} onChange={e => s("implications", e.target.value)} placeholder="What does this mean?" /></Field>
    <Field label="Source"><input className={inp} value={f.source} onChange={e => s("source", e.target.value)} placeholder="IVC meeting, news, etc." /></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function TrendsTab({ trends, setTrends, saveTrends }) {
  const [showForm, setShowForm] = useState(false);
  const add = (f) => { const u = [...trends, { ...f, id: uuid() }]; setTrends(u); saveTrends(u); setShowForm(false); };
  return <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Industry Trends</h2><Btn small primary onClick={() => setShowForm(true)}>+ Log Trend</Btn></div>
    {showForm && <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"><TrendForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
    {trends.length === 0 && !showForm && <EmptyState icon="〜" title="No trends logged" subtitle="Track market signals" />}
    <div className="space-y-2">{[...trends].reverse().map(t => <div key={t.id} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-1"><p className="text-sm text-zinc-200">{t.observation}</p><span className="text-xs text-zinc-600 flex-shrink-0 ml-2">{formatDate(t.date)}</span></div>
      {t.implications && <p className="text-xs text-zinc-500 mt-1">→ {t.implications}</p>}
      {t.source && <p className="text-xs text-zinc-700 mt-1">Source: {t.source}</p>}
    </div>)}</div>
  </div>;
}

// ─── BUSINESS MODEL CANVAS ───────────────────────
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
  key_partners: "border-zinc-600", key_activities: "border-blue-800", key_resources: "border-blue-800",
  value_propositions: "border-emerald-800", customer_relationships: "border-amber-800",
  channels: "border-amber-800", customer_segments: "border-amber-800",
  cost_structure: "border-red-900", revenue_streams: "border-purple-800",
};

const HEADER_COLORS = {
  key_partners: "text-zinc-400", key_activities: "text-blue-400", key_resources: "text-blue-400",
  value_propositions: "text-emerald-400", customer_relationships: "text-amber-400",
  channels: "text-amber-400", customer_segments: "text-amber-400",
  cost_structure: "text-red-400", revenue_streams: "text-purple-400",
};

function CanvasBlock({ block, items, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const handleAdd = () => { if (text.trim()) { onAdd(text.trim()); setText(""); setAdding(false); } };

  return (
    <div className={`bg-zinc-900/80 border ${BLOCK_COLORS[block.id]} rounded-lg p-2.5 flex flex-col min-h-0 overflow-hidden`} style={GRID_LAYOUT[block.id]}>
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex-shrink-0 ${HEADER_COLORS[block.id]}`}>{block.label}</h4>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-1">
            <span className="text-xs text-zinc-300 leading-relaxed flex-1">• {item}</span>
            <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs flex-shrink-0 transition-opacity">×</button>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="mt-1.5 flex-shrink-0">
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" value={text} onChange={e => setText(e.target.value)} placeholder="Add item..." autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            onBlur={() => { if (!text.trim()) setAdding(false); }}
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-1.5 flex-shrink-0 text-xs text-zinc-600 hover:text-zinc-400 text-left transition-colors">+ add</button>
      )}
    </div>
  );
}

function CanvasTab({ canvas, setCanvas, saveCanvas }) {
  const addItem = (bid, text) => { const u = { ...canvas, [bid]: [...(canvas[bid] || []), text] }; setCanvas(u); saveCanvas(u); };
  const removeItem = (bid, idx) => { const u = { ...canvas, [bid]: (canvas[bid] || []).filter((_, i) => i !== idx) }; setCanvas(u); saveCanvas(u); };
  const totalItems = Object.values(canvas).reduce((s, a) => s + (a || []).length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Business Model Canvas</h2>
          <p className="text-xs text-zinc-600 mt-0.5">Nouvia's living strategic blueprint — {totalItems} items across {BMC_BLOCKS.filter(b => (canvas[b.id]||[]).length > 0).length}/9 blocks</p>
        </div>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "minmax(160px, 1fr) minmax(160px, 1fr) minmax(110px, auto)" }}>
        {BMC_BLOCKS.map(block => <CanvasBlock key={block.id} block={block} items={canvas[block.id] || []} onAdd={text => addItem(block.id, text)} onRemove={idx => removeItem(block.id, idx)} />)}
      </div>
      <p className="text-xs text-zinc-700 mt-3 text-center">Click "+ add" in any block. Hover items to remove. All changes persist across sessions.</p>
    </div>
  );
}

// ─── COWORKER REGISTRY ───────────────────────────
function CoworkerForm({ onSave, onCancel }) {
  const [f, sF] = useState({ name: "", purpose: "", status: "Active", keyActivities: "", skills: "", notes: "" });
  const s = (k, v) => sF(p => ({ ...p, [k]: v }));
  return <div>
    <Field label="Coworker Name"><input className={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Compass, Forge..." /></Field>
    <Field label="Purpose"><textarea className={ta} rows={2} value={f.purpose} onChange={e => s("purpose", e.target.value)} placeholder="What does this coworker do?" /></Field>
    <Field label="Key Activities Served"><input className={inp} value={f.keyActivities} onChange={e => s("keyActivities", e.target.value)} placeholder="e.g. Client consulting, AI platform dev..." /></Field>
    <Field label="Skills Used"><input className={inp} value={f.skills} onChange={e => s("skills", e.target.value)} placeholder="e.g. business-strategist, nouvia-estimation..." /></Field>
    <Field label="Status"><select className={sel} value={f.status} onChange={e => s("status", e.target.value)}>{COWORKER_STATUS.map(st => <option key={st}>{st}</option>)}</select></Field>
    <Field label="Notes"><textarea className={ta} rows={2} value={f.notes} onChange={e => s("notes", e.target.value)} /></Field>
    <div className="flex gap-2 mt-4"><Btn primary onClick={() => onSave(f)}>Save</Btn><Btn onClick={onCancel}>Cancel</Btn></div>
  </div>;
}

function CoworkersTab({ coworkers, setCoworkers, saveCoworkers, canvas }) {
  const [showForm, setShowForm] = useState(false);
  const add = (f) => { const u = [...coworkers, { ...f, id: uuid() }]; setCoworkers(u); saveCoworkers(u); setShowForm(false); };
  const updStatus = (id, st) => { const u = coworkers.map(c => c.id === id ? { ...c, status: st } : c); setCoworkers(u); saveCoworkers(u); };
  const remove = (id) => { const u = coworkers.filter(c => c.id !== id); setCoworkers(u); saveCoworkers(u); };

  const canvasActivities = canvas.key_activities || [];
  const coveredSet = coworkers.filter(c => c.status === "Active").flatMap(c => (c.keyActivities || "").split(",").map(a => a.trim().toLowerCase())).filter(Boolean);

  return <div>
    <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Coworker Registry</h2><Btn small primary onClick={() => setShowForm(true)}>+ Register Coworker</Btn></div>

    {canvasActivities.length > 0 && (
      <div className="mb-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Key Activities Coverage</p>
        <div className="space-y-1">{canvasActivities.map((a, i) => {
          const hit = coveredSet.some(ca => a.toLowerCase().includes(ca) || ca.includes(a.toLowerCase()));
          return <div key={i} className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hit ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className={`text-xs ${hit ? "text-zinc-400" : "text-zinc-300 font-medium"}`}>{a}</span>
            {!hit && <span className="text-xs text-red-400/70">— gap</span>}
          </div>;
        })}</div>
      </div>
    )}

    {showForm && <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"><CoworkerForm onSave={add} onCancel={() => setShowForm(false)} /></div>}
    {coworkers.length === 0 && !showForm && <EmptyState icon="⚙" title="No coworkers registered" subtitle="Map your Claude coworkers to the business model" />}
    <div className="space-y-2">{coworkers.map(cw => <div key={cw.id} className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">{cw.name}</span>
          <select className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-400" value={cw.status} onChange={e => updStatus(cw.id, e.target.value)}>{COWORKER_STATUS.map(st => <option key={st}>{st}</option>)}</select>
        </div>
        <button onClick={() => remove(cw.id)} className="text-xs text-zinc-700 hover:text-red-400 transition-colors">remove</button>
      </div>
      {cw.purpose && <p className="text-xs text-zinc-400 mb-1">{cw.purpose}</p>}
      <div className="flex gap-1 flex-wrap mt-1.5">
        <Badge variant={cwStatusBV(cw.status)}>{cw.status}</Badge>
        {cw.keyActivities && cw.keyActivities.split(",").map((a, i) => <Badge key={i} variant="cyan">{a.trim()}</Badge>)}
        {cw.skills && cw.skills.split(",").map((sk, i) => <Badge key={"s"+i} variant="purple">{sk.trim()}</Badge>)}
      </div>
      {cw.notes && <p className="text-xs text-zinc-600 mt-1.5">{cw.notes}</p>}
    </div>)}</div>
  </div>;
}

// ─── DASHBOARD ───────────────────────────────────
function Dashboard({ clients, experiments, decisions, trends, canvas, coworkers, setTab }) {
  const activeExp = experiments.filter(e => e.status === "Testing" || e.status === "Hypothesis");
  const canvasItems = Object.values(canvas).reduce((s, a) => s + (a||[]).length, 0);
  const filledBlocks = BMC_BLOCKS.filter(b => (canvas[b.id]||[]).length > 0).length;
  const gaps = coworkers.filter(c => c.status === "Gap").length;
  const allNotes = clients.flatMap(c => (c.entries || []).map(n => ({ ...n, clientName: c.name })));
  const recentNotes = [...allNotes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

  return <div>
    <div className="mb-6"><h2 className="text-lg font-semibold text-zinc-100 mb-1">Nouvia Strategy Dashboard</h2><p className="text-xs text-zinc-500">Your living strategic operating system</p></div>

    <div className="grid grid-cols-4 gap-2 mb-5">
      {[
        { label: "Clients", value: clients.length, icon: "◉", tab: "clients" },
        { label: "Canvas", value: `${canvasItems}`, sub: `${filledBlocks}/9 blocks`, icon: "▣", tab: "canvas" },
        { label: "Experiments", value: experiments.length, icon: "△", tab: "experiments" },
        { label: "Coworkers", value: coworkers.length, sub: gaps > 0 ? `${gaps} gaps` : null, icon: "⚙", tab: "coworkers" },
      ].map(s => <button key={s.label} onClick={() => setTab(s.tab)} className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-3 text-center hover:border-zinc-700 transition-colors">
        <div className="text-base text-zinc-500 mb-1">{s.icon}</div>
        <div className="text-xl font-bold text-zinc-100">{s.value}</div>
        <div className="text-xs text-zinc-500">{s.label}</div>
        {s.sub && <div className="text-xs text-amber-500/70 mt-0.5">{s.sub}</div>}
      </button>)}
    </div>

    <div className="mb-5">
      <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Business Model Canvas</h3><button onClick={() => setTab("canvas")} className="text-xs text-zinc-600 hover:text-zinc-400">Open canvas →</button></div>
      <div className="grid grid-cols-5 gap-1">
        {BMC_BLOCKS.slice(0, 7).map(b => <div key={b.id} className={`p-1.5 rounded text-center ${(canvas[b.id]||[]).length > 0 ? "bg-zinc-800/60 border border-zinc-700/50" : "bg-zinc-900/40 border border-zinc-800/30"}`}>
          <div className="text-xs font-bold text-zinc-500">{b.short}</div>
          <div className={`text-lg font-bold ${(canvas[b.id]||[]).length > 0 ? "text-zinc-200" : "text-zinc-700"}`}>{(canvas[b.id]||[]).length}</div>
        </div>)}
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {BMC_BLOCKS.slice(7).map(b => <div key={b.id} className={`p-1.5 rounded text-center ${(canvas[b.id]||[]).length > 0 ? "bg-zinc-800/60 border border-zinc-700/50" : "bg-zinc-900/40 border border-zinc-800/30"}`}>
          <div className="text-xs font-bold text-zinc-500">{b.short}</div>
          <div className={`text-lg font-bold ${(canvas[b.id]||[]).length > 0 ? "text-zinc-200" : "text-zinc-700"}`}>{(canvas[b.id]||[]).length}</div>
        </div>)}
      </div>
    </div>

    {activeExp.length > 0 && <div className="mb-5">
      <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Experiments</h3><button onClick={() => setTab("experiments")} className="text-xs text-zinc-600 hover:text-zinc-400">View all →</button></div>
      <div className="space-y-1.5">{activeExp.slice(0, 3).map(e => <div key={e.id} className="flex items-center justify-between p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-800/50"><p className="text-sm text-zinc-300 truncate flex-1 pr-3">{e.hypothesis}</p><Badge variant={statusBV(e.status)}>{e.status}</Badge></div>)}</div>
    </div>}

    {recentNotes.length > 0 && <div className="mb-5">
      <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recent Client Notes</h3><button onClick={() => setTab("clients")} className="text-xs text-zinc-600 hover:text-zinc-400">View all →</button></div>
      <div className="space-y-1.5">{recentNotes.map((n, i) => <div key={i} className="p-2.5 bg-zinc-800/30 rounded-lg border border-zinc-800/50"><div className="flex items-center justify-between mb-0.5"><span className="text-xs font-medium text-zinc-400">{n.clientName}</span><span className="text-xs text-zinc-700">{formatDate(n.date)}</span></div><p className="text-sm text-zinc-500 truncate">{n.content}</p></div>)}</div>
    </div>}

    {clients.length === 0 && experiments.length === 0 && <div className="text-center py-8"><p className="text-sm text-zinc-500">Start by filling in the Business Model Canvas and registering your coworkers.</p></div>}
  </div>;
}

// ─── MAIN APP ────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("strategist:theme") || "dark");
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem("strategist:theme", next); };
  const [clients, setClients] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [trends, setTrends] = useState([]);
  const [canvas, setCanvas] = useState(DEFAULT_CANVAS);
  const [coworkers, setCoworkers] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, e, d, t, cv, cw] = await Promise.all([
        loadData(STORAGE_KEYS.clients), loadData(STORAGE_KEYS.experiments),
        loadData(STORAGE_KEYS.decisions), loadData(STORAGE_KEYS.trends),
        loadData(STORAGE_KEYS.canvas, DEFAULT_CANVAS), loadData(STORAGE_KEYS.coworkers),
      ]);
      setClients(c); setExperiments(e); setDecisions(d); setTrends(t);
      setCanvas(cv && typeof cv === "object" && !Array.isArray(cv) ? cv : DEFAULT_CANVAS);
      setCoworkers(cw);
      setLoading(false);
    })();
  }, []);

  const sc = useCallback(d => saveData(STORAGE_KEYS.clients, d), []);
  const se = useCallback(d => saveData(STORAGE_KEYS.experiments, d), []);
  const sd = useCallback(d => saveData(STORAGE_KEYS.decisions, d), []);
  const stv = useCallback(d => saveData(STORAGE_KEYS.trends, d), []);
  const sv = useCallback(d => saveData(STORAGE_KEYS.canvas, d), []);
  const sw = useCallback(d => saveData(STORAGE_KEYS.coworkers, d), []);

  if (loading) return <div data-theme={theme} className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading...</div></div>;

  return (
    <div data-theme={theme} className="min-h-screen bg-zinc-950 text-zinc-100 transition-colors duration-200" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2"><div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center"><span className="text-zinc-900 text-xs font-bold">N</span></div><span className="text-sm font-semibold text-zinc-200 tracking-tight">Nouvia Strategist</span></div>
            <button onClick={toggleTheme} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-sm" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? "☀" : "☾"}</button>
          </div>
          <div className="flex gap-0.5 -mb-px overflow-x-auto">
            {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-zinc-100 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}><span className="mr-1">{t.icon}</span>{t.label}</button>)}
          </div>
        </div>
      </div>
      <div className={`mx-auto px-4 py-5 ${tab === "canvas" ? "max-w-5xl" : "max-w-3xl"}`}>
        {tab === "dashboard" && <Dashboard clients={clients} experiments={experiments} decisions={decisions} trends={trends} canvas={canvas} coworkers={coworkers} setTab={setTab} />}
        {tab === "canvas" && <CanvasTab canvas={canvas} setCanvas={setCanvas} saveCanvas={sv} />}
        {tab === "clients" && <ClientsTab clients={clients} setClients={setClients} saveClients={sc} />}
        {tab === "experiments" && <ExperimentsTab experiments={experiments} setExperiments={setExperiments} saveExperiments={se} />}
        {tab === "decisions" && <DecisionsTab decisions={decisions} setDecisions={setDecisions} saveDecisions={sd} />}
        {tab === "trends" && <TrendsTab trends={trends} setTrends={setTrends} saveTrends={stv} />}
        {tab === "coworkers" && <CoworkersTab coworkers={coworkers} setCoworkers={setCoworkers} saveCoworkers={sw} canvas={canvas} />}
      </div>
    </div>
  );
}
