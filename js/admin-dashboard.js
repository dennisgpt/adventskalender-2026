(function(window, document) {
  'use strict';

  let ausgewaehlterTag = null;
  let ausgewaehlterContent = null;
  let adminContentPool = [];

  function istAdminEingeloggt() {
    return Boolean(window.AdventskalenderApi.ladeAdminToken());
  }

  function dashboardElemente() {
    return {
      dashboard: document.getElementById('admin-dashboard'),
      loading: document.getElementById('admin-dashboard-loading'),
      fehler: document.getElementById('admin-dashboard-fehler'),
      fehlerText: document.getElementById('admin-dashboard-fehler-text'),
      leer: document.getElementById('admin-dashboard-leer'),
      grid: document.getElementById('admin-dashboard-grid'),
      refreshButton: document.getElementById('admin-dashboard-refresh')
    };
  }

  function zuweisungElemente() {
    return {
      bereich: document.getElementById('admin-zuweisung'),
      titel: document.getElementById('admin-zuweisung-titel'),
      auswahl: document.getElementById('admin-zuweisung-auswahl'),
      schliessenButton: document.getElementById('admin-zuweisung-schliessen'),
      loading: document.getElementById('admin-zuweisung-loading'),
      fehler: document.getElementById('admin-zuweisung-fehler'),
      fehlerText: document.getElementById('admin-zuweisung-fehler-text'),
      leer: document.getElementById('admin-zuweisung-leer'),
      pool: document.getElementById('admin-zuweisung-pool'),
      submitButton: document.getElementById('admin-zuweisung-submit'),
      status: document.getElementById('admin-zuweisung-status')
    };
  }

  function setzeDashboardStatus(status, meldung) {
    const elemente = dashboardElemente();

    if (!elemente.dashboard || !elemente.loading || !elemente.fehler || !elemente.leer || !elemente.grid) {
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
    const refreshButton = document.getElementById('admin-dashboard-refresh');

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled = laedt;
    refreshButton.innerHTML = laedt
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Laden...'
      : '<i class="bi bi-arrow-clockwise"></i> Aktualisieren';
  }

  function formatiereAdminDatum(datumWert) {
    if (!datumWert) {
      return 'Kein Datum';
    }

    const datum = new Date(datumWert);

    if (Number.isNaN(datum.getTime())) {
      return 'Ungueltiges Datum';
    }

    return datum.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatiereAdminDatumInput(datumWert) {
    if (!datumWert) {
      return '';
    }

    const datum = new Date(datumWert);

    if (Number.isNaN(datum.getTime())) {
      return '';
    }

    const lokalesDatum = new Date(datum.getTime() - datum.getTimezoneOffset() * 60000);
    return lokalesDatum.toISOString().slice(0, 16);
  }

  function contentTypLabel(typ) {
    const labels = {
      text: 'Text',
      image: 'Bild',
      video: 'Video',
      game: 'Spiel',
      quiz: 'Quiz'
    };

    return labels[typ] || typ || 'Unbekannt';
  }

  function contentBodyVorschau(content) {
    if (!content.body) {
      return 'Kein Body';
    }

    if (content.type === 'quiz') {
      try {
        const quiz = JSON.parse(content.body);
        return quiz.question || 'Quiz ohne Frage';
      } catch (error) {
        return 'Quiz-Daten konnten nicht gelesen werden';
      }
    }

    return content.body;
  }

  function renderContentBadges(inhalte) {
    if (inhalte.length === 0) {
      return '<p class="admin-tag-content-leer">Keine Inhalte zugewiesen</p>';
    }

    return `
      <div class="admin-tag-content-badges">
        ${inhalte.map(function(inhalt) {
          return `
            <span class="admin-tag-content-badge">
              ${contentTypLabel(inhalt.type)}
              <small>#${inhalt.id}</small>
            </span>
          `;
        }).join('')}
      </div>
    `;
  }

  function setzeAdminTagFormGeaendert(formular, istGeaendert) {
    const speichernButton = formular.querySelector('[data-admin-tag-save]');

    formular.classList.toggle('ist-geaendert', istGeaendert);

    if (speichernButton) {
      speichernButton.disabled = !istGeaendert;
    }
  }

  function setzeAdminTagFormStatus(formular, status, meldung) {
    const speichernButton = formular.querySelector('[data-admin-tag-save]');
    const statusElement = formular.querySelector('[data-admin-tag-form-status]');
    const istLadend = status === 'loading';

    formular.classList.toggle('ist-ladend', istLadend);
    formular.classList.toggle('hat-fehler', status === 'fehler');
    formular.classList.toggle('hat-erfolg', status === 'erfolg');

    if (speichernButton) {
      speichernButton.disabled = istLadend || !formular.classList.contains('ist-geaendert');
      speichernButton.innerHTML = istLadend
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Speichern...'
        : 'Speichern';
    }

    if (statusElement) {
      statusElement.textContent = meldung || '';
    }
  }

  function baueAdminTagUpdatePayload(datumFeld, randomFeld) {
    return {
      unlock_date: datumFeld.value ? new Date(datumFeld.value).toISOString() : null,
      is_randomized: randomFeld.checked
    };
  }

  function aktualisiereAdminTagAnzeige(karte, daten) {
    const datumAnzeige = karte.querySelector('[data-admin-tag-unlock-display]');
    const randomBadge = karte.querySelector('[data-admin-tag-random-badge]');

    if (datumAnzeige) {
      datumAnzeige.textContent = formatiereAdminDatum(daten.unlock_date);
    }

    if (randomBadge) {
      randomBadge.classList.toggle('ist-randomisiert', daten.is_randomized);
      randomBadge.textContent = daten.is_randomized ? 'Zufällig' : 'Sortiert';
    }
  }

  function initialisiereAdminTagForm(karte, tag) {
    const formular = karte.querySelector('[data-admin-tag-form]');
    const bearbeitenButton = karte.querySelector('[data-admin-tag-edit]');
    const datumFeld = formular ? formular.querySelector('[name="unlock_date"]') : null;
    const randomFeld = formular ? formular.querySelector('[name="is_randomized"]') : null;
    const speichernButton = formular ? formular.querySelector('[data-admin-tag-save]') : null;

    if (!formular || !bearbeitenButton || !datumFeld || !randomFeld || !speichernButton) {
      return;
    }

    let urspruenglichesDatum = datumFeld.value;
    let urspruenglicheRandomisierung = Boolean(tag.is_randomized);

    function pruefeAenderungen() {
      const istGeaendert = datumFeld.value !== urspruenglichesDatum
        || randomFeld.checked !== urspruenglicheRandomisierung;

      setzeAdminTagFormGeaendert(formular, istGeaendert);
    }

    bearbeitenButton.addEventListener('click', function() {
      const istOffen = !formular.classList.contains('d-none');
      const wirdGeoeffnet = !istOffen;

      formular.classList.toggle('d-none', !wirdGeoeffnet);
      karte.classList.toggle('ist-in-bearbeitung', wirdGeoeffnet);
      bearbeitenButton.setAttribute('aria-expanded', String(wirdGeoeffnet));
      bearbeitenButton.innerHTML = wirdGeoeffnet
        ? '<i class="bi bi-x-lg" aria-hidden="true"></i> Schließen'
        : '<i class="bi bi-pencil-square" aria-hidden="true"></i> Bearbeiten';

      if (wirdGeoeffnet) {
        datumFeld.focus();
      }
    });

    datumFeld.addEventListener('input', pruefeAenderungen);
    randomFeld.addEventListener('change', pruefeAenderungen);

    speichernButton.addEventListener('click', function() {
      if (!formular.classList.contains('ist-geaendert')) {
        return;
      }

      setzeAdminTagFormStatus(formular, 'loading');
      const payload = baueAdminTagUpdatePayload(datumFeld, randomFeld);

      window.AdventskalenderApi.aktualisiereAdminTag(
        tag.id,
        payload
      )
        .then(function() {
          urspruenglichesDatum = datumFeld.value;
          urspruenglicheRandomisierung = randomFeld.checked;
          aktualisiereAdminTagAnzeige(karte, payload);
          setzeAdminTagFormGeaendert(formular, false);
          setzeAdminTagFormStatus(formular, 'erfolg', 'Einstellungen gespeichert.');
        })
        .catch(function(error) {
          setzeAdminTagFormStatus(
            formular,
            'fehler',
            window.AdventskalenderApi.fehlertextFuerApiFehler(
              error,
              'Einstellungen konnten nicht gespeichert werden.'
            )
          );
        });
    });
  }

  function setzeZuweisungStatus(status, meldung) {
    const elemente = zuweisungElemente();

    if (!elemente.loading || !elemente.fehler || !elemente.leer || !elemente.pool) {
      return;
    }

    elemente.loading.classList.toggle('d-none', status !== 'loading');
    elemente.fehler.classList.toggle('d-none', status !== 'fehler');
    elemente.leer.classList.toggle('d-none', status !== 'leer');
    elemente.pool.classList.toggle('d-none', status !== 'bereit');

    if (elemente.fehlerText && meldung) {
      elemente.fehlerText.textContent = meldung;
    }
  }

  function setzeZuweisungAktionStatus(status, meldung) {
    const elemente = zuweisungElemente();
    const istLadend = status === 'loading';

    if (elemente.submitButton) {
      elemente.submitButton.disabled = istLadend || !ausgewaehlterTag || !ausgewaehlterContent;
      elemente.submitButton.innerHTML = istLadend
        ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Zuweisen...'
        : 'Content zuweisen';
    }

    if (elemente.status) {
      elemente.status.textContent = meldung || '';
      elemente.status.classList.toggle('hat-fehler', status === 'fehler');
      elemente.status.classList.toggle('hat-erfolg', status === 'erfolg');
    }
  }

  function aktualisiereAusgewaehlteTagKarte() {
    document.querySelectorAll('.admin-tag-karte').forEach(function(karte) {
      karte.classList.toggle(
        'ist-ausgewaehlt',
        Boolean(ausgewaehlterTag) && karte.getAttribute('data-day-id') === String(ausgewaehlterTag.id)
      );
    });
  }

  function aktualisiereZuweisungKopf() {
    const elemente = zuweisungElemente();

    if (!elemente.bereich || !elemente.titel || !elemente.auswahl) {
      return;
    }

    elemente.bereich.classList.toggle('d-none', !ausgewaehlterTag);
    setzeZuweisungAktionStatus('', '');

    if (!ausgewaehlterTag) {
      elemente.titel.textContent = 'Türchen auswählen';
      elemente.auswahl.textContent = 'Kein Türchen ausgewählt.';
      return;
    }

    elemente.titel.textContent = `Türchen ${ausgewaehlterTag.day_number}`;
    elemente.auswahl.textContent = 'Wähle einen Content-Eintrag aus dem Pool aus.';
  }

  function renderContentPoolKarte(content) {
    const button = document.createElement('button');
    button.className = 'admin-zuweisung-content';
    button.type = 'button';
    button.setAttribute('data-content-id', content.id);
    button.setAttribute('aria-pressed', String(Boolean(ausgewaehlterContent) && ausgewaehlterContent.id === content.id));
    button.innerHTML = `
      <span class="admin-content-type">${contentTypLabel(content.type)}</span>
      <strong>${contentBodyVorschau(content)}</strong>
      <small>#${content.id}${content.media_url ? ' · ' + content.media_url : ''}</small>
    `;

    button.classList.toggle(
      'ist-ausgewaehlt',
      Boolean(ausgewaehlterContent) && ausgewaehlterContent.id === content.id
    );

    button.addEventListener('click', function() {
      ausgewaehlterContent = content;
      renderContentPool(adminContentPool);
      setzeZuweisungAktionStatus('', '');
    });

    return button;
  }

  function berechneNaechsteSortierung() {
    if (!ausgewaehlterTag || !Array.isArray(ausgewaehlterTag.contents)) {
      return 0;
    }

    return ausgewaehlterTag.contents.length;
  }

  function weiseAusgewaehltenContentZu() {
    if (!ausgewaehlterTag || !ausgewaehlterContent) {
      return;
    }

    const tagId = ausgewaehlterTag.id;
    const contentId = ausgewaehlterContent.id;
    const sortOrder = berechneNaechsteSortierung();

    setzeZuweisungAktionStatus('loading');

    window.AdventskalenderApi.weiseContentAdminTagZu(tagId, contentId, sortOrder)
      .then(function() {
        setzeZuweisungAktionStatus('erfolg', 'Content wurde dem Tuerchen zugewiesen.');

        if (window.AdminLoginUi && typeof window.AdminLoginUi.zeigeStatus === 'function') {
          window.AdminLoginUi.zeigeStatus('Content wurde zugewiesen.', 'erfolg');
        }

        return ladeAdminDashboardTage();
      })
      .catch(function(error) {
        setzeZuweisungAktionStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Content konnte nicht zugewiesen werden.'
          )
        );
      });
  }

  function renderContentPool(contentEintraege) {
    const pool = zuweisungElemente().pool;

    if (!pool) {
      return;
    }

    pool.innerHTML = '';
    contentEintraege.forEach(function(content) {
      pool.appendChild(renderContentPoolKarte(content));
    });
  }

  function ladeContentPool() {
    if (adminContentPool.length > 0) {
      renderContentPool(adminContentPool);
      setzeZuweisungStatus('bereit');
      return Promise.resolve(adminContentPool);
    }

    setzeZuweisungStatus('loading');

    return window.AdventskalenderApi.ladeAdminContent()
      .then(function(contentEintraege) {
        adminContentPool = Array.isArray(contentEintraege)
          ? contentEintraege.filter(function(content) {
            return content.is_active !== false;
          })
          : [];

        if (adminContentPool.length === 0) {
          setzeZuweisungStatus('leer');
          return adminContentPool;
        }

        renderContentPool(adminContentPool);
        setzeZuweisungStatus('bereit');
        return adminContentPool;
      })
      .catch(function(error) {
        setzeZuweisungStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Content-Pool konnte nicht geladen werden.'
          )
        );
        throw error;
      });
  }

  function waehleAdminTagFuerZuweisung(tag) {
    ausgewaehlterTag = tag;
    ausgewaehlterContent = null;
    aktualisiereZuweisungKopf();
    aktualisiereAusgewaehlteTagKarte();
    setzeZuweisungAktionStatus('', '');
    ladeContentPool().catch(function() {});

    const bereich = zuweisungElemente().bereich;
    if (bereich) {
      bereich.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function schliesseZuweisung() {
    ausgewaehlterTag = null;
    ausgewaehlterContent = null;
    aktualisiereZuweisungKopf();
    aktualisiereAusgewaehlteTagKarte();
    setzeZuweisungAktionStatus('', '');
  }

  function renderAdminTagKarte(tag) {
    const inhalte = Array.isArray(tag.contents) ? tag.contents : [];
    const karte = document.createElement('article');
    const unlockInputId = `admin-tag-${tag.id}-unlock-date`;
    const randomInputId = `admin-tag-${tag.id}-randomized`;
    const einstellungenId = `admin-tag-${tag.id}-einstellungen`;
    karte.className = 'admin-tag-karte';
    karte.setAttribute('data-day-id', tag.id);

    karte.innerHTML = `
      <div class="admin-tag-karte-kopf">
        <span class="admin-tag-nummer">Türchen ${tag.day_number}</span>
        <span class="admin-tag-badge ${tag.is_randomized ? 'ist-randomisiert' : ''}" data-admin-tag-random-badge>
          ${tag.is_randomized ? 'Zufällig' : 'Sortiert'}
        </span>
      </div>
      <dl class="admin-tag-details">
        <div>
          <dt>Freischaltung</dt>
          <dd data-admin-tag-unlock-display>${formatiereAdminDatum(tag.unlock_date)}</dd>
        </div>
        <div>
          <dt>Inhalte</dt>
          <dd>${inhalte.length}</dd>
        </div>
      </dl>
      <div class="admin-tag-content">
        <span class="admin-tag-content-label">Zugewiesen</span>
        ${renderContentBadges(inhalte)}
      </div>
      <button
        class="admin-tag-edit-btn"
        type="button"
        data-admin-tag-edit
        aria-expanded="false"
        aria-controls="${einstellungenId}"
      >
        <i class="bi bi-pencil-square" aria-hidden="true"></i> Bearbeiten
      </button>
      <button class="admin-tag-assign-btn" type="button" data-admin-tag-assign>
        <i class="bi bi-plus-square" aria-hidden="true"></i> Content zuweisen
      </button>
      <form class="admin-tag-einstellungen d-none" id="${einstellungenId}" data-admin-tag-form>
        <label class="admin-tag-feld" for="${unlockInputId}">
          <span>Freischaltung bearbeiten</span>
          <input
            id="${unlockInputId}"
            name="unlock_date"
            type="datetime-local"
            value="${formatiereAdminDatumInput(tag.unlock_date)}"
          >
        </label>
        <label class="admin-tag-toggle" for="${randomInputId}">
          <input
            id="${randomInputId}"
            name="is_randomized"
            type="checkbox"
            ${tag.is_randomized ? 'checked' : ''}
          >
          <span>Content zufällig ausspielen</span>
        </label>
        <button class="admin-tag-save-btn" type="button" data-admin-tag-save disabled>
          Speichern
        </button>
        <p class="admin-tag-form-status" data-admin-tag-form-status aria-live="polite"></p>
      </form>
    `;

    initialisiereAdminTagForm(karte, tag);
    const zuweisenButton = karte.querySelector('[data-admin-tag-assign]');

    if (zuweisenButton) {
      zuweisenButton.addEventListener('click', function() {
        waehleAdminTagFuerZuweisung(tag);
      });
    }

    return karte;
  }

  function renderAdminTage(tage) {
    const grid = document.getElementById('admin-dashboard-grid');

    if (!grid) {
      return;
    }

    grid.innerHTML = '';
    schliesseZuweisung();

    tage
      .slice()
      .sort(function(a, b) {
        return a.day_number - b.day_number;
      })
      .forEach(function(tag) {
        grid.appendChild(renderAdminTagKarte(tag));
      });
  }

  function aktualisiereAdminDashboardSichtbarkeit() {
    const dashboard = dashboardElemente().dashboard;

    if (!dashboard) {
      return;
    }

    dashboard.classList.toggle('d-none', !istAdminEingeloggt());
  }

  function ladeAdminDashboardTage() {
    if (!istAdminEingeloggt()) {
      aktualisiereAdminDashboardSichtbarkeit();
      return Promise.resolve(null);
    }

    setzeDashboardStatus('loading');
    setzeRefreshLaedt(true);

    return window.AdventskalenderApi.ladeAdminTage()
      .then(function(tage) {
        if (!Array.isArray(tage) || tage.length === 0) {
          setzeDashboardStatus('leer');
          return tage;
        }

        renderAdminTage(tage);
        setzeDashboardStatus('bereit');
        return tage;
      })
      .catch(function(error) {
        setzeDashboardStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Admin-Tuerchen konnten nicht geladen werden.'
          )
        );
        throw error;
      })
      .finally(function() {
        setzeRefreshLaedt(false);
      });
  }

  function initialisiereAdminDashboard() {
    const refreshButton = document.getElementById('admin-dashboard-refresh');
    const zuweisungSchliessenButton = document.getElementById('admin-zuweisung-schliessen');
    const zuweisungSubmitButton = document.getElementById('admin-zuweisung-submit');

    aktualisiereAdminDashboardSichtbarkeit();
    aktualisiereZuweisungKopf();

    if (refreshButton) {
      refreshButton.addEventListener('click', function() {
        ladeAdminDashboardTage().catch(function() {});
      });
    }

    if (zuweisungSchliessenButton) {
      zuweisungSchliessenButton.addEventListener('click', schliesseZuweisung);
    }

    if (zuweisungSubmitButton) {
      zuweisungSubmitButton.addEventListener('click', weiseAusgewaehltenContentZu);
    }

    if (istAdminEingeloggt()) {
      ladeAdminDashboardTage().catch(function() {});
    }
  }

  function verarbeiteAdminSessionAktualisierung() {
    aktualisiereAdminDashboardSichtbarkeit();

    if (istAdminEingeloggt()) {
      ladeAdminDashboardTage().catch(function() {});
    } else {
      schliesseZuweisung();
      setzeDashboardStatus('loading');
    }
  }

  window.AdminDashboardUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminDashboardSichtbarkeit,
    ladeTage: ladeAdminDashboardTage,
    renderTage: renderAdminTage
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminDashboardSichtbarkeit();
    schliesseZuweisung();
    setzeDashboardStatus('loading');
  });

  window.addEventListener('adventskalender:admin-session-aktualisiert', verarbeiteAdminSessionAktualisierung);

  document.addEventListener('DOMContentLoaded', initialisiereAdminDashboard);
})(window, document);
