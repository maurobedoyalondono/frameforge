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
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose, onMoveHere, onAdvisorLayerChange, onAdvisorModeChange, onWeightAxisChange } = {}) {
    this._canvasArea   = canvasArea;
    this._onDeleteZone = onDeleteZone ?? (() => {});
    this._onClearAll   = onClearAll   ?? (() => {});
    this._onClose      = onClose      ?? (() => {});
    this._onMoveHere           = onMoveHere           ?? (() => {});
    this._onAdvisorLayerChange = onAdvisorLayerChange ?? (() => {});
    this._onAdvisorModeChange  = onAdvisorModeChange  ?? (() => {});
    this._onWeightAxisChange   = onWeightAxisChange   ?? (() => {});
    this._weightAxis           = 'lr'; // 'lr' or 'tb'
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
        <div class="balance-weight-readout" style="display:none"></div>
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
   * Update the visual weight balance readout.
   * @param {{scores:Float32Array,lumaScores:Float32Array,contrastScores:Float32Array,satScores:Float32Array}|null} heatmap
   */
  updateWeightReadout(heatmap) {
    const el = this._el?.querySelector('.balance-weight-readout');
    if (!el) return;

    if (!heatmap?.scores) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';

    const axis     = this._weightAxis;
    const gridSize = 16;
    const scores   = heatmap.scores;
    const lumaS    = heatmap.lumaScores;
    const contS    = heatmap.contrastScores;
    const satS     = heatmap.satScores;

    let sumA = 0, sumB = 0;
    let lumaA = 0, lumaB = 0, contA = 0, contB = 0, satA = 0, satB = 0;
    let countA = 0, countB = 0;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx  = row * gridSize + col;
        const inA  = axis === 'lr' ? col < gridSize / 2 : row < gridSize / 2;
        if (inA) {
          sumA += scores[idx]; lumaA += lumaS[idx]; contA += contS[idx]; satA += satS[idx]; countA++;
        } else {
          sumB += scores[idx]; lumaB += lumaS[idx]; contB += contS[idx]; satB += satS[idx]; countB++;
        }
      }
    }

    const total = (sumA + sumB) || 1;
    const pctA  = Math.round((sumA / total) * 100);
    const pctB  = 100 - pctA;
    const heavyIsA = sumA >= sumB;

    const [labelA, labelB] = axis === 'lr' ? ['LEFT', 'RIGHT'] : ['TOP', 'BOTTOM'];
    const heavyLabel = heavyIsA ? labelA : labelB;

    const avgLA = countA ? lumaA / countA : 0;
    const avgLB = countB ? lumaB / countB : 0;
    const avgCA = countA ? contA / countA : 0;
    const avgCB = countB ? contB / countB : 0;
    const avgSA = countA ? satA  / countA : 0;
    const avgSB = countB ? satB  / countB : 0;

    const [heavyL, lightL] = heavyIsA ? [avgLA, avgLB] : [avgLB, avgLA];
    const [heavyC, lightC] = heavyIsA ? [avgCA, avgCB] : [avgCB, avgCA];
    const [heavyS, lightS] = heavyIsA ? [avgSA, avgSB] : [avgSB, avgSA];

    const lumaDelta = lightL > 0 ? Math.round((heavyL - lightL) / lightL * 100) : 0;
    const contDelta = lightC > 0 ? Math.round((heavyC - lightC) / lightC * 100) : 0;
    const satDelta  = lightS > 0 ? Math.round((heavyS - lightS) / lightS * 100) : 0;

    const fmtDelta = (d) => d === 0 ? null : `${d > 0 ? '+' : ''}${d}%`;

    const whyRows = [
      ['Brightness', fmtDelta(lumaDelta)],
      ['Contrast',   fmtDelta(contDelta)],
      ['Saturation', fmtDelta(satDelta)],
    ].filter(([, v]) => v !== null);

    const whyHtml = whyRows.length > 0
      ? `<div class="balance-why-title">Why:</div>` +
        whyRows.map(([name, val]) =>
          `<div class="balance-why-row"><span>${escHtml(name)}</span><span class="${val.startsWith('+') ? 'balance-why-pos' : 'balance-why-neg'}">${escHtml(val)}</span></div>`
        ).join('')
      : `<div class="balance-why-title">Evenly balanced.</div>`;

    el.innerHTML = `
      <div class="balance-weight-header">
        <span class="balance-weight-title">Visual Weight</span>
        <div class="balance-axis-toggle">
          <button class="balance-axis-btn${axis === 'lr' ? ' active' : ''}" data-axis="lr" title="Left / Right">L/R ↔</button>
          <button class="balance-axis-btn${axis === 'tb' ? ' active' : ''}" data-axis="tb" title="Top / Bottom">T/B ↕</button>
        </div>
      </div>
      <div class="balance-weight-bars">
        <div class="balance-weight-bar-row">
          <span class="balance-weight-label">${escHtml(labelA)}</span>
          <div class="balance-weight-track">
            <div class="balance-weight-fill${heavyIsA ? ' heavy' : ''}" style="width:${pctA}%"></div>
          </div>
          <span class="balance-weight-pct">${pctA}%</span>
        </div>
        <div class="balance-weight-bar-row">
          <span class="balance-weight-label">${escHtml(labelB)}</span>
          <div class="balance-weight-track">
            <div class="balance-weight-fill${!heavyIsA ? ' heavy' : ''}" style="width:${pctB}%"></div>
          </div>
          <span class="balance-weight-pct">${pctB}%</span>
        </div>
      </div>
      <div class="balance-heavy-label">▲ Heavy side: ${escHtml(heavyLabel)}</div>
      <div class="balance-why">${whyHtml}</div>
    `;

    el.querySelectorAll('.balance-axis-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._weightAxis = btn.dataset.axis;
        this._onWeightAxisChange(this._weightAxis);
        this.updateWeightReadout(heatmap);
      });
    });
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
      ${advisorPositions ? `
      <div class="balance-advisor-mode-row">
        <span class="balance-advisor-label">Mode</span>
        <div class="balance-advisor-mode-btns">
          <button class="balance-advisor-mode-btn${advisorMode === 'balance' ? ' active' : ''}" data-mode="balance">● Balance</button>
          <button class="balance-advisor-mode-btn${advisorMode === 'legibility' ? ' active' : ''}" data-mode="legibility">● Legibility</button>
        </div>
      </div>` : ''}
      ${posHtml}
      ${advisorPositions ? `<button class="balance-move-here-btn" ${!advisorLayerId ? 'disabled' : ''}>Move here</button>` : ''}
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
  update(zones, heatmapActive, heatmap = null, advisorState = null) {
    if (!this._el) return;
    const clearBtn = this._el.querySelector('.balance-clear-all');
    clearBtn.disabled = zones.length === 0;

    // Weight readout (top of body, always first)
    this.updateWeightReadout(heatmap);

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
    // Clear only zone cards, preserve the readout and advisor divs
    [...body.children].forEach(child => {
      if (!child.classList.contains('balance-weight-readout') &&
          !child.classList.contains('balance-advisor-card')) {
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
