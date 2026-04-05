(function (window, document) {
  'use strict';

  function getProfile() {
    return (window.AppState && window.AppState.getState().profile) || null;
  }

  function getSummary() {
    return (window.AppState && window.AppState.getState().dashboardSummary) || null;
  }

  function renderProfile(profile) {
    profile = profile || {};
    window.AppUtils.setText('profile-nama', profile.nama_user || profile.nama_kader);
    window.AppUtils.setText('profile-unsur', profile.unsur_tpk || profile.role_akses || profile.role);
    window.AppUtils.setText('profile-id', profile.id_user);
    window.AppUtils.setText('profile-tim', profile.nama_tim || profile.id_tim);
    window.AppUtils.setText('profile-desa', profile.desa_kelurahan);
    window.AppUtils.setText('profile-dusun', profile.dusun_rw);
    window.AppUtils.setText('header-kecamatan', profile.kecamatan);
  }

  function renderSummary(summary) {
    summary = summary || {};
    window.AppUtils.setText('stat-sasaran', summary.jumlah_sasaran || summary.total_sasaran || 0, '0');
    window.AppUtils.setText('stat-pendampingan', summary.pendampingan_bulan_ini || summary.total_pendampingan || 0, '0');
    window.AppUtils.setText('stat-draft', summary.draft_pending || summary.total_draft || 0, '0');
  }

  function renderMenu() {
    var container = document.getElementById('menu-grid');
    if (!container) return;
    var menus = (window.AppConfig && window.AppConfig.MENU_ITEMS) || [];

    container.innerHTML = menus.map(function (item) {
      return '' +
        '<button type="button" class="menu-card menu-card-accent-' + (item.accent || 1) + '" data-menu-id="' + item.id + '">' +
          '<div class="menu-card__head">' +
            '<span class="menu-card__icon">' + window.AppUtils.escapeHtml(item.icon || '•') + '</span>' +
            '<span class="menu-card__meta">Menu</span>' +
          '</div>' +
          '<h4>' + window.AppUtils.escapeHtml(item.title || '') + '</h4>' +
          '<p>' + window.AppUtils.escapeHtml(item.desc || '') + '</p>' +
          '<span class="menu-card__cta">Buka</span>' +
        '</button>';
    }).join('');
  }

  function bindMenuActions() {
    var container = document.getElementById('menu-grid');
    if (!container || container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    container.addEventListener('click', function (event) {
      var button = event.target.closest('[data-menu-id]');
      if (!button) return;

      var menuId = button.getAttribute('data-menu-id');
      var menus = (window.AppConfig && window.AppConfig.MENU_ITEMS) || [];
      var found = menus.find(function (item) { return item.id === menuId; });
      if (!found) return;

      if (found.screen) {
        window.AppRouter.goTo(found.screen);
        return;
      }

      if (found.action === 'openProfile' && window.App && typeof window.App.openProfileDialog === 'function') {
        window.App.openProfileDialog();
        return;
      }

      if (found.action === 'openHelp' && window.App && typeof window.App.openHelpDialog === 'function') {
        window.App.openHelpDialog();
      }
    });
  }

  function populateProfileModal() {
    var profile = getProfile() || {};
    var mappings = {
      'modal-profile-nama': profile.nama_user || profile.nama_kader,
      'modal-profile-id': profile.id_user,
      'modal-profile-unsur': profile.unsur_tpk || profile.role_akses || profile.role,
      'modal-profile-tim': profile.nama_tim || profile.id_tim,
      'modal-profile-kecamatan': profile.kecamatan,
      'modal-profile-desa': profile.desa_kelurahan,
      'modal-profile-dusun': profile.dusun_rw,
      'modal-profile-status-kader': profile.status_kader_tpk,
      'modal-profile-nomor-wa': profile.nomor_wa,
      'modal-profile-bpjstk': profile.memiliki_bpjstk,
      'modal-profile-mbg': profile.mengantar_mbg_3b,
      'modal-profile-mbg-insentif': profile.mendapat_insentif_mbg_3b,
      'modal-profile-mbg-rupiah': profile.insentif_mbg_3b_per_sasaran ? window.AppUtils.formatCurrency(profile.insentif_mbg_3b_per_sasaran) : '-'
    };

    Object.keys(mappings).forEach(function (id) {
      window.AppUtils.setText(id, mappings[id]);
    });

    window.AppUtils.setValue('profile-status-kader', profile.status_kader_tpk || '');
    window.AppUtils.setValue('profile-nomor-wa', profile.nomor_wa || '');
    window.AppUtils.setValue('profile-memiliki-bpjstk', profile.memiliki_bpjstk || '');
    window.AppUtils.setValue('profile-mengantar-mbg', profile.mengantar_mbg_3b || '');
    window.AppUtils.setValue('profile-mendapat-insentif-mbg', profile.mendapat_insentif_mbg_3b || '');
    window.AppUtils.setValue('profile-insentif-rupiah', profile.insentif_mbg_3b_per_sasaran || '');
    updateProfileConditionalFields();
  }

  async function loadSummary() {
    var action = (window.AppConfig.API_ACTIONS || {}).GET_DASHBOARD_SUMMARY || 'getDashboardSummary';
    var result = await window.Api.post(action, {});
    if (!(result && result.ok)) {
      throw new Error(window.Api.getMessage(result, 'Ringkasan dashboard gagal dimuat.'));
    }

    var data = window.Api.getData(result);
    var summary = window.AppUtils.pickFirstObject(data.summary, data.dashboard, data, {});
    window.AppState.patch({ dashboardSummary: summary });
    window.AppStorage.set(((window.AppConfig || {}).STORAGE_KEYS || {}).DASHBOARD_SUMMARY, summary);
    renderSummary(summary);
    return summary;
  }

  async function loadMyProfile() {
    var action = (window.AppConfig.API_ACTIONS || {}).GET_MY_PROFILE || 'getMyProfile';
    var result = await window.Api.post(action, {});
    if (!(result && result.ok)) return null;
    var profile = window.Auth.normalizeProfile(window.Api.getProfile(result));
    window.Auth.persistSession(window.Api.getToken(result) || window.AppState.getState().sessionToken, profile);
    renderProfile(profile);
    populateProfileModal();
    return profile;
  }

  function updateProfileConditionalFields() {
    var mengantar = ((document.getElementById('profile-mengantar-mbg') || {}).value || '').toUpperCase();
    var dapatInsentif = ((document.getElementById('profile-mendapat-insentif-mbg') || {}).value || '').toUpperCase();
    window.AppUtils.toggle('group-profile-mbg-insentif', mengantar === 'YA');
    window.AppUtils.toggle('group-profile-insentif-rupiah', mengantar === 'YA' && dapatInsentif === 'YA');
  }

  function bindProfileActions() {
    var editBtn = document.getElementById('btn-profile-edit');
    var cancelBtn = document.getElementById('btn-profile-cancel-edit');
    var form = document.getElementById('profile-edit-form');
    var mengantar = document.getElementById('profile-mengantar-mbg');
    var insentif = document.getElementById('profile-mendapat-insentif-mbg');

    [mengantar, insentif].forEach(function (node) {
      if (!node || node.dataset.bound) return;
      node.dataset.bound = '1';
      node.addEventListener('change', updateProfileConditionalFields);
    });

    if (editBtn && !editBtn.dataset.bound) {
      editBtn.dataset.bound = '1';
      editBtn.addEventListener('click', function () {
        window.AppUtils.hide('profile-view-mode');
        window.AppUtils.show('profile-edit-mode');
        updateProfileConditionalFields();
      });
    }

    if (cancelBtn && !cancelBtn.dataset.bound) {
      cancelBtn.dataset.bound = '1';
      cancelBtn.addEventListener('click', function () {
        window.AppUtils.hide('profile-edit-mode');
        window.AppUtils.show('profile-view-mode');
      });
    }

    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var payload = {
          status_kader_tpk: (document.getElementById('profile-status-kader') || {}).value || '',
          nomor_wa: (document.getElementById('profile-nomor-wa') || {}).value || '',
          memiliki_bpjstk: (document.getElementById('profile-memiliki-bpjstk') || {}).value || '',
          mengantar_mbg_3b: (document.getElementById('profile-mengantar-mbg') || {}).value || '',
          mendapat_insentif_mbg_3b: (document.getElementById('profile-mendapat-insentif-mbg') || {}).value || '',
          insentif_mbg_3b_per_sasaran: window.AppUtils.onlyDigits((document.getElementById('profile-insentif-rupiah') || {}).value || '')
        };

        try {
          var action = (window.AppConfig.API_ACTIONS || {}).UPDATE_MY_PROFILE || 'updateMyProfile';
          var result = await window.Api.post(action, payload);
          if (!(result && result.ok)) {
            throw new Error((result && result.message) || 'Perubahan profil gagal diproses.');
          }
          var merged = Object.assign({}, getProfile() || {}, payload, window.Auth.normalizeProfile(window.Api.getProfile(result)));
          window.Auth.persistSession(window.Api.getToken(result) || window.AppState.getState().sessionToken, merged);
          renderProfile(merged);
          populateProfileModal();
          window.AppUtils.hide('profile-edit-mode');
          window.AppUtils.show('profile-view-mode');
          if (window.UI && window.UI.showToast) {
            window.UI.showToast('Perubahan profil berhasil disimpan.', 'success');
          }
        } catch (err) {
          if (window.UI && window.UI.showToast) {
            window.UI.showToast(err.message || 'Perubahan profil gagal disimpan.', 'error');
          }
        }
      });
    }
  }

  function init() {
    renderMenu();
    bindMenuActions();
    bindProfileActions();
  }

  async function onEnter() {
    renderProfile(getProfile());
    renderSummary(getSummary());
    populateProfileModal();

    try {
      await Promise.all([loadMyProfile(), loadSummary()]);
    } catch (err) {
      if (window.UI && window.UI.showToast) {
        window.UI.showToast(err.message || 'Dashboard menggunakan data terakhir yang tersedia.', 'warning');
      }
    }
  }

  window.DashboardView = {
    init: init,
    onEnter: onEnter,
    renderMenu: renderMenu,
    populateProfileModal: populateProfileModal
  };
})(window, document);
