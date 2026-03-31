/**
 * brief-storage.js — localStorage CRUD for FrameForge project briefs.
 *
 * Keys:
 *   frameforge_briefs          → JSON array of index entries { id, title, slug, platform, imageCount, created, updated }
 *   frameforge_brief_{id}      → Full brief JSON object
 */

import * as storage from './storage.js';

const PREFIX    = 'frameforge';
const KEY_INDEX = `${PREFIX}_briefs`;
const briefKey  = (id) => `${PREFIX}_brief_${id}`;

// ── Index helpers ────────────────────────────────────────────────────────────

function loadIndex() {
  try {
    const raw = localStorage.getItem(KEY_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(index) {
  try {
    localStorage.setItem(KEY_INDEX, JSON.stringify(index));
  } catch (e) {
    console.warn('[brief-storage] saveIndex failed:', e);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Upsert a brief.  Generates `id` if absent. Sets `created` on first save.
 * Always updates `updated`.
 * @param {object} brief — partial or full brief object
 * @returns {string} id of saved brief
 */
export function save(brief) {
  const now = new Date().toISOString().slice(0, 10);
  brief = {
    ...brief,
    id:      brief.id      || `brief_${Date.now()}`,
    created: brief.created || now,
    updated: now,
  };

  try {
    localStorage.setItem(briefKey(brief.id), JSON.stringify(brief));
  } catch (e) {
    throw new Error(`Failed to save brief (storage quota?): ${e.message}`);
  }

  // Upsert index entry
  const index = loadIndex();
  const pos   = index.findIndex((e) => e.id === brief.id);
  const entry = {
    id:         brief.id,
    title:      brief.title      || '(untitled)',
    slug:       brief.slug       || '',
    platform:   brief.platform   || '',
    imageCount: brief.imageCount ?? 0,
    hasLayout:  brief.hasLayout  ?? false,
    created:    brief.created,
    updated:    brief.updated,
  };
  if (pos >= 0) {
    index[pos] = entry;
  } else {
    index.push(entry);
  }
  saveIndex(index);

  return brief.id;
}

/**
 * Load a full brief by id.
 * @param {string} id
 * @returns {object|null}
 */
export function load(id) {
  try {
    const raw = localStorage.getItem(briefKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`[brief-storage] load(${id}) failed:`, e);
    return null;
  }
}

/**
 * Return index array sorted by updated desc (most recent first).
 * @returns {object[]}
 */
export function list() {
  return loadIndex().slice().sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));
}

/**
 * Delete a brief and its index entry.
 * @param {string} id
 */
export function remove(id) {
  try {
    localStorage.removeItem(briefKey(id));
  } catch (e) {
    console.warn(`[brief-storage] remove(${id}) failed:`, e);
  }
  saveIndex(loadIndex().filter((e) => e.id !== id));
}

/**
 * Update the hasLayout flag for a project.
 * @param {string} id
 * @param {boolean} value
 */
export function setHasLayout(id, value) {
  const index = loadIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) return;
  entry.hasLayout = value;
  saveIndex(index);
}

/**
 * Delete a project completely — brief entry, layout JSON, images, assignments.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProject(id) {
  remove(id);
  storage.deleteLayoutData(id);
  storage.clearAssignments(id);
  await storage.clearImages(id);
}
