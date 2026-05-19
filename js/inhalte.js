/**
 * inhalte.js - Inhalts-Anzeige und Modal
 * Zustaendig: Artjom
 */

let moodFadeInterval = null;
let aktivesMoodFrame = null;
let quizInstanzZaehler = 0;
let quizZustaende = {};

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

  quizInstanzZaehler = 0;
  quizZustaende = {};

  modalElement.addEventListener('hidden.bs.modal', function() {
    stoppeMoodMusik(modalElement);
    quizZustaende = {};
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
    const fragen = window.AdventskalenderQuiz.quizBodyZuFragen(body);
    const ersteFrage = fragen[0];

    if (!ersteFrage) {
      throw new Error('Quiz-Daten unvollstaendig');
    }

    return {
      typ: 'quiz',
      titel: titel,
      frage: ersteFrage.question,
      antworten: ersteFrage.options,
      richtig: ersteFrage.correct,
      fragen: fragen.map(function(frage) {
        return {
          frage: frage.question,
          antworten: frage.options,
          richtig: frage.correct
        };
      })
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

function quizFrageHtml(quizId) {
  const zustand = quizZustaende[quizId];

  if (!zustand) {
    return '';
  }

  const frage = zustand.fragen[zustand.aktuelleFrage];
  const antwortButtons = frage.antworten.map(function(antwort, index) {
    return `
      <button
        class="btn btn-outline-warning quiz-antwort"
        data-index="${index}"
        data-quiz-answer
        onclick="quizAntwortPruefen(this)">
        <span class="quiz-antwort-text">${antwort}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="quiz-fortschritt">Frage ${zustand.aktuelleFrage + 1} von ${zustand.fragen.length}</div>
    <p class="quiz-frage">${frage.frage}</p>
    <div class="quiz-antworten">
      ${antwortButtons}
    </div>
    <div class="quiz-feedback" data-quiz-feedback style="display:none;"></div>
  `;
}

/**
 * Rendert ein Quiz mit Antwort-Buttons.
 * @param {Object} data
 * @returns {string}
 */
function quizRendern(data) {
  const quizId = `quiz-${quizInstanzZaehler}`;
  quizInstanzZaehler += 1;
  quizZustaende[quizId] = {
    fragen: Array.isArray(data.fragen) && data.fragen.length > 0
      ? data.fragen
      : [{ frage: data.frage, antworten: data.antworten, richtig: data.richtig }],
    aktuelleFrage: 0,
    antworten: []
  };

  return `
    <div class="quiz-card" data-quiz-id="${quizId}">
      <div class="quiz-badge">
        <span aria-hidden="true">?</span>
        Quiz
      </div>
      <div data-quiz-question-area>
        ${quizFrageHtml(quizId)}
      </div>
    </div>
  `;
}

/**
 * Prüft, ob die geklickte Antwort richtig ist, und zeigt Feedback.
 * @param {HTMLElement} button
 */
function quizAntwortPruefen(button) {
  const gewaehlt = parseInt(button.getAttribute('data-index'), 10);
  const karte = button.closest('[data-quiz-id]');
  const quizId = karte ? karte.getAttribute('data-quiz-id') : '';
  const zustand = quizZustaende[quizId];
  const frage = zustand ? zustand.fragen[zustand.aktuelleFrage] : null;
  const richtig = frage ? frage.richtig : NaN;
  const feedback = karte ? karte.querySelector('[data-quiz-feedback]') : null;
  const antwortButtons = karte ? karte.querySelectorAll('[data-quiz-answer]') : [];

  if (!zustand || !frage || zustand.antworten[zustand.aktuelleFrage] || !feedback || Number.isNaN(gewaehlt) || Number.isNaN(richtig)) {
    return;
  }

  antwortButtons.forEach(function(btn) {
    btn.disabled = true;
  });

  zustand.antworten[zustand.aktuelleFrage] = {
    frage: frage.frage,
    antworten: frage.antworten,
    gewaehlt: gewaehlt,
    richtig: richtig,
    istRichtig: gewaehlt === richtig
  };

  const istLetzteFrage = zustand.aktuelleFrage >= zustand.fragen.length - 1;
  const buttonText = istLetzteFrage ? 'Ergebnis anzeigen' : 'Weiter';

  if (gewaehlt === richtig) {
    button.classList.replace('btn-outline-warning', 'btn-success');
    feedback.classList.remove('ist-falsch');
    feedback.classList.add('ist-richtig');
    feedback.innerHTML = `
      <span class="quiz-feedback-text">Richtig! Super gemacht!</span>
      <button class="quiz-naechste-frage" type="button" onclick="quizNaechsteFrage(this)">${buttonText}</button>
    `;
  } else {
    button.classList.replace('btn-outline-warning', 'btn-danger');
    if (antwortButtons[richtig]) {
      antwortButtons[richtig].classList.replace('btn-outline-warning', 'btn-success');
    }
    feedback.classList.remove('ist-richtig');
    feedback.classList.add('ist-falsch');
    feedback.innerHTML = `
      <span class="quiz-feedback-text">Leider falsch. Die richtige Antwort ist markiert.</span>
      <button class="quiz-naechste-frage" type="button" onclick="quizNaechsteFrage(this)">${buttonText}</button>
    `;
  }

  feedback.style.display = 'flex';
}

function quizNaechsteFrage(button) {
  const karte = button.closest('[data-quiz-id]');
  const quizId = karte ? karte.getAttribute('data-quiz-id') : '';
  const zustand = quizZustaende[quizId];
  const frageBereich = karte ? karte.querySelector('[data-quiz-question-area]') : null;

  if (!zustand || !frageBereich) {
    return;
  }

  if (zustand.aktuelleFrage >= zustand.fragen.length - 1) {
    frageBereich.innerHTML = quizErgebnisHtml(zustand);
    return;
  }

  zustand.aktuelleFrage += 1;
  frageBereich.innerHTML = quizFrageHtml(quizId);
}

function quizErgebnisHtml(zustand) {
  const richtigeAntworten = zustand.antworten.filter(function(antwort) {
    return antwort && antwort.istRichtig;
  }).length;

  const eintraege = zustand.antworten.map(function(antwort, index) {
    const gewaehlteAntwort = antwort.antworten[antwort.gewaehlt] || 'Keine Antwort';
    const richtigeAntwort = antwort.antworten[antwort.richtig] || '-';

    return `
      <li class="quiz-ergebnis-eintrag ${antwort.istRichtig ? 'ist-richtig' : 'ist-falsch'}">
        <span class="quiz-ergebnis-status">${antwort.istRichtig ? '\u2713' : '\u00d7'}</span>
        <div>
          <strong>Frage ${index + 1}</strong>
          <span class="quiz-ergebnis-frage">${antwort.frage}</span>
          <small>Deine Antwort: ${gewaehlteAntwort}${antwort.istRichtig ? '' : ' | Richtig: ' + richtigeAntwort}</small>
        </div>
      </li>
    `;
  }).join('');

  return `
    <div class="quiz-ergebnis">
      <div class="quiz-ergebnis-kopf">
        <span>Ergebnis</span>
        <strong>${richtigeAntworten} von ${zustand.fragen.length} richtig</strong>
      </div>
      <ol class="quiz-ergebnis-liste">
        ${eintraege}
      </ol>
    </div>
  `;
}
