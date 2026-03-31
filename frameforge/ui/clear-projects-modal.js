/**
 * clear-projects-modal.js — Project storage cleanup modal.
 *
 * Lists all stored projects, lets the user select any combination to delete.
 * Returns a Promise resolving to the array of project IDs to delete.
 */

/**
 * @typedef {{ id: string, title: string, created: string, updated: string }} ProjectEntry
 */

/**
 * Show the clear projects modal.
 * @param {ProjectEntry[]} projects — all stored projects from storage.loadProjectIndex()
 * @param {string|null} activeProjectId — currently loaded project id, or null
 * @returns {Promise<string[]>} resolves with array of IDs to delete; [] if cancelled
 */
export function showClearProjectsModal(projects, activeProjectId) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '520px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Clear Projects';

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

    /** @type {Map<string, HTMLInputElement>} projectId → checkbox */
    const checkboxes = new Map();

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No saved projects.';
      empty.style.color = 'var(--color-text-secondary)';
      body.appendChild(empty);
    } else {
      // Bulk action row
      const bulkRow = document.createElement('div');
      bulkRow.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

      const btnSelectAll = document.createElement('button');
      btnSelectAll.className = 'btn btn-secondary';
      btnSelectAll.textContent = 'Select All';

      const btnDeselectAll = document.createElement('button');
      btnDeselectAll.className = 'btn btn-secondary';
      btnDeselectAll.textContent = 'Deselect All';

      bulkRow.appendChild(btnSelectAll);
      bulkRow.appendChild(btnDeselectAll);
      body.appendChild(bulkRow);

      // Table
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--font-size-sm)';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="color:var(--color-text-secondary);text-align:left;border-bottom:1px solid var(--color-border)">
          <th style="padding:6px 8px;font-weight:500;text-align:center">☑</th>
          <th style="padding:6px 8px;font-weight:500">Title</th>
          <th style="padding:6px 8px;font-weight:500">Last updated</th>
        </tr>`;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');

      for (const p of projects) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--color-border)';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = false;
        cb.addEventListener('change', updateCount);
        checkboxes.set(p.id, cb);

        const tdCheck = document.createElement('td');
        tdCheck.style.cssText = 'padding:7px 8px;text-align:center';
        tdCheck.appendChild(cb);

        const tdTitle = document.createElement('td');
        tdTitle.style.padding = '7px 8px';
        tdTitle.title = p.id;

        if (p.id === activeProjectId) {
          const badge = document.createElement('span');
          badge.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm)';
          badge.textContent = ' (current)';
          tdTitle.textContent = p.title;
          tdTitle.appendChild(badge);
        } else {
          tdTitle.textContent = p.title;
        }

        const tdDate = document.createElement('td');
        tdDate.style.cssText = 'padding:7px 8px;color:var(--color-text-secondary)';
        tdDate.textContent = p.updated ? new Date(p.updated).toLocaleDateString() : '\u2014';

        row.appendChild(tdCheck);
        row.appendChild(tdTitle);
        row.appendChild(tdDate);
        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      body.appendChild(table);

      btnSelectAll.addEventListener('click', () => {
        checkboxes.forEach((cb) => { cb.checked = true; });
        updateCount();
      });

      btnDeselectAll.addEventListener('click', () => {
        checkboxes.forEach((cb) => { cb.checked = false; });
        updateCount();
      });
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';

    const countLabel = document.createElement('span');
    countLabel.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm)';
    countLabel.textContent = '0 selected';

    const btnClear = document.createElement('button');
    btnClear.className = 'btn btn-danger';
    btnClear.textContent = 'Clear Selected';
    btnClear.disabled = true;

    footer.appendChild(countLabel);
    footer.appendChild(btnClear);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function updateCount() {
      let n = 0;
      checkboxes.forEach((cb) => { if (cb.checked) n++; });
      countLabel.textContent = `${n} selected`;
      btnClear.disabled = n === 0;
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') close([]);
    }

    function close(result) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close([]));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close([]); });
    document.addEventListener('keydown', onKeyDown);

    btnClear.addEventListener('click', () => {
      const ids = [];
      checkboxes.forEach((cb, id) => { if (cb.checked) ids.push(id); });
      close(ids);
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    btnClose.focus();
  });
}
