/**
 * inhalte.js - Inhalts-Anzeige und Modal
 * Zustaendig: Artjom
 */

let moodFadeInterval = null;
let aktivesMoodFrame = null;

// ============================================================
// MODAL-STATES
// ============================================================

function templateHtml(templateId) {
  const template = document.getElementById(templateId);
  return template ? template.innerHTML : '';
}

function modalStateAnzeigen(nummer, templateId, meldung) {
  const modalElement = document.getElementById('tuerchen-modal');
  const modalTitel = document.getElementById('tuerchen-modal-titel');
  const modalInhalt = document.getElementById('tuerchen-modal-inhalt');

  modalTitel.textContent = 'Tuerchen ' + nummer;
  modalInhalt.innerHTML = templateHtml(templateId);

  if (meldung) {
    const text = modalInhalt.querySelector('.modal-state-text');
    if (text) {
      text.textContent = meldung;
    }
  }

  bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

// ============================================================
// HAUPT-FUNKTION: Inhalt anzeigen
// ============================================================

/**
 * Oeffnet das Modal und zeigt den passenden Inhalt fuer ein Tuerchen.
 * Wird aus kalender.js aufgerufen.
 * @param {number} nummer
 */
function inhaltAnzeigen(nummer) {
  const modalElement = document.getElementById('tuerchen-modal');
  const modalTitel = document.getElementById('tuerchen-modal-titel');
  const modalInhalt = document.getElementById('tuerchen-modal-inhalt');

  modalElement.addEventListener('hidden.bs.modal', function() {
    stoppeMoodMusik(modalElement);
  }, { once: true });

  modalStateAnzeigen(nummer, 'modal-state-loading-template');

  window.AdventskalenderApi.ladeTuerchenInhalt(nummer)
    .then(function(apiAntwort) {
      const data = backendAntwortNormalisieren(nummer, apiAntwort);

      if (!data) {
        modalTitel.textContent = 'Tuerchen ' + nummer;
        modalInhalt.innerHTML = templateHtml('modal-state-empty-template');
        return;
      }

      modalTitel.textContent = data.titel;
      modalInhalt.innerHTML = inhaltRendern(data);

      if (data.typ === 'mood') {
        setTimeout(function() {
          starteMoodMusik(modalElement);
        }, 350);
      }
    })
    .catch(function(error) {
      const meldung = error && error.message ? error.message : null;
      modalStateAnzeigen(nummer, 'modal-state-error-template', meldung);
    });
}

// ============================================================
// INHALTS-TYPEN RENDERN
// ============================================================

function backendAntwortNormalisieren(nummer, apiAntwort) {
  if (!apiAntwort || !Array.isArray(apiAntwort.contents) || apiAntwort.contents.length === 0) {
    return null;
  }

  const items = apiAntwort.contents
    .map(function(item) {
      return backendItemNormalisieren(nummer, item);
    })
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    return items[0];
  }

  return {
    typ: 'liste',
    titel: 'Tuerchen ' + nummer,
    items: items
  };
}

function backendItemNormalisieren(nummer, item) {
  if (!item) return null;

  const titel = item.title || item.titel || 'Tuerchen ' + nummer;

  switch (item.type) {
    case 'text':
      return {
        typ: 'funfact',
        titel: titel,
        inhalt: item.body || ''
      };

    case 'image':
      return {
        typ: 'bild',
        titel: titel,
        bild: item.media_url,
        text: item.body || ''
      };

    case 'video':
      return {
        typ: 'video',
        titel: titel,
        videoUrl: item.media_url || item.body || ''
      };

    case 'game':
      return {
        typ: 'karte',
        titel: titel,
        nachricht: item.body || 'Dieses Spiel ist vorbereitet.'
      };

    case 'quiz':
      return quizItemNormalisieren(titel, item.body);

    default:
      return {
        typ: 'karte',
        titel: titel,
        nachricht: item.body || 'Dieser Inhaltstyp wird noch vorbereitet.'
      };
  }
}

function quizItemNormalisieren(titel, body) {
  try {
    const quiz = typeof body === 'string' ? JSON.parse(body) : body;
    const antworten = Array.isArray(quiz.options) ? quiz.options : [];
    const richtig = Number.parseInt(quiz.correct, 10);

    if (!quiz.question || antworten.length === 0 || Number.isNaN(richtig)) {
      throw new Error('Quiz-Daten unvollstaendig');
    }

    return {
      typ: 'quiz',
      titel: titel,
      frage: quiz.question,
      antworten: antworten,
      richtig: richtig
    };
  } catch (error) {
    return {
      typ: 'karte',
      titel: titel,
      nachricht: 'Dieses Quiz konnte nicht gelesen werden.'
    };
  }
}

/**
 * Erzeugt den HTML-Code fuer den jeweiligen Inhalts-Typ.
 * @param {Object} data
 * @returns {string}
 */
function inhaltRendern(data) {
  switch (data.typ) {
    case 'funfact':
      return `
        <div class="text-center p-3">
          <div style="font-size: 4rem;">&#128161;</div>
          <p class="lead mt-3">${data.inhalt}</p>
        </div>
      `;

    case 'video':
      return `
        <div class="ratio ratio-16x9">
          <iframe
            src="${data.videoUrl}"
            title="${data.titel}"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
          </iframe>
        </div>
      `;

    case 'bild':
      return `
        <div class="text-center p-2 p-md-3">
          <img
            src="${data.bild}"
            alt="${data.titel}"
            class="img-fluid rounded-4 mb-3"
            style="max-height: 420px; width: 100%; object-fit: cover; box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.14);">
          ${data.text ? `<p class="lead mb-0">${data.text}</p>` : ''}
        </div>
      `;

    case 'quiz':
      return quizRendern(data);

    case 'karte':
      return `
        <div class="text-center p-4" style="background: linear-gradient(135deg, #16213e, #0f3460); border-radius: 12px;">
          <div style="font-size: 3rem;">&#127876;</div>
          <p class="lead mt-3">${data.nachricht}</p>
          <div style="font-size: 2rem;">&#11088;&#127876;&#127873;</div>
        </div>
      `;

    case 'mood':
      return `
        <div class="text-center p-2 p-md-3">
          <img
            src="${data.bild}"
            alt="Thaddäus sitzt am Kamin und trinkt Tee"
            class="img-fluid rounded-4 mb-3"
            style="max-height: 420px; width: 100%; object-fit: cover; box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.14);">
          <p class="lead mb-0">${data.text}</p>
          <iframe
            class="mood-autoplay-audio"
            title="Jazz Hintergrundmusik"
            data-src="${data.musikEmbedUrl}"
            style="width:0; height:0; border:0; position:absolute; opacity:0; pointer-events:none;"
            allow="autoplay; encrypted-media">
          </iframe>
        </div>
      `;

    case 'liste':
      return `
        <div class="d-grid gap-3">
          ${data.items.map(function(item) {
            return `<section class="tuerchen-content-item">${inhaltRendern(item)}</section>`;
          }).join('')}
        </div>
      `;

    default:
      return '<p>Unbekannter Inhalts-Typ.</p>';
  }
}

function starteMoodMusik(modalElement) {
  const frame = modalElement.querySelector('.mood-autoplay-audio');
  if (!frame || frame.src) return;

  const basisUrl = frame.getAttribute('data-src');
  if (!basisUrl) return;

  const videoId = holeYouTubeEmbedId(basisUrl);
  const trennzeichen = basisUrl.includes('?') ? '&' : '?';
  const loopTeil = videoId ? '&loop=1&playlist=' + videoId : '';
  frame.src = basisUrl + trennzeichen + 'autoplay=1&controls=0&rel=0&enablejsapi=1' + loopTeil;

  frame.addEventListener('load', function() {
    starteLautstaerkeFade(frame);
  }, { once: true });
}

function stoppeMoodMusik(modalElement) {
  const frame = modalElement.querySelector('.mood-autoplay-audio');
  stoppeLautstaerkeFade();
  if (frame) {
    frame.src = '';
  }
}

function holeYouTubeEmbedId(url) {
  const treffer = url.match(/embed\/([^?&]+)/);
  return treffer ? treffer[1] : '';
}

function sendeYouTubeBefehl(frame, funktion, args) {
  if (!frame || !frame.contentWindow) return;
  frame.contentWindow.postMessage(JSON.stringify({
    event: 'command',
    func: funktion,
    args: args || []
  }), '*');
}

function starteLautstaerkeFade(frame) {
  stoppeLautstaerkeFade();
  aktivesMoodFrame = frame;

  let lautstaerke = 8;
  const ziel = 48;
  const schritt = 3;

  // Initial sehr leise starten.
  sendeYouTubeBefehl(frame, 'unMute');
  sendeYouTubeBefehl(frame, 'setVolume', [lautstaerke]);
  sendeYouTubeBefehl(frame, 'playVideo');

  moodFadeInterval = setInterval(function() {
    if (!aktivesMoodFrame) {
      stoppeLautstaerkeFade();
      return;
    }

    lautstaerke = Math.min(lautstaerke + schritt, ziel);
    sendeYouTubeBefehl(aktivesMoodFrame, 'setVolume', [lautstaerke]);
    sendeYouTubeBefehl(aktivesMoodFrame, 'playVideo');

    if (lautstaerke >= ziel) {
      stoppeLautstaerkeFade();
    }
  }, 420);
}

function stoppeLautstaerkeFade() {
  if (moodFadeInterval) {
    clearInterval(moodFadeInterval);
    moodFadeInterval = null;
  }
  aktivesMoodFrame = null;
}

// ============================================================
// QUIZ-LOGIK
// ============================================================

/**
 * Rendert ein Quiz mit Antwort-Buttons.
 * @param {Object} data
 * @returns {string}
 */
function quizRendern(data) {
  const antwortButtons = data.antworten.map(function(antwort, index) {
    return `
      <button
        class="btn btn-outline-warning quiz-antwort"
        data-index="${index}"
        data-richtig="${data.richtig}"
        onclick="quizAntwortPruefen(this)">
        <span class="quiz-antwort-text">${antwort}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="quiz-card">
      <div class="quiz-badge">
        <span aria-hidden="true">?</span>
        Quiz
      </div>
      <p class="quiz-frage">${data.frage}</p>
      <div id="quiz-antworten" class="quiz-antworten">
        ${antwortButtons}
      </div>
      <div id="quiz-feedback" class="quiz-feedback" style="display:none;"></div>
    </div>
  `;
}

/**
 * Prüft, ob die geklickte Antwort richtig ist, und zeigt Feedback.
 * @param {HTMLElement} button
 */
function quizAntwortPruefen(button) {
  const gewaehlt = parseInt(button.getAttribute('data-index'), 10);
  const richtig = parseInt(button.getAttribute('data-richtig'), 10);
  const feedback = document.getElementById('quiz-feedback');
  const antwortButtons = document.querySelectorAll('.quiz-antwort');

  if (!feedback || Number.isNaN(gewaehlt) || Number.isNaN(richtig)) {
    return;
  }

  antwortButtons.forEach(function(btn) {
    btn.disabled = true;
  });

  if (gewaehlt === richtig) {
    button.classList.replace('btn-outline-warning', 'btn-success');
    feedback.classList.remove('ist-falsch');
    feedback.classList.add('ist-richtig');
    feedback.textContent = 'Richtig! Super gemacht!';
  } else {
    button.classList.replace('btn-outline-warning', 'btn-danger');
    if (antwortButtons[richtig]) {
      antwortButtons[richtig].classList.replace('btn-outline-warning', 'btn-success');
    }
    feedback.classList.remove('ist-richtig');
    feedback.classList.add('ist-falsch');
    feedback.textContent = 'Leider falsch. Versuch es nächstes Mal!';
  }

  feedback.style.display = 'block';
}
