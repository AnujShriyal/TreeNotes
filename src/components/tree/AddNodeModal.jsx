import React, { useState } from 'react';

export default function AddNodeModal({ parentId, parentLabel, onAdd, onClose }) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    try {
      await onAdd({ label: label.trim() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {parentLabel
            ? <>New subtopic in <span className="modal-parent">{parentLabel}</span></>
            : <>New top-level module</>
          }
        </h3>

        <form onSubmit={handleSubmit}>
          <input
            id="modal-label-input"
            className="modal-input"
            placeholder="Topic name…"
            value={label}
            onChange={e => setLabel(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button
              id="modal-confirm-btn"
              type="submit"
              className="modal-confirm"
              disabled={loading || !label.trim()}
            >
              {loading ? <span className="spinner spinner--sm" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
