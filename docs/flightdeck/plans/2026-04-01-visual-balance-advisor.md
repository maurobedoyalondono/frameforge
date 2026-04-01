# Visual Balance Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use flightdeck:subagent-driven-development (recommended) or flightdeck:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Visual Balance Framework with live heatmap updates on drag/resize, an Element Placement Advisor (ghost overlay + "Move here"), and a Visual Weight Balance Readout with L/R ↔ T/B axis toggle and a "Why" breakdown.

**Architecture:** `buildHeatmap()` is extended to return four parallel Float32Arrays (scores + three components). A new `findBestPosition()` pure function computes the two candidate placements using the heatmap scores. Three new renderer props drive a `drawAdvisorGhosts()` overlay. `BalancePanel` gains a weight-readout section and an advisor card. `shell.js` and `components.css` get the new dropdown controls and styles. `app.js` wires heatmap recomputation after drag/resize, wires all new controls, and implements "Move here".

**Tech Stack:** Vanilla ES modules, HTML5 Canvas 2D API, CSS custom properties, no build step.

---

## File Map

| File | Action |
|------|--------|
| `frameforge/modules/visual-analysis.js` | Modify: extend `buildHeatmap()` return type; add `findBestPosition()` export |
| `frameforge/modules/renderer.js` | Modify: rename `_heatmapScores` → `_heatmap`; add advisor props; add `drawAdvisorGhosts()` |
| `frameforge/ui/balance-panel.js` | Modify: add weight readout section; add advisor card |
| `frameforge/ui/shell.js` | Modify: add `#balance-advisor` checkbox + `#balance-advisor-layer` select to dropdown |
| `frameforge/styles/components.css` | Modify: add weight readout and advisor styles |
| `frameforge/app.js` | Modify: update all `_heatmapScores` refs; add recompute after drag/resize; wire all new controls |

---

## Task 1: Extend `buildHeatmap()` and Add `findBestPosition()`

**Files:**
- Modify: `frameforge/modules/visual-analysis.js`

This task changes the `buildHeatmap` return type and adds the placement algorithm. No DOM dependencies.

- [ ] **Step 1: Change `buildHeatmap` to return an object with four parallel arrays**

Find the `buildHeatmap` function. It currently declares `const scores = new Float32Array(gridSize * gridSize)` and at the very end `return scores`.

Change it to track three component arrays in parallel with the combined scores array, and return all four:

Replace the opening lines of the loop body:
```js
export function buildHeatmap(imageData, canvasW, canvasH, gridSize = 16) {
  const scores       = new Float32Array(gridSize * gridSize);
  const lumaScores   = new Float32Array(gridSize * gridSize);
  const contrastScores = new Float32Array(gridSize * gridSize);
  const satScores    = new Float32Array(gridSize * gridSize);
  const cellW  = canvasW / gridSize;
  const cellH  = canvasH / gridSize;
  const data   = imageData.data;
```

Inside the per-cell loop, after computing `avgL`, `avgS`, `contrast`, replace the final assignment line:
```js
      const cellIndex = row * gridSize + col;
      lumaScores[cellIndex]     = avgL;
      contrastScores[cellIndex] = contrast;
      satScores[cellIndex]      = avgS;
      scores[cellIndex]         = 0.4 * avgL + 0.4 * contrast + 0.2 * avgS;
```

Replace the `return scores;` at the end with:
```js
  return { scores, lumaScores, contrastScores, satScores };
```

- [ ] **Step 2: Add `findBestPosition()` export**

After the closing brace of `buildHeatmap`, add:

```js
/**
 * Find the best canvas position for a layer to either balance or complement
 * the photo's visual weight.
 *
 * @param {Float32Array} heatmapScores — gridSize×gridSize combined weight scores (0–1)
 * @param {number} canvasW — canvas width in pixels
 * @param {number} canvasH — canvas height in pixels
 * @param {number} layerW  — layer bounding box width in pixels
 * @param {number} layerH  — layer bounding box height in pixels
 * @param {number} [gridSize=16]
 * @returns {{ balance: {x:number, y:number}, legibility: {x:number, y:number} }}
 *   Pixel coordinates for the layer top-left, clamped to canvas bounds.
 */
export function findBestPosition(heatmapScores, canvasW, canvasH, layerW, layerH, gridSize = 16) {
  const cellW = canvasW / gridSize;
  const cellH = canvasH / gridSize;

  // Pre-compute left/right weight split from the heatmap (ignoring layers)
  let sumLeft = 0, sumRight = 0;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const score = heatmapScores[row * gridSize + col];
      const cellCX = (col + 0.5) * cellW;
      if (cellCX < canvasW / 2) sumLeft  += score;
      else                       sumRight += score;
    }
  }
  const totalWeight = sumLeft + sumRight || 1;
  const maxDelta    = totalWeight; // worst-case delta

  // Synthetic element weight: proportional to area, capped at 40% of total
  const elemArea    = (layerW * layerH) / (canvasW * canvasH);
  const elemWeight  = Math.min(elemArea * totalWeight * 0.4, totalWeight * 0.4);

  // 5×5 candidate grid for top-left anchor
  const STEPS = 5;
  let bestBalance    = { score: -1, x: 0, y: 0 };
  let bestLegibility = { score: -1, x: 0, y: 0 };

  for (let row = 0; row < STEPS; row++) {
    for (let col = 0; col < STEPS; col++) {
      // Candidate top-left in pixels (12.5% increments, clamped)
      const cx = Math.round(col * canvasW * 0.125);
      const cy = Math.round(row * canvasH * 0.125);

      // Skip if element overflows canvas
      if (cx + layerW > canvasW || cy + layerH > canvasH) continue;

      // ── Legibility score ────────────────────────────────────────────────
      // Average heatmap score across cells overlapping this position
      let overlapSum = 0, overlapCount = 0;
      for (let gr = 0; gr < gridSize; gr++) {
        for (let gc = 0; gc < gridSize; gc++) {
          const cellX0 = gc * cellW, cellX1 = (gc + 1) * cellW;
          const cellY0 = gr * cellH, cellY1 = (gr + 1) * cellH;
          // Check overlap with layer rect
          if (cellX1 > cx && cellX0 < cx + layerW &&
              cellY1 > cy && cellY0 < cy + layerH) {
            overlapSum += heatmapScores[gr * gridSize + gc];
            overlapCount++;
          }
        }
      }
      const avgOverlap   = overlapCount > 0 ? overlapSum / overlapCount : 0;
      const legibilityScore = 1 - avgOverlap; // lower weight = better legibility

      // ── Balance score ────────────────────────────────────────────────────
      const elemCX  = cx + layerW / 2;
      const onRight = elemCX >= canvasW / 2;
      const newLeft  = onRight ? sumLeft  : sumLeft  + elemWeight;
      const newRight = onRight ? sumRight + elemWeight : sumRight;
      const newDelta = Math.abs(newLeft - newRight);
      const balanceScore = 1 - (newDelta / maxDelta);

      // ── Combined scores ──────────────────────────────────────────────────
      const balanceCombined    = 0.75 * balanceScore + 0.25 * legibilityScore;
      const legibilityCombined = 0.25 * balanceScore + 0.75 * legibilityScore;

      if (balanceCombined    > bestBalance.score)    { bestBalance    = { score: balanceCombined,    x: cx, y: cy }; }
      if (legibilityCombined > bestLegibility.score) { bestLegibility = { score: legibilityCombined, x: cx, y: cy }; }
    }
  }

  // Clamp to canvas bounds
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    balance: {
      x: clamp(bestBalance.x,    0, canvasW - layerW),
      y: clamp(bestBalance.y,    0, canvasH - layerH),
    },
    legibility: {
      x: clamp(bestLegibility.x, 0, canvasW - layerW),
      y: clamp(bestLegibility.y, 0, canvasH - layerH),
    },
  };
}
```

- [ ] **Step 3: Syntax check**

```
cd c:\Projects\frameforge\frameforge
node --input-type=module --eval "import './modules/visual-analysis.js'" 2>&1
```

Expected: only pre-existing CJS/ESM error. No `SyntaxError` lines beyond the module-system noise.

- [ ] **Step 4: Commit**

```
cd c:\Projects\frameforge
git add frameforge/modules/visual-analysis.js
git commit -m "feat(advisor): extend buildHeatmap return type and add findBestPosition"
```

---

## Task 2: Update `renderer.js` — Rename `_heatmapScores`, Add Advisor Props and Ghost Drawing

**Files:**
- Modify: `frameforge/modules/renderer.js`

- [ ] **Step 1: Rename `_heatmapScores` → `_heatmap` and add advisor props in the constructor**

Find the constructor block that currently reads:
```js
    /** @type {Float32Array|null} pre-computed heatmap scores */
    this._heatmapScores    = null;
```

Replace with:
```js
    /** @type {{scores:Float32Array,lumaScores:Float32Array,contrastScores:Float32Array,satScores:Float32Array}|null} pre-computed heatmap data */
    this._heatmap          = null;
    /** @type {string|null} layer id selected in Element Advisor */
    this.advisorLayer      = null;
    /** @type {'balance'|'legibility'} active advisor mode */
    this.advisorMode       = 'balance';
    /** @type {{balance:{x:number,y:number},legibility:{x:number,y:number}}|null} */
    this.advisorPositions  = null;
    /** @type {{w:number,h:number}|null} bounding box of the selected advisor layer */
    this.advisorLayerSize  = null;
```

- [ ] **Step 2: Update `drawHeatmap` call in `renderFrame` to use `_heatmap.scores`**

Find:
```js
      if (!forExport && this.showHeatmap && this._heatmapScores) {
        drawHeatmap(ctx, effW, effH, this._heatmapScores);
      }
```

Replace with:
```js
      if (!forExport && this.showHeatmap && this._heatmap?.scores) {
        drawHeatmap(ctx, effW, effH, this._heatmap.scores);
      }
```

- [ ] **Step 3: Add `drawAdvisorGhosts` call in `renderFrame`**

Directly after the zone-overlays block:
```js
      if (!forExport && this.analysisZones.length > 0) {
        drawZoneOverlays(ctx, effW, effH, this.analysisZones);
      }
```

Add:
```js
      if (!forExport && this.advisorPositions && this.advisorLayerSize) {
        drawAdvisorGhosts(ctx, this.advisorPositions, this.advisorLayerSize, this.advisorMode);
      }
```

- [ ] **Step 4: Add `drawAdvisorGhosts` module-level function**

Add this function immediately before the `// ── Main renderer` comment (the same location where `drawCompositionGuide`, `drawHeatmap`, `drawZoneOverlays` live):

```js
/**
 * Draw ghost outlines for the Element Advisor's two candidate positions.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{balance:{x:number,y:number},legibility:{x:number,y:number}}} positions
 * @param {{w:number,h:number}} layerSize — bounding box in canvas pixels
 * @param {'balance'|'legibility'} activeMode
 */
function drawAdvisorGhosts(ctx, positions, layerSize, activeMode) {
  const { w, h } = layerSize;

  const ghosts = [
    { key: 'balance',    color: '90,180,255',  label: 'B', pos: positions.balance },
    { key: 'legibility', color: '90,230,140',  label: 'L', pos: positions.legibility },
  ];

  ctx.save();
  for (const ghost of ghosts) {
    const isActive = ghost.key === activeMode;
    const alpha    = isActive ? 1.0 : 0.4;
    const { x, y } = ghost.pos;

    // Fill
    ctx.globalAlpha = isActive ? 0.15 : 0.06;
    ctx.fillStyle   = `rgba(${ghost.color},1)`;
    ctx.fillRect(x, y, w, h);

    // Dashed stroke
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(${ghost.color},0.85)`;
    ctx.lineWidth   = isActive ? 2 : 1.5;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Badge label above the ghost
    const badgeW = 20, badgeH = 16;
    const bx = x, by = Math.max(0, y - badgeH - 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = `rgba(${ghost.color},0.9)`;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 3);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle   = '#000';
    ctx.font        = `bold 11px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ghost.label, bx + badgeW / 2, by + badgeH / 2);
  }
  ctx.restore();
}
```

- [ ] **Step 5: Syntax check**

```
cd c:\Projects\frameforge\frameforge
node --input-type=module --eval "import './modules/renderer.js'" 2>&1
```

Expected: only pre-existing module-system noise, no new `SyntaxError`.

- [ ] **Step 6: Commit**

```
cd c:\Projects\frameforge
git add frameforge/modules/renderer.js
git commit -m "feat(advisor): add advisor ghost overlay drawing to renderer"
```

---

## Task 3: Update `balance-panel.js` — Weight Readout and Advisor Card

**Files:**
- Modify: `frameforge/ui/balance-panel.js`

The panel currently has a header, a "Clear All Zones" actions bar, and a body with zone cards. We are adding a weight readout section at the top of the body and an advisor card.

- [ ] **Step 1: Add `weightAxis` state and extend constructor callbacks**

Find the constructor's destructuring line:
```js
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose } = {}) {
```

Replace with:
```js
  constructor(canvasArea, { onDeleteZone, onClearAll, onClose, onMoveHere, onAdvisorLayerChange, onAdvisorModeChange, onWeightAxisChange } = {}) {
```

Add to the instance variable block below the existing callbacks:
```js
    this._onMoveHere              = onMoveHere              ?? (() => {});
    this._onAdvisorLayerChange    = onAdvisorLayerChange    ?? (() => {});
    this._onAdvisorModeChange     = onAdvisorModeChange     ?? (() => {});
    this._onWeightAxisChange      = onWeightAxisChange      ?? (() => {});
    this._weightAxis              = 'lr'; // 'lr' or 'tb'
```

- [ ] **Step 2: Add a weight readout placeholder `<div>` to the panel HTML in `_build()`**

Find the `_build()` method's `el.innerHTML` template. Inside the `<div class="balance-panel-body"></div>`, add a weight readout section:

Replace:
```js
      <div class="balance-panel-body"></div>
```
With:
```js
      <div class="balance-panel-body">
        <div class="balance-weight-readout" style="display:none"></div>
        <div class="balance-advisor-card" style="display:none"></div>
      </div>
```

- [ ] **Step 3: Add `updateWeightReadout(heatmap)` method**

After the `setVisible` method, add:

```js
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

    // Sum scores into two halves based on axis
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

    const total = (sumA + sumB) || 1;
    const pctA  = Math.round((sumA / total) * 100);
    const pctB  = 100 - pctA;
    const heavyIsA = sumA >= sumB;

    const [labelA, labelB] = axis === 'lr' ? ['LEFT', 'RIGHT'] : ['TOP', 'BOTTOM'];
    const heavyLabel = heavyIsA ? labelA : labelB;

    // Why breakdown: delta percentage per factor
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
          <span class="balance-weight-pct">${escHtml(pctA)}%</span>
        </div>
        <div class="balance-weight-bar-row">
          <span class="balance-weight-label">${escHtml(labelB)}</span>
          <div class="balance-weight-track">
            <div class="balance-weight-fill${!heavyIsA ? ' heavy' : ''}" style="width:${pctB}%"></div>
          </div>
          <span class="balance-weight-pct">${escHtml(pctB)}%</span>
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
```

- [ ] **Step 4: Add `updateAdvisorCard(layers, advisorLayerId, advisorMode, advisorPositions, canvasW, canvasH)` method**

After `updateWeightReadout`, add:

```js
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
```

- [ ] **Step 5: Update `update()` to call `updateWeightReadout` and `updateAdvisorCard`**

The existing `update(zones, heatmapActive)` method signature must be extended. Replace it entirely:

```js
  /**
   * Re-render the panel body.
   * @param {Array} zones  [{id, x, y, w, h, analysis}]
   * @param {boolean} heatmapActive
   * @param {object|null} [heatmap] — full heatmap object from buildHeatmap
   * @param {object} [advisorState] — { layers, layerId, mode, positions, active }
   */
  update(zones, heatmapActive, heatmap = null, advisorState = null) {
    if (!this._el) return;
    const clearBtn = this._el.querySelector('.balance-clear-all');
    clearBtn.disabled = zones.length === 0;

    // Weight readout (top of body)
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
    // Clear only the zone cards (not the weight readout and advisor divs)
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
```

- [ ] **Step 6: Syntax check**

```
cd c:\Projects\frameforge\frameforge
node --input-type=module --eval "import './ui/balance-panel.js'" 2>&1
```

No new `SyntaxError` lines.

- [ ] **Step 7: Commit**

```
cd c:\Projects\frameforge
git add frameforge/ui/balance-panel.js
git commit -m "feat(advisor): add weight readout and advisor card to BalancePanel"
```

---

## Task 4: Update `shell.js` — Advisor Controls in Dropdown

**Files:**
- Modify: `frameforge/ui/shell.js`

- [ ] **Step 1: Add advisor checkbox and layer select to the dropdown**

Find the end of the Visual Analysis section in the dropdown HTML. It currently ends with:
```html
      <button class="balance-dropdown-item balance-clear-zones-btn" id="balance-clear-zones" disabled>✕ Clear All Zones</button>
```

Add immediately after it (still inside the `#balance-dropdown` div):
```html
      <div class="balance-dropdown-divider"></div>
      <div class="balance-dropdown-section-label">Element Advisor</div>
      <label class="balance-dropdown-item" id="balance-advisor-label"><input type="checkbox" id="balance-advisor"> Element Advisor</label>
      <select id="balance-advisor-layer" class="balance-dropdown-advisor-select" style="display:none">
        <option value="">— pick a layer —</option>
      </select>
```

- [ ] **Step 2: Syntax check**

Open the file and confirm the HTML is well-nested. Then:

```
cd c:\Projects\frameforge\frameforge
node --input-type=module --eval "import './ui/shell.js'" 2>&1
```

No new `SyntaxError`.

- [ ] **Step 3: Commit**

```
cd c:\Projects\frameforge
git add frameforge/ui/shell.js
git commit -m "feat(advisor): add element advisor controls to balance dropdown"
```

---

## Task 5: Add Styles to `components.css`

**Files:**
- Modify: `frameforge/styles/components.css`

Append all new rules to the end of the file.

- [ ] **Step 1: Append weight readout styles**

```css
/* ── Visual Weight Readout ────────────────────────────────────────────────── */

.balance-weight-readout {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-xs);
}

.balance-weight-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}

.balance-weight-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.balance-axis-toggle {
  display: flex;
  gap: 2px;
}

.balance-axis-btn {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  font-size: 10px;
  padding: 2px 6px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.balance-axis-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.balance-axis-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #000;
}

.balance-weight-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-xs);
}

.balance-weight-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.balance-weight-label {
  width: 38px;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.balance-weight-track {
  flex: 1;
  height: 8px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.balance-weight-fill {
  height: 100%;
  background: var(--color-text-muted);
  border-radius: 4px;
  transition: width 0.25s ease;
}

.balance-weight-fill.heavy {
  background: var(--color-accent);
}

.balance-weight-pct {
  width: 30px;
  text-align: right;
  font-size: 10px;
  color: var(--color-text);
  flex-shrink: 0;
}

.balance-heavy-label {
  font-size: 10px;
  color: var(--color-accent);
  margin-bottom: var(--space-xs);
}

.balance-why {
  margin-top: 2px;
}

.balance-why-title {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.balance-why-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--color-text-muted);
  padding: 1px 0;
}

.balance-why-pos { color: var(--color-warning); }
.balance-why-neg { color: var(--color-info); }
```

- [ ] **Step 2: Append advisor card styles**

```css
/* ── Element Advisor ─────────────────────────────────────────────────────── */

.balance-advisor-card {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-xs);
}

.balance-advisor-header {
  margin-bottom: var(--space-xs);
}

.balance-advisor-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.balance-advisor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--space-xs);
}

.balance-advisor-label {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.balance-advisor-select {
  flex: 1;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  font-size: 11px;
  padding: 2px 4px;
}

.balance-advisor-mode-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--space-xs);
}

.balance-advisor-mode-btns {
  display: flex;
  gap: 4px;
}

.balance-advisor-mode-btn {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  font-size: 10px;
  padding: 2px 7px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.balance-advisor-mode-btn:hover {
  color: var(--color-text);
}

.balance-advisor-mode-btn.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.balance-advisor-positions {
  margin-bottom: var(--space-xs);
}

.balance-advisor-pos-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--color-text-muted);
  padding: 2px 0;
}

.balance-advisor-pos-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  color: #000;
  flex-shrink: 0;
}

.balance-advisor-pos-badge.balance    { background: rgba(90,180,255,0.9); }
.balance-advisor-pos-badge.legibility { background: rgba(90,230,140,0.9); }

.balance-advisor-hint {
  font-size: 10px;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 2px 0;
}

.balance-move-here-btn {
  width: 100%;
  background: var(--color-accent);
  border: none;
  color: #000;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  padding: 5px 0;
  cursor: pointer;
  transition: var(--transition-fast);
  margin-top: var(--space-xs);
}

.balance-move-here-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.balance-move-here-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Advisor layer select in dropdown */
.balance-dropdown-advisor-select {
  display: block;
  width: calc(100% - 24px);
  margin: 0 12px 6px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  font-size: 11px;
  padding: 3px 5px;
}
```

- [ ] **Step 3: Verify brace balance**

Count `{` and `}` in the newly appended block. They must be equal.

- [ ] **Step 4: Commit**

```
cd c:\Projects\frameforge
git add frameforge/styles/components.css
git commit -m "feat(advisor): add weight readout and advisor card styles"
```

---

## Task 6: Update `app.js` — Wiring Everything Together

**Files:**
- Modify: `frameforge/app.js`

This is the largest task. Work through each sub-step carefully.

- [ ] **Step 1: Update import of `findBestPosition`**

Find line:
```js
import { buildHeatmap, analyzeZone } from './modules/visual-analysis.js';
```
Replace with:
```js
import { buildHeatmap, analyzeZone, findBestPosition } from './modules/visual-analysis.js';
```

- [ ] **Step 2: Add a `recomputeHeatmap()` helper near the other balance helpers**

Find the `function updateBalanceBtnState()` helper. Add immediately after it:

```js
  function recomputeHeatmap() {
    if (!renderer.showHeatmap || !project.isLoaded) return;
    requestAnimationFrame(() => {
      if (!project.isLoaded) return;
      const ctx = mainCanvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
      renderer._heatmap = buildHeatmap(imgData, mainCanvas.width, mainCanvas.height);
      renderCurrentFrame();
      syncBalancePanel();
    });
  }
```

- [ ] **Step 3: Replace all `_heatmapScores` references in app.js**

There are 4 occurrences of `renderer._heatmapScores`. Replace each:

| Old | New |
|-----|-----|
| `renderer._heatmapScores = buildHeatmap(imgData, mainCanvas.width, mainCanvas.height);` | `renderer._heatmap = buildHeatmap(imgData, mainCanvas.width, mainCanvas.height);` |
| `renderer._heatmapScores = null;` | `renderer._heatmap = null;` |

There are exactly 4 occurrences — 2 assignments of `buildHeatmap` result and 2 null assignments. Replace all of them.

- [ ] **Step 4: Pass `heatmap` object to `syncBalancePanel()` and `getOrCreateBalancePanel()`**

Find the `syncBalancePanel()` function. The existing call to `panel.update(renderer.analysisZones, renderer.showHeatmap)` must now pass the full heatmap object and advisor state. Replace that call:

```js
  function syncBalancePanel() {
    const panel = getOrCreateBalancePanel();
    const hasContent = renderer.analysisZones.length > 0 || renderer.showHeatmap || renderer.advisorLayer;
    panel.setVisible(hasContent);
    panel.update(
      renderer.analysisZones,
      renderer.showHeatmap,
      renderer._heatmap ?? null,
      {
        layers:    _getAdvisorEligibleLayers(),
        layerId:   renderer.advisorLayer,
        mode:      renderer.advisorMode,
        positions: renderer.advisorPositions,
        active:    !!renderer.advisorLayer || _advisorActive,
      },
    );
    const clearBtn = tb.balanceDropdown?.querySelector('#balance-clear-zones');
    if (clearBtn) clearBtn.disabled = renderer.analysisZones.length === 0;
    const dzChk = tb.balanceDropdown?.querySelector('#balance-draw-zones');
    if (dzChk) dzChk.disabled = renderer.analysisZones.length >= 8 && !zoneDrawState.active;
  }
```

Add the helper `_getAdvisorEligibleLayers()` immediately before `syncBalancePanel`:

```js
  function _getAdvisorEligibleLayers() {
    if (!project.isLoaded) return [];
    const frame = project.data?.frames?.[project.activeFrameIndex];
    return (frame?.layers ?? []).filter(l => l.type === 'text' || l.type === 'shape');
  }
```

- [ ] **Step 5: Add `_advisorActive` state variable and update `clearAllZones` and `getOrCreateBalancePanel`**

Find the line where balance state variables are declared (near `let balancePanel = null`):
```js
  let balancePanel = null;
  let zoneDrawState = { active: false, startX: 0, startY: 0, currentRect: null };
  let nextZoneNum = 1;
```

Add after it:
```js
  let _advisorActive = false;
```

In `clearAllZones()`, add advisor reset:
```js
  function clearAllZones() {
    renderer.analysisZones = [];
    nextZoneNum = 1;
    zoneDrawState.active = false;
    canvasWrapEl.classList.remove('zone-draw-mode');
    const dzChk = tb.balanceDropdown?.querySelector('#balance-draw-zones');
    if (dzChk) dzChk.checked = false;
    // Also clear advisor positions (zones gone, scores stale)
    renderer.advisorPositions = null;
    syncBalancePanel();
    renderCurrentFrame();
  }
```

- [ ] **Step 6: Update `getOrCreateBalancePanel()` to pass the new callbacks**

Find `getOrCreateBalancePanel()`. Replace the `new BalancePanel(canvasAreaEl, {...})` call:

```js
  function getOrCreateBalancePanel() {
    if (!balancePanel) {
      balancePanel = new BalancePanel(canvasAreaEl, {
        onDeleteZone: (id) => {
          renderer.analysisZones = renderer.analysisZones.filter(z => z.id !== id);
          syncBalancePanel();
          renderCurrentFrame();
        },
        onClearAll:  clearAllZones,
        onClose:     hideBalancePanel,
        onWeightAxisChange: () => {
          // axis state is in BalancePanel; just re-sync to re-render readout
          syncBalancePanel();
        },
        onAdvisorLayerChange: (layerId) => {
          renderer.advisorLayer = layerId || null;
          _runAdvisor();
        },
        onAdvisorModeChange: (mode) => {
          renderer.advisorMode = mode;
          syncBalancePanel();
          renderCurrentFrame();
        },
        onMoveHere: (mode) => {
          _applyAdvisorPosition(mode);
        },
      });
    }
    return balancePanel;
  }
```

- [ ] **Step 7: Add `_runAdvisor()` and `_applyAdvisorPosition()` helpers**

Add after `updateBalanceBtnState()`:

```js
  function _runAdvisor() {
    if (!renderer.advisorLayer || !renderer.showHeatmap || !renderer._heatmap?.scores) {
      renderer.advisorPositions = null;
      renderer.advisorLayerSize = null;
      syncBalancePanel();
      renderCurrentFrame();
      return;
    }

    const frame  = project.data?.frames?.[project.activeFrameIndex];
    const layer  = frame?.layers?.find(l => l.id === renderer.advisorLayer);
    if (!layer) {
      renderer.advisorPositions = null;
      renderer.advisorLayerSize = null;
      syncBalancePanel();
      renderCurrentFrame();
      return;
    }

    // Compute layer bounding box in canvas pixels
    const ctx    = mainCanvas.getContext('2d');
    const cw     = mainCanvas.width;
    const ch     = mainCanvas.height;
    let bounds;
    if (layer.type === 'text') {
      bounds = computeTextBounds(ctx, layer, cw, ch, project);
    } else {
      bounds = computeShapeBounds(ctx, layer, cw, ch, project);
    }

    if (!bounds) {
      renderer.advisorPositions = null;
      renderer.advisorLayerSize = null;
      syncBalancePanel();
      renderCurrentFrame();
      return;
    }

    const layerW = Math.max(1, bounds.right  - bounds.left);
    const layerH = Math.max(1, bounds.bottom - bounds.top);
    renderer.advisorLayerSize = { w: layerW, h: layerH };

    renderer.advisorPositions = findBestPosition(
      renderer._heatmap.scores,
      cw, ch,
      layerW, layerH,
    );

    syncBalancePanel();
    renderCurrentFrame();
  }

  function _applyAdvisorPosition(mode) {
    if (!renderer.advisorPositions || !renderer.advisorLayer) return;
    const pos   = renderer.advisorPositions[mode];
    if (!pos) return;

    const frame = project.data?.frames?.[project.activeFrameIndex];
    const layer = frame?.layers?.find(l => l.id === renderer.advisorLayer);
    if (!layer) return;

    const cw = mainCanvas.width;
    const ch = mainCanvas.height;

    // Convert canvas pixels → percentage (position is top-left of bounding box)
    const xPct = (pos.x / cw) * 100;
    const yPct = (pos.y / ch) * 100;

    layer.position = {
      mode: 'absolute',
      x_pct: Math.round(xPct * 10) / 10,
      y_pct: Math.round(yPct * 10) / 10,
    };

    project.save();
    filmstrip.renderOne(project.activeFrameIndex, project);
    renderCurrentFrame();
    recomputeHeatmap();
    // Re-run advisor to update ghost to new location
    _runAdvisor();
  }
```

- [ ] **Step 8: Wire the `#balance-advisor` checkbox**

Find the end of the `#balance-clear-zones` click handler block. Add after it:

```js
  // ── Element Advisor checkbox ──────────────────────────────────────────────
  tb.balanceDropdown?.querySelector('#balance-advisor')?.addEventListener('change', (e) => {
    _advisorActive = e.target.checked;
    const select = tb.balanceDropdown.querySelector('#balance-advisor-layer');
    if (select) select.style.display = _advisorActive ? '' : 'none';

    if (_advisorActive) {
      // Populate the layer select
      const layers = _getAdvisorEligibleLayers();
      if (select) {
        select.innerHTML = '<option value="">— pick a layer —</option>' +
          layers.map(l => `<option value="${l.id}">${l.label || l.id}</option>`).join('');
      }
    } else {
      // Clear advisor state
      renderer.advisorLayer     = null;
      renderer.advisorPositions = null;
      renderer.advisorLayerSize = null;
    }
    syncBalancePanel();
    renderCurrentFrame();
    updateBalanceBtnState();
  });

  tb.balanceDropdown?.querySelector('#balance-advisor-layer')?.addEventListener('change', (e) => {
    renderer.advisorLayer = e.target.value || null;
    _runAdvisor();
  });
```

- [ ] **Step 9: Wire heatmap recompute after drag ends**

Find the `initDrag` call in `app.js`. Its 5th argument is the `onComplete` callback:
```js
      (frameIndex) => { renderer.isDragging = false; filmstrip.renderOne(frameIndex, project); },
```

Replace both that one and the equivalent `initResize` one with:
```js
      (frameIndex) => {
        renderer.isDragging = false;
        filmstrip.renderOne(frameIndex, project);
        recomputeHeatmap();
        if (renderer.advisorLayer) _runAdvisor();
      },
```

(There are two such callbacks — one in `initDrag` and one in `initResize`. Update both.)

- [ ] **Step 10: Clear advisor state on frame switch**

Find the section in `selectFrame()` that currently clears zones:
```js
    // Clear analysis zones on frame switch
    if (renderer.analysisZones.length > 0) {
      renderer.analysisZones = [];
      nextZoneNum = 1;
      syncBalancePanel();
    }
    if (renderer.showHeatmap) {
      renderer._heatmapScores = null;
    }
```

After the second `if` block add:
```js
    // Clear advisor on frame switch
    renderer.advisorLayer     = null;
    renderer.advisorPositions = null;
    renderer.advisorLayerSize = null;
    _advisorActive = false;
    const advisorChk = tb.balanceDropdown?.querySelector('#balance-advisor');
    if (advisorChk) advisorChk.checked = false;
    const advisorSelect = tb.balanceDropdown?.querySelector('#balance-advisor-layer');
    if (advisorSelect) advisorSelect.style.display = 'none';
```

Also update the `renderer._heatmapScores = null` line (which should already be changed to `_heatmap` by Step 3) to confirm it is `renderer._heatmap = null`.

- [ ] **Step 11: Syntax check**

```
cd c:\Projects\frameforge\frameforge
node --input-type=module --eval "import './app.js'" 2>&1 | Select-String "SyntaxError" | Where-Object { $_ -notmatch "Cannot use import" }
```

Expected: no output (no real syntax errors).

- [ ] **Step 12: Commit**

```
cd c:\Projects\frameforge
git add frameforge/app.js
git commit -m "feat(advisor): wire Element Advisor and live heatmap updates in app.js"
```

---

## Task 7: End-to-End Browser Verification

**Files:** None — verification only.

- [ ] **Step 1: Open `frameforge/index.html` in browser (live-server or file://)**

Load a project with at least one text or shape layer and an assigned photo.

- [ ] **Step 2: Verify heatmap live update**

1. Enable Weight Heatmap via balance dropdown
2. Drag a text layer to a new position
3. **Expected:** heatmap recomputes and updates within one animation frame after mouseup. Orange/blue pattern shifts if the layer covered a heavy zone.

- [ ] **Step 3: Verify Visual Weight Balance Readout**

1. Heatmap must be on
2. Open Balance Panel (it should be visible)
3. **Expected:** "Visual Weight" section shows two bars at the top of the panel body. Left/Right percentages add to 100%. "▲ Heavy side" label shows the correct side. "Why" rows show non-zero deltas.
4. Click `T/B ↕` toggle — bars should re-compute for top/bottom split.

- [ ] **Step 4: Verify Element Advisor**

1. Open balance dropdown → enable "Element Advisor"
2. **Expected:** a `<select>` appears in the dropdown listing only text and shape layers.
3. Select a layer from the dropdown.
4. **Expected:** two ghost outlines appear on canvas — blue (B) and green (L). Balance Panel advisor card shows coordinates for both ghosts.
5. In the advisor card, toggle between "Balance" and "Legibility" — the active ghost should become full opacity, the inactive dimmed.
6. Click "Move here" — **Expected:** layer jumps to the active ghost position, ghost updates, heatmap recomputes.

- [ ] **Step 5: Verify frame-switch cleanup**

1. With heatmap + advisor active, navigate to a different frame.
2. **Expected:** advisor checkbox is unchecked, ghost disappears, heatmap recomputes for the new frame.
