(function(window, document) {
  'use strict';

  let bearbeiteterContentId = null;
  let geladeneContentEintraege = [];
  let adminTageFuerContent = [];
  let aktiverContentTypFilter = 'all';
  let aktiverContentStatusFilter = 'all';
  let zuLoeschenderContent = null;
  let zuLoeschenderButton = null;
  let contentUploadLaeuft = false;
  const STANDARD_ADMIN_CONTENT_LEER_TEXT = 'Die Content-Verwaltung ist bereit. Die Content-Liste wird im nächsten Schritt angebunden.';

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
      leerText: document.getElementById('admin-content-leer-text'),
      grid: document.getElementById('admin-content-grid'),
      stats: document.getElementById('admin-content-stats'),
      statGesamt: document.getElementById('admin-content-stat-gesamt'),
      statAktiv: document.getElementById('admin-content-stat-aktiv'),
      statInaktiv: document.getElementById('admin-content-stat-inaktiv'),
      statMedia: document.getElementById('admin-content-stat-media'),
      statOhneMedia: document.getElementById('admin-content-stat-ohne-media'),
      filter: document.getElementById('admin-content-filter'),
      filterFeld: document.getElementById('admin-content-type-filter'),
      filterStatusFeld: document.getElementById('admin-content-state-filter'),
      filterStatus: document.getElementById('admin-content-filter-status'),
      createButton: document.getElementById('admin-content-create'),
      form: document.getElementById('admin-content-form'),
      cancelButton: document.getElementById('admin-content-cancel'),
      submitButton: document.getElementById('admin-content-submit'),
      deleteModal: document.getElementById('admin-content-delete-modal'),
      deleteModalText: document.getElementById('admin-content-delete-modal-text'),
      deleteConfirmButton: document.getElementById('admin-content-delete-confirm'),
      typeFeld: document.getElementById('admin-content-type'),
      bodyFeld: document.getElementById('admin-content-body'),
      fileFeld: document.getElementById('admin-content-file'),
      fileButton: document.getElementById('admin-content-file-button'),
      fileName: document.getElementById('admin-content-file-name'),
      uploadStatus: document.getElementById('admin-content-upload-status'),
      uploadPreview: document.getElementById('admin-content-upload-preview'),
      uploadPreviewBild: document.getElementById('admin-content-upload-preview-bild'),
      uploadPreviewName: document.getElementById('admin-content-upload-preview-name'),
      uploadPreviewModal: document.getElementById('admin-content-upload-preview-modal'),
      uploadPreviewModalTitel: document.getElementById('admin-content-upload-preview-modal-titel'),
      uploadPreviewModalBild: document.getElementById('admin-content-upload-preview-modal-bild'),
      mediaUrlFeld: document.getElementById('admin-content-media-url'),
      quizFelder: document.getElementById('admin-content-quiz-felder'),
      quizFragenListe: document.getElementById('admin-content-quiz-fragen'),
      quizAddButton: document.getElementById('admin-content-quiz-add'),
      formStatus: document.getElementById('admin-content-form-status')
    };
  }

  function setzeAdminContentStatus(status, meldung) {
    const elemente = contentElemente();

    if (!elemente.bereich || !elemente.loading || !elemente.fehler || !elemente.leer || !elemente.grid) {
      return;
    }

    elemente.loading.classList.toggle('d-none', status !== 'loading');
    elemente.fehler.classList.toggle('d-none', status !== 'fehler');
    elemente.leer.classList.toggle('d-none', status !== 'leer');
    elemente.grid.classList.toggle('d-none', status !== 'bereit');

    if (status !== 'leer') {
      setzeContentLeerFehler(false);
    }

    if (elemente.fehlerText && meldung) {
      elemente.fehlerText.textContent = meldung;
    }

    if (elemente.leerText && status === 'leer') {
      elemente.leerText.textContent = meldung || STANDARD_ADMIN_CONTENT_LEER_TEXT;
    }
  }

  function formatiereContentDatum(datumWert) {
    if (!datumWert) {
      return 'Kein Datum';
    }

    const datum = new Date(datumWert);

    if (Number.isNaN(datum.getTime())) {
      return 'Ungültiges Datum';
    }

    return datum.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  function istBekannterContentTyp(typ) {
    return ['all', 'text', 'image', 'video', 'game', 'quiz'].includes(typ);
  }

  function istBekannterContentStatusFilter(status) {
    return ['all', 'active', 'inactive', 'with_media', 'without_media'].includes(status);
  }

  function setzeContentFilterSichtbar(sichtbar) {
    const elemente = contentElemente();

    if (elemente.filter) {
      elemente.filter.classList.toggle('d-none', !sichtbar);
    }

    if (!sichtbar && elemente.filterStatus) {
      elemente.filterStatus.textContent = '';
    }
  }

  function synchronisiereContentFilterFeld() {
    const elemente = contentElemente();

    if (elemente.filterFeld) {
      elemente.filterFeld.value = aktiverContentTypFilter;
    }

    if (elemente.filterStatusFeld) {
      elemente.filterStatusFeld.value = aktiverContentStatusFilter;
    }
  }

  function contentEintraegeNachFilter() {
    return geladeneContentEintraege.filter(function(content) {
      const typPasst = aktiverContentTypFilter === 'all' || content.type === aktiverContentTypFilter;
      const hatMedia = Boolean(content.media_url);
      let statusPasst = true;

      if (aktiverContentStatusFilter === 'active') {
        statusPasst = content.is_active !== false;
      } else if (aktiverContentStatusFilter === 'inactive') {
        statusPasst = content.is_active === false;
      } else if (aktiverContentStatusFilter === 'with_media') {
        statusPasst = hatMedia;
      } else if (aktiverContentStatusFilter === 'without_media') {
        statusPasst = !hatMedia;
      }

      return typPasst && statusPasst;
    });
  }

  function aktualisiereContentFilterStatus(anzahl) {
    const filterStatus = contentElemente().filterStatus;
    const typText = aktiverContentTypFilter === 'all'
      ? 'alle Typen'
      : contentTypLabel(aktiverContentTypFilter);
    const statusLabels = {
      all: 'alle Status',
      active: 'aktive Inhalte',
      inactive: 'inaktive Inhalte',
      with_media: 'mit Media',
      without_media: 'ohne Media'
    };
    const statusText = statusLabels[aktiverContentStatusFilter] || 'alle Status';
    const eintragText = anzahl === 1 ? 'Eintrag' : 'Einträge';

    if (filterStatus) {
      filterStatus.textContent = `${anzahl} ${eintragText} für ${typText}, ${statusText}`;
    }
  }

  function setzeContentLeerFehler(istFehler) {
    const leer = contentElemente().leer;

    if (leer) {
      leer.classList.toggle('admin-content-leer-fehler', istFehler);
    }
  }

  function setzeContentStat(element, wert) {
    if (element) {
      element.textContent = String(wert);
    }
  }

  function renderContentKennzahlen(contentEintraege) {
    const elemente = contentElemente();
    const eintraege = Array.isArray(contentEintraege) ? contentEintraege : [];
    const aktiv = eintraege.filter(function(content) {
      return content.is_active !== false;
    }).length;
    const mitMedia = eintraege.filter(function(content) {
      return Boolean(content.media_url);
    }).length;

    if (elemente.stats) {
      elemente.stats.classList.toggle('d-none', eintraege.length === 0);
    }

    setzeContentStat(elemente.statGesamt, eintraege.length);
    setzeContentStat(elemente.statAktiv, aktiv);
    setzeContentStat(elemente.statInaktiv, Math.max(eintraege.length - aktiv, 0));
    setzeContentStat(elemente.statMedia, mitMedia);
    setzeContentStat(elemente.statOhneMedia, Math.max(eintraege.length - mitMedia, 0));
  }

  function contentBodyVorschau(content) {
    if (!content.body) {
      return 'Kein Body';
    }

    if (content.type === 'quiz') {
      try {
        return window.AdventskalenderQuiz.quizVorschau(content.body);
      } catch (error) {
        return 'Quiz-Daten konnten nicht gelesen werden';
      }
    }

    return content.body;
  }

  function baueContentMediaUrl(mediaUrl) {
    if (!mediaUrl) {
      return '';
    }

    try {
      const url = new URL(mediaUrl, window.AdventskalenderApi.API_BASE_URL || window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function renderAdminContentBildVorschau(content) {
    if (content.type !== 'image') {
      return '';
    }

    const mediaUrl = baueContentMediaUrl(content.media_url);

    if (!mediaUrl) {
      return '';
    }

    return `
      <button
        class="admin-content-image-preview-button"
        type="button"
        data-admin-content-image-preview
        aria-label="Bild #${content.id} vergrößern"
      >
        <img
          class="admin-content-image-preview"
          src="${mediaUrl}"
          alt="Vorschau von Bild #${content.id}"
          loading="lazy"
        >
      </button>
    `;
  }

  function renderAdminContentMediaUrl(content) {
    if (!content.media_url) {
      return '<dd>-</dd>';
    }

    return `
      <dd class="admin-content-media-kompakt">
        <span class="admin-content-media-status" data-admin-content-media-label>Vorhanden</span>
        <button
          class="admin-content-media-copy"
          type="button"
          data-admin-content-copy-media
          aria-label="Media-URL von Content #${content.id} kopieren"
        >
          <i class="bi bi-clipboard" aria-hidden="true"></i>
          Kopieren
        </button>
      </dd>
    `;
  }

  function zugewieseneTuerchenFuerContent(contentId) {
    return adminTageFuerContent
      .filter(function(tag) {
        return Array.isArray(tag.contents) && tag.contents.some(function(inhalt) {
          return String(inhalt.id) === String(contentId);
        });
      })
      .map(function(tag) {
        return tag.day_number;
      })
      .sort(function(a, b) {
        return a - b;
      });
  }

  function textFuerContentZuweisung(contentId) {
    const tuerchen = zugewieseneTuerchenFuerContent(contentId);

    if (tuerchen.length === 0) {
      return '';
    }

    return 'Zugewiesen in Türchen ' + tuerchen.join(', ');
  }

  function renderAdminContentZuweisung(content) {
    const text = textFuerContentZuweisung(content.id);

    return `
      <span class="admin-content-assignment-badge ${text ? '' : 'ist-leer'}">
        ${text || 'Nicht zugewiesen'}
      </span>
    `;
  }

  function kopiereTextInZwischenablage(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }

    const textfeld = document.createElement('textarea');
    textfeld.value = text;
    textfeld.setAttribute('readonly', '');
    textfeld.style.position = 'fixed';
    textfeld.style.opacity = '0';
    document.body.appendChild(textfeld);
    textfeld.select();

    try {
      document.execCommand('copy');
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      document.body.removeChild(textfeld);
    }
  }

  function zeigeMediaCopyFeedback(button) {
    if (!button) {
      return;
    }

    if (button.dataset.feedbackTimeout) {
      clearTimeout(Number(button.dataset.feedbackTimeout));
    }

    button.classList.add('ist-kopiert');
    button.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i> Kopiert';

    const timeout = window.setTimeout(function() {
      button.classList.remove('ist-kopiert');
      button.innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i> Kopieren';
      delete button.dataset.feedbackTimeout;
    }, 1400);

    button.dataset.feedbackTimeout = String(timeout);
  }

  function initialisiereContentKarteCollapse(karte, content) {
    const kopf = karte.querySelector('.admin-content-card-kopf');
    const vorschau = karte.querySelector('.admin-content-body');
    const bildVorschau = karte.querySelector('[data-admin-content-image-preview]');
    const details = karte.querySelector('.admin-content-details');
    const actions = karte.querySelector('.admin-content-card-actions');

    if (!kopf || !vorschau || !details || !actions) {
      return;
    }

    karte.classList.add('ist-einklappbar');

    const inhaltId = `admin-content-${content.id}-details`;
    const toggle = document.createElement('button');
    const summary = document.createElement('span');
    const badges = document.createElement('span');
    const body = document.createElement('span');
    const pfeil = document.createElement('i');
    const inhalt = document.createElement('div');
    const inhaltInner = document.createElement('div');

    toggle.className = 'admin-content-card-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', inhaltId);

    summary.className = 'admin-content-card-summary';
    badges.className = 'admin-content-card-badges';
    body.className = 'admin-content-body';
    body.innerHTML = vorschau.innerHTML;
    pfeil.className = 'bi bi-chevron-down admin-content-card-pfeil';
    pfeil.setAttribute('aria-hidden', 'true');

    while (kopf.firstChild) {
      badges.appendChild(kopf.firstChild);
    }

    vorschau.remove();
    summary.appendChild(badges);
    summary.appendChild(body);
    toggle.appendChild(summary);
    toggle.appendChild(pfeil);
    kopf.appendChild(toggle);

    inhalt.className = 'admin-content-card-inhalt';
    inhalt.id = inhaltId;
    inhalt.setAttribute('aria-hidden', 'true');
    inhalt.setAttribute('inert', '');
    inhaltInner.className = 'admin-content-card-inhalt-inner';

    if (bildVorschau) {
      inhaltInner.appendChild(bildVorschau);
    }

    inhaltInner.appendChild(details);
    inhaltInner.appendChild(actions);
    inhalt.appendChild(inhaltInner);
    karte.appendChild(inhalt);

    toggle.addEventListener('click', function() {
      const wirdGeoeffnet = !karte.classList.contains('ist-aufgeklappt');

      karte.classList.toggle('ist-aufgeklappt', wirdGeoeffnet);
      toggle.setAttribute('aria-expanded', String(wirdGeoeffnet));
      inhalt.setAttribute('aria-hidden', String(!wirdGeoeffnet));
      inhalt.toggleAttribute('inert', !wirdGeoeffnet);
    });
  }

  function renderAdminContentKarte(content) {
    const karte = document.createElement('article');
    karte.className = 'admin-content-card';
    karte.setAttribute('data-content-id', content.id);
    const aktivButtonLabel = content.is_active ? 'Deaktivieren' : 'Aktivieren';
    const aktivButtonIcon = content.is_active ? 'bi-eye-slash' : 'bi-check-circle';

    karte.innerHTML = `
      <div class="admin-content-card-kopf">
        <span class="admin-content-type">${contentTypLabel(content.type)}</span>
        <span class="admin-content-status ${content.is_active ? 'ist-aktiv' : 'ist-inaktiv'}">
          ${content.is_active ? 'Aktiv' : 'Inaktiv'}
        </span>
        ${renderAdminContentZuweisung(content)}
      </div>
      <p class="admin-content-body">${contentBodyVorschau(content)}</p>
      ${renderAdminContentBildVorschau(content)}
      <dl class="admin-content-details">
        <div>
          <dt>ID</dt>
          <dd>#${content.id}</dd>
        </div>
        <div>
          <dt>Zuweisung</dt>
          <dd>${textFuerContentZuweisung(content.id) || 'Nicht zugewiesen'}</dd>
        </div>
        <div>
          <dt>Media-URL</dt>
          ${renderAdminContentMediaUrl(content)}
        </div>
        <div>
          <dt>Erstellt</dt>
          <dd>${formatiereContentDatum(content.created_at)}</dd>
        </div>
      </dl>
      <div class="admin-content-card-actions">
        <button class="admin-content-action-btn" type="button" data-admin-content-edit>
          <i class="bi bi-pencil-square" aria-hidden="true"></i>
          Bearbeiten
        </button>
        <button class="admin-content-action-btn ${content.is_active ? 'ist-warnung' : ''}" type="button" data-admin-content-toggle-active>
          <i class="bi ${aktivButtonIcon}" aria-hidden="true"></i>
          ${aktivButtonLabel}
        </button>
        <button class="admin-content-action-btn ist-warnung" type="button" data-admin-content-delete>
          <i class="bi bi-trash" aria-hidden="true"></i>
          Löschen
        </button>
      </div>
    `;

    initialisiereContentKarteCollapse(karte, content);

    const bearbeitenButton = karte.querySelector('[data-admin-content-edit]');
    const aktivButton = karte.querySelector('[data-admin-content-toggle-active]');
    const loeschButton = karte.querySelector('[data-admin-content-delete]');
    const bildPreviewButton = karte.querySelector('[data-admin-content-image-preview]');
    const mediaLabel = karte.querySelector('[data-admin-content-media-label]');
    const mediaCopyButton = karte.querySelector('[data-admin-content-copy-media]');

    if (mediaLabel && content.media_url) {
      mediaLabel.title = content.media_url;
    }

    if (bearbeitenButton) {
      bearbeitenButton.addEventListener('click', function() {
        fuelleContentForm(content);
      });
    }

    if (aktivButton) {
      aktivButton.addEventListener('click', function() {
        aktualisiereContentAktivstatus(content, aktivButton);
      });
    }

    if (loeschButton) {
      loeschButton.addEventListener('click', function() {
        oeffneContentLoeschDialog(content, loeschButton);
      });
    }

    if (bildPreviewButton) {
      bildPreviewButton.addEventListener('click', function() {
        oeffneContentBildVorschauGross(
          baueContentMediaUrl(content.media_url),
          `Bild #${content.id}`
        );
      });
    }

    if (mediaCopyButton && content.media_url) {
      mediaCopyButton.addEventListener('click', function() {
        kopiereTextInZwischenablage(content.media_url)
          .then(function() {
            zeigeMediaCopyFeedback(mediaCopyButton);
            zeigeContentToast('Media-URL wurde kopiert.', 'erfolg');
          })
          .catch(function() {
            zeigeContentToast('Media-URL konnte nicht kopiert werden.', 'fehler');
          });
      });
    }

    return karte;
  }

  function zeigeContentToast(nachricht, typ) {
    if (window.AdminLoginUi && typeof window.AdminLoginUi.zeigeStatus === 'function') {
      window.AdminLoginUi.zeigeStatus(nachricht, typ);
    }
  }

  function setzeContentActionButtonLaedt(button, laedt, ladeText) {
    if (!button) {
      return;
    }

    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }

    button.disabled = laedt;
    button.innerHTML = laedt
      ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>${ladeText}`
      : button.dataset.originalHtml;
  }

  function fehlertextFuerContentLoeschen(error) {
    if (error && error.status === 409) {
      return 'Content ist noch einem Türchen zugewiesen und kann deshalb nicht gelöscht werden.';
    }

    return window.AdventskalenderApi.fehlertextFuerApiFehler(
      error,
      'Content konnte nicht gelöscht werden.'
    );
  }

  function setzeContentLoeschModalLaedt(laedt) {
    const button = contentElemente().deleteConfirmButton;

    if (!button) {
      return;
    }

    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }

    button.disabled = laedt;
    button.innerHTML = laedt
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>Löschen...'
      : button.dataset.originalHtml;
  }

  function oeffneContentLoeschDialog(content, button) {
    if (!content || !content.id) {
      return;
    }

    const elemente = contentElemente();
    zuLoeschenderContent = content;
    zuLoeschenderButton = button;

    if (elemente.deleteModalText) {
      elemente.deleteModalText.textContent = `Soll Content #${content.id} wirklich gelöscht werden?`;
    }

    setzeContentLoeschModalLaedt(false);

    if (!elemente.deleteModal || !window.bootstrap) {
      return;
    }

    bootstrap.Modal.getOrCreateInstance(elemente.deleteModal).show();
  }

  function schliesseContentLoeschDialog() {
    const modalElement = contentElemente().deleteModal;

    if (modalElement && window.bootstrap) {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  }

  function loescheContentEintrag(content, button) {
    if (!content || !content.id) {
      return;
    }

    setzeContentActionButtonLaedt(button, true, 'Löschen...');
    setzeContentLoeschModalLaedt(true);

    return window.AdventskalenderApi.loescheAdminContent(content.id)
      .then(function() {
        if (String(bearbeiteterContentId) === String(content.id)) {
          resetContentForm();
          setzeContentFormSichtbar(false);
        }

        zeigeContentToast('Content wurde gelöscht.', 'erfolg');
        schliesseContentLoeschDialog();
        return ladeAdminContentListe();
      })
      .catch(function(error) {
        setzeContentActionButtonLaedt(button, false);
        setzeContentLoeschModalLaedt(false);
        zeigeContentToast(
          fehlertextFuerContentLoeschen(error),
          'fehler'
        );
      });
  }

  function aktualisiereContentAktivstatus(content, button) {
    const neuerStatus = !content.is_active;
    const standardText = neuerStatus ? 'Aktivieren' : 'Deaktivieren';

    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>Speichern...';
    }

    return window.AdventskalenderApi.aktualisiereAdminContent(content.id, {
      is_active: neuerStatus
    })
      .then(function() {
        zeigeContentToast(
          neuerStatus ? 'Content wurde aktiviert.' : 'Content wurde deaktiviert.',
          'erfolg'
        );
        return ladeAdminContentListe();
      })
      .catch(function(error) {
        if (button) {
          button.disabled = false;
          button.innerHTML = standardText;
        }

        zeigeContentToast(
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Content-Status konnte nicht geändert werden.'
          ),
          'fehler'
        );
      });
  }

  function renderAdminContentListe(contentEintraege) {
    const grid = contentElemente().grid;

    if (!grid) {
      return;
    }

    grid.innerHTML = '';

    contentEintraege.forEach(function(content) {
      grid.appendChild(renderAdminContentKarte(content));
    });
  }

  function leereAdminContentZustand(filterZuruecksetzen) {
    geladeneContentEintraege = [];

    if (filterZuruecksetzen) {
      aktiverContentTypFilter = 'all';
      aktiverContentStatusFilter = 'all';
    }

    synchronisiereContentFilterFeld();
    renderContentKennzahlen(geladeneContentEintraege);
    renderAdminContentListe([]);
    setzeContentFilterSichtbar(false);
    setzeContentLeerFehler(false);
  }

  function renderGefilterteAdminContentListe() {
    const gefilterteEintraege = contentEintraegeNachFilter();

    renderAdminContentListe(gefilterteEintraege);
    aktualisiereContentFilterStatus(gefilterteEintraege.length);

    if (geladeneContentEintraege.length === 0) {
      setzeContentFilterSichtbar(false);
      setzeContentLeerFehler(false);
      setzeAdminContentStatus('leer', 'Es sind noch keine Content-Einträge vorhanden.');
      return;
    }

    setzeContentFilterSichtbar(true);

    if (gefilterteEintraege.length === 0) {
      setzeContentLeerFehler(true);
      setzeAdminContentStatus('leer', 'Keine Content-Einträge für diese Filter gefunden.');
      return;
    }

    setzeContentLeerFehler(false);
    setzeAdminContentStatus('bereit');
  }

  function setzeAdminContentListe(contentEintraege) {
    geladeneContentEintraege = Array.isArray(contentEintraege) ? contentEintraege : [];
    synchronisiereContentFilterFeld();
    renderContentKennzahlen(geladeneContentEintraege);
    renderGefilterteAdminContentListe();
    return geladeneContentEintraege;
  }

  function waehleContentTypFilter(typ) {
    aktiverContentTypFilter = istBekannterContentTyp(typ) ? typ : 'all';
    synchronisiereContentFilterFeld();
    renderGefilterteAdminContentListe();
  }

  function waehleContentStatusFilter(status) {
    aktiverContentStatusFilter = istBekannterContentStatusFilter(status) ? status : 'all';
    synchronisiereContentFilterFeld();
    renderGefilterteAdminContentListe();
  }

  function setzeContentFormSichtbar(sichtbar) {
    const elemente = contentElemente();

    if (!elemente.form || !elemente.createButton) {
      return;
    }

    elemente.form.classList.toggle('d-none', !sichtbar);
    elemente.createButton.setAttribute('aria-expanded', String(sichtbar));
    elemente.createButton.innerHTML = sichtbar
      ? '<i class="bi bi-x-lg" aria-hidden="true"></i> Formular schließen'
      : '<i class="bi bi-plus-lg" aria-hidden="true"></i> Content erstellen';

    if (sichtbar && elemente.typeFeld) {
      aktualisiereContentFormValiditaet();
      elemente.typeFeld.focus();
    }
  }

  function submitButtonText() {
    return bearbeiteterContentId ? 'Änderungen speichern' : 'Content erstellen';
  }

  function feldWert(feld) {
    return feld && typeof feld.value === 'string' ? feld.value.trim() : '';
  }

  function quizFrageElemente(block) {
    return {
      question: block.querySelector('[data-quiz-question-input]'),
      options: Array.from(block.querySelectorAll('[data-quiz-option-input]')),
      correct: block.querySelector('[data-quiz-correct-input]')
    };
  }

  function leseQuizFragenAusForm(elemente) {
    if (!elemente.quizFragenListe) {
      return [];
    }

    return Array.from(elemente.quizFragenListe.querySelectorAll('[data-quiz-question]'))
      .map(function(block) {
        const frageElemente = quizFrageElemente(block);

        return {
          question: feldWert(frageElemente.question),
          options: frageElemente.options.map(feldWert),
          correct: Number.parseInt(frageElemente.correct ? frageElemente.correct.value : '0', 10)
        };
      });
  }

  function aktualisiereQuizFrageNummern(elemente) {
    if (!elemente.quizFragenListe) {
      return;
    }

    const bloecke = Array.from(elemente.quizFragenListe.querySelectorAll('[data-quiz-question]'));

    bloecke.forEach(function(block, index) {
      const titel = block.querySelector('[data-quiz-question-title]');
      const loeschButton = block.querySelector('[data-quiz-question-remove]');

      if (titel) {
        titel.textContent = `Frage ${index + 1}`;
      }

      if (loeschButton) {
        loeschButton.disabled = bloecke.length <= 1;
      }
    });
  }

  function erstelleQuizFrageBlock(elemente, frage) {
    if (!elemente.quizFragenListe) {
      return null;
    }

    const block = document.createElement('section');
    const idSuffix = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    block.className = 'admin-content-quiz-frage';
    block.setAttribute('data-quiz-question', '');

    block.innerHTML = `
      <div class="admin-content-quiz-frage-kopf">
        <h3 class="admin-content-quiz-frage-titel" data-quiz-question-title>Frage</h3>
        <button class="admin-content-quiz-remove" type="button" data-quiz-question-remove>
          <i class="bi bi-trash" aria-hidden="true"></i>
          Entfernen
        </button>
      </div>
      <label class="admin-content-feld" for="${idSuffix}-question">
        <span>Frage</span>
        <input id="${idSuffix}-question" name="quiz_question[]" type="text" placeholder="Was ist 2+2?" data-quiz-question-input>
      </label>
      <div class="admin-content-form-grid">
        <label class="admin-content-feld" for="${idSuffix}-option-0">
          <span>Antwort 1</span>
          <input id="${idSuffix}-option-0" name="quiz_option_0[]" type="text" data-quiz-option-input>
        </label>
        <label class="admin-content-feld" for="${idSuffix}-option-1">
          <span>Antwort 2</span>
          <input id="${idSuffix}-option-1" name="quiz_option_1[]" type="text" data-quiz-option-input>
        </label>
        <label class="admin-content-feld" for="${idSuffix}-option-2">
          <span>Antwort 3</span>
          <input id="${idSuffix}-option-2" name="quiz_option_2[]" type="text" data-quiz-option-input>
        </label>
        <label class="admin-content-feld" for="${idSuffix}-option-3">
          <span>Antwort 4</span>
          <input id="${idSuffix}-option-3" name="quiz_option_3[]" type="text" data-quiz-option-input>
        </label>
      </div>
      <label class="admin-content-feld" for="${idSuffix}-correct">
        <span>Korrekte Antwort</span>
        <select id="${idSuffix}-correct" name="quiz_correct[]" data-quiz-correct-input>
          <option value="0">Antwort 1</option>
          <option value="1">Antwort 2</option>
          <option value="2">Antwort 3</option>
          <option value="3">Antwort 4</option>
        </select>
      </label>
    `;

    const daten = {
      question: frage && frage.question ? frage.question : '',
      options: frage && Array.isArray(frage.options) ? frage.options : ['', '', '', ''],
      correct: frage && Number.isInteger(frage.correct) ? frage.correct : 0
    };
    const frageElemente = quizFrageElemente(block);

    if (frageElemente.question) {
      frageElemente.question.value = daten.question;
    }

    frageElemente.options.forEach(function(optionFeld, index) {
      optionFeld.value = daten.options[index] || '';
    });

    if (frageElemente.correct) {
      frageElemente.correct.value = String(daten.correct >= 0 && daten.correct < 4 ? daten.correct : 0);
    }

    const loeschButton = block.querySelector('[data-quiz-question-remove]');

    if (loeschButton) {
      loeschButton.addEventListener('click', function() {
        block.remove();
        stelleQuizMindestfrageSicher(elemente);
        aktualisiereQuizFrageNummern(elemente);
        aktualisiereContentFormValiditaet();
      });
    }

    elemente.quizFragenListe.appendChild(block);
    aktualisiereQuizFrageNummern(elemente);
    return block;
  }

  function setzeQuizFragen(elemente, fragen) {
    if (!elemente.quizFragenListe) {
      return;
    }

    elemente.quizFragenListe.innerHTML = '';
    const quizFragen = Array.isArray(fragen) && fragen.length > 0
      ? fragen
      : [{ question: '', options: ['', '', '', ''], correct: 0 }];

    quizFragen.forEach(function(frage) {
      erstelleQuizFrageBlock(elemente, frage);
    });

    aktualisiereQuizFrageNummern(elemente);
  }

  function stelleQuizMindestfrageSicher(elemente) {
    if (!elemente.quizFragenListe) {
      return;
    }

    if (elemente.quizFragenListe.querySelectorAll('[data-quiz-question]').length === 0) {
      erstelleQuizFrageBlock(elemente);
    }
  }

  function baueQuizBody(elemente) {
    return window.AdventskalenderQuiz.baueQuizBodyAusFragen(leseQuizFragenAusForm(elemente));
  }

  function baueContentPayload() {
    const elemente = contentElemente();
    const typ = elemente.typeFeld ? elemente.typeFeld.value : 'text';
    const body = feldWert(elemente.bodyFeld);
    const mediaUrl = feldWert(elemente.mediaUrlFeld);
    const payloadMediaUrl = typ === 'video' ? (body || mediaUrl) : mediaUrl;
    const payloadBody = typ === 'quiz'
      ? baueQuizBody(elemente)
      : (typ === 'video' ? null : body || null);

    return {
      type: typ,
      body: payloadBody,
      media_url: payloadMediaUrl || null
    };
  }

  function mediaUrlAusUploadAntwort(antwort) {
    if (!antwort || typeof antwort !== 'object') {
      return '';
    }

    return antwort.media_url || antwort.secure_url || antwort.url || '';
  }

  function dateinameAusMediaUrl(mediaUrl) {
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return '';
    }

    try {
      const url = new URL(mediaUrl, window.location.href);
      const dateiname = url.pathname.split('/').filter(Boolean).pop();
      return dateiname ? decodeURIComponent(dateiname) : '';
    } catch (error) {
      const dateiname = mediaUrl.split('?')[0].split('/').filter(Boolean).pop();
      return dateiname ? decodeURIComponent(dateiname) : '';
    }
  }

  function setzeContentUploadVorschau(mediaUrl, dateiname) {
    const elemente = contentElemente();
    const hatMediaUrl = Boolean(mediaUrl);
    const titel = dateiname || dateinameAusMediaUrl(mediaUrl) || 'Hochgeladene Datei';

    if (elemente.uploadPreview) {
      elemente.uploadPreview.classList.toggle('d-none', !hatMediaUrl);
      elemente.uploadPreview.setAttribute('aria-label', hatMediaUrl ? `${titel} vergrößert anzeigen` : '');
    }

    if (elemente.uploadPreviewBild) {
      elemente.uploadPreviewBild.src = hatMediaUrl ? mediaUrl : '';
      elemente.uploadPreviewBild.alt = hatMediaUrl ? `Vorschau von ${titel}` : 'Vorschau der hochgeladenen Datei';
    }

    if (elemente.uploadPreviewName) {
      elemente.uploadPreviewName.textContent = hatMediaUrl ? titel : '';
    }
  }

  function setzeContentDateiName(dateiname) {
    const elemente = contentElemente();

    if (elemente.fileName) {
      elemente.fileName.textContent = dateiname || 'Keine Datei ausgewählt';
    }
  }

  function oeffneContentBildVorschauGross(mediaUrl, titel) {
    const elemente = contentElemente();

    if (!mediaUrl || !elemente.uploadPreviewModal || !elemente.uploadPreviewModalBild || !window.bootstrap) {
      return;
    }

    if (elemente.uploadPreviewModalTitel) {
      elemente.uploadPreviewModalTitel.textContent = titel || 'Bildvorschau';
    }

    elemente.uploadPreviewModalBild.src = mediaUrl;
    elemente.uploadPreviewModalBild.alt = titel ? `Vergroesserte Vorschau von ${titel}` : 'Vergroesserte Bildvorschau';

    window.bootstrap.Modal.getOrCreateInstance(elemente.uploadPreviewModal).show();
  }

  function zeigeContentUploadVorschauGross() {
    const elemente = contentElemente();
    const mediaUrl = elemente.mediaUrlFeld ? elemente.mediaUrlFeld.value : '';
    const dateiname = elemente.uploadPreviewName ? elemente.uploadPreviewName.textContent : '';

    if (!mediaUrl || !elemente.uploadPreviewModal || !elemente.uploadPreviewModalBild) {
      return;
    }

    if (elemente.uploadPreviewModalTitel) {
      elemente.uploadPreviewModalTitel.textContent = dateiname || 'Bildvorschau';
    }

    elemente.uploadPreviewModalBild.src = mediaUrl;
    elemente.uploadPreviewModalBild.alt = dateiname ? `Vergrößerte Vorschau von ${dateiname}` : 'Vergrößerte Bildvorschau';

    bootstrap.Modal.getOrCreateInstance(elemente.uploadPreviewModal).show();
  }

  function resetContentUploadVorschauModal() {
    const elemente = contentElemente();

    if (elemente.uploadPreviewModalBild) {
      elemente.uploadPreviewModalBild.src = '';
    }
  }

  function uploadFehlerText(error) {
    const meldung = error && error.message ? error.message : '';

    if (meldung.toLowerCase() === 'file too large') {
      return 'Die Datei ist zu groß!';
    }

    return window.AdventskalenderApi.fehlertextFuerApiFehler(
      error,
      'Datei konnte nicht hochgeladen werden!'
    );
  }

  function setzeContentUploadStatus(status, meldung) {
    const elemente = contentElemente();

    contentUploadLaeuft = status === 'loading';

    if (elemente.fileFeld) {
      elemente.fileFeld.disabled = contentUploadLaeuft;
    }

    if (elemente.fileButton) {
      elemente.fileButton.disabled = contentUploadLaeuft;
    }

    if (elemente.uploadStatus) {
      elemente.uploadStatus.classList.toggle('ist-ladend', status === 'loading');
      elemente.uploadStatus.classList.toggle('hat-fehler', status === 'fehler');
      elemente.uploadStatus.classList.toggle('hat-erfolg', status === 'erfolg');

      if (status === 'loading') {
        elemente.uploadStatus.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Datei wird hochgeladen...';
      } else {
        elemente.uploadStatus.textContent = meldung || '';
      }
    }

    aktualisiereContentFormValiditaet();
  }

  function ladeContentDateiHoch(datei) {
    const elemente = contentElemente();

    if (!datei || !elemente.mediaUrlFeld) {
      return;
    }

    const bisherigeMediaUrl = elemente.mediaUrlFeld.value;
    const bisherigerDateiname = elemente.uploadPreviewName ? elemente.uploadPreviewName.textContent : '';

    setzeContentDateiName(datei.name);
    setzeContentUploadStatus('loading');

    window.AdventskalenderApi.ladeAdminDateiHoch(datei)
      .then(function(antwort) {
        const mediaUrl = mediaUrlAusUploadAntwort(antwort);

        if (!mediaUrl) {
          throw new Error('Upload erfolgreich, aber die Datei-URL fehlt in der Server-Antwort.');
        }

        elemente.mediaUrlFeld.value = mediaUrl;
        setzeContentUploadVorschau(mediaUrl, datei.name);
        setzeContentUploadStatus('erfolg', 'Datei wurde hochgeladen.');
      })
      .catch(function(error) {
        elemente.mediaUrlFeld.value = bisherigeMediaUrl;
        if (elemente.fileFeld) {
          elemente.fileFeld.value = '';
        }
        setzeContentDateiName('');
        setzeContentUploadVorschau(bisherigeMediaUrl, bisherigerDateiname);
        setzeContentUploadStatus(
          'fehler',
          uploadFehlerText(error)
        );
      });
  }

  function fuelleQuizFelder(elemente, content) {
    let quizFragen = [];

    if (content.body) {
      quizFragen = window.AdventskalenderQuiz.quizBodyZuFragen(content.body);

      if (quizFragen.length === 0) {
        quizFragen = [{
          question: content.body,
          options: ['', '', '', ''],
          correct: 0
        }];
      }
    }

    setzeQuizFragen(elemente, quizFragen);
  }

  function fuelleContentForm(content) {
    const elemente = contentElemente();

    if (!elemente.form || !elemente.typeFeld || !elemente.bodyFeld || !elemente.mediaUrlFeld) {
      return;
    }

    bearbeiteterContentId = content.id;
    elemente.form.reset();
    setzeContentDateiName('');
    elemente.typeFeld.value = content.type || 'text';
    elemente.mediaUrlFeld.value = content.media_url || '';
    setzeContentUploadVorschau(content.media_url || '');

    if (content.type === 'quiz') {
      elemente.bodyFeld.value = '';
      fuelleQuizFelder(elemente, content);
    } else if (content.type === 'video') {
      elemente.bodyFeld.value = content.body || content.media_url || '';
    } else {
      elemente.bodyFeld.value = content.body || '';
    }

    aktualisiereContentFormTyp();
    setzeContentFormStatus('', '');
    setzeContentFormSichtbar(true);
  }

  function istContentFormValide() {
    return !contentFormValidierungsMeldung();
  }

  function contentFormValidierungsMeldung() {
    const elemente = contentElemente();

    if (!elemente.typeFeld || !elemente.bodyFeld || !elemente.mediaUrlFeld || contentUploadLaeuft) {
      return contentUploadLaeuft ? 'Bitte warte, bis der Upload abgeschlossen ist.' : 'Das Content-Formular ist noch nicht bereit.';
    }

    const typ = elemente.typeFeld.value;
    const body = feldWert(elemente.bodyFeld);
    const mediaUrl = feldWert(elemente.mediaUrlFeld);

    if (typ === 'quiz') {
      const quizFragen = leseQuizFragenAusForm(elemente);

      if (quizFragen.length === 0) {
        return 'Bitte lege mindestens eine Quiz-Frage an.';
      }

      for (let index = 0; index < quizFragen.length; index += 1) {
        const frage = quizFragen[index];

        if (!frage.question) {
          return `Bitte trage bei Frage ${index + 1} einen Fragetext ein.`;
        }

        if (!frage.options.every(Boolean)) {
          return `Bitte trage bei Frage ${index + 1} alle Antwortoptionen ein.`;
        }

        if (Number.isNaN(frage.correct) || frage.correct < 0 || frage.correct >= frage.options.length) {
          return `Bitte waehle bei Frage ${index + 1} eine korrekte Antwort aus.`;
        }
      }

      return '';
    }

    if (typ === 'text') {
      return body ? '' : 'Bitte trage einen Body ein.';
    }

    if (typ === 'game') {
      return '';
    }

    if (typ === 'image') {
      return mediaUrl ? '' : 'Bitte lade zuerst eine Bilddatei hoch.';
    }

    if (typ === 'video') {
      return mediaUrl || body ? '' : 'Bitte hinterlege eine Video-URL oder lade eine Mediendatei hoch.';
    }

    return '';
  }

  function aktualisiereContentFormValiditaet() {
    const elemente = contentElemente();
    const validierungsMeldung = contentFormValidierungsMeldung();

    if (elemente.submitButton) {
      elemente.submitButton.disabled = Boolean(validierungsMeldung);
    }

    if (elemente.form && elemente.formStatus && !contentUploadLaeuft) {
      elemente.form.classList.toggle('hat-fehler', Boolean(validierungsMeldung));
      elemente.formStatus.textContent = validierungsMeldung;
    }
  }

  function setzeContentFormStatus(status, meldung) {
    const elemente = contentElemente();
    const istLadend = status === 'loading';

    if (elemente.form) {
      elemente.form.classList.toggle('ist-ladend', istLadend);
      elemente.form.classList.toggle('hat-fehler', status === 'fehler');
      elemente.form.classList.toggle('hat-erfolg', status === 'erfolg');
    }

    if (elemente.submitButton) {
      elemente.submitButton.disabled = istLadend || !istContentFormValide();
      elemente.submitButton.innerHTML = istLadend
        ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Speichern...'
        : submitButtonText();
    }

    if (elemente.formStatus) {
      elemente.formStatus.textContent = meldung || '';
    }
  }

  function resetContentForm() {
    const elemente = contentElemente();

    bearbeiteterContentId = null;

    if (elemente.form) {
      elemente.form.reset();
    }

    if (elemente.mediaUrlFeld) {
      elemente.mediaUrlFeld.value = '';
    }

    if (elemente.fileFeld) {
      elemente.fileFeld.value = '';
    }

    setzeContentUploadStatus('', '');
    setzeContentDateiName('');
    setzeContentUploadVorschau('');
    setzeQuizFragen(elemente);
    aktualisiereContentFormTyp();
    setzeContentFormStatus('', '');
  }

  function aktualisiereContentFormTyp() {
    const elemente = contentElemente();

    if (!elemente.typeFeld || !elemente.bodyFeld || !elemente.quizFelder) {
      return;
    }

    const typ = elemente.typeFeld.value;
    const istQuiz = typ === 'quiz';

    elemente.quizFelder.classList.toggle('d-none', !istQuiz);
    elemente.bodyFeld.disabled = istQuiz;

    if (istQuiz) {
      elemente.bodyFeld.placeholder = 'Quiz-Daten werden aus den Quiz-Feldern vorbereitet';
    } else if (typ === 'video') {
      elemente.bodyFeld.placeholder = 'Video-URL oder Embed-URL eintragen';
    } else if (typ === 'game') {
      elemente.bodyFeld.placeholder = 'Optionale Spiel-ID oder kurze Beschreibung';
    } else {
      elemente.bodyFeld.placeholder = 'Text, Link oder kurze Beschreibung';
    }

    if (istQuiz) {
      stelleQuizMindestfrageSicher(elemente);
    }

    aktualisiereContentFormValiditaet();
  }

  function aktualisiereAdminContentSichtbarkeit() {
    const elemente = contentElemente();
    const eingeloggt = istAdminEingeloggt();

    if (!elemente.bereich) {
      return;
    }

    elemente.bereich.classList.toggle('d-none', !eingeloggt);

    if (elemente.createButton) {
      elemente.createButton.disabled = !eingeloggt;
    }
  }

  function ladeAdminContentListe() {
    if (!istAdminEingeloggt()) {
      aktualisiereAdminContentSichtbarkeit();
      leereAdminContentZustand(true);
      setzeAdminContentStatus('leer');
      return Promise.resolve(null);
    }

    setzeAdminContentStatus('loading');
    setzeContentFilterSichtbar(false);
    setzeContentLeerFehler(false);

    return Promise.all([
      window.AdventskalenderApi.ladeAdminContent(),
      window.AdventskalenderApi.ladeAdminTage()
        .catch(function() {
          return [];
        })
    ])
      .then(function(ergebnisse) {
        const contentEintraege = ergebnisse[0];
        const tage = ergebnisse[1];

        adminTageFuerContent = Array.isArray(tage) ? tage : [];
        setzeAdminContentListe(contentEintraege);
        return contentEintraege;
      })
      .catch(function(error) {
        setzeContentFilterSichtbar(false);
        setzeContentLeerFehler(false);
        setzeAdminContentStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Content-Einträge konnten nicht geladen werden.'
          )
        );
        throw error;
      });
  }

  function initialisiereAdminContent() {
    const elemente = contentElemente();

    aktualisiereAdminContentSichtbarkeit();
    setzeQuizFragen(elemente);
    aktualisiereContentFormTyp();

    if (elemente.createButton) {
      elemente.createButton.addEventListener('click', function() {
        const formIstSichtbar = elemente.form && !elemente.form.classList.contains('d-none');

        if (formIstSichtbar) {
          resetContentForm();
          setzeContentFormSichtbar(false);
          return;
        }

        resetContentForm();
        setzeContentFormSichtbar(true);
      });
    }

    if (elemente.cancelButton) {
      elemente.cancelButton.addEventListener('click', function() {
        resetContentForm();
        setzeContentFormSichtbar(false);
      });
    }

    if (elemente.typeFeld) {
      elemente.typeFeld.addEventListener('change', aktualisiereContentFormTyp);
    }

    if (elemente.quizAddButton) {
      elemente.quizAddButton.addEventListener('click', function() {
        const block = erstelleQuizFrageBlock(elemente);

        if (block) {
          const frageFeld = block.querySelector('[data-quiz-question-input]');

          if (frageFeld) {
            frageFeld.focus();
          }
        }

        aktualisiereContentFormValiditaet();
      });
    }

    if (elemente.filterFeld) {
      elemente.filterFeld.addEventListener('change', function(event) {
        waehleContentTypFilter(event.target.value);
      });
    }

    if (elemente.filterStatusFeld) {
      elemente.filterStatusFeld.addEventListener('change', function(event) {
        waehleContentStatusFilter(event.target.value);
      });
    }

    if (elemente.fileFeld) {
      elemente.fileFeld.addEventListener('change', function(event) {
        const datei = event.target.files && event.target.files[0] ? event.target.files[0] : null;

        if (datei) {
          ladeContentDateiHoch(datei);
        } else if (!bearbeiteterContentId && elemente.mediaUrlFeld) {
          elemente.mediaUrlFeld.value = '';
          setzeContentDateiName('');
          setzeContentUploadVorschau('');
          aktualisiereContentFormValiditaet();
        }
      });
    }

    if (elemente.fileButton && elemente.fileFeld) {
      elemente.fileButton.addEventListener('click', function() {
        elemente.fileFeld.click();
      });
    }

    if (elemente.uploadPreview) {
      elemente.uploadPreview.addEventListener('click', zeigeContentUploadVorschauGross);
    }

    if (elemente.uploadPreviewModal) {
      elemente.uploadPreviewModal.addEventListener('hidden.bs.modal', resetContentUploadVorschauModal);
    }

    if (elemente.deleteConfirmButton) {
      elemente.deleteConfirmButton.addEventListener('click', function() {
        if (!zuLoeschenderContent) {
          return;
        }

        loescheContentEintrag(zuLoeschenderContent, zuLoeschenderButton);
      });
    }

    if (elemente.deleteModal) {
      elemente.deleteModal.addEventListener('hidden.bs.modal', function() {
        zuLoeschenderContent = null;
        zuLoeschenderButton = null;
        setzeContentLoeschModalLaedt(false);
      });
    }

    if (elemente.form) {
      elemente.form.addEventListener('input', aktualisiereContentFormValiditaet);
      elemente.form.addEventListener('change', aktualisiereContentFormValiditaet);
      elemente.form.addEventListener('submit', function(event) {
        event.preventDefault();

        const validierungsMeldung = contentFormValidierungsMeldung();

        if (validierungsMeldung) {
          setzeContentFormStatus('fehler', validierungsMeldung);
          return;
        }

        setzeContentFormStatus('loading');

        const request = bearbeiteterContentId
          ? window.AdventskalenderApi.aktualisiereAdminContent(bearbeiteterContentId, baueContentPayload())
          : window.AdventskalenderApi.erstelleAdminContent(baueContentPayload());

        request
          .then(function() {
            const erfolgsText = bearbeiteterContentId
              ? 'Content wurde aktualisiert.'
              : 'Content wurde erstellt.';

            resetContentForm();
            setzeContentFormSichtbar(false);
            if (window.AdminLoginUi && typeof window.AdminLoginUi.zeigeStatus === 'function') {
              window.AdminLoginUi.zeigeStatus(erfolgsText, 'erfolg');
            }
            return ladeAdminContentListe();
          })
          .catch(function(error) {
            setzeContentFormStatus(
              'fehler',
              window.AdventskalenderApi.fehlertextFuerApiFehler(
                error,
                'Content konnte nicht erstellt werden.'
              )
            );
          });
      });
    }

    if (istAdminEingeloggt()) {
      ladeAdminContentListe().catch(function() {});
    }
  }

  function verarbeiteAdminSessionAktualisierung() {
    aktualisiereAdminContentSichtbarkeit();

    if (istAdminEingeloggt()) {
      ladeAdminContentListe().catch(function() {});
    } else {
      leereAdminContentZustand(true);
      setzeAdminContentStatus('leer');
    }
  }

  window.AdminContentUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminContentSichtbarkeit,
    ladeContent: ladeAdminContentListe,
    renderContent: setzeAdminContentListe,
    filterContent: waehleContentTypFilter,
    bauePayload: baueContentPayload
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminContentSichtbarkeit();
    leereAdminContentZustand(true);
    setzeAdminContentStatus('leer');
  });
  window.addEventListener('adventskalender:admin-session-aktualisiert', verarbeiteAdminSessionAktualisierung);

  document.addEventListener('DOMContentLoaded', initialisiereAdminContent);
})(window, document);
