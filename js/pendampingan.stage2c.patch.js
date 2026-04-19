
(function (window, document) {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  function applyStatusKunjunganOptions() {
    var select = byId('pen-status-kunjungan');
    if (!select) return false;

    var current = String(select.value || '').trim();

    var options = [
      { value: '', label: 'Pilih status' },
      { value: 'Kunjungan Rumah', label: 'Kunjungan Rumah' },
      { value: 'BKB/Posyandu', label: 'BKB/Posyandu' }
    ];

    select.innerHTML = options.map(function (opt) {
      var selected = current === opt.value ? ' selected' : '';
      return '<option value="' +
        String(opt.value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;') +
        '"' + selected + '>' +
        String(opt.label)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;') +
        '</option>';
    }).join('');

    if (current && !options.some(function (opt) { return opt.value === current; })) {
      select.value = '';
    }

    return true;
  }

  function patchPendampinganStatus() {
    var PV = window.PendampinganView;
    if (!PV || PV.__stage2cPatched) return false;
    PV.__stage2cPatched = true;

    var origInit = PV.init;
    PV.init = function () {
      var out = origInit ? origInit.apply(this, arguments) : undefined;
      applyStatusKunjunganOptions();
      return out;
    };

    var origOpenCreate = PV.openCreate;
    if (typeof origOpenCreate === 'function') {
      PV.openCreate = async function () {
        var out = await origOpenCreate.apply(this, arguments);
        applyStatusKunjunganOptions();
        return out;
      };
    }

    var origOpenEditById = PV.openEditById;
    if (typeof origOpenEditById === 'function') {
      PV.openEditById = async function () {
        var out = await origOpenEditById.apply(this, arguments);
        applyStatusKunjunganOptions();
        return out;
      };
    }

    setTimeout(applyStatusKunjunganOptions, 0);
    return true;
  }

  function waitForPatch() {
    if (patchPendampinganStatus()) return;

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (patchPendampinganStatus() || tries > 120) {
        window.clearInterval(timer);
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPatch);
  } else {
    waitForPatch();
  }
})(window, document);
