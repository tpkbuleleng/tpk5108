window.Notifier = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, duration);
  },

  setMessageBox(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('hidden');
    el.textContent = message;
    el.style.background = isError ? '#FEE4E2' : '#EEF4FF';
    el.style.color = isError ? '#B42318' : '#0842A0';
  },

  clearMessageBox(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add('hidden');
    el.textContent = '';
  }
};
