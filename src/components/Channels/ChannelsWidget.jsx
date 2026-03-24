/**
 * ChannelsWidget — NIP Phase 5
 * Dashboard widget + detail + edit form for channel monitoring.
 */
import { useState } from "react";
import { CHANNEL_TYPES, STATUS_CONFIG, isCanvasStale } from "../../hooks/useChannels";

const BMC_BLOCKS = [
  { id: "key_partners", label: "Key Partners" },
  { id: "key_activities", label: "Key Activities" },
  { id: "key_resources", label: "Key Resources" },
  { id: "value_propositions", label: "Value Propositions" },
  { id: "customer_relationships", label: "Customer Relationships" },
  { id: "channels", label: "Channels" },
  { id: "customer_segments", label: "Customer Segments" },
  { id: "cost_structure", label: "Cost Structure" },
  { id: "revenue_streams", label: "Revenue Streams" },
];

function getTypeIcon(type) {
  const found = CHANNEL_TYPES.find(t => t.value === type);
  return found ? found.icon : "\u{1F4CC}";
}

function getTypeLabel(type) {
  const found = CHANNEL_TYPES.find(t => t.value === type);
  return found ? found.label : "Other";
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const bgColors = {
    green: "var(--color-badge-green-bg)", amber: "var(--color-badge-amber-bg)",
    red: "var(--color-badge-red-bg)", default: "var(--color-badge-gray-bg)",
  };
  const textColors = {
    green: "var(--color-badge-green-text)", amber: "var(--color-badge-amber-text)",
    red: "var(--color-badge-red-text)", default: "var(--color-badge-gray-text)",
  };
  return (
    <span style={{
      fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)",
      padding: "2px 8px", borderRadius: 999,
      backgroundColor: bgColors[config.variant], color: textColors[config.variant],
      whiteSpace: "nowrap",
    }}>
      {config.emoji} {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    high: { bg: "var(--color-badge-red-bg)", text: "var(--color-badge-red-text)" },
    medium: { bg: "var(--color-badge-amber-bg)", text: "var(--color-badge-amber-text)" },
    low: { bg: "var(--color-badge-gray-bg)", text: "var(--color-badge-gray-text)" },
  };
  const c = colors[priority] || colors.low;
  return (
    <span style={{
      fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)",
      padding: "2px 8px", borderRadius: 999,
      backgroundColor: c.bg, color: c.text, whiteSpace: "nowrap",
    }}>
      {priority}
    </span>
  );
}

const STATUS_ORDER = { needs_update: 0, stale: 1, aligned: 2, planned: 3 };

function sortChannels(channels) {
  return [...channels].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 4;
    const ob = STATUS_ORDER[b.status] ?? 4;
    return oa - ob;
  });
}

const formatDate = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/* ── Dashboard Section ─────────────────────────── */
export function ChannelsSection({ channels, loading, canvasLastModified, onSelectChannel }) {
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "var(--space-6) var(--space-4)", borderRadius: "var(--radius-lg)",
        border: "1px dashed var(--color-border-muted)", backgroundColor: "var(--color-bg-overlay)",
        flex: 1, minWidth: 0,
      }}>
        <div style={{ fontSize: 28, marginBottom: "var(--space-2)", opacity: 0.4 }}>{"\u{1F4E1}"}</div>
        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", margin: 0 }}>Channels</p>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", margin: 0 }}>Loading channels...</p>
      </div>
    );
  }

  const sorted = sortChannels(channels);
  const needsAttention = channels.filter(ch => ch.status === "needs_update" || ch.status === "stale").length;
  const staleFromCanvas = channels.filter(ch => isCanvasStale(ch, canvasLastModified)).length;

  return (
    <div style={{
      backgroundColor: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4)",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>
            {"\u{1F4E1}"} Channels
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)", marginTop: 2 }}>
            {channels.length} channels{needsAttention > 0 ? ` \u00B7 ${needsAttention} need attention` : ""}
            {staleFromCanvas > 0 ? ` \u00B7 ${staleFromCanvas} canvas-stale` : ""}
          </div>
        </div>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--color-text-ghost)", fontSize: "var(--font-size-xs)" }}>
          No channels configured
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {sorted.map(ch => {
          const canvasStale = isCanvasStale(ch, canvasLastModified);
          return (
            <button
              key={ch.id}
              onClick={() => onSelectChannel(ch)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                width: "100%", textAlign: "left",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-default)",
                backgroundColor: "var(--color-bg-base)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-muted)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-default)"; }}
            >
              <span style={{ fontSize: "var(--font-size-sm)", flexShrink: 0 }}>{getTypeIcon(ch.type)}</span>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)", flexShrink: 0 }}>
                {ch.name}
              </span>
              <StatusBadge status={ch.status} />
              {canvasStale && (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-badge-amber-text)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {"\u26A0\uFE0F"} Canvas updated
                </span>
              )}
              <span style={{
                fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)",
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                minWidth: 0,
              }}>
                {ch.next_action}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Channel Detail ────────────────────────────── */
export function ChannelDetail({ channel, canvasLastModified, onBack, onEdit, onDelete }) {
  const canvasStale = isCanvasStale(channel, canvasLastModified);
  const depLabels = (channel.canvas_dependencies || []).map(dep => {
    const block = BMC_BLOCKS.find(b => b.id === dep);
    return block ? block.label : dep;
  });

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)",
          marginBottom: "var(--space-4)", padding: 0, fontFamily: "var(--font-sans)",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--color-text-subtle)"; }}
      >
        {"\u2190"} Back to Dashboard
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: 24 }}>{getTypeIcon(channel.type)}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{channel.name}</h3>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)" }}>{getTypeLabel(channel.type)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            onClick={onEdit}
            style={{
              padding: "var(--space-1) var(--space-3)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)",
              backgroundColor: "var(--color-btn-primary-bg)", color: "var(--color-btn-primary-text)",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: "var(--space-1) var(--space-3)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)",
              backgroundColor: "var(--color-bg-overlay)", color: "var(--color-text-secondary)",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
      }}>
        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <StatusBadge status={channel.status} />
          <PriorityBadge priority={channel.priority} />
          {canvasStale && (
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-badge-amber-text)", fontWeight: "var(--font-weight-medium)" }}>
              {"\u26A0\uFE0F"} Canvas updated since last alignment check
            </span>
          )}
        </div>

        {/* URL */}
        {channel.url && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", marginBottom: 4 }}>URL</div>
            <a href={channel.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-accent)", textDecoration: "none" }}>
              {channel.url}
            </a>
          </div>
        )}

        {/* Canvas Dependencies */}
        {depLabels.length > 0 && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", marginBottom: 4 }}>Canvas Dependencies</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {depLabels.map((label, i) => (
                <span key={i} style={{
                  fontSize: "var(--font-size-xs)", padding: "2px 8px", borderRadius: 999,
                  backgroundColor: "var(--color-badge-cyan-bg)", color: "var(--color-badge-cyan-text)",
                  fontWeight: "var(--font-weight-medium)",
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alignment Notes */}
        {channel.alignment_notes && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", marginBottom: 4 }}>Alignment Notes</div>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{channel.alignment_notes}</p>
          </div>
        )}

        {/* Next Action */}
        {channel.next_action && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", marginBottom: 4 }}>Next Action</div>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", margin: 0, fontWeight: "var(--font-weight-medium)" }}>{channel.next_action}</p>
          </div>
        )}

        {/* Owner */}
        {channel.owner && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-muted)", marginBottom: 4 }}>Owner</div>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", margin: 0 }}>{channel.owner}</p>
          </div>
        )}

        {/* Dates */}
        <div style={{ display: "flex", gap: "var(--space-6)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-default)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)" }}>Last Updated</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{formatDate(channel.last_updated)}</div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)" }}>Last Alignment Check</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{formatDate(channel.last_alignment_check)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Channel Edit Form ─────────────────────────── */
const inputStyle = {
  width: "100%", backgroundColor: "var(--color-bg-overlay)",
  border: "1px solid var(--color-border-muted)", borderRadius: "var(--radius-md)",
  padding: "6px 10px", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)",
  fontFamily: "var(--font-sans)", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)",
  color: "var(--color-text-muted)", marginBottom: 4,
};

export function ChannelEditForm({ channel, onSave, onCancel }) {
  const isEditing = !!channel;
  const [form, setForm] = useState({
    name: channel?.name || "",
    type: channel?.type || "website",
    url: channel?.url || "",
    status: channel?.status || "planned",
    canvas_dependencies: channel?.canvas_dependencies || [],
    alignment_notes: channel?.alignment_notes || "",
    next_action: channel?.next_action || "",
    priority: channel?.priority || "medium",
    owner: channel?.owner || "",
    last_updated: channel?.last_updated || new Date().toISOString().split("T")[0],
  });

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleDep = (blockId) => {
    setForm(prev => {
      const deps = prev.canvas_dependencies.includes(blockId)
        ? prev.canvas_dependencies.filter(d => d !== blockId)
        : [...prev.canvas_dependencies, blockId];
      return { ...prev, canvas_dependencies: deps };
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <h3 style={{ margin: 0, marginBottom: "var(--space-4)", fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
        {isEditing ? "Edit Channel" : "Add Channel"}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. nouvia.ai Website" />
        </div>

        {/* Type */}
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.type} onChange={e => set("type", e.target.value)}>
            {CHANNEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>

        {/* URL */}
        <div>
          <label style={labelStyle}>URL</label>
          <input style={inputStyle} value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." />
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Canvas Dependencies */}
        <div>
          <label style={labelStyle}>Canvas Dependencies</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {BMC_BLOCKS.map(block => {
              const checked = form.canvas_dependencies.includes(block.id);
              return (
                <label key={block.id} style={{
                  display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                  fontSize: "var(--font-size-xs)", color: checked ? "var(--color-text-primary)" : "var(--color-text-muted)",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDep(block.id)}
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  {block.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Alignment Notes */}
        <div>
          <label style={labelStyle}>Alignment Notes</label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
            value={form.alignment_notes}
            onChange={e => set("alignment_notes", e.target.value)}
            placeholder="How does this channel relate to the current canvas?"
            rows={3}
          />
        </div>

        {/* Next Action */}
        <div>
          <label style={labelStyle}>Next Action</label>
          <input style={inputStyle} value={form.next_action} onChange={e => set("next_action", e.target.value)} placeholder="What's the next step?" />
        </div>

        {/* Priority */}
        <div>
          <label style={labelStyle}>Priority</label>
          <select style={inputStyle} value={form.priority} onChange={e => set("priority", e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Owner */}
        <div>
          <label style={labelStyle}>Owner</label>
          <input style={inputStyle} value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="e.g. Ben" />
        </div>

        {/* Last Updated */}
        <div>
          <label style={labelStyle}>Last Updated</label>
          <input type="date" style={inputStyle} value={form.last_updated} onChange={e => set("last_updated", e.target.value)} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: "var(--space-2)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)",
              backgroundColor: "var(--color-btn-primary-bg)", color: "var(--color-btn-primary-text)",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "var(--space-2)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)",
              backgroundColor: "var(--color-bg-overlay)", color: "var(--color-text-secondary)",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
