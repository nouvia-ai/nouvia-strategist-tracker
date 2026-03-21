/**
 * OKRModal — INT-001 TASK-14 (WS2)
 * Create / edit a full OKR document (year + quarter + objectives + key results).
 * Props: open, onClose, onSave, initial (existing OKR doc or null)
 */
import { useState, useEffect } from 'react';
import Modal from './Modal';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function emptyKR()  { return { id: uid(), title: '', progress: 0, unit: '%' }; }
function emptyObj() { return { id: uid(), title: '', key_results: [emptyKR()] }; }

function defaultForm() {
  const now = new Date();
  return {
    year:       now.getFullYear(),
    quarter:    Math.ceil((now.getMonth() + 1) / 3),
    objectives: [emptyObj()],
  };
}

/* ── shared style tokens ── */
const inp = {
  width:           '100%',
  boxSizing:       'border-box',
  backgroundColor: 'var(--color-bg-overlay)',
  border:          '1px solid var(--color-border-muted)',
  borderRadius:    'var(--radius-md)',
  padding:         'var(--space-2) var(--space-3)',
  fontSize:        'var(--font-size-sm)',
  color:           'var(--color-text-primary)',
  fontFamily:      'var(--font-sans)',
  outline:         'none',
};

const lbl = {
  display:      'block',
  fontSize:     'var(--font-size-xs)',
  fontWeight:   'var(--font-weight-medium)',
  color:        'var(--color-text-muted)',
  marginBottom: 'var(--space-1)',
  fontFamily:   'var(--font-sans)',
};

const iconBtn = {
  background:   'none',
  border:       'none',
  cursor:       'pointer',
  color:        'var(--color-text-subtle)',
  fontSize:     'var(--font-size-sm)',
  padding:      '2px 6px',
  borderRadius: 'var(--radius-sm)',
  lineHeight:   1,
  flexShrink:   0,
};

const addLink = {
  background:   'none',
  border:       'none',
  cursor:       'pointer',
  color:        'var(--color-accent)',
  fontSize:     'var(--font-size-xs)',
  fontFamily:   'var(--font-sans)',
  padding:      0,
  marginTop:    'var(--space-1)',
};

export default function OKRModal({ open, onClose, onSave, initial }) {
  const [f, setF] = useState(defaultForm());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setF({
        year:       initial.year,
        quarter:    initial.quarter,
        objectives: initial.objectives?.length
          ? initial.objectives.map(obj => ({
              ...obj,
              key_results: obj.key_results?.length ? obj.key_results : [emptyKR()],
            }))
          : [emptyObj()],
      });
    } else {
      setF(defaultForm());
    }
  }, [open, initial]);

  /* ── objectives helpers ── */
  function setObjTitle(objId, val) {
    setF(p => ({ ...p, objectives: p.objectives.map(o => o.id === objId ? { ...o, title: val } : o) }));
  }
  function addObj() {
    setF(p => ({ ...p, objectives: [...p.objectives, emptyObj()] }));
  }
  function removeObj(objId) {
    setF(p => ({ ...p, objectives: p.objectives.filter(o => o.id !== objId) }));
  }

  /* ── key result helpers ── */
  function setKR(objId, krId, key, val) {
    setF(p => ({
      ...p,
      objectives: p.objectives.map(o =>
        o.id !== objId ? o : {
          ...o,
          key_results: o.key_results.map(kr =>
            kr.id !== krId ? kr : { ...kr, [key]: val }
          ),
        }
      ),
    }));
  }
  function addKR(objId) {
    setF(p => ({
      ...p,
      objectives: p.objectives.map(o =>
        o.id !== objId ? o : { ...o, key_results: [...o.key_results, emptyKR()] }
      ),
    }));
  }
  function removeKR(objId, krId) {
    setF(p => ({
      ...p,
      objectives: p.objectives.map(o =>
        o.id !== objId ? o : { ...o, key_results: o.key_results.filter(kr => kr.id !== krId) }
      ),
    }));
  }

  const canSave = f.objectives.every(o => o.title.trim());

  function handleSave() {
    if (!canSave) return;
    onSave(Number(f.year), Number(f.quarter), f.objectives);
    onClose();
  }

  const btnBase = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      'var(--layout-tap-min)',
    padding:        '0 var(--space-4)',
    borderRadius:   'var(--radius-md)',
    fontSize:       'var(--font-size-sm)',
    fontWeight:     'var(--font-weight-medium)',
    fontFamily:     'var(--font-sans)',
    cursor:         'pointer',
    border:         'none',
    flex:           1,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit OKRs — ${initial.year} Q${initial.quarter}` : 'Set OKRs'}
      size="lg"
    >
      {/* Year + Quarter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <div>
          <label style={lbl}>Year</label>
          <input
            style={inp}
            type="number"
            value={f.year}
            onChange={e => setF(p => ({ ...p, year: e.target.value }))}
          />
        </div>
        <div>
          <label style={lbl}>Quarter</label>
          <select
            style={inp}
            value={f.quarter}
            onChange={e => setF(p => ({ ...p, quarter: Number(e.target.value) }))}
          >
            {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </div>
      </div>

      {/* Objectives */}
      {f.objectives.map((obj, oIdx) => (
        <div
          key={obj.id}
          style={{
            backgroundColor: 'var(--color-bg-sunken)',
            borderRadius:    'var(--radius-lg)',
            padding:         'var(--space-4)',
            marginBottom:    'var(--space-3)',
          }}
        >
          {/* Objective header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <span style={{ ...lbl, margin: 0, minWidth: 24, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
              O{oIdx + 1}
            </span>
            <input
              style={{ ...inp, flex: 1 }}
              placeholder="Objective title *"
              value={obj.title}
              onChange={e => setObjTitle(obj.id, e.target.value)}
              autoFocus={oIdx === f.objectives.length - 1 && !obj.title}
            />
            {f.objectives.length > 1 && (
              <button style={iconBtn} onClick={() => removeObj(obj.id)} title="Remove objective">✕</button>
            )}
          </div>

          {/* Key Results */}
          {obj.key_results.map((kr, kIdx) => (
            <div
              key={kr.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 72px 64px 28px', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}
            >
              <div>
                {kIdx === 0 && <label style={lbl}>Key Result</label>}
                <input
                  style={inp}
                  placeholder={`KR${kIdx + 1} title`}
                  value={kr.title}
                  onChange={e => setKR(obj.id, kr.id, 'title', e.target.value)}
                />
              </div>
              <div>
                {kIdx === 0 && <label style={lbl}>Progress</label>}
                <input
                  style={{ ...inp, fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                  type="number"
                  min={0} max={100}
                  placeholder="0"
                  value={kr.progress}
                  onChange={e => setKR(obj.id, kr.id, 'progress', Number(e.target.value))}
                />
              </div>
              <div>
                {kIdx === 0 && <label style={lbl}>Unit</label>}
                <input
                  style={{ ...inp, fontFamily: 'var(--font-mono)' }}
                  placeholder="%"
                  value={kr.unit}
                  onChange={e => setKR(obj.id, kr.id, 'unit', e.target.value)}
                />
              </div>
              <div style={{ paddingTop: kIdx === 0 ? 20 : 0 }}>
                {obj.key_results.length > 1 && (
                  <button style={iconBtn} onClick={() => removeKR(obj.id, kr.id)} title="Remove KR">✕</button>
                )}
              </div>
            </div>
          ))}

          <button style={addLink} onClick={() => addKR(obj.id)}>+ Add Key Result</button>
        </div>
      ))}

      <button style={{ ...addLink, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-5)' }} onClick={addObj}>
        + Add Objective
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border-default)', paddingTop: 'var(--space-4)' }}>
        <button
          style={{ ...btnBase, backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)', opacity: canSave ? 1 : 0.45 }}
          onClick={handleSave}
          disabled={!canSave}
        >
          {initial ? 'Save Changes' : 'Set OKRs'}
        </button>
        <button
          style={{ ...btnBase, backgroundColor: 'var(--color-bg-overlay)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
