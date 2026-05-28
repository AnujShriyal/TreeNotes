import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import TreeNode from './TreeNode';
import AddNodeModal from './AddNodeModal';

export default function Sidebar({ mobileOpen, onClose, onShowDiagram }) {
  const { tree, activeNodeId, selectNode, addTreeNode, viewMode } = useNotes();
  const [modal, setModal] = useState(null);

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="8" r="5" fill="var(--accent)" />
              <line x1="18" y1="13" x2="18" y2="20" stroke="var(--accent)" strokeWidth="2.5" />
              <circle cx="10" cy="26" r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="26" cy="26" r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2" />
              <line x1="18" y1="20" x2="10" y2="22" stroke="var(--accent)" strokeWidth="2" />
              <line x1="18" y1="20" x2="26" y2="22" stroke="var(--accent)" strokeWidth="2" />
            </svg>
            <span className="sidebar-title">TreeNotes</span>
          </div>

          {/* Diagram view button */}
          <button
            id="btn-view-diagram"
            className={`sidebar-diagram-btn ${viewMode === 'diagram' ? 'active' : ''}`}
            onClick={onShowDiagram}
            title="Open tree diagram"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="2" />
              <line x1="8" y1="5" x2="8" y2="8" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <line x1="8" y1="8" x2="4" y2="10" stroke="currentColor" strokeWidth="1.3" />
              <line x1="8" y1="8" x2="12" y2="10" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Diagram
          </button>

          <button className="sidebar-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Add root module */}
        <button
          id="btn-add-module"
          className="sidebar-add-root"
          onClick={() => setModal({ parentId: null, parentLabel: 'Root' })}
        >
          <span className="sidebar-add-icon">+</span>
          Add Module
        </button>

        {/* Tree list */}
        <div className="sidebar-content">
          {tree.length === 0 ? (
            <div className="tree-empty">
              <p>No modules yet.</p>
              <p>Click "+ Add Module" to start.</p>
            </div>
          ) : (
            <div className="tree-list">
              {tree.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  activeId={activeNodeId}
                  onSelect={(id) => { selectNode(id); onClose(); }}
                  onAddChild={(parentId, parentLabel) => setModal({ parentId, parentLabel })}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {modal && (
        <AddNodeModal
          parentId={modal.parentId}
          parentLabel={modal.parentLabel}
          onAdd={async ({ label }) => {
            await addTreeNode({ label, parentId: modal.parentId });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
