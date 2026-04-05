(function (window, document) {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function setText(id, value, fallback) {
    var node = byId(id);
    if (!node) return;
    var next = value;
    if (next == null || next === '') {
      next = fallback != null ? fallback : '-';
    }
    node.textContent = next;
  }

  function setValue(id, value) {
    var node = byId(id);
    if (!node) return;
    node.value = value == null ? '' : value;
  }

  function show(idOrElement) {
    var node = typeof idOrElement === 'string' ? byId(idOrElement) : idOrElement;
    if (!node) return;
    node.classList.remove('hidden');
  }

  function hide(idOrElement) {
    var node = typeof idOrElement === 'string' ? byId(idOrElement) : idOrElement;
    if (!node) return;
    node.classList.add('hidden');
  }

  function toggle(idOrElement, shouldShow) {
    var target = typeof idOrElement === 'string' ? byId(idOrElement) : idOrElement;
    if (shouldShow) show(target);
    else hide(target);
  }

  function debounce(fn, wait) {
    var timeout = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait || 250);
    };
  }

  function parseDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    var date = parseDate(value);
    if (!date) return value ? String(value) : '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatDateTime(value) {
    var date = parseDate(value);
    if (!date) return value ? String(value) : '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMonthInputToday() {
    var date = new Date();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    return date.getFullYear() + '-' + month;
  }

  function formatCurrency(value) {
    var num = Number(String(value || '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeUpper(value) {
    return String(value || '').trim().toUpperCase();
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function randomId(prefix) {
    var part = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return (prefix || 'ID') + '-' + part.toUpperCase();
  }

  function createOption(value, label) {
    return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
  }

  function fillSelect(selectId, items, opts) {
    var select = byId(selectId);
    if (!select) return;
    var options = opts || {};
    var placeholder = options.placeholder || '';
    var html = '';
    if (placeholder) html += createOption('', placeholder);
    (items || []).forEach(function (item) {
      if (typeof item === 'string') {
        html += createOption(item, item);
      } else {
        html += createOption(item.value, item.label);
      }
    });
    select.innerHTML = html;
    if (options.value != null) select.value = options.value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function pickFirstObject() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (isPlainObject(arguments[i])) return arguments[i];
    }
    return {};
  }

  function pickFirstArray() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (Array.isArray(arguments[i])) return arguments[i];
    }
    return [];
  }

  function pickFirstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (arguments[i] != null && arguments[i] !== '') return arguments[i];
    }
    return '';
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    var text = String(value || '').trim().toLowerCase();
    return text === 'true' || text === '1' || text === 'yes' || text === 'ya' || text === 'ok';
  }

  function getAgeYears(dateValue) {
    var birthDate = parseDate(dateValue);
    if (!birthDate) return null;
    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  function getAgeMonths(dateValue) {
    var birthDate = parseDate(dateValue);
    if (!birthDate) return null;
    var today = new Date();
    var months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) months -= 1;
    return months;
  }

  window.AppUtils = {
    byId: byId,
    qs: qs,
    qsa: qsa,
    setText: setText,
    setValue: setValue,
    show: show,
    hide: hide,
    toggle: toggle,
    debounce: debounce,
    parseDate: parseDate,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatMonthInputToday: formatMonthInputToday,
    formatCurrency: formatCurrency,
    escapeHtml: escapeHtml,
    normalizeUpper: normalizeUpper,
    onlyDigits: onlyDigits,
    randomId: randomId,
    fillSelect: fillSelect,
    clone: clone,
    isPlainObject: isPlainObject,
    pickFirstObject: pickFirstObject,
    pickFirstArray: pickFirstArray,
    pickFirstValue: pickFirstValue,
    toBoolean: toBoolean,
    getAgeYears: getAgeYears,
    getAgeMonths: getAgeMonths
  };
})(window, document);
