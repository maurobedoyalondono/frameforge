/**
 * brief-manager.js — "My Briefs" two-panel modal.
 *
 * Usage:
 *   const bm = new BriefManager(briefStorage, (briefId, startStep) => conceptBuilder.open(onImages, briefId, startStep));
 *   bm.open();
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (isoDate === today)     return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  // "Mar 25" format
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function platformLabel(platformValue) {
  const MAP = {
    'instagram-portrait': 'Instagram Portrait',
    'instagram-square':   'Instagram Square',
    'instagram-story':    'Instagram Story',
    'facebook-feed':      'Facebook Feed',
    'facebook-cover':     'Facebook Cover',
    'print-a4-portrait':  'Print A4 Portrait',
    'print-a4-landscape': 'Print A4 Landscape',
    'custom':             'Custom',
  };
  return MAP[platformValue] ?? platformValue ?? '';
}

// ── BriefManager ─────────────────────────────────────────────────────────────

export class BriefManager {
  /**
   * @param {object} storage — briefStorage module (save, load, list, remove)
   * @param {function(string|null, number): void} openConceptBuilder — called with (briefId, startStep)
   */
  constructor(storage, openConceptBuilder) {
    this._storage             = storage;
    this._openConceptBuilder  = openConceptBuilder;
    this._backdrop            = null;
    this._onKeyDown           = null;
    this._selectedId          = null;
    this._searchQuery         = '';
    this._sortMode            = 'updated';  // 'updated' | 'title' | 'created'
    this._deleteConfirmId     = null;
    this._storyExpanded       = false;
    this._activeBriefId       = null;
    this._onActiveBriefChange = null;
  }

  setOnActiveBriefChange(cb) {
    this._onActiveBriefChange = cb;
  }

  open(activeBriefId = null) {
    if (this._backdrop) return;
    this._selectedId      = null;
    this._activeBriefId   = activeBriefId ?? null;
    this._searchQuery     = '';
    this._sortMode        = 'updated';
    this._deleteConfirmId = null;
    this._storyExpanded   = false;
    this._render();
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _render() {
    if (this._backdrop) {
      this._backdrop.remove();
      this._backdrop = null;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'bm-backdrop';
    backdrop.innerHTML = `
      <div class="bm-modal" role="dialog" aria-modal="true" aria-label="My Projects">

        <div class="bm-header">
          <span class="bm-header-title">My Projects</span>
          <button class="btn btn-ghost btn-icon bm-close" aria-label="Close">✕</button>
        </div>

        <div class="bm-body">
          <div class="bm-list-panel">
            <div class="bm-list-toolbar">
              <input type="text" class="input bm-search" id="bm-search"
                placeholder="Search projects…" value="${escHtml(this._searchQuery)}" autocomplete="off">
              <select class="input bm-sort" id="bm-sort">
                <option value="updated" ${this._sortMode === 'updated' ? 'selected' : ''}>Last updated</option>
                <option value="title"   ${this._sortMode === 'title'   ? 'selected' : ''}>Title A→Z</option>
                <option value="created" ${this._sortMode === 'created' ? 'selected' : ''}>Created</option>
              </select>
            </div>
            <div class="bm-active-hint">Double-click to set active project</div>
            <div class="bm-list-items" id="bm-list-items">
              ${this._renderListItems()}
            </div>
            <div class="bm-list-footer">
              <button class="btn btn-secondary btn-sm" id="bm-new">+ New Project</button>
            </div>
          </div>

          <div class="bm-detail-panel" id="bm-detail-panel">
            ${this._renderDetail()}
          </div>
        </div>

      </div>
    `;

    this._backdrop = backdrop;
    document.body.appendChild(backdrop);
    this._bindEvents();
  }

  _getFilteredSorted() {
    let items = this._storage.list();  // already sorted by updated desc

    // Filter
    if (this._searchQuery.trim()) {
      const q = this._searchQuery.trim().toLowerCase();
      items = items.filter((b) => b.title.toLowerCase().includes(q));
    }

    // Sort
    if (this._sortMode === 'title') {
      items = items.slice().sort((a, b) => a.title.localeCompare(b.title));
    } else if (this._sortMode === 'created') {
      items = items.slice().sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
    }
    // 'updated' is already the default order from list()

    return items;
  }

  _renderListItems() {
    const allBriefs = this._storage.list();

    if (allBriefs.length === 0) {
      return `<div class="bm-empty">
        <div>No projects yet.</div>
        <button class="btn btn-secondary btn-sm" id="bm-empty-create">+ Create your first project</button>
      </div>`;
    }

    const items = this._getFilteredSorted();

    if (items.length === 0) {
      return `<div class="bm-empty"><div>No projects match your search.</div></div>`;
    }

    return items.map((b) => `
      <div class="bm-item ${b.id === this._selectedId ? 'selected' : ''} ${b.id === this._activeBriefId ? 'active' : ''}"
           data-id="${escHtml(b.id)}">
        <div class="bm-item-title">${escHtml(b.title || '(untitled)')}<span class="bm-layout-dot" title="${b.hasLayout ? 'Layout loaded' : 'No layout'}">${b.hasLayout ? '●' : '○'}</span></div>
        <div class="bm-item-meta">
          ${escHtml(platformLabel(b.platform))}${b.imageCount ? ` · ${b.imageCount} img` : ''}
          · ${formatDate(b.updated)}
        </div>
      </div>
    `).join('');
  }

  _renderDetail() {
    if (!this._selectedId) {
      return `<div class="bm-detail-empty">Select a project to see details</div>`;
    }

    const brief = this._storage.load(this._selectedId);
    if (!brief) {
      return `<div class="bm-detail-empty">Project not found.</div>`;
    }

    const plat = platformLabel(brief.platform);
    const dims = brief.platform === 'custom'
      ? (brief.customW && brief.customH ? ` (${brief.customW}×${brief.customH}px)` : '')
      : '';

    const toneTxt = brief.tone === 'custom'
      ? (brief.toneCustom || '')
      : brief.tone
        ? brief.tone.replace(/-/g, ' ')
        : 'Let the AI decide';

    const storyHtml = brief.story
      ? `<div class="bm-detail-story ${this._storyExpanded ? 'expanded' : ''}" id="bm-detail-story">
           ${escHtml(brief.story)}
         </div>
         <button class="bm-story-expand" id="bm-story-expand">
           ${this._storyExpanded ? 'Show less' : 'Show more'}
         </button>`
      : `<div class="bm-detail-row"><em style="color:var(--color-text-muted,#888)">No story</em></div>`;

    const deleteHtml = this._deleteConfirmId === brief.id
      ? `<div class="bm-delete-confirm">
           Delete this project?
           <button class="btn btn-danger btn-sm" id="bm-delete-confirm-yes">Delete</button>
           <button class="btn btn-ghost btn-sm"  id="bm-delete-confirm-no">Cancel</button>
         </div>`
      : '';

    return `
      <div class="bm-detail-content">
        <div class="bm-detail-title">
          ${escHtml(brief.title || '(untitled)')}
          ${this._selectedId === this._activeBriefId
            ? `<span class="bm-active-badge">● active</span>`
            : ''}
        </div>
        <div class="bm-detail-row">
          <strong>${escHtml(plat)}${escHtml(dims)}</strong>
        </div>
        <div class="bm-detail-row">Tone: <strong>${escHtml(toneTxt)}</strong></div>
        ${storyHtml}
        ${brief.imageCount
          ? `<div class="bm-detail-images-note">${brief.imageCount} image${brief.imageCount !== 1 ? 's' : ''} loaded last time</div>`
          : ''}
        <div class="bm-detail-row" style="font-size:11px;color:var(--color-text-muted,#888)">
          Last updated: ${formatDate(brief.updated)}
        </div>
      </div>

      <div class="bm-detail-actions">
        <button class="btn btn-primary btn-sm"    id="bm-action-edit">Edit</button>
        <button class="btn btn-secondary btn-sm"  id="bm-action-export">Export Package</button>
        <button class="btn btn-ghost btn-sm"      id="bm-action-copy">Copy Prompt</button>
        <button class="btn btn-ghost btn-sm"      id="bm-action-duplicate">Duplicate</button>
        <button class="btn btn-ghost btn-sm btn-danger" id="bm-action-delete">Delete</button>
      </div>

      ${deleteHtml}
    `;
  }

  _refreshDetail() {
    const panel = this._backdrop?.querySelector('#bm-detail-panel');
    if (panel) {
      panel.innerHTML = this._renderDetail();
      this._bindDetailEvents();
    }
  }

  _refreshList() {
    const list = this._backdrop?.querySelector('#bm-list-items');
    if (list) {
      list.innerHTML = this._renderListItems();
      this._bindListItemEvents();
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  _bindEvents() {
    const b = this._backdrop;

    b.querySelector('.bm-close').addEventListener('click', () => this._close());
    b.addEventListener('click', (e) => { if (e.target === b) this._close(); });

    if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
    document.addEventListener('keydown', this._onKeyDown = (e) => {
      if (e.key === 'Escape') this._close();
    });

    b.querySelector('#bm-search').addEventListener('input', (e) => {
      this._searchQuery = e.target.value;
      this._refreshList();
    });

    b.querySelector('#bm-sort').addEventListener('change', (e) => {
      this._sortMode = e.target.value;
      this._refreshList();
    });

    b.querySelector('#bm-new').addEventListener('click', () => {
      this._close();
      this._openConceptBuilder(null, 1);
    });

    this._bindListItemEvents();
    this._bindDetailEvents();
  }

  _bindListItemEvents() {
    const b = this._backdrop;
    if (!b) return;

    // Empty state "Create first brief" button
    b.querySelector('#bm-empty-create')?.addEventListener('click', () => {
      this._close();
      this._openConceptBuilder(null, 1);
    });

    b.querySelectorAll('.bm-item').forEach((el) => {
      el.addEventListener('click', () => {
        this._selectedId      = el.dataset.id;
        this._deleteConfirmId = null;
        this._storyExpanded   = false;
        b.querySelectorAll('.bm-item').forEach((i) => i.classList.remove('selected'));
        el.classList.add('selected');
        this._refreshDetail();
      });

      el.addEventListener('dblclick', () => {
        const id    = el.dataset.id;
        const brief = this._storage.load(id);
        this._activeBriefId = id;
        this._onActiveBriefChange?.(id, brief?.title ?? '');
        this._close();
      });
    });
  }

  _bindDetailEvents() {
    const b = this._backdrop;
    if (!b || !this._selectedId) return;

    b.querySelector('#bm-story-expand')?.addEventListener('click', () => {
      this._storyExpanded = !this._storyExpanded;
      const story = b.querySelector('#bm-detail-story');
      const btn   = b.querySelector('#bm-story-expand');
      if (story) story.classList.toggle('expanded', this._storyExpanded);
      if (btn)   btn.textContent = this._storyExpanded ? 'Show less' : 'Show more';
    });

    b.querySelector('#bm-action-edit')?.addEventListener('click', () => {
      const id = this._selectedId;
      this._close();
      this._openConceptBuilder(id, 1);
    });

    b.querySelector('#bm-action-export')?.addEventListener('click', () => {
      const id = this._selectedId;
      this._close();
      this._openConceptBuilder(id, 4);
    });

    b.querySelector('#bm-action-copy')?.addEventListener('click', () => {
      this._doCopyPrompt(this._selectedId);
    });

    b.querySelector('#bm-action-duplicate')?.addEventListener('click', () => {
      this._doDuplicate(this._selectedId);
    });

    b.querySelector('#bm-action-delete')?.addEventListener('click', () => {
      this._deleteConfirmId = this._selectedId;
      this._refreshDetail();
    });

    b.querySelector('#bm-delete-confirm-yes')?.addEventListener('click', async () => {
      const wasActive  = this._selectedId === this._activeBriefId;
      const deletedId  = this._selectedId;
      try {
        await this._storage.deleteProject(this._selectedId);
      } finally {
        this._selectedId      = null;
        this._deleteConfirmId = null;
        if (wasActive) {
          this._activeBriefId = null;
          this._onActiveBriefChange?.(null, null, deletedId);
        }
        this._refreshList();
        this._refreshDetail();
      }
    });

    b.querySelector('#bm-delete-confirm-no')?.addEventListener('click', () => {
      this._deleteConfirmId = null;
      this._refreshDetail();
    });
  }

  _doDuplicate(id) {
    const brief = this._storage.load(id);
    if (!brief) return;
    const copy = {
      ...brief,
      id:      null,  // save() will generate new id
      title:   (brief.title || '(untitled)') + ' (copy)',
      created: null,  // save() will set created
    };
    const newId = this._storage.save(copy);
    this._selectedId = newId;
    this._refreshList();
    this._refreshDetail();
  }

  _doCopyPrompt(id) {
    const brief = this._storage.load(id);
    if (!brief) return;
    const text = this._buildPromptFromBrief(brief);
    const btn = this._backdrop?.querySelector('#bm-action-copy');
    const restore = () => { if (btn) btn.textContent = 'Copy Prompt'; };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      }).catch(() => this._fallbackCopy(text, () => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      }));
    } else {
      this._fallbackCopy(text, () => {
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(restore, 2000); }
      });
    }
  }

  _buildPromptFromBrief(brief) {
    const PLATFORM_MAP = {
      'instagram-portrait': { label: 'Instagram Portrait 4:5 (1080×1350)', w: 1080, h: 1350, dpi: 72  },
      'instagram-square':   { label: 'Instagram Square 1:1 (1080×1080)',   w: 1080, h: 1080, dpi: 72  },
      'instagram-story':    { label: 'Instagram Story 9:16 (1080×1920)',   w: 1080, h: 1920, dpi: 72  },
      'facebook-feed':      { label: 'Facebook Feed (1200×630)',            w: 1200, h:  630, dpi: 72  },
      'facebook-cover':     { label: 'Facebook Cover (820×312)',            w:  820, h:  312, dpi: 72  },
      'print-a4-portrait':  { label: 'Print A4 Portrait (2480×3508)',       w: 2480, h: 3508, dpi: 300 },
      'print-a4-landscape': { label: 'Print A4 Landscape (3508×2480)',      w: 3508, h: 2480, dpi: 300 },
    };

    const preset = PLATFORM_MAP[brief.platform] ?? { label: brief.platform, w: parseInt(brief.customW)||1080, h: parseInt(brief.customH)||1080, dpi: 72 };
    const toneTxt = brief.tone === 'custom'
      ? (brief.toneCustom || '')
      : brief.tone
        ? brief.tone.replace(/-/g, ' ')
        : 'Let the AI decide based on the story and images';

    return `I'm working on a photography project and need you to design FrameForge layouts for it.
I'm attaching:

- The FrameForge brief file (full technical instructions for generating the JSON)
- Sample design mockups (layout references — study element sizes and zones)
- Thumbnail sheets with all images numbered

**Project:** ${brief.title || '(untitled)'}
**Platform:** ${preset.label}
**Story:** ${brief.story || '(no story provided)'}
**Tone:** ${toneTxt}
${brief.notes ? `**Notes:** ${brief.notes}` : ''}
**Images:** ${brief.imageCount || 0} image${(brief.imageCount || 0) !== 1 ? 's' : ''}

Please generate a FrameForge JSON layout following all instructions in the brief file.
Output only the raw JSON — no markdown fences, no explanation.
`;
  }

  _fallbackCopy(text, callback) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    callback?.();
  }

  _close() {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    this._backdrop?.remove();
    this._backdrop = null;
  }
}
