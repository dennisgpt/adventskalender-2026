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
      createButton: document.getElementById('admin-content-create'),
      form: document.getElementById('admin-content-form'),
      cancelButton: document.getElementById('admin-content-cancel'),
      submitButton: document.getElementById('admin-content-submit'),
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

    if (elemente.fehlerText && meldung) {
      elemente.fehlerText.textContent = meldung;
    }
  }

  function formatiereContentDatum(datumWert) {
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

  function renderAdminContentKarte(content) {
    const karte = document.createElement('article');
    karte.className = 'admin-content-card';
    karte.setAttribute('data-content-id', content.id);

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
    `;

    return karte;
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
        : 'Content erstellen';
    }

    if (elemente.formStatus) {
      elemente.formStatus.textContent = meldung || '';
    }
  }

  function resetContentForm() {
    const elemente = contentElemente();

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
      return Promise.resolve(null);
    }

    setzeAdminContentStatus('loading');

    return window.AdventskalenderApi.ladeAdminContent()
      .then(function(contentEintraege) {
        if (!Array.isArray(contentEintraege) || contentEintraege.length === 0) {
          setzeAdminContentStatus('leer');
          return contentEintraege;
        }

        renderAdminContentListe(contentEintraege);
        setzeAdminContentStatus('bereit');
        return contentEintraege;
      })
      .catch(function(error) {
        setzeAdminContentStatus(
          'fehler',
          window.AdventskalenderApi.fehlertextFuerApiFehler(
            error,
            'Content-Eintraege konnten nicht geladen werden.'
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
        setzeContentFormSichtbar(!formIstSichtbar);
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

    if (elemente.form) {
      elemente.form.addEventListener('input', aktualisiereContentFormValiditaet);
      elemente.form.addEventListener('change', aktualisiereContentFormValiditaet);
      elemente.form.addEventListener('submit', function(event) {
        event.preventDefault();

        if (!istContentFormValide()) {
          return;
        }

        setzeContentFormStatus('loading');

        window.AdventskalenderApi.erstelleAdminContent(baueContentPayload())
          .then(function() {
            resetContentForm();
            setzeContentFormSichtbar(false);
            if (window.AdminLoginUi && typeof window.AdminLoginUi.zeigeStatus === 'function') {
              window.AdminLoginUi.zeigeStatus('Content wurde erstellt.', 'erfolg');
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
      setzeAdminContentStatus('leer');
    }
  }

  window.AdminContentUi = {
    aktualisiereSichtbarkeit: aktualisiereAdminContentSichtbarkeit,
    ladeContent: ladeAdminContentListe,
    renderContent: renderAdminContentListe,
    bauePayload: baueContentPayload
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminContentSichtbarkeit();
    setzeAdminContentStatus('leer');
  });
  window.addEventListener('adventskalender:admin-session-aktualisiert', verarbeiteAdminSessionAktualisierung);

  document.addEventListener('DOMContentLoaded', initialisiereAdminContent);
})(window, document);
