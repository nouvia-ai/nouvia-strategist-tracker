/**
 * FinancialMetrics — INT-002 TASK-12
 * 4-card horizontal row: MRR, Project Revenue YTD, Total Revenue YTD, Forecast Range
 */
import { useMRR }            from '../../../hooks/useMRR';
import { useClientBacklog }  from '../../../hooks/useClientBacklog';
import { useForecastCache }  from '../../../hooks/useForecastCache';

const fmt = (n) => {
  if (n == null) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n)}`;
};

function CardSkeleton() {
  return (
    <div style={{ flex: 1, padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ height: 11, width: '60%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 3, marginBottom: 10 }} />
      <div style={{ height: 34, width: '70%', backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4 }} />
    </div>
  );
}

function MetricCard({ label, value, sub, trend }) {
  const trendColor = trend === 'up' ? '#27AE60' : trend === 'down' ? '#E74C3C' : 'var(--color-text-ghost)';
  const trendIcon  = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  return (
    <div style={{ flex: 1, padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.1 }}>{value}</div>
      {(sub || trend) && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 4, fontFamily: 'var(--font-sans)' }}>
          {trend && <span style={{ marginRight: 4 }}>{trendIcon}</span>}{sub}
        </div>
      )}
    </div>
  );
}

function ForecastCard({ forecast, loading }) {
  if (loading) return <CardSkeleton />;
  if (!forecast) return (
    <div style={{ flex: 1, padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Annual Forecast</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>Add backlog data to<br/>enable forecast</div>
    </div>
  );

  const low  = forecast.conservative_usd || 0;
  const mid  = forecast.expected_usd     || 0;
  const high = forecast.optimistic_usd   || 0;
  const range = high - low || 1;

  return (
    <div style={{ flex: 1, padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-ghost)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Annual Forecast</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>{fmt(mid)}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-ghost)', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>{fmt(low)} – {fmt(high)}</div>
      {/* Range bar */}
      <div style={{ position: 'relative', height: 8, backgroundColor: 'var(--color-bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', height: '100%', borderRadius: 4,
          left: '0%', width: '100%',
          background: `linear-gradient(to right, #27AE60, #F5A623, #E74C3C)`,
          opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', height: '100%', width: 3, borderRadius: 2, backgroundColor: 'var(--color-text-primary)',
          left: `${Math.max(0, Math.min(96, Math.round(((mid - low) / range) * 100)))}%`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-ghost)', marginTop: 3, fontFamily: 'var(--font-sans)' }}>
        <span>Conservative</span><span>Expected</span><span>Optimistic</span>
      </div>
    </div>
  );
}

export default function FinancialMetrics() {
  const { entries: mrrEntries, loading: mrrLoading, currentMRR, momGrowth } = useMRR();
  const { items: backlog,   loading: backlogLoading } = useClientBacklog();
  const { forecast,         loading: forecastLoading } = useForecastCache();

  const sumField = (items, field, ...statuses) =>
    items.filter(i => statuses.includes(i.status)).reduce((s, i) => s + (i[field] || 0), 0);

  const revenueYTD = sumField(backlog, 'actual_value_usd',  'Invoiced', 'Paid');
  const now        = new Date();
  const mrrCumYTD  = currentMRR * (now.getMonth() + 1);
  const totalYTD   = revenueYTD + mrrCumYTD;

  const mrrTrend = momGrowth == null ? 'flat' : momGrowth > 0 ? 'up' : momGrowth < 0 ? 'down' : 'flat';
  const mrrSub   = momGrowth != null ? `${momGrowth > 0 ? '+' : ''}${Math.round(momGrowth)}% MoM` : 'no prior month';

  if (mrrLoading || backlogLoading) {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <MetricCard label="MRR"                  value={fmt(currentMRR)}  sub={mrrSub}  trend={mrrTrend} />
      <MetricCard label="Project Revenue YTD"  value={fmt(revenueYTD)}  sub={`${backlog.filter(i => ['Invoiced','Paid'].includes(i.status)).length} projects`} />
      <MetricCard label="Total Revenue YTD"    value={fmt(totalYTD)}    sub={`MRR×${now.getMonth()+1}mo + projects`} />
      <ForecastCard forecast={forecast} loading={forecastLoading} />
    </div>
  );
}
