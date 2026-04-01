window.Notifier = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');

    if (!container) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = String(message || '');

    container.appendChild(toast);

    // batasi jumlah toast aktif agar tidak menumpuk terlalu banyak
    const toasts = Array.from(container.querySelectorAll('.toast'));
    if (toasts.length > 5) {
      toasts[0].remove();
    }

    window.setTimeout(() => {
      toast.remove();
    }, Number(duration || 3000));
  },

  setMessageBox(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.classList.remove('hidden');
    el.textContent = String(message || '');

    el.style.background = isError ? '#FEE4E2' : '#EEF4FF';
    el.style.color = isError ? '#B42318' : '#0842A0';
    el.style.border = isError ? '1px solid #FDA29B' : '1px solid #B2DDFF';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '10px';
    el.style.marginTop = '10px';
  },

  clearMessageBox(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.classList.add('hidden');
    el.textContent = '';
    el.style.background = '';
    el.style.color = '';
    el.style.border = '';
    el.style.padding = '';
    el.style.borderRadius = '';
    el.style.marginTop = '';
  }
};
