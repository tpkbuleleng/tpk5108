(function (window) {
  'use strict';

  function get(key, fallbackValue) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallbackValue;
      return JSON.parse(raw);
    } catch (err) {
      return fallbackValue;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearKeys(keys) {
    (keys || []).forEach(remove);
  }

  function getKeys() {
    return (window.AppConfig && window.AppConfig.STORAGE_KEYS) || {};
  }

  function getQueue() {
    return get(getKeys().SYNC_QUEUE, []);
  }

  function setQueue(items) {
    return set(getKeys().SYNC_QUEUE, Array.isArray(items) ? items : []);
  }

  function pushQueue(item) {
    var queue = getQueue();
    queue.push(item);
    setQueue(queue);
    return queue;
  }

  function updateQueueItem(clientSubmitId, patch) {
    var queue = getQueue().map(function (item) {
      if (item.client_submit_id !== clientSubmitId) return item;
      return Object.assign({}, item, patch || {});
    });
    setQueue(queue);
    return queue;
  }

  function removeQueueItem(clientSubmitId) {
    var queue = getQueue().filter(function (item) {
      return item.client_submit_id !== clientSubmitId;
    });
    setQueue(queue);
    return queue;
  }

  window.AppStorage = {
    get: get,
    set: set,
    remove: remove,
    clearKeys: clearKeys,
    getQueue: getQueue,
    setQueue: setQueue,
    pushQueue: pushQueue,
    updateQueueItem: updateQueueItem,
    removeQueueItem: removeQueueItem
  };
})(window);
