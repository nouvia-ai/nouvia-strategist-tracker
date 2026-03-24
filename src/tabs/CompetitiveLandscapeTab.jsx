/**
 * CompetitiveLandscapeTab — NIP BSP Section
 * Four views: CBM (4-quadrant positioning map), Registry, Comparison Matrix, Gap Analysis
 * Includes Add/Edit forms for competitors, matrix cells, and analysis.
 */
import { useState, useRef, useCallback, useMemo } from "react";
import {
  useCompetitiveLandscape,
  COMPETITOR_TYPES,
  THREAT_LEVELS,
  COMPARISON_DIMENSIONS,
  COMPARISON_STATUS,
  MATRIX_CONFIGS,
} from "../hooks/useCompetitiveLandscape";

/* ── Design tokens ───────────────────────────── */
const card = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-default)',
  backgroundColor: 'var(--color-bg-elevated)',
  padding: 'var(--space-6)',
  fontFamily: 'var(--font-sans)',
  boxShadow: 'var(--shadow-sm)',
};

const badge = (bg, fg) => ({
  display: "inline-flex", alignItems: "center",
  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
  padding: "2px 8px", borderRadius: 'var(--radius-sm)',
  backgroundColor: bg, color: fg, lineHeight: "1.4",
  letterSpacing: 'var(--letter-spacing-wide)', textTransform: "uppercase",
});

const inputStyle = {
  width: "100%", fontSize: 'var(--font-size-sm)', padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-input-border)',
  backgroundColor: 'var(--color-input-bg)', color: 'var(--color-input-text)',
  fontFamily: 'var(--font-sans)', outline: "none", boxSizing: "border-box",
};

const btnPrimary = {
  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
  padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)',
  border: 'none', cursor: "pointer", fontFamily: 'var(--font-sans)',
  backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)',
};

const btnGhost = {
  ...btnPrimary,
  backgroundColor: 'var(--color-btn-ghost-bg)', color: 'var(--color-btn-ghost-text)',
};

const THREAT_BADGE = {
  High: { bg: "var(--color-badge-red-bg)", fg: "var(--color-badge-red-text)" },
  Medium: { bg: "var(--color-badge-amber-bg)", fg: "var(--color-badge-amber-text)" },
  Low: { bg: "var(--color-badge-green-bg)", fg: "var(--color-badge-green-text)" },
};

const TYPE_BADGE = {
  Direct: { bg: "var(--color-badge-red-bg)", fg: "var(--color-badge-red-text)" },
  Adjacent: { bg: "var(--color-badge-blue-bg)", fg: "var(--color-badge-blue-text)" },
  Emerging: { bg: "var(--color-badge-purple-bg)", fg: "var(--color-badge-purple-text)" },
};

/* ── CBM — 4-Quadrant Positioning Map ──────── */
function CBMMap({ competitors, activeMatrixId, onUpdatePosition, onSelectCompetitor }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const config = MATRIX_CONFIGS.find(m => m.id === activeMatrixId) || MATRIX_CONFIGS[0];

  // SVG layout
  const W = 800, H = 600;
  const PAD = 60; // padding for labels
  const plotW = W - PAD * 2, plotH = H - PAD * 2;

  const toSvgX = (pct) => PAD + (pct / 100) * plotW;
  const toSvgY = (pct) => PAD + ((100 - pct) / 100) * plotH; // invert Y
  const fromSvgX = (sx) => Math.max(0, Math.min(100, Math.round(((sx - PAD) / plotW) * 100)));
  const fromSvgY = (sy) => Math.max(0, Math.min(100, Math.round(((1 - (sy - PAD) / plotH)) * 100)));

  const getBubbleSize = (c) => {
    if (c.is_self) return 28;
    if (c.threat_level === "High") return 22;
    if (c.threat_level === "Medium") return 18;
    return 14;
  };

  const getBubbleColor = (c) => {
    if (c.is_self) return "#0A84FF";
    if (c.threat_level === "High") return "var(--color-error)";
    if (c.threat_level === "Medium") return "var(--color-warning)";
    return "var(--color-text-subtle)";
  };

  const handleMouseDown = useCallback((e, comp) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(comp.id);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const x = fromSvgX(sx);
    const y = fromSvgY(sy);
    onUpdatePosition(dragging, activeMatrixId, x, y);
  }, [dragging, activeMatrixId, onUpdatePosition, fromSvgX, fromSvgY]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const centerX = PAD + plotW / 2;
  const centerY = PAD + plotH / 2;

  return (
    <div style={{ position: "relative", marginBottom: "var(--space-6)" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, height: "auto", minHeight: 500, display: "block", margin: "0 auto", cursor: dragging ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="var(--color-bg-elevated)" rx={8} />

        {/* Quadrant fills — very subtle */}
        <rect x={PAD} y={PAD} width={plotW / 2} height={plotH / 2} fill="var(--color-bg-overlay)" opacity={0.3} />
        <rect x={centerX} y={PAD} width={plotW / 2} height={plotH / 2} fill="var(--color-bg-base)" opacity={0.15} />
        <rect x={PAD} y={centerY} width={plotW / 2} height={plotH / 2} fill="var(--color-bg-base)" opacity={0.15} />
        <rect x={centerX} y={centerY} width={plotW / 2} height={plotH / 2} fill="var(--color-bg-overlay)" opacity={0.3} />

        {/* Grid lines — dashed */}
        <line x1={centerX} y1={PAD} x2={centerX} y2={PAD + plotH} stroke="var(--color-border-muted)" strokeWidth={1} strokeDasharray="6 4" />
        <line x1={PAD} y1={centerY} x2={PAD + plotW} y2={centerY} stroke="var(--color-border-muted)" strokeWidth={1} strokeDasharray="6 4" />

        {/* Border */}
        <rect x={PAD} y={PAD} width={plotW} height={plotH} fill="none" stroke="var(--color-border-default)" strokeWidth={1} rx={4} />

        {/* Quadrant labels */}
        <text x={PAD + plotW * 0.25} y={PAD + plotH * 0.15} textAnchor="middle" fontSize={13} fill="var(--color-text-ghost)" fontFamily="var(--font-sans)" fontWeight={500}>{config.quadrant_labels.top_left}</text>
        <text x={PAD + plotW * 0.75} y={PAD + plotH * 0.15} textAnchor="middle" fontSize={13} fill="var(--color-text-ghost)" fontFamily="var(--font-sans)" fontWeight={500}>{config.quadrant_labels.top_right}</text>
        <text x={PAD + plotW * 0.25} y={PAD + plotH * 0.88} textAnchor="middle" fontSize={13} fill="var(--color-text-ghost)" fontFamily="var(--font-sans)" fontWeight={500}>{config.quadrant_labels.bottom_left}</text>
        <text x={PAD + plotW * 0.75} y={PAD + plotH * 0.88} textAnchor="middle" fontSize={13} fill="var(--color-text-ghost)" fontFamily="var(--font-sans)" fontWeight={500}>{config.quadrant_labels.bottom_right}</text>

        {/* Axis labels */}
        <text x={PAD + 4} y={H - 12} fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-sans)">{config.x_axis_left}</text>
        <text x={PAD + plotW} y={H - 12} textAnchor="end" fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-sans)">{config.x_axis_right}</text>
        <text x={12} y={PAD + plotH} fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-sans)" transform={`rotate(-90, 12, ${PAD + plotH})`}>{config.y_axis_bottom}</text>
        <text x={12} y={PAD + 10} fontSize={11} fill="var(--color-text-muted)" fontFamily="var(--font-sans)" transform={`rotate(-90, 12, ${PAD + 10})`}>{config.y_axis_top}</text>

        {/* Bubbles */}
        {competitors.map(c => {
          const pos = c.matrix_positions?.[activeMatrixId];
          if (!pos) return null;
          const cx = toSvgX(pos.x);
          const cy = toSvgY(pos.y);
          const r = getBubbleSize(c);
          const color = getBubbleColor(c);
          const isDraggingThis = dragging === c.id;

          return (
            <g key={c.id}
              onMouseDown={(e) => handleMouseDown(e, c)}
              onMouseEnter={() => !dragging && setTooltip({ comp: c, x: cx, y: cy })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => !isDraggingThis && onSelectCompetitor?.(c)}
              style={{ cursor: isDraggingThis ? "grabbing" : "grab" }}
            >
              {/* Glow for Nouvia */}
              {c.is_self && <circle cx={cx} cy={cy} r={r + 6} fill={color} opacity={0.15} />}
              {/* Shadow */}
              <circle cx={cx + 1} cy={cy + 2} r={r} fill="rgba(0,0,0,0.15)" />
              {/* Bubble */}
              <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.85} stroke={c.is_self ? color : "none"} strokeWidth={c.is_self ? 2 : 0} />
              {/* Label */}
              <text x={cx} y={cy + r + 14} textAnchor="middle" fontSize={11} fontWeight={c.is_self ? 700 : 500} fill="var(--color-text-primary)" fontFamily="var(--font-sans)">
                {c.name.length > 20 ? c.name.slice(0, 18) + "\u2026" : c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)",
          padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-bg-overlay)", border: "1px solid var(--color-border-muted)",
          boxShadow: "var(--shadow-md)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-sans)",
          color: "var(--color-text-primary)", pointerEvents: "none", zIndex: 10,
          maxWidth: 300, textAlign: "center",
        }}>
          <strong>{tooltip.comp.name}</strong>
          {tooltip.comp.threat_level && <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>{tooltip.comp.threat_level} threat</span>}
          {tooltip.comp.key_differentiator && (
            <div style={{ color: "var(--color-text-muted)", marginTop: 2 }}>{tooltip.comp.key_differentiator}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-views ──────────────────────────────── */
const VIEWS = [
  { id: "cbm", label: "Positioning Map" },
  { id: "registry", label: "Registry" },
  { id: "matrix", label: "Comparison Matrix" },
  { id: "analysis", label: "Gap Analysis" },
];

/* ── Competitor Form ─────────────────────────── */
function CompetitorForm({ competitor, onSave, onCancel }) {
  const isEdit = !!competitor;
  const [form, setForm] = useState({
    name: competitor?.name || "",
    type: competitor?.type || "Direct",
    description: competitor?.description || "",
    threat_level: competitor?.threat_level || "Medium",
    key_differentiator: competitor?.key_differentiator || "",
    weakness: competitor?.weakness || "",
    website: competitor?.website || "",
    notes: competitor?.notes || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={card}>
      <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
        {isEdit ? "Edit Competitor" : "Add Competitor"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Name *</label>
          <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Competitor name" />
        </div>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Type</label>
          <select style={inputStyle} value={form.type} onChange={e => set("type", e.target.value)}>
            {COMPETITOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Threat Level</label>
          <select style={inputStyle} value={form.threat_level} onChange={e => set("threat_level", e.target.value)}>
            {THREAT_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Website</label>
          <input style={inputStyle} value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What do they do?" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Key Differentiator</label>
          <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={form.key_differentiator} onChange={e => set("key_differentiator", e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Weakness</label>
          <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={form.weakness} onChange={e => set("weakness", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Notes</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 'var(--space-2)' }}>
        <button style={btnPrimary} onClick={() => { if (form.name.trim()) onSave(form); }} disabled={!form.name.trim()}>
          {isEdit ? "Save Changes" : "Add Competitor"}
        </button>
        <button style={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Matrix Cell Editor ──────────────────────── */
function MatrixCellEditor({ cell, onSave, onCancel }) {
  const [status, setStatus] = useState(cell.status || "unknown");
  const [notes, setNotes] = useState(cell.notes || "");

  return (
    <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-muted)' }}>
      <select style={{ ...inputStyle, marginBottom: 'var(--space-2)' }} value={status} onChange={e => setStatus(e.target.value)}>
        {Object.entries(COMPARISON_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input style={{ ...inputStyle, marginBottom: 'var(--space-2)' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." />
      <div style={{ display: "flex", gap: 'var(--space-1)' }}>
        <button style={{ ...btnPrimary, padding: "4px 12px", fontSize: 11 }} onClick={() => onSave(status, notes)}>Save</button>
        <button style={{ ...btnGhost, padding: "4px 12px", fontSize: 11 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Analysis Editor ─────────────────────────── */
function AnalysisEditor({ analysis, onSave, onCancel }) {
  const [form, setForm] = useState({
    summary: analysis?.summary || "",
    strengths: (analysis?.strengths || []).join("\n"),
    weaknesses: (analysis?.weaknesses || []).join("\n"),
    opportunities: (analysis?.opportunities || []).join("\n"),
    threats: (analysis?.threats || []).join("\n"),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toArray = (s) => s.split("\n").map(l => l.trim()).filter(Boolean);

  return (
    <div style={card}>
      <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
        Edit Competitive Analysis
      </h3>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>Summary</label>
        <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={form.summary} onChange={e => set("summary", e.target.value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {[["strengths", "Strengths"], ["weaknesses", "Weaknesses"], ["opportunities", "Opportunities"], ["threats", "Threats"]].map(([key, label]) => (
          <div key={key}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-muted)', display: "block", marginBottom: 4 }}>{label} (one per line)</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 'var(--space-2)' }}>
        <button style={btnPrimary} onClick={() => onSave({
          summary: form.summary,
          strengths: toArray(form.strengths),
          weaknesses: toArray(form.weaknesses),
          opportunities: toArray(form.opportunities),
          threats: toArray(form.threats),
        })}>Save Analysis</button>
        <button style={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Registry View ───────────────────────────── */
function RegistryView({ competitors, onAdd, onEdit, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  if (adding) return <CompetitorForm onSave={async (data) => { await onAdd(data); setAdding(false); }} onCancel={() => setAdding(false)} />;
  if (editing) return <CompetitorForm competitor={editing} onSave={async (data) => { await onEdit(editing.id, data); setEditing(null); }} onCancel={() => setEditing(null)} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
        </p>
        <button style={btnPrimary} onClick={() => setAdding(true)}>+ Add Competitor</button>
      </div>

      {competitors.map(c => {
        const tb = THREAT_BADGE[c.threat_level] || THREAT_BADGE.Medium;
        const typb = TYPE_BADGE[c.type] || TYPE_BADGE.Direct;
        const isExpanded = expanded === c.id;

        return (
          <div key={c.id} style={{ ...card, marginBottom: 'var(--space-3)', cursor: "pointer" }}
            onClick={() => setExpanded(isExpanded ? null : c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: "wrap" }}>
                  <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{c.name}</span>
                  <span style={badge(typb.bg, typb.fg)}>{c.type}</span>
                  <span style={badge(tb.bg, tb.fg)}>{c.threat_level} Threat</span>
                </div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>{c.description}</p>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', flexShrink: 0, marginLeft: 'var(--space-2)' }}>
                {isExpanded ? "\u25b2" : "\u25bc"}
              </span>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-default)', paddingTop: 'var(--space-4)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)', textTransform: "uppercase", marginBottom: 4 }}>Key Differentiator</div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{c.key_differentiator || "Not set"}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)', textTransform: "uppercase", marginBottom: 4 }}>Weakness</div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{c.weakness || "Not set"}</p>
                  </div>
                </div>
                {c.notes && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)', textTransform: "uppercase", marginBottom: 4 }}>Notes</div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{c.notes}</p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 'var(--space-2)' }}>
                  <button style={btnGhost} onClick={() => setEditing(c)}>Edit</button>
                  <button style={{ ...btnGhost, color: 'var(--color-error)' }} onClick={async () => { if (confirm("Delete " + c.name + "?")) await onDelete(c.id); }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Matrix View ─────────────────────────────── */
function MatrixView({ competitors, matrix, onUpdateCell }) {
  const [editingCell, setEditingCell] = useState(null); // { compId, dimId }

  return (
    <div style={{ overflowX: "auto" }}>
      <p style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
        Click any cell to set the comparison status and add notes.
      </p>

      <table style={{
        width: "100%", borderCollapse: "separate", borderSpacing: 0,
        fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-sans)',
        border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
        overflow: "hidden",
      }}>
        <thead>
          <tr>
            <th style={{
              textAlign: "left", padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-overlay)', borderBottom: '1px solid var(--color-border-default)',
              textTransform: "uppercase", letterSpacing: 'var(--letter-spacing-wider)',
              position: "sticky", left: 0, zIndex: 1, minWidth: 140,
            }}>
              Dimension
            </th>
            {competitors.map(c => (
              <th key={c.id} style={{
                textAlign: "center", padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-bg-overlay)', borderBottom: '1px solid var(--color-border-default)',
                minWidth: 150,
              }}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_DIMENSIONS.map((dim, i) => (
            <tr key={dim.id}>
              <td style={{
                padding: 'var(--space-3)', fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-elevated)',
                borderBottom: i < COMPARISON_DIMENSIONS.length - 1 ? '1px solid var(--color-border-default)' : 'none',
                position: "sticky", left: 0, zIndex: 1,
              }}>
                {dim.label}
              </td>
              {competitors.map(c => {
                const cell = (matrix[c.id] && matrix[c.id][dim.id]) || { status: "unknown", notes: "" };
                const st = COMPARISON_STATUS[cell.status] || COMPARISON_STATUS.unknown;
                const isEditing = editingCell?.compId === c.id && editingCell?.dimId === dim.id;

                return (
                  <td key={c.id} style={{
                    padding: 'var(--space-2)', textAlign: "center",
                    borderBottom: i < COMPARISON_DIMENSIONS.length - 1 ? '1px solid var(--color-border-default)' : 'none',
                    backgroundColor: 'var(--color-bg-elevated)',
                    cursor: isEditing ? "default" : "pointer",
                    verticalAlign: "top",
                  }}
                    onClick={() => { if (!isEditing) setEditingCell({ compId: c.id, dimId: dim.id }); }}
                  >
                    {isEditing ? (
                      <MatrixCellEditor
                        cell={cell}
                        onSave={async (status, notes) => { await onUpdateCell(c.id, dim.id, status, notes); setEditingCell(null); }}
                        onCancel={() => setEditingCell(null)}
                      />
                    ) : (
                      <div>
                        <span style={badge(
                          `var(--color-badge-${st.variant}-bg)`,
                          `var(--color-badge-${st.variant}-text)`
                        )}>{st.label}</span>
                        {cell.notes && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                            {cell.notes.length > 60 ? cell.notes.slice(0, 60) + "..." : cell.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Gap Analysis + SWOT View ────────────────── */
function AnalysisView({ analysis, gapAnalysis, onUpdateAnalysis }) {
  const [editing, setEditing] = useState(false);

  if (editing) return <AnalysisEditor analysis={analysis} onSave={async (data) => { await onUpdateAnalysis(data); setEditing(false); }} onCancel={() => setEditing(false)} />;

  const gaps = gapAnalysis.filter(g => g.status === "gap");
  const strengths = gapAnalysis.filter(g => g.status === "strong");

  return (
    <div>
      {/* Gap Analysis */}
      <div style={{ ...card, marginBottom: 'var(--space-4)' }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            Competitive Gap Analysis
          </h3>
        </div>

        {gaps.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)', textTransform: "uppercase", marginBottom: 'var(--space-2)' }}>
              Gaps ({gaps.length})
            </div>
            {gaps.map(g => (
              <div key={g.dimension.id} style={{
                padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-error-bg)', marginBottom: 'var(--space-2)',
                borderLeft: '3px solid var(--color-error)',
              }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{g.dimension.label}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                  {g.disadvantageCount} disadvantage{g.disadvantageCount !== 1 ? "s" : ""} vs {g.advantageCount} advantage{g.advantageCount !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {strengths.length > 0 && (
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-success)', textTransform: "uppercase", marginBottom: 'var(--space-2)' }}>
              Competitive Strengths ({strengths.length})
            </div>
            {strengths.map(g => (
              <div key={g.dimension.id} style={{
                padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-bg)', marginBottom: 'var(--space-2)',
                borderLeft: '3px solid var(--color-success)',
              }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{g.dimension.label}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                  {g.advantageCount} advantage{g.advantageCount !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SWOT Analysis */}
      {analysis && (
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              Competitive Analysis (SWOT)
            </h3>
            <button style={btnGhost} onClick={() => setEditing(true)}>Refresh Analysis</button>
          </div>

          {analysis.summary && (
            <p style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
              {analysis.summary}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-4)' }}>
            {[
              { key: "strengths", label: "Strengths", color: "var(--color-success)", bg: "var(--color-success-bg)" },
              { key: "weaknesses", label: "Weaknesses", color: "var(--color-error)", bg: "var(--color-error-bg)" },
              { key: "opportunities", label: "Opportunities", color: "var(--color-info)", bg: "var(--color-info-bg)" },
              { key: "threats", label: "Threats", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
            ].map(({ key, label, color, bg }) => (
              <div key={key} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: bg }}>
                <div style={{
                  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
                  color, textTransform: "uppercase", letterSpacing: 'var(--letter-spacing-wider)',
                  marginBottom: 'var(--space-2)',
                }}>{label}</div>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', listStyle: "disc" }}>
                  {(analysis[key] || []).map((item, i) => (
                    <li key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4, lineHeight: 'var(--line-height-relaxed)' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {analysis.updated_at && (
            <p style={{ margin: 0, marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)' }}>
              Last updated: {new Date(analysis.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {analysis.data_source ? ` \u00b7 Source: ${analysis.data_source}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════ */
export default function CompetitiveLandscapeTab() {
  const {
    competitors, matrix, analysis, gapAnalysis, loading,
    addCompetitor, updateCompetitor, deleteCompetitor,
    updateMatrixCell, updateAnalysis, updatePosition,
  } = useCompetitiveLandscape();
  const [view, setView] = useState("cbm");
  const [activeMatrixId, setActiveMatrixId] = useState("market_position");

  if (loading) {
    return <div style={{ padding: 'var(--space-8)', textAlign: "center", color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>Loading competitive landscape...</div>;
  }

  // Filter out Nouvia from registry/matrix views (it's only shown on the CBM)
  const externalCompetitors = competitors.filter(c => !c.is_self);

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 'var(--space-4)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', letterSpacing: 'var(--letter-spacing-tight)' }}>
          Competitive Landscape
        </h2>

        {/* Matrix selector — only shown on CBM view */}
        {view === "cbm" && (
          <select
            value={activeMatrixId}
            onChange={e => setActiveMatrixId(e.target.value)}
            style={{
              fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-input-border)',
              backgroundColor: 'var(--color-input-bg)', color: 'var(--color-input-text)',
              fontFamily: 'var(--font-sans)', outline: "none",
            }}
          >
            {MATRIX_CONFIGS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 'var(--space-1)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: 'var(--space-1)' }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--font-size-sm)',
            fontWeight: view === v.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: view === v.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            backgroundColor: view === v.id ? 'var(--color-bg-overlay)' : 'transparent',
            border: 'none', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            cursor: "pointer", fontFamily: 'var(--font-sans)',
            borderBottom: view === v.id ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === "cbm" && (
        <CBMMap
          competitors={competitors}
          activeMatrixId={activeMatrixId}
          onUpdatePosition={updatePosition}
          onSelectCompetitor={(c) => { if (!c.is_self) setView("registry"); }}
        />
      )}
      {view === "registry" && <RegistryView competitors={externalCompetitors} onAdd={addCompetitor} onEdit={updateCompetitor} onDelete={deleteCompetitor} />}
      {view === "matrix" && <MatrixView competitors={externalCompetitors} matrix={matrix} onUpdateCell={updateMatrixCell} />}
      {view === "analysis" && <AnalysisView analysis={analysis} gapAnalysis={gapAnalysis} onUpdateAnalysis={updateAnalysis} />}
    </div>
  );
}
