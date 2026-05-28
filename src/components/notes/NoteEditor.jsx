import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNotes } from '../../context/NotesContext';
import {
  downloadText,
  htmlToPlainText,
  isHTML,
  openLocalFile,
  writeLocalFile,
  saveFileAs,
  exportAsZip,
  safeName,
} from '../../utils/fileOps';

// ─── Font / Size / Block options ─────────────────────────────────────────────

const EDITOR_FONTS = [
  { label: 'JetBrains Mono', name: 'JetBrains Mono' },
  { label: 'Fira Code',       name: 'Fira Code' },
  { label: 'Source Code Pro', name: 'Source Code Pro' },
  { label: 'Roboto Mono',     name: 'Roboto Mono' },
  { label: 'IBM Plex Mono',   name: 'IBM Plex Mono' },
  { label: 'Inter',           name: 'Inter' },
  { label: 'Merriweather',    name: 'Merriweather' },
  { label: 'Georgia',         name: 'Georgia' },
];

const EDITOR_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32];

const BLOCK_FORMATS = [
  { label: 'Paragraph',  value: 'p' },
  { label: 'Heading 1',  value: 'h1' },
  { label: 'Heading 2',  value: 'h2' },
  { label: 'Heading 3',  value: 'h3' },
  { label: 'Heading 4',  value: 'h4' },
  { label: 'Quote',      value: 'blockquote' },
  { label: 'Code block', value: 'pre' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contentToHTML(raw) {
  if (!raw) return '<p><br></p>';
  if (isHTML(raw)) return raw;
  // Convert legacy plain text to HTML paragraphs
  return raw.split('\n').map(l => `<p>${l || '<br>'}</p>`).join('');
}

function getTextStats(el) {
  if (!el) return { words: 0, chars: 0 };
  const text = el.innerText || '';
  return {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chars: text.replace(/\n/g, '').length,
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, showToast };
}

// ─── Formatting toolbar ───────────────────────────────────────────────────────

function FmtBtn({ active, onMouseDown, title, children }) {
  return (
    <button
      className={`fmt-btn${active ? ' fmt-btn--active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onMouseDown(); }}
      title={title}
    >
      {children}
    </button>
  );
}

function FormattingToolbar({ editorRef, fmts, onFmtChange, font, size, onFontChange, onSizeChange }) {
  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    onFmtChange();
  };

  const applyFontSize = (px) => {
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = px + 'px';
      span.innerHTML = el.innerHTML;
      el.parentNode.replaceChild(span, el);
    });
    editorRef.current?.focus();
    onFmtChange();
  };

  const blockVal = (fmts.block || 'p').replace(/^<|>$/g, '');

  return (
    <div className="fmt-toolbar">
      {/* Block / heading selector */}
      <select
        className="fmt-select fmt-select--block"
        value={BLOCK_FORMATS.find(b => b.value === blockVal) ? blockVal : 'p'}
        onChange={e => exec('formatBlock', e.target.value)}
        title="Paragraph style"
      >
        {BLOCK_FORMATS.map(b => (
          <option key={b.value} value={b.value}>{b.label}</option>
        ))}
      </select>

      <div className="fmt-sep" />

      {/* Font family */}
      <select
        className="fmt-select fmt-select--font"
        value={font}
        onChange={e => {
          onFontChange(e.target.value);
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) exec('fontName', e.target.value);
          else editorRef.current?.focus();
        }}
        title="Font family"
      >
        {EDITOR_FONTS.map(f => (
          <option key={f.name} value={f.name}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="fmt-select fmt-select--size"
        value={size}
        onChange={e => {
          onSizeChange(Number(e.target.value));
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) applyFontSize(e.target.value);
          else editorRef.current?.focus();
        }}
        title="Font size"
      >
        {EDITOR_SIZES.map(s => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <div className="fmt-sep" />

      {/* Bold / Italic / Underline / Strikethrough */}
      <FmtBtn active={fmts.bold}          onMouseDown={() => exec('bold')}          title="Bold (Ctrl+B)"><b>B</b></FmtBtn>
      <FmtBtn active={fmts.italic}        onMouseDown={() => exec('italic')}        title="Italic (Ctrl+I)"><i>I</i></FmtBtn>
      <FmtBtn active={fmts.underline}     onMouseDown={() => exec('underline')}     title="Underline (Ctrl+U)"><u>U</u></FmtBtn>
      <FmtBtn active={fmts.strike}        onMouseDown={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></FmtBtn>

      <div className="fmt-sep" />

      {/* Alignment */}
      <FmtBtn active={fmts.alignLeft}   onMouseDown={() => exec('justifyLeft')}   title="Align left">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>
      <FmtBtn active={fmts.alignCenter} onMouseDown={() => exec('justifyCenter')} title="Center">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>
      <FmtBtn active={fmts.alignRight}  onMouseDown={() => exec('justifyRight')}  title="Align right">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>

      <div className="fmt-sep" />

      {/* Lists */}
      <FmtBtn active={fmts.ul} onMouseDown={() => exec('insertUnorderedList')} title="Bullet list">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/><line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>
      <FmtBtn active={fmts.ol} onMouseDown={() => exec('insertOrderedList')} title="Numbered list">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><text x="3" y="8" fontSize="7" fill="currentColor">1.</text><text x="3" y="14" fontSize="7" fill="currentColor">2.</text><text x="3" y="20" fontSize="7" fill="currentColor">3.</text></svg>
      </FmtBtn>

      <div className="fmt-sep" />

      {/* Indent / Outdent */}
      <FmtBtn active={false} onMouseDown={() => exec('outdent')} title="Decrease indent">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><polyline points="11 17 6 12 11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>
      <FmtBtn active={false} onMouseDown={() => exec('indent')} title="Increase indent">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><polyline points="6 17 11 12 6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>

      <div className="fmt-sep" />

      {/* Clear formatting */}
      <FmtBtn active={false} onMouseDown={() => exec('removeFormat')} title="Clear formatting">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="4" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="7" x2="12" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="15" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="21" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </FmtBtn>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NoteEditor({ onShowDiagram }) {
  const {
    activeNodeId,
    activeContent,
    nodes,
    loadingNote,
    saving,
    editContent,
    getBreadcrumbFor,
    isOnline,
    exportAllNotes,
  } = useNotes();

  const node      = activeNodeId ? nodes[activeNodeId] : null;
  const breadcrumb = activeNodeId ? getBreadcrumbFor(activeNodeId) : [];

  // ── Persistent prefs ──────────────────────────────────────────────────────
  const [font, setFont] = useState(
    () => localStorage.getItem('tn_font') || 'JetBrains Mono'
  );
  const [size, setSize] = useState(
    () => Number(localStorage.getItem('tn_size') || 14)
  );

  const handleFontChange = (val) => {
    setFont(val);
    localStorage.setItem('tn_font', val);
  };
  const handleSizeChange = (val) => {
    setSize(val);
    localStorage.setItem('tn_size', String(val));
  };

  // ── Editor refs & state ───────────────────────────────────────────────────
  const editorRef  = useRef(null);
  const prevSaving = useRef(false);

  const [fmts, setFmts] = useState({});
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Local-file link
  const [fileHandle, setFileHandle] = useState(null);
  const [linkedName, setLinkedName] = useState(null);
  const [fileStatus, setFileStatus] = useState('');
  const [exporting,  setExporting]  = useState(false);

  const { toast, showToast } = useToast();

  // ── Load content when note changes ────────────────────────────────────────
  const activeContentRef = useRef(activeContent);
  useEffect(() => { activeContentRef.current = activeContent; }, [activeContent]);

  useEffect(() => {
    if (!editorRef.current) return;
    setFileHandle(null); setLinkedName(null); setFileStatus('');
    if (loadingNote) {
      editorRef.current.innerHTML = '';
      return;
    }
    editorRef.current.innerHTML = contentToHTML(activeContentRef.current);
    setStats(getTextStats(editorRef.current));
    setTimeout(() => editorRef.current?.focus(), 60);
  }, [activeNodeId, loadingNote]);

  // ── Set default paragraph separator once ─────────────────────────────────
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }, []);

  // ── Auto-sync to local file after Firestore save ──────────────────────────
  useEffect(() => {
    if (prevSaving.current && !saving && fileHandle) {
      const html = editorRef.current?.innerHTML || '';
      const txt  = htmlToPlainText(html);
      writeLocalFile(fileHandle, txt)
        .then(ok => setFileStatus(ok ? 'synced' : 'error'))
        .catch(() => setFileStatus('error'));
    }
    prevSaving.current = saving;
  }, [saving]);

  // ── Format state — update on selection change ─────────────────────────────
  const updateFmts = useCallback(() => {
    try {
      setFmts({
        bold:        document.queryCommandState('bold'),
        italic:      document.queryCommandState('italic'),
        underline:   document.queryCommandState('underline'),
        strike:      document.queryCommandState('strikeThrough'),
        ul:          document.queryCommandState('insertUnorderedList'),
        ol:          document.queryCommandState('insertOrderedList'),
        alignLeft:   document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight:  document.queryCommandState('justifyRight'),
        block:       document.queryCommandValue('formatBlock'),
      });
    } catch { /* ignore errors when no selection */ }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateFmts);
    return () => document.removeEventListener('selectionchange', updateFmts);
  }, [updateFmts]);

  // ── Content change ────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    editContent(html);
    setStats(getTextStats(editorRef.current));
  }, [editContent]);

  const handleKeyDown = (e) => {
    // Tab for indenting
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    }
  };

  // ── File operations ───────────────────────────────────────────────────────

  const getPlainContent = () => {
    const html = editorRef.current?.innerHTML || '';
    return htmlToPlainText(html);
  };

  const handleDownload = () => {
    downloadText(getPlainContent(), `${safeName(node?.label || 'note')}.txt`);
    showToast('Downloaded ✓');
  };

  const handleOpenLocal = async () => {
    const result = await openLocalFile();
    if (!result) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = contentToHTML(result.content);
      editContent(editorRef.current.innerHTML);
      setStats(getTextStats(editorRef.current));
    }
    setLinkedName(result.name);
    setFileHandle(result.handle || null);
    setFileStatus(result.handle ? 'synced' : '');
    showToast(`Opened ${result.name}${result.handle ? ' — auto-sync on' : ''}`);
  };

  const handleSaveToLocal = async () => {
    const txt = getPlainContent();
    if (fileHandle) {
      const ok = await writeLocalFile(fileHandle, txt);
      setFileStatus(ok ? 'synced' : 'error');
      showToast(ok ? `Saved to ${linkedName} ✓` : 'Write failed', ok ? 'success' : 'error');
    } else {
      const handle = await saveFileAs(txt, `${safeName(node?.label || 'note')}.txt`);
      if (handle) {
        setFileHandle(handle);
        setLinkedName(`${safeName(node?.label || 'note')}.txt`);
        setFileStatus('synced');
        showToast('Saved & linked ✓');
      }
    }
  };

  const handleUnlink = () => {
    setFileHandle(null); setLinkedName(null); setFileStatus('');
    showToast('Local file unlinked');
  };

  const hasChildren = node && Object.values(nodes).some(n => n.parentId === node.id);

  const handleExportSubtree = async () => {
    setExporting(true);
    try {
      const allNotes = await exportAllNotes();
      if (hasChildren) {
        const ok = await exportAsZip(allNotes, nodes, `${safeName(node.label)}-export.zip`, activeNodeId);
        showToast(ok ? `Exported ${node.label}.zip ✓` : 'Nothing to export', ok ? 'success' : 'error');
      } else {
        handleDownload();
      }
    } catch (e) {
      showToast('Export failed — ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const allNotes = await exportAllNotes();
      const ok = await exportAsZip(allNotes, nodes, 'TreeNotes-export.zip');
      showToast(ok ? 'All notes exported ✓' : 'No content to export', ok ? 'success' : 'error');
    } catch (e) {
      showToast('Export failed — ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!activeNodeId) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">
          <svg width="52" height="52" viewBox="0 0 36 36" fill="none" opacity="0.25">
            <circle cx="18" cy="8" r="5" fill="var(--accent)" />
            <line x1="18" y1="13" x2="18" y2="20" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="10" cy="26" r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1.5" />
            <circle cx="26" cy="26" r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="18" y1="20" x2="10" y2="22" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="18" y1="20" x2="26" y2="22" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
        </div>
        <h2 className="editor-empty-title">Select a topic</h2>
        <p className="editor-empty-hint">Click any topic in the tree to open its notes here.</p>
        <div className="editor-empty-actions">
          <button className="editor-diagram-btn" onClick={onShowDiagram}>View Tree Diagram</button>
          <button className="editor-export-all-btn" onClick={handleExportAll} disabled={exporting}>
            {exporting ? 'Exporting…' : '⬇ Export All Notes'}
          </button>
        </div>
        {toast && <div className={`editor-toast editor-toast--${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  // ── Full editor ───────────────────────────────────────────────────────────
  return (
    <div className="editor-root">

      {/* ── Breadcrumb bar ── */}
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <button className="editor-back-btn" onClick={onShowDiagram}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Tree
          </button>
          <span className="editor-breadcrumb">
            {breadcrumb.slice(0, -1).join(' › ')}{breadcrumb.length > 1 ? ' ›' : ''}
          </span>
        </div>
        <div className="editor-topbar-right">
          {!isOnline && <span className="status-offline">📴 Offline</span>}
          <span className={`status-save ${saving ? 'status-save--saving' : ''}`}>
            {saving ? '● Saving…' : '✓ Saved'}
          </span>
        </div>
      </div>

      {/* ── File tab + file-ops toolbar ── */}
      <div className="editor-filetab-row">
        <div className="editor-filetab">
          <span className="editor-filetab-dot" />
          <span className="editor-filetab-name">{node?.label}</span>
          {linkedName && (
            <span className="editor-linked-badge" title={`Linked to ${linkedName}`}>
              {fileStatus === 'error' ? '⚠' : '📄'} {linkedName}
              <button className="editor-unlink-btn" onClick={handleUnlink}>✕</button>
            </span>
          )}
        </div>

        <div className="editor-file-toolbar">
          <button className="ftb-btn" onClick={handleOpenLocal} title="Open & link a local file">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Open local
          </button>

          <button className={`ftb-btn ${fileHandle ? 'ftb-btn--linked' : ''}`} onClick={handleSaveToLocal}
            title={fileHandle ? `Save to ${linkedName}` : 'Save As'}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {fileHandle ? 'Save to disk' : 'Save as…'}
          </button>

          <div className="ftb-sep" />

          <button className="ftb-btn" onClick={handleDownload} title="Download as .txt">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Download
          </button>

          <button className="ftb-btn" onClick={handleExportSubtree} disabled={exporting}
            title={hasChildren ? 'Export this topic + subtopics as ZIP' : 'Download as .txt'}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M17.5 14v7M14 17.5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {exporting ? '…' : hasChildren ? 'Export tree' : 'Export'}
          </button>

          <button className="ftb-btn ftb-btn--accent" onClick={handleExportAll} disabled={exporting}
            title="Export ALL notes as ZIP">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {exporting ? '…' : 'Export all'}
          </button>
        </div>
      </div>

      {/* ── Formatting toolbar ── */}
      <FormattingToolbar
        editorRef={editorRef}
        fmts={fmts}
        onFmtChange={updateFmts}
        font={font}
        size={size}
        onFontChange={handleFontChange}
        onSizeChange={handleSizeChange}
      />

      {/* ── Rich text editor ── */}
      {loadingNote ? (
        <div className="editor-loading">
          <div className="loading-lines">
            <div className="loading-line" style={{ width: '70%' }} />
            <div className="loading-line" style={{ width: '45%' }} />
            <div className="loading-line" style={{ width: '80%' }} />
            <div className="loading-line" style={{ width: '30%' }} />
          </div>
        </div>
      ) : (
        <div
          ref={editorRef}
          id="note-editor-content"
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={updateFmts}
          onKeyUp={updateFmts}
          style={{
            fontFamily: `'${font}', monospace`,
            fontSize: `${size}px`,
          }}
          spellCheck
        />
      )}

      {/* ── Status bar ── */}
      <div className="editor-statusbar">
        <span className="status-lang">Rich Text</span>
        <span className="status-sep">|</span>
        <span className="status-words">{stats.words} words</span>
        <span className="status-sep">|</span>
        <span className="status-chars">{stats.chars} chars</span>
        {linkedName && (
          <>
            <span className="status-sep">|</span>
            <span className={`status-local ${fileStatus === 'error' ? 'status-local--err' : ''}`}>
              {fileStatus === 'error' ? '⚠ Sync failed' : `📄 ${linkedName}`}
            </span>
          </>
        )}
      </div>

      {toast && <div className={`editor-toast editor-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
