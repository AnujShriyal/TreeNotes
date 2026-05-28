import React, { useState, useRef, useEffect } from 'react';
import { useNotes } from '../../context/NotesContext';
import AddNodeModal from './AddNodeModal';

export default function TreeNode({ node, depth, activeId, onSelect, onAddChild }) {
  const { renameTreeNode, deleteTreeNode, addTreeNode } = useNotes();
  const [expanded, setExpanded] = useState(depth < 1);
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.label);
  const [addModal, setAddModal] = useState(false);
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeId === node.id;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  // Arrow/chevron click — expand or collapse only
  const handleChevronClick = (e) => {
    e.stopPropagation();
    setExpanded(v => !v);
  };

  // Clicking the node label opens the editor
  const handleNodeClick = () => {
    onSelect(node.id);
  };

  const handleRenameSubmit = async (e) => {
    e?.preventDefault();
    if (renameVal.trim() && renameVal.trim() !== node.label) {
      await renameTreeNode(node.id, renameVal.trim());
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    const msg = hasChildren
      ? `Delete "${node.label}" and all its subtopics?`
      : `Delete "${node.label}"?`;
    if (window.confirm(msg)) {
      await deleteTreeNode(node.id);
    }
    setShowMenu(false);
  };

  // Long-press for mobile context menu
  const longPressTimer = useRef(null);
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  return (
    <div className="tree-node-wrapper">
      {/* Vertical connecting line from parent */}
      {depth > 0 && (
        <div className="tree-connector" style={{ left: `${(depth - 1) * 18 + 9}px` }} />
      )}

      <div
        className={`tree-node ${isActive ? 'tree-node--active' : ''}`}
        style={{ paddingLeft: `${depth * 18 + 4}px` }}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Arrow — only expand/collapse trigger */}
        <button
          className={`tree-arrow-btn ${hasChildren ? '' : 'tree-arrow-btn--hidden'}`}
          onClick={handleChevronClick}
          tabIndex={-1}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`tree-chevron ${expanded && hasChildren ? 'tree-chevron--open' : ''}`}>
            ›
          </span>
        </button>

        {/* Label — clicking this opens the editor */}
        {renaming ? (
          <form onSubmit={handleRenameSubmit} style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
            <input
              ref={renameRef}
              className="tree-rename-input"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => e.key === 'Escape' && setRenaming(false)}
            />
          </form>
        ) : (
          <button
            className="tree-label-btn"
            onClick={handleNodeClick}
          >
            {node.label}
          </button>
        )}

        {/* ⋯ menu trigger */}
        <button
          className="tree-menu-btn"
          onClick={e => { e.stopPropagation(); setShowMenu(s => !s); }}
          tabIndex={-1}
          id={`menu-${node.id}`}
        >
          ⋯
        </button>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="tree-context-menu"
          style={{ left: `${depth * 18 + 4}px` }}
        >
          <button className="ctx-item" onClick={() => { setAddModal(true); setShowMenu(false); }}>
            ＋ Add Subtopic
          </button>
          <div className="ctx-divider" />
          <button className="ctx-item" onClick={() => { setRenaming(true); setShowMenu(false); }}>
            ✏️ Rename
          </button>
          <button className="ctx-item ctx-item--danger" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Children — shown when expanded */}
      {hasChildren && expanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}

      {/* Add subtopic modal */}
      {addModal && (
        <AddNodeModal
          parentId={node.id}
          parentLabel={node.label}
          onAdd={async ({ label }) => {
            await addTreeNode({ label, parentId: node.id });
            setExpanded(true);
            setAddModal(false);
          }}
          onClose={() => setAddModal(false)}
        />
      )}
    </div>
  );
}
