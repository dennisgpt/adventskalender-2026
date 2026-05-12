(function(window, document) {
  'use strict';

  function istAdminEingeloggt() {
    return Boolean(window.AdventskalenderApi.ladeAdminToken());
  }

  function yearsElemente() {
    return {
      bereich: document.getElementById('admin-years'),
      loading: document.getElementById('admin-years-loading'),
      fehler: document.getElementById('admin-years-fehler'),
      fehlerText: document.getElementById('admin-years-fehler-text'),
      leer: document.getElementById('admin-years-leer'),
      grid: document.getElementById('admin-years-grid'),
      refreshButton: document.getElementById('admin-years-refresh'),
      createToggleButton: document.getElementById('admin-years-create-toggle'),
      form: document.getElementById('admin-year-form'),
      yearFeld: document.getElementById('admin-year-input'),
      startDateFeld: document.getElementById('admin-year-start-date'),
      currentFeld: document.getElementById('admin-year-current'),
      cancelButton: document.getElementById('admin-year-cancel'),
      submitButton: document.getElementById('admin-year-submit'),
      formStatus: document.getElementById('admin-year-form-status')
    };
  }

  function setzeAdminYearsStatus(status, meldung) {
    const elemente = yearsElemente();

    if (!elemente.loading || !elemente.fehler || !elemente.leer || !elemente.grid) {
      return;
    }

    elemente.loading.classList.toggle('d-none', status !== 'loading');
    elemente.fehler.classList.toggle('d-none', status !== 'fehler');
    elemente.leer.classList.toggle('d-none', status !== 'leer');
    elemente.grid.classList.toggle('d-none', status !== 'bereit');

    if (elemente.fehlerText && meldung) {
      elemente.fehlerText.textContent = meldung;
    }
  }

  function setzeRefreshLaedt(laedt) {
    const refreshButton = yearsElemente().refreshButton;

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled = laedt;
    refreshButton.innerHTML = laedt
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Laden...'
      : '<i class="bi bi-arrow-clockwise"></i> Aktualisieren';
  }

  function formatiereStartDatum(datumWert) {
    if (!datumWert) {
      return 'Kein Startdatum';
    }

    const datum = new Date(datumWert);

    if (Number.isNaN(datum.getTime())) {
      return 'Ungueltiges Startdatum';
    }

    return datum.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function feldWert(feld) {
    return feld && typeof feld.value === 'string' ? feld.value.trim() : '';
  }

  function istYearFormValide() {
    const elemente = yearsElemente();
    const jahr = Number.parseInt(feldWert(elemente.yearFeld), 10);

    return Number.isInteger(jahr)
      && jahr >= 2026
      && Boolean(feldWert(elemente.startDateFeld));
  }

  function baueYearPayload() {
    const elemente = yearsElemente();

    return {
      year: Number.parseInt(feldWert(elemente.yearFeld), 10),
      start_date: feldWert(elemente.startDateFeld),
      is_current: Boolean(elemente.currentFeld && elemente.currentFeld.checked)
    };
  }

  function aktualisiereYearFormValiditaet() {
    const submitButton = yearsElemente().submitButton;

    if (submitButton) {
      submitButton.disabled = !istYearFormValide();
    }
  }

  function setzeYearFormStatus(status, meldung) {
    const elemente = yearsElemente();
    const istLadend = status === 'loading';

    if (elemente.form) {
      elemente.form.classList.toggle('ist-ladend', istLadend);
      elemente.form.classList.toggle('hat-fehler', status === 'fehler');
      elemente.form.classList.toggle('hat-erfolg', status === 'erfolg');
    }

    if (elemente.submitButton) {
      elemente.submitButton.disabled = istLadend || !istYearFormValide();
      elemente.submitButton.innerHTML = istLadend
        ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Erstellen...'
        : 'Kalenderjahr erstellen';
    }

    if (elemente.formStatus) {
      elemente.formStatus.textContent = meldung || '';
    }
  }

  function setzeYearFormSichtbar(sichtbar) {
    const elemente = yearsElemente();

    if (!elemente.form || !elemente.createToggleButton) {
      return;
    }

    elemente.form.classList.toggle('d-none', !sichtbar);
    elemente.createToggleButton.setAttribute('aria-expanded', String(sichtbar));
    elemente.createToggleButton.innerHTML = sichtbar
      ? '<i class="bi bi-x-lg"></i> Formular schliessen'
      : '<i class="bi bi-plus-lg"></i> Jahr erstellen';

    if (sichtbar && elemente.yearFeld) {
      aktualisiereYearFormValiditaet();
      elemente.yearFeld.focus();
    }
  }

  function resetYearForm() {
    const elemente = yearsElemente();

    if (elemente.form) {
      elemente.form.reset();
    }

    setzeYearFormStatus('', '');
  }

  function zeigeYearsToast(nachricht, typ) {
    if (window.AdminLoginUi && typeof window.AdminLoginUi.zeigeStatus === 'function') {
      window.AdminLoginUi.zeigeStatus(nachricht, typ);
    }
  }

  function fehlertextFuerYearAktion(error, fallback) {
    if (error && error.status === 409) {
      return 'Dieses Kalenderjahr existiert bereits.';
    }

    return window.AdventskalenderApi.fehlertextFuerApiFehler(error, fallback);
  }

  function setzeYearButtonLaedt(button, laedt) {
    if (!button) {
      return;
    }

    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }

    button.disabled = laedt;
    button.innerHTML = laedt
      ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Setzen...'
      : button.dataset.originalHtml;
  }

  function setzeAdminJahrAktuell(jahr, button) {
    if (!jahr || !jahr.id) {
      return;
    }

    setzeYearButtonLaedt(button, true);

    window.AdventskalenderApi.aktualisiereAdminJahr(jahr.id, { is_current: true })
      .then(function() {
        zeigeYearsToast('Kalenderjahr wurde als aktuell gesetzt.', 'erfolg');
        return ladeAdminJahresliste();
      })
      .catch(function(error) {
        setzeYearButtonLaedt(button, false);
        zeigeYearsToast(
          fehlertextFuerYearAktion(
            error,
            'Kalenderjahr konnte nicht als aktuell gesetzt werden.'
          ),
          'fehler'
        );
      });
  }

  function renderAdminYearKarte(jahr) {
    const karte = document.createElement('article');
    karte.className = 'admin-year-card';
    karte.classList.toggle('ist-aktuell', Boolean(jahr.is_current));
    karte.setAttribute('data-year-id', jahr.id);

    karte.innerHTML = `
      <div class="admin-year-card-kopf">
        <span class="admin-year-zahl">${jahr.year}</span>
        <span class="admin-year-status ${jahr.is_current ? 'ist-aktuell' : ''}">
          ${jahr.is_current ? 'Aktuell' : 'Nicht aktiv'}
        </span>
      </div>
      <dl class="admin-year-details">
        <div>
          <dt>ID</dt>
          <dd>#${jahr.id}</dd>
        </div>
        <div>
          <dt>Startdatum</dt>
          <dd>${formatiereStartDatum(jahr.start_date)}</dd>
        </div>
      </dl>
      ${jahr.is_current ? '' : `
        <div class="admin-year-card-actions">
          <button class="admin-content-action-btn" type="button" data-admin-year-current>
            <i class="bi bi-check-circle" aria-hidden="true"></i>
            Als aktuell setzen
          </button>
        </div>
      `}
    `;

    const currentButton = karte.querySelector('[data-admin-year-current]');

    if (currentButton) {
      currentButton.addEventListener('click', function() {
        setzeAdminJahrAktuell(jahr, currentButton);
      });
    }

    return karte;
  }

  function renderAdminJahre(jahre) {
    const grid = yearsElemente().grid;

    if (!grid) {
      return;
    }

    grid.innerHTML = '';

    jahre
      .slice()
      .sort(function(a, b) {
        return a.year - b.year;
      })
      .forEach(function(jahr) {
        grid.appendChild(renderAdminYearKarte(jahr));
      });
  }

  function aktualisiereAdminYearsSichtbarkeit() {
    const elemente = yearsElemente();
    const eingeloggt = istAdminEingeloggt();

    if (!elemente.bereich) {
      return;
    }

    elemente.bereich.classList.toggle('d-none', !eingeloggt);

    if (elemente.refreshButton) {
      elemente.refreshButton.disabled = !eingeloggt;
    }

    if (elemente.createToggleButton) {
      elemente.createToggleButton.disabled = !eingeloggt;
    }
  }

  function ladeAdminJahresliste() {
    if (!istAdminEingeloggt()) {
      aktualisiereAdminYearsSichtbarkeit();
      return Promise.resolve(null);
    }

    setzeAdminYearsStatus('loading');
    setzeRefreshLaedt(true);

    return window.AdventskalenderApi.ladeAdminJahre()
      .then(function(jahre) {
        if (!Array.isArray(jahre) || jahre.length === 0) {
          setzeAdminYearsStatus('leer');
          return jahre;
        }

        renderAdminJahre(jahre);
        setzeAdminYearsStatus('bereit');
        return jahre;
      })
      .catch(function(error) {
        setzeAdminYearsStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Kalenderjahre konnten nicht geladen werden.'
          )
        );
        throw error;
      })
      .finally(function() {
        setzeRefreshLaedt(false);
      });
  }

  function initialisiereAdminYears() {
    const elemente = yearsElemente();
    const refreshButton = elemente.refreshButton;

    aktualisiereAdminYearsSichtbarkeit();

    if (refreshButton) {
      refreshButton.addEventListener('click', function() {
        ladeAdminJahresliste().catch(function() {});
      });
    }

    if (elemente.createToggleButton) {
      elemente.createToggleButton.addEventListener('click', function() {
        const formIstSichtbar = elemente.form && !elemente.form.classList.contains('d-none');

        if (formIstSichtbar) {
          resetYearForm();
          setzeYearFormSichtbar(false);
          return;
        }

        resetYearForm();
        setzeYearFormSichtbar(true);
      });
    }

    if (elemente.cancelButton) {
      elemente.cancelButton.addEventListener('click', function() {
        resetYearForm();
        setzeYearFormSichtbar(false);
      });
    }

    if (elemente.form) {
      elemente.form.addEventListener('input', aktualisiereYearFormValiditaet);
      elemente.form.addEventListener('change', aktualisiereYearFormValiditaet);
      elemente.form.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!istYearFormValide()) {
          return;
        }

        setzeYearFormStatus('loading');

        window.AdventskalenderApi.erstelleAdminJahr(baueYearPayload())
          .then(function() {
            resetYearForm();
            setzeYearFormSichtbar(false);
            zeigeYearsToast('Kalenderjahr wurde erstellt.', 'erfolg');
            return ladeAdminJahresliste();
          })
          .catch(function(error) {
            setzeYearFormStatus(
              'fehler',
              fehlertextFuerYearAktion(
                error,
                'Kalenderjahr konnte nicht erstellt werden.'
              )
            );
          });
      });
    }

    if (istAdminEingeloggt()) {
      ladeAdminJahresliste().catch(function() {});
    }
  }

  function verarbeiteAdminSessionAktualisierung() {
    aktualisiereAdminYearsSichtbarkeit();

    if (istAdminEingeloggt()) {
      ladeAdminJahresliste().catch(function() {});
    } else {
      setzeAdminYearsStatus('leer');
    }
  }

  window.AdminYearsUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminYearsSichtbarkeit,
    ladeJahre: ladeAdminJahresliste,
    renderJahre: renderAdminJahre
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminYearsSichtbarkeit();
    setzeAdminYearsStatus('leer');
  });
  window.addEventListener('adventskalender:admin-session-aktualisiert', verarbeiteAdminSessionAktualisierung);

  document.addEventListener('DOMContentLoaded', initialisiereAdminYears);
})(window, document);
