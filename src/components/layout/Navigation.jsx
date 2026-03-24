/**
 * Navigation — NIP Phase 1
 * Two-tier nav: top-level sections (Dashboard, BSP, Funnel, OS) + sub-tabs per section.
 * Props: sections, activeSection, activeSubTab, onNavigate, theme, onToggleTheme, onSignOut
 */
export default function Navigation({ sections, activeSection, activeSubTab, onNavigate, theme, onToggleTheme, onSignOut }) {
  const bar = {
    position:        "sticky",
    top:             0,
    zIndex:          40,
    borderBottom:    "1px solid var(--color-border-default)",
    backgroundColor: "var(--color-bg-base)",
    backdropFilter:  "blur(8px)",
    fontFamily:      "var(--font-sans)",
  };

  const inner = {
    maxWidth: "var(--layout-max-wide)",
    margin:   "0 auto",
    padding:  "0 var(--space-5)",
  };

  const topRow = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     "var(--space-3)",
    paddingBottom:  "var(--space-3)",
  };

  const logoArea = {
    display:    "flex",
    alignItems: "center",
    gap:        "var(--space-2)",
  };

  const logoMark = {
    width:           "28px",
    height:          "28px",
    backgroundColor: "var(--color-text-primary)",
    borderRadius:    "var(--radius-md)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  };

  const logoText = {
    fontSize:    "var(--font-size-sm)",
    fontWeight:  "var(--font-weight-semibold)",
    color:       "var(--color-text-primary)",
    letterSpacing: "var(--tracking-tight)",
  };

  const actions = {
    display:    "flex",
    alignItems: "center",
    gap:        "var(--space-2)",
  };

  const iconBtn = {
    width:           "var(--layout-tap-min)",
    height:          "var(--layout-tap-min)",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    "var(--radius-md)",
    border:          "none",
    backgroundColor: "var(--color-bg-overlay)",
    color:           "var(--color-text-secondary)",
    cursor:          "pointer",
    fontSize:        "var(--font-size-sm)",
    transition:      `background-color var(--duration-base) var(--ease-default)`,
  };

  const signOutBtn = {
    ...iconBtn,
    padding:  "0 var(--space-3)",
    width:    "auto",
    fontSize: "var(--font-size-xs)",
    fontWeight: "var(--font-weight-medium)",
  };

  const sectionRow = {
    display:    "flex",
    gap:        "var(--space-1)",
    marginBottom: "-1px",
  };

  const currentSection = sections.find(s => s.id === activeSection);
  const subTabs = currentSection?.subTabs || [];

  return (
    <nav style={bar}>
      <div style={inner}>
        {/* Top row: logo + actions */}
        <div style={topRow}>
          <div style={logoArea}>
            <div style={logoMark}>
              <span style={{ color: "var(--color-bg-base)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)" }}>N</span>
            </div>
            <span style={logoText}>Nouvia Intelligence Platform</span>
          </div>
          <div style={actions}>
            <button
              style={iconBtn}
              onClick={onToggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--color-bg-sunken)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)"; }}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              style={signOutBtn}
              onClick={onSignOut}
              title="Sign out"
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--color-bg-sunken)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--color-bg-overlay)"; }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div style={sectionRow}>
          {sections.map(s => {
            const active = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id, s.subTabs?.[0]?.id || null)}
                style={{
                  padding:         "var(--space-2) var(--space-4)",
                  fontSize:        "var(--font-size-xs)",
                  fontWeight:      active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  whiteSpace:      "nowrap",
                  border:          "none",
                  borderBottom:    active
                    ? "2px solid var(--color-accent)"
                    : "2px solid transparent",
                  backgroundColor: "transparent",
                  color:           active
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                  cursor:          "pointer",
                  fontFamily:      "var(--font-sans)",
                  textTransform:   "uppercase",
                  letterSpacing:   "0.05em",
                  transition:      `color var(--duration-base) var(--ease-default), border-color var(--duration-base) var(--ease-default)`,
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                <span style={{ marginRight: "var(--space-1)", opacity: 0.7 }}>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs (if any) */}
        {subTabs.length > 0 && (
          <div style={{
            display:        "flex",
            gap:            "var(--space-1)",
            paddingTop:     "var(--space-1)",
            borderTop:      "1px solid var(--color-border-muted)",
          }}>
            {subTabs.map(st => {
              const active = st.id === activeSubTab;
              return (
                <button
                  key={st.id}
                  onClick={() => onNavigate(activeSection, st.id)}
                  style={{
                    padding:         "var(--space-1) var(--space-3)",
                    fontSize:        "var(--font-size-xs)",
                    fontWeight:      "var(--font-weight-medium)",
                    whiteSpace:      "nowrap",
                    border:          "none",
                    borderBottom:    active
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                    backgroundColor: active
                      ? "var(--color-bg-overlay)"
                      : "transparent",
                    borderRadius:    active ? "var(--radius-sm) var(--radius-sm) 0 0" : "0",
                    color:           active
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                    cursor:          "pointer",
                    fontFamily:      "var(--font-sans)",
                    transition:      `color var(--duration-base) var(--ease-default), background-color var(--duration-base) var(--ease-default)`,
                  }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                >
                  <span style={{ marginRight: "var(--space-1)", opacity: 0.6 }}>{st.icon}</span>
                  {st.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
