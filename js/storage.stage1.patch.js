
(function (window) {
  'use strict';

  if (!window.Storage) return;

  var Storage = window.Storage;
  var SCHEMA_KEY = 'tpk_local_schema_version';
  var DEFAULT_SCHEMA_VERSION = 1;

  function getSchemaVersion() {
    try {
      var raw = Storage.get(SCHEMA_KEY, DEFAULT_SCHEMA_VERSION);
      return Number(raw || DEFAULT_SCHEMA_VERSION);
    } catch (err) {
      return DEFAULT_SCHEMA_VERSION;
    }
  }

  function setSchemaVersion(version) {
    var safeVersion = Number(version || DEFAULT_SCHEMA_VERSION);
    Storage.set(SCHEMA_KEY, safeVersion);
    return safeVersion;
  }

  function clearOperationalData() {
    Storage.clearDrafts();
    Storage.clearSyncData();
    Storage.clearRuntimeCache();
  }

  Storage.getLocalSchemaVersion = getSchemaVersion;
  Storage.setLocalSchemaVersion = setSchemaVersion;
  Storage.clearOperationalData = clearOperationalData;
})(window);
