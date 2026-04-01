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
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose } = {}) {
    this._canvasArea   = canvasArea;
    this._onDeleteZone = onDeleteZone ?? (() => {});
    this._onClearAll   = onClearAll   ?? (() => {});
    this._onClose      = onClose      ?? (() => {});
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
      <div class="balance-panel-body"></div>
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
   * Re-render zone cards.
   * @param {Array} zones  [{id, x, y, w, h, analysis}]
   * @param {boolean} heatmapActive
   */
  update(zones, heatmapActive) {
    if (!this._el) return;
    const clearBtn = this._el.querySelector('.balance-clear-all');
    clearBtn.disabled = zones.length === 0;

    const body = this._el.querySelector('.balance-panel-body');
    body.innerHTML = '';

    if (heatmapActive && zones.length === 0) {
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
      <div class="balance-zone-row"><span>Avg Luminance</span><span>${a.avgLuminance}/100</span></div>
      <div class="balance-zone-row"><span>Contrast</span><span>${escHtml(a.contrastScore)}</span></div>
      <div class="balance-zone-row"><span>Visual Weight</span><span>${a.visualWeight}/10</span></div>
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
          WCAG ratio: ${a.textRec.ratio}:1 &nbsp;
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
