/**
 * Portal.jsx — Client-facing portal for Nouvia managed clients
 * 5 sections: Dashboard, Projects, Roadmap, Platform Health, Documents
 * Designed per Nouvia Design Standard — clean, professional, System 1 design
 */
import { useState, useCallback } from 'react';
import { auth } from './firebase';
import { useUser } from './AuthGate';
import { usePortalProjects, usePortalActivity, usePortalDocuments, usePortalRequests } from './hooks/usePortalData';

/* ═══════════ DESIGN TOKENS ═══════════ */
const C = {
  primary: '#0A84FF',
  primaryHover: '#0070E0',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  bg: '#F8F9FA',
  cardBg: '#FFFFFF',
  text: '#1C1C1E',
  textSec: '#636366',
  textMuted: '#8E8E93',
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
};

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const cardBase = {
  backgroundColor: C.cardBg,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: 24,
  fontFamily: font,
};

/* ═══════════ SHARED UI ═══════════ */
function Badge({ children, color = C.textSec, bg = C.borderLight }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600,
      padding: '2px 10px', borderRadius: 4, backgroundColor: bg, color,
      lineHeight: '1.5', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function StatusBadge({ badge }) {
  const map = {
    'Delivered': { bg: '#d1fae5', color: '#047857' },
    'In Progress': { bg: '#dbeafe', color: '#1d4ed8' },
    'Scoping': { bg: '#e0e7ff', color: '#4338ca' },
    'Waiting on IVC': { bg: '#fef3c7', color: '#b45309' },
    'Document': { bg: '#f3e8ff', color: '#7c3aed' },
    'Milestone': { bg: '#cffafe', color: '#0e7490' },
  };
  const s = map[badge] || { bg: C.borderLight, color: C.textSec };
  return <Badge color={s.color} bg={s.bg}>{badge}</Badge>;
}

function StageBadge({ stage }) {
  const map = {
    requested: { label: 'Requested', bg: '#f3f4f6', color: '#6b7280' },
    scoping: { label: 'Scoping', bg: '#dbeafe', color: '#1d4ed8' },
    estimated: { label: 'Ready for Review', bg: '#fef3c7', color: '#b45309' },
    approved: { label: 'Approved', bg: '#dbeafe', color: '#1d4ed8' },
    in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
    delivered: { label: 'Delivered', bg: '#d1fae5', color: '#047857' },
    accepted: { label: 'Accepted', bg: '#d1fae5', color: '#047857' },
  };
  const s = map[stage] || { label: stage, bg: C.borderLight, color: C.textSec };
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

function Btn({ children, variant = 'primary', onClick, style: sx }) {
  const styles = {
    primary: { backgroundColor: C.primary, color: '#fff', border: 'none' },
    outline: { backgroundColor: 'transparent', color: C.primary, border: `1px solid ${C.primary}` },
    ghost: { backgroundColor: 'transparent', color: C.textSec, border: `1px solid ${C.border}` },
    success: { backgroundColor: C.success, color: '#fff', border: 'none' },
    warning: { backgroundColor: C.warning, color: '#fff', border: 'none' },
  };
  return (
    <button onClick={onClick} style={{
      fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8,
      cursor: 'pointer', fontFamily: font, transition: 'all 0.2s',
      ...styles[variant], ...sx,
    }}>
      {children}
    </button>
  );
}

function PageTitle({ children }) {
  return <h2 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0, marginBottom: 24, fontFamily: font }}>{children}</h2>;
}

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, marginBottom: 16, fontFamily: font }}>{children}</h3>;
}

/* ═══════════ SECTION 1: DASHBOARD ═══════════ */
function PortalDashboard({ projects, activity, onNavigate }) {
  const user = useUser();
  const activeProjects = projects.filter(p => !['delivered', 'accepted'].includes(p.stage));
  const actionItems = [
    ...projects.filter(p => p.stage === 'estimated').map(p => ({ text: `Review & approve: ${p.title}`, project: p, action: 'View Details' })),
    ...projects.filter(p => p.waiting_on_client).map(p => ({ text: p.waiting_reason || `Action needed on ${p.title}`, project: p, action: 'View Details' })),
  ];

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>
          Welcome, {user?.display_name?.split(' ')[0] || 'Nick'}
        </h1>
        <p style={{ fontSize: 14, color: C.textSec, margin: '4px 0 0', fontFamily: font }}>
          {user?.company_name || 'IVC'} AI Platform · Last updated: March 24, 2026
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.success, marginBottom: 4 }}>{"\u2713"}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Platform Delivered</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Phase 1 Complete</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.primary, marginBottom: 4 }}>{activeProjects.length}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Active Projects</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{activeProjects.length} in progress</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.success, marginBottom: 4 }}>84%+</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Platform Accuracy</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{"\u2197"} Improving</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.primary, marginBottom: 4 }}>{"\u25b6"}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Next Milestone</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>ERP Integration</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>Est. March 31</div>
        </div>
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div style={{ ...cardBase, marginBottom: 24, borderLeft: `4px solid ${C.warning}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>{"\u26a1"}</span>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>Actions Needed</h3>
            <Badge color="#fff" bg={C.warning}>{actionItems.length}</Badge>
          </div>
          {actionItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none',
            }}>
              <span style={{ fontSize: 14, color: C.text, fontFamily: font }}>{item.text}</span>
              <Btn variant="outline" onClick={() => onNavigate('projects')} style={{ fontSize: 12, padding: '6px 16px' }}>
                {item.action}
              </Btn>
            </div>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      <div style={cardBase}>
        <SectionTitle>Recent Activity</SectionTitle>
        {activity.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
            borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, minWidth: 70, fontFamily: font }}>{a.date?.replace('2026-', '')}</span>
            <span style={{ fontSize: 14, color: C.text, flex: 1, fontFamily: font }}>{a.description}</span>
            <StatusBadge badge={a.badge} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ SECTION 2: PROJECTS ═══════════ */
function PortalProjects({ projects, updateProject, onSubmitRequest }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqUrgency, setReqUrgency] = useState('medium');
  const [expandedProject, setExpandedProject] = useState(null);

  const stages = [
    { key: 'requested', label: 'Requested' },
    { key: 'scoping', label: 'Scoping' },
    { key: 'estimated', label: 'Ready for Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'accepted', label: 'Accepted' },
  ];

  const handleSubmitRequest = () => {
    if (!reqTitle.trim()) return;
    onSubmitRequest({ title: reqTitle, description: reqDesc, urgency: reqUrgency });
    setReqTitle(''); setReqDesc(''); setReqUrgency('medium'); setShowRequestForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <PageTitle>Projects</PageTitle>
        <Btn onClick={() => setShowRequestForm(true)}>+ Request a Capability</Btn>
      </div>

      {/* Request form modal */}
      {showRequestForm && (
        <div style={{ ...cardBase, marginBottom: 24, borderLeft: `4px solid ${C.primary}` }}>
          <SectionTitle>Request a New Capability</SectionTitle>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 4, fontFamily: font }}>
              What would you like AI to help with?
            </label>
            <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} placeholder="e.g., Automate invoice generation..."
              style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: font, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 4, fontFamily: font }}>How urgent is this?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['low', 'medium', 'high'].map(u => (
                <button key={u} onClick={() => setReqUrgency(u)} style={{
                  fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: font,
                  border: `1px solid ${reqUrgency === u ? C.primary : C.border}`,
                  backgroundColor: reqUrgency === u ? '#EBF5FF' : 'transparent',
                  color: reqUrgency === u ? C.primary : C.textSec,
                }}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 4, fontFamily: font }}>Additional context (optional)</label>
            <textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} rows={3} placeholder="Any details that would help us scope this..."
              style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: font, resize: 'vertical', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleSubmitRequest}>Submit Request</Btn>
            <Btn variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Project cards by stage */}
      {stages.map(stage => {
        const stageProjects = projects.filter(p => p.stage === stage.key);
        if (stageProjects.length === 0) return null;
        return (
          <div key={stage.key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font }}>
                {stage.label}
              </h4>
              <Badge>{stageProjects.length}</Badge>
            </div>
            {stageProjects.map((p, i) => (
              <div key={i} style={{
                ...cardBase, marginBottom: 12, cursor: 'pointer',
                borderLeft: p.waiting_on_client ? `4px solid ${C.warning}` : `4px solid transparent`,
                transition: 'box-shadow 0.2s',
              }}
                onClick={() => setExpandedProject(expandedProject === p.title ? null : p.title)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>{p.title}</h4>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <StageBadge stage={p.stage} />
                    {p.waiting_on_client && <Badge color="#b45309" bg="#fef3c7">{"\u26a0\ufe0f"} Waiting on IVC</Badge>}
                  </div>
                </div>
                <p style={{ fontSize: 14, color: C.textSec, margin: 0, lineHeight: '1.5', fontFamily: font }}>{p.description}</p>

                {/* Expanded view */}
                {expandedProject === p.title && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderLight}` }}>
                    {p.estimated_value_usd && (
                      <div style={{ fontSize: 14, color: C.text, marginBottom: 8, fontFamily: font }}>
                        <strong>Investment:</strong> ${p.estimated_value_usd.toLocaleString()}
                        {p.notes?.includes('/month') ? '/year' : ''}
                      </div>
                    )}
                    {p.estimated_delivery && (
                      <div style={{ fontSize: 14, color: C.text, marginBottom: 8, fontFamily: font }}>
                        <strong>Estimated delivery:</strong> {p.estimated_delivery}
                      </div>
                    )}
                    {p.delivered_date && (
                      <div style={{ fontSize: 14, color: C.success, marginBottom: 8, fontFamily: font }}>
                        <strong>Delivered:</strong> {p.delivered_date}
                      </div>
                    )}
                    {p.components?.length > 0 && (
                      <div style={{ fontSize: 14, color: C.text, marginBottom: 8, fontFamily: font }}>
                        <strong>Components:</strong> {p.components.join(', ')}
                      </div>
                    )}
                    {p.waiting_reason && (
                      <div style={{ fontSize: 14, color: C.warning, marginBottom: 8, fontFamily: font }}>
                        <strong>{"\u26a0\ufe0f"} Waiting on IVC:</strong> {p.waiting_reason}
                      </div>
                    )}
                    {p.notes && (
                      <div style={{ fontSize: 14, color: C.textSec, marginBottom: 12, fontFamily: font }}>{p.notes}</div>
                    )}
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {p.stage === 'estimated' && (
                        <>
                          <Btn variant="success" onClick={e => { e.stopPropagation(); updateProject(p.title, { stage: 'approved' }); }}>Approve</Btn>
                          <Btn variant="outline" onClick={e => e.stopPropagation()}>Questions?</Btn>
                        </>
                      )}
                      {p.stage === 'delivered' && (
                        <>
                          <Btn variant="success" onClick={e => { e.stopPropagation(); updateProject(p.title, { stage: 'accepted' }); }}>Accept Delivery</Btn>
                          <Btn variant="outline" onClick={e => e.stopPropagation()}>Request Changes</Btn>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ SECTION 3: ROADMAP ═══════════ */
function PortalRoadmap({ projects }) {
  const phases = [
    {
      name: 'Phase 1', status: 'delivered', color: C.success,
      items: projects.filter(p => p.phase === 'Phase 1'),
    },
    {
      name: 'Phase 2', status: 'in_progress', color: C.primary,
      items: projects.filter(p => p.phase === 'Phase 2'),
    },
    {
      name: 'Phase 3', status: 'planned', color: C.textMuted,
      items: projects.filter(p => p.phase === 'Phase 3'),
    },
  ];

  const statusLabels = { delivered: 'Delivered \u2713', in_progress: 'In Progress', planned: 'Planned' };

  return (
    <div>
      <PageTitle>Roadmap</PageTitle>

      {/* Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${phases.length}, 1fr)`, gap: 16, marginBottom: 32 }}>
        {phases.map((phase, i) => (
          <div key={i} style={{
            ...cardBase,
            borderTop: `4px solid ${phase.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>{phase.name}</h3>
              <Badge
                color={phase.status === 'delivered' ? '#047857' : phase.status === 'in_progress' ? '#1d4ed8' : '#6b7280'}
                bg={phase.status === 'delivered' ? '#d1fae5' : phase.status === 'in_progress' ? '#dbeafe' : '#f3f4f6'}
              >
                {statusLabels[phase.status]}
              </Badge>
            </div>
            {phase.items.length === 0 ? (
              <p style={{ fontSize: 14, color: C.textMuted, fontStyle: 'italic', fontFamily: font }}>Starting soon</p>
            ) : (
              phase.items.map((item, j) => (
                <div key={j} style={{ padding: '8px 0', borderTop: j > 0 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, fontFamily: font }}>{item.title}</div>
                  {item.estimated_value_usd && (
                    <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, fontFamily: font }}>
                      ${item.estimated_value_usd.toLocaleString()}
                    </div>
                  )}
                  {item.estimated_delivery && (
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: font }}>
                      {item.delivered_date ? `Delivered ${item.delivered_date}` : `Est. ${item.estimated_delivery}`}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* ESSOR Grant overlay */}
      <div style={{ ...cardBase, borderLeft: `4px solid ${C.primary}`, background: 'linear-gradient(135deg, #EBF5FF 0%, #fff 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{"\ud83c\udfc6"}</span>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>
            ESSOR Grant (Revenue Québec)
          </h3>
          <Badge color="#047857" bg="#d1fae5">Approved</Badge>
        </div>
        <p style={{ fontSize: 14, color: C.textSec, margin: 0, fontFamily: font }}>
          Discovery: April 2026 · Build: May–August 2026 · Grant coverage: offsets eligible AI development costs
        </p>
      </div>
    </div>
  );
}

/* ═══════════ SECTION 4: PLATFORM HEALTH ═══════════ */
function PortalHealth() {
  return (
    <div>
      <PageTitle>Platform Health</PageTitle>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.success }}>84%+</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Annotation Accuracy</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{"\u2197"} Improving with each use</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.primary }}>&lt;20 min</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Time to First Result</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>Per floorplan scan</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.success }}>{"\u2713"} Online</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Platform Status</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>Operational</div>
        </div>
        <div style={cardBase}>
          <div style={{ fontSize: 28, fontWeight: 400, color: C.primary }}>{"\u2197"}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Learning Library</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>Growing with every use</div>
        </div>
      </div>

      {/* Investment hook */}
      <div style={{ ...cardBase, marginBottom: 24, background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)', borderLeft: `4px solid ${C.success}` }}>
        <SectionTitle>{"\ud83e\udde0"} Your Platform Gets Smarter</SectionTitle>
        <p style={{ fontSize: 14, color: C.textSec, margin: '0 0 16px', lineHeight: '1.6', fontFamily: font }}>
          Every correction your team makes improves the AI for all future scans. Your Learning Library is unique to IVC — it captures your store layouts, your fixture preferences, and your annotation standards.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#f8fafc', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 400, color: C.text }}>Growing</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Corrections contributed</div>
          </div>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#f8fafc', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 400, color: C.text }}>Active</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Store-specific mappings</div>
          </div>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#f8fafc', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 400, color: C.success }}>{"\u2197"}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Getting better each week</div>
          </div>
        </div>
      </div>

      {/* Monthly report placeholder */}
      <div style={{ ...cardBase, textAlign: 'center', color: C.textMuted, border: `1px dashed ${C.border}` }}>
        <span style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.4 }}>{"\ud83d\udcca"}</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4, fontFamily: font }}>Monthly Platform Report</div>
        <div style={{ fontSize: 14, color: C.textSec, fontFamily: font }}>
          Your first monthly health report will be available April 1, 2026.<br />
          Reports include: usage trends, accuracy improvements, and recommendations.
        </div>
      </div>
    </div>
  );
}

/* ═══════════ SECTION 5: DOCUMENTS ═══════════ */
function PortalDocuments({ documents }) {
  const categories = [
    { key: 'estimate', label: 'Estimates & Proposals', icon: '\ud83d\udccb' },
    { key: 'contract', label: 'Contracts', icon: '\ud83d\udcdd' },
    { key: 'invoice', label: 'Invoices', icon: '\ud83d\udcb0' },
    { key: 'report', label: 'Reports', icon: '\ud83d\udcca' },
  ];

  const statusStyles = {
    draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
    sent: { label: 'Sent', bg: '#dbeafe', color: '#1d4ed8' },
    pending_signature: { label: 'Pending Signature', bg: '#fef3c7', color: '#b45309' },
    signed: { label: 'Signed', bg: '#d1fae5', color: '#047857' },
    paid: { label: 'Paid', bg: '#d1fae5', color: '#047857' },
    overdue: { label: 'Overdue', bg: '#fee2e2', color: '#b91c1c' },
  };

  return (
    <div>
      <PageTitle>Documents</PageTitle>

      {categories.map(cat => {
        const catDocs = documents.filter(d => d.category === cat.key);
        return (
          <div key={cat.key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{cat.icon}</span>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font }}>
                {cat.label}
              </h4>
            </div>
            {catDocs.length === 0 ? (
              <div style={{ ...cardBase, textAlign: 'center', color: C.textMuted, fontSize: 14, border: `1px dashed ${C.border}` }}>
                No documents yet
              </div>
            ) : (
              catDocs.map((d, i) => {
                const s = statusStyles[d.status] || statusStyles.draft;
                return (
                  <div key={i} style={{ ...cardBase, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text, fontFamily: font }}>{d.title}</div>
                      {d.notes && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, fontFamily: font }}>{d.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Badge color={s.color} bg={s.bg}>{s.label}</Badge>
                      {d.status === 'pending_signature' && (
                        <Btn variant="outline" style={{ fontSize: 12, padding: '4px 12px' }}>Accept & Sign</Btn>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ MAIN PORTAL APP ═══════════ */
export default function Portal() {
  const user = useUser();
  const clientId = user?.client_id || 'ivc';
  const [section, setSection] = useState('dashboard');

  const { projects, loading: projLoading, updateProject } = usePortalProjects(clientId);
  const { activity, loading: actLoading } = usePortalActivity(clientId);
  const { documents, loading: docLoading } = usePortalDocuments(clientId);
  const { submitRequest } = usePortalRequests(clientId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '\u25c8' },
    { id: 'projects', label: 'Projects', icon: '\u25a3' },
    { id: 'roadmap', label: 'Roadmap', icon: '\u25b7' },
    { id: 'health', label: 'Platform Health', icon: '\u2764' },
    { id: 'documents', label: 'Documents', icon: '\ud83d\udcc4' },
  ];

  const actionCount = projects.filter(p => p.stage === 'estimated' || p.waiting_on_client).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.bg, fontFamily: font }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, backgroundColor: C.cardBg, borderRight: `1px solid ${C.border}`,
        padding: '24px 0', display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, backgroundColor: C.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>N</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Nouvia</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{user?.company_name || 'IVC'} AI Platform</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 20px', fontSize: 14, fontWeight: section === item.id ? 600 : 400,
              color: section === item.id ? C.primary : C.textSec,
              backgroundColor: section === item.id ? '#EBF5FF' : 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: font, textAlign: 'left',
              borderLeft: section === item.id ? `3px solid ${C.primary}` : '3px solid transparent',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {item.id === 'dashboard' && actionCount > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff',
                  backgroundColor: C.warning, borderRadius: 10, padding: '1px 7px',
                }}>{actionCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User info + sign out */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>{user?.display_name}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{user?.email}</div>
          <button onClick={() => auth.signOut()} style={{
            fontSize: 12, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, padding: 0, textDecoration: 'underline',
          }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32, maxWidth: 1200 }}>
        {section === 'dashboard' && <PortalDashboard projects={projects} activity={activity} onNavigate={setSection} />}
        {section === 'projects' && <PortalProjects projects={projects} updateProject={updateProject} onSubmitRequest={submitRequest} />}
        {section === 'roadmap' && <PortalRoadmap projects={projects} />}
        {section === 'health' && <PortalHealth />}
        {section === 'documents' && <PortalDocuments documents={documents} />}
      </main>
    </div>
  );
}
