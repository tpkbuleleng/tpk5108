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
    if (el) el.textContent = value ?? '-';
  },

  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  setLoading(buttonId, isLoading, loadingText = 'Memproses...') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    if (isLoading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = loadingText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }
};
