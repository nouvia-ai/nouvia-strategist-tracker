/**
 * NCCModal — INT-001 TASK-08 (NCC-006)
 * Add / edit form modal for IP Library NCC entries.
 * Props: open, onClose, onSave, initial (item to edit, or null for new)
 */

import { useState, useEffect } from 'react';
import Modal from './Modal';

const NCC_TYPES    = ["Component", "Pattern", "Hook", "System"];
const NCC_STATUSES = ["Candidate", "Proposed", "Active", "Deprecated"];
const NCC_REUSE    = ["High", "Medium", "Low"];

const EMPTY = {
  name:            "",
  ncc_id:          "",
  type:            "Component",
  status:          "Candidate",
  reuse_potential: "Medium",
  description:     "",
  source_project:  "",
  sow_reference:   "",
  file_path:       "",
  notes:           "",
};

const inp = {
  width:           "100%",
  boxSizing:       "border-box",
  backgroundColor: "var(--color-bg-overlay)",
  border:          "1px solid var(--color-border-muted)",
  borderRadius:    "var(--radius-md)",
  padding:         "var(--space-2) var(--space-3)",
  fontSize:        "var(--font-size-sm)",
  color:           "var(--color-text-primary)",
  fontFamily:      "var(--font-sans)",
  outline:         "none",
};

const label = {
  display:      "block",
  fontSize:     "var(--font-size-xs)",
  fontWeight:   "var(--font-weight-medium)",
  color:        "var(--color-text-muted)",
  marginBottom: "var(--space-1)",
  fontFamily:   "var(--font-sans)",
};

const fieldWrap = { marginBottom: "var(--space-3)" };

const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" };

export default function NCCModal({ open, onClose, onSave, initial }) {
  const [f, setF] = useState(EMPTY);
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setF(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const handleSave = () => {
    if (!f.name.trim()) return;
    onSave(f);
    onClose();
  };

  const btnBase = {
    display:      "inline-flex",
    alignItems:   "center",
    justifyContent: "center",
    minHeight:    "var(--layout-tap-min)",
    padding:      "0 var(--space-4)",
    borderRadius: "var(--radius-md)",
    fontSize:     "var(--font-size-sm)",
    fontWeight:   "var(--font-weight-medium)",
    fontFamily:   "var(--font-sans)",
    cursor:       "pointer",
    border:       "none",
    flex:         1,
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit NCC Entry" : "Add to IP Library"} size="lg">
      <div>
        {/* Name + NCC ID */}
        <div style={row}>
          <div>
            <label style={label}>Name *</label>
            <input style={inp} value={f.name} onChange={e => s("name", e.target.value)} placeholder="e.g. Nouvia Design Token System" />
          </div>
          <div>
            <label style={label}>NCC ID</label>
            <input style={{ ...inp, fontFamily: "var(--font-mono)" }} value={f.ncc_id} onChange={e => s("ncc_id", e.target.value)} placeholder="e.g. NCC-003" />
          </div>
        </div>

        {/* Type + Status + Reuse */}
        <div style={{ ...row, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div>
            <label style={label}>Type</label>
            <select style={inp} value={f.type} onChange={e => s("type", e.target.value)}>
              {NCC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Status</label>
            <select style={inp} value={f.status} onChange={e => s("status", e.target.value)}>
              {NCC_STATUSES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Reuse Potential</label>
            <select style={inp} value={f.reuse_potential} onChange={e => s("reuse_potential", e.target.value)}>
              {NCC_REUSE.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={fieldWrap}>
          <label style={label}>Description</label>
          <textarea style={{ ...inp, resize: "none" }} rows={3} value={f.description} onChange={e => s("description", e.target.value)} placeholder="What is this component / pattern and when is it used?" />
        </div>

        {/* Source project + SOW reference */}
        <div style={row}>
          <div>
            <label style={label}>Source Project</label>
            <input style={inp} value={f.source_project} onChange={e => s("source_project", e.target.value)} placeholder="e.g. INT-001 Tracker" />
          </div>
          <div>
            <label style={label}>SOW Reference</label>
            <input style={inp} value={f.sow_reference} onChange={e => s("sow_reference", e.target.value)} placeholder="e.g. SOW-IVC-001" />
          </div>
        </div>

        {/* File path */}
        <div style={fieldWrap}>
          <label style={label}>File Path</label>
          <input style={{ ...inp, fontFamily: "var(--font-mono)" }} value={f.file_path} onChange={e => s("file_path", e.target.value)} placeholder="e.g. src/styles/tokens.css" />
        </div>

        {/* Notes */}
        <div style={fieldWrap}>
          <label style={label}>Notes</label>
          <textarea style={{ ...inp, resize: "none" }} rows={2} value={f.notes} onChange={e => s("notes", e.target.value)} placeholder="Additional context, links, decisions..." />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          <button
            style={{ ...btnBase, backgroundColor: "var(--color-btn-primary-bg)", color: "var(--color-btn-primary-text)" }}
            onClick={handleSave}
          >
            {initial ? "Save Changes" : "Add to Library"}
          </button>
          <button
            style={{ ...btnBase, backgroundColor: "var(--color-bg-overlay)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-default)" }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
