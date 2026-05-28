// fileOps.js — Local file read/write + ZIP export utilities

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => { URL.revokeObjectURL(url); document.body.removeChild(a); });
}

export function downloadText(content, filename) {
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), filename);
}

// ─── HTML → plain text (for .txt exports) ────────────────────────────────────

export function isHTML(str) {
  return /<[a-z][\s\S]*>/i.test(str || '');
}

export function htmlToPlainText(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  const walk = (node) => {
    let text = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'br') {
          text += '\n';
        } else if (tag === 'li') {
          const parent = child.parentElement?.tagName.toLowerCase();
          const prefix = parent === 'ol' ? '  1. ' : '  • ';
          text += '\n' + prefix + walk(child);
        } else {
          const isBlock = ['p','div','h1','h2','h3','h4','h5','h6','blockquote','pre'].includes(tag);
          const inner = walk(child);
          text += isBlock ? '\n' + inner : inner;
        }
      }
    });
    return text;
  };

  return walk(div).replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Sanitise a string for use as a filename / folder name ───────────────────

export function safeName(s) {
  return (s || 'untitled').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'untitled';
}

// ─── Open a local file ────────────────────────────────────────────────────────
// Returns { content, name, handle } or null if cancelled.

export async function openLocalFile() {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Text / Markdown files', accept: { 'text/plain': ['.txt', '.md', '.text', '.log'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      return { content: await file.text(), name: file.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.text,.log';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) { resolve(null); return; }
      resolve({ content: await file.text(), name: file.name, handle: null });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ─── Write back to a local file handle ───────────────────────────────────────

export async function writeLocalFile(handle, content) {
  if (!handle) return false;
  try {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch { return false; }
}

// ─── Save As dialog ───────────────────────────────────────────────────────────

export async function saveFileAs(content, suggestedName) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Text file', accept: { 'text/plain': ['.txt'] } }],
      });
      await writeLocalFile(handle, content);
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }
  downloadText(content, suggestedName);
  return null;
}

// ─── ZIP path builder ─────────────────────────────────────────────────────────
//
// Structure rule:
//   • Node WITH children  →  NodeName/ folder containing NodeName.txt + children
//   • Node WITHOUT children → NodeName.txt file inside parent folder
//
// Example tree:  Math → Calculus → Derivatives (no children)
//
//   Math/
//     Math.txt          ← Math's own content
//     Calculus/
//       Calculus.txt    ← Calculus's own content
//       Derivatives.txt ← Derivatives (no children, just file)

function buildAncestorChain(nodeId, allNodes, stopAtRootId) {
  const chain = [];
  let cur = allNodes[nodeId];
  while (cur) {
    chain.unshift(cur);
    if (!cur.parentId || cur.id === stopAtRootId) break;
    cur = allNodes[cur.parentId];
  }
  return chain; // from ancestor → nodeId
}

function nodeHasChildren(nodeId, allNodes) {
  return Object.values(allNodes).some(n => n.parentId === nodeId);
}

function getZipPath(nodeId, allNodes, rootId = null) {
  // Build chain: [ancestor, ..., nodeId], stopping at rootId
  const chain = buildAncestorChain(nodeId, allNodes, rootId);
  const parts = [];

  for (let i = 0; i < chain.length; i++) {
    const n = chain[i];
    const name = safeName(n.label);
    const isLast = i === chain.length - 1;

    if (isLast) {
      if (nodeHasChildren(n.id, allNodes)) {
        // Put content inside its own named folder: NodeName/NodeName.txt
        parts.push(name, name + '.txt');
      } else {
        // Leaf: just NodeName.txt in parent folder
        parts.push(name + '.txt');
      }
    } else {
      // Intermediate ancestor → always a folder
      parts.push(name);
    }
  }

  return parts.join('/');
}

// ─── Check if nodeId is a descendant of (or equal to) ancestorId ─────────────

export function isDescendantOrSelf(nodeId, ancestorId, allNodes) {
  if (nodeId === ancestorId) return true;
  let cur = allNodes[nodeId];
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = allNodes[cur.parentId];
  }
  return false;
}

// ─── Build & download ZIP ─────────────────────────────────────────────────────
//
// notesData: { [nodeId]: { node, content } }
// allNodes:  flat node map
// rootId:    if set, only export that node + descendants

export async function exportAsZip(notesData, allNodes, zipFilename = 'TreeNotes-export.zip', rootId = null) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  let added = 0;

  for (const [nodeId, { content }] of Object.entries(notesData)) {
    if (rootId && !isDescendantOrSelf(nodeId, rootId, allNodes)) continue;
    const path = getZipPath(nodeId, allNodes, rootId);
    // Convert HTML to plain text for clean .txt files
    const plainText = isHTML(content) ? htmlToPlainText(content) : (content || '');
    zip.file(path, plainText);
    added++;
  }

  if (added === 0) return false;

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  downloadBlob(blob, zipFilename);
  return true;
}
