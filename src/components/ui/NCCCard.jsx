/**
 * NCCCard — INT-001 TASK-07 (NCC-006)
 * Displays a single IP Library / NCC entry.
 * Props: item, onEdit, onRemove
 */

const STATUS_VARIANT = {
  Active:      "green",
  Candidate:   "blue",
  Proposed:    "amber",
  Deprecated:  "gray",
};

const REUSE_VARIANT = {
  High:   "green",
  Medium: "amber",
  Low:    "gray",
};

const TYPE_VARIANT = {
  Component: "purple",
  Pattern:   "cyan",
  Hook:      "blue",
  System:    "amber",
};

function NCCBadge({ children, variant = "gray" }) {
  const colors = {
    gray:   { bg: "var(--color-badge-gray-bg)",   text: "var(--color-badge-gray-text)"   },
    green:  { bg: "var(--color-badge-green-bg)",  text: "var(--color-badge-green-text)"  },
    amber:  { bg: "var(--color-badge-amber-bg)",  text: "var(--color-badge-amber-text)"  },
    blue:   { bg: "var(--color-badge-blue-bg)",   text: "var(--color-badge-blue-text)"   },
    purple: { bg: "var(--color-badge-purple-bg)", text: "var(--color-badge-purple-text)" },
    cyan:   { bg: "var(--color-badge-cyan-bg)",   text: "var(--color-badge-cyan-text)"   },
  };
  const c = colors[variant] || colors.gray;
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      backgroundColor: c.bg,
      color:           c.text,
      fontSize:        "var(--font-size-xs)",
      fontWeight:      "var(--font-weight-medium)",
      padding:         "2px var(--space-2)",
      borderRadius:    "var(--radius-full)",
      whiteSpace:      "nowrap",
      fontFamily:      "var(--font-sans)",
    }}>{children}</span>
  );
}

export default function NCCCard({ item, onEdit, onRemove }) {
  const card = {
    padding:         "var(--space-4)",
    backgroundColor: "var(--color-bg-elevated)",
    border:          "1px solid var(--color-border-default)",
    borderRadius:    "var(--radius-lg)",
    fontFamily:      "var(--font-sans)",
  };

  const topRow = {
    display:        "flex",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    marginBottom:   "var(--space-2)",
    gap:            "var(--space-3)",
  };

  const nameBlock = { flex: 1, minWidth: 0 };

  const nameRow = {
    display:     "flex",
    alignItems:  "center",
    gap:         "var(--space-2)",
    flexWrap:    "wrap",
    marginBottom: "var(--space-1)",
  };

  const actions = {
    display:    "flex",
    gap:        "var(--space-2)",
    flexShrink: 0,
  };

  const actionBtn = {
    fontSize:        "var(--font-size-xs)",
    color:           "var(--color-text-ghost)",
    background:      "none",
    border:          "none",
    cursor:          "pointer",
    padding:         0,
    fontFamily:      "var(--font-sans)",
    transition:      `color var(--duration-base) var(--ease-default)`,
  };

  const metaRow = {
    display:    "flex",
    gap:        "var(--space-2)",
    flexWrap:   "wrap",
    marginTop:  "var(--space-2)",
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={card}>
      <div style={topRow}>
        <div style={nameBlock}>
          <div style={nameRow}>
            {item.ncc_id && (
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                {item.ncc_id}
              </span>
            )}
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
              {item.name}
            </span>
          </div>
          {item.description && (
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: 0, lineHeight: "var(--leading-relaxed)" }}>
              {item.description}
            </p>
          )}
        </div>
        <div style={actions}>
          <button
            style={actionBtn}
            onClick={() => onEdit(item)}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--color-text-ghost)"; }}
          >edit</button>
          <button
            style={{ ...actionBtn }}
            onClick={() => onRemove(item.id)}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--color-badge-red-text)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--color-text-ghost)"; }}
          >remove</button>
        </div>
      </div>

      <div style={metaRow}>
        {item.status          && <NCCBadge variant={STATUS_VARIANT[item.status]  || "gray"}>{item.status}</NCCBadge>}
        {item.type            && <NCCBadge variant={TYPE_VARIANT[item.type]      || "gray"}>{item.type}</NCCBadge>}
        {item.reuse_potential && <NCCBadge variant={REUSE_VARIANT[item.reuse_potential] || "gray"}>↑ {item.reuse_potential} reuse</NCCBadge>}
        {item.source_project  && <NCCBadge variant="gray">{item.source_project}</NCCBadge>}
        {item.sow_reference   && <NCCBadge variant="gray">{item.sow_reference}</NCCBadge>}
      </div>

      {item.file_path && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)", fontFamily: "var(--font-mono)", marginTop: "var(--space-2)", marginBottom: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.file_path}
        </p>
      )}

      {item.notes && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-subtle)", marginTop: "var(--space-2)", marginBottom: 0, fontStyle: "italic" }}>
          {item.notes}
        </p>
      )}

      {item.created_at && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-ghost)", marginTop: "var(--space-2)", marginBottom: 0 }}>
          Added {formatDate(item.created_at)}
        </p>
      )}
    </div>
  );
}
