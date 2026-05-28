import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNotes } from '../../context/NotesContext';

const NODE_W = 120;
const NODE_H = 38;
const H_GAP = 28;
const V_GAP = 64;

// ── Layout engine ────────────────────────────────────────────────────────────

function layoutTree(nodes, depth = 0, offsetX = 0) {
  if (!nodes || nodes.length === 0) return { items: [], width: 0 };
  const result = [];
  let totalWidth = 0;

  nodes.forEach(node => {
    const child = layoutTree(node.children, depth + 1, offsetX + totalWidth);
    const selfWidth = Math.max(NODE_W, child.width);
    const nodeX = offsetX + totalWidth + (selfWidth - NODE_W) / 2;
    result.push({ ...node, x: nodeX, y: depth * (NODE_H + V_GAP), childItems: child.items });
    totalWidth += selfWidth + H_GAP;
  });

  return { items: result, width: Math.max(totalWidth - H_GAP, NODE_W) };
}

function flatten(items) {
  const flat = [];
  const walk = (arr) => arr.forEach(n => { flat.push(n); walk(n.childItems || []); });
  walk(items);
  return flat;
}

function buildEdges(items) {
  const edges = [];
  const walk = (nodes) => {
    nodes.forEach(p => {
      (p.childItems || []).forEach(c => {
        const px = p.x + NODE_W / 2, py = p.y + NODE_H;
        const cx = c.x + NODE_W / 2, cy = c.y;
        const my = (py + cy) / 2;
        edges.push(
          <path key={`${p.id}-${c.id}`}
            d={`M${px},${py} C${px},${my} ${cx},${my} ${cx},${cy}`}
            className="diagram-edge" fill="none" />
        );
      });
      walk(p.childItems || []);
    });
  };
  walk(items);
  return edges;
}

// ── Node component ───────────────────────────────────────────────────────────

function DiagramNode({ node, activeId, onClick, isDragging }) {
  const isActive = activeId === node.id;
  const isLeaf = node.type === 'leaf';
  return (
    <g
      className="diagram-node-g"
      transform={`translate(${node.x},${node.y})`}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick(node.id); } }}
      style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
    >
      <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={isLeaf ? 5 : 9}
        className={`diagram-rect ${isActive ? 'diagram-rect--active' : ''} ${isLeaf ? 'diagram-rect--leaf' : ''}`} />
      <text x={NODE_W / 2} y={NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        className={`diagram-label ${isActive ? 'diagram-label--active' : ''}`}>
        {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
      </text>
      {isLeaf && (
        <circle cx={10} cy={NODE_H / 2} r={3}
          className={`diagram-leaf-dot ${isActive ? 'diagram-leaf-dot--active' : ''}`} />
      )}
    </g>
  );
}

// ── Main diagram ──────────────────────────────────────────────────────────────

export default function TreeDiagram({ onSelect }) {
  const { tree, activeNodeId } = useNotes();
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false); // distinguish click vs drag

  const { items, treeW, treeH } = useMemo(() => {
    const layout = layoutTree(tree);
    const flat = flatten(layout.items);
    const h = flat.length > 0 ? Math.max(...flat.map(n => n.y)) + NODE_H + 40 : 120;
    return { items: layout.items, treeW: layout.width + 40, treeH: h };
  }, [tree]);

  const flatNodes = useMemo(() => flatten(items), [items]);
  const edges = useMemo(() => buildEdges(items), [items]);

  // Auto-fit tree to container on first load / tree change
  useEffect(() => {
    if (!containerRef.current || treeW === 0) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    if (cw === 0) return;
    const scaleX = (cw - 80) / treeW;
    const scaleY = (ch - 80) / treeH;
    const scale = Math.min(scaleX, scaleY, 1);
    const x = (cw - treeW * scale) / 2;
    const y = 40;
    setTransform({ x, y, scale });
  }, [treeW, treeH]);

  // ── Mouse wheel zoom (zoom toward cursor) ──────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    setTransform(t => {
      const newScale = Math.min(Math.max(t.scale * factor, 0.1), 5);
      const ratio = newScale / t.scale;
      return {
        scale: newScale,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse drag pan ────────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragMoved.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, [isDragging]);

  const handleMouseUp = () => setIsDragging(false);

  // ── Touch support for mobile ──────────────────────────────────────────────
  const lastTouch = useRef(null);
  const lastDist = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragMoved.current = false;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (e.touches.length === 2 && lastDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / lastDist.current;
      lastDist.current = dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = midX - rect.left, my = midY - rect.top;
      setTransform(t => {
        const newScale = Math.min(Math.max(t.scale * factor, 0.1), 5);
        const ratio = newScale / t.scale;
        return { scale: newScale, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
      });
    }
  };

  // ── Reset / fit button ────────────────────────────────────────────────────
  const fitToScreen = () => {
    if (!containerRef.current || treeW === 0) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const scale = Math.min((cw - 80) / treeW, (ch - 80) / treeH, 1);
    setTransform({ x: (cw - treeW * scale) / 2, y: 40, scale });
  };

  if (tree.length === 0) {
    return (
      <div className="diagram-fullscreen diagram-empty-full">
        <div className="diagram-empty-icon">🌱</div>
        <p className="diagram-empty-title">No modules yet</p>
        <p className="diagram-empty-hint">Add a Module from the sidebar to see the tree here.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="diagram-fullscreen"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => { lastTouch.current = null; lastDist.current = null; }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Controls */}
      <div className="diagram-controls">
        <button className="diagram-ctrl-btn" onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 5) }))} title="Zoom in">+</button>
        <button className="diagram-ctrl-btn" onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.8, 0.1) }))} title="Zoom out">−</button>
        <button className="diagram-ctrl-btn" onClick={fitToScreen} title="Fit to screen">⊙</button>
        <span className="diagram-scale-label">{Math.round(transform.scale * 100)}%</span>
      </div>

      {/* Hint */}
      <div className="diagram-hint">Scroll to zoom · Drag to pan · Click node to open</div>

      {/* SVG canvas */}
      <svg
        width="100%" height="100%"
        className="diagram-svg-full"
        style={{ userSelect: 'none' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {edges}
          {flatNodes.map(node => (
            <DiagramNode
              key={node.id}
              node={node}
              activeId={activeNodeId}
              onClick={onSelect}
              isDragging={isDragging && dragMoved.current}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
