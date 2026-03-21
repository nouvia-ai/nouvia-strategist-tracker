/**
 * Modal — INT-001 NCC-004
 * Accessible overlay modal. Used by NCCModal, OKRModal, etc.
 * Props: open, onClose, title, children, size (sm|md|lg)
 */
import { useEffect } from "react";

const SIZES = {
  sm: "380px",
  md: "520px",
  lg: "680px",
};

export default function Modal({ open, onClose, title, children, size = "md" }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const overlay = {
    position:       "fixed",
    inset:          0,
    backgroundColor:"rgba(0,0,0,0.60)",
    backdropFilter: "blur(4px)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    zIndex:         50,
    padding:        "var(--space-4)",
  };

  const panel = {
    backgroundColor: "var(--color-bg-elevated)",
    border:          "1px solid var(--color-border-default)",
    borderRadius:    "var(--radius-xl)",
    boxShadow:       "var(--shadow-modal)",
    width:           "100%",
    maxWidth:        SIZES[size],
    maxHeight:       "90vh",
    display:         "flex",
    flexDirection:   "column",
    fontFamily:      "var(--font-sans)",
  };

  const header = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "var(--space-4) var(--space-6)",
    borderBottom:   "1px solid var(--color-border-default)",
    flexShrink:     0,
  };

  const titleStyle = {
    fontSize:   "var(--font-size-md)",
    fontWeight: "var(--font-weight-semibold)",
    color:      "var(--color-text-primary)",
    margin:     0,
  };

  const closeBtn = {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    width:           "var(--layout-tap-min)",
    height:          "var(--layout-tap-min)",
    borderRadius:    "var(--radius-md)",
    border:          "none",
    background:      "transparent",
    color:           "var(--color-text-muted)",
    cursor:          "pointer",
    fontSize:        "var(--font-size-lg)",
    transition:      `color var(--duration-base) var(--ease-default)`,
  };

  const body = {
    padding:    "var(--space-6)",
    overflowY:  "auto",
    flex:       1,
    color:      "var(--color-text-secondary)",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div style={header}>
          <h2 id="modal-title" style={titleStyle}>{title}</h2>
          <button
            style={closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            ×
          </button>
        </div>
        <div style={body}>{children}</div>
      </div>
    </div>
  );
}
