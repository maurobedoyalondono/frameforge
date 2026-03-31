/**
 * json-load-review-modal.js — Per-frame review when replacing an existing layout.
 *
 * Compares incoming JSON frames against the currently loaded layout.
 * Returns a Set of frame IDs the user chose to replace.
 */

/**
 * @param {object} oldData — current project.data (existing layout)
 * @param {object} newData — incoming parsed JSON
 * @returns {Promise<Set<string>|null>} set of frame IDs to replace; null if cancelled
 */
export function showJsonLoadReviewModal(oldData, newData) {
  return new Promise((resolve) => {
    const changes = diffFrames(oldData, newData);

    if (changes.length === 0) {
      resolve(new Set());
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '640px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Review Layout Changes';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn btn-ghost btn-icon';
    btnClose.setAttribute('aria-label', 'Close');
    btnClose.innerHTML = '&times;';
    btnClose.style.marginLeft = 'auto';

    header.appendChild(titleEl);
    header.appendChild(btnClose);

    // ── Body ────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.style.marginBottom = '12px';
    desc.textContent = `${changes.length} of ${newData.frames?.length ?? 0} frame(s) have changes. Select which frames to update.`;
    body.appendChild(desc);

    // Bulk row
    const bulkRow = document.createElement('div');
    bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    const btnSelectAll = document.createElement('button');
    btnSelectAll.className = 'btn btn-secondary';
    btnSelectAll.textContent = 'Select All';

    const btnKeepAll = document.createElement('button');
    btnKeepAll.className = 'btn btn-secondary';
    btnKeepAll.textContent = 'Keep All';

    bulkRow.appendChild(btnSelectAll);
    bulkRow.appendChild(btnKeepAll);
    body.appendChild(bulkRow);

    // Table
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
        <th style="padding:6px 8px;font-weight:500;width:80px">Frame</th>
        <th style="padding:6px 8px;font-weight:500;width:140px">Changes</th>
        <th style="padding:6px 8px;font-weight:500">Details</th>
        <th style="padding:6px 8px;font-weight:500;text-align:center;width:70px">Replace?</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    /** @type {Map<string, HTMLInputElement>} frameId → checkbox */
    const checkboxes = new Map();

    const trunc = (s, n = 28) => s && s.length > n ? s.slice(0, n - 1) + '\u2026' : (s ?? '');

    for (const c of changes) {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-border)';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      checkboxes.set(c.frameId, cb);

      const tdFrame   = document.createElement('td');
      const tdCats    = document.createElement('td');
      const tdDetails = document.createElement('td');
      const tdCheck   = document.createElement('td');

      tdFrame.style.padding  = '7px 8px';
      tdCats.style.padding   = '7px 8px';
      tdDetails.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdCheck.style.cssText  = 'padding:7px 8px;text-align:center';

      tdFrame.textContent = c.frameId;

      // Category badges
      for (const cat of c.categories) {
        const badge = document.createElement('span');
        badge.textContent = cat;
        badge.style.cssText = `
          display:inline-block;margin-right:4px;padding:1px 5px;border-radius:3px;
          font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;
          background:var(--color-border);color:var(--color-text-secondary);
        `;
        tdCats.appendChild(badge);
      }

      // Details
      const detailParts = [];
      if (c.details.image) {
        detailParts.push(`${trunc(c.details.image.from)} → ${trunc(c.details.image.to)}`);
      }
      if (c.details.copy && c.details.copy.length > 0) {
        const first = c.details.copy[0];
        let copyText = `"${trunc(first.from, 20)}" → "${trunc(first.to, 20)}"`;
        if (c.details.copy.length > 1) copyText += ` +${c.details.copy.length - 1} more`;
        detailParts.push(copyText);
      }
      if (c.details.content) {
        detailParts.push(c.details.content);
      }
      const detailStr = detailParts.join(' · ');
      tdDetails.textContent = trunc(detailStr, 60);
      tdDetails.title = detailStr;

      tdCheck.appendChild(cb);

      row.appendChild(tdFrame);
      row.appendChild(tdCats);
      row.appendChild(tdDetails);
      row.appendChild(tdCheck);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    body.appendChild(table);

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary';
    btnApply.textContent = 'Apply';
    footer.appendChild(btnApply);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === 'Escape') close(null);
    }

    function close(result) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener('keydown', onKeyDown);

    btnSelectAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = true; });
    });

    btnKeepAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
    });

    btnApply.addEventListener('click', () => {
      const selected = new Set();
      checkboxes.forEach((cb, frameId) => { if (cb.checked) selected.add(frameId); });
      close(selected);
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    btnApply.focus();
  });
}

// ── Frame diff algorithm ─────────────────────────────────────────────────────

/**
 * Compute per-frame changes between old and new layout data.
 * @param {object} oldData
 * @param {object} newData
 * @returns {Array<{frameId: string, categories: string[], details: object}>}
 */
function diffFrames(oldData, newData) {
  const result = [];

  for (const newFrame of (newData.frames ?? [])) {
    const oldFrame = (oldData.frames ?? []).find((f) => f.id === newFrame.id);

    if (!oldFrame) {
      result.push({
        frameId:    newFrame.id,
        categories: ['image', 'copy', 'content'],
        details:    { content: 'New frame' },
      });
      continue;
    }

    const categories = [];
    const details    = {};

    // Image changed?
    if (newFrame.image_src !== oldFrame.image_src ||
        newFrame.image_filename !== oldFrame.image_filename) {
      categories.push('image');
      details.image = { from: oldFrame.image_src ?? '', to: newFrame.image_src ?? '' };
    }

    // Copy changed? (text layers)
    const oldTextLayers = (oldFrame.layers  ?? []).filter((l) => l.type === 'text');
    const newTextLayers = (newFrame.layers  ?? []).filter((l) => l.type === 'text');
    const copyChanges   = [];
    for (const nl of newTextLayers) {
      const ol = oldTextLayers.find((l) => l.id === nl.id);
      if (!ol || ol.text !== nl.text) {
        copyChanges.push({ from: ol?.text ?? '', to: nl.text ?? '' });
      }
    }
    if (copyChanges.length > 0) {
      categories.push('copy');
      details.copy = copyChanges;
    }

    // Content changed? — structural differences beyond image and copy:
    // layer count, layer properties, overlays, frame-level fields.
    const stripForContent = (frame) => {
      const { image_src: _a, image_filename: _b, layers, ...rest } = frame;
      return {
        ...rest,
        layers: (layers ?? []).map(({ text: _t, ...l }) => l),
      };
    };
    if (JSON.stringify(stripForContent(oldFrame)) !== JSON.stringify(stripForContent(newFrame))) {
      categories.push('content');
      const oldCount = (oldFrame.layers ?? []).length;
      const newCount = (newFrame.layers ?? []).length;
      const diff = newCount - oldCount;
      details.content = diff !== 0
        ? `${Math.abs(diff)} layer(s) ${diff > 0 ? 'added' : 'removed'}`
        : 'Layout properties changed';
    }

    if (categories.length > 0) {
      result.push({ frameId: newFrame.id, categories, details });
    }
  }

  return result;
}
