/**
 * Portal V2 — Client-facing portal for Nouvia managed clients
 * Home = Attention Queue (max 3 action items) + Delta Feed + Investment Strip
 * 4 nav items: Home, Backlog, Investment, Platform
 * Design: Action-first, not information-first
 */
import { useState, useCallback } from 'react';
import { auth } from './firebase';
import { useUser } from './AuthGate';
import { usePortalProjects, usePortalActivity, usePortalDocuments, usePortalRequests } from './hooks/usePortalData';

/* ═══════════ DESIGN TOKENS (V2: premium, calm, trustworthy) ═══════════ */
const C = {
  primary: '#0A84FF',
  primaryHover: '#0070E0',
  decision: '#3B82F6',
  blocker: '#F59E0B',
  delivery: '#10B981',
  opportunity: '#8B5CF6',
  bg: '#FAFBFC',
  cardBg: '#FFFFFF',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const card = {
  backgroundColor: C.cardBg, borderRadius: 8,
  border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  padding: 24, fontFamily: font,
};

/* ═══════════ SHARED UI ═══════════ */
function Badge({ children, color = C.textSec, bg = C.borderLight }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600,
      padding: '2px 10px', borderRadius: 4, backgroundColor: bg, color,
      lineHeight: '1.5', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Btn({ children, variant = 'primary', onClick, style: sx }) {
  const styles = {
    primary: { backgroundColor: C.primary, color: '#fff', border: 'none' },
    outline: { backgroundColor: 'transparent', color: C.primary, border: `1px solid ${C.primary}` },
    ghost: { backgroundColor: 'transparent', color: C.textSec, border: `1px solid ${C.border}` },
    success: { backgroundColor: C.delivery, color: '#fff', border: 'none' },
    warning: { backgroundColor: C.blocker, color: '#fff', border: 'none' },
    decision: { backgroundColor: C.decision, color: '#fff', border: 'none' },
  };
  return (
    <button onClick={onClick} style={{
      fontSize: 13, fontWeight: 600, padding: '10px 24px', borderRadius: 8,
      cursor: 'pointer', fontFamily: font, transition: 'all 0.2s',
      ...styles[variant], ...sx,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >{children}</button>
  );
}

function StageBadge({ stage }) {
  const map = {
    scoping: { label: 'Scoping', bg: '#dbeafe', color: '#1d4ed8' },
    estimated: { label: 'Ready for You', bg: '#fef3c7', color: '#b45309' },
    approved: { label: 'Approved', bg: '#dbeafe', color: '#1d4ed8' },
    in_progress: { label: 'Building', bg: '#dbeafe', color: '#1d4ed8' },
    delivered: { label: 'Delivered', bg: '#d1fae5', color: '#047857' },
    accepted: { label: 'Managed Support', bg: '#d1fae5', color: '#047857' },
    requested: { label: 'Requested', bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = map[stage] || { label: stage, bg: C.borderLight, color: C.textSec };
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

/* ═══════════ HOME: ATTENTION QUEUE ═══════════ */
function PortalHome({ projects, activity, onNavigate, updateProject }) {
  const user = useUser();

  // Build attention queue (max 3, curated)
  const queueItems = [];
  // DECISION: estimated items
  projects.filter(p => p.stage === 'estimated').forEach(p => {
    queueItems.push({ type: 'decision', icon: '\ud83d\udccb', color: C.decision, title: p.title,
      detail: p.description, age: 'Submitted 5 days ago', consequence: 'Approving keeps April start on track',
      primary: { label: 'Approve', action: () => updateProject(p.title, { stage: 'approved' }) },
      secondary: { label: 'Ask a Question', action: () => {} }, project: p });
  });
  // BLOCKER: waiting on client
  projects.filter(p => p.waiting_on_client && p.stage !== 'estimated').forEach(p => {
    queueItems.push({ type: 'blocker', icon: '\u26a0\ufe0f', color: C.blocker, title: p.waiting_reason ? `${p.waiting_reason.split('.')[0]}` : `Action needed on ${p.title}`,
      detail: p.waiting_reason || '', age: 'Open 7 days', consequence: `Blocks ${p.title}`,
      primary: { label: 'Provide Answers', action: () => {} },
      secondary: { label: 'Schedule a Call', action: () => {} }, project: p });
  });
  // DELIVERY: delivered items
  projects.filter(p => p.stage === 'delivered').forEach(p => {
    queueItems.push({ type: 'delivery', icon: '\u2705', color: C.delivery, title: `${p.title} — Ready for acceptance`,
      detail: `${p.components?.length || 0} components \u00b7 84%+ accuracy \u00b7 Delivered ${p.delivered_date || 'recently'}`,
      age: '', consequence: 'Accepting moves it to Managed Support',
      primary: { label: 'Accept Delivery', action: () => updateProject(p.title, { stage: 'accepted' }) },
      secondary: { label: 'Review Details', action: () => onNavigate('backlog') }, project: p });
  });

  const queue = queueItems.slice(0, 3);
  const typeLabels = { decision: 'DECISION', blocker: 'BLOCKER', delivery: 'DELIVERY', opportunity: 'OPPORTUNITY' };

  // Investment summary
  const totalDelivered = projects.filter(p => p.stage === 'delivered' || p.stage === 'accepted').reduce((s, p) => s + (p.estimated_value_usd || 0), 0);
  const monthlyProposed = projects.filter(p => p.stage === 'estimated').reduce((s, p) => s + (p.estimated_value_usd || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>
          {user?.company_name || 'IVC'} AI Platform
        </h1>
      </div>

      {/* ── ATTENTION QUEUE ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font }}>
            Your Attention
          </h2>
          {queue.length > 0 && (
            <Badge color="#fff" bg={C.blocker}>{queue.length} item{queue.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {queue.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>{"\u2705"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>No items need your attention</div>
            <div style={{ fontSize: 14, color: C.textSec }}>Here's what changed since last time.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {queue.map((item, i) => (
              <div key={i} style={{
                ...card, borderLeft: `4px solid ${item.color}`,
              }}>
                {/* Type label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font }}>
                    {typeLabels[item.type]}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 6px', lineHeight: '1.35', fontFamily: font }}>
                  {item.title}
                </h3>

                {/* Detail */}
                <p style={{ fontSize: 14, color: C.textSec, margin: '0 0 8px', lineHeight: '1.5', fontFamily: font }}>
                  {item.detail}
                </p>

                {/* Age + consequence */}
                <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 16px', fontFamily: font }}>
                  {[item.age, item.consequence].filter(Boolean).join(' \u00b7 ')}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant={item.type === 'decision' ? 'decision' : item.type === 'delivery' ? 'success' : 'warning'}
                    onClick={item.primary.action}>{item.primary.label}</Btn>
                  <Btn variant="outline" onClick={item.secondary.action}>{item.secondary.label}</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: C.border, marginBottom: 32 }} />

      {/* ── SINCE YOUR LAST VISIT ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font }}>
            Since Your Last Visit
          </h2>
          <span style={{ fontSize: 12, color: C.textMuted, fontFamily: font }}>{activity.length} items</span>
        </div>

        <div style={card}>
          {activity.map((a, i) => {
            const badgeMap = {
              'Delivered': { bg: '#d1fae5', color: '#047857' },
              'In Progress': { bg: '#dbeafe', color: '#1d4ed8' },
              'Waiting on IVC': { bg: '#fef3c7', color: '#b45309' },
              'Scoping': { bg: '#e0e7ff', color: '#4338ca' },
              'Document': { bg: '#f3e8ff', color: '#7c3aed' },
              'Milestone': { bg: '#cffafe', color: '#0e7490' },
            };
            const bs = badgeMap[a.badge] || { bg: C.borderLight, color: C.textSec };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none',
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, minWidth: 52, fontFamily: font }}>
                  {a.date?.replace('2026-0', '').replace('2026-', '')}
                </span>
                <span style={{ fontSize: 14, color: C.text, flex: 1, fontFamily: font }}>{a.description}</span>
                {a.badge && <Badge color={bs.color} bg={bs.bg}>{a.badge}</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: C.border, marginBottom: 32 }} />

      {/* ── YOUR INVESTMENT (strip) ── */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font }}>
          Your Investment
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.text, lineHeight: '1', marginBottom: 4 }}>${totalDelivered.toLocaleString()}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, fontFamily: font }}>Delivered</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, fontFamily: font }}>Phase 1</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.text, lineHeight: '1', marginBottom: 4 }}>$5,000<span style={{ fontSize: 16, fontWeight: 400, color: C.textSec }}>/mo</span></div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, fontFamily: font }}>Proposed</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, fontFamily: font }}>Managed Platform</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.delivery, lineHeight: '1', marginBottom: 4 }}>$150k+</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, fontFamily: font }}>Projected Savings</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, fontFamily: font }}>Offshore replacement</div>
          </div>
        </div>
        <button onClick={() => onNavigate('investment')} style={{
          fontSize: 13, fontWeight: 500, color: C.primary, background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: font, padding: 0,
        }}>View Full Investment Summary {"\u2192"}</button>
      </div>
    </div>
  );
}

/* ═══════════ BACKLOG: KANBAN BOARD (5 columns) ═══════════ */
function PortalBacklog({ projects, updateProject, onSubmitRequest }) {
  const [detailProject, setDetailProject] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqUrgency, setReqUrgency] = useState('medium');

  const columns = [
    { key: 'scoping',     label: 'Scoping',          headerColor: C.decision, stages: ['scoping', 'requested'] },
    { key: 'estimated',   label: 'Ready for You',    headerColor: C.blocker,  stages: ['estimated'] },
    { key: 'in_progress', label: 'Building',         headerColor: C.primary,  stages: ['approved', 'in_progress'] },
    { key: 'delivered',   label: 'Delivered',         headerColor: C.delivery, stages: ['delivered'] },
    { key: 'accepted',    label: 'Managed Support',  headerColor: '#047857',  stages: ['accepted'] },
  ];

  const fmtValue = (v) => v ? `$${v.toLocaleString()}` : null;

  const handleSubmitRequest = () => {
    if (!reqTitle.trim()) return;
    onSubmitRequest({ title: reqTitle, description: reqDesc, urgency: reqUrgency });
    setReqTitle(''); setReqDesc(''); setReqUrgency('medium'); setShowRequestForm(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 24px', fontFamily: font }}>Backlog</h2>

      {/* Request form modal */}
      {showRequestForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowRequestForm(false)}>
          <div style={{ ...card, width: 480, maxWidth: '90vw', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 16px', fontFamily: font }}>Request a Capability</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 4, fontFamily: font }}>What would you like AI to help with?</label>
              <input value={reqTitle} onChange={e => setReqTitle(e.target.value)} placeholder="e.g., Automate invoice generation..."
                style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: font, outline: 'none', boxSizing: 'border-box' }} autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 4, fontFamily: font }}>How urgent?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['low', 'medium', 'high'].map(u => (
                  <button key={u} onClick={() => setReqUrgency(u)} style={{
                    fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: font,
                    border: `1px solid ${reqUrgency === u ? C.primary : C.border}`,
                    backgroundColor: reqUrgency === u ? '#EBF5FF' : 'transparent', color: reqUrgency === u ? C.primary : C.textSec,
                  }}>{u.charAt(0).toUpperCase() + u.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleSubmitRequest}>Submit</Btn>
              <Btn variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, minHeight: 400 }}>
        {columns.map(col => {
          const colProjects = projects.filter(p => col.stages.includes(p.stage));
          const isReady = col.key === 'estimated';
          return (
            <div key={col.key} style={{ minWidth: 260, flex: '1 0 260px', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{
                padding: '10px 12px', borderRadius: '8px 8px 0 0',
                borderTop: `4px solid ${col.headerColor}`,
                backgroundColor: isReady ? '#FFFBEB' : C.cardBg,
                border: `1px solid ${C.border}`, borderBottom: 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font }}>{col.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, backgroundColor: col.headerColor, color: '#fff',
                    borderRadius: 10, padding: '1px 8px', minWidth: 18, textAlign: 'center',
                  }}>{colProjects.length}</span>
                </div>
              </div>

              {/* Body */}
              <div style={{
                flex: 1, backgroundColor: isReady ? '#FFFDF5' : '#F9FAFB',
                borderRadius: '0 0 8px 8px', padding: 8, display: 'flex', flexDirection: 'column', gap: 12,
                border: `1px solid ${C.border}`, borderTop: 'none', minHeight: 100,
              }}>
                {colProjects.length === 0 ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: C.textMuted, fontStyle: 'italic', fontFamily: font,
                    border: `1px dashed ${C.border}`, borderRadius: 6, padding: 16,
                  }}>No items</div>
                ) : (
                  colProjects.map((p, i) => (
                    <div key={i} style={{
                      backgroundColor: C.cardBg, borderRadius: 8, padding: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${p.waiting_on_client ? C.blocker : col.headerColor}`,
                      cursor: 'pointer', transition: 'box-shadow 0.2s',
                    }}
                      onClick={() => setDetailProject(p)}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                    >
                      {/* Title */}
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: '1.35', marginBottom: 6, fontFamily: font,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>

                      {/* Value */}
                      {p.estimated_value_usd && (
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6, fontFamily: font }}>
                          {fmtValue(p.estimated_value_usd)}{p.notes?.includes('/month') ? '/yr' : ''}
                        </div>
                      )}

                      {/* Waiting badge */}
                      {p.waiting_on_client && (
                        <div style={{ marginBottom: 8 }}>
                          <Badge color="#b45309" bg="#fef3c7">{"\u26a0\ufe0f"} Awaiting your input</Badge>
                        </div>
                      )}

                      {/* Managed Support badge */}
                      {p.stage === 'accepted' && (
                        <div style={{ marginBottom: 4 }}>
                          <Badge color="#047857" bg="#d1fae5">{"\u2713"} Actively maintained</Badge>
                        </div>
                      )}

                      {/* Action button */}
                      {p.stage === 'estimated' && (
                        <div style={{ marginTop: 8 }}>
                          <Btn variant="decision" onClick={e => { e.stopPropagation(); updateProject(p.title, { stage: 'approved' }); }}
                            style={{ fontSize: 12, padding: '6px 16px', width: '100%' }}>Review {"\u2192"}</Btn>
                        </div>
                      )}
                      {p.stage === 'delivered' && (
                        <div style={{ marginTop: 8 }}>
                          <Btn variant="success" onClick={e => { e.stopPropagation(); updateProject(p.title, { stage: 'accepted' }); }}
                            style={{ fontSize: 12, padding: '6px 16px', width: '100%' }}>Accept & Pay</Btn>
                        </div>
                      )}

                      {/* Date */}
                      {(p.delivered_date || p.estimated_delivery) && (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, fontFamily: font }}>
                          {p.delivered_date ? `Delivered ${p.delivered_date}` : `Est. ${p.estimated_delivery}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail slide-in */}
      {detailProject && (
        <>
          <div onClick={() => setDetailProject(null)} style={{ position: 'fixed', top: 0, left: 0, right: 400, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 99 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            backgroundColor: C.cardBg, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            zIndex: 100, overflowY: 'auto', padding: 32, fontFamily: font,
          }}>
            <button onClick={() => setDetailProject(null)} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 20, color: C.textMuted, cursor: 'pointer',
            }}>{"\u2715"}</button>

            <StageBadge stage={detailProject.stage} />
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: '16px 0 8px', lineHeight: '1.3' }}>{detailProject.title}</h2>
            <p style={{ fontSize: 14, color: C.textSec, lineHeight: '1.6', margin: '0 0 20px' }}>{detailProject.description}</p>

            {detailProject.estimated_value_usd && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Investment</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: C.text }}>{fmtValue(detailProject.estimated_value_usd)}</div>
              </div>
            )}

            {detailProject.components?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Components</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {detailProject.components.map((c, i) => <Badge key={i}>{c}</Badge>)}
                </div>
              </div>
            )}

            {detailProject.waiting_on_client && detailProject.waiting_reason && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>{"\u26a0\ufe0f"} Waiting on IVC</div>
                <div style={{ fontSize: 13, color: '#92400e', lineHeight: '1.5' }}>{detailProject.waiting_reason}</div>
              </div>
            )}

            {detailProject.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', marginBottom: 2 }}>Notes</div>
                <div style={{ fontSize: 13, color: C.textSec, lineHeight: '1.5' }}>{detailProject.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              {detailProject.stage === 'estimated' && (
                <><Btn variant="decision" onClick={() => { updateProject(detailProject.title, { stage: 'approved' }); setDetailProject(null); }}>Approve</Btn><Btn variant="outline">Questions?</Btn></>
              )}
              {detailProject.stage === 'delivered' && (
                <><Btn variant="success" onClick={() => { updateProject(detailProject.title, { stage: 'accepted' }); setDetailProject(null); }}>Accept & Pay</Btn><Btn variant="outline">Request Changes</Btn></>
              )}
            </div>
          </div>
        </>
      )}

      {/* FAB */}
      <button onClick={() => setShowRequestForm(true)} style={{
        position: 'fixed', bottom: 32, right: 32, width: 56, height: 56,
        borderRadius: '50%', backgroundColor: C.primary, color: '#fff',
        border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 300,
        boxShadow: '0 4px 12px rgba(10,132,255,0.4)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Request a Capability"
      >+</button>
    </div>
  );
}

/* ═══════════ INVESTMENT PAGE ═══════════ */
function PortalInvestment({ projects }) {
  const [expandPhase1, setExpandPhase1] = useState(false);
  const totalDelivered = projects.filter(p => p.stage === 'delivered' || p.stage === 'accepted').reduce((s, p) => s + (p.estimated_value_usd || 0), 0);

  const phase1Components = [
    { name: 'AI Annotation Engine', value: 10000 },
    { name: 'Learning Library', value: 5000 },
    { name: 'Data Layer / BigQuery', value: 3500 },
    { name: 'Output Generation', value: 4000 },
    { name: 'Admin Interface', value: 4500 },
    { name: 'GCP Infrastructure', value: 3000 },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 24px', fontFamily: font }}>Your AI Investment</h2>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={card}>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.text, lineHeight: '1' }}>${totalDelivered.toLocaleString()}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginTop: 6 }}>Invested to date</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.text, lineHeight: '1' }}>$5,000<span style={{ fontSize: 14, fontWeight: 400, color: C.textSec }}>/mo</span></div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginTop: 6 }}>Proposed monthly</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.delivery, lineHeight: '1' }}>$150k+</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginTop: 6 }}>Projected savings</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 32, fontWeight: 600, color: C.delivery, lineHeight: '1' }}>84%+</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, marginTop: 6 }}>Platform accuracy</div>
        </div>
      </div>

      {/* Value over time chart placeholder */}
      <div style={{ ...card, marginBottom: 32, position: 'relative', height: 200 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font }}>Value Over Time</h3>
        <svg width="100%" height="140" viewBox="0 0 600 140" style={{ display: 'block' }}>
          {/* Investment line */}
          <polyline points="50,120 200,60 550,60" fill="none" stroke={C.primary} strokeWidth="2.5" strokeDasharray="0" />
          {/* Savings projection */}
          <polyline points="200,100 350,60 550,20" fill="none" stroke={C.delivery} strokeWidth="2.5" strokeDasharray="6,4" />
          {/* Labels */}
          <circle cx="200" cy="60" r="5" fill={C.primary} />
          <text x="200" y="50" textAnchor="middle" fontSize="11" fill={C.text} fontWeight="600">$30k</text>
          <text x="400" y="15" textAnchor="middle" fontSize="11" fill={C.delivery} fontWeight="600">$150k+ savings</text>
          {/* Axis labels */}
          <text x="50" y="136" fontSize="10" fill={C.textMuted}>Mar</text>
          <text x="150" y="136" fontSize="10" fill={C.textMuted}>Apr</text>
          <text x="250" y="136" fontSize="10" fill={C.textMuted}>May</text>
          <text x="350" y="136" fontSize="10" fill={C.textMuted}>Jun</text>
          <text x="450" y="136" fontSize="10" fill={C.textMuted}>Jul</text>
          <text x="550" y="136" fontSize="10" fill={C.textMuted}>Aug</text>
          {/* Payback indicator */}
          <line x1="300" y1="0" x2="300" y2="130" stroke={C.textMuted} strokeWidth="1" strokeDasharray="4,4" />
          <text x="300" y="130" textAnchor="middle" fontSize="10" fill={C.delivery} fontWeight="600">Payback point</text>
        </svg>
      </div>

      {/* Investment breakdown */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.textSec, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font }}>Investment Breakdown</h3>

        {/* Phase 1 */}
        <div style={{ cursor: 'pointer', padding: '12px 0', borderBottom: `1px solid ${C.borderLight}` }} onClick={() => setExpandPhase1(!expandPhase1)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>{expandPhase1 ? '\u25bc' : '\u25b6'}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font }}>Phase 1: Floorplan Takeoff</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font }}>$30,000</span>
              <Badge color="#047857" bg="#d1fae5">{"\u2713"} Delivered</Badge>
            </div>
          </div>
          {expandPhase1 && (
            <div style={{ marginTop: 12, paddingLeft: 24 }}>
              {phase1Components.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <span style={{ fontSize: 13, color: C.textSec, fontFamily: font }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: font }}>${c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Managed Platform */}
        <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font, paddingLeft: 20 }}>Managed Platform (Monthly)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font }}>$5,000/mo</span>
            <Badge color="#b45309" bg="#fef3c7">{"\u23f3"} Pending</Badge>
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: font }}>Upcoming</div>
          {['ERP Integration', 'Estimation Platform', 'ESSOR Discovery'].map((name, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', paddingLeft: 20, borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none' }}>
              <span style={{ fontSize: 13, color: C.textSec, fontFamily: font }}>{name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: C.textMuted, fontFamily: font }}>TBD</span>
                <Badge color="#4338ca" bg="#e0e7ff">Scoping</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ PLATFORM HEALTH ═══════════ */
function PortalPlatform() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, margin: 0, fontFamily: font }}>Platform Health</h2>
        <Badge color="#047857" bg="#d1fae5">All systems {"\u2713"}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { value: '84%+', label: 'Accuracy Rate', sub: '\u2197 Improving', color: C.delivery },
          { value: '<20 min', label: 'Time to Result', sub: 'Per floorplan', color: C.primary },
          { value: '\u2713', label: 'System Status', sub: 'Operational', color: C.delivery },
          { value: '\u2197', label: 'Getting Smarter', sub: 'With every use', color: C.primary },
        ].map((m, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: 32, fontWeight: 600, color: m.color, lineHeight: '1', marginBottom: 4 }}>{m.value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 24, borderLeft: `4px solid ${C.delivery}`, background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 8px', fontFamily: font }}>Your Platform Learns From Every Use</h3>
        <p style={{ fontSize: 14, color: C.textSec, margin: '0 0 16px', lineHeight: '1.6', fontFamily: font }}>
          Every correction your engineers make improves the AI for all future scans. This is your competitive advantage — it gets smarter the more you use it.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#f8fafc', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>Growing</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Corrections contributed</div>
          </div>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#f8fafc', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>Active</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Store-specific mappings</div>
          </div>
        </div>
      </div>

      <div style={{ ...card, textAlign: 'center', border: `1px dashed ${C.border}`, color: C.textMuted }}>
        <span style={{ fontSize: 24, display: 'block', marginBottom: 8, opacity: 0.4 }}>{"\ud83d\udcca"}</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4, fontFamily: font }}>Monthly Health Report</div>
        <div style={{ fontSize: 13, color: C.textSec, fontFamily: font }}>Available April 1, 2026</div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN PORTAL APP ═══════════ */
export default function Portal() {
  const user = useUser();
  const clientId = user?.client_id || 'ivc';
  const [section, setSection] = useState('home');

  const { projects, loading: projLoading, updateProject } = usePortalProjects(clientId);
  const { activity } = usePortalActivity(clientId);
  const { submitRequest } = usePortalRequests(clientId);

  const navItems = [
    { id: 'home', label: 'Home', icon: '\u25c8' },
    { id: 'backlog', label: 'Backlog', icon: '\u25a3' },
    { id: 'investment', label: 'Investment', icon: '\ud83d\udcb0' },
    { id: 'platform', label: 'Platform', icon: '\u2764' },
  ];

  const queueCount = projects.filter(p => p.stage === 'estimated' || p.waiting_on_client || p.stage === 'delivered').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.bg, fontFamily: font }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, backgroundColor: C.cardBg, borderRight: `1px solid ${C.border}`,
        padding: '24px 0', display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>N</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>NOUVIA</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{user?.company_name || 'IVC'} AI Platform</div>
            </div>
          </div>
        </div>

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
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
              {item.id === 'home' && queueCount > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff',
                  backgroundColor: C.blocker, borderRadius: 10, padding: '1px 7px',
                }}>{Math.min(queueCount, 3)}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2 }}>{user?.display_name}</div>
          <button onClick={() => auth.signOut()} style={{
            fontSize: 12, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, padding: 0, textDecoration: 'underline',
          }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: 32, maxWidth: 1100 }}>
        {section === 'home' && <PortalHome projects={projects} activity={activity} onNavigate={setSection} updateProject={updateProject} />}
        {section === 'backlog' && <PortalBacklog projects={projects} updateProject={updateProject} onSubmitRequest={submitRequest} />}
        {section === 'investment' && <PortalInvestment projects={projects} />}
        {section === 'platform' && <PortalPlatform />}
      </main>
    </div>
  );
}
