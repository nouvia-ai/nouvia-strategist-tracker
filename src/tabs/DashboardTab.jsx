/**
 * DashboardTab — NIP Design Improvement
 * Two modes:
 *   mode="governance" — Governance Queue (Ben's Inbox, action-focused)
 *   mode="overview"   — Dashboard (read-only intelligence overview)
 *
 * Dashboard layout:
 *   Row 1: KPI metric tiles (compact horizontal)
 *   Row 2: Goals+Financials (60%) | NAS (40%)
 *   Row 3: Risk Intelligence (50%) | Channels (50%)
 *   Row 4: Build (OKR, Priorities, Todos)
 *   Row 5: Learn (Flywheel, Findings, Experiments)
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
import { NASSection }     from '../components/NAS/NASWidget';
import { RiskSignalsSection } from '../components/Risk/RiskWidget';
import { ChannelsSection } from '../components/Channels/ChannelsWidget';
import { GovernanceSection } from '../components/Governance/GovernanceWidget';

/* ── Design tokens ───────────────────────────── */
const S = {
  sectionGap: 'var(--space-8)',   /* 32px */
  cardGap:    'var(--space-4)',   /* 16px */
  cardPad:    'var(--space-6)',   /* 24px */
  innerGap:   'var(--space-2)',   /* 8px  */
};

const cardStyle = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-default)',
  backgroundColor: 'var(--color-bg-elevated)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

/* ── Section header — Headline role ──────────── */
function SectionHeader({ label, sub }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <h3 style={{
          margin: 0, fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans)', letterSpacing: 'var(--letter-spacing-tight)',
        }}>{label}</h3>
        {sub && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>{sub}</span>}
      </div>
      <div style={{ height: 1, backgroundColor: 'var(--color-border-default)', marginTop: 'var(--space-2)' }} />
    </div>
  );
}

/* ── KPI Tile — compact metric card ──────────── */
function KPITile({ value, label, sub, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...cardStyle,
      flex: 1, minWidth: 0, padding: S.cardPad,
      cursor: onClick ? 'pointer' : 'default',
      textAlign: 'left', fontFamily: 'var(--font-sans)',
      transition: 'box-shadow var(--duration-base) var(--ease-default)',
    }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{
        fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-normal)',
        color: color || 'var(--color-text-primary)', lineHeight: 'var(--line-height-tight)',
        marginBottom: 'var(--space-1)',
      }}>{value}</div>
      <div style={{
        fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-muted)', textTransform: 'uppercase',
        letterSpacing: 'var(--letter-spacing-wider)',
      }}>{label}</div>
      {sub && <div style={{
        fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)',
        marginTop: 2,
      }}>{sub}</div>}
    </button>
  );
}

/* ── Widget label ────────────────────────────── */
function WidgetLabel({ children }) {
  return (
    <div style={{
      fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-text-muted)', textTransform: 'uppercase',
      letterSpacing: 'var(--letter-spacing-wider)', marginBottom: 'var(--space-2)',
      fontFamily: 'var(--font-sans)',
    }}>{children}</div>
  );
}

/* ══════════════════════════════════════════════════
   GOVERNANCE MODE — Ben's Inbox
   ═══════════════════════════════════════════════ */
function GovernanceView({ governanceProps }) {
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <GovernanceSection {...governanceProps} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   DASHBOARD MODE — Read-only intelligence overview
   Layout: KPIs → Goals+NAS → Risks+Channels → Build → Learn
   ═══════════════════════════════════════════════ */
function DashboardView({ setTab, onNavigate, nasProps, riskProps, channelsProps, governancePendingCount }) {
  const handleGoToGoals       = () => setTab?.('goals');
  const handleGoToExperiments = () => setTab?.('experiments');

  // Extract summary data for KPI tiles
  const nasScore = nasProps?.aggregateNAS;
  const nasStatus = nasScore?.status || 'pending';
  const nasValue = nasScore?.nas_score != null ? nasScore.nas_score : '—';
  const nasStatusLabel = nasStatus === 'healthy' ? 'Healthy' : nasStatus === 'on_track' ? 'On Track' : nasStatus === 'at_risk' ? 'At Risk' : nasStatus === 'critical' ? 'Critical' : 'Pending';
  const nasColor = nasStatus === 'healthy' ? 'var(--color-success)' : nasStatus === 'on_track' ? 'var(--color-warning)' : nasStatus === 'at_risk' ? 'var(--color-warning)' : nasStatus === 'critical' ? 'var(--color-error)' : 'var(--color-text-muted)';

  const risks = riskProps?.risks || [];
  const activeRisks = risks.filter(r => r.status === 'active');
  const highRisks = activeRisks.filter(r => r.severity === 'high' || r.severity === 'critical');

  const govCount = governancePendingCount || 0;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 1440, margin: '0 auto' }}>

      {/* ══════════ ROW 1: KPI TILES ══════════ */}
      <div style={{ display: 'flex', gap: S.cardGap, marginBottom: S.sectionGap }}>
        <KPITile
          value={`${nasValue}/100`}
          label="NAS Score"
          sub={`\u{2022} ${nasStatusLabel}`}
          color={nasColor}
        />
        <KPITile
          value={`${activeRisks.length} active`}
          label="Risk Signals"
          sub={highRisks.length > 0 ? `${highRisks.length} high severity` : 'No high risks'}
          color={highRisks.length > 0 ? 'var(--color-error)' : 'var(--color-text-primary)'}
        />
        <KPITile
          value={govCount > 0 ? `${govCount} pending` : '\u2705'}
          label="Governance"
          sub={govCount > 0 ? 'Decisions needed' : 'All clear'}
          color={govCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          onClick={govCount > 0 ? () => onNavigate?.('cockpit', 'governance') : undefined}
        />
      </div>

      {/* ══════════ ROW 2: GOALS+FINANCIALS (60%) | NAS (40%) ══════════ */}
      <div style={{ marginBottom: S.sectionGap }}>
        <SectionHeader label="Measure" sub="Are we on track?" />

        <div style={{ display: 'flex', gap: S.cardGap, alignItems: 'flex-start' }}>
          {/* Left column — 60% */}
          <div style={{ flex: '3 1 0', minWidth: 0 }}>
            <div style={{ marginBottom: S.cardGap }}>
              <NorthStarGoal onAddGoal={handleGoToGoals} />
            </div>
            <div style={{ marginBottom: S.cardGap }}>
              <FinancialMetrics />
            </div>
            <BacklogPipeline />
          </div>

          {/* Right column — 40% */}
          <div style={{ flex: '2 1 0', minWidth: 0 }}>
            {nasProps ? (
              <NASSection {...nasProps} />
            ) : (
              <div style={{ ...cardStyle, padding: S.cardPad, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
                Loading adoption data...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ ROW 3: RISK (50%) | CHANNELS (50%) ══════════ */}
      <div style={{ marginBottom: S.sectionGap }}>
        <SectionHeader label="Intelligence" sub="Signals & reach" />

        <div style={{ display: 'flex', gap: S.cardGap, alignItems: 'flex-start' }}>
          {/* Left — Risk Intelligence */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {riskProps ? (
              <RiskSignalsSection {...riskProps} />
            ) : (
              <div style={{ ...cardStyle, padding: S.cardPad, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
                Loading risk data...
              </div>
            )}
          </div>

          {/* Right — Channels */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {channelsProps ? (
              <ChannelsSection {...channelsProps} />
            ) : (
              <div style={{ ...cardStyle, padding: S.cardPad, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
                Loading channels...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ ROW 4: BUILD ══════════ */}
      <div style={{ marginBottom: S.sectionGap }}>
        <SectionHeader label="Build" sub="What do I do today?" />

        <div style={{ display: 'flex', gap: S.cardGap, alignItems: 'flex-start' }}>
          <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
            <WidgetLabel>OKR Progress</WidgetLabel>
            <OKRProgress />
          </div>
          <div style={{ flex: '1.5 1 0', minWidth: 0 }}>
            <WidgetLabel>Top Priorities</WidgetLabel>
            <PrioritySequence onNavigate={() => setTab?.('coworkers')} />
          </div>
          <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
            <WidgetLabel>This Week</WidgetLabel>
            <WeeklyTodos />
          </div>
        </div>
      </div>

      {/* ══════════ ROW 5: LEARN ══════════ */}
      <div style={{ marginBottom: S.sectionGap }}>
        <SectionHeader label="Learn" sub="What did we just learn?" />

        <div style={{ marginBottom: S.cardGap }}>
          <FlywheelConnection />
        </div>

        <div style={{ display: 'flex', gap: S.cardGap, alignItems: 'flex-start' }}>
          <div style={{ flex: '1.2 1 0', minWidth: 0 }}>
            <WidgetLabel>Key Findings</WidgetLabel>
            <KeyFindings />
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <WidgetLabel>Experiments</WidgetLabel>
            <ExperimentSummary onNavigate={handleGoToExperiments} />
          </div>
        </div>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN EXPORT — routes to correct view by mode
   ═══════════════════════════════════════════════ */
export default function DashboardTab({ mode = "overview", setTab, onNavigate, nasProps, riskProps, channelsProps, governanceProps, governancePendingCount }) {
  if (mode === "governance") {
    return <GovernanceView governanceProps={governanceProps} />;
  }

  return (
    <DashboardView
      setTab={setTab}
      onNavigate={onNavigate}
      nasProps={nasProps}
      riskProps={riskProps}
      channelsProps={channelsProps}
      governancePendingCount={governancePendingCount}
    />
  );
}
