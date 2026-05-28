// compress.js — LZ-String wrapper for transparent text compression
// Reduces note content size by ~40–60% before writing to Firestore

import LZString from 'lz-string';

/**
 * Compress text before storing.
 * Uses UTF-16 compression — safe for Firestore string fields.
 */
export function compress(text) {
  if (!text || typeof text !== 'string') return '';
  try {
    return LZString.compressToUTF16(text);
  } catch {
    return text; // fallback: store raw
  }
}

/**
 * Decompress text after reading from Firestore.
 * Detects whether input is compressed or raw (legacy/fallback).
 */
export function decompress(compressed) {
  if (!compressed || typeof compressed !== 'string') return '';
  try {
    const result = LZString.decompressFromUTF16(compressed);
    return result !== null ? result : compressed; // null = wasn't compressed
  } catch {
    return compressed; // fallback: return raw
  }
}

/**
 * Returns estimated savings info for display purposes.
 */
export function compressionStats(original, compressedStr) {
  if (!original || !compressedStr) return { ratio: 0, saved: 0 };
  const origBytes = new Blob([original]).size;
  const compBytes = new Blob([compressedStr]).size;
  const saved = Math.max(0, Math.round((1 - compBytes / origBytes) * 100));
  return { origBytes, compBytes, saved };
}
