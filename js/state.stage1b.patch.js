(function (window) {
  'use strict';

  if (!window.AppState) return;

  var AppState = window.AppState;
  var originalSetSyncQueue = AppState.setSyncQueue;

  function isMirrorGuardActive() {
    return window.__tpkStage1bSyncMirrorGuard === true;
  }

  AppState.setSyncQueue = function (queue) {
    var result = originalSetSyncQueue.apply(AppState, arguments);

    if (!isMirrorGuardActive() && window.Storage && typeof window.Storage.importLegacySyncQueue === 'function') {
      window.setTimeout(function () {
        window.Storage.importLegacySyncQueue(Array.isArray(queue) ? queue : []).catch(function () {});
      }, 0);
    }

    return result;
  };

  AppState.refreshSyncFromQueueRepo = async function () {
    if (!window.QueueRepo || typeof window.QueueRepo.syncLegacyMirror !== 'function') {
      return this.getSyncQueue();
    }
    return window.QueueRepo.syncLegacyMirror();
  };

  AppState.getSyncSummary = async function () {
    if (!window.QueueRepo || typeof window.QueueRepo.stats !== 'function') {
      var queue = this.getSyncQueue();
      return {
        total: Array.isArray(queue) ? queue.length : 0,
        pending: 0,
        processing: 0,
        success: 0,
        failed: 0,
        conflict: 0,
        duplicate: 0
      };
    }
    return window.QueueRepo.stats();
  };
})(window);
