import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../AuthGate';
import { getBacklog, addBacklogItem, updateBacklogNotes, updateBacklogPriority, updateBacklogTargetDate, updateBacklogStartDate, updateBacklogStage, moveToManagedSupport, markBacklogObsolete } from '../../services/clientCockpit';

const STAGES = [
  { key: 'idea', label: 'Ideas' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'managed', label: 'Managed Support' },
];

const EFFORT_UNITS = { S: 1, M: 2, L: 4, XL: 8 };

const STAGE_BADGE = {
  done: { cls: 'bg-green-100 text-green-700', label: '✓ DELIVERED' },
  in_progress: { cls: 'bg-blue-100 text-blue-700', label: '🔨 BUILDING' },
  approved: { cls: 'bg-yellow-50 text-yellow-700', label: '✓ APPROVED' },
  idea: { cls: 'bg-gray-100 text-gray-600', label: '💡 IDEA' },
  managed: { cls: 'bg-purple-100 text-purple-700', label: '⚙ MANAGED' },
};

const STAGE_BAR = {
  done: 'bg-green-200 border-green-300 text-green-800',
  in_progress: 'bg-blue-200 border-blue-300 text-blue-800',
  approved: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  idea: 'bg-gray-100 border-gray-200 text-gray-500',
  managed: 'bg-purple-200 border-purple-300 text-purple-800',
};

function toDate(v) {
  if (!v) return null;
  if (v.seconds) return new Date(v.seconds * 1000);
  if (v instanceof Date) return v;
  return new Date(v);
}

function fmtDate(v) {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

/* ══════════ DETAIL PANEL — WS4 ══════════ */
function DetailPanel({ item, onClose, onNoteSaved, onChangeRequest }) {
  const user = useUser();
  const isNouvia = user?.role === 'admin';
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const badge = STAGE_BADGE[item.stage] || STAGE_BADGE.idea;
  const isLocked = item.stage === 'in_progress' || item.stage === 'done';

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const newNotes = (item.notes || '') + (item.notes ? '\n\n' : '') + `[${ts}]: ${noteText.trim()}`;
    await updateBacklogNotes(item.id, newNotes);
    setNoteText('');
    setSaving(false);
    setToast('Note saved');
    setTimeout(() => setToast(null), 3000);
    onNoteSaved(item.id, newNotes);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col overflow-y-auto transition-transform duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          <h2 className="text-lg font-semibold text-gray-900 mt-2 pr-8">{item.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Detail fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {item.value > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Value</div>
                <div className="text-lg font-semibold text-gray-900">${Math.round(item.value / 1000)}k</div>
              </div>
            )}
            {item.monthlyFee > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Monthly</div>
                <div className="text-lg font-semibold text-gray-900">${Math.round(item.monthlyFee / 1000)}k/mo</div>
              </div>
            )}
            {item.startDate && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Start</div>
                <div className="text-lg font-semibold text-gray-900">{fmtDate(item.startDate)}</div>
              </div>
            )}
            {item.stage === 'done' && item.deliveredDate && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Delivered</div>
                <div className="text-lg font-semibold text-gray-900">{fmtDate(item.deliveredDate)}</div>
              </div>
            )}
            {item.stage !== 'done' && item.targetDate && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Est. Delivery</div>
                <div className="text-lg font-semibold text-gray-900">{fmtDate(item.targetDate)}</div>
              </div>
            )}
          </div>

          {/* Components */}
          {item.components?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Components</div>
              <div className="flex flex-wrap gap-1">
                {item.components.map((c, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Notes</div>
            {item.notes && (
              <div className="text-sm text-gray-600 whitespace-pre-wrap mb-3 bg-gray-50 rounded-lg p-3">{item.notes}</div>
            )}
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end mt-2">
              <button onClick={handleSaveNote} disabled={!noteText.trim() || saving}
                className={`bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 ${!noteText.trim() || saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>

        {/* Move to Managed Support (done items — Nouvia only) */}
        {item.stage === 'done' && isNouvia && (
          <div className="p-4 border-t border-gray-100">
            <button onClick={async () => { await moveToManagedSupport(item.id); onNoteSaved(item.id, item.notes || ''); onClose(); }}
              className="bg-purple-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-600 w-full font-medium">
              Move to Managed Support
            </button>
          </div>
        )}

        {/* Lock indicator */}
        {isLocked && (
          <div className="bg-amber-50 border-t border-amber-200 p-4">
            <p className="text-xs text-amber-700">
              🔒 This item is in progress. Priority and timeline changes require a Change Request.
            </p>
            <button onClick={() => onChangeRequest?.(item)} className="text-amber-600 hover:text-amber-800 text-xs font-medium mt-1">Submit Change Request</button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">{toast}</div>
      )}
    </>
  );
}

/* ══════════ ROADMAP TIMELINE — WS5 ══════════ */
function RoadmapTimeline({ items, onItemClick, onUpdateItem, onReloadBacklog }) {
  const user = useUser();
  const isNouvia = user?.role === 'admin';
  const [actionMenu, setActionMenu] = useState(null); // { item, menuAction: null|'date'|'pause'|'obsolete' }
  const [actionDate, setActionDate] = useState('');
  const [actionText, setActionText] = useState('');
  const [changeRequest, setChangeRequest] = useState(null);
  const [crText, setCrText] = useState('');
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(null);

  const active = items.filter(i => i.stage !== 'obsolete');
  const scheduled = active.filter(i => toDate(i.startDate) || toDate(i.targetDate));
  const unscheduled = active.filter(i => !toDate(i.startDate) && !toDate(i.targetDate));

  // Calculate timeline range
  const allDates = scheduled.flatMap(i => [toDate(i.startDate), toDate(i.targetDate)].filter(Boolean));
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
  // Add buffer
  const timelineStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const timelineEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);

  const months = [];
  let cursor = new Date(timelineStart);
  while (cursor <= timelineEnd) {
    months.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const MONTH_WIDTH = 200;
  const totalWidth = months.length * MONTH_WIDTH;
  const ROW_HEIGHT = 44;

  const msRange = timelineEnd.getTime() - timelineStart.getTime();
  const pxPerMs = totalWidth / msRange;

  const today = new Date();
  const todayX = Math.max(0, Math.min(totalWidth, (today.getTime() - timelineStart.getTime()) * pxPerMs));

  const getBarProps = (item) => {
    const start = toDate(item.startDate) || toDate(item.targetDate);
    const end = toDate(item.targetDate) || toDate(item.startDate);
    if (!start || !end) return null;
    const x = Math.max(0, (start.getTime() - timelineStart.getTime()) * pxPerMs);
    const w = Math.max(40, (end.getTime() - start.getTime()) * pxPerMs);
    return { x, w };
  };

  const isLocked = (item) => !isNouvia && (item.stage === 'in_progress' || item.stage === 'done' || item.stage === 'managed');
  const canDrag = (item) => isNouvia || item.stage === 'idea' || item.stage === 'approved';

  const handleBarClick = (item, e) => {
    if (isLocked(item)) {
      setChangeRequest(item);
    } else {
      setActionMenu({ item, menuAction: null });
      setActionDate('');
      setActionText('');
    }
  };

  const handleDragStart = (item, e) => {
    if (!canDrag(item)) { e.preventDefault(); return; }
    const s = toDate(item.startDate);
    const t = toDate(item.targetDate);
    const durationMs = (s && t) ? t.getTime() - s.getTime() : 0;
    setDragging({ itemId: item.id, startX: e.clientX, originalStartDate: s, originalTargetDate: t, durationMs });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDragging(null);

  const closeMenu = () => { setActionMenu(null); setActionDate(''); setActionText(''); };

  const handleStartDateUpdate = async () => {
    if (!actionMenu || !actionDate) return;
    const item = actionMenu.item;
    const newStart = new Date(actionDate);
    const oldStart = toDate(item.startDate);
    const oldTarget = toDate(item.targetDate);
    const duration = (oldStart && oldTarget) ? oldTarget.getTime() - oldStart.getTime() : 30 * 24 * 3600 * 1000;
    const newTarget = new Date(newStart.getTime() + duration);
    onUpdateItem(item.id, {
      startDate: { seconds: Math.floor(newStart.getTime() / 1000) },
      targetDate: { seconds: Math.floor(newTarget.getTime() / 1000) },
    });
    await updateBacklogStartDate(item.id, newStart.toISOString());
    await updateBacklogTargetDate(item.id, newTarget.toISOString());
    closeMenu();
    setToast('Dates updated');
    setTimeout(() => setToast(null), 3000);
  };

  const handlePauseRequest = async () => {
    if (!actionMenu || !actionText.trim()) return;
    await addBacklogItem('ivc', {
      title: `Pause Request: ${actionMenu.item.title}`,
      description: actionText.trim(),
      stage: 'idea', linkedPillar: actionMenu.item.linkedPillar,
      estimatedEffort: 'S', isPauseRequest: true,
      linkedOriginalId: actionMenu.item.id, priority: 99,
    });
    closeMenu();
    setToast('Pause request submitted — Nouvia will review and update your timeline');
    setTimeout(() => setToast(null), 4000);
    onReloadBacklog();
  };

  const handleObsolete = async () => {
    if (!actionMenu) return;
    await markBacklogObsolete(actionMenu.item.id, actionText.trim());
    closeMenu();
    setToast('Item marked as obsolete — Nouvia notified');
    setTimeout(() => setToast(null), 3000);
    onReloadBacklog();
  };

  const handleSubmitCR = async () => {
    if (!changeRequest || !crText.trim()) return;
    await addBacklogItem('ivc', {
      title: `Change Request: ${changeRequest.title}`,
      description: crText.trim(),
      stage: 'idea',
      linkedPillar: changeRequest.linkedPillar,
      estimatedEffort: 'S',
      isChangeRequest: true,
      linkedOriginalId: changeRequest.id,
      priority: 99,
    });
    setChangeRequest(null);
    setCrText('');
    setToast('Change request submitted — Nouvia will review and update your backlog.');
    setTimeout(() => setToast(null), 4000);
    onReloadBacklog();
  };

  return (
    <div className="px-6 pb-6">
      <div className="relative overflow-x-auto border border-gray-200 rounded-xl bg-white">
        {/* Month headers */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="w-60 shrink-0 px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-100">Item</div>
          <div className="flex" style={{ width: totalWidth }}>
            {months.map((m, i) => (
              <div key={i} className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center py-3 border-r border-gray-100" style={{ width: MONTH_WIDTH }}>
                {m.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            ))}
          </div>
        </div>

        {/* Item rows */}
        <div className="relative"
          onDragOver={(e) => { if (dragging) e.preventDefault(); }}
          onDrop={async (e) => {
            if (!dragging) return;
            e.preventDefault();
            const deltaX = e.clientX - dragging.startX;
            const daysDelta = Math.round(deltaX / (MONTH_WIDTH / 30));
            if (Math.abs(daysDelta) >= 1 && (dragging.originalStartDate || dragging.originalTargetDate)) {
              const newStart = dragging.originalStartDate ? new Date(dragging.originalStartDate) : null;
              const newTarget = dragging.originalTargetDate ? new Date(dragging.originalTargetDate) : null;
              if (newStart) newStart.setDate(newStart.getDate() + daysDelta);
              if (newTarget) newTarget.setDate(newTarget.getDate() + daysDelta);
              // Optimistic local state update — shift whole bar
              const updates = {};
              if (newStart) updates.startDate = { seconds: Math.floor(newStart.getTime() / 1000) };
              if (newTarget) updates.targetDate = { seconds: Math.floor(newTarget.getTime() / 1000) };
              onUpdateItem(dragging.itemId, updates);
              if (newStart) await updateBacklogStartDate(dragging.itemId, newStart.toISOString());
              if (newTarget) await updateBacklogTargetDate(dragging.itemId, newTarget.toISOString());
              setToast('Date updated');
              setTimeout(() => setToast(null), 3000);
            }
            setDragging(null);
          }}
        >
          {/* Today marker */}
          <div className="absolute top-0 bottom-0 border-l-2 border-blue-400 border-dashed z-10" style={{ left: 240 + todayX }}>
            <span className="absolute -top-0.5 -left-4 text-xs text-blue-500 font-medium bg-white px-1">Today</span>
          </div>

          {scheduled.sort((a, b) => (a.priority || 99) - (b.priority || 99)).map((item, i) => {
            const bar = getBarProps(item);
            const locked = isLocked(item);
            const barCls = STAGE_BAR[item.stage] || STAGE_BAR.idea;
            const badge = STAGE_BADGE[item.stage] || STAGE_BADGE.idea;
            return (
              <div key={item.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50 transition-colors" style={{ height: ROW_HEIGHT }}>
                {/* Left column */}
                <div className="w-60 shrink-0 px-4 flex items-center gap-2 border-r border-gray-100">
                  {!locked && <span className="text-gray-300 cursor-grab text-xs">⠿</span>}
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{item.title}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls} shrink-0 hidden lg:inline`}>
                    {item.stage === 'done' ? '✓' : item.stage === 'in_progress' ? '🔨' : item.stage === 'approved' ? '✓' : '💡'}
                  </span>
                </div>

                {/* Timeline area */}
                <div className="relative flex-1" style={{ width: totalWidth, height: ROW_HEIGHT }}>
                  {bar && (
                    <div
                      onClick={(e) => handleBarClick(item, e)}
                      draggable={canDrag(item)}
                      onDragStart={(e) => handleDragStart(item, e)}
                      onDragEnd={handleDragEnd}
                      className={`absolute top-2 h-7 rounded-md border transition-opacity flex items-center px-2 overflow-hidden ${barCls} ${
                        canDrag(item) ? 'cursor-grab active:cursor-grabbing hover:opacity-80' : locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-80'
                      } ${dragging?.itemId === item.id ? 'opacity-30' : ''}`}
                      style={{ left: bar.x, width: bar.w }}
                      title={item.title}
                    >
                      <span className="text-xs font-medium truncate">{item.title}</span>
                      {locked && <span className="ml-1 text-xs">🔒</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unscheduled section */}
          {unscheduled.length > 0 && (
            <>
              <div className="flex items-center border-b border-gray-200 bg-gray-50" style={{ height: 32 }}>
                <div className="w-60 shrink-0 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Unscheduled</div>
              </div>
              {unscheduled.map(item => (
                <div key={item.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50" style={{ height: ROW_HEIGHT }}>
                  <div className="w-60 shrink-0 px-4 flex items-center gap-2 border-r border-gray-100">
                    <span className="text-gray-300 cursor-grab text-xs">⠿</span>
                    <span className="text-sm font-medium text-gray-700 truncate flex-1">{item.title}</span>
                  </div>
                  <div className="flex-1 flex items-center px-4" style={{ width: totalWidth }}>
                    <div className="border border-dashed border-gray-300 rounded-md h-7 w-32 flex items-center justify-center">
                      <span className="text-xs text-gray-400">No dates set</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 3-Action Menu */}
      {actionMenu && (
        <div className="fixed inset-0 z-40" onClick={closeMenu}>
          <div className="absolute bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-64" style={{ top: '35%', left: '50%', transform: 'translate(-50%, -50%)' }} onClick={e => e.stopPropagation()}>
            {!actionMenu.menuAction ? (
              <div className="p-1">
                <button onClick={() => setActionMenu(m => ({ ...m, menuAction: 'date' }))} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer w-full text-left text-gray-700">
                  📅 Change Start Date
                </button>
                <button onClick={() => setActionMenu(m => ({ ...m, menuAction: 'pause' }))} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer w-full text-left text-amber-600">
                  ⏸ Request a Pause
                </button>
                <button onClick={() => setActionMenu(m => ({ ...m, menuAction: 'obsolete' }))} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer w-full text-left text-red-500">
                  🚫 Mark as Obsolete
                </button>
              </div>
            ) : actionMenu.menuAction === 'date' ? (
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">New Start Date</div>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">End date will shift to keep the same duration</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={handleStartDateUpdate} disabled={!actionDate} className={`bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg flex-1 ${!actionDate ? 'opacity-50' : ''}`}>Update</button>
                  <button onClick={closeMenu} className="text-gray-500 text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : actionMenu.menuAction === 'pause' ? (
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Request a Pause</div>
                <textarea value={actionText} onChange={e => setActionText(e.target.value)} placeholder="Reason for pause..."
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handlePauseRequest} disabled={!actionText.trim()} className={`bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg flex-1 ${!actionText.trim() ? 'opacity-50' : ''}`}>Submit</button>
                  <button onClick={closeMenu} className="text-gray-500 text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Mark as Obsolete</div>
                <p className="text-xs text-gray-500 mb-2">This item will be removed from your active roadmap.</p>
                <input value={actionText} onChange={e => setActionText(e.target.value)} placeholder="Reason (optional)"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleObsolete} className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex-1">Confirm</button>
                  <button onClick={closeMenu} className="text-gray-500 text-xs px-3 py-1.5">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Request modal */}
      {changeRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { setChangeRequest(null); setCrText(''); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🔒 This Item is In Progress</h3>
            <p className="text-sm text-gray-500 mb-4">
              Changing the timeline or priority of an item already in progress requires a formal change request. Nouvia will review and update the backlog accordingly.
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">What would you like to change?</label>
              <textarea value={crText} onChange={e => setCrText(e.target.value)}
                placeholder="Describe the change you need..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setChangeRequest(null); setCrText(''); }} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={handleSubmitCR} disabled={!crText.trim()}
                className={`bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 ${!crText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Submit Change Request
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse ${toast.includes('Change request') ? 'bg-amber-500' : 'bg-green-500'}`}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ══════════ MAIN EXPORT ══════════ */
export default function BacklogBoard() {
  const [view, setView] = useState('board');
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState(null);
  const [changeRequestItem, setChangeRequestItem] = useState(null);
  const [changeRequestText, setChangeRequestText] = useState('');

  const loadBacklog = () => {
    setLoading(true);
    getBacklog('ivc').then(b => { setBacklog(b.sort((a, b) => (a.priority || 99) - (b.priority || 99))); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadBacklog(); }, []);

  const handleNoteSaved = (itemId, newNotes) => {
    setBacklog(prev => prev.map(i => i.id === itemId ? { ...i, notes: newNotes } : i));
    if (detailItem?.id === itemId) setDetailItem(prev => ({ ...prev, notes: newNotes }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Backlog & Roadmap</h2>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-64 shrink-0 animate-pulse bg-gray-200 rounded-xl h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-6 pt-6">
        <h2 className="text-xl font-semibold text-gray-900">Backlog & Roadmap</h2>
        <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
          {['board', 'roadmap'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'board' ? 'Board' : 'Roadmap'}
            </button>
          ))}
        </div>
      </div>

      {/* Managed Support Summary Card */}
      {(() => {
        const managed = backlog.filter(i => i.stage === 'managed');
        if (managed.length === 0) return null;
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 mx-6 flex items-center justify-between">
            <div>
              <span className="text-purple-700 font-semibold text-sm">⚙ Managed Support</span>
              <span className="text-sm text-purple-500 ml-2">{managed.length} capabilit{managed.length === 1 ? 'y' : 'ies'} under active management</span>
            </div>
            <div className="flex flex-wrap gap-1">{managed.map(m => <span key={m.id} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{m.title.length > 30 ? m.title.slice(0, 30) + '…' : m.title}</span>)}</div>
          </div>
        );
      })()}

      {/* Effort Summary Bar */}
      {(() => {
        const active = backlog.filter(i => ['idea', 'approved', 'in_progress'].includes(i.stage));
        if (active.length === 0) return null;
        const byEffort = {};
        let total = 0;
        active.forEach(i => {
          const e = i.estimatedEffort || 'M';
          byEffort[e] = (byEffort[e] || 0) + 1;
          total += EFFORT_UNITS[e] || 2;
        });
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 mx-6 flex items-center gap-6">
            <span className="text-sm font-semibold text-gray-700">Backlog Capacity</span>
            <div className="flex gap-2">{Object.entries(byEffort).map(([size, count]) => <span key={size} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{count} × {size}</span>)}</div>
            <span className="text-sm font-medium text-gray-700 ml-auto">{total} total units</span>
            {total > 16 && <span className="text-orange-500 text-xs">⚠ Large backlog — consider phasing</span>}
          </div>
        );
      })()}

      {backlog.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 w-full text-center space-y-2">
          <div className="text-3xl">📋</div>
          <p className="text-gray-900 font-medium">Backlog is empty</p>
          <p className="text-gray-400 text-sm">Your delivery pipeline is being built</p>
        </div>
      ) : view === 'board' ? (
        /* ── BOARD VIEW ── */
        <div className="overflow-x-auto px-6 pb-6">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const items = backlog.filter(i => i.stage === stage.key);
              return (
                <div key={stage.key} className="w-64 shrink-0">
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      {stage.key === 'managed' ? (
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-purple-600 font-semibold text-sm">{stage.label}</span></div>
                      ) : stage.key === 'in_progress' ? (
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-gray-700 font-semibold text-sm">{stage.label}</span></div>
                      ) : stage.key === 'idea' ? (
                        <span className="text-gray-400 font-semibold text-sm">{stage.label}</span>
                      ) : (
                        <span className="text-gray-700 font-semibold text-sm">{stage.label}</span>
                      )}
                      <span className="bg-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                    </div>
                    {stage.key === 'managed' && <div className="text-xs text-gray-400 mt-0.5">Live capabilities under Nouvia management</div>}
                  </div>

                  <div className={`${stage.key === 'managed' ? 'bg-purple-50/50' : 'bg-gray-100'} rounded-xl p-3 min-h-48 space-y-2`}>
                    {items.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">No items</div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} onClick={() => setDetailItem(item)}
                          className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow space-y-2 cursor-pointer">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200 capitalize">
                              {(item.linkedPillar || '').replace(/_/g, ' ')}
                            </span>
                            {item.estimatedEffort && (
                              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200">
                                {item.estimatedEffort}
                              </span>
                            )}
                          </div>
                          {(item.value || item.monthlyFee) && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.value > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  ${Math.round(item.value / 1000)}k
                                </span>
                              )}
                              {item.monthlyFee > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  ${Math.round(item.monthlyFee / 1000)}k/mo
                                </span>
                              )}
                            </div>
                          )}
                          {item.stage === 'managed' && (
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">⚙ Managed</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── ROADMAP TIMELINE — WS5 ── */
        <RoadmapTimeline items={backlog} onItemClick={setDetailItem}
          onUpdateItem={(id, updates) => setBacklog(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))}
          onReloadBacklog={loadBacklog} />
      )}

      {/* Detail panel */}
      {detailItem && (
        <DetailPanel item={detailItem} onClose={() => setDetailItem(null)} onNoteSaved={handleNoteSaved}
          onChangeRequest={(item) => { setChangeRequestItem(item); setChangeRequestText(''); }} />
      )}

      {/* Change Request modal — ROOT LEVEL, z-50 */}
      {changeRequestItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => { setChangeRequestItem(null); setChangeRequestText(''); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🔒 This Item is In Progress</h3>
            <p className="text-sm text-gray-500 mb-4">
              Changing the timeline or priority of an item already in progress requires a formal change request. Nouvia will review and update the backlog accordingly.
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">What would you like to change?</label>
              <textarea value={changeRequestText} onChange={e => setChangeRequestText(e.target.value)}
                placeholder="Describe the change you need..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setChangeRequestItem(null); setChangeRequestText(''); }} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={async () => {
                if (!changeRequestText.trim()) return;
                await addBacklogItem('ivc', {
                  title: `Change Request: ${changeRequestItem.title}`,
                  description: changeRequestText.trim(),
                  stage: 'idea', linkedPillar: changeRequestItem.linkedPillar,
                  estimatedEffort: 'S', isChangeRequest: true,
                  linkedOriginalId: changeRequestItem.id, priority: 99,
                });
                setChangeRequestItem(null); setChangeRequestText('');
                loadBacklog();
              }} disabled={!changeRequestText.trim()}
                className={`bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 ${!changeRequestText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Submit Change Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
