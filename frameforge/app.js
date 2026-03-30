/**
 * app.js — FrameForge main application entry point.
 *
 * Initializes all modules, wires up events, manages app state.
 */

import { Project }       from './modules/project.js';
import { Renderer }      from './modules/renderer.js';
import { validateProject } from './modules/validator.js';
import { loadProjectFonts, loadFont } from './modules/fonts.js';
import * as storage      from './modules/storage.js';
import { exportFrame, exportAllFrames } from './modules/export.js';

import {
  StatusBar, ToastManager, ProgressOverlay, ContextMenu,
  buildToolbar, updateToolbarState, registerKeyboardShortcuts,
  showConfirm, initLeftPanelResize,
} from './ui/shell.js';
import { Filmstrip }  from './ui/filmstrip.js';
import { Inspector }  from './ui/inspector.js';
import { DropZone, readFileAsText, processImageFiles } from './ui/dropzone.js';
import { ConceptBuilder } from './ui/concept-builder.js';
import { BriefManager }     from './ui/brief-manager.js';
import * as briefStorage     from './modules/brief-storage.js';
import { ImageTray } from './ui/image-tray.js';
import { initDrag, destroyDrag } from './modules/drag.js';
import { computeTextBounds, computeShapeBounds } from './modules/layers.js';
import { TextToolbar }    from './ui/text-toolbar.js';
import { ShapeToolbar }   from './ui/shape-toolbar.js';
import { ImageToolbar }   from './ui/image-toolbar.js';
import { OverlayToolbar } from './ui/overlay-toolbar.js';
import { LayersPanel }    from './ui/layers-panel.js';

// ── App State ─────────────────────────────────────────────────────────────

const AppState = Object.freeze({
  EMPTY:          'EMPTY',
  PROJECT_LOADED: 'PROJECT_LOADED',
  IMAGES_MATCHED: 'IMAGES_MATCHED',
  PREVIEW_READY:  'PREVIEW_READY',
  EXPORT_DONE:    'EXPORT_DONE',
});

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  // ── DOM refs ────────────────────────────────────────────────────────────
  const toolbarEl      = document.getElementById('toolbar');
  const filmstripListEl= document.getElementById('filmstrip-list');
  const filmstripCountEl = document.getElementById('filmstrip-count');
  const canvasAreaEl   = document.getElementById('canvas-area');
  const canvasWrapEl   = document.getElementById('canvas-wrap');
  const inspectorContentEl = document.getElementById('inspector-content');
  const statusbarEl    = document.getElementById('statusbar');
  const dropzoneEl     = document.getElementById('dropzone');

  // ── Layer factories ──────────────────────────────────────────────────────

  function makeUniqueId(prefix, frame) {
    const existing = new Set((frame.layers ?? []).map(l => l.id));
    let n = 1;
    while (existing.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  }

  function makeDefaultTextLayer(id) {
    return {
      id,
      type: 'text',
      content: 'Text',
      font: {
        family: 'Inter', style: 'normal', weight: 400,
        size_pct: 5, line_height: 1.2, color: '#FFFFFF', opacity: 1.0,
      },
      position: { mode: 'zone', zone: 'bottom-left', offset_x_pct: 6, offset_y_pct: -8 },
      max_width_pct: 80,
      align: 'left',
    };
  }

  function makeDefaultShapeLayer(id, variant) {
    const base = { id, type: 'shape', fill_color: '#000000', fill_opacity: 0.85 };
    if (variant === 'circle') {
      return { ...base, shape: 'circle',
        position: { x_pct: 50, y_pct: 50 },
        dimensions: { width_pct: 20, height_pct: 20 } };
    }
    if (variant === 'square') {
      return { ...base, shape: 'rectangle',
        position: { x_pct: 50, y_pct: 50 },
        dimensions: { width_pct: 25, height_pct: 25 } };
    }
    // bar (default)
    return { ...base, shape: 'rectangle',
      position: { x_pct: 50, y_pct: 87 },
      dimensions: { width_pct: 100, height_pct: 26 } };
  }

  function makeDefaultOverlayLayer(id) {
    return {
      id,
      type: 'overlay',
      color: '#000000',
      opacity: 1.0,
      blend_mode: 'normal',
      gradient: {
        enabled: true,
        direction: 'to-bottom',
        from_opacity: 0.0,
        from_position_pct: 45,
        to_opacity: 0.65,
        to_position_pct: 100,
      },
    };
  }

  // ── Module instances ────────────────────────────────────────────────────
  const project    = new Project();
  const renderer   = new Renderer();
  const status     = new StatusBar(statusbarEl);
  const toasts     = new ToastManager();
  const progress   = new ProgressOverlay();
  const ctxMenu    = new ContextMenu();
  const conceptBuilder = new ConceptBuilder();
  const briefManager   = new BriefManager(
    briefStorage,
    (briefId, startStep = 1) => conceptBuilder.open((files) => handleImageFiles(files), briefId, startStep),
  );
  conceptBuilder.setOnOpenBriefManager(() => briefManager.open(prefs.active_brief_id ?? null));
  briefManager.setOnActiveBriefChange((id, title) => {
    prefs.active_brief_id = id ?? undefined;
    storage.savePrefs(prefs);
    updateActiveBriefLabel(tb.activeBriefLabel, title);
  });

  const textToolbarEl = document.getElementById('text-toolbar');
  const textToolbar   = new TextToolbar(textToolbarEl, loadFont);

  const shapeToolbarEl   = document.getElementById('shape-toolbar');
  const shapeToolbar     = new ShapeToolbar(shapeToolbarEl);

  const imageToolbarEl   = document.getElementById('image-toolbar');
  const overlayToolbarEl = document.getElementById('overlay-toolbar');
  const layersPanelEl    = document.getElementById('layers-panel');

  const imageToolbar   = new ImageToolbar(imageToolbarEl);
  const overlayToolbar = new OverlayToolbar(overlayToolbarEl);
  const layersPanel    = new LayersPanel(layersPanelEl);

  // Canvas for main preview
  const mainCanvas = document.createElement('canvas');
  mainCanvas.id = 'main-canvas';
  const _existingCanvas = canvasWrapEl.querySelector('#main-canvas');
  if (_existingCanvas) _existingCanvas.remove();
  canvasWrapEl.insertAdjacentElement('afterbegin', mainCanvas);

  // Safe zone overlay element inside canvas wrap
  const safeZoneEl = document.getElementById('safe-zone-overlay');

  // ── Sub-UI instances ────────────────────────────────────────────────────
  const filmstrip  = new Filmstrip(filmstripListEl, filmstripCountEl, ctxMenu);
  const inspector  = new Inspector(inspectorContentEl);
  const imageTray  = new ImageTray(
    document.getElementById('image-tray-list'),
    document.getElementById('image-tray-count'),
  );

  filmstrip.onFrameSelect = (index) => selectFrame(index);
  filmstrip.onExportFrame = (index) => doExportFrame(index);
  filmstrip.onAssignImage = (frameIndex, imageKey) => doAssignImage(frameIndex, imageKey);

  // ── Toolbar ─────────────────────────────────────────────────────────────
  const tb = buildToolbar(toolbarEl);
  initLeftPanelResize();

  // ── App state ────────────────────────────────────────────────────────────
  let appState = AppState.EMPTY;
  let validation = { errors: [], warnings: [] };
  let fontPromises = new Map();

  // Persisted prefs
  let prefs = storage.loadPrefs();
  renderer.showSafeZone    = prefs.safe_zone_visible ?? false;
  renderer.showLayerBounds = prefs.layers_visible    ?? false;

  // ── DropZone ─────────────────────────────────────────────────────────────
  new DropZone(
    dropzoneEl,
    (file) => handleJSONFile(file),
    (files) => handleImageFiles(files),
  );

  // Populate dropzone UI
  dropzoneEl.innerHTML = `
    <div class="dropzone-backdrop"></div>
    <div class="dropzone-content">
      <div class="dropzone-icon">⬇</div>
      <div class="dropzone-title">Drop files here</div>
      <div class="dropzone-sub">Drop a JSON project file or image files</div>
      <div class="dropzone-types">
        <span class="dropzone-type-tag">.json</span>
        <span class="dropzone-type-tag">.jpg</span>
        <span class="dropzone-type-tag">.png</span>
        <span class="dropzone-type-tag">.webp</span>
      </div>
    </div>
  `;

  // ── Show empty state initially ────────────────────────────────────────────
  showEmptyState();
  filmstrip.clear();
  inspector.clear();
  updateToolbarState(tb, false, false, false);

  // ── Event bindings ────────────────────────────────────────────────────────

  tb.btnNewProject?.addEventListener('click', () => {
    conceptBuilder.open((files) => handleImageFiles(files));
  });

  tb.btnMyBriefs?.addEventListener('click', () => {
    briefManager.open(prefs.active_brief_id ?? null);
  });

  tb.jsonInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleJSONFile(file);
    e.target.value = '';
  });

  tb.imagesInput.addEventListener('change', (e) => {
    const files = [...(e.target.files ?? [])];
    if (files.length) handleImageFiles(files);
    e.target.value = '';
  });

  tb.btnPreviewAll.addEventListener('click', () => doPreviewAll());
  tb.btnExportThis.addEventListener('click', () => doExportFrame(project.activeFrameIndex));
  tb.btnExportAll .addEventListener('click', () => doExportAll());
  tb.btnSafeZone  .addEventListener('click', () => toggleSafeZone());
  tb.btnLayers    .addEventListener('click', () => toggleLayersPanel());
  tb.btnClear     .addEventListener('click', () => doClearProject());

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  registerKeyboardShortcuts({
    nextFrame:       () => navigateFrame(1),
    prevFrame:       () => navigateFrame(-1),
    exportCurrent:   () => doExportFrame(project.activeFrameIndex),
    exportAll:       () => doExportAll(),
    toggleSafeZone:    () => toggleSafeZone(),
    toggleLayersPanel: () => toggleLayersPanel(),
    rerender:          () => project.isLoaded && renderCurrentFrame(),
  });

  // ── White frame changes ───────────────────────────────────────────────────
  inspectorContentEl.addEventListener('inspector:white-frame-changed', (e) => {
    const { frameIndex } = e.detail;
    project.save();
    filmstrip.renderOne(frameIndex, project);
    renderCurrentFrame();
    inspector.update(project, project.activeFrameIndex, validation);
  });

  // ── Canvas nav buttons ───────────────────────────────────────────────────
  document.getElementById('btn-prev-frame')?.addEventListener('click', () => navigateFrame(-1));
  document.getElementById('btn-next-frame')?.addEventListener('click', () => navigateFrame(1));

  // ── Canvas drop zone — drag image from tray onto canvas to assign to active frame ──
  canvasWrapEl.addEventListener('dragover', (e) => {
    if (!project.isLoaded) return;
    const key = e.dataTransfer.types.includes('text/plain');
    if (!key) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    canvasWrapEl.classList.add('canvas-drag-over');
  });
  canvasWrapEl.addEventListener('dragleave', (e) => {
    if (!canvasWrapEl.contains(e.relatedTarget)) {
      canvasWrapEl.classList.remove('canvas-drag-over');
    }
  });
  canvasWrapEl.addEventListener('drop', (e) => {
    e.preventDefault();
    canvasWrapEl.classList.remove('canvas-drag-over');
    if (!project.isLoaded) return;
    const imageKey = e.dataTransfer.getData('text/plain');
    if (imageKey) doAssignImage(project.activeFrameIndex, imageKey);
  });

  // ── Window resize ────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    if (project.isLoaded) {
      fitCanvas();
      requestAnimationFrame(() => positionToolbar());
    }
  });
  ro.observe(canvasAreaEl);

  // ── Toolbar positioning helpers ───────────────────────────────────────────

  /**
   * Position a floating toolbar element over/under a layer's bounding box.
   * @param {HTMLElement} el — the toolbar element (position:absolute inside #canvas-wrap)
   * @param {{ top, bottom, left, right }} bounds — layer bounds in canvas pixels
   */
  function positionElement(el, bounds) {
    if (!bounds) return;
    const canvasRect  = mainCanvas.getBoundingClientRect();
    const wrapRect    = canvasWrapEl.getBoundingClientRect();
    const scaleX      = canvasRect.width  / mainCanvas.width;
    const scaleY      = canvasRect.height / mainCanvas.height;

    // Bounds in CSS px relative to canvas
    const cssTop    = bounds.top    * scaleY;
    const cssBottom = bounds.bottom * scaleY;
    const cssLeft   = bounds.left   * scaleX;
    const cssRight  = bounds.right  * scaleX;
    const cssCenter = (cssLeft + cssRight) / 2;

    // Canvas origin relative to canvas-wrap
    const canvasOffsetLeft = canvasRect.left - wrapRect.left;
    const canvasOffsetTop  = canvasRect.top  - wrapRect.top;

    const toolbarW = el.offsetWidth  || 500;
    const toolbarH = el.offsetHeight || 68;
    const GAP      = 10; // px between toolbar and layer edge
    const ARROW_H  = 8;

    // Try above first
    let top  = canvasOffsetTop + cssTop - toolbarH - GAP - ARROW_H;
    let flip = false;
    if (top < 0) {
      // Flip below
      top  = canvasOffsetTop + cssBottom + GAP + ARROW_H;
      flip = true;
    }

    // Centre horizontally over the layer, clamped to canvas-wrap
    const wrapW = wrapRect.width;
    let left = canvasOffsetLeft + cssCenter - toolbarW / 2;
    left = Math.max(4, Math.min(wrapW - toolbarW - 4, left));

    el.style.top  = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.classList.toggle('arrow-down', !flip);
    el.classList.toggle('arrow-up',   flip);
  }

  // Position a toolbar to the right of the canvas, vertically centered.
  // Used for full-frame layers (image, overlay) where above/below has no space.
  function positionElementRight(el) {
    const GAP      = 12;
    const toolbarH = el.offsetHeight || 60;
    const left     = mainCanvas.offsetWidth + GAP;
    const top      = Math.max(4, (mainCanvas.offsetHeight - toolbarH) / 2);
    el.style.top  = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.classList.remove('arrow-down', 'arrow-up');
  }

  function positionToolbar() {
    const layerId = renderer.selectedLayerId;
    if (!layerId || !project.isLoaded) return;
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    const layer = (frame.layers ?? []).find(l => l.id === layerId);
    if (!layer) return;

    const ctx = mainCanvas.getContext('2d');
    const w   = mainCanvas.width;
    const h   = mainCanvas.height;

    if (layer.type === 'text') {
      const bounds = computeTextBounds(ctx, layer, w, h, project);
      positionElement(textToolbarEl, bounds);
    } else if (layer.type === 'shape') {
      const bounds = computeShapeBounds(ctx, layer, w, h, project);
      positionElement(shapeToolbarEl, bounds);
    } else if (layer.type === 'image') {
      positionElementRight(imageToolbarEl);
    } else if (layer.type === 'overlay') {
      positionElementRight(overlayToolbarEl);
    }
  }

  // ── Text layer selection ──────────────────────────────────────────────────

  function onLayerClick(layer) {
    renderer.selectedLayerId = layer?.id ?? null;

    // Hide all toolbars, then show the right one
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();

    if (layer?.type === 'text') {
      textToolbar.setProjectFonts(project.getFontFamilies?.() ?? []);
      textToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'shape') {
      shapeToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'image') {
      imageToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    } else if (layer?.type === 'overlay') {
      overlayToolbar.show(layer);
      requestAnimationFrame(() => positionToolbar());
    }

    layersPanel.setSelectedId(layer?.id ?? null);
    renderCurrentFrame();
  }

  textToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    // Reposition in case text wrap changed bounds
    requestAnimationFrame(() => positionToolbar());
  };

  textToolbar.onDelete = (layer) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = (frame.layers ?? []).filter(l => l.id !== layer.id);
    project.save();
    textToolbar.hide();
    renderer.selectedLayerId = null;
    layersPanel.render(frame);
    layersPanel.setSelectedId(null);
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    inspector.update(project, project.activeFrameIndex, validation);
  };

  shapeToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    requestAnimationFrame(() => positionToolbar());
  };

  shapeToolbar.onDelete = (layer) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = (frame.layers ?? []).filter(l => l.id !== layer.id);
    project.save();
    shapeToolbar.hide();
    renderer.selectedLayerId = null;
    layersPanel.render(frame);
    layersPanel.setSelectedId(null);
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    inspector.update(project, project.activeFrameIndex, validation);
  };

  imageToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    requestAnimationFrame(() => positionToolbar());
  };

  imageToolbar.onDelete = (layer) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = frame.layers.filter(l => l.id !== layer.id);
    imageToolbar.hide();
    renderer.selectedLayerId = null;
    layersPanel.render(frame);
    layersPanel.setSelectedId(null);
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
  };

  overlayToolbar.onChange = (layer) => {
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
    requestAnimationFrame(() => positionToolbar());
  };

  overlayToolbar.onDelete = (layer) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = frame.layers.filter(l => l.id !== layer.id);
    overlayToolbar.hide();
    renderer.selectedLayerId = null;
    layersPanel.render(frame);
    layersPanel.setSelectedId(null);
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
  };

  layersPanel.onLayerSelect = (layerId) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    const layer = frame?.layers?.find(l => l.id === layerId);
    if (layer) onLayerClick(layer);
  };

  layersPanel.onLayerVisibilityToggle = (layerId) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    const layer = frame?.layers?.find(l => l.id === layerId);
    if (!layer) return;
    layer.visible = layer.visible === false ? undefined : false;
    layersPanel.render(frame);
    layersPanel.setSelectedId(renderer.selectedLayerId);
    project.save();
    renderCurrentFrame();
  };

  layersPanel.onLayerVisibilityAll = (makeVisible) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame?.layers) return;
    for (const layer of frame.layers) {
      layer.visible = makeVisible ? undefined : false;
    }
    layersPanel.render(frame);
    layersPanel.setSelectedId(renderer.selectedLayerId);
    project.save();
    renderCurrentFrame();
  };

  layersPanel.onLayerDelete = (layerId) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers = frame.layers.filter(l => l.id !== layerId);
    if (renderer.selectedLayerId === layerId) {
      textToolbar.hide();
      shapeToolbar.hide();
      imageToolbar.hide();
      overlayToolbar.hide();
      renderer.selectedLayerId = null;
    }
    layersPanel.render(frame);
    layersPanel.setSelectedId(renderer.selectedLayerId);
    project.save();
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
  };

  // Smart insertion: maintain image → overlay(s) → shape(s) → text order
  function smartInsertIndex(layers, type) {
    if (type === 'text') return layers.length; // text always on top
    if (type === 'overlay') {
      // After last image or overlay, before shapes and text
      let last = -1;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'image' || layers[i].type === 'overlay') last = i;
      }
      return last + 1;
    }
    if (type === 'shape') {
      // After last image, overlay, or shape — before text
      let last = -1;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'image' || layers[i].type === 'overlay' || layers[i].type === 'shape') last = i;
      }
      return last + 1;
    }
    return layers.length;
  }

  layersPanel.onAddLayer = (type, variant) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame) return;
    frame.layers ??= [];

    let layer;
    if (type === 'text') {
      layer = makeDefaultTextLayer(makeUniqueId('text', frame));
    } else if (type === 'shape') {
      layer = makeDefaultShapeLayer(makeUniqueId('solid-block', frame), variant ?? 'bar');
    } else if (type === 'overlay') {
      layer = makeDefaultOverlayLayer(makeUniqueId('overlay', frame));
    } else {
      return;
    }

    const insertAt = smartInsertIndex(frame.layers, type);
    frame.layers.splice(insertAt, 0, layer);
    project.save();
    layersPanel.render(frame);
    layersPanel.setSelectedId(layer.id);
    onLayerClick(layer);
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
  };

  layersPanel.onLayerReorder = (movedId, targetId, insertBefore) => {
    const frame = project.data?.frames?.[project.activeFrameIndex];
    if (!frame?.layers) return;
    const layers = frame.layers;
    const fromIdx = layers.findIndex(l => l.id === movedId);
    if (fromIdx === -1) return;
    const [moved] = layers.splice(fromIdx, 1);
    const toIdx = layers.findIndex(l => l.id === targetId);
    if (toIdx === -1) { layers.push(moved); }
    else {
      // Panel is reversed (top = highest z). insertBefore in panel = higher z = after in array.
      layers.splice(insertBefore ? toIdx + 1 : toIdx, 0, moved);
    }
    project.save();
    layersPanel.render(frame);
    renderCurrentFrame();
    filmstrip.renderOne(project.activeFrameIndex, project);
  };

  // ── Auto-restore last project ────────────────────────────────────────────
  if (prefs.last_project_id) {
    const saved = storage.loadProject(prefs.last_project_id);
    if (saved) {
      try {
        await loadProjectData(saved, false);
        status.ready(`Restored project: ${saved.project.title}`);
      } catch (e) {
        console.warn('[app] Failed to restore project:', e);
      }
    }
  }

  // ── Restore active brief label ────────────────────────────────────────────
  if (prefs.active_brief_id) {
    const activeBrief = briefStorage.load(prefs.active_brief_id);
    if (activeBrief) {
      updateActiveBriefLabel(tb.activeBriefLabel, activeBrief.title);
    } else {
      prefs.active_brief_id = undefined;
      storage.savePrefs(prefs);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core handlers
  // ─────────────────────────────────────────────────────────────────────────

  async function handleJSONFile(file) {
    status.working(`Loading ${file.name}…`);
    let text;
    try {
      text = await readFileAsText(file);
    } catch (e) {
      status.error(`Failed to read file: ${e.message}`);
      toasts.error('File Read Error', e.message);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const msg = `JSON parse error: ${e.message}`;
      status.error(msg);
      toasts.error('Invalid JSON', msg);
      showJSONError(msg);
      return;
    }

    await loadProjectData(data, true);
  }

  async function loadProjectData(data, saveToStorage) {
    // Clear any text selection from the previous project
    renderer.selectedLayerId = null;
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();
    layersPanel.hide();

    // Clean up images from previous project if switching to a different project ID
    const incomingId = data.project?.id;
    if (project.isLoaded && project.id && project.id !== incomingId) {
      storage.clearImages(project.id);
    }

    // Validate
    const uploadedImages = new Set(Object.keys(project.imageMap ?? {}));
    // Combine with images from storage if we already have a project ID
    const projId = data.project?.id;
    if (projId) {
      const storedImgs = storage.loadImages(projId);
      Object.keys(storedImgs).forEach((k) => uploadedImages.add(k));
    }

    validation = validateProject(data, uploadedImages);

    if (validation.errors.length > 0) {
      status.error(`Validation failed: ${validation.errors[0]}`);
      showValidationErrors(validation.errors, validation.warnings);
      return;
    }

    // Load project
    await project.load(data);

    if (saveToStorage) {
      project.save();
    }

    // Update prefs
    prefs.last_project_id = project.id;
    storage.savePrefs(prefs);

    // Update toolbar
    updateToolbarState(tb, true, renderer.showSafeZone, renderer.showLayerBounds);
    if (tb.projectTitle) {
      tb.projectTitle.textContent = data.project.title || data.project.id;
      tb.projectTitle.title       = data.project.title || '';
    }

    // Build filmstrip
    filmstrip.build(project);
    filmstrip.setActive(project.activeFrameIndex);

    // Build image tray
    imageTray.build(project);

    // Restore assignment badges on filmstrip items
    project.imageAssignments.forEach((imageKey, frameIndex) => {
      filmstrip.showAssignment(frameIndex, imageKey);
    });

    // Show main canvas
    hideEmptyState();
    updateNavButtons();

    // Initial render
    renderCurrentFrame();

    // Restore layers panel if it was active
    if (renderer.showLayerBounds) {
      const frame = project.data.frames[project.activeFrameIndex];
      layersPanel.render(frame);
      layersPanel.setSelectedId(null);
      layersPanel.show();
    }

    // Initialize text drag on main canvas
    destroyDrag(mainCanvas); // clear any previous listener set
    initDrag(
      mainCanvas,
      project,
      () => project.activeFrameIndex,
      () => { renderer.isDragging = true; renderCurrentFrame(); positionToolbar(); },
      (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
      onLayerClick,
    );

    // Inspector
    inspector.update(project, project.activeFrameIndex, validation);

    appState = AppState.PROJECT_LOADED;
    const warnMsg = validation.warnings.length > 0 ? ` (${validation.warnings.length} warnings)` : '';
    status.ready(`Project loaded: ${data.project.title}${warnMsg}`);

    if (validation.warnings.length > 0) {
      toasts.warning(`${validation.warnings.length} validation warning(s)`,
        validation.warnings[0] + (validation.warnings.length > 1 ? '…' : ''));
    }

    // Load fonts (non-blocking)
    fontPromises = loadProjectFonts(data, (family, ok) => {
      if (ok) {
        // Re-render when a font loads
        renderCurrentFrame();
        filmstrip.renderAll(project);
        inspector.refreshFontStatus(project);
      } else {
        console.warn(`[app] Font failed to load: ${family}`);
        toasts.warning('Font unavailable', `"${family}" could not be loaded from Google Fonts. A system font will be used instead.`);
      }
    });
  }

  async function handleImageFiles(files) {
    if (!project.isLoaded) {
      toasts.warning('No project loaded', 'Load a JSON project first, then add images.');
      return;
    }

    progress.show(`Loading ${files.length} image(s)…`);
    status.working(`Loading ${files.length} image(s)…`);

    let imageMap;
    try {
      imageMap = await processImageFiles(files, (cur, total, name) => {
        progress.update(cur - 1, total, `Reading ${name}…`);
        status.working(`Reading ${name} (${cur}/${total})…`);
      });
    } catch (e) {
      progress.hide();
      status.error(`Image load failed: ${e.message}`);
      toasts.error('Image Load Error', e.message);
      return;
    }

    progress.hide();

    const { matched, storageFailed } = await project.addImages(imageMap);

    const total  = Object.keys(imageMap).length;
    const msg    = `Loaded ${total} image(s), ${matched.length} matched`;
    status.ready(msg);
    toasts.success('Images Loaded', msg);

    if (storageFailed.length > 0) {
      toasts.warning(
        'Storage full',
        `${storageFailed.length} image(s) couldn't be saved (storage full). ` +
        `They'll work this session but won't reload next visit. ` +
        `Use "Clear Project" to free storage space.`
      );
    }

    if (matched.length > 0) {
      appState = AppState.IMAGES_MATCHED;
    }

    // Re-run validation with new image set
    const uploadedImages = new Set(Object.keys(project.imageMap));
    validation = validateProject(project.data, uploadedImages);

    // Rebuild image tray with newly loaded images
    imageTray.build(project);

    // Re-render
    renderCurrentFrame();
    filmstrip.renderAll(project);
    inspector.update(project, project.activeFrameIndex, validation);
  }

  // ── Frame selection ───────────────────────────────────────────────────────

  function selectFrame(index) {
    if (!project.isLoaded) return;
    // Clear text selection when navigating to a different frame
    renderer.selectedLayerId = null;
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();

    if (!project.setActiveFrame(index)) return;
    filmstrip.setActive(index);
    updateNavButtons();

    if (renderer.showLayerBounds) {
      const frame = project.data.frames[index];
      layersPanel.render(frame);
      layersPanel.setSelectedId(null);
    }

    renderCurrentFrame();
    inspector.update(project, index, validation);
  }

  function navigateFrame(delta) {
    if (!project.isLoaded) return;
    const next = project.activeFrameIndex + delta;
    if (next < 0 || next >= project.frameCount) return;
    selectFrame(next);
  }

  // ── Image assignment ──────────────────────────────────────────────────────

  function doAssignImage(frameIndex, imageKey) {
    if (!project.isLoaded) return;
    if (!project.imageElements.has(imageKey)) return;

    project.assignImage(frameIndex, imageKey);

    // Update tray badge
    imageTray.showAssignment(imageKey, frameIndex);

    // Update filmstrip badge + thumbnail
    filmstrip.showAssignment(frameIndex, imageKey);
    filmstrip.renderOne(frameIndex, project);
    filmstrip.setStatus(
      frameIndex,
      project.getFrameImageStatus(frameIndex) === 'ok' ? 'ok' : 'warn',
    );

    // Re-render main canvas if this is the active frame
    if (frameIndex === project.activeFrameIndex) {
      renderCurrentFrame();
    }

    inspector.update(project, project.activeFrameIndex, validation);

    const shortKey = imageKey.length > 20 ? imageKey.slice(0, 18) + '…' : imageKey;
    status.ready(`Assigned "${shortKey}" → frame ${frameIndex + 1}`);
    toasts.success('Image Assigned', `"${shortKey}" assigned to frame ${frameIndex + 1}`);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function renderCurrentFrame() {
    if (!project.isLoaded) return;

    const canvasW = canvasAreaEl.clientWidth  - 32;
    const canvasH = canvasAreaEl.clientHeight - 64;
    const exp     = project.exportConfig;
    const aspect  = exp.height_px / exp.width_px;

    let displayW = canvasW;
    let displayH = canvasW * aspect;
    if (displayH > canvasH) {
      displayH = canvasH;
      displayW = canvasH / aspect;
    }
    displayW = Math.floor(Math.max(displayW, 100));
    displayH = Math.floor(Math.max(displayH, 100));

    const result = renderer.renderFrame(mainCanvas, project.activeFrameIndex, project, {
      scaleFactor:   1,
      displayWidth:  displayW,
      displayHeight: displayH,
      safeZone:      renderer.showSafeZone,
    });

    if (!result.ok) {
      status.error(`Render error: ${result.error}`);
      filmstrip.setStatus(project.activeFrameIndex, 'error');
    } else {
      filmstrip.setStatus(project.activeFrameIndex, project.getFrameImageStatus(project.activeFrameIndex) === 'ok' ? 'ok' : 'warn');
    }
  }

  async function doPreviewAll() {
    if (!project.isLoaded) return;
    status.working('Rendering all thumbnails…');

    await filmstrip.renderAll(project, (i) => {
      filmstrip.setStatus(i, project.getFrameImageStatus(i) === 'ok' ? 'ok' : 'warn');
    });

    appState = AppState.PREVIEW_READY;
    status.ready('All frames previewed');
    toasts.success('Preview Complete', `${project.frameCount} frame(s) rendered.`);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function doExportFrame(frameIndex) {
    if (!project.isLoaded) return;

    status.working(`Exporting frame ${frameIndex + 1}…`);
    const result = await exportFrame(frameIndex, project, (msg) => status.working(msg));

    if (result.ok) {
      appState = AppState.EXPORT_DONE;
      status.ready(`Exported: ${result.filename}`);
      toasts.success('Export Complete', result.filename);
    } else {
      status.error(`Export failed: ${result.error}`);
      toasts.error('Export Failed', result.error);
    }
  }

  async function doExportAll() {
    if (!project.isLoaded) return;

    progress.show(`Exporting ${project.frameCount} frames…`);
    const { exported, failed, errors } = await exportAllFrames(
      project,
      (i, total, msg) => {
        progress.update(i, total, msg);
        status.working(msg);
      },
      (i, result) => {
        filmstrip.setStatus(i, result.ok ? 'ok' : 'error');
      },
    );
    progress.hide();

    appState = AppState.EXPORT_DONE;

    if (failed === 0) {
      status.ready(`Exported ${exported} frame(s)`);
      toasts.success('Export Complete', `${exported} frame(s) downloaded.`);
    } else {
      status.error(`Exported ${exported}, failed ${failed}`);
      toasts.warning('Export Partial', `${exported} succeeded, ${failed} failed. Check console.`);
    }
  }

  // ── Safe zone toggle ──────────────────────────────────────────────────────

  function toggleSafeZone() {
    renderer.showSafeZone = !renderer.showSafeZone;
    prefs.safe_zone_visible = renderer.showSafeZone;
    storage.savePrefs(prefs);
    updateToolbarState(tb, project.isLoaded, renderer.showSafeZone, renderer.showLayerBounds);

    if (project.isLoaded) renderCurrentFrame();
    status.set(`Safe zone: ${renderer.showSafeZone ? 'ON' : 'OFF'}`, 'info', 2000);
  }

  function toggleLayersPanel() {
    renderer.showLayerBounds = !renderer.showLayerBounds;
    prefs.layers_visible = renderer.showLayerBounds;
    storage.savePrefs(prefs);
    updateToolbarState(tb, project.isLoaded, renderer.showSafeZone, renderer.showLayerBounds);

    if (renderer.showLayerBounds && project.isLoaded) {
      const frame = project.data.frames[project.activeFrameIndex];
      layersPanel.render(frame);
      layersPanel.setSelectedId(renderer.selectedLayerId);
      layersPanel.show();
    } else {
      layersPanel.hide();
    }

    if (project.isLoaded) renderCurrentFrame();
    status.set(`Layers: ${renderer.showLayerBounds ? 'ON' : 'OFF'}`, 'info', 2000);
  }

  // ── Clear project ─────────────────────────────────────────────────────────

  async function doClearProject() {
    if (!project.isLoaded) return;

    const confirmed = await showConfirm(
      'Clear Project',
      `Remove "${project.data.project.title}" and all stored images from local storage?`,
      'Clear',
      true,
    );

    if (!confirmed) return;

    storage.deleteProject(project.id);
    project.clear();
    renderer.selectedLayerId = null;
    textToolbar.hide();
    shapeToolbar.hide();
    imageToolbar.hide();
    overlayToolbar.hide();
    layersPanel.hide();
    filmstrip.clear();
    inspector.clear();
    imageTray.clear();
    showEmptyState();
    updateToolbarState(tb, false, false, false);
    if (tb.projectTitle) tb.projectTitle.textContent = '';

    prefs.last_project_id = null;
    storage.savePrefs(prefs);

    appState = AppState.EMPTY;
    status.set('Project cleared.', 'info', 3000);
    toasts.info('Project Cleared', 'All project data removed from local storage.');
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  function showEmptyState() {
    canvasWrapEl.style.display = 'none';
    document.getElementById('canvas-nav').style.display = 'none';

    // Show empty state message in canvas area
    let emptyEl = canvasAreaEl.querySelector('.canvas-empty-state');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'canvas-empty-state';
      emptyEl.innerHTML = `
        <div class="empty-icon">🖼</div>
        <h2>No Project Loaded</h2>
        <p>Click <strong>Load JSON</strong> in the toolbar or drag a .json file into the window to get started.</p>
        <div style="margin-top: 8px; font-size: 11px; color: var(--color-text-secondary);">
          <kbd>←</kbd> <kbd>→</kbd> Navigate &nbsp;
          <kbd>E</kbd> Export &nbsp;
          <kbd>Z</kbd> Safe zone &nbsp;
          <kbd>R</kbd> Re-render
        </div>
      `;
      canvasAreaEl.appendChild(emptyEl);
    }
    emptyEl.style.display = '';
  }

  function hideEmptyState() {
    canvasWrapEl.style.display = '';
    document.getElementById('canvas-nav').style.display = '';
    const emptyEl = canvasAreaEl.querySelector('.canvas-empty-state');
    if (emptyEl) emptyEl.style.display = 'none';
  }

  function fitCanvas() {
    if (!project.isLoaded || !mainCanvas.width) return;
    renderer.fitCanvasToContainer(mainCanvas, canvasAreaEl);
  }

  function updateNavButtons() {
    const prevBtn = document.getElementById('btn-prev-frame');
    const nextBtn = document.getElementById('btn-next-frame');
    const indicator = document.getElementById('canvas-frame-indicator');

    if (prevBtn) prevBtn.disabled = project.activeFrameIndex <= 0;
    if (nextBtn) nextBtn.disabled = project.activeFrameIndex >= project.frameCount - 1;
    if (indicator) {
      const frame = project.activeFrame;
      indicator.textContent = frame
        ? `${project.activeFrameIndex + 1} / ${project.frameCount}  ·  ${frame.id}`
        : '';
    }
  }

  function showJSONError(msg) {
    canvasWrapEl.style.display = 'none';
    let emptyEl = canvasAreaEl.querySelector('.canvas-empty-state');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'canvas-empty-state';
      canvasAreaEl.appendChild(emptyEl);
    }
    emptyEl.style.display = '';
    emptyEl.innerHTML = `
      <div class="empty-icon">⚠</div>
      <h2>JSON Error</h2>
      <p style="color: var(--color-error); font-size: 13px;">${escHtml(msg)}</p>
    `;
  }

  function showValidationErrors(errors, warnings) {
    canvasWrapEl.style.display = 'none';
    let emptyEl = canvasAreaEl.querySelector('.canvas-empty-state');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'canvas-empty-state';
      canvasAreaEl.appendChild(emptyEl);
    }
    emptyEl.style.display = '';
    emptyEl.innerHTML = `
      <div class="empty-icon">⚠</div>
      <h2>Validation Failed</h2>
      <div class="error-panel" style="text-align:left; max-width:400px;">
        <div class="error-panel-title">${errors.length} error(s)</div>
        <ul class="error-panel-list">
          ${errors.map((e) => `<li>${escHtml(e)}</li>`).join('')}
        </ul>
      </div>
      ${warnings.length > 0 ? `<p style="font-size:11px; color:var(--color-warning);">${warnings.length} warning(s) — fix errors above first.</p>` : ''}
    `;
  }
}

function updateActiveBriefLabel(el, title) {
  if (!el) return;
  if (!title) {
    el.classList.remove('visible');
    return;
  }
  const truncated = title.length > 24 ? title.slice(0, 24) + '\u2026' : title;
  const titleEl = el.querySelector('#active-brief-title');
  if (titleEl) titleEl.textContent = truncated;
  el.classList.add('visible');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error('[app] Fatal init error:', err);
    document.body.innerHTML = `
      <div style="color:#ff7070;padding:40px;font-family:monospace;background:#111;min-height:100vh;">
        <h2>FrameForge failed to start</h2>
        <pre>${err.stack ?? err.message}</pre>
      </div>
    `;
  });
});
