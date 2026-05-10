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
    aktualisiereAdminContentSichtbarkeit();

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
    renderContent: renderAdminContentListe
  };

  window.addEventListener('adventskalender:admin-session-verloren', function() {
    aktualisiereAdminContentSichtbarkeit();
    setzeAdminContentStatus('leer');
  });
  window.addEventListener('adventskalender:admin-session-aktualisiert', verarbeiteAdminSessionAktualisierung);

  document.addEventListener('DOMContentLoaded', initialisiereAdminContent);
})(window, document);
