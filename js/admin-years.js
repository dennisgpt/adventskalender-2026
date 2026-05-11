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
      refreshButton: document.getElementById('admin-years-refresh')
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
    `;

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
    const refreshButton = yearsElemente().refreshButton;

    aktualisiereAdminYearsSichtbarkeit();

    if (refreshButton) {
      refreshButton.addEventListener('click', function() {
        ladeAdminJahresliste().catch(function() {});
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
