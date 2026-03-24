/**
 * PipelineTab — NIP Phase 2
 * DEI-based prospect management Kanban board.
 * Stores pipeline data in Firestore via the same user-scoped storage pattern.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { getData, setData } from "../storage";

// ─── CONSTANTS ──────────────────────────────────
const STORAGE_KEY = "strategist:pipeline";

const STAGES = [
  { id: "target",            label: "Targets",            probability: 0   },
  { id: "first_appointment", label: "First Appointments", probability: 0   },
  { id: "gathering_info",    label: "Gathering Info",     probability: 25  },
  { id: "proposal",          label: "Proposal",           probability: 50  },
  { id: "verbal_yes",        label: "Verbal Yes",         probability: 90  },
  { id: "closed",            label: "Closed",             probability: 100 },
  { id: "falldown",          label: "Falldown",           probability: 0   },
];

const STAGE_PROBABILITY = {};
STAGES.forEach(s => { STAGE_PROBABILITY[s.id] = s.probability; });

const SOURCES = [
  { value: "bsp_weekly_scan", label: "BSP Weekly Scan" },
  { value: "referral",        label: "Referral"         },
  { value: "website",         label: "Website"          },
  { value: "event",           label: "Event"            },
  { value: "expansion",       label: "Expansion"        },
  { value: "other",           label: "Other"            },
];

const uuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().split("T")[0];

const formatCurrency = (v) => {
  if (!v && v !== 0) return "—";
  return "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── DATE HELPERS ───────────────────────────────
function getDateStatus(dateStr) {
  if (!dateStr) return "none";
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d < now) return "overdue";
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  if (d <= weekFromNow) return "due_soon";
  return "future";
}

function isOverdue(prospect) {
  if (["closed", "target", "falldown"].includes(prospect.stage)) return false;
  return getDateStatus(prospect.next_step_date) === "overdue";
}

// ─── UI PRIMITIVES ──────────────────────────────
const inp = "w-full bg-[var(--color-bg-overlay)] border border-[var(--color-border-muted)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)]";
const sel = inp + " appearance-none";
const ta  = inp + " resize-none";

function Field({ label, required, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Badge({ children, variant = "default" }) {
  const c = {
    default: "bg-[var(--color-badge-gray-bg)] text-[var(--color-badge-gray-text)]",
    blue:    "bg-[var(--color-badge-blue-bg)] text-[var(--color-badge-blue-text)]",
    green:   "bg-[var(--color-badge-green-bg)] text-[var(--color-badge-green-text)]",
    amber:   "bg-[var(--color-badge-amber-bg)] text-[var(--color-badge-amber-text)]",
    red:     "bg-[var(--color-badge-red-bg)] text-[var(--color-badge-red-text)]",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c[variant]}`}>{children}</span>;
}

function Btn({ children, primary, onClick, small, className = "" }) {
  const base  = small ? "text-xs px-3 py-1 rounded-lg" : "text-sm py-2 rounded-lg flex-1";
  const style = primary
    ? "bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] font-medium hover:bg-[var(--color-btn-primary-hover)]"
    : "bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)]";
  return <button onClick={onClick} className={`${base} ${style} transition-colors ${className}`}>{children}</button>;
}

// ─── MODAL OVERLAY ──────────────────────────────
function ModalOverlay({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="rounded-xl border border-[var(--color-border-muted)] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-bg-base)", margin: "var(--space-4)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-default)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-text-ghost)] hover:text-[var(--color-text-muted)] text-lg leading-none">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── PROSPECT FORM ──────────────────────────────
function ProspectForm({ initial, clients, onSave, onCancel, onDelete }) {
  const isEdit = !!initial?.id;
  const [f, sF] = useState(() => ({
    company_name:         "",
    contact_name:         "",
    contact_email:        "",
    stage:                "target",
    deal_type:            "new_business",
    client_ref:           "",
    estimated_value_usd:  "",
    next_step_date:       "",
    next_step_description:"",
    source:               "referral",
    notes:                "",
    falldown_reason:      "",
    ...initial,
    estimated_value_usd:  initial?.estimated_value_usd ?? "",
  }));

  const s = (k, v) => sF(p => ({ ...p, [k]: v }));

  const needsNextStep = !["target", "closed"].includes(f.stage);

  const handleSave = () => {
    if (!f.company_name.trim() || !f.contact_name.trim()) return;
    if (needsNextStep && !f.next_step_date) return;
    onSave({
      ...f,
      estimated_value_usd: f.estimated_value_usd === "" ? null : Number(f.estimated_value_usd),
      probability: STAGE_PROBABILITY[f.stage],
    });
  };

  return (
    <div>
      <Field label="Company Name" required>
        <input className={inp} value={f.company_name} onChange={e => s("company_name", e.target.value)} placeholder="e.g. Acme Corp" />
      </Field>
      <Field label="Contact Name" required>
        <input className={inp} value={f.contact_name} onChange={e => s("contact_name", e.target.value)} placeholder="e.g. John Smith" />
      </Field>
      <Field label="Contact Email">
        <input className={inp} type="email" value={f.contact_email} onChange={e => s("contact_email", e.target.value)} placeholder="john@acme.com" />
      </Field>
      <Field label="Stage" required>
        <select className={sel} value={f.stage} onChange={e => s("stage", e.target.value)}>
          {STAGES.map(st => <option key={st.id} value={st.id}>{st.label} ({st.probability}%)</option>)}
        </select>
      </Field>
      <Field label="Deal Type">
        <div className="flex gap-4">
          {[{ v: "new_business", l: "New Business" }, { v: "expansion", l: "Expansion" }].map(opt => (
            <label key={opt.v} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] cursor-pointer">
              <input type="radio" name="deal_type" value={opt.v} checked={f.deal_type === opt.v} onChange={e => s("deal_type", e.target.value)} />
              {opt.l}
            </label>
          ))}
        </div>
      </Field>
      {f.deal_type === "expansion" && clients.length > 0 && (
        <Field label="Link to Existing Client">
          <select className={sel} value={f.client_ref} onChange={e => s("client_ref", e.target.value)}>
            <option value="">— none —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Estimated Value ($)">
        <input className={inp} type="number" value={f.estimated_value_usd} onChange={e => s("estimated_value_usd", e.target.value)} placeholder="e.g. 50000" />
      </Field>
      <Field label={`Next Step Date${needsNextStep ? "" : " (optional)"}`} required={needsNextStep}>
        <input className={inp} type="date" value={f.next_step_date} onChange={e => s("next_step_date", e.target.value)} />
      </Field>
      <Field label="Next Step Description">
        <input className={inp} value={f.next_step_description} onChange={e => s("next_step_description", e.target.value)} placeholder="What happens next?" />
      </Field>
      <Field label="Source">
        <select className={sel} value={f.source} onChange={e => s("source", e.target.value)}>
          {SOURCES.map(src => <option key={src.value} value={src.value}>{src.label}</option>)}
        </select>
      </Field>
      {f.stage === "falldown" && (
        <Field label="Falldown Reason">
          <textarea className={ta} rows={2} value={f.falldown_reason} onChange={e => s("falldown_reason", e.target.value)} placeholder="Why did this fall down?" />
        </Field>
      )}
      <Field label="Notes">
        <textarea className={ta} rows={3} value={f.notes} onChange={e => s("notes", e.target.value)} placeholder="Additional context..." />
      </Field>
      <div className="flex gap-2 mt-4">
        <Btn primary onClick={handleSave}>{isEdit ? "Update" : "Add Prospect"}</Btn>
        <Btn onClick={onCancel}>Cancel</Btn>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 px-3 transition-colors">Delete</button>
        )}
      </div>
    </div>
  );
}

// ─── PROSPECT CARD ──────────────────────────────
function ProspectCard({ prospect, onClick }) {
  const overdue = isOverdue(prospect);
  const dateStatus = getDateStatus(prospect.next_step_date);

  const dateBadgeVariant = {
    overdue:  "red",
    due_soon: "amber",
    future:   "default",
    none:     "default",
  }[dateStatus];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
        overdue
          ? "border-red-500/50 hover:border-red-400/70"
          : "border-[var(--color-border-default)] hover:border-[var(--color-border-muted)]"
      }`}
      style={{ backgroundColor: "var(--color-bg-elevated)" }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">{prospect.company_name}</span>
        {overdue && <span className="text-xs ml-1 flex-shrink-0">⚠️</span>}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-2">{prospect.contact_name}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <Badge variant={prospect.deal_type === "expansion" ? "green" : "blue"}>
          {prospect.deal_type === "expansion" ? "Expansion" : "New"}
        </Badge>
        {prospect.estimated_value_usd && (
          <Badge variant="default">{formatCurrency(prospect.estimated_value_usd)}</Badge>
        )}
      </div>
      {prospect.next_step_date && (
        <div className="flex items-center gap-1.5 mb-1">
          <Badge variant={dateBadgeVariant}>
            {dateStatus === "overdue" ? "⚠️ Overdue" : ""} {formatDate(prospect.next_step_date)}
          </Badge>
        </div>
      )}
      {prospect.next_step_description && (
        <p className="text-xs text-[var(--color-text-subtle)] truncate mt-1">→ {prospect.next_step_description}</p>
      )}
    </button>
  );
}

// ─── KANBAN COLUMN ──────────────────────────────
function KanbanColumn({ stage, prospects, onCardClick }) {
  const count = prospects.length;
  const weightedValue = prospects.reduce((sum, p) => {
    const val = p.estimated_value_usd || 0;
    return sum + (val * (stage.probability / 100));
  }, 0);

  return (
    <div className="flex flex-col min-w-[200px] max-w-[240px] flex-shrink-0">
      {/* Column header */}
      <div
        className="rounded-t-lg px-3 py-2 border border-b-0 border-[var(--color-border-default)]"
        style={{ backgroundColor: "var(--color-bg-overlay)" }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{stage.label}</span>
          <span className="text-xs font-bold text-[var(--color-text-muted)] tabular-nums">{count}</span>
        </div>
        {stage.probability > 0 && weightedValue > 0 && (
          <p className="text-xs text-[var(--color-text-ghost)] tabular-nums">{formatCurrency(weightedValue)} weighted</p>
        )}
        {stage.probability > 0 && (
          <p className="text-xs text-[var(--color-text-ghost)]">{stage.probability}% probability</p>
        )}
      </div>
      {/* Cards */}
      <div
        className="flex-1 p-2 space-y-2 rounded-b-lg border border-t-0 border-[var(--color-border-default)] min-h-[120px] overflow-y-auto"
        style={{ backgroundColor: "var(--color-bg-sunken)", maxHeight: "calc(100vh - 320px)" }}
      >
        {prospects.length === 0 && (
          <p className="text-xs text-[var(--color-text-ghost)] text-center py-4 italic">No prospects</p>
        )}
        {prospects.map(p => (
          <ProspectCard key={p.id} prospect={p} onClick={() => onCardClick(p)} />
        ))}
      </div>
    </div>
  );
}

// ─── SUMMARY STATS BAR ─────────────────────────
function SummaryBar({ prospects }) {
  const active = prospects.filter(p => p.stage !== "falldown");
  const totalCount = prospects.length;
  const weightedValue = active.reduce((sum, p) => {
    const val = p.estimated_value_usd || 0;
    const prob = STAGE_PROBABILITY[p.stage] || 0;
    return sum + (val * prob / 100);
  }, 0);
  const falldownCount = prospects.filter(p => p.stage === "falldown").length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const closedThisMonth = prospects.filter(p => {
    if (p.stage !== "closed") return false;
    const history = p.stage_history || [];
    const closedEntry = [...history].reverse().find(h => h.stage === "closed");
    if (!closedEntry) return false;
    return new Date(closedEntry.entered_at) >= monthStart;
  }).length;
  const overdueCount = prospects.filter(isOverdue).length;

  return (
    <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-lg border border-[var(--color-border-default)]" style={{ backgroundColor: "var(--color-bg-elevated)" }}>
      <div>
        <span className="text-xs text-[var(--color-text-ghost)] block">Total Prospects</span>
        <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{totalCount}</span>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-ghost)] block">Weighted Pipeline</span>
        <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{formatCurrency(weightedValue)}</span>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-ghost)] block">Falldowns</span>
        <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{falldownCount}</span>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-ghost)] block">Closed This Month</span>
        <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{closedThisMonth}</span>
      </div>
      {overdueCount > 0 && (
        <div>
          <span className="text-xs text-red-400 block">Overdue</span>
          <span className="text-lg font-bold text-red-400 tabular-nums">{overdueCount}</span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PIPELINE TAB ──────────────────────────
export default function PipelineTab({ clients = [] }) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  // IVC seed data
  const IVC_SEED = [
    {
      id: uuid(), company_name: "IVC", contact_name: "IVC Leadership",
      contact_email: "", stage: "proposal", probability: 50,
      estimated_value_usd: 60000, deal_type: "expansion", client_ref: "",
      next_step_date: "2026-04-01", next_step_description: "Awaiting SOW signature",
      source: "expansion", notes: "Managed Platform MSA", falldown_reason: "",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      stage_history: [{ stage: "proposal", entered_at: new Date().toISOString() }],
    },
    {
      id: uuid(), company_name: "IVC", contact_name: "IVC Engineering",
      contact_email: "", stage: "gathering_info", probability: 25,
      estimated_value_usd: null, deal_type: "expansion", client_ref: "",
      next_step_date: "2026-03-31", next_step_description: "Blocked on 3 IVC data items",
      source: "expansion", notes: "SolidWorks + ERP Integration", falldown_reason: "",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      stage_history: [{ stage: "gathering_info", entered_at: new Date().toISOString() }],
    },
    {
      id: uuid(), company_name: "IVC", contact_name: "IVC Engineering",
      contact_email: "", stage: "gathering_info", probability: 25,
      estimated_value_usd: null, deal_type: "expansion", client_ref: "",
      next_step_date: "2026-04-15", next_step_description: "Depends on ERP integration completion",
      source: "expansion", notes: "Estimation Platform", falldown_reason: "",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      stage_history: [{ stage: "gathering_info", entered_at: new Date().toISOString() }],
    },
    {
      id: uuid(), company_name: "IVC", contact_name: "IVC Leadership",
      contact_email: "", stage: "gathering_info", probability: 25,
      estimated_value_usd: null, deal_type: "expansion", client_ref: "",
      next_step_date: "2026-04-01", next_step_description: "Scoping phase — grant approved",
      source: "expansion", notes: "ESSOR Discovery", falldown_reason: "",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      stage_history: [{ stage: "gathering_info", entered_at: new Date().toISOString() }],
    },
  ];

  // Load
  useEffect(() => {
    (async () => {
      const data = await getData(STORAGE_KEY);
      if (data && Array.isArray(data) && data.length > 0) {
        setProspects(data);
      } else {
        // Seed with IVC data on first load
        setProspects(IVC_SEED);
        await setData(STORAGE_KEY, IVC_SEED);
      }
      setLoading(false);
    })();
  }, []);

  // Save
  const save = useCallback((updated) => {
    setProspects(updated);
    setData(STORAGE_KEY, updated);
  }, []);

  // Add prospect
  const addProspect = (formData) => {
    const now = new Date().toISOString();
    const prospect = {
      ...formData,
      id: uuid(),
      created_at: now,
      updated_at: now,
      stage_history: [{ stage: formData.stage, entered_at: now }],
    };
    save([...prospects, prospect]);
    setShowForm(false);
  };

  // Update prospect
  const updateProspect = (formData) => {
    const now = new Date().toISOString();
    const updated = prospects.map(p => {
      if (p.id !== formData.id) return p;
      const stageChanged = p.stage !== formData.stage;
      const history = [...(p.stage_history || [])];
      if (stageChanged) {
        history.push({ stage: formData.stage, entered_at: now });
      }
      return {
        ...p,
        ...formData,
        updated_at: now,
        stage_history: history,
      };
    });
    save(updated);
    setEditing(null);
  };

  // Delete prospect
  const deleteProspect = (id) => {
    save(prospects.filter(p => p.id !== id));
    setEditing(null);
  };

  // Filter
  const displayed = useMemo(() => {
    if (!overdueOnly) return prospects;
    return prospects.filter(isOverdue);
  }, [prospects, overdueOnly]);

  // Group by stage
  const byStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach(s => { grouped[s.id] = []; });
    displayed.forEach(p => {
      if (grouped[p.stage]) grouped[p.stage].push(p);
    });
    return grouped;
  }, [displayed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14 text-sm text-[var(--color-text-subtle)]">
        Loading pipeline...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">Pipeline Board</h2>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">DEI prospect management</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={e => setOverdueOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-[var(--color-text-muted)]">Show overdue only</span>
          </label>
          <Btn small primary onClick={() => setShowForm(true)}>+ Add Prospect</Btn>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryBar prospects={prospects} />

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "300px" }}>
        {STAGES.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            prospects={byStage[stage.id] || []}
            onCardClick={p => setEditing(p)}
          />
        ))}
      </div>

      {/* Add Modal */}
      {showForm && (
        <ModalOverlay title="Add Prospect" onClose={() => setShowForm(false)}>
          <ProspectForm
            clients={clients}
            onSave={addProspect}
            onCancel={() => setShowForm(false)}
          />
        </ModalOverlay>
      )}

      {/* Edit Modal */}
      {editing && (
        <ModalOverlay title="Edit Prospect" onClose={() => setEditing(null)}>
          <ProspectForm
            initial={editing}
            clients={clients}
            onSave={updateProspect}
            onCancel={() => setEditing(null)}
            onDelete={() => deleteProspect(editing.id)}
          />
        </ModalOverlay>
      )}
    </div>
  );
}
