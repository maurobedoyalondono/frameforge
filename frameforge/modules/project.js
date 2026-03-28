/**
 * project.js — Project state management for FrameForge.
 *
 * Holds the canonical in-memory state of the current loaded project,
 * image map, and active frame index. Provides helpers for querying
 * frame data and merging layer properties with globals.
 */

import * as storage from './storage.js';

export class Project {
  constructor() {
    /** @type {object|null} Raw parsed project JSON */
    this.data = null;

    /** @type {string|null} */
    this.id = null;

    /**
     * @type {Map<string, HTMLImageElement>}
     * filename → loaded HTMLImageElement (or null if failed)
     */
    this.imageElements = new Map();

    /**
     * @type {Object.<string, string>}
     * filename → dataURL (from localStorage)
     */
    this.imageMap = {};

    /**
     * @type {Map<number, string>}
     * Manual assignments: frameIndex → imageKey in imageElements.
     * Overrides filename-based matching for frame.image_src.
     */
    this.imageAssignments = new Map();

    /** @type {number} */
    this.activeFrameIndex = 0;

    /** @type {boolean} */
    this.isDirty = false;
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  /**
   * Load a project from parsed JSON data.
   * @param {object} data
   */
  async load(data) {
    this.data = data;
    this.id   = data.project.id;
    this.activeFrameIndex = 0;
    this.isDirty = false;
    this.imageElements.clear();

    // Load stored images from localStorage
    this.imageMap = storage.loadImages(this.id);

    // Pre-load image elements for all stored images
    await this._preloadStoredImages();

    // Restore manual assignments
    const storedAssignments = storage.loadAssignments(this.id);
    this.imageAssignments.clear();
    for (const [k, v] of Object.entries(storedAssignments)) {
      this.imageAssignments.set(Number(k), v);
    }
  }

  /**
   * Save current project to localStorage.
   */
  save() {
    if (!this.data) return;
    storage.saveProject(this.data);
    this.isDirty = false;
  }

  /**
   * Merge new image files into the project.
   * @param {Object.<string, string>} newImages — filename → dataURL
   * @returns {Promise<{matched: string[], storageFailed: string[]}>}
   */
  async addImages(newImages) {
    const matched = [];
    const toLoad  = [];

    for (const [filename, dataURL] of Object.entries(newImages)) {
      this.imageMap[filename] = dataURL;
      toLoad.push({ filename, dataURL });
      if (this._isImageReferenced(filename)) {
        matched.push(filename);
      }
    }

    // Save to localStorage — returns list of filenames that couldn't be saved
    const storageFailed = storage.saveImages(this.id, newImages);

    // Pre-load elements
    await Promise.all(toLoad.map(({ filename, dataURL }) =>
      this._loadImageElement(filename, dataURL)
    ));

    return { matched, storageFailed };
  }

  /**
   * Manually assign an image to a frame, overriding filename-based matching.
   * Pass imageKey=null to remove an assignment.
   * @param {number} frameIndex
   * @param {string|null} imageKey — key in imageElements/imageMap
   */
  assignImage(frameIndex, imageKey) {
    if (imageKey === null || imageKey === undefined) {
      this.imageAssignments.delete(frameIndex);
    } else {
      this.imageAssignments.set(frameIndex, imageKey);
    }
    // Persist
    const obj = {};
    this.imageAssignments.forEach((v, k) => { obj[k] = v; });
    storage.saveAssignments(this.id, obj);
  }

  /**
   * Resolve the image element for a layer, checking manual assignments first.
   * For a frame's primary image_src, the assignment overrides filename lookup.
   * All other src values use the regular filename lookup.
   *
   * @param {string} src — the layer's src / image_src value from JSON
   * @param {number|null} frameIndex — null means no frame context
   * @returns {HTMLImageElement|null}
   */
  getImageForLayer(src, frameIndex) {
    if (frameIndex != null && this.imageAssignments.has(frameIndex)) {
      const frame = this.data?.frames?.[frameIndex];
      if (frame?.image_src === src) {
        const img = this.imageElements.get(this.imageAssignments.get(frameIndex));
        if (img) return img;
      }
    }
    return this.imageElements.get(src) ?? null;
  }

  /**
   * Check if a filename is referenced anywhere in the project.
   * @param {string} filename
   * @returns {boolean}
   */
  _isImageReferenced(filename) {
    if (!this.data) return false;
    for (const frame of this.data.frames) {
      if (frame.image_src === filename) return true;
      if (frame.logo?.src === filename) return true;
      for (const layer of (frame.layers || [])) {
        if (layer.src === filename) return true;
      }
    }
    return false;
  }

  /**
   * Pre-load all images from imageMap into imageElements.
   */
  async _preloadStoredImages() {
    const tasks = Object.entries(this.imageMap).map(([filename, dataURL]) =>
      this._loadImageElement(filename, dataURL)
    );
    await Promise.all(tasks);
  }

  /**
   * Load one image into imageElements.
   * @param {string} filename
   * @param {string} dataURL
   * @returns {Promise<void>}
   */
  _loadImageElement(filename, dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => { this.imageElements.set(filename, img); resolve(); };
      img.onerror = () => { this.imageElements.set(filename, null); resolve(); };
      img.src = dataURL;
    });
  }

  // ── Accessors ────────────────────────────────────────────────────────────

  get frameCount() {
    return this.data?.frames?.length ?? 0;
  }

  get activeFrame() {
    return this.data?.frames?.[this.activeFrameIndex] ?? null;
  }

  get exportConfig() {
    return this.data?.export ?? null;
  }

  get globals() {
    return this.data?.globals ?? {};
  }

  get projectMeta() {
    return this.data?.project ?? null;
  }

  /**
   * Navigate to a frame by index.
   * @param {number} index
   * @returns {boolean} true if changed
   */
  setActiveFrame(index) {
    if (index < 0 || index >= this.frameCount) return false;
    if (index === this.activeFrameIndex) return false;
    this.activeFrameIndex = index;
    return true;
  }

  /**
   * Get a frame by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getFrameById(id) {
    return this.data?.frames?.find((f) => f.id === id) ?? null;
  }

  /**
   * Get an HTMLImageElement for a filename.
   * Returns null if not available.
   * @param {string} filename
   * @returns {HTMLImageElement|null}
   */
  getImage(filename) {
    return this.imageElements.get(filename) ?? null;
  }

  /**
   * Check if all images referenced by a frame are available.
   * @param {number} frameIndex
   * @returns {'ok'|'partial'|'missing'}
   */
  getFrameImageStatus(frameIndex) {
    const frame = this.data?.frames?.[frameIndex];
    if (!frame) return 'missing';

    const referenced = new Set();
    referenced.add(frame.image_src);
    if (frame.logo?.src) referenced.add(frame.logo.src);
    for (const layer of (frame.layers || [])) {
      if (layer.src) referenced.add(layer.src);
    }

    let found = 0;
    for (const filename of referenced) {
      // For the primary image slot, check manual assignment first
      if (filename === frame.image_src && this.imageAssignments.has(frameIndex)) {
        const assignedKey = this.imageAssignments.get(frameIndex);
        if (this.imageElements.get(assignedKey)) { found++; continue; }
      }
      if (this.imageElements.get(filename)) found++;
    }

    if (found === 0)              return 'missing';
    if (found < referenced.size) return 'partial';
    return 'ok';
  }

  /**
   * Get the set of all referenced image filenames across all frames.
   * @returns {Set<string>}
   */
  getReferencedImages() {
    const refs = new Set();
    if (!this.data) return refs;
    for (const frame of this.data.frames) {
      refs.add(frame.image_src);
      if (frame.logo?.src) refs.add(frame.logo.src);
      for (const layer of (frame.layers || [])) {
        if (layer.src) refs.add(layer.src);
      }
    }
    return refs;
  }

  /**
   * Get all unique font families used in the project.
   * @returns {string[]}
   */
  getFontFamilies() {
    const families = new Set();
    if (!this.data) return [];

    const addFont = (font) => { if (font?.family) families.add(font.family); };
    addFont(this.globals.font_defaults);

    for (const frame of this.data.frames) {
      for (const layer of (frame.layers || [])) {
        if (layer.type === 'text') addFont(layer.font);
        if (layer.type === 'stats_block') {
          for (const item of (layer.items || [])) {
            addFont(item.value_font);
            addFont(item.label_font);
          }
        }
      }
    }
    return [...families];
  }

  /**
   * Merge a text font with globals defaults.
   * @param {object} font
   * @returns {object}
   */
  resolveFont(font) {
    const defaults = this.globals.font_defaults || {};
    return {
      family:           font?.family           ?? defaults.family  ?? 'sans-serif',
      weight:           font?.weight           ?? defaults.weight  ?? 400,
      style:            font?.style            ?? 'normal',
      size_pct:         font?.size_pct         ?? 2,
      line_height:      font?.line_height      ?? 1.2,
      letter_spacing_em: font?.letter_spacing_em ?? 0,
      color:            font?.color            ?? defaults.color   ?? '#FFFFFF',
      opacity:          font?.opacity          ?? defaults.opacity ?? 1.0,
    };
  }

  /**
   * Resolve the effective background color for a frame.
   * @param {number} frameIndex
   * @returns {string}
   */
  getFrameBackground(frameIndex) {
    const frame = this.data?.frames?.[frameIndex];
    return frame?.background_color
      ?? this.globals.background_color
      ?? '#000000';
  }

  /**
   * Clear the project.
   */
  clear() {
    this.data = null;
    this.id   = null;
    this.imageElements.clear();
    this.imageMap = {};
    this.imageAssignments.clear();
    this.activeFrameIndex = 0;
    this.isDirty = false;
  }

  /**
   * @returns {boolean}
   */
  get isLoaded() {
    return this.data !== null;
  }
}
