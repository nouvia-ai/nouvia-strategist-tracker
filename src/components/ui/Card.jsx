/**
 * Card — INT-001 NCC-004
 * Base surface container. All INT-001 cards wrap this.
 * Variants: default | elevated | inset | ghost
 */
export default function Card({
  children,
  variant = "default",
  padding = "md",
  onClick,
  style: extraStyle,
  className,
}) {
  const [hovered, setHovered] = React.useState(false);
  const clickable = Boolean(onClick);

  const paddings = {
    none: "0",
    sm:   "var(--space-3)",
    md:   "var(--space-4)",
    lg:   "var(--space-6)",
  };

  const base = {
    backgroundColor: "var(--color-bg-elevated)",
    border:          "1px solid var(--color-border-default)",
    borderRadius:    "var(--radius-lg)",
    padding:         paddings[padding],
    transition:      `border-color var(--duration-base) var(--ease-default),
                      background-color var(--duration-base) var(--ease-default)`,
    ...(clickable ? { cursor: "pointer" } : {}),
  };

  const variantStyles = {
    default:  {},
    elevated: { boxShadow: "var(--shadow-md)" },
    inset:    { backgroundColor: "var(--color-bg-sunken)", border: "none" },
    ghost:    { backgroundColor: "transparent", border: "none" },
  }[variant];

  const hoverStyles = clickable && hovered
    ? { borderColor: "var(--color-border-muted)", backgroundColor: "var(--color-bg-overlay)" }
    : {};

  return (
    <div
      className={className}
      style={{ ...base, ...variantStyles, ...hoverStyles, ...extraStyle }}
      onClick={onClick}
      onMouseEnter={clickable ? () => setHovered(true) : undefined}
      onMouseLeave={clickable ? () => setHovered(false) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && onClick(e) : undefined}
    >
      {children}
    </div>
  );
}

import React from "react";
