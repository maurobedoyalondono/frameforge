/**
 * assignment-conflict-modal.js — Conflict resolution for image auto-assignment.
 *
 * Shows when auto-assignment would override an existing manual assignment.
 * Returns a Promise resolving to Map<frameIndex, 'replace'|'keep'>.
 */

/**
 * @typedef {{ frameIndex: number, frameId: string, currentKey: string, newKey: string }} Conflict
 */

/**
 * Show the conflict resolution modal.
 * @param {Conflict[]} conflicts
 * @returns {Promise<Map<number, 'replace'|'keep'>>}
 */
export function showAssignmentConflictModal(conflicts) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '560px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<span class="modal-title">Image Assignment Conflicts</span>`;

    // ── Body ──────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.textContent = 'These frames already have a manual assignment. Select which ones to replace with the JSON mapping.';
    body.appendChild(desc);

    // Bulk action row
    const bulkRow = document.createElement('div');
    bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    const btnReplaceAll = document.createElement('button');
    btnReplaceAll.className = 'btn btn-secondary';
    btnReplaceAll.textContent = 'Replace All';

    const btnLeaveAll = document.createElement('button');
    btnLeaveAll.className = 'btn btn-secondary';
    btnLeaveAll.textContent = 'Leave All';

    bulkRow.appendChild(btnReplaceAll);
    bulkRow.appendChild(btnLeaveAll);
    body.appendChild(bulkRow);

    // Conflict table
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
        <th style="padding:6px 8px;font-weight:500">Frame</th>
        <th style="padding:6px 8px;font-weight:500">Current</th>
        <th style="padding:6px 8px;font-weight:500">→ New</th>
        <th style="padding:6px 8px;font-weight:500;text-align:center">Replace?</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    /** @type {Map<number, HTMLInputElement>} frameIndex → checkbox */
    const checkboxes = new Map();

    const trunc = (s) => s.length > 28 ? s.slice(0, 26) + '\u2026' : s;

    for (const c of conflicts) {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-border)';

      const cb = document.createElement('input');
      cb.type    = 'checkbox';
      cb.checked = true;
      checkboxes.set(c.frameIndex, cb);

      const tdFrame   = document.createElement('td');
      const tdCurrent = document.createElement('td');
      const tdNew     = document.createElement('td');
      const tdCheck   = document.createElement('td');

      tdFrame.style.padding   = '7px 8px';
      tdCurrent.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdNew.style.cssText     = 'padding:7px 8px;color:var(--color-text-secondary)';
      tdCheck.style.cssText   = 'padding:7px 8px;text-align:center';

      tdFrame.textContent   = c.frameId;
      tdCurrent.textContent = trunc(c.currentKey);
      tdCurrent.title       = c.currentKey;
      tdNew.textContent     = trunc(c.newKey);
      tdNew.title           = c.newKey;
      tdCheck.appendChild(cb);

      row.appendChild(tdFrame);
      row.appendChild(tdCurrent);
      row.appendChild(tdNew);
      row.appendChild(tdCheck);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    body.appendChild(table);

    // ── Footer ────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const btnApply = document.createElement('button');
    btnApply.className = 'btn btn-primary';
    btnApply.textContent = 'Apply';
    footer.appendChild(btnApply);

    // ── Event handlers ────────────────────────────────────────────────────
    btnReplaceAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = true; });
    });

    btnLeaveAll.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
    });

    btnApply.addEventListener('click', () => {
      const result = new Map();
      checkboxes.forEach((cb, frameIndex) => {
        result.set(frameIndex, cb.checked ? 'replace' : 'keep');
      });
      backdrop.remove();
      resolve(result);
    });

    // ── Assemble ──────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    btnApply.focus();
  });
}
