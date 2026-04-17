/*!
 * storage.js — Spesifikasi Implementasi Tahap 1
 * Project: TPK Kabupaten Buleleng
 *
 * TUJUAN
 * - Menjadi wrapper localStorage yang aman, ringan, dan terkontrol.
 * - Menyimpan hanya data kecil / preferensi UI / pointer sesi ringan.
 * - Tidak dipakai untuk draft besar, queue, cache daftar, atau payload operasional.
 *
 * YANG BOLEH DISIMPAN DI SINI
 * - device_id
 * - preferensi UI (dark mode, ukuran teks, tab aktif tertentu)
 * - pointer sesi ringan / flag bootstrap
 * - cache key kecil / timestamp
 *
 * YANG TIDAK BOLEH DISIMPAN DI SINI
 * - daftar sasaran besar
 * - payload registrasi / pendampingan
 * - queue sinkronisasi
 * - audit log lokal
 * - cache bootstrap besar
 *
 * KEBIJAKAN
 * - Semua key diberi namespace APP.
 * - Semua operasi JSON aman terhadap parse error.
 * - Ada fungsi clearSensitive() dan clearAllTPK() untuk logout/reset.
 * - Wajib graceful bila storage penuh / browser private mode.
 */

(function (window) {
  'use strict';

  const StorageHelper = {
    /**
     * Namespace final disarankan dibentuk dari APP_CONFIG.APP_CODE atau APP_NAME pendek.
     * Contoh:
     *   TPK::ui.text_scale
     *   TPK::session.pointer
     */
    namespace: 'TPK',

    /**
     * Public key map minimal untuk konsistensi.
     * Integrasikan dengan APP_CONFIG.STORAGE_KEYS bila sudah ada.
     */
    KEYS: {
      DEVICE_ID: 'device_id',
      SESSION_POINTER: 'session.pointer',
      UI_PREFS: 'ui.prefs',
      UI_TEXT_SCALE: 'ui.text_scale',
      UI_DARK_MODE: 'ui.dark_mode',
      BOOTSTRAP_STAMP: 'bootstrap.stamp',
      APP_VERSION_SEEN: 'app.version_seen'
    },

    /**
     * @param {string} key
     * @returns {string}
     */
    toKey(key) {
      return `${this.namespace}::${key}`;
    },

    /**
     * Set value string.
     * Harus dibungkus try/catch agar aman bila quota exceeded.
     * @param {string} key
     * @param {string} value
     * @returns {boolean}
     */
    set(key, value) {
      try {
        window.localStorage.setItem(this.toKey(key), String(value));
        return true;
      } catch (err) {
        console.warn('[StorageHelper.set] gagal:', key, err);
        return false;
      }
    },

    /**
     * Get raw string.
     * @param {string} key
     * @param {string|null} fallback
     * @returns {string|null}
     */
    get(key, fallback = null) {
      try {
        const value = window.localStorage.getItem(this.toKey(key));
        return value == null ? fallback : value;
      } catch (err) {
        console.warn('[StorageHelper.get] gagal:', key, err);
        return fallback;
      }
    },

    /**
     * Set JSON safely.
     * @param {string} key
     * @param {any} value
     * @returns {boolean}
     */
    setJSON(key, value) {
      try {
        return this.set(key, JSON.stringify(value));
      } catch (err) {
        console.warn('[StorageHelper.setJSON] gagal:', key, err);
        return false;
      }
    },

    /**
     * Get JSON safely.
     * @param {string} key
     * @param {any} fallback
     * @returns {any}
     */
    getJSON(key, fallback = null) {
      const raw = this.get(key, null);
      if (raw == null || raw === '') return fallback;
      try {
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[StorageHelper.getJSON] parse gagal:', key, err);
        return fallback;
      }
    },

    /**
     * Remove one key.
     * @param {string} key
     * @returns {boolean}
     */
    remove(key) {
      try {
        window.localStorage.removeItem(this.toKey(key));
        return true;
      } catch (err) {
        console.warn('[StorageHelper.remove] gagal:', key, err);
        return false;
      }
    },

    /**
     * Check existence.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
      return this.get(key, null) != null;
    },

    /**
     * Clear hanya key sensitif yang memang tersimpan ringan.
     * Dipanggil saat logout.
     */
    clearSensitive() {
      this.remove(this.KEYS.SESSION_POINTER);
      this.remove(this.KEYS.BOOTSTRAP_STAMP);
    },

    /**
     * Clear semua namespace TPK saja, tanpa menyentuh aplikasi lain.
     * Dipakai untuk "Reset cache ringan" versi baru yang lebih terkendali.
     */
    clearAllTPK() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(`${this.namespace}::`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        return true;
      } catch (err) {
        console.warn('[StorageHelper.clearAllTPK] gagal:', err);
        return false;
      }
    },

    /**
     * Debug helper.
     * Jangan tampilkan nilai sensitif ke UI produksi.
     */
    dumpKeys() {
      const out = [];
      try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(`${this.namespace}::`)) {
            out.push(key);
          }
        }
      } catch (err) {
        console.warn('[StorageHelper.dumpKeys] gagal:', err);
      }
      return out;
    }
  };

  window.StorageHelper = StorageHelper;
})(window);
