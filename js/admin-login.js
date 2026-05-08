(function(window, document) {
  'use strict';

  function zeigeFehler(fehlerElement, nachricht) {
    fehlerElement.textContent = nachricht;
    fehlerElement.classList.remove('d-none');
  }

  function versteckeFehler(fehlerElement) {
    fehlerElement.textContent = '';
    fehlerElement.classList.add('d-none');
  }

  function setzeLoginLaedt(submitButton, laedt) {
    submitButton.disabled = laedt;
    submitButton.innerHTML = laedt
      ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Einloggen...'
      : '<i class="bi bi-box-arrow-in-right me-1"></i>Einloggen';
  }

  function setzeAdminLoginStatus(eingeloggt) {
    const loginButton = document.getElementById('admin-login-button');
    const loginButtonIcon = document.getElementById('admin-login-button-icon');
    const loginButtonText = document.getElementById('admin-login-button-text');

    if (!loginButton || !loginButtonIcon || !loginButtonText) {
      return;
    }

    loginButton.classList.toggle('ist-eingeloggt', eingeloggt);
    loginButton.setAttribute(
      'aria-label',
      eingeloggt ? 'Admin-Bereich öffnen' : 'Admin Login öffnen'
    );
    loginButtonIcon.className = eingeloggt
      ? 'bi bi-shield-check'
      : 'bi bi-mortarboard-fill';
    loginButtonText.textContent = eingeloggt
      ? loginButton.getAttribute('data-admin-text')
      : loginButton.getAttribute('data-login-text');
  }

  function aktualisiereAdminLoginStatus() {
    setzeAdminLoginStatus(Boolean(window.AdventskalenderApi.ladeAdminToken()));
  }

  function initialisiereAdminLogin() {
    const formular = document.getElementById('admin-login-form');
    const usernameFeld = document.getElementById('admin-login-username');
    const passwortFeld = document.getElementById('admin-login-password');
    const fehlerElement = document.getElementById('admin-login-fehler');
    const submitButton = document.getElementById('admin-login-submit');
    const modalElement = document.getElementById('login-modal');

    if (!formular || !usernameFeld || !passwortFeld || !fehlerElement || !submitButton || !modalElement) {
      return;
    }

    aktualisiereAdminLoginStatus();

    formular.addEventListener('submit', function(event) {
      event.preventDefault();
      versteckeFehler(fehlerElement);

      const username = usernameFeld.value.trim();
      const password = passwortFeld.value;

      if (!username || !password) {
        zeigeFehler(fehlerElement, 'Bitte Benutzername und Passwort eingeben.');
        return;
      }

      setzeLoginLaedt(submitButton, true);

      window.AdventskalenderApi.adminLogin(username, password)
        .then(function() {
          aktualisiereAdminLoginStatus();
          const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
          modal.hide();
          formular.reset();
        })
        .catch(function(error) {
          const meldung = error && error.message
            ? error.message
            : 'Der Login ist fehlgeschlagen.';
          zeigeFehler(fehlerElement, meldung);
        })
        .finally(function() {
          setzeLoginLaedt(submitButton, false);
        });
    });
  }

  window.AdminLoginUi = {
    aktualisiereStatus: aktualisiereAdminLoginStatus
  };

  document.addEventListener('DOMContentLoaded', initialisiereAdminLogin);
})(window, document);
