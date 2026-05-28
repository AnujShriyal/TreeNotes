// cache.js — IndexedDB helpers using idb-keyval (Layer 2 cache)
// Caches tree skeleton + recently viewed note content for instant offline loads

import { get, set, del, keys, createStore } from 'idb-keyval';

const treeStore = createStore('treenotes-tree', 'tree');
const noteStore = createStore('treenotes-notes', 'notes');
const metaStore = createStore('treenotes-meta', 'meta');

// ─── Tree Cache ────────────────────────────────────────────────────────────────

export async function getCachedTree(uid) {
  try {
    return await get(uid, treeStore);
  } catch {
    return null;
  }
}

export async function setCachedTree(uid, treeData) {
  try {
    await set(uid, { data: treeData, cachedAt: Date.now() }, treeStore);
  } catch { /* silent */ }
}

export async function invalidateTreeCache(uid) {
  try {
    await del(uid, treeStore);
  } catch { /* silent */ }
}

// ─── Note Content Cache ────────────────────────────────────────────────────────

const MAX_CACHED_NOTES = 30; // keep last 30 viewed notes in IndexedDB

export async function getCachedNote(uid, nodeId) {
  try {
    return await get(`${uid}:${nodeId}`, noteStore);
  } catch {
    return null;
  }
}

export async function setCachedNote(uid, nodeId, content) {
  try {
    await set(`${uid}:${nodeId}`, { content, cachedAt: Date.now() }, noteStore);
    await pruneNoteCache(uid);
  } catch { /* silent */ }
}

export async function invalidateNoteCache(uid, nodeId) {
  try {
    await del(`${uid}:${nodeId}`, noteStore);
  } catch { /* silent */ }
}

// Prune oldest cached notes if over limit
async function pruneNoteCache(uid) {
  try {
    const allKeys = await keys(noteStore);
    const userKeys = allKeys.filter(k => String(k).startsWith(`${uid}:`));
    if (userKeys.length <= MAX_CACHED_NOTES) return;
    // Get all entries and sort by cachedAt
    const entries = await Promise.all(
      userKeys.map(async k => ({ key: k, entry: await get(k, noteStore) }))
    );
    entries.sort((a, b) => (a.entry?.cachedAt || 0) - (b.entry?.cachedAt || 0));
    const toDelete = entries.slice(0, entries.length - MAX_CACHED_NOTES);
    await Promise.all(toDelete.map(e => del(e.key, noteStore)));
  } catch { /* silent */ }
}

// ─── Pending Writes Queue ──────────────────────────────────────────────────────
// Stores offline edits to sync when back online

export async function queuePendingWrite(uid, nodeId, content) {
  try {
    const existing = (await get('pending', metaStore)) || {};
    existing[`${uid}:${nodeId}`] = { uid, nodeId, content, queuedAt: Date.now() };
    await set('pending', existing, metaStore);
  } catch { /* silent */ }
}

export async function getPendingWrites() {
  try {
    return (await get('pending', metaStore)) || {};
  } catch {
    return {};
  }
}

export async function clearPendingWrite(uid, nodeId) {
  try {
    const existing = (await get('pending', metaStore)) || {};
    delete existing[`${uid}:${nodeId}`];
    await set('pending', existing, metaStore);
  } catch { /* silent */ }
}
