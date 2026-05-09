(function(window, document) {
  'use strict';

  function istAdminEingeloggt() {
    return Boolean(window.AdventskalenderApi.ladeAdminToken());
  }

  function aktualisiereAdminDashboardSichtbarkeit() {
    const dashboard = document.getElementById('admin-dashboard');

    if (!dashboard) {
      return;
    }

    dashboard.classList.toggle('d-none', !istAdminEingeloggt());
  }

  function initialisiereAdminDashboard() {
    aktualisiereAdminDashboardSichtbarkeit();
  }

  window.AdminDashboardUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminDashboardSichtbarkeit
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminDashboardSichtbarkeit();
  });

  document.addEventListener('DOMContentLoaded', initialisiereAdminDashboard);
})(window, document);
