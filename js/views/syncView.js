(function (window, document) {
  'use strict';

  const VIEW_NAME = 'sync';
  const FALLBACK_QUEUE_KEYS = ['TPK_SYNC_QUEUE', 'SYNC_QUEUE', 'sync_queue'];
  const FALLBACK_LAST_SYNC_KEYS = ['TPK_LAST_SYNC_AT', 'LAST_SYNC_AT', 'last_sync_at'];
  const TRACKED_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CONFLICT', 'DUPLICATE'];

  function safeText(value, fallback) {
    if (value === 0) return '0';
    if (value === false) return 'Tidak';
    if (value === true) return 'Ya';
    if (value === null || value === undefined) return fallback || '-';
    const str = String(value).trim();
    return str || (fallback || '-');
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return safeText(value, '-');
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mi = String(dt.getMinutes()).padStart(2, '0');
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
  }

  function getRoot(root) {
    if (root && typeof root.querySelector === 'function') return root;
    return document.getElementById('content-area')
      || document.getElementById('app-content')
      || document.querySelector('[data-route-root]')
      || document.body;
  }

  function readLocal(key) {
    try {
      if (!key) return '';
      return window.localStorage.getItem(key) || '';
    } catch (err) {
      return '';
    }
  }

  function writeLocal(key, value) {
    try {
      if (!key) return;
      window.localStorage.setItem(key, value);
    } catch (err) {
      // no-op
    }
  }

  function readQueueFallback() {
    for (const key of FALLBACK_QUEUE_KEYS) {
      const raw = readLocal(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        // ignore malformed cache
      }
    }
    return [];
  }

  function writeQueueFallback(items) {
    const raw = JSON.stringify(Array.isArray(items) ? items : []);
    FALLBACK_QUEUE_KEYS.forEach((key) => writeLocal(key, raw));
  }

  function setStatus(root, text, type) {
    const box = root.querySelector('[data-sync-status]');
    if (!box) return;
    box.textContent = safeText(text, '');
    box.className = `sync-status sync-status-${type || 'info'}`;
  }

  function setText(root, selector, value) {
    const el = root.querySelector(selector);
    if (el) el.textContent = safeText(value, '-');
  }

  function getQueueRepo() {
    return window.QueueRepo || window.queueRepo || null;
  }

  function getSyncManager() {
    return window.SyncManager || window.syncManager || null;
  }

  async function readQueueItems() {
    const repo = getQueueRepo();
    const methods = ['listAll', 'getAll', 'list', 'all', 'findAll', 'getQueueItems'];

    if (repo) {
      for (const method of methods) {
        if (typeof repo[method] !== 'function') continue;
        const result = await repo[method]();
        if (Array.isArray(result)) return result;
        if (result && Array.isArray(result.items)) return result.items;
        if (result && Array.isArray(result.rows)) return result.rows;
      }
    }

    return readQueueFallback();
  }

  async function clearSuccessItems(currentItems) {
    const repo = getQueueRepo();
    const successStatuses = ['SUCCESS', 'DUPLICATE'];

    if (repo && typeof repo.clearByStatus === 'function') {
      await repo.clearByStatus(successStatuses);
      return true;
    }
    if (repo && typeof repo.clearSuccess === 'function') {
      await repo.clearSuccess();
      return true;
    }
    if (repo && typeof repo.deleteByStatus === 'function') {
      await repo.deleteByStatus(successStatuses);
      return true;
    }

    const filtered = (Array.isArray(currentItems) ? currentItems : []).filter((item) => {
      const status = String(item.status || '').toUpperCase();
      return !successStatuses.includes(status);
    });
    writeQueueFallback(filtered);
    return true;
  }

  function normalizeItem(item) {
    const payload = item && typeof item.payload === 'object' ? item.payload : {};
    return {
      queue_id: safeText(item.queue_id || item.id || item.local_id || item.client_submit_id, '-'),
      action: safeText(item.action || item.type || item.entity_type || '-', '-'),
      entity: safeText(item.entity_type || payload.entity_type || payload.jenis_sasaran || payload.id_sasaran || '-', '-'),
      status: String(item.status || 'PENDING').toUpperCase(),
      retry_count: Number(item.retry_count || 0),
      updated_at: item.updated_at || item.created_at || item.submit_at || '',
      created_at: item.created_at || item.updated_at || item.submit_at || '',
      message: safeText(item.last_error || item.message || payload.nama_sasaran || payload.nama || '-', '-'),
      raw: item
    };
  }

  function computeSummary(items) {
    const summary = {
      total: 0,
      lastSyncAt: FALLBACK_LAST_SYNC_KEYS.map(readLocal).find(Boolean) || '-',
      isSyncing: false
    };

    TRACKED_STATUSES.forEach((status) => {
      summary[status] = 0;
    });

    (Array.isArray(items) ? items : []).forEach((raw) => {
      const item = normalizeItem(raw);
      const status = TRACKED_STATUSES.includes(item.status) ? item.status : 'PENDING';
      summary.total += 1;
      summary[status] += 1;
      if (status === 'PROCESSING') summary.isSyncing = true;
    });

    return summary;
  }

  function renderSummary(root, summary) {
    setText(root, '[data-sync-online-state]', navigator.onLine ? 'Online' : 'Offline');
    setText(root, '[data-sync-total]', summary.total);
    setText(root, '[data-sync-pending]', summary.PENDING);
    setText(root, '[data-sync-processing]', summary.PROCESSING);
    setText(root, '[data-sync-success]', summary.SUCCESS + summary.DUPLICATE);
    setText(root, '[data-sync-failed]', summary.FAILED);
    setText(root, '[data-sync-conflict]', summary.CONFLICT);
    setText(root, '[data-sync-last]', formatDateTime(summary.lastSyncAt));
  }

  function renderQueueList(root, items) {
    const box = root.querySelector('[data-sync-queue-list]');
    if (!box) return;

    const normalized = (Array.isArray(items) ? items : []).map(normalizeItem)
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

    if (!normalized.length) {
      box.innerHTML = '<div class="card"><div class="card-body">Antrean sinkronisasi masih kosong.</div></div>';
      return;
    }

    box.innerHTML = normalized.slice(0, 50).map((item) => {
      const badgeBg = item.status === 'SUCCESS' || item.status === 'DUPLICATE'
        ? 'rgba(25,135,84,.12)'
        : item.status === 'FAILED' || item.status === 'CONFLICT'
          ? 'rgba(220,53,69,.10)'
          : item.status === 'PROCESSING'
            ? 'rgba(13,110,253,.10)'
            : 'rgba(255,193,7,.18)';

      return `
        <div class="card" style="margin-bottom:10px;">
          <div class="card-body" style="padding:14px;">
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
              <div>
                <div style="font-weight:700;">${safeText(item.action, '-')}</div>
                <div style="font-size:12px;opacity:.7;">ID antrean: ${safeText(item.queue_id, '-')}</div>
              </div>
              <div style="padding:5px 10px;border-radius:999px;background:${badgeBg};font-weight:700;font-size:12px;">${item.status}</div>
            </div>
            <div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
              <div><strong>Entitas:</strong> ${safeText(item.entity, '-')}</div>
              <div><strong>Retry:</strong> ${safeText(item.retry_count, '0')}</div>
              <div><strong>Diperbarui:</strong> ${formatDateTime(item.updated_at)}</div>
            </div>
            <div style="margin-top:8px;"><strong>Keterangan:</strong> ${safeText(item.message, '-')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function refresh(root, options) {
    const container = getRoot(root);
    const opts = options || {};

    if (!opts.silent) {
      setStatus(container, 'Membaca status sinkronisasi...', 'info');
    }

    const items = await readQueueItems();
    const summary = computeSummary(items);
    renderSummary(container, summary);
    renderQueueList(container, items);

    if (summary.total === 0) {
      setStatus(container, 'Tidak ada antrean yang menunggu sinkronisasi.', 'muted');
    } else if (summary.FAILED > 0 || summary.CONFLICT > 0) {
      setStatus(container, 'Ada item gagal atau konflik. Periksa daftar di bawah.', 'warning');
    } else if (summary.PENDING > 0 || summary.PROCESSING > 0) {
      setStatus(container, 'Masih ada data yang menunggu dikirim.', 'info');
    } else {
      setStatus(container, 'Antrean lokal bersih.', 'success');
    }

    const syncBtn = container.querySelector('[data-sync-run]');
    if (syncBtn) syncBtn.disabled = !navigator.onLine;

    return { items, summary };
  }

  async function runSync(root) {
    const container = getRoot(root);
    const manager = getSyncManager();
    const btn = container.querySelector('[data-sync-run]');
    if (btn) btn.disabled = true;

    try {
      if (!navigator.onLine) {
        throw new Error('Perangkat sedang offline. Sinkronisasi ditunda.');
      }

      setStatus(container, 'Sinkronisasi sedang berjalan...', 'info');

      let result = null;
      const methods = ['startSync', 'syncNow', 'run', 'flush', 'processQueue'];

      if (manager) {
        for (const method of methods) {
          if (typeof manager[method] !== 'function') continue;
          result = await manager[method]();
          break;
        }
      }

      const nowIso = new Date().toISOString();
      FALLBACK_LAST_SYNC_KEYS.forEach((key) => writeLocal(key, nowIso));

      await refresh(container, { silent: true });
      setStatus(container, result && result.message ? result.message : 'Sinkronisasi selesai.', 'success');
    } catch (err) {
      setStatus(container, err && err.message ? err.message : 'Sinkronisasi gagal dijalankan.', 'error');
    } finally {
      if (btn) btn.disabled = !navigator.onLine;
    }
  }

  async function bind(root) {
    const container = getRoot(root);

    const refreshBtn = container.querySelector('[data-sync-refresh]');
    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener('click', function () {
        refresh(container);
      });
    }

    const runBtn = container.querySelector('[data-sync-run]');
    if (runBtn && !runBtn.__bound) {
      runBtn.__bound = true;
      runBtn.addEventListener('click', function () {
        runSync(container);
      });
    }

    const clearBtn = container.querySelector('[data-sync-clear-success]');
    if (clearBtn && !clearBtn.__bound) {
      clearBtn.__bound = true;
      clearBtn.addEventListener('click', async function () {
        const current = await readQueueItems();
        await clearSuccessItems(current);
        await refresh(container, { silent: true });
        setStatus(container, 'Riwayat sukses lokal dibersihkan.', 'success');
      });
    }

    if (!window.__syncViewOnlineBound) {
      window.__syncViewOnlineBound = true;
      window.addEventListener('online', function () {
        const liveRoot = getRoot(container);
        refresh(liveRoot, { silent: true });
      });
      window.addEventListener('offline', function () {
        const liveRoot = getRoot(container);
        refresh(liveRoot, { silent: true });
      });
    }
  }

  function template() {
    return `
      <section class="screen screen-sync" data-screen="sync" style="padding:12px;">
        <div class="card" style="margin-bottom:12px;">
          <div class="card-body" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:12px;opacity:.75;letter-spacing:.04em;">SINKRONISASI</div>
                <h2 style="margin:6px 0 4px;">Sinkronisasi Data</h2>
                <div style="opacity:.8;">Memantau antrean lokal, status online, dan proses kirim data.</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary" data-sync-refresh>Muat Ulang</button>
                <button type="button" class="btn btn-secondary" data-sync-clear-success>Bersihkan Riwayat Sukses</button>
                <button type="button" class="btn btn-primary" data-sync-run>Sinkronkan Sekarang</button>
              </div>
            </div>
            <div data-sync-status class="sync-status sync-status-info" style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(13,110,253,.08);">Menyiapkan status sinkronisasi...</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-body" style="padding:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
              <div style="padding:12px;border-radius:14px;background:rgba(13,110,253,.06);">
                <div style="font-size:12px;opacity:.7;">Jaringan</div>
                <div data-sync-online-state style="font-size:18px;font-weight:700;">${navigator.onLine ? 'Online' : 'Offline'}</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(255,193,7,.16);">
                <div style="font-size:12px;opacity:.7;">Pending</div>
                <div data-sync-pending style="font-size:18px;font-weight:700;">0</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(13,110,253,.10);">
                <div style="font-size:12px;opacity:.7;">Processing</div>
                <div data-sync-processing style="font-size:18px;font-weight:700;">0</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(25,135,84,.12);">
                <div style="font-size:12px;opacity:.7;">Sukses</div>
                <div data-sync-success style="font-size:18px;font-weight:700;">0</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(220,53,69,.10);">
                <div style="font-size:12px;opacity:.7;">Gagal</div>
                <div data-sync-failed style="font-size:18px;font-weight:700;">0</div>
              </div>
              <div style="padding:12px;border-radius:14px;background:rgba(111,66,193,.10);">
                <div style="font-size:12px;opacity:.7;">Konflik</div>
                <div data-sync-conflict style="font-size:18px;font-weight:700;">0</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;opacity:.82;">
              <div>Total antrean: <strong data-sync-total>0</strong></div>
              <div>Sinkron terakhir: <strong data-sync-last>-</strong></div>
            </div>
          </div>
        </div>

        <div data-sync-queue-list></div>
      </section>
    `;
  }

  const View = {
    id: VIEW_NAME,
    title: 'Sinkronisasi',
    render(root) {
      const html = template();
      if (root && typeof root.innerHTML !== 'undefined') {
        root.innerHTML = html;
        return root;
      }
      return html;
    },
    async afterRender(root) {
      await bind(root);
      await refresh(root, { silent: false });
    },
    async mount(root) {
      const el = getRoot(root);
      this.render(el);
      await this.afterRender(el);
      return el;
    }
  };

  window.syncView = View;
  window.SyncView = View;
  window.appViews = window.appViews || {};
  window.appViews[VIEW_NAME] = View;
})(window, document);
