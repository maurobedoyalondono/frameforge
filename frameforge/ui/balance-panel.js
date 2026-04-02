/**
 * balance-panel.js — Right-side Visual Analysis panel for FrameForge.
 *
 * Shows per-zone analysis cards and heatmap status.
 * Absolutely positioned inside #canvas-area, overlapping the canvas right edge.
 */

export class BalancePanel {
  /**
   * @param {HTMLElement} canvasArea — #canvas-area element
   * @param {object} [callbacks]
   * @param {function} [callbacks.onDeleteZone]  — called with zone id string
   * @param {function} [callbacks.onClearAll]    — called with no args
   * @param {function} [callbacks.onClose]       — called with no args
   */
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose, onMoveHere, onAdvisorLayerChange, onAdvisorModeChange } = {}) {
    this._canvasArea   = canvasArea;
    this._onDeleteZone = onDeleteZone ?? (() => {});
    this._onClearAll   = onClearAll   ?? (() => {});
    this._onClose      = onClose      ?? (() => {});
    this._onMoveHere           = onMoveHere           ?? (() => {});
    this._onAdvisorLayerChange = onAdvisorLayerChange ?? (() => {});
    this._onAdvisorModeChange  = onAdvisorModeChange  ?? (() => {});
    this._el           = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id        = 'balance-panel';
    el.className = 'balance-panel';
    el.setAttribute('aria-label', 'Visual analysis panel');
    el.innerHTML = `
      <div class="balance-panel-header">
        <span class="balance-panel-title">Visual Analysis</span>
        <button class="balance-panel-close" title="Close panel" aria-label="Close visual analysis panel">×</button>
      </div>
      <div class="balance-panel-actions">
        <button class="btn btn-ghost balance-clear-all" disabled>Clear All Zones</button>
      </div>
      <div class="balance-panel-body">
        <div class="balance-advisor-card" style="display:none"></div>
      </div>
    `;
    el.querySelector('.balance-panel-close').addEventListener('click', () => this._onClose());
    el.querySelector('.balance-clear-all').addEventListener('click', () => this._onClearAll());
    this._canvasArea.appendChild(el);
    this._el = el;
  }

  /** Show or hide the panel */
  setVisible(visible) {
    if (!this._el) return;
    this._el.style.display = visible ? '' : 'none';
  }

  /**
   * Update the Element Advisor card.
   * @param {Array} layers — text and shape layers from the active frame
   * @param {string|null} advisorLayerId — currently selected layer id
   * @param {'balance'|'legibility'} advisorMode
   * @param {{balance:{x:number,y:number},legibility:{x:number,y:number}}|null} advisorPositions
   * @param {boolean} advisorActive — whether the advisor checkbox is checked
   */
  updateAdvisorCard(layers, advisorLayerId, advisorMode, advisorPositions, advisorActive) {
    const el = this._el?.querySelector('.balance-advisor-card');
    if (!el) return;

    if (!advisorActive) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';

    const options = layers
      .filter(l => l.type === 'text' || l.type === 'shape')
      .map(l => `<option value="${escHtml(l.id)}"${l.id === advisorLayerId ? ' selected' : ''}>${escHtml(l.label || l.id)}</option>`)
      .join('');

    const posHtml = advisorPositions
      ? `<div class="balance-advisor-positions">
           <div class="balance-advisor-pos-row">
             <span class="balance-advisor-pos-badge balance">B</span>
             <span>x=${Math.round(advisorPositions.balance.x)}&thinsp;px, y=${Math.round(advisorPositions.balance.y)}&thinsp;px</span>
           </div>
           <div class="balance-advisor-pos-row">
             <span class="balance-advisor-pos-badge legibility">L</span>
             <span>x=${Math.round(advisorPositions.legibility.x)}&thinsp;px, y=${Math.round(advisorPositions.legibility.y)}&thinsp;px</span>
           </div>
         </div>`
      : `<div class="balance-advisor-hint">Select a layer to see suggestions.</div>`;

    el.innerHTML = `
      <div class="balance-advisor-header">
        <span class="balance-advisor-title">Element Advisor</span>
      </div>
      <div class="balance-advisor-row">
        <label class="balance-advisor-label" for="balance-advisor-layer-select">Layer</label>
        <select id="balance-advisor-layer-select" class="balance-advisor-select">
          <option value="">— pick a layer —</option>
          ${options}
        </select>
      </div>
      <div class="balance-advisor-mode-row">
        <span class="balance-advisor-label">Mode</span>
        <div class="balance-advisor-mode-btns">
          <button class="balance-advisor-mode-btn${advisorMode === 'balance' ? ' active' : ''}" data-mode="balance">● Balance</button>
          <button class="balance-advisor-mode-btn${advisorMode === 'legibility' ? ' active' : ''}" data-mode="legibility">● Legibility</button>
        </div>
      </div>
      ${posHtml}
      <button class="balance-move-here-btn" ${!advisorLayerId ? 'disabled' : ''}>Move here</button>
    `;

    el.querySelector('#balance-advisor-layer-select')?.addEventListener('change', (e) => {
      this._onAdvisorLayerChange(e.target.value || null);
    });

    el.querySelectorAll('.balance-advisor-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this._onAdvisorModeChange(btn.dataset.mode));
    });

    el.querySelector('.balance-move-here-btn')?.addEventListener('click', () => {
      this._onMoveHere(advisorMode);
    });
  }

  /**
   * Re-render the panel body.
   * @param {Array} zones  [{id, x, y, w, h, analysis}]
   * @param {boolean} heatmapActive
   * @param {object|null} [heatmap] — full heatmap object from buildHeatmap
   * @param {object|null} [advisorState] — { layers, layerId, mode, positions, active }
   */
  update(zones, heatmapActive, advisorState = null) {
    if (!this._el) return;

    // Only show the "Clear All Zones" actions bar when zones exist
    const actionsEl = this._el.querySelector('.balance-panel-actions');
    if (actionsEl) actionsEl.style.display = zones.length > 0 ? '' : 'none';
    const clearBtn = this._el.querySelector('.balance-clear-all');
    if (clearBtn) clearBtn.disabled = zones.length === 0;

    // Advisor card
    if (advisorState) {
      this.updateAdvisorCard(
        advisorState.layers,
        advisorState.layerId,
        advisorState.mode,
        advisorState.positions,
        advisorState.active,
      );
    }

    const body = this._el.querySelector('.balance-panel-body');
    // Clear only zone cards, keep the advisor card div
    [...body.children].forEach(child => {
      if (!child.classList.contains('balance-advisor-card')) {
        child.remove();
      }
    });

    if (heatmapActive && zones.length === 0 && !advisorState?.active) {
      const info = document.createElement('p');
      info.className = 'balance-panel-hint';
      info.textContent = 'Heatmap active — warm cells have high visual weight.';
      body.appendChild(info);
      return;
    }

    for (const zone of zones) {
      body.appendChild(this._buildCard(zone));
    }
  }

  _buildCard(zone) {
    const a    = zone.analysis;
    const card = document.createElement('div');
    card.className = 'balance-zone-card';

    const wcagBadgeClass = a.textRec.level === 'AAA' ? 'badge-pass-aaa'
                         : a.textRec.level === 'AA'  ? 'badge-pass-aa'
                         : 'badge-fail';

    card.innerHTML = `
      <div class="balance-zone-header">
        <span class="balance-zone-name">${escHtml(zone.id)}</span>
        <button class="balance-zone-delete" data-id="${escHtml(zone.id)}" title="Delete zone" aria-label="Delete zone ${escHtml(zone.id)}">×</button>
      </div>
      <div class="balance-zone-row"><span>Avg Luminance</span><span>${escHtml(a.avgLuminance)}/100</span></div>
      <div class="balance-zone-row"><span>Contrast</span><span>${escHtml(a.contrastScore)}</span></div>
      <div class="balance-zone-row"><span>Visual Weight</span><span>${escHtml(a.visualWeight)}/10</span></div>
      <div class="balance-zone-row">
        <span>Dominant</span>
        <span class="balance-swatch-row">
          <span class="balance-swatch" style="background:${escHtml(a.dominantColor)}"></span>
          ${escHtml(a.dominantColor)}
        </span>
      </div>
      <div class="balance-zone-divider"></div>
      <div class="balance-zone-rec">
        <div class="balance-rec-label">Text Recommendation</div>
        <div class="balance-rec-value">
          <span class="balance-swatch" style="background:${escHtml(a.textRec.color)};border:1px solid rgba(255,255,255,0.2)"></span>
          ${escHtml(a.textRec.color === '#ffffff' ? 'White' : 'Black')} ${escHtml(a.textRec.color)}
        </div>
        <div class="balance-rec-row">
          WCAG ratio: ${escHtml(a.textRec.ratio)}:1 &nbsp;
          <span class="balance-badge ${wcagBadgeClass}">${escHtml(a.textRec.level)}</span>
        </div>
        <div class="balance-rec-desc">${escHtml(a.descriptor)}</div>
      </div>
    `;

    card.querySelector('.balance-zone-delete').addEventListener('click', (e) => {
      this._onDeleteZone(e.currentTarget.dataset.id);
    });

    return card;
  }

  destroy() {
    this._el?.remove();
    this._el = null;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
