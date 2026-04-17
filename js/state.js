/*!
 * state.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Memisahkan state menjadi domain yang jelas:
 *   1) sessionState
 *   2) bootstrapState
 *   3) syncState
 *   4) uiState
 * - Menghindari state campur aduk yang menyebabkan cache/profile/filter saling menimpa.
 * - Menyediakan subscribe/notify sederhana tanpa framework berat.
 *
 * ATURAN PERSIST
 * - sessionState: persist terbatas
 * - bootstrapState: persist terbatas dengan timestamp
 * - syncState: persist ringkas
 * - uiState: persist selektif
 */

(function (window) {
  'use strict';

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const createStore = (initialState) => {
    let state = clone(initialState);
    const listeners = new Set();

    return {
      getState() {
        return clone(state);
      },

      setState(patch, source = 'unknown') {
        const nextPatch = typeof patch === 'function' ? patch(clone(state)) : patch;
        state = Object.assign({}, state, nextPatch || {});
        listeners.forEach((fn) => {
          try {
            fn(clone(state), source);
          } catch (err) {
            console.warn('[AppState listener] gagal:', err);
          }
        });
      },

      replaceState(nextState, source = 'replace') {
        state = clone(nextState || {});
        listeners.forEach((fn) => {
          try {
            fn(clone(state), source);
          } catch (err) {
            console.warn('[AppState listener] gagal:', err);
          }
        });
      },

      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      }
    };
  };

  const defaults = {
    session: {
      tokenPointer: null,
      id_user: null,
      role: null,
      device_id: null,
      is_authenticated: false,
      session_expired_at: null,
      last_validated_at: null
    },

    bootstrap: {
      profile: null,
      permissions: null,
      refs: null,
      wilayah_summary: null,
      loaded_at: null,
      expires_at: null
    },

    sync: {
      is_syncing: false,
      pending_count: 0,
      failed_count: 0,
      conflict_count: 0,
      last_sync_at: null,
      last_error: null
    },

    ui: {
      active_screen: 'login',
      text_scale: 'normal',
      dark_mode: false,
      filters: {},
      dialogs: {},
      update_available: false
    }
  };

  const sessionStore = createStore(defaults.session);
  const bootstrapStore = createStore(defaults.bootstrap);
  const syncStore = createStore(defaults.sync);
  const uiStore = createStore(defaults.ui);

  const AppState = {
    defaults,

    session: sessionStore,
    bootstrap: bootstrapStore,
    sync: syncStore,
    ui: uiStore,

    /**
     * Muat state ringan dari StorageHelper.
     * Jangan memulihkan payload besar dari localStorage.
     */
    hydrate() {
      const sessionPointer = window.StorageHelper?.getJSON('session.pointer', null);
      const uiPrefs = window.StorageHelper?.getJSON('ui.prefs', null);

      if (sessionPointer) {
        sessionStore.setState(sessionPointer, 'hydrate:session');
      }

      if (uiPrefs) {
        uiStore.setState(uiPrefs, 'hydrate:ui');
      }
    },

    /**
     * Persist selektif.
     * Dipanggil setelah perubahan state tertentu.
     */
    persist() {
      const session = sessionStore.getState();
      const ui = uiStore.getState();
      const bootstrap = bootstrapStore.getState();

      if (window.StorageHelper) {
        window.StorageHelper.setJSON('session.pointer', {
          tokenPointer: session.tokenPointer,
          id_user: session.id_user,
          role: session.role,
          device_id: session.device_id,
          is_authenticated: session.is_authenticated,
          session_expired_at: session.session_expired_at
        });

        window.StorageHelper.setJSON('ui.prefs', {
          text_scale: ui.text_scale,
          dark_mode: ui.dark_mode,
          filters: ui.filters
        });

        window.StorageHelper.setJSON('bootstrap.stamp', {
          loaded_at: bootstrap.loaded_at,
          expires_at: bootstrap.expires_at
        });
      }
    },

    /**
     * Digunakan saat logout.
     */
    resetForLogout() {
      sessionStore.replaceState(defaults.session, 'logout');
      bootstrapStore.replaceState(defaults.bootstrap, 'logout');
      syncStore.replaceState(defaults.sync, 'logout');
      uiStore.setState({ active_screen: 'login' }, 'logout');

      if (window.StorageHelper) {
        window.StorageHelper.clearSensitive();
      }
    }
  };

  // Auto persist ringan saat state berubah.
  sessionStore.subscribe(() => AppState.persist());
  uiStore.subscribe(() => AppState.persist());
  bootstrapStore.subscribe(() => AppState.persist());

  window.AppState = AppState;
})(window);
