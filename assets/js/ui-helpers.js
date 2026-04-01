window.UI = {
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.add('hidden');
      el.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value !== undefined && value !== null && value !== '' ? String(value) : '-';
  },

  setHTML(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html || '';
  },

  setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value !== undefined && value !== null ? value : '';
  },

  toggleHidden(id, shouldHide = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', !!shouldHide);
  },

  setLoading(buttonId, isLoading, loadingText = 'Memproses...') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    if (isLoading) {
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
      }
      btn.disabled = true;
      btn.textContent = loadingText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
      delete btn.dataset.originalText;
    }
  },

  qs(selector) {
    return document.querySelector(selector);
  },

  qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }
};
