(function(window, document) {
  'use strict';

  function istAdminEingeloggt() {
    return Boolean(window.AdventskalenderApi.ladeAdminToken());
  }

  function contentElemente() {
    return {
      bereich: document.getElementById('admin-content'),
      loading: document.getElementById('admin-content-loading'),
      fehler: document.getElementById('admin-content-fehler'),
      fehlerText: document.getElementById('admin-content-fehler-text'),
      leer: document.getElementById('admin-content-leer'),
      grid: document.getElementById('admin-content-grid'),
      createButton: document.getElementById('admin-content-create')
    };
  }

  function aktualisiereAdminContentSichtbarkeit() {
    const elemente = contentElemente();
    const eingeloggt = istAdminEingeloggt();

    if (!elemente.bereich) {
      return;
    }

    elemente.bereich.classList.toggle('d-none', !eingeloggt);

    if (elemente.createButton) {
      elemente.createButton.disabled = true;
    }
  }

  function initialisiereAdminContent() {
    aktualisiereAdminContentSichtbarkeit();
  }

  window.AdminContentUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminContentSichtbarkeit
  };

  window.addEventListener('adventskalender:admin-session-verloren', aktualisiereAdminContentSichtbarkeit);
  window.addEventListener('adventskalender:admin-session-aktualisiert', aktualisiereAdminContentSichtbarkeit);

  document.addEventListener('DOMContentLoaded', initialisiereAdminContent);
})(window, document);
