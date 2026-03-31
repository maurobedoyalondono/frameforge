/**
 * storage.js — localStorage persistence for FrameForge.
 *
 * Keys:
 *   frameforge_projects         → JSON array of index entries {id, title, created, updated}
 *   frameforge_project_{id}     → Full project JSON string
 *   frameforge_images_{id}      → { filename: base64_dataURL }
 *   frameforge_prefs            → { safe_zone_visible, zoom_level, last_project_id, active_project_id }
 */

const PREFIX = 'frameforge';
const KEY_PROJECTS = `${PREFIX}_projects`;
const KEY_PREFS    = `${PREFIX}_prefs`;

const projectKey     = (id) => `${PREFIX}_project_${id}`;
const imagesKey      = (id) => `${PREFIX}_images_${id}`;
const assignmentsKey = (id) => `${PREFIX}_assignments_${id}`;

// ── Prefs ──────────────────────────────────────────────────────────────────

const DEFAULT_PREFS = {
  safe_zone_visible:  false,
  zoom_level:         1.0,
  last_project_id:    null,
  active_project_id:  null,
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY_PREFS);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[storage] savePrefs failed:', e);
  }
}

// ── Project index ──────────────────────────────────────────────────────────

export function loadProjectIndex() {
  try {
    const raw = localStorage.getItem(KEY_PROJECTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjectIndex(index) {
  try {
    localStorage.setItem(KEY_PROJECTS, JSON.stringify(index));
  } catch (e) {
    console.warn('[storage] saveProjectIndex failed:', e);
  }
}

// ── Project ────────────────────────────────────────────────────────────────

/**
 * Save a parsed project data object.
 * @param {object} data — full parsed JSON (project + export + globals + frames)
 * @param {string} projectId — canonical project ID (Brief ID)
 */
export function saveProject(data, projectId) {
  if (!projectId) throw new Error('projectId is required');
  try {
    localStorage.setItem(projectKey(projectId), JSON.stringify(data));
  } catch (e) {
    throw new Error(`Failed to save project (storage quota?): ${e.message}`);
  }
  // Index is now managed by brief-storage.js — do not update frameforge_projects index here.
}

/**
 * Remove stored layout JSON for a project.
 * @param {string} projectId
 */
export function deleteLayoutData(projectId) {
  localStorage.removeItem(projectKey(projectId));
}

/**
 * Remove stored frame-image assignments for a project.
 * @param {string} projectId
 */
export function clearAssignments(projectId) {
  localStorage.removeItem(assignmentsKey(projectId));
}

/**
 * Load a project by ID.
 * @param {string} id
 * @returns {object|null}
 */
export function loadProject(id) {
  try {
    const raw = localStorage.getItem(projectKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`[storage] loadProject(${id}) failed:`, e);
    return null;
  }
}

/**
 * Delete a project and its images.
 * @param {string} id
 */
export async function deleteProject(id) {
  deleteLayoutData(id);
  clearAssignments(id);
  await clearImages(id);
}

// ── Images ─────────────────────────────────────────────────────────────────

/**
 * Load all stored images for a project.
 * @param {string} projectId
 * @returns {Object.<string, string>} filename → dataURL
 */
export function loadImages(projectId) {
  try {
    const raw = localStorage.getItem(imagesKey(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save/merge new images into the store for a project.
 * @param {string} projectId
 * @param {Object.<string, string>} imageMap — filename → dataURL
 * @returns {string[]} filenames that could not be saved due to quota
 */
export function saveImages(projectId, imageMap) {
  const existing = loadImages(projectId);
  const merged   = { ...existing, ...imageMap };
  try {
    localStorage.setItem(imagesKey(projectId), JSON.stringify(merged));
    return []; // all saved
  } catch (e) {
    // LocalStorage quota — try to save individual items
    console.warn('[storage] saveImages quota hit, attempting partial save:', e);
    const failed = [];
    let saved = { ...existing };
    for (const [filename, dataURL] of Object.entries(imageMap)) {
      try {
        saved[filename] = dataURL;
        localStorage.setItem(imagesKey(projectId), JSON.stringify(saved));
      } catch {
        console.warn(`[storage] Could not save image "${filename}" (quota exceeded).`);
        delete saved[filename];
        failed.push(filename);
      }
    }
    return failed;
  }
}

/**
 * Remove stored images for a project.
 * @param {string} projectId
 */
export function clearImages(projectId) {
  localStorage.removeItem(imagesKey(projectId));
}

// ── Image Assignments ───────────────────────────────────────────────────────

/**
 * Save frame→image assignments for a project.
 * @param {string} projectId
 * @param {Object.<string, string>} assignments — { [frameIndex]: imageKey }
 */
export function saveAssignments(projectId, assignments) {
  try {
    localStorage.setItem(assignmentsKey(projectId), JSON.stringify(assignments));
  } catch (e) {
    console.warn('[storage] saveAssignments failed:', e);
  }
}

/**
 * Load frame→image assignments for a project.
 * @param {string} projectId
 * @returns {Object.<string, string>} { [frameIndex]: imageKey }
 */
export function loadAssignments(projectId) {
  try {
    const raw = localStorage.getItem(assignmentsKey(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Estimate total localStorage usage in bytes.
 */
export function getStorageUsage() {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) {
      total += localStorage.getItem(key)?.length ?? 0;
    }
  }
  return total; // rough UTF-16 char count, ~bytes for ASCII
}

/**
 * Format a byte count to human-readable.
 */
export function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024*1024)).toFixed(2)} MB`;
}
