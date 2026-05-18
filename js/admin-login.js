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

  function setzeLogoutLaedt(loginButton, laedt) {
    const loginButtonIcon = document.getElementById('admin-login-button-icon');
    const loginButtonText = document.getElementById('admin-login-button-text');

    if (!loginButton || !loginButtonIcon || !loginButtonText) {
      return;
    }

    loginButton.disabled = laedt;
    loginButtonIcon.className = laedt
      ? 'spinner-border spinner-border-sm'
      : 'bi bi-shield-check';
    loginButtonText.textContent = laedt ? 'Abmelden...' : 'Admin';
  }

  let adminStatusToastTimeout = null;

  function zeigeAdminStatusToast(nachricht, typ) {
    const toast = document.getElementById('admin-status-toast');
    const toastIcon = document.getElementById('admin-status-toast-icon');
    const toastText = document.getElementById('admin-status-toast-text');
    const toastTyp = typ === 'fehler' ? 'fehler' : 'erfolg';

    if (!toast || !toastIcon || !toastText) {
      return;
    }

    toastText.textContent = nachricht;
    toast.classList.remove('erfolg', 'fehler');
    toast.classList.add(toastTyp);
    toastIcon.className = toastTyp === 'fehler'
      ? 'bi bi-exclamation-triangle-fill'
      : 'bi bi-check-circle-fill';
    toast.classList.add('sichtbar');

    if (adminStatusToastTimeout) {
      clearTimeout(adminStatusToastTimeout);
    }

    adminStatusToastTimeout = setTimeout(function() {
      toast.classList.remove('sichtbar');
      adminStatusToastTimeout = null;
    }, 2600);
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

    if (eingeloggt) {
      loginButton.removeAttribute('data-bs-toggle');
      loginButton.removeAttribute('data-bs-target');
    } else {
      loginButton.setAttribute('data-bs-toggle', 'modal');
      loginButton.setAttribute('data-bs-target', '#login-modal');
    }

    loginButtonIcon.className = eingeloggt
      ? 'bi bi-shield-check'
      : 'bi bi-person-gear';
    loginButtonText.textContent = eingeloggt
      ? loginButton.getAttribute('data-admin-text')
      : loginButton.getAttribute('data-login-text');
  }

  function aktualisiereAdminLoginStatus() {
    setzeAdminLoginStatus(Boolean(window.AdventskalenderApi.ladeAdminToken()));
  }

  function meldeAdminSessionAktualisiert(aktion) {
    window.dispatchEvent(new CustomEvent('adventskalender:admin-session-aktualisiert', {
      detail: {
        aktion: aktion
      }
    }));
  }

  function initialisiereAdminLogin() {
    const formular = document.getElementById('admin-login-form');
    const usernameFeld = document.getElementById('admin-login-username');
    const passwortFeld = document.getElementById('admin-login-password');
    const fehlerElement = document.getElementById('admin-login-fehler');
    const submitButton = document.getElementById('admin-login-submit');
    const modalElement = document.getElementById('login-modal');
    const loginButton = document.getElementById('admin-login-button');

    if (!formular || !usernameFeld || !passwortFeld || !fehlerElement || !submitButton || !modalElement || !loginButton) {
      return;
    }

    aktualisiereAdminLoginStatus();

    loginButton.addEventListener('click', function(event) {
      if (!window.AdventskalenderApi.ladeAdminToken()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setzeLogoutLaedt(loginButton, true);

      window.AdventskalenderApi.adminLogout()
        .catch(function() {
          // adminLogout entfernt die lokale Session auch bei Backend-Fehlern.
        })
        .finally(function() {
          setzeLogoutLaedt(loginButton, false);
          aktualisiereAdminLoginStatus();
          meldeAdminSessionAktualisiert('logout');
          zeigeAdminStatusToast('Erfolgreich abgemeldet.', 'erfolg');
        });
    });

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
          meldeAdminSessionAktualisiert('login');
          const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
          modal.hide();
          formular.reset();
        })
        .catch(function(error) {
          zeigeFehler(
            fehlerElement,
            window.AdventskalenderApi.fehlertextFuerApiFehler(error, 'Der Login ist fehlgeschlagen.')
          );
        })
        .finally(function() {
          setzeLoginLaedt(submitButton, false);
        });
    });
  }

  window.AdminLoginUi = {
    aktualisiereStatus: aktualisiereAdminLoginStatus,
    zeigeStatus: zeigeAdminStatusToast
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminLoginStatus();
    zeigeAdminStatusToast('Sitzung abgelaufen. Bitte erneut einloggen.', 'fehler');
  });

  document.addEventListener('DOMContentLoaded', initialisiereAdminLogin);
})(window, document);
