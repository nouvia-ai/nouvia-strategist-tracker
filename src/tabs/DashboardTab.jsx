/**
 * DashboardTab — NIP Phase 1
 * Landing page: Goals, Financial Summary, Governance Queue, Risk Signals, Adoption Score
 * Plus existing BUILD and LEARN sections from the cockpit.
 */
import NorthStarGoal      from '../components/Cockpit/MeasureSection/NorthStarGoal';
import FinancialMetrics   from '../components/Cockpit/MeasureSection/FinancialMetrics';
import BacklogPipeline    from '../components/Cockpit/MeasureSection/BacklogPipeline';
import OKRProgress        from '../components/Cockpit/BuildSection/OKRProgress';
import PrioritySequence   from '../components/Cockpit/BuildSection/PrioritySequence';
import WeeklyTodos        from '../components/Cockpit/BuildSection/WeeklyTodos';
import KeyFindings        from '../components/Cockpit/LearnSection/KeyFindings';
import ExperimentSummary  from '../components/Cockpit/LearnSection/ExperimentSummary';
import FlywheelConnection from '../components/Cockpit/LearnSection/FlywheelConnection';

/* ── Layout tokens ──────────────────────────────── */
const SECTION_GAP  = 'var(--space-6)';
const WIDGET_GAP   = 'var(--space-4)';
const COL_GAP      = 'var(--space-3)';

/* ── Section header ────────────────────────────── */
function SectionHeader({ label, sub }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>
          {label}
        </h3>
        <span style={{ fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
          {sub}
        </span>
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--color-border-default)', marginTop: 8 }} />
    </div>
  );
}

/* ── Widget card wrapper ───────────────────────── */
function WidgetCard({ children, flex }) {
  return (
    <div style={{ flex: flex || 1, minWidth: 0 }}>
      {children}
    </div>
  );
}

/* ── Placeholder card ──────────────────────────── */
function PlaceholderCard({ icon, title, subtitle }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6) var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--color-border-muted)',
      backgroundColor: 'var(--color-bg-overlay)',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 28, marginBottom: 'var(--space-2)', opacity: 0.4 }}>{icon}</div>
      <p style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-muted)',
        margin: 0,
        marginBottom: 4,
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-subtle)',
        margin: 0,
      }}>
        {subtitle}
      </p>
    </div>
  );
}

export default function DashboardTab({ setTab }) {
  const handleGoToGoals      = () => setTab?.('goals');
  const handleGoToExperiments = () => setTab?.('experiments');

  return (
    <div style={{ fontFamily: 'var(--font-sans)', minWidth: 1280 }}>

      {/* ══════════ MEASURE ══════════ */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader label="MEASURE" sub="Are we on track?" />

        {/* North Star Goal — full width */}
        <div style={{ marginBottom: WIDGET_GAP }}>
          <NorthStarGoal onAddGoal={handleGoToGoals} />
        </div>

        {/* Financial Metrics — 4-card row */}
        <div style={{ marginBottom: WIDGET_GAP }}>
          <FinancialMetrics />
        </div>
      </div>

      {/* ══════════ CLIENT BACKLOG PIPELINE ══════════ */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <BacklogPipeline />
      </div>

      {/* ══════════ INTELLIGENCE ══════════ */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader label="INTELLIGENCE" sub="Signals & scoring" />

        <div style={{ display: 'flex', gap: COL_GAP, alignItems: 'stretch' }}>
          <PlaceholderCard
            icon="🛡"
            title="Governance Queue"
            subtitle="No items pending governance"
          />
          <PlaceholderCard
            icon="⚡"
            title="Risk Signals"
            subtitle="Risk Intelligence coming in Phase 4"
          />
          <PlaceholderCard
            icon="📈"
            title="Nouvia Adoption Score"
            subtitle="Adoption scoring coming in Phase 3"
          />
        </div>
      </div>

      {/* ══════════ BUILD ══════════ */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader label="BUILD" sub="What do I do today?" />

        {/* OKR + Priority + Todos: 3-col layout */}
        <div style={{ display: 'flex', gap: COL_GAP, alignItems: 'flex-start' }}>
          <WidgetCard flex="1.2">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>OKR Progress</div>
            <OKRProgress />
          </WidgetCard>

          <WidgetCard flex="1.5">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Top Priorities</div>
            <PrioritySequence onNavigate={() => setTab?.('coworkers')} />
          </WidgetCard>

          <WidgetCard flex="1.2">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>This Week</div>
            <WeeklyTodos />
          </WidgetCard>
        </div>
      </div>

      {/* ══════════ LEARN ══════════ */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader label="LEARN" sub="What did we just learn?" />

        {/* Flywheel (full-width, only when present) */}
        <div style={{ marginBottom: WIDGET_GAP }}>
          <FlywheelConnection />
        </div>

        {/* Key Findings + Experiment Summary: 2-col layout */}
        <div style={{ display: 'flex', gap: COL_GAP, alignItems: 'flex-start' }}>
          <WidgetCard flex="1.2">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Key Findings</div>
            <KeyFindings />
          </WidgetCard>

          <WidgetCard flex="1">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>Experiments</div>
            <ExperimentSummary onNavigate={handleGoToExperiments} />
          </WidgetCard>
        </div>
      </div>

    </div>
  );
}
