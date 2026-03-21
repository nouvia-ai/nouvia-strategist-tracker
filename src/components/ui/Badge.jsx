/**
 * Badge — INT-001 NCC-004
 * Variants: gray | green | amber | red | blue | purple | cyan
 * Size: sm (default) | md
 */
const VARIANT_STYLES = {
  gray:   { bg: "var(--color-badge-gray-bg)",   text: "var(--color-badge-gray-text)"   },
  green:  { bg: "var(--color-badge-green-bg)",  text: "var(--color-badge-green-text)"  },
  amber:  { bg: "var(--color-badge-amber-bg)",  text: "var(--color-badge-amber-text)"  },
  red:    { bg: "var(--color-badge-red-bg)",    text: "var(--color-badge-red-text)"    },
  blue:   { bg: "var(--color-badge-blue-bg)",   text: "var(--color-badge-blue-text)"   },
  purple: { bg: "var(--color-badge-purple-bg)", text: "var(--color-badge-purple-text)" },
  cyan:   { bg: "var(--color-badge-cyan-bg)",   text: "var(--color-badge-cyan-text)"   },
};

export default function Badge({ children, variant = "gray", size = "sm", style: extraStyle }) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.gray;

  const base = {
    display:        "inline-flex",
    alignItems:     "center",
    backgroundColor: v.bg,
    color:          v.text,
    fontFamily:     "var(--font-sans)",
    fontWeight:     "var(--font-weight-medium)",
    borderRadius:   "var(--radius-full)",
    whiteSpace:     "nowrap",
    ...(size === "md"
      ? { fontSize: "var(--font-size-sm)", padding: "var(--space-1) var(--space-3)" }
      : { fontSize: "var(--font-size-xs)", padding: "2px var(--space-2)" }
    ),
    ...extraStyle,
  };

  return <span style={base}>{children}</span>;
}
