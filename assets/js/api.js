(function () {
  console.log('app.js loaded');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function () {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('Service worker registered');
      } catch (err) {
        console.warn('Service worker gagal didaftarkan:', err);
      }
    });
  }
})();
