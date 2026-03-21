/**
 * StatusDot — INT-001 NCC-004
 * Small colored dot indicator for status.
 * Variants: active | inactive | warning | error | pending
 * Size: sm (6px) | md (8px, default) | lg (10px)
 */
const VARIANT_COLORS = {
  active:   "var(--color-badge-green-text)",
  inactive: "var(--color-text-disabled)",
  warning:  "var(--color-badge-amber-text)",
  error:    "var(--color-badge-red-text)",
  pending:  "var(--color-badge-blue-text)",
};

const SIZES = { sm: "6px", md: "8px", lg: "10px" };

export default function StatusDot({ variant = "inactive", size = "md", label, style: extraStyle }) {
  const color = VARIANT_COLORS[variant] || VARIANT_COLORS.inactive;
  const dim   = SIZES[size] || SIZES.md;

  const dot = {
    display:         "inline-block",
    width:           dim,
    height:          dim,
    borderRadius:    "var(--radius-full)",
    backgroundColor: color,
    flexShrink:      0,
    ...extraStyle,
  };

  if (!label) return <span style={dot} aria-label={variant} />;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontFamily: "var(--font-sans)" }}>
      <span style={dot} />
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>{label}</span>
    </span>
  );
}
