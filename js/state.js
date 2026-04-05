(function (window) {
  'use strict';

  var state = {
    currentRoute: '',
    isOnline: navigator.onLine,
    sessionToken: '',
    profile: null,
    selectedSasaran: null,
    dashboardSummary: null,
    sasaranList: [],
    rekapData: null,
    syncQueue: []
  };

  var listeners = [];

  function getState() {
    return state;
  }

  function patch(nextState) {
    state = Object.assign({}, state, nextState || {});
    notify();
    return state;
  }

  function setProfile(profile) {
    state.profile = profile || null;
    notify();
    return state.profile;
  }

  function setSelectedSasaran(item) {
    state.selectedSasaran = item || null;
    notify();
    return state.selectedSasaran;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  function notify() {
    listeners.forEach(function (listener) {
      try {
        listener(state);
      } catch (err) {
        console.error(err);
      }
    });
  }

  window.AppState = {
    getState: getState,
    patch: patch,
    setProfile: setProfile,
    setSelectedSasaran: setSelectedSasaran,
    subscribe: subscribe
  };
})(window);
