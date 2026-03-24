/**
 * PipelineTab — NIP Phase 1 placeholder
 * Will contain deal pipeline visualization in a future phase.
 */
export default function PipelineTab() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <h2 style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-4)',
      }}>
        Pipeline
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border-muted)',
        backgroundColor: 'var(--color-bg-overlay)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 'var(--space-3)', opacity: 0.4 }}>📊</div>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-1)',
        }}>
          Pipeline coming soon
        </p>
        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-subtle)',
        }}>
          Deal pipeline visualization and tracking will be available in a future release.
        </p>
      </div>
    </div>
  );
}
