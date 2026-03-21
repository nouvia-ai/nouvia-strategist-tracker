/**
 * Button — INT-001 NCC-004
 * Variants: primary | secondary | ghost
 * Sizes:    sm | md (default) | lg
 * All variants enforce min-height 44px (UX-06).
 */

const styles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    minHeight: "var(--layout-tap-min)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-sans)",
    fontWeight: "var(--font-weight-medium)",
    cursor: "pointer",
    border: "none",
    outline: "none",
    transition: `background-color var(--duration-base) var(--ease-default),
                 color var(--duration-base) var(--ease-default),
                 opacity var(--duration-base) var(--ease-default)`,
    whiteSpace: "nowrap",
    textDecoration: "none",
  },
  sizes: {
    sm: { fontSize: "var(--font-size-xs)", padding: "var(--space-1) var(--space-3)", minHeight: "var(--layout-tap-min)" },
    md: { fontSize: "var(--font-size-sm)", padding: "var(--space-2) var(--space-4)" },
    lg: { fontSize: "var(--font-size-md)", padding: "var(--space-3) var(--space-6)" },
  },
  variants: {
    primary: {
      backgroundColor: "var(--color-btn-primary-bg)",
      color: "var(--color-btn-primary-text)",
    },
    secondary: {
      backgroundColor: "var(--color-bg-overlay)",
      color: "var(--color-text-secondary)",
      border: "1px solid var(--color-border-default)",
    },
    ghost: {
      backgroundColor: "var(--color-btn-ghost-bg)",
      color: "var(--color-btn-ghost-text)",
    },
  },
};

export default function Button({
  children,
  variant = "secondary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  className,
  style: extraStyle,
  fullWidth = false,
}) {
  const [hovered, setHovered] = React.useState(false);

  const hoverBg = {
    primary:   "var(--color-btn-primary-hover)",
    secondary: "var(--color-bg-sunken)",
    ghost:     "var(--color-btn-ghost-hover)",
  }[variant];

  const computed = {
    ...styles.base,
    ...styles.sizes[size],
    ...styles.variants[variant],
    ...(hovered && !disabled ? { backgroundColor: hoverBg } : {}),
    ...(disabled ? { opacity: 0.45, cursor: "not-allowed" } : {}),
    ...(fullWidth ? { width: "100%" } : {}),
    ...extraStyle,
  };

  return (
    <button
      type={type}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={className}
      style={computed}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

import React from "react";
