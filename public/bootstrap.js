(function markStandaloneLaunch() {
  try {
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||
      location.search.indexOf('splash') > -1;
    if (standalone) {
      var iconPreload = document.createElement('link');
      iconPreload.rel = 'preload';
      iconPreload.as = 'image';
      iconPreload.href = '/icons/icon-512.png';
      document.head.appendChild(iconPreload);
      document.documentElement.classList.add('pwa-standalone');
    }
  } catch {
    // Feature detection only; a normal browser tab should continue immediately.
  }
})();
