/**
 * concept-builder.js — "New Project" 5-step wizard.
 *
 * Step 1: Title & Story
 * Step 2: Tone & Style
 * Step 3: Import Images (file picker → onImages callback → tray)
 * Step 4: Export Package (project file .txt + 3 mockup PNGs + thumbnail sheets)
 * Step 5: Copy Prompt
 */

import { AI_MANUAL } from '../data/ai-manual-content.js';
import { generateMockups, generateShapeSamples } from './brief-mockups.js';
import {
  THUMB_BASE, THUMB_COLS, THUMB_ROWS,
  fileToImageElement, generateThumbnailSheets,
} from './brief-thumbnails.js';
import * as briefStorage from '../modules/brief-storage.js';

// ── Platform presets (keep in sync with brief-mockups.js) ────────────────────

const PLATFORMS = [
  { value: 'instagram-portrait', label: 'Instagram Portrait 4:5 (1080×1350)', w: 1080, h: 1350, dpi: 72  },
  { value: 'instagram-square',   label: 'Instagram Square 1:1 (1080×1080)',   w: 1080, h: 1080, dpi: 72  },
  { value: 'instagram-story',    label: 'Instagram Story 9:16 (1080×1920)',   w: 1080, h: 1920, dpi: 72  },
  { value: 'facebook-feed',      label: 'Facebook Feed (1200×630)',            w: 1200, h:  630, dpi: 72  },
  { value: 'facebook-cover',     label: 'Facebook Cover (820×312)',            w:  820, h:  312, dpi: 72  },
  { value: 'print-a4-portrait',  label: 'Print A4 Portrait (2480×3508)',       w: 2480, h: 3508, dpi: 300 },
  { value: 'print-a4-landscape', label: 'Print A4 Landscape (3508×2480)',      w: 3508, h: 2480, dpi: 300 },
  { value: 'custom',             label: 'Custom…',                             w: null, h: null, dpi: 72  },
];

const TONES = [
  { value: '',                   label: '— Let the AI decide —' },
  { value: 'warm-poetic',        label: 'Warm & poetic — editorial captions, intimate' },
  { value: 'bold-documentary',   label: 'Bold & documentary — strong statements, activist' },
  { value: 'minimal-clean',      label: 'Minimal & clean — sparse text, let the photo speak' },
  { value: 'dramatic-cinematic', label: 'Dramatic & cinematic — high contrast, epic scale' },
  { value: 'luxury-refined',     label: 'Luxury & refined — elegant, understated, fine art' },
  { value: 'custom',             label: 'Custom…' },
];

// Aspect ratio presets for thumbnail sheets
const THUMB_RATIOS = [
  { value: '1x1', label: '1×1', w: 1, h: 1 },
  { value: '4x5', label: '4×5', w: 4, h: 5 },
  { value: '2x3', label: '2×3', w: 2, h: 3 },
  { value: 'custom', label: 'Custom…', w: null, h: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}

// ── ConceptBuilder ────────────────────────────────────────────────────────────

/**
 * Builds a markdown image-map string mapping 1-based image numbers to filenames.
 * @param {string[]} names  Original filenames in load order (same as thumbnail sheet order).
 * @param {string}   slug   Project slug for the document title.
 * @returns {string} Markdown table string.
 */
function generateImageMapMarkdown(names, slug) {
  const rows = names.map((name, i) => `| ${i + 1} | ${name} |`).join('\n');
  return `# Image Map — ${slug}\n\n| # | Filename |\n|---|----------|\n${rows}\n`;
}

export class ConceptBuilder {
  constructor() {
    this._backdrop            = null;
    this._step                = 1;
    this._onImages            = null;
    this._onKeyDown           = null;
    this._briefId             = null;
    this._onOpenBriefManager  = null;

    // Step 1 state
    this._title    = '';
    this._platform = 'instagram-portrait';
    this._customW  = '';
    this._customH  = '';
    this._story    = '';
    this._notes    = '';

    // Step 2 state
    this._tone       = '';
    this._toneCustom = '';

    // Step 3 state
    this._imageFiles    = [];   // File[]
    this._imageElements = [];   // HTMLImageElement[]
    this._previewUrls   = [];   // object URLs for in-wizard preview grid
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);
  }

  /**
   * Set callback invoked when user clicks "My Briefs" header link.
   * @param {function(): void} cb
   */
  setOnOpenBriefManager(cb) {
    this._onOpenBriefManager = cb;
  }

  /**
   * Open the wizard.
   * @param {function(File[]): void} onImages  — called when the user selects images;
   *   forward to app's handleImageFiles to populate the Image Tray.
   */
  open(onImages, briefId = null, startStep = 1) {
    if (this._backdrop) return;

    // Reset state
    this._step          = startStep;
    this._onImages      = onImages ?? null;
    this._briefId       = null;
    this._title         = '';
    this._platform      = 'instagram-portrait';
    this._customW       = '';
    this._customH       = '';
    this._story         = '';
    this._notes         = '';
    this._tone          = '';
    this._toneCustom    = '';
    this._imageFiles    = [];
    this._imageElements = [];
    this._previewUrls   = [];
    this._thumbRatioVal = '1x1';
    this._thumbCustomW  = String(THUMB_BASE);
    this._thumbCustomH  = String(THUMB_BASE);

    // Pre-fill from saved brief if briefId provided
    if (briefId) {
      const saved = briefStorage.load(briefId);
      if (saved) {
        this._briefId       = saved.id;
        this._title         = saved.title         ?? '';
        this._platform      = saved.platform      ?? 'instagram-portrait';
        this._customW       = saved.customW        ?? '';
        this._customH       = saved.customH        ?? '';
        this._story         = saved.story          ?? '';
        this._notes         = saved.notes          ?? '';
        this._tone          = saved.tone           ?? '';
        this._toneCustom    = saved.toneCustom     ?? '';
        this._thumbRatioVal = saved.thumbRatioVal  ?? '1x1';
        this._thumbCustomW  = saved.thumbCustomW   ?? String(THUMB_BASE);
        this._thumbCustomH  = saved.thumbCustomH   ?? String(THUMB_BASE);
      }
    }

    this._render();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _render() {
    const STEP_LABELS = ['Title', 'Tone', 'Images', 'Export', 'Prompt'];

    const progressDots = STEP_LABELS.map((label, i) => {
      const num   = i + 1;
      const state = num < this._step ? 'done' : num === this._step ? 'active' : '';
      return `
        ${i > 0 ? '<div class="cb-wizard-connector"></div>' : ''}
        <div class="cb-wizard-step-dot ${state}" data-step="${num}"></div>
        <span class="cb-wizard-step-label ${state}">${label}</span>
      `;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop cb-backdrop';
    backdrop.innerHTML = `
      <div class="cb-modal" role="dialog" aria-modal="true" aria-label="New Project">

        <div class="cb-header">
          <div class="cb-header-left">
            <span class="cb-title">New Project</span>
            <span class="cb-subtitle">Fill this in, then share the exported package + your photos with the AI model</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm cb-my-briefs-link" style="font-size:12px">≡ My Projects</button>
            <button class="btn btn-ghost btn-icon cb-close" aria-label="Close">✕</button>
          </div>
        </div>

        <div class="cb-wizard-progress">${progressDots}</div>

        <div class="cb-body">
          ${this._renderStep1()}
          ${this._renderStep2()}
          ${this._renderStep3()}
          ${this._renderStep4()}
          ${this._renderStep5()}
        </div>

        <div class="cb-wizard-footer">
          <button class="btn btn-ghost" id="cb-back"
            ${this._step === 1 ? 'style="visibility:hidden"' : ''}>← Back</button>
          <div id="cb-step-indicator" style="font-size:11px;color:var(--color-text-muted)">
            Step ${this._step} of 5
          </div>
          ${this._step < 5
            ? `<button class="btn btn-primary cb-wizard-next" id="cb-next"
                ${this._step === 1 && !this._title.trim() ? 'disabled' : ''}>Next →</button>`
            : `<button class="btn btn-ghost" id="cb-close-final">Close</button>`
          }
        </div>

      </div>
    `;

    this._backdrop = backdrop;
    document.body.appendChild(backdrop);
    this._activateStep(this._step);
    this._bindEvents();
    setTimeout(() => backdrop.querySelector('#cb-title')?.focus(), 60);
  }

  _activateStep(step) {
    if (!this._backdrop) return;
    this._backdrop.querySelectorAll('.cb-step').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
  }

  _renderStep1() {
    const slug = this._title ? toSlug(this._title) : '';
    return `
      <div class="cb-step ${this._step === 1 ? 'active' : ''}" data-step="1">
        <div class="cb-field">
          <label class="cb-label" for="cb-title">Title <span class="cb-required">*</span></label>
          <input type="text" id="cb-title" class="input cb-input"
            placeholder="e.g. Family Moments — Patagonia Trip"
            value="${escHtml(this._title)}" autocomplete="off">
          <div class="cb-field-hint" id="cb-slug-preview">${slug ? `ID: ${slug}` : 'ID: —'}</div>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-platform">Platform <span class="cb-required">*</span></label>
          <select id="cb-platform" class="input cb-input cb-select">
            ${PLATFORMS.map((p) => `<option value="${p.value}"
              ${p.value === this._platform ? 'selected' : ''}>${escHtml(p.label)}</option>`).join('')}
          </select>
        </div>

        <div class="cb-field cb-custom-dims ${this._platform === 'custom' ? '' : 'hidden'}" id="cb-custom-dims">
          <label class="cb-label">Custom size (px)</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="number" id="cb-custom-w" class="input cb-input"
              placeholder="Width" min="1" style="flex:1" value="${escHtml(this._customW)}">
            <span class="cb-dim-sep">×</span>
            <input type="number" id="cb-custom-h" class="input cb-input"
              placeholder="Height" min="1" style="flex:1" value="${escHtml(this._customH)}">
          </div>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-story">What is this about?</label>
          <textarea id="cb-story" class="input cb-input cb-textarea" rows="4"
            placeholder="e.g. A trip to Patagonia with my family — three generations, the mountains, the horses.">${escHtml(this._story)}</textarea>
        </div>

        <div class="cb-field">
          <label class="cb-label" for="cb-notes">Additional notes for the AI <span class="cb-optional">(optional)</span></label>
          <textarea id="cb-notes" class="input cb-input cb-textarea" rows="2"
            placeholder="e.g. Keep text overlays minimal. Use the mountains as the visual anchor.">${escHtml(this._notes)}</textarea>
        </div>
      </div>
    `;
  }

  _renderStep2() {
    return `
      <div class="cb-step ${this._step === 2 ? 'active' : ''}" data-step="2">
        <div class="cb-field">
          <label class="cb-label" for="cb-tone">Text &amp; tone style</label>
          <select id="cb-tone" class="input cb-input cb-select">
            ${TONES.map((t) => `<option value="${t.value}"
              ${t.value === this._tone ? 'selected' : ''}>${escHtml(t.label)}</option>`).join('')}
          </select>
        </div>

        <div class="cb-field ${this._tone === 'custom' ? '' : 'hidden'}" id="cb-custom-tone-wrap">
          <label class="cb-label" for="cb-tone-custom">Describe the tone</label>
          <input type="text" id="cb-tone-custom" class="input cb-input"
            placeholder="e.g. Intimate and nostalgic, like a letter to the future"
            value="${escHtml(this._toneCustom)}">
        </div>
      </div>
    `;
  }

  _renderStep3() {
    const count = this._imageFiles.length;
    const { thumbW, thumbH } = this._thumbDimensions();

    const previewGrid = this._previewUrls.length > 0
      ? `<div class="cb-preview-grid">
           ${this._previewUrls.map((url, i) =>
             `<img class="cb-preview-thumb" src="${url}" alt="Image ${i + 1}" title="Image ${i + 1}">`
           ).join('')}
         </div>`
      : '';

    return `
      <div class="cb-step ${this._step === 3 ? 'active' : ''}" data-step="3">
        <div class="cb-import-zone" id="cb-import-zone">
          ${count > 0
            ? `${previewGrid}
               <div class="cb-import-count">${count} image${count !== 1 ? 's' : ''} loaded</div>
               <div class="cb-import-meta">Drop more images here or click Add Images to append.</div>
               <button class="btn btn-ghost btn-sm" id="cb-clear-images">Clear all</button>`
            : `<div class="cb-import-empty-icon">🖼</div>
               <div class="cb-import-empty-text">Drop images here or click Add Images</div>`
          }
          <button class="btn btn-primary" id="cb-add-images">+ Add Images</button>
          <input type="file" id="cb-file-input" multiple accept="image/*"
            style="display:none" aria-hidden="true">
        </div>

        <div class="cb-field">
          <label class="cb-label">Thumbnail aspect ratio</label>
          <div class="cb-ratio-row">
            ${THUMB_RATIOS.map((r) => `
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                <input type="radio" name="cb-thumb-ratio" value="${r.value}"
                  ${r.value === this._thumbRatioVal ? 'checked' : ''}>
                ${escHtml(r.label)}
              </label>
            `).join('')}
          </div>
          <div class="cb-ratio-custom ${this._thumbRatioVal === 'custom' ? '' : 'hidden'}" id="cb-ratio-custom-wrap">
            <input type="number" id="cb-thumb-cw" class="input cb-input"
              placeholder="W" min="1" style="width:64px" value="${escHtml(this._thumbCustomW)}">
            <span>×</span>
            <input type="number" id="cb-thumb-ch" class="input cb-input"
              placeholder="H" min="1" style="width:64px" value="${escHtml(this._thumbCustomH)}">
            <span style="font-size:11px;color:var(--color-text-muted)">px</span>
          </div>
          <div class="cb-field-hint" id="cb-thumb-hint">
            Each thumbnail: ${thumbW}×${thumbH}px · Sheet: ${THUMB_COLS * thumbW}×${THUMB_ROWS * thumbH}px
            · ${THUMB_COLS * THUMB_ROWS} images per sheet
          </div>
        </div>
      </div>
    `;
  }

  _renderStep4() {
    return `
      <div class="cb-step ${this._step === 4 ? 'active' : ''}" data-step="4">
        <div style="text-align:center;padding:var(--space-7) 0;">
          <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:var(--space-6)">
            Downloads everything the AI model needs in one click:
          </p>
          <ul style="list-style:none;font-size:12px;color:var(--color-text-secondary);margin-bottom:var(--space-8);line-height:1.9;text-align:left;display:inline-block;">
            <li>📄 <strong>Project File</strong> — project description + AI generation manual (.txt)</li>
            <li>🖼 <strong>3 Sample Designs</strong> — layout mockups for your platform (.png)</li>
            <li>🎨 <strong>3 Shape Samples</strong> — decorative layer reference (image_mask, polyline, path) (.png)</li>
            <li>🗂 <strong>Thumbnail Sheets</strong> — all images grouped by ${THUMB_COLS * THUMB_ROWS} (.png)</li>
          </ul>
          <br>
          <button class="btn btn-primary" id="cb-export-package" style="min-width:180px">
            Export Package
          </button>
          <div class="cb-export-status" id="cb-export-status"></div>
        </div>
      </div>
    `;
  }

  _renderStep5() {
    return `
      <div class="cb-step ${this._step === 5 ? 'active' : ''}" data-step="5">
        <div style="text-align:center;padding:var(--space-7) 0;">
          <p class="cb-prompt-hint">
            Copy this prompt and paste it into your AI session.<br>
            Attach the exported files (project file + designs + thumbnails) along with it.
          </p>
          <br>
          <button class="btn btn-primary" id="cb-copy" style="min-width:180px">
            Copy Prompt
          </button>
          <div class="cb-copy-done" id="cb-copy-done"></div>
        </div>
      </div>
    `;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _goTo(step) {
    if (step < 1 || step > 5) return;
    this._autoSave();   // capture current step data before tearing down DOM
    this._step = step;
    this._close(true);  // remove DOM but preserve state
    this._render();     // re-render from current state
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  _bindEvents() {
    const b = this._backdrop;

    // Close
    b.querySelector('.cb-close').addEventListener('click', () => this._close());
    b.querySelector('#cb-close-final')?.addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });

    // My Briefs header link
    b.querySelector('.cb-my-briefs-link')?.addEventListener('click', () => {
      this._close();
      this._onOpenBriefManager?.();
    });
    document.addEventListener('keydown', this._onKeyDown = (e) => {
      if (e.key === 'Escape') this._close();
    });

    // Navigation
    b.querySelector('#cb-back')?.addEventListener('click', () => this._goTo(this._step - 1));
    b.querySelector('#cb-next')?.addEventListener('click', () => this._goTo(this._step + 1));

    // Step 1 — sync fields
    b.querySelector('#cb-title')?.addEventListener('input', (e) => {
      this._title = e.target.value;
      const slug = toSlug(this._title);
      const el = b.querySelector('#cb-slug-preview');
      if (el) el.textContent = slug ? `ID: ${slug}` : 'ID: —';
      const nextBtn = b.querySelector('#cb-next');
      if (nextBtn) nextBtn.disabled = !this._title.trim();
      this._autoSave();
    });
    b.querySelector('#cb-platform')?.addEventListener('change', (e) => {
      this._platform = e.target.value;
      b.querySelector('#cb-custom-dims')?.classList.toggle('hidden', this._platform !== 'custom');
    });
    b.querySelector('#cb-custom-w')?.addEventListener('input', (e) => { this._customW = e.target.value; });
    b.querySelector('#cb-custom-h')?.addEventListener('input', (e) => { this._customH = e.target.value; });
    b.querySelector('#cb-story')?.addEventListener('input', (e) => { this._story = e.target.value; });
    b.querySelector('#cb-notes')?.addEventListener('input',  (e) => { this._notes = e.target.value; });

    // Step 2 — sync fields
    b.querySelector('#cb-tone')?.addEventListener('change', (e) => {
      this._tone = e.target.value;
      b.querySelector('#cb-custom-tone-wrap')?.classList.toggle('hidden', this._tone !== 'custom');
    });
    b.querySelector('#cb-tone-custom')?.addEventListener('input', (e) => { this._toneCustom = e.target.value; });

    // Steps 3-5 — bound separately (stubs for now, filled in Task 4)
    this._bindStep3Events();
    this._bindStep4Events();
    this._bindStep5Events();
  }

  // ── Step event bindings ────────────────────────────────────────────────────

  _bindStep3Events() {
    const b          = this._backdrop;
    const importZone = b.querySelector('#cb-import-zone');
    const addBtn     = b.querySelector('#cb-add-images');
    const fileInput  = b.querySelector('#cb-file-input');
    const clearBtn   = b.querySelector('#cb-clear-images');

    // File picker
    addBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'));
      e.target.value = '';
      if (files.length) this._processFiles(files);
    });

    // Clear
    clearBtn?.addEventListener('click', () => {
      this._previewUrls.forEach((u) => URL.revokeObjectURL(u));
      this._previewUrls   = [];
      this._imageFiles    = [];
      this._imageElements = [];
      this._goTo(3);
    });

    // Drag and drop
    importZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      importZone.classList.add('dragover');
    });
    importZone?.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      if (!importZone.contains(e.relatedTarget)) {
        importZone.classList.remove('dragover');
      }
    });
    importZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      importZone.classList.remove('dragover');
      const files = [...(e.dataTransfer.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) this._processFiles(files);
    });

    // Thumbnail ratio selector
    b.querySelectorAll('input[name="cb-thumb-ratio"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this._thumbRatioVal = e.target.value;
        b.querySelector('#cb-ratio-custom-wrap')?.classList.toggle('hidden', this._thumbRatioVal !== 'custom');
        this._updateThumbHint();
      });
    });
    b.querySelector('#cb-thumb-cw')?.addEventListener('input', (e) => {
      this._thumbCustomW = e.target.value;
      this._updateThumbHint();
    });
    b.querySelector('#cb-thumb-ch')?.addEventListener('input', (e) => {
      this._thumbCustomH = e.target.value;
      this._updateThumbHint();
    });
  }

  _updateThumbHint() {
    const { thumbW, thumbH } = this._thumbDimensions();
    const hint = this._backdrop?.querySelector('#cb-thumb-hint');
    if (hint) {
      hint.textContent = `Each thumbnail: ${thumbW}×${thumbH}px · Sheet: ${THUMB_COLS * thumbW}×${THUMB_ROWS * thumbH}px · ${THUMB_COLS * THUMB_ROWS} images per sheet`;
    }
  }

  _bindStep4Events() {
    const b = this._backdrop;
    b.querySelector('#cb-export-package')?.addEventListener('click', () => this._doExportPackage());
  }

  async _doExportPackage() {
    const b      = this._backdrop;
    const btn    = b?.querySelector('#cb-export-package');
    const status = b?.querySelector('#cb-export-status');

    if (!btn || !status) return;

    btn.disabled = true;
    const { slug, platformObj } = this._readFields();
    let fileCount = 0;
    let sheetCount = 0;

    const setStatus = (msg) => { if (status) status.textContent = msg; };

    try {
      // 1 — Brief text
      setStatus('Generating project file…');
      await yieldToUI();
      const briefText = this._buildBrief();
      const briefBlob = new Blob([briefText], { type: 'text/plain;charset=utf-8' });
      triggerDownload(briefBlob, `frameforge-brief-${slug}.txt`);
      fileCount++;
      await new Promise((r) => setTimeout(r, 300));

      // 2 — Sample design mockups
      setStatus('Generating sample designs…');
      await yieldToUI();
      const mockupBlobs = await generateMockups(platformObj);
      for (let i = 0; i < mockupBlobs.length; i++) {
        triggerDownload(mockupBlobs[i], `${slug}-sample-${i + 1}.png`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }

      // 3 — Shape sample mockups
      setStatus('Generating shape samples…');
      await yieldToUI();
      const shapeBlobs = await generateShapeSamples();
      for (let i = 0; i < shapeBlobs.length; i++) {
        triggerDownload(shapeBlobs[i], `${slug}-shapes-${i + 1}.png`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }

      // 4 — Thumbnail sheets (only if images were loaded)
      if (this._imageElements.length > 0) {
        setStatus('Generating thumbnail sheets…');
        await yieldToUI();
        const { thumbW, thumbH } = this._thumbDimensions();
        const names = this._imageFiles.map(f => f.name);
        const sheetBlobs = await generateThumbnailSheets(this._imageElements, names, thumbW, thumbH);
        for (let i = 0; i < sheetBlobs.length; i++) {
          const sheetNum = String(i + 1).padStart(2, '0');
          triggerDownload(sheetBlobs[i], `${slug}-thumbs-${sheetNum}.png`);
          fileCount++;
          await new Promise((r) => setTimeout(r, 200));
        }
        sheetCount = sheetBlobs.length;

        // 5 — Image map
        setStatus('Generating image map…');
        await yieldToUI();
        const mapMd = generateImageMapMarkdown(names, slug);
        triggerDownload(new Blob([mapMd], { type: 'text/markdown' }), `${slug}-image-map.md`);
        fileCount++;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (sheetCount > 0) {
        status.textContent = `✓ Package exported — project file, designs, shapes, ${sheetCount} thumbnail sheet${sheetCount !== 1 ? 's' : ''}, image map (${fileCount} files)`;
      } else {
        status.textContent = `✓ Package exported — project file, designs, shapes (${fileCount} files)`;
      }
      status.className   = 'cb-export-status done';
    } catch (err) {
      console.error('[ConceptBuilder] Export error:', err);
      status.textContent = `Export failed: ${err.message}`;
      status.className   = 'cb-export-status error';
    } finally {
      btn.disabled = false;
    }
  }

  _bindStep5Events() {
    const b = this._backdrop;
    b.querySelector('#cb-copy')?.addEventListener('click', () => this._doCopyPrompt());
  }

  _doCopyPrompt() {
    const prompt  = this._buildPrompt();
    const doneEl  = this._backdrop?.querySelector('#cb-copy-done');
    const copyBtn = this._backdrop?.querySelector('#cb-copy');

    const show = () => {
      if (doneEl) doneEl.textContent = '✓ Copied! Paste it into your AI session along with the exported files.';
      if (copyBtn) { copyBtn.textContent = '✓ Copied!'; copyBtn.disabled = true; }
      setTimeout(() => {
        if (doneEl) doneEl.textContent = '';
        if (copyBtn) { copyBtn.textContent = 'Copy Prompt'; copyBtn.disabled = false; }
      }, 3000);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(show).catch(() => this._fallbackCopy(prompt, show));
    } else {
      this._fallbackCopy(prompt, show);
    }
  }

  _fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    callback?.();
  }

  // ── Thumbnail dimension helper ──────────────────────────────────────────────

  _thumbDimensions() {
    const preset = THUMB_RATIOS.find((r) => r.value === this._thumbRatioVal);
    if (preset?.w) {
      return { thumbW: THUMB_BASE, thumbH: Math.round(THUMB_BASE * preset.h / preset.w) };
    }
    return {
      thumbW: parseInt(this._thumbCustomW, 10) || THUMB_BASE,
      thumbH: parseInt(this._thumbCustomH, 10) || THUMB_BASE,
    };
  }

  // ── Field reader ────────────────────────────────────────────────────────────

  _readFields() {
    const b = this._backdrop;

    // Sync live values from DOM if backdrop is open
    if (b) {
      this._title      = b.querySelector('#cb-title')?.value.trim()       ?? this._title;
      this._story      = b.querySelector('#cb-story')?.value.trim()       ?? this._story;
      this._notes      = b.querySelector('#cb-notes')?.value.trim()       ?? this._notes;
      this._tone       = b.querySelector('#cb-tone')?.value               ?? this._tone;
      this._toneCustom = b.querySelector('#cb-tone-custom')?.value.trim() ?? this._toneCustom;
    }

    const slug     = toSlug(this._title) || 'untitled-project';
    const today    = new Date().toISOString().slice(0, 10);
    const preset   = PLATFORMS.find((p) => p.value === this._platform);
    let w = preset?.w ?? 1080;
    let h = preset?.h ?? 1350;
    if (this._platform === 'custom') {
      w = parseInt(this._customW, 10) || 1080;
      h = parseInt(this._customH, 10) || 1080;
    }
    const dpi         = preset?.dpi ?? 72;
    const platformObj = { ...preset, w, h, dpi };
    const toneTxt     = this._tone === 'custom'
      ? this._toneCustom
      : (TONES.find((t) => t.value === this._tone)?.label ?? '');
    const toneLine = toneTxt && this._tone
      ? toneTxt.replace(/^— /, '').replace(/ —.*/, '')
      : 'Let the AI decide based on the story and images';

    return {
      title: this._title, slug, today, w, h, dpi, platformObj,
      story: this._story, notes: this._notes,
      tone: this._tone, toneLine,
      imageCount: this._imageFiles.length,
    };
  }

  // ── Brief & prompt builders ─────────────────────────────────────────────────

  _buildBrief() {
    const { title, slug, today, w, h, dpi, platformObj, story, notes, toneLine, imageCount } = this._readFields();
    const platformLabel = platformObj?.label ?? this._platform;

    return `# FrameForge Project File
Generated: ${today}

---

## Project

- **Title:** ${title || '(untitled)'}
- **Project ID:** \`${slug}\`
- **Platform:** ${platformLabel} — ${w}×${h}px (DPI: ${dpi})
- **Total images:** ${imageCount}

---

## Story & Direction

${story || '(no story provided — use the images and title as your guide)'}

**Tone:** ${toneLine}
${notes ? `\n**Additional notes:** ${notes}` : ''}

---

## Images

${imageCount} image${imageCount !== 1 ? 's' : ''} provided alongside this project file.
See the attached thumbnail sheets for a visual reference of all images (grouped by ${THUMB_COLS * THUMB_ROWS}).
Images are numbered 1–${imageCount} in the thumbnail sheets — reference them by number in your JSON (\`image_src: "image-01.jpg"\`, etc.).

---

${AI_MANUAL}

---

## Hard Requirements (non-negotiable)

- \`project.id\` → \`"${slug}"\`
- \`project.version\` → \`"1.0"\`
- \`export.target\` → \`"${this._platform}"\`
- \`export.width_px\` → \`${w}\`, \`export.height_px\` → \`${h}\`, \`export.dpi\` → \`${dpi}\`
- \`export.scale_factor\` → \`2\`
- One frame per image, in the order shown in the thumbnail sheets
- Include \`image_index\` at the top level with one real entry per frame

When generating the JSON, output **only** the raw JSON — no markdown fences, no explanation, no commentary.
`;
  }

  _buildPrompt() {
    const { title, slug, w, h, story, notes, toneLine, imageCount } = this._readFields();
    const platformLabel = PLATFORMS.find((p) => p.value === this._platform)?.label ?? this._platform;

    return `I'm working on a photography project and need you to design FrameForge layouts for it.
I'm attaching:

- The FrameForge project file (full technical instructions for generating the JSON)
- Sample design mockups (layout references — study element sizes and zones)
- Thumbnail sheets showing all ${imageCount} image${imageCount !== 1 ? 's' : ''}

---

**Step 1 — Read and confirm.**
Read the project file and study every thumbnail carefully. Confirm you've done this before proceeding. Do not generate anything yet.

---

**Step 2 — Curation.**
Do not use all images by default. Propose a selection of the strongest frames that together tell a coherent story. For each image you drop, say why. For each you keep, say what role it plays in the narrative. Present this as a numbered list with a proposed sequence. Wait for my approval before continuing.

---

**Step 3 — Ask before assuming.**
Before proposing any concept, ask clarifying questions covering:

- What is the narrative arc? (beginning, middle, end — or another structure)
- What are the key locations, people, or moments and in what order did they happen?
- Who is the audience — personal followers, strangers, or both?
- What is the one thing a stranger should take away from this series?
- What tone? (stats and facts / narrative / minimal / let AI decide)

Ask as questions flow naturally. Do not invent any detail — geographic, narrative, or otherwise — that hasn't been explicitly confirmed.

---

**Step 4 — Concept proposal.**
Present the following for review. Do not generate JSON yet.

- **Color palette:** 2–3 hex colors, names, and roles — derived from the mood and palette of the images themselves
- **Font pairing:** display + sans-serif, and why it fits this specific story
- **Text strategy:** one clear rule for when text appears and when it doesn't — based on the stated tone and audience
- **Per-frame plan:** for each selected image:
  - One line on subject position and negative space
  - One line on proposed text zone, gradient direction, and layer count
  - Exact text content for every text layer — or explicitly "no text"

**Text content rules — always apply:**
- Never describe what is already visible in the image
- Never use poetic language, metaphors, or sentimental phrasing unless explicitly requested
- Facts and stats must come from confirmed sources or information I provide — never invented
- If a fact cannot be verified, ask rather than guess
- Never stack more than two text layers on a single frame unless it is explicitly a milestone or information frame
- The opening frame must be the strongest visual in the series — not necessarily the chronological start

Wait for my approval on the full concept before continuing.

---

**Step 5 — Generate.**
Once the concept is approved, generate the complete FrameForge JSON in one clean pass following the project file exactly. No partial outputs, no placeholder text, no assumed facts.

---

**Project details**

Title: ${title || '(untitled)'}
Project ID: ${slug}
Platform: ${platformLabel} · ${w}×${h}px
Story: ${story || '(no story provided — use the images and title as your guide)'}
Tone: ${toneLine}
Images: ${imageCount} image${imageCount !== 1 ? 's' : ''} — see attached thumbnail sheets${notes ? `\nAdditional notes: ${notes}` : ''}
`;
  }

  _processFiles(newFiles) {
    // Revoke previous preview URLs before creating new ones
    this._previewUrls.forEach((u) => URL.revokeObjectURL(u));
    this._previewUrls = [];

    // Deduplicate: skip files already loaded (matched by name)
    const existingNames = new Set(this._imageFiles.map((f) => f.name));
    const freshFiles = newFiles.filter((f) => !existingNames.has(f.name));

    if (!freshFiles.length) {
      this._goTo(3);
      return;
    }

    // Append fresh files to existing
    this._imageFiles = [...this._imageFiles, ...freshFiles];

    // Create preview object URLs for all current files
    this._previewUrls = this._imageFiles.map((f) => URL.createObjectURL(f));

    // Forward only fresh files to the main app tray
    this._onImages?.(freshFiles);

    // Load only fresh files as image elements, append to existing
    Promise.all(
      freshFiles.map((f) => fileToImageElement(f).catch(() => null))
    ).then((imgs) => {
      this._imageElements = [...this._imageElements, ...imgs.filter(Boolean)];
    });

    this._goTo(3);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  // ── Auto-save ───────────────────────────────────────────────────────────────

  _autoSave() {
    if (!this._title.trim()) return;  // don't save untitled briefs
    const { slug, imageCount } = this._readFields();
    this._briefId = briefStorage.save({
      id:            this._briefId,  // null → save() generates a new id
      title:         this._title,
      slug,
      platform:      this._platform,
      customW:       this._customW,
      customH:       this._customH,
      story:         this._story,
      notes:         this._notes,
      tone:          this._tone,
      toneCustom:    this._toneCustom,
      thumbRatioVal: this._thumbRatioVal,
      thumbCustomW:  this._thumbCustomW,
      thumbCustomH:  this._thumbCustomH,
      imageCount,
    });
  }

  _close(preserveState = false) {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    this._backdrop?.remove();
    this._backdrop = null;
    if (!preserveState) {
      this._previewUrls.forEach((u) => URL.revokeObjectURL(u));
      this._previewUrls   = [];
      this._imageFiles    = [];
      this._imageElements = [];
    }
  }
}
