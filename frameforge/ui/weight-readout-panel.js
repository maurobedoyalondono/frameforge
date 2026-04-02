/**
 * weight-readout-panel.js — Left-side Visual Weight panel for FrameForge.
 *
 * Shows the L/R ↔ T/B heatmap weight split with a "Why" breakdown.
 * Appears when the Weight Heatmap is active. Fully independent of the
 * zones / advisor panel on the right.
 */

export class WeightReadoutPanel {
  /**
   * @param {HTMLElement} canvasArea — #canvas-area element
   * @param {object} [callbacks]
   * @param {function} [callbacks.onClose]
   */
  constructor(canvasArea, { onClose } = {}) {
    this._canvasArea = canvasArea;
    this._onClose    = onClose ?? (() => {});
    this._axis       = 'lr'; // 'lr' | 'tb'
    this._heatmap    = null;
    this._el         = null;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id        = 'weight-readout-panel';
    el.className = 'weight-readout-panel';
    el.setAttribute('aria-label', 'Visual weight readout panel');
    el.style.display = 'none';
    el.innerHTML = `
      <div class="weight-readout-panel-header">
        <span class="weight-readout-panel-title">Visual Weight</span>
        <button class="weight-readout-panel-close" title="Close" aria-label="Close visual weight panel">×</button>
      </div>
      <div class="weight-readout-panel-body"></div>
    `;
    el.querySelector('.weight-readout-panel-close').addEventListener('click', () => this._onClose());
    this._canvasArea.appendChild(el);
    this._el = el;
  }

  setVisible(visible) {
    if (!this._el) return;
    this._el.style.display = visible ? '' : 'none';
  }

  /**
   * @param {{scores:Float32Array,lumaScores:Float32Array,contrastScores:Float32Array,satScores:Float32Array}|null} heatmap
   */
  update(heatmap) {
    if (!this._el) return;
    this._heatmap = heatmap;
    this._render();
  }

  _render() {
    const body = this._el?.querySelector('.weight-readout-panel-body');
    if (!body) return;

    const heatmap = this._heatmap;
    if (!heatmap?.scores) {
      body.innerHTML = '<p class="weight-readout-hint">Enable heatmap to see weight analysis.</p>';
      return;
    }

    const axis     = this._axis;
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
        const idx = row * gridSize + col;
        const inA = axis === 'lr' ? col < gridSize / 2 : row < gridSize / 2;
        if (inA) {
          sumA += scores[idx]; lumaA += lumaS[idx]; contA += contS[idx]; satA += satS[idx]; countA++;
        } else {
          sumB += scores[idx]; lumaB += lumaS[idx]; contB += contS[idx]; satB += satS[idx]; countB++;
        }
      }
    }

    const total    = (sumA + sumB) || 1;
    const pctA     = Math.round((sumA / total) * 100);
    const pctB     = 100 - pctA;
    const heavyIsA = sumA >= sumB;

    const [labelA, labelB] = axis === 'lr' ? ['LEFT', 'RIGHT'] : ['TOP', 'BOTTOM'];
    const heavyLabel       = heavyIsA ? labelA : labelB;

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
          `<div class="balance-why-row"><span>${_e(name)}</span><span class="${val.startsWith('+') ? 'balance-why-pos' : 'balance-why-neg'}">${_e(val)}</span></div>`
        ).join('')
      : `<div class="balance-why-title">Evenly balanced.</div>`;

    body.innerHTML = `
      <div class="balance-axis-toggle" style="margin-bottom:8px">
        <button class="balance-axis-btn${axis === 'lr' ? ' active' : ''}" data-axis="lr" title="Left / Right">L/R ↔</button>
        <button class="balance-axis-btn${axis === 'tb' ? ' active' : ''}" data-axis="tb" title="Top / Bottom">T/B ↕</button>
      </div>
      <div class="balance-weight-bars">
        <div class="balance-weight-bar-row">
          <span class="balance-weight-label">${_e(labelA)}</span>
          <div class="balance-weight-track">
            <div class="balance-weight-fill${heavyIsA ? ' heavy' : ''}" style="width:${pctA}%"></div>
          </div>
          <span class="balance-weight-pct">${pctA}%</span>
        </div>
        <div class="balance-weight-bar-row">
          <span class="balance-weight-label">${_e(labelB)}</span>
          <div class="balance-weight-track">
            <div class="balance-weight-fill${!heavyIsA ? ' heavy' : ''}" style="width:${pctB}%"></div>
          </div>
          <span class="balance-weight-pct">${pctB}%</span>
        </div>
      </div>
      <div class="balance-heavy-label">▲ Heavy: ${_e(heavyLabel)}</div>
      <div class="balance-why">${whyHtml}</div>
    `;

    body.querySelectorAll('.balance-axis-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._axis = btn.dataset.axis;
        this._render();
      });
    });
  }

  destroy() {
    this._el?.remove();
    this._el = null;
  }
}

function _e(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
