/**
 * inspector.js — Right inspector panel (read-only frame details).
 */

import { getProjectFontStatus } from '../modules/fonts.js';

/** Persists Export section collapsed state across Inspector rebuilds */
let _exportCollapsed = true;

export class Inspector {
  /**
   * @param {HTMLElement} contentEl — #inspector-content
   */
  constructor(contentEl) {
    this.contentEl = contentEl;

    // Toggle Export section in-place without rebuilding the whole inspector
    this.contentEl.addEventListener('click', (e) => {
      if (!e.target.closest('[data-toggle-export]')) return;
      _exportCollapsed = !_exportCollapsed;
      const rows    = this.contentEl.querySelector('[data-export-rows]');
      const summary = this.contentEl.querySelector('[data-export-summary]');
      const chevron = this.contentEl.querySelector('[data-export-chevron]');
      if (rows)    rows.hidden    = _exportCollapsed;
      if (summary) summary.hidden = !_exportCollapsed;
      if (chevron) chevron.textContent = _exportCollapsed ? '▸' : '▾';
    });
  }

  /**
   * Clear the inspector.
   */
  clear() {
    this.contentEl.innerHTML = `
      <div class="inspector-empty">
        <p>Load a project and select a frame to see details here.</p>
      </div>
    `;
  }

  /**
   * Update the inspector for the given frame.
   * @param {object} project — Project instance
   * @param {number} frameIndex
   * @param {{ errors: string[], warnings: string[] }} [validation]
   */
  update(project, frameIndex, validation = { errors: [], warnings: [] }) {
    if (!project.isLoaded) {
      this.clear();
      return;
    }

    const frame   = project.data.frames[frameIndex];
    if (!frame) {
      this.clear();
      return;
    }

    const exp     = project.exportConfig;
    const globals = project.globals;
    const layers  = frame.layers || [];
    const fontStatusMap = getProjectFontStatus(project.data);

    // Fonts referenced by this frame's layers
    const frameFonts = new Set();
    if (globals.font_defaults?.family) frameFonts.add(globals.font_defaults.family);
    for (const layer of layers) {
      if (layer.type === 'text' && layer.font?.family) {
        frameFonts.add(layer.font.family);
      }
      if (layer.type === 'stats_block') {
        for (const item of (layer.items || [])) {
          if (item.value_font?.family) frameFonts.add(item.value_font.family);
          if (item.label_font?.family) frameFonts.add(item.label_font.family);
        }
      }
    }

    // Images referenced by this frame
    const referencedImgs = new Set();
    referencedImgs.add(frame.image_src);
    if (frame.logo?.src) referencedImgs.add(frame.logo.src);
    for (const layer of layers) {
      if (layer.src) referencedImgs.add(layer.src);
    }

    const imageMatchStatus = project.getFrameImageStatus(frameIndex);

    const wfEnabled = frame.white_frame?.enabled ?? false;
    const wfSizePx  = frame.white_frame?.size_px  ?? 20;

    this.contentEl.innerHTML = `
      ${validation.warnings.length > 0 ? `
      <div class="inspector-section inspector-section-warnings">
        <div class="inspector-section-title">Warnings</div>
        <div class="inspector-warning-list">
          ${validation.warnings.map((w) => `<div class="inspector-warning">${escHtml(w)}</div>`).join('')}
        </div>
      </div>` : ''}

      ${validation.errors.length > 0 ? `
      <div class="inspector-section">
        <div class="inspector-section-title">Errors</div>
        <div class="inspector-warning-list">
          ${validation.errors.map((e) => `<div class="inspector-error">${escHtml(e)}</div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Frame info -->
      <div class="inspector-section">
        <div class="inspector-section-title">Frame</div>
        ${row('Index',    `${frameIndex + 1} / ${project.frameCount}`)}
        ${row('ID',       frame.id, true)}
        ${row('Layers',   layers.length)}
        ${row('Bg color', frame.background_color ?? globals.background_color ?? '#000000')}
        <div class="inspector-row">
          <span class="inspector-label">White frame</span>
          <input type="checkbox" id="insp-wf-enabled"
            ${wfEnabled ? 'checked' : ''}
            class="inspector-checkbox">
        </div>
        <div class="inspector-row" id="insp-wf-size-row" ${wfEnabled ? '' : 'hidden'}>
          <span class="inspector-label">&nbsp;&nbsp;└ Size</span>
          <span class="inspector-value">
            <input type="number" id="insp-wf-size"
              value="${wfSizePx}"
              min="1" max="400" step="1"
              class="inspector-number-input"> px
          </span>
        </div>
      </div>

      <!-- Layer types -->
      <div class="inspector-section">
        <div class="inspector-section-title">Layers</div>
        ${renderLayerTypeBadges(layers)}
      </div>

      <!-- Fonts -->
      <div class="inspector-section">
        <div class="inspector-section-title">Fonts</div>
        ${renderFontBadges(frameFonts, fontStatusMap)}
      </div>

      <!-- Images -->
      <div class="inspector-section">
        <div class="inspector-section-title">Images</div>
        ${renderImageStatus(referencedImgs, project, frameIndex)}
      </div>

      <!-- Export — collapsed by default -->
      <div class="inspector-section">
        <div class="inspector-section-title inspector-section-title-toggle" data-toggle-export>
          Export
          <span data-export-chevron>${_exportCollapsed ? '▸' : '▾'}</span>
        </div>
        <div data-export-summary class="inspector-export-summary" ${_exportCollapsed ? '' : 'hidden'}>
          ${escHtml(`${exp.width_px} × ${exp.height_px} · ${(exp.format ?? 'png').toUpperCase()} · ×${exp.scale_factor}`)}
        </div>
        <div data-export-rows ${_exportCollapsed ? 'hidden' : ''}>
          ${row('Target',  exp.target)}
          ${row('Size',    `${exp.width_px} × ${exp.height_px}`)}
          ${row('Scale',   `×${exp.scale_factor}`)}
          ${row('DPI',     exp.dpi)}
          ${row('Format',  (exp.format ?? 'png').toUpperCase())}
        </div>
      </div>

      ${project.data.image_index?.length ? `
      <!-- Image Index -->
      <div class="inspector-section">
        <div class="inspector-section-title">Image Index</div>
        ${renderImageIndex(project.data.image_index, frameIndex)}
      </div>` : ''}
    `;
    this._bindWhiteFrameEvents(project, frameIndex);
  }

  _bindWhiteFrameEvents(project, frameIndex) {
    const cbEl   = this.contentEl.querySelector('#insp-wf-enabled');
    const sizeEl = this.contentEl.querySelector('#insp-wf-size');
    const sizeRow= this.contentEl.querySelector('#insp-wf-size-row');
    if (!cbEl || !sizeEl) return;

    cbEl.addEventListener('change', () => {
      const enabled = cbEl.checked;
      sizeRow.hidden = !enabled;
      this._applyWhiteFrame(project, frameIndex, { enabled, size_px: parseInt(sizeEl.value, 10) || 20 });
    });

    sizeEl.addEventListener('input', () => {
      const size_px = parseInt(sizeEl.value, 10);
      if (size_px > 0) {
        this._applyWhiteFrame(project, frameIndex, { enabled: true, size_px });
      }
    });
  }

  _applyWhiteFrame(project, frameIndex, wf) {
    const frame = project.data.frames[frameIndex];
    if (!frame) return;
    if (wf.enabled) {
      frame.white_frame = { enabled: true, size_px: wf.size_px };
    } else {
      delete frame.white_frame;
    }
    this.contentEl.dispatchEvent(new CustomEvent('inspector:white-frame-changed', {
      bubbles: true,
      detail: { frameIndex },
    }));
  }

  /**
   * Update font statuses in-place (without full rebuild).
   * @param {object} project
   */
  refreshFontStatus(project) {
    if (!project.isLoaded) return;
    const fontStatusMap = getProjectFontStatus(project.data);
    const badges = this.contentEl.querySelectorAll('[data-font-family]');
    badges.forEach((badge) => {
      const family = badge.dataset.fontFamily;
      const status = fontStatusMap.get(family) || 'unknown';
      badge.className = `inspector-badge ${status}`;
      badge.querySelector('[data-font-status]').textContent = statusIcon(status);
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function row(label, value, mono = false) {
  return `
    <div class="inspector-row">
      <span class="inspector-label">${escHtml(label)}</span>
      <span class="inspector-value ${mono ? 'mono' : ''}" title="${escHtml(String(value ?? '—'))}">${escHtml(String(value ?? '—'))}</span>
    </div>
  `;
}

function renderLayerTypeBadges(layers) {
  if (!layers.length) return '<div class="text-muted text-sm">No layers</div>';

  const typeClasses = {
    image:       'layer-type-image',
    overlay:     'layer-type-overlay',
    text:        'layer-type-text',
    shape:       'layer-type-shape',
    stats_block: 'layer-type-stats',
    logo:        'layer-type-logo',
  };

  // Generic layers counted by type; decorative shape sub-types get individual badges
  const genericCounts = {};
  const specificBadges = [];

  for (const layer of layers) {
    if (layer.type === 'shape') {
      const s = layer.shape;
      if (s === 'polyline') {
        const n = Array.isArray(layer.points) ? layer.points.length : 0;
        specificBadges.push({ label: `Polyline — ${n} pts`, cssClass: 'layer-type-shape' });
      } else if (s === 'path') {
        specificBadges.push({ label: 'Path — bezier', cssClass: 'layer-type-shape' });
      } else if (s === 'image_mask') {
        const name = layer.asset ?? '?';
        specificBadges.push({ label: `Silhouette — ${name}`, cssClass: 'layer-type-shape' });
      } else {
        genericCounts['shape'] = (genericCounts['shape'] ?? 0) + 1;
      }
    } else {
      genericCounts[layer.type] = (genericCounts[layer.type] ?? 0) + 1;
    }
  }

  const genericHtml = Object.entries(genericCounts).map(([type, count]) =>
    `<span class="layer-type-tag ${typeClasses[type] ?? ''}">${escHtml(type)} ×${count}</span>`
  );

  const specificHtml = specificBadges.map(({ label, cssClass }) =>
    `<span class="layer-type-tag ${cssClass}" title="${escHtml(label)}">${escHtml(label)}</span>`
  );

  return `<div class="inspector-badge-list">
    ${[...genericHtml, ...specificHtml].join('')}
  </div>`;
}

function renderFontBadges(families, statusMap) {
  if (families.size === 0) return '<div class="text-muted text-sm">None</div>';
  return `<div class="inspector-badge-list">
    ${[...families].map((family) => {
      const status = statusMap.get(family) || 'unknown';
      return `
        <span class="inspector-badge ${status}" data-font-family="${escHtml(family)}">
          <span data-font-status>${statusIcon(status)}</span>
          ${escHtml(family)}
        </span>
      `;
    }).join('')}
  </div>`;
}

function renderImageStatus(referencedImgs, project, frameIndex) {
  if (referencedImgs.size === 0) return '<div class="text-muted text-sm">None</div>';

  const frame = project.data?.frames?.[frameIndex];

  return `
    <div class="inspector-badge-list" style="flex-direction:column; gap:4px;">
      ${[...referencedImgs].map((filename) => {
        const isBaseSrc    = filename === frame?.image_src;
        const assignedKey  = isBaseSrc ? project.imageAssignments.get(frameIndex) : null;
        const img          = assignedKey
          ? project.imageElements.get(assignedKey)
          : project.imageElements.get(filename);
        const ok = !!img;
        return `
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div class="inspector-row" style="padding:0;">
              <span style="color:${ok ? 'var(--color-success)' : 'var(--color-warning)'}; font-size:10px; flex-shrink:0;">${ok ? '✓' : '⚠'}</span>
              <span class="inspector-value mono" style="max-width:185px;" title="${escHtml(filename)}">${escHtml(filename)}</span>
            </div>
            ${assignedKey ? `
              <div style="font-size:10px; color:var(--color-accent); padding-left:14px; font-family:var(--font-mono);">
                → ${escHtml(assignedKey)}
              </div>` : ''}
            ${isBaseSrc && !assignedKey && !ok ? `
              <div style="font-size:10px; color:var(--color-text-muted); padding-left:14px;">
                drag an image from tray to assign
              </div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function statusIcon(status) {
  return { loaded: '✓', loading: '↻', failed: '✗', unknown: '?' }[status] ?? '?';
}

function renderImageIndex(imageIndex, currentFrameIndex) {
  if (!imageIndex?.length) return '<div class="text-muted text-sm">None</div>';

  return `<div class="image-index-list">
    ${imageIndex.map((entry, i) => {
      const isCurrent = (entry.frame_index != null)
        ? entry.frame_index - 1 === currentFrameIndex
        : false;
      return `
        <div class="image-index-entry${isCurrent ? ' image-index-entry-active' : ''}">
          <div class="image-index-row">
            <span class="image-index-num">${i + 1}</span>
            <span class="image-index-key mono truncate" title="${escHtml(entry.key ?? '')}">${escHtml(entry.key ?? '—')}</span>
            <span class="image-index-frame" title="frame: ${escHtml(entry.frame_id ?? '')}">${escHtml(entry.frame_id ?? '—')}</span>
          </div>
          ${entry.description ? `<div class="image-index-desc">${escHtml(entry.description)}</div>` : ''}
        </div>
      `;
    }).join('')}
  </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
