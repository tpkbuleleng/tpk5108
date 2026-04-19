
(function (window) {
  'use strict';

  var SAME_ORIGIN_ONLY = true;
  var PRIVATE_PATTERNS = [
    /script\.google\.com/i,
    /script\.googleusercontent\.com/i,
    /\/exec(\?|$)/i
  ];

  var APP_SHELL = [
    './',
    './index.html',
    './app.css',
    './manifest.webmanifest',
    './assets/img/logo.png',
    './assets/img/logo-192.png',
    './js/config.js',
    './js/storage.js',
    './js/state.js',
    './js/api.js',
    './js/auth.js',
    './js/bootstrap.js',
    './js/ui.js',
    './js/app.js'
  ];

  function toUrl(input) {
    try {
      return new URL(input, window.location.href);
    } catch (err) {
      return null;
    }
  }

  function isPrivateRequest(input, method) {
    var url = toUrl(input);
    if (!url) return true;
    if (String(method || 'GET').toUpperCase() !== 'GET') return true;
    return PRIVATE_PATTERNS.some(function (pattern) {
      return pattern.test(url.href);
    });
  }

  function isStaticAsset(input) {
    var url = toUrl(input);
    if (!url) return false;
    if (SAME_ORIGIN_ONLY && url.origin !== window.location.origin) return false;

    return /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot|json|webmanifest)$/i.test(url.pathname);
  }

  function shouldCacheRequest(input, method) {
    if (isPrivateRequest(input, method)) return false;
    return isStaticAsset(input) || isAppShellPath(input);
  }

  function isAppShellPath(input) {
    var url = toUrl(input);
    if (!url) return false;
    var path = url.pathname.replace(/\/+$/, '') || '/';
    return APP_SHELL.some(function (item) {
      var shellUrl = toUrl(item);
      return shellUrl && ((shellUrl.pathname.replace(/\/+$/, '') || '/') === path);
    });
  }

  window.CachePolicy = {
    APP_SHELL: APP_SHELL.slice(),
    isPrivateRequest: isPrivateRequest,
    isStaticAsset: isStaticAsset,
    isAppShellPath: isAppShellPath,
    shouldCacheRequest: shouldCacheRequest
  };
})(window);
