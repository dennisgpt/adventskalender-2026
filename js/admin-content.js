(function(window, document) {
  'use strict';

  let bearbeiteterContentId = null;
  let geladeneContentEintraege = [];
  let aktiverContentTypFilter = 'all';
  let zuLoeschenderContent = null;
  let zuLoeschenderButton = null;
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
      filter: document.getElementById('admin-content-filter'),
      filterFeld: document.getElementById('admin-content-type-filter'),
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
      mediaUrlFeld: document.getElementById('admin-content-media-url'),
      quizFelder: document.getElementById('admin-content-quiz-felder'),
      quizQuestionFeld: document.getElementById('admin-content-quiz-question'),
      quizOptions: [
        document.getElementById('admin-content-quiz-option-0'),
        document.getElementById('admin-content-quiz-option-1'),
        document.getElementById('admin-content-quiz-option-2'),
        document.getElementById('admin-content-quiz-option-3')
      ],
      quizCorrectFeld: document.getElementById('admin-content-quiz-correct'),
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
    const filterFeld = contentElemente().filterFeld;

    if (filterFeld) {
      filterFeld.value = aktiverContentTypFilter;
    }
  }

  function contentEintraegeNachFilter() {
    if (aktiverContentTypFilter === 'all') {
      return geladeneContentEintraege;
    }

    return geladeneContentEintraege.filter(function(content) {
      return content.type === aktiverContentTypFilter;
    });
  }

  function aktualisiereContentFilterStatus(anzahl) {
    const filterStatus = contentElemente().filterStatus;
    const typText = aktiverContentTypFilter === 'all'
      ? 'alle Typen'
      : contentTypLabel(aktiverContentTypFilter);
    const eintragText = anzahl === 1 ? 'Eintrag' : 'Einträge';

    if (filterStatus) {
      filterStatus.textContent = `${anzahl} ${eintragText} für ${typText}`;
    }
  }

  function setzeContentLeerFehler(istFehler) {
    const leer = contentElemente().leer;

    if (leer) {
      leer.classList.toggle('admin-content-leer-fehler', istFehler);
    }
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
      </div>
      <p class="admin-content-body">${contentBodyVorschau(content)}</p>
      <dl class="admin-content-details">
        <div>
          <dt>ID</dt>
          <dd>#${content.id}</dd>
        </div>
        <div>
          <dt>Media-URL</dt>
          <dd>${content.media_url || '-'}</dd>
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

    const bearbeitenButton = karte.querySelector('[data-admin-content-edit]');
    const aktivButton = karte.querySelector('[data-admin-content-toggle-active]');
    const loeschButton = karte.querySelector('[data-admin-content-delete]');

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
    }

    synchronisiereContentFilterFeld();
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
      setzeAdminContentStatus('leer', 'Keine Content-Einträge für diesen Typ gefunden.');
      return;
    }

    setzeContentLeerFehler(false);
    setzeAdminContentStatus('bereit');
  }

  function setzeAdminContentListe(contentEintraege) {
    geladeneContentEintraege = Array.isArray(contentEintraege) ? contentEintraege : [];
    synchronisiereContentFilterFeld();
    renderGefilterteAdminContentListe();
    return geladeneContentEintraege;
  }

  function waehleContentTypFilter(typ) {
    aktiverContentTypFilter = istBekannterContentTyp(typ) ? typ : 'all';
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
      ? '<i class="bi bi-x-lg"></i> Formular schließen'
      : '<i class="bi bi-plus-lg"></i> Content erstellen';

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

  function baueQuizBody(elemente) {
    return JSON.stringify({
      question: feldWert(elemente.quizQuestionFeld),
      options: elemente.quizOptions.map(feldWert),
      correct: Number.parseInt(elemente.quizCorrectFeld.value, 10)
    });
  }

  function baueContentPayload() {
    const elemente = contentElemente();
    const typ = elemente.typeFeld ? elemente.typeFeld.value : 'text';
    const mediaUrl = feldWert(elemente.mediaUrlFeld);

    return {
      type: typ,
      body: typ === 'quiz' ? baueQuizBody(elemente) : feldWert(elemente.bodyFeld) || null,
      media_url: mediaUrl || null
    };
  }

  function fuelleQuizFelder(elemente, content) {
    let quizDaten = {
      question: '',
      options: ['', '', '', ''],
      correct: 0
    };

    if (content.body) {
      try {
        quizDaten = {
          ...quizDaten,
          ...JSON.parse(content.body)
        };
      } catch (error) {
        quizDaten.question = content.body;
      }
    }

    if (elemente.quizQuestionFeld) {
      elemente.quizQuestionFeld.value = quizDaten.question || '';
    }

    elemente.quizOptions.forEach(function(optionFeld, index) {
      if (optionFeld) {
        optionFeld.value = quizDaten.options && quizDaten.options[index] ? quizDaten.options[index] : '';
      }
    });

    if (elemente.quizCorrectFeld) {
      elemente.quizCorrectFeld.value = String(Number.isInteger(quizDaten.correct) ? quizDaten.correct : 0);
    }
  }

  function fuelleContentForm(content) {
    const elemente = contentElemente();

    if (!elemente.form || !elemente.typeFeld || !elemente.bodyFeld || !elemente.mediaUrlFeld) {
      return;
    }

    bearbeiteterContentId = content.id;
    elemente.form.reset();
    elemente.typeFeld.value = content.type || 'text';
    elemente.mediaUrlFeld.value = content.media_url || '';

    if (content.type === 'quiz') {
      elemente.bodyFeld.value = '';
      fuelleQuizFelder(elemente, content);
    } else {
      elemente.bodyFeld.value = content.body || '';
    }

    aktualisiereContentFormTyp();
    setzeContentFormStatus('', '');
    setzeContentFormSichtbar(true);
  }

  function istContentFormValide() {
    const elemente = contentElemente();

    if (!elemente.typeFeld || !elemente.bodyFeld || !elemente.mediaUrlFeld) {
      return false;
    }

    if (elemente.typeFeld.value === 'quiz') {
      return Boolean(feldWert(elemente.quizQuestionFeld))
        && elemente.quizOptions.every(function(optionFeld) {
          return Boolean(feldWert(optionFeld));
        });
    }

    if (elemente.typeFeld.value === 'text') {
      return Boolean(feldWert(elemente.bodyFeld));
    }

    return Boolean(feldWert(elemente.mediaUrlFeld));
  }

  function aktualisiereContentFormValiditaet() {
    const submitButton = contentElemente().submitButton;

    if (submitButton) {
      submitButton.disabled = !istContentFormValide();
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

    aktualisiereContentFormTyp();
    setzeContentFormStatus('', '');
  }

  function aktualisiereContentFormTyp() {
    const elemente = contentElemente();

    if (!elemente.typeFeld || !elemente.bodyFeld || !elemente.quizFelder) {
      return;
    }

    const istQuiz = elemente.typeFeld.value === 'quiz';

    elemente.quizFelder.classList.toggle('d-none', !istQuiz);
    elemente.bodyFeld.disabled = istQuiz;
    elemente.bodyFeld.placeholder = istQuiz
      ? 'Quiz-Daten werden aus den Quiz-Feldern vorbereitet'
      : 'Text, Link oder kurze Beschreibung';
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

    return window.AdventskalenderApi.ladeAdminContent()
      .then(function(contentEintraege) {
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

    if (elemente.filterFeld) {
      elemente.filterFeld.addEventListener('change', function(event) {
        waehleContentTypFilter(event.target.value);
      });
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

        if (!istContentFormValide()) {
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
