// treeHelpers.js — Tree CRUD operations + Firestore sync

import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  deleteDoc,
} from 'firebase/firestore';
import { getCachedTree, setCachedTree } from './cache';

// ─── Firestore paths ────────────────────────────────────────────────────────────

const treeDocRef = (uid) => doc(db, 'users', uid, 'data', 'tree');
const noteDocRef = (uid, nodeId) => doc(db, 'users', uid, 'notes', nodeId);

// ─── ID generator ───────────────────────────────────────────────────────────────

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Tree Loading ────────────────────────────────────────────────────────────────

export async function loadTree(uid) {
  const cached = await getCachedTree(uid);
  if (cached?.data) {
    syncTreeFromFirestore(uid).catch(() => {});
    return cached.data;
  }
  return syncTreeFromFirestore(uid);
}

async function syncTreeFromFirestore(uid) {
  try {
    const snap = await getDoc(treeDocRef(uid));
    const nodes = snap.exists() ? (snap.data().nodes || {}) : {};
    await setCachedTree(uid, nodes);
    return nodes;
  } catch (err) {
    console.error('Failed to load tree from Firestore:', err);
    return {};
  }
}

// ─── Tree Mutations ──────────────────────────────────────────────────────────────

/**
 * Add a new node. Every node is a topic that can hold children AND text content.
 */
export async function addNode(uid, { label, parentId = null }) {
  const id = genId();
  const node = {
    id,
    label: label.trim(),
    parentId,
    order: Date.now(),
    createdAt: Date.now(),
  };

  const ref = treeDocRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { [`nodes.${id}`]: node });
  } else {
    await setDoc(ref, { nodes: { [id]: node } });
  }

  const cached = await getCachedTree(uid);
  const nodes = cached?.data || {};
  nodes[id] = node;
  await setCachedTree(uid, nodes);

  return node;
}

/**
 * Rename a node.
 */
export async function renameNode(uid, nodeId, newLabel) {
  await updateDoc(treeDocRef(uid), {
    [`nodes.${nodeId}.label`]: newLabel.trim(),
  });

  const cached = await getCachedTree(uid);
  if (cached?.data?.[nodeId]) {
    cached.data[nodeId].label = newLabel.trim();
    await setCachedTree(uid, cached.data);
  }
}

/**
 * Delete a node and all its descendants, plus their text content.
 */
export async function deleteNode(uid, nodeId, allNodes) {
  const toDelete = getDescendants(nodeId, allNodes);
  toDelete.push(nodeId);

  // Remove nodes from tree doc
  const updates = {};
  toDelete.forEach(id => { updates[`nodes.${id}`] = deleteField(); });
  await updateDoc(treeDocRef(uid), updates);

  // Delete text content for every deleted node (all nodes can have content)
  await Promise.allSettled(
    toDelete.map(id => deleteDoc(noteDocRef(uid, id)))
  );

  // Update cache
  const cached = await getCachedTree(uid);
  if (cached?.data) {
    toDelete.forEach(id => delete cached.data[id]);
    await setCachedTree(uid, cached.data);
  }

  return toDelete;
}

/**
 * Get all descendant IDs of a node.
 */
export function getDescendants(nodeId, allNodes) {
  const result = [];
  const children = Object.values(allNodes).filter(n => n.parentId === nodeId);
  for (const child of children) {
    result.push(child.id);
    result.push(...getDescendants(child.id, allNodes));
  }
  return result;
}

// ─── Tree Structure Helpers ──────────────────────────────────────────────────────

/**
 * Build a nested tree from a flat node map.
 */
export function buildTree(nodes) {
  const map = {};
  const roots = [];

  Object.values(nodes).forEach(node => {
    map[node.id] = { ...node, children: [] };
  });

  Object.values(map).forEach(node => {
    if (node.parentId && map[node.parentId]) {
      map[node.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (node) => {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(sortChildren);
  };
  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortChildren);

  return roots;
}

/**
 * Get breadcrumb path for a node.
 */
export function getBreadcrumb(nodeId, allNodes) {
  const path = [];
  let current = allNodes[nodeId];
  while (current) {
    path.unshift(current.label);
    current = current.parentId ? allNodes[current.parentId] : null;
  }
  return path;
}
