import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { compress, decompress } from '../utils/compress';
import {
  getCachedTree,
  setCachedTree,
  getCachedNote,
  setCachedNote,
  queuePendingWrite,
  getPendingWrites,
  clearPendingWrite,
} from '../utils/cache';
import {
  loadTree,
  addNode,
  renameNode,
  deleteNode,
  buildTree,
  getBreadcrumb,
} from '../utils/treeHelpers';
import { useAuth } from './AuthContext';

const NotesContext = createContext(null);

const initialState = {
  nodes: {},      // flat map: { [id]: NodeObject }
  tree: [],       // nested tree for rendering
  activeNodeId: null,
  activeContent: '',
  loadingTree: true,
  loadingNote: false,
  saving: false,
  viewMode: 'sidebar', // 'sidebar' | 'diagram'
  isOnline: navigator.onLine,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NODES':
      return { ...state, nodes: action.nodes, tree: buildTree(action.nodes), loadingTree: false };
    case 'SET_ACTIVE_NODE':
      return { ...state, activeNodeId: action.nodeId, activeContent: action.content ?? '', loadingNote: false };
    case 'SET_CONTENT':
      return { ...state, activeContent: action.content };
    case 'SET_LOADING_TREE':
      return { ...state, loadingTree: action.value };
    case 'SET_LOADING_NOTE':
      return { ...state, loadingNote: action.value };
    case 'SET_SAVING':
      return { ...state, saving: action.value };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.value };
    case 'NODE_ADDED': {
      const nodes = { ...state.nodes, [action.node.id]: action.node };
      return { ...state, nodes, tree: buildTree(nodes) };
    }
    case 'NODE_RENAMED': {
      const nodes = { ...state.nodes, [action.nodeId]: { ...state.nodes[action.nodeId], label: action.label } };
      return { ...state, nodes, tree: buildTree(nodes) };
    }
    case 'NODES_DELETED': {
      const nodes = { ...state.nodes };
      action.ids.forEach(id => delete nodes[id]);
      const activeNodeId = action.ids.includes(state.activeNodeId) ? null : state.activeNodeId;
      return { ...state, nodes, tree: buildTree(nodes), activeNodeId };
    }
    default:
      return state;
  }
}

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimerRef = useRef(null);
  const activeNodeRef = useRef(null);
  const contentRef = useRef('');

  activeNodeRef.current = state.activeNodeId;
  contentRef.current = state.activeContent;

  // ─── Online/Offline Detection ─────────────────────────────────────────────────
  useEffect(() => {
    const setOnline = () => dispatch({ type: 'SET_ONLINE', value: true });
    const setOffline = () => dispatch({ type: 'SET_ONLINE', value: false });
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => { window.removeEventListener('online', setOnline); window.removeEventListener('offline', setOffline); };
  }, []);

  // ─── Flush pending writes when back online ─────────────────────────────────────
  useEffect(() => {
    if (!state.isOnline || !user) return;
    flushPendingWrites(user.uid);
  }, [state.isOnline, user]);

  async function flushPendingWrites(uid) {
    const pending = await getPendingWrites();
    for (const [, write] of Object.entries(pending)) {
      if (write.uid !== uid) continue;
      try {
        await writeNoteToFirestore(uid, write.nodeId, write.content);
        await clearPendingWrite(uid, write.nodeId);
      } catch { /* retry next time */ }
    }
  }

  // ─── Load Tree ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_NODES', nodes: {} });
      return;
    }
    dispatch({ type: 'SET_LOADING_TREE', value: true });
    loadTree(user.uid).then(nodes => {
      dispatch({ type: 'SET_NODES', nodes });
    }).catch(() => {
      dispatch({ type: 'SET_LOADING_TREE', value: false });
    });
  }, [user]);

  // ─── Select Node ─────────────────────────────────────────────────────────────
  const selectNode = useCallback(async (nodeId) => {
    if (!user || !nodeId) return;
    const node = state.nodes[nodeId];
    if (!node) return;

    dispatch({ type: 'SET_LOADING_NOTE', value: true });

    // Cache-first
    const cached = await getCachedNote(user.uid, nodeId);
    if (cached) {
      dispatch({ type: 'SET_ACTIVE_NODE', nodeId, content: cached.content });
      return;
    }

    // Firestore
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'notes', nodeId));
      const raw = snap.exists() ? snap.data().content : '';
      const content = decompress(raw);
      await setCachedNote(user.uid, nodeId, content);
      dispatch({ type: 'SET_ACTIVE_NODE', nodeId, content });
    } catch {
      dispatch({ type: 'SET_ACTIVE_NODE', nodeId, content: '' });
    }
  }, [user, state.nodes]);

  // ─── Edit Content (debounced auto-save) ──────────────────────────────────────
  const editContent = useCallback((content) => {
    dispatch({ type: 'SET_CONTENT', content });

    // Debounce save — 800ms after last keystroke
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const nodeId = activeNodeRef.current;
      if (!nodeId || !user) return;
      saveNote(user.uid, nodeId, content);
    }, 800);
  }, [user]);

  async function saveNote(uid, nodeId, content) {
    dispatch({ type: 'SET_SAVING', value: true });
    try {
      // Write to IndexedDB immediately
      await setCachedNote(uid, nodeId, content);

      if (navigator.onLine) {
        await writeNoteToFirestore(uid, nodeId, content);
      } else {
        await queuePendingWrite(uid, nodeId, content);
      }
    } finally {
      dispatch({ type: 'SET_SAVING', value: false });
    }
  }

  async function writeNoteToFirestore(uid, nodeId, content) {
    const compressed = compress(content);
    await setDoc(
      doc(db, 'users', uid, 'notes', nodeId),
      { content: compressed, updatedAt: Date.now() },
      { merge: true }
    );
  }

  // ─── Tree Mutations ──────────────────────────────────────────────────────────
  const addTreeNode = useCallback(async ({ label, parentId }) => {
    if (!user) return;
    const node = await addNode(user.uid, { label, parentId });
    dispatch({ type: 'NODE_ADDED', node });
    return node;
  }, [user]);

  const renameTreeNode = useCallback(async (nodeId, label) => {
    if (!user) return;
    await renameNode(user.uid, nodeId, label);
    dispatch({ type: 'NODE_RENAMED', nodeId, label });
  }, [user]);

  const deleteTreeNode = useCallback(async (nodeId) => {
    if (!user) return;
    const ids = await deleteNode(user.uid, nodeId, state.nodes);
    dispatch({ type: 'NODES_DELETED', ids });
  }, [user, state.nodes]);

  const setViewMode = (mode) => dispatch({ type: 'SET_VIEW_MODE', mode });

  const getBreadcrumbFor = useCallback((nodeId) =>
    getBreadcrumb(nodeId, state.nodes), [state.nodes]);

  // ─── Export: fetch all note contents ─────────────────────────────────────
  const exportAllNotes = useCallback(async () => {
    if (!user) return {};
    const result = {};
    for (const [nodeId, node] of Object.entries(state.nodes)) {
      try {
        const cached = await getCachedNote(user.uid, nodeId);
        if (cached) {
          result[nodeId] = { node, content: cached.content };
          continue;
        }
        const snap = await getDoc(doc(db, 'users', user.uid, 'notes', nodeId));
        const raw = snap.exists() ? snap.data().content : '';
        result[nodeId] = { node, content: decompress(raw) };
      } catch {
        result[nodeId] = { node, content: '' };
      }
    }
    return result;
  }, [user, state.nodes]);

  return (
    <NotesContext.Provider value={{
      ...state,
      selectNode,
      editContent,
      addTreeNode,
      renameTreeNode,
      deleteTreeNode,
      setViewMode,
      getBreadcrumbFor,
      exportAllNotes,
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);
