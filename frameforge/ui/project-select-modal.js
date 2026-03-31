/**
 * project-select-modal.js — Smart load project selection.
 *
 * Shown when loading a JSON or images with no active project.
 * Returns a Promise resolving to the user's choice.
 */

/**
 * @typedef {{ id: string, title: string, hasLayout: boolean, updated: string }} ProjectEntry
 * @typedef {{ action: 'select', projectId: string } | { action: 'create' } | { action: 'cancel' }} SelectResult
 */

/**
 * Show the project selection modal.
 * @param {ProjectEntry[]} projects — from briefStorage.list()
 * @param {object} [options]
 * @param {string} [options.message] — message shown above the list
 * @param {string|null} [options.suggestedId] — project ID to highlight as suggested match
 * @returns {Promise<SelectResult>}
 */
export function showProjectSelectModal(projects, { message = '', suggestedId = null } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '480px';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'modal-title';
    titleEl.textContent = 'Select Project';

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

    if (message) {
      const msg = document.createElement('p');
      msg.style.cssText = 'margin-bottom:12px;color:var(--color-text-secondary);font-size:var(--font-size-sm)';
      msg.textContent = message;
      body.appendChild(msg);
    }

    /** @type {string|null} */
    let selectedId = suggestedId ?? (projects.length === 1 ? projects[0].id : null);

    if (projects.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No projects found. Create one first.';
      empty.style.color = 'var(--color-text-secondary)';
      body.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto;';

      const trunc = (s, n = 40) => s && s.length > n ? s.slice(0, n - 1) + '\u2026' : (s ?? '');

      for (const p of projects) {
        const row = document.createElement('button');
        row.className = 'btn btn-ghost';
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;text-align:left;padding:8px 10px;border-radius:4px;width:100%;';
        row.dataset.id = p.id;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = trunc(p.title);
        nameSpan.style.flex = '1';

        const meta = document.createElement('span');
        meta.style.cssText = 'color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-left:8px;white-space:nowrap;';
        meta.textContent = p.hasLayout ? '● layout' : '○ no layout';

        row.appendChild(nameSpan);
        row.appendChild(meta);

        if (p.id === selectedId) {
          row.style.background = 'var(--color-accent-faint, rgba(255,255,255,0.08))';
          row.style.fontWeight = '600';
        }

        row.addEventListener('click', () => {
          selectedId = p.id;
          list.querySelectorAll('button[data-id]').forEach((b) => {
            b.style.background = b.dataset.id === selectedId ? 'var(--color-accent-faint, rgba(255,255,255,0.08))' : '';
            b.style.fontWeight  = b.dataset.id === selectedId ? '600' : '';
          });
          btnSelect.disabled = false;
        });

        list.appendChild(row);
      }

      body.appendChild(list);
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const btnCreate = document.createElement('button');
    btnCreate.className = 'btn btn-secondary';
    btnCreate.textContent = '+ Create New Project';

    const btnSelect = document.createElement('button');
    btnSelect.className = 'btn btn-primary';
    btnSelect.textContent = 'Load into Project';
    btnSelect.disabled = selectedId === null;

    footer.appendChild(btnCreate);
    footer.appendChild(btnSelect);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === 'Escape') close({ action: 'cancel' });
    }

    function close(result) {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(result);
    }

    // ── Event handlers ───────────────────────────────────────────────────────
    btnClose.addEventListener('click', () => close({ action: 'cancel' }));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close({ action: 'cancel' }); });
    document.addEventListener('keydown', onKeyDown);

    btnCreate.addEventListener('click', () => close({ action: 'create' }));

    btnSelect.addEventListener('click', () => {
      if (selectedId) close({ action: 'select', projectId: selectedId });
    });

    // ── Assemble ─────────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    if (selectedId) {
      btnSelect.focus();
    } else {
      btnCreate.focus();
    }
  });
}
