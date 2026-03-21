/**
 * ProgressBar — INT-001 NCC-004
 * Props: value (0–max), max (default 100), label, showPercent, size (sm|md)
 * Variants: default (accent) | green | amber | red | blue
 */
const TRACK_HEIGHT = { sm: "4px", md: "8px" };

const FILL_COLORS = {
  default: "var(--color-accent)",
  green:   "var(--color-badge-green-text)",
  amber:   "var(--color-badge-amber-text)",
  red:     "var(--color-badge-red-text)",
  blue:    "var(--color-badge-blue-text)",
};

export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  showPercent = false,
  size = "md",
  variant = "default",
  style: extraStyle,
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const wrapper = {
    display:   "flex",
    flexDirection: "column",
    gap:       "var(--space-1)",
    fontFamily: "var(--font-sans)",
    ...extraStyle,
  };

  const labelRow = {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    fontSize:       "var(--font-size-xs)",
    color:          "var(--color-text-muted)",
  };

  const track = {
    width:           "100%",
    height:          TRACK_HEIGHT[size],
    backgroundColor: "var(--color-bg-sunken)",
    borderRadius:    "var(--radius-full)",
    overflow:        "hidden",
  };

  const fill = {
    height:          "100%",
    width:           `${pct}%`,
    backgroundColor: FILL_COLORS[variant] || FILL_COLORS.default,
    borderRadius:    "var(--radius-full)",
    transition:      `width var(--duration-slow) var(--ease-default)`,
  };

  return (
    <div style={wrapper}>
      {(label || showPercent) && (
        <div style={labelRow}>
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={track} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div style={fill} />
      </div>
    </div>
  );
}
