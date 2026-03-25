/**
 * Portal.jsx — Client Portal V2-Final
 * Complete 5-page portal: Home, Backlog, Roadmap, Investment, Platform
 * Commitment lifecycle: Requested -> Scoping -> Estimated -> Approved for Delivery (lock) -> Building -> Delivered -> Managed Support
 */
import { useState, useCallback } from 'react';
import { auth } from './firebase';
import { useUser } from './AuthGate';
import { usePortalProjects, usePortalActivity, usePortalDocuments, usePortalRequests, isLocked } from './hooks/usePortalData';

/* ═══════════ DESIGN TOKENS ═══════════ */
const T = {
  primary: '#0A84FF',
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
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  radius: 8,
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const cardStyle = {
  borderRadius: T.radius,
  border: `1px solid ${T.border}`,
  boxShadow: T.shadow,
  padding: 24,
  backgroundColor: T.cardBg,
};

/* ═══════════ STAGE HELPERS ═══════════ */
const STAGE_ORDER = ['requested', 'scoping', 'estimated', 'approved_for_delivery', 'building', 'delivered', 'managed_support'];
const STAGE_LABELS = {
  requested: 'Requested',
  scoping: 'Scoping',
  estimated: 'Estimated',
  approved_for_delivery: 'Approved for Delivery',
  building: 'Building',
  delivered: 'Delivered',
  managed_support: 'Managed Support',
};

function formatCurrency(n) {
  if (n == null) return '--';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
  return '$' + n.toLocaleString();
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

/* ═══════════ SIDEBAR ═══════════ */
function Sidebar({ page, setPage, attentionCount, userName }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '\u{1F3E0}' },
    { id: 'backlog', label: 'Backlog', icon: '\u{1F4CB}' },
    { id: 'roadmap', label: 'Roadmap', icon: '\u{1F5FA}\uFE0F' },
    { id: 'investment', label: 'Investment', icon: '\u{1F4B0}' },
    { id: 'platform', label: 'Platform', icon: '\u{2699}\uFE0F' },
  ];

  return (
    <div style={{
      width: 220, minHeight: '100vh', backgroundColor: '#FFFFFF',
      borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      fontFamily: T.font,
    }}>
      {/* Brand */}
      <div style={{ padding: '28px 24px 24px', borderBottom: `1px solid ${T.borderLight}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, backgroundColor: T.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>N</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>NOUVIA</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', marginBottom: 2, borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
                backgroundColor: active ? '#EFF6FF' : 'transparent',
                color: active ? T.primary : T.textSec,
                transition: 'all 0.15s', fontFamily: T.font,
              }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'home' && attentionCount > 0 && (
                <span style={{
                  marginLeft: 'auto', backgroundColor: '#EF4444', color: '#fff',
                  fontSize: 11, fontWeight: 700, borderRadius: 10,
                  padding: '1px 7px', minWidth: 18, textAlign: 'center', lineHeight: '18px',
                }}>{attentionCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '16px 20px', borderTop: `1px solid ${T.borderLight}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{userName || 'User'}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>Client</div>
        </div>
        <button
          onClick={() => auth.signOut()}
          style={{
            fontSize: 12, color: T.textMuted, border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: T.font, padding: '4px 8px', borderRadius: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}
        >Sign out</button>
      </div>
    </div>
  );
}

/* ═══════════ DETAIL SLIDE-OUT PANEL ═══════════ */
function DetailPanel({ project, onClose, onAction }) {
  if (!project) return null;
  const locked = isLocked(project.stage);
  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, backgroundColor: '#fff',
      borderLeft: `1px solid ${T.border}`, boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
      zIndex: 200, overflowY: 'auto', fontFamily: T.font,
    }}>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '3px 8px', borderRadius: 4,
                backgroundColor: locked ? '#DBEAFE' : '#FEF3C7',
                color: locked ? '#1D4ED8' : '#92400E',
              }}>
                {locked ? '\u{1F512}' : '\u{1F513}'} {STAGE_LABELS[project.stage] || project.stage}
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>{project.title}</h2>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', fontSize: 20, cursor: 'pointer',
            color: T.textMuted, padding: '4px 8px', marginLeft: 12,
          }}>{'\u2715'}</button>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, marginBottom: 20 }}>{project.description}</p>

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {project.estimated_value_usd != null && (
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Value</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{formatCurrency(project.estimated_value_usd)}</div>
            </div>
          )}
          {project.monthly_value_usd != null && (
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Monthly</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{formatCurrency(project.monthly_value_usd)}/mo</div>
            </div>
          )}
          {project.estimated_start && (
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Start</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{project.estimated_start}</div>
            </div>
          )}
          {(project.estimated_delivery || project.delivered_date) && (
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                {project.delivered_date ? 'Delivered' : 'Est. Delivery'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                {project.delivered_date || project.estimated_delivery}
              </div>
            </div>
          )}
        </div>

        {/* Components */}
        {project.components && project.components.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Components
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {project.components.map((c, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 12,
                  backgroundColor: T.borderLight, color: T.textSec,
                }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Waiting on client */}
        {project.waiting_on_client && project.waiting_reason && (
          <div style={{
            ...cardStyle, padding: 14, marginBottom: 20,
            backgroundColor: '#FFFBEB', borderColor: '#FDE68A',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>{'\u26A0\uFE0F'} Waiting on You</div>
            <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>{project.waiting_reason}</div>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Notes</div>
            <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5, margin: 0 }}>{project.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {project.stage === 'estimated' && (
            <button onClick={() => onAction && onAction('approve', project)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none',
              backgroundColor: T.primary, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
            }}>Approve for Delivery</button>
          )}
          {project.stage === 'delivered' && (
            <button onClick={() => onAction && onAction('accept', project)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none',
              backgroundColor: T.delivery, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: T.font,
            }}>Accept &amp; Pay</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ APPROVAL DIALOG ═══════════ */
function ApprovalDialog({ project, onConfirm, onCancel }) {
  if (!project) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      fontFamily: T.font,
    }}>
      <div style={{ ...cardStyle, width: 440, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>
          Approve for Delivery?
        </h3>
        <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, margin: '0 0 16px' }}>
          You are about to approve <strong>{project.title}</strong> for delivery.
        </p>
        <div style={{
          backgroundColor: '#EFF6FF', borderRadius: 6, padding: 14, marginBottom: 20,
          border: '1px solid #BFDBFE',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>{'\u{1F512}'} Lock Point</div>
          <p style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.5, margin: 0 }}>
            Once approved, this project moves past the commitment lock point. Nouvia will begin active
            development and this item can no longer be freely modified. Changes after this point may
            impact timeline and cost.
          </p>
        </div>
        {project.estimated_value_usd != null && (
          <div style={{ fontSize: 14, color: T.text, marginBottom: 16 }}>
            Estimated investment: <strong>{formatCurrency(project.estimated_value_usd)}</strong>
            {project.monthly_value_usd && <span> ({formatCurrency(project.monthly_value_usd)}/mo)</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '10px 20px', borderRadius: 6, border: `1px solid ${T.border}`,
            backgroundColor: '#fff', color: T.textSec, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '10px 20px', borderRadius: 6, border: 'none',
            backgroundColor: T.primary, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
          }}>{'\u{1F512}'} Approve &amp; Lock</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ REQUEST CAPABILITY DIALOG ═══════════ */
function RequestDialog({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const inputBase = {
    width: '100%', padding: '10px 12px', borderRadius: 6, border: `1px solid ${T.border}`,
    fontSize: 14, fontFamily: T.font, color: T.text, outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      fontFamily: T.font,
    }}>
      <div style={{ ...cardStyle, width: 440, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '0 0 16px' }}>
          Request a Capability
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSec, display: 'block', marginBottom: 4 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you need?" style={inputBase} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textSec, display: 'block', marginBottom: 4 }}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the capability..."
            rows={4} style={{ ...inputBase, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '10px 20px', borderRadius: 6, border: `1px solid ${T.border}`,
            backgroundColor: '#fff', color: T.textSec, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: T.font,
          }}>Cancel</button>
          <button
            onClick={() => { if (title.trim()) onSubmit({ title: title.trim(), description: desc.trim() }); }}
            disabled={!title.trim()}
            style={{
              padding: '10px 20px', borderRadius: 6, border: 'none',
              backgroundColor: title.trim() ? T.primary : T.border,
              color: title.trim() ? '#fff' : T.textMuted, fontSize: 13, fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'default', fontFamily: T.font,
            }}
          >Submit Request</button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   PAGE 1: HOME (Attention Queue)
   ═══════════════════════════════════════════════════ */
function HomePage({ projects, activity }) {
  const attentionItems = [];

  // DECISION: estimated stage
  projects.filter(p => p.stage === 'estimated').forEach(p => {
    attentionItems.push({
      type: 'decision', color: T.decision, icon: '\u{1F4CB}', label: 'DECISION NEEDED',
      title: p.title,
      detail: p.notes || p.description,
      age: p.waiting_reason || 'Estimate ready for your review',
      consequence: 'Approval moves this past the lock point',
      btn1: 'Review Estimate', btn2: 'Approve for Delivery', project: p,
    });
  });

  // BLOCKER: waiting_on_client (except estimated, already shown)
  projects.filter(p => p.waiting_on_client && p.stage !== 'estimated').forEach(p => {
    attentionItems.push({
      type: 'blocker', color: T.blocker, icon: '\u26A0\uFE0F', label: 'BLOCKER',
      title: p.title,
      detail: p.waiting_reason || 'Waiting on your input',
      age: 'Blocking progress',
      consequence: 'Delivery cannot continue until resolved',
      btn1: 'View Details', btn2: 'Provide Information', project: p,
    });
  });

  // DELIVERY: delivered stage
  projects.filter(p => p.stage === 'delivered').forEach(p => {
    attentionItems.push({
      type: 'delivery', color: T.delivery, icon: '\u{1F4E6}', label: 'DELIVERY',
      title: p.title,
      detail: p.notes || 'Ready for acceptance',
      age: p.delivered_date ? daysAgo(p.delivered_date) : '',
      consequence: 'Accept to begin managed support',
      btn1: 'Review Deliverable', btn2: 'Accept & Pay', project: p,
    });
  });

  const items = attentionItems.slice(0, 3);

  // KPIs
  const deliveredTotal = projects
    .filter(p => p.stage === 'delivered' || p.stage === 'managed_support')
    .reduce((s, p) => s + (p.actual_value_usd || p.estimated_value_usd || 0), 0);
  const monthlyProposed = projects.reduce((s, p) => s + (p.monthly_value_usd || 0), 0);

  return (
    <div>
      {/* Attention header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>YOUR ATTENTION</h1>
        {items.length > 0 && (
          <span style={{
            backgroundColor: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700,
            borderRadius: 10, padding: '2px 10px', lineHeight: '20px',
          }}>{items.length}</span>
        )}
      </div>

      {/* Attention cards */}
      {items.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u2705'}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>You're all caught up</div>
          <div style={{ fontSize: 14, color: T.textSec, marginTop: 4 }}>No items need your attention right now.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              ...cardStyle, padding: 20, borderLeft: `4px solid ${item.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: item.color,
                    }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5, marginBottom: 8 }}>{item.detail}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: T.textMuted }}>
                    {item.age && <span>{item.age}</span>}
                    {item.consequence && <span style={{ fontStyle: 'italic' }}>{item.consequence}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                  <button style={{
                    padding: '8px 14px', borderRadius: 6, border: `1px solid ${T.border}`,
                    backgroundColor: '#fff', color: T.textSec, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap',
                  }}>{item.btn1}</button>
                  <button style={{
                    padding: '8px 14px', borderRadius: 6, border: 'none',
                    backgroundColor: item.color, color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap',
                  }}>{item.btn2}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delta feed */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          SINCE YOUR LAST VISIT
        </h2>
        <div style={{ ...cardStyle, padding: 0 }}>
          {activity.slice(0, 6).map((a, i) => {
            const badgeColors = {
              'Delivered': { bg: '#D1FAE5', fg: '#065F46' },
              'Milestone': { bg: '#EDE9FE', fg: '#5B21B6' },
              'In Progress': { bg: '#DBEAFE', fg: '#1D4ED8' },
              'Waiting on IVC': { bg: '#FEF3C7', fg: '#92400E' },
              'Document': { bg: '#F3F4F6', fg: '#374151' },
              'Scoping': { bg: '#F3F4F6', fg: '#374151' },
            };
            const bc = badgeColors[a.badge] || { bg: '#F3F4F6', fg: T.textSec };
            return (
              <div key={i} style={{
                padding: '14px 20px',
                borderBottom: i < Math.min(activity.length, 6) - 1 ? `1px solid ${T.borderLight}` : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontSize: 12, color: T.textMuted, minWidth: 80, flexShrink: 0 }}>{a.date}</div>
                <div style={{ flex: 1, fontSize: 13, color: T.text }}>{a.description}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                  backgroundColor: bc.bg, color: bc.fg, whiteSpace: 'nowrap',
                }}>{a.badge}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment strip */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          YOUR INVESTMENT
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Delivered Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{formatCurrency(deliveredTotal)}</div>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Monthly Proposed</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{formatCurrency(monthlyProposed)}/mo</div>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Projected Savings</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.delivery }}>$150k+</div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   PAGE 2: BACKLOG (Kanban)
   ═══════════════════════════════════════════════════ */
function BacklogPage({ projects, requests, updateProject, submitRequest, onSelectProject }) {
  const [approving, setApproving] = useState(null);
  const [showRequest, setShowRequest] = useState(false);

  const allItems = [
    ...projects,
    ...requests.map(r => ({ ...r, stage: r.stage || 'requested' })),
  ];

  const columns = STAGE_ORDER.map(stage => ({
    stage,
    label: STAGE_LABELS[stage],
    items: allItems.filter(p => p.stage === stage).sort((a, b) => (a.priority_order || 99) - (b.priority_order || 99)),
    locked: isLocked(stage),
  }));

  const confirmApprove = () => {
    if (approving) {
      updateProject(approving.id || approving.title, { stage: 'approved_for_delivery' });
      setApproving(null);
    }
  };

  const handleAccept = (project) => {
    updateProject(project.id || project.title, { stage: 'managed_support' });
  };

  const handleSubmitRequest = (data) => {
    submitRequest(data);
    setShowRequest(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Backlog</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: T.textMuted }}>
          <span>{'\u{1F513}'} Your control</span>
          <span style={{ color: T.border }}>|</span>
          <span>{'\u{1F512}'} Committed</span>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {columns.map(col => {
          const isEstimated = col.stage === 'estimated';
          return (
            <div key={col.stage} style={{
              minWidth: 210, width: 210, flexShrink: 0,
              backgroundColor: isEstimated ? '#FFFBEB' : T.borderLight,
              borderRadius: 8, padding: 12,
              border: isEstimated ? '2px solid #FDE68A' : '1px solid transparent',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${isEstimated ? '#FDE68A' : T.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{col.locked ? '\u{1F512}' : '\u{1F513}'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>{col.label}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: T.textMuted,
                  backgroundColor: '#fff', borderRadius: 10, padding: '1px 7px',
                }}>{col.items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.items.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    style={{
                      ...cardStyle, padding: 12, cursor: 'pointer',
                      borderLeft: `3px solid ${isLocked(p.stage) ? T.primary : T.blocker}`,
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>
                      {p.title}
                    </div>
                    {p.estimated_value_usd != null && (
                      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
                        {formatCurrency(p.estimated_value_usd)}
                      </div>
                    )}
                    {p.waiting_on_client && (
                      <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>{'\u26A0'} Waiting on you</div>
                    )}
                    {col.stage === 'estimated' && (
                      <button
                        onClick={e => { e.stopPropagation(); setApproving(p); }}
                        style={{
                          marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 4, border: 'none',
                          backgroundColor: T.primary, color: '#fff', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: T.font,
                        }}
                      >Approve for Delivery</button>
                    )}
                    {col.stage === 'delivered' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleAccept(p); }}
                        style={{
                          marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 4, border: 'none',
                          backgroundColor: T.delivery, color: '#fff', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: T.font,
                        }}
                      >Accept &amp; Pay</button>
                    )}
                    {col.stage === 'managed_support' && (
                      <div style={{
                        marginTop: 8, fontSize: 11, fontWeight: 600, color: T.delivery,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>{'\u2713'} Actively maintained</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowRequest(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 52, height: 52,
          borderRadius: 26, border: 'none', backgroundColor: T.primary,
          color: '#fff', fontSize: 26, fontWeight: 300, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(10,132,255,0.3)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
          fontFamily: T.font, lineHeight: 1,
        }}
        title="Request a Capability"
      >+</button>

      {approving && <ApprovalDialog project={approving} onConfirm={confirmApprove} onCancel={() => setApproving(null)} />}
      {showRequest && <RequestDialog onSubmit={handleSubmitRequest} onCancel={() => setShowRequest(false)} />}
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   PAGE 3: ROADMAP (Timeline)
   ═══════════════════════════════════════════════════ */
function RoadmapPage({ projects, onSelectProject }) {
  const today = new Date();
  const allDates = projects
    .flatMap(p => [p.estimated_start, p.estimated_delivery, p.delivered_date].filter(Boolean))
    .map(d => new Date(d));
  allDates.push(today);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  minDate.setDate(1);
  maxDate.setMonth(maxDate.getMonth() + 2);
  maxDate.setDate(0);

  const totalDays = Math.max(1, (maxDate - minDate) / 86400000);
  const toPercent = (dateStr) => {
    if (!dateStr) return null;
    return ((new Date(dateStr) - minDate) / 86400000) / totalDays * 100;
  };
  const todayPct = Math.max(0, Math.min(100, ((today - minDate) / 86400000) / totalDays * 100));

  // Month labels
  const months = [];
  const cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const pct = ((cursor - minDate) / 86400000) / totalDays * 100;
    months.push({ label: cursor.toLocaleString('default', { month: 'short', year: '2-digit' }), pct });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const getBarColor = (stage) => {
    if (stage === 'delivered' || stage === 'managed_support') return T.delivery;
    if (stage === 'building' || stage === 'approved_for_delivery') return T.primary;
    return T.textMuted;
  };

  const timelineProjects = projects.filter(p => p.estimated_start).sort((a, b) => a.priority_order - b.priority_order);
  const lockedCount = projects.filter(p => isLocked(p.stage)).length;
  const unlockedCount = projects.filter(p => !isLocked(p.stage) && p.stage !== 'delivered' && p.stage !== 'managed_support').length;
  const deliveredCount = projects.filter(p => p.stage === 'delivered' || p.stage === 'managed_support').length;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 20px' }}>Roadmap</h1>

      {/* Summary strip */}
      <div style={{
        ...cardStyle, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24,
        backgroundColor: '#F0F9FF', borderColor: '#BAE6FD',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>DELIVERY FORECAST:</span>
        <span style={{ fontSize: 13, color: T.text }}>
          <strong>{lockedCount}</strong> locked {'\u00B7'} <strong>{unlockedCount}</strong> in your control {'\u00B7'} <strong>{deliveredCount}</strong> delivered
        </span>
      </div>

      {/* Timeline */}
      <div style={{ ...cardStyle, padding: 24, overflowX: 'auto' }}>
        {/* Month headers */}
        <div style={{ position: 'relative', height: 28, marginBottom: 16, borderBottom: `1px solid ${T.borderLight}` }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${m.pct}%`, fontSize: 11, fontWeight: 600,
              color: T.textMuted, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
            }}>{m.label}</div>
          ))}
        </div>

        {/* Bars container */}
        <div style={{ position: 'relative', minHeight: timelineProjects.length * 52 + 10 }}>
          {/* Today marker */}
          <div style={{
            position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2,
            backgroundColor: '#EF4444', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap',
            }}>Today</div>
          </div>

          {timelineProjects.map((p, i) => {
            const left = toPercent(p.estimated_start);
            if (left == null) return null;
            const endDate = p.estimated_delivery || p.delivered_date;
            const right = endDate ? toPercent(endDate) : left + 5;
            const width = Math.max(3, right - left);
            const barColor = getBarColor(p.stage);
            const locked = isLocked(p.stage);
            const isStriped = ['scoping', 'estimated', 'requested'].includes(p.stage);

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                style={{
                  position: 'absolute', top: i * 52 + 4, left: `${left}%`, width: `${width}%`,
                  height: 36, borderRadius: 6, cursor: 'pointer',
                  backgroundColor: isStriped ? 'transparent' : barColor,
                  backgroundImage: isStriped
                    ? `repeating-linear-gradient(135deg, ${barColor}33, ${barColor}33 4px, ${barColor}11 4px, ${barColor}11 8px)`
                    : 'none',
                  border: isStriped ? `1px solid ${barColor}55` : 'none',
                  display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 6,
                  overflow: 'hidden', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <span style={{ fontSize: 11, flexShrink: 0 }}>{locked ? '\u{1F512}' : '\u{1F513}'}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: isStriped ? T.text : '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{p.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   PAGE 4: INVESTMENT
   ═══════════════════════════════════════════════════ */
function InvestmentPage({ projects }) {
  const phase1 = projects.find(p => p.title.includes('Phase 1'));
  const [expanded, setExpanded] = useState(false);

  // SVG chart
  const W = 700, H = 260, PX = 50, PY = 30;
  const chartW = W - PX * 2, chartH = H - PY * 2;
  const investData = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  const savingsData = [0, 0, 0, 5, 15, 30, 50, 75, 100, 130, 150, 175, 200];
  const maxVal = 200;
  const toX = (i) => PX + (i / 12) * chartW;
  const toY = (v) => PY + chartH - (v / maxVal) * chartH;
  const investPath = investData.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  const savingsPath = savingsData.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  let paybackIdx = savingsData.findIndex((s, i) => s > investData[i]);
  if (paybackIdx < 0) paybackIdx = 8;

  const upcomingItems = [
    { title: 'Design Scoping Solution', status: 'Scoping' },
    { title: 'Engineering Scoping Solution', status: 'Scoping' },
    { title: 'ESSOR Discovery (Revenue Quebec)', status: 'Scoping' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 20px' }}>Investment</h1>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Invested', value: '$30k', sub: 'Phase 1 complete' },
          { label: 'Monthly Proposed', value: '$5k/mo', sub: 'Managed platform' },
          { label: 'Projected Savings', value: '$150k+', sub: 'vs. offshore estimation', color: T.delivery },
          { label: 'Platform Accuracy', value: '84%+', sub: 'and improving', color: T.primary },
        ].map((kpi, i) => (
          <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color || T.text }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ ...cardStyle, marginBottom: 28, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 16 }}>Value Over Time</div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 260, display: 'block' }}>
          {/* Grid */}
          {[0, 50, 100, 150, 200].map(v => (
            <g key={v}>
              <line x1={PX} x2={W - PX} y1={toY(v)} y2={toY(v)} stroke={T.borderLight} strokeWidth={1} />
              <text x={PX - 8} y={toY(v) + 4} fontSize={10} fill={T.textMuted} textAnchor="end">${v}k</text>
            </g>
          ))}
          {[0, 3, 6, 9, 12].map(m => (
            <text key={m} x={toX(m)} y={H - 8} fontSize={10} fill={T.textMuted} textAnchor="middle">M{m}</text>
          ))}
          {/* Lines */}
          <path d={investPath} fill="none" stroke={T.primary} strokeWidth={2.5} />
          <path d={savingsPath} fill="none" stroke={T.delivery} strokeWidth={2.5} strokeDasharray="6,3" />
          {/* Payback marker */}
          <circle cx={toX(paybackIdx)} cy={toY(investData[paybackIdx])} r={5} fill={T.delivery} stroke="#fff" strokeWidth={2} />
          <text x={toX(paybackIdx)} y={toY(investData[paybackIdx]) - 12} fontSize={10} fill={T.delivery} textAnchor="middle" fontWeight="700">Payback</text>
          {/* Legend */}
          <line x1={W - 190} x2={W - 170} y1={16} y2={16} stroke={T.primary} strokeWidth={2.5} />
          <text x={W - 165} y={20} fontSize={10} fill={T.textSec}>Investment</text>
          <line x1={W - 95} x2={W - 75} y1={16} y2={16} stroke={T.delivery} strokeWidth={2.5} strokeDasharray="6,3" />
          <text x={W - 70} y={20} fontSize={10} fill={T.textSec}>Savings</text>
        </svg>
      </div>

      {/* Phase 1 breakdown */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Phase 1: AI Floorplan Takeoff Platform</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>$30,000 {'\u00B7'} Delivered March 19, 2026 {'\u00B7'} 6 components</div>
          </div>
          <span style={{
            fontSize: 18, color: T.textMuted, transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            display: 'inline-block',
          }}>{'\u25BC'}</span>
        </div>
        {expanded && phase1 && phase1.components && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.borderLight}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {phase1.components.map((c, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 6, backgroundColor: '#F0FDF4',
                  fontSize: 13, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ color: T.delivery }}>{'\u2713'}</span> {c}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Managed Platform */}
      <div style={{ ...cardStyle, marginBottom: 16, borderLeft: `4px solid ${T.blocker}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Managed Platform</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>$5,000/mo {'\u00B7'} Pending approval</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
            backgroundColor: '#FEF3C7', color: '#92400E',
          }}>Pending</span>
        </div>
      </div>

      {/* Upcoming */}
      <div style={{ fontSize: 14, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '24px 0 12px' }}>
        Upcoming
      </div>
      {upcomingItems.map((item, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{item.title}</div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
            backgroundColor: T.borderLight, color: T.textSec,
          }}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   PAGE 5: PLATFORM
   ═══════════════════════════════════════════════════ */
function PlatformPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Platform</h1>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 12,
          backgroundColor: '#D1FAE5', color: '#065F46',
        }}>{'\u2705'} All systems operational</span>
      </div>

      {/* Metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Accuracy', value: '84%+', icon: '\u{1F3AF}', sub: 'Floorplan takeoff', color: T.primary },
          { label: 'Time to Result', value: '<20min', icon: '\u23F1\uFE0F', sub: 'Per floorplan', color: T.opportunity },
          { label: 'System Status', value: '\u2713', icon: '\u{1F7E2}', sub: 'All services running', color: T.delivery },
          { label: 'Learning', value: '\u2197\uFE0F', icon: '\u{1F9E0}', sub: 'Getting smarter', color: T.blocker },
        ].map((m, i) => (
          <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Learning section */}
      <div style={{ ...cardStyle, marginBottom: 28, borderLeft: `4px solid ${T.opportunity}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 12px' }}>
          Your Platform Learns From Every Use
        </h2>
        <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.7, margin: '0 0 16px' }}>
          Every floorplan processed improves the AI model. Corrections and validations are fed back into the
          Learning Library, increasing accuracy over time. The system gets smarter the more you use it.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Floorplans Processed', value: '24+', icon: '\u{1F4C4}' },
            { label: 'Corrections Applied', value: '150+', icon: '\u270F\uFE0F' },
            { label: 'Model Versions', value: 'v3.2', icon: '\u{1F504}' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: 14, borderRadius: 6, backgroundColor: T.borderLight,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Health Report */}
      <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F4CA}'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Monthly Health Report</div>
        <div style={{ fontSize: 14, color: T.textMuted }}>
          Your first monthly platform health report will be available April 1, 2026.
        </div>
        <div style={{
          display: 'inline-block', marginTop: 16, padding: '8px 20px', borderRadius: 6,
          backgroundColor: T.borderLight, fontSize: 13, color: T.textSec, fontWeight: 600,
        }}>Coming Soon</div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   MAIN PORTAL COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Portal() {
  const user = useUser();
  const clientId = user?.client_id || 'ivc';
  const displayName = user?.display_name || 'User';

  const { projects, loading: projLoading, updateProject } = usePortalProjects(clientId);
  const { activity, loading: actLoading } = usePortalActivity(clientId);
  usePortalDocuments(clientId);
  const { requests, submitRequest } = usePortalRequests(clientId);

  const [page, setPage] = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);

  // Attention count
  const attentionItems = [
    ...projects.filter(p => p.stage === 'estimated'),
    ...projects.filter(p => p.waiting_on_client && p.stage !== 'estimated'),
    ...projects.filter(p => p.stage === 'delivered'),
  ];
  const attentionCount = Math.min(attentionItems.length, 3);

  const handleAction = useCallback((action, project) => {
    if (action === 'approve') {
      updateProject(project.id || project.title, { stage: 'approved_for_delivery' });
    } else if (action === 'accept') {
      updateProject(project.id || project.title, { stage: 'managed_support' });
    }
    setSelectedProject(null);
  }, [updateProject]);

  if (projLoading || actLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: T.bg, fontFamily: T.font,
      }}>
        <div style={{ color: T.textSec, fontSize: 14, fontWeight: 500 }}>Loading portal...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage projects={projects} activity={activity} />;
      case 'backlog':
        return (
          <BacklogPage
            projects={projects}
            requests={requests}
            updateProject={updateProject}
            submitRequest={submitRequest}
            onSelectProject={setSelectedProject}
          />
        );
      case 'roadmap':
        return <RoadmapPage projects={projects} onSelectProject={setSelectedProject} />;
      case 'investment':
        return <InvestmentPage projects={projects} />;
      case 'platform':
        return <PlatformPage />;
      default:
        return <HomePage projects={projects} activity={activity} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: T.bg, fontFamily: T.font }}>
      <Sidebar page={page} setPage={setPage} attentionCount={attentionCount} userName={displayName} />

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, padding: 32, maxWidth: 1100 }}>
        {renderPage()}
      </div>

      {/* Detail slide-out overlay */}
      {selectedProject && (
        <>
          <div
            onClick={() => setSelectedProject(null)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 150 }}
          />
          <DetailPanel
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onAction={handleAction}
          />
        </>
      )}
    </div>
  );
}
