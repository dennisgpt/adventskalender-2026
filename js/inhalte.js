/**
 * inhalte.js - Inhalts-Anzeige und Modal
 * Zustaendig: Artjom
 */

let moodFadeInterval = null;
let aktivesMoodFrame = null;
let quizInstanzZaehler = 0;
let quizZustaende = {};
let aktivesSpiel = null;

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
    stoppeAktivesSpiel();
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
      fokussiereErsteQuizAntwort(modalInhalt);

      if (data.typ === 'mood') {
        setTimeout(function() {
          starteMoodMusik(modalElement);
        }, 350);
      }

      if (data.typ === 'game') {
        setTimeout(function() {
          starteSpiel(data.spielId);
        }, 150);
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
        typ: 'game',
        titel: titel,
        spielId: item.body || ''
      };

    case 'quiz':
      return quizItemNormalisieren(titel, item.body, item.media_url);

    default:
      return {
        typ: 'karte',
        titel: titel,
        nachricht: item.body || 'Dieser Inhaltstyp wird noch vorbereitet.'
      };
  }
}

function quizItemNormalisieren(titel, body, mediaUrl) {
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
      bild: mediaUrl || '',
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

    case 'game': {
      const istSchneeball = data.spielId === 'tuerchen7-schneeball';
      return `
        <div id="ak-spiel-wrapper" ${istSchneeball ? 'role="group" aria-describedby="ak-spiel-status" tabindex="-1"' : ''} style="
          position: relative; width: 100%;
          border-radius: 12px; overflow: hidden;
          background: #0a1628;
          user-select: none; touch-action: none;
        ">
          <canvas id="ak-spiel-canvas" ${istSchneeball ? 'aria-hidden="true"' : ''} style="display: block; width: 100%; height: 420px;"></canvas>

          ${istSchneeball ? '<p class="visually-hidden" id="ak-spiel-status" role="status" aria-live="polite" aria-atomic="true"></p>' : ''}

          ${istSchneeball ? `
          <div style="position: absolute; top: 12px; left: 0; right: 0;
            display: flex; justify-content: space-between; padding: 0 14px; pointer-events: none;">
            <span id="ak-hud-punkte" style="background: rgba(0,0,0,0.55); color: #fff;
              padding: 5px 14px; border-radius: 20px; font-size: 0.95rem; font-weight: 700;
              backdrop-filter: blur(6px);">⚪ 0 / 8</span>
            <span id="ak-hud-kohle" style="background: rgba(0,0,0,0.55); color: #fff;
              padding: 5px 14px; border-radius: 20px; font-size: 0.95rem; font-weight: 700;
              backdrop-filter: blur(6px);">🪨 0 / 3</span>
          </div>
          <div style="position: absolute; bottom: 14px; left: 0; right: 0;
            display: flex; justify-content: space-between; padding: 0 18px; pointer-events: none;">
            <span id="ak-btn-links" class="ak-spiel-richtung" aria-hidden="true" style="pointer-events: all;
              background: rgba(0,0,0,0.5); color: #fff;
              border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
              width: 54px; height: 54px; display: grid; place-items: center;
              font-size: 1.4rem; cursor: pointer; backdrop-filter: blur(4px);">\u25c4</span>
            <span id="ak-btn-rechts" class="ak-spiel-richtung" aria-hidden="true" style="pointer-events: all;
              background: rgba(0,0,0,0.5); color: #fff;
              border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
              width: 54px; height: 54px; display: grid; place-items: center;
              font-size: 1.4rem; cursor: pointer; backdrop-filter: blur(4px);">\u25ba</span>
          </div>
          ` : ''}

          <div id="ak-spiel-overlay" style="display: none; position: absolute; inset: 0;
            background: rgba(5,12,35,0.82); backdrop-filter: blur(6px);
            flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 24px;">
            <div class="ak-overlay-titel" style="font-size: 2.6rem; margin-bottom: 8px;"></div>
            <div class="ak-overlay-text" style="color: rgba(255,255,255,0.75);
              font-size: 1.05rem; margin-bottom: 28px;"></div>
            <button id="ak-btn-neustart" style="
              background: linear-gradient(135deg, #c0392b, #e74c3c); color: #fff;
              border: none; border-radius: 30px; padding: 12px 32px;
              font-size: 1rem; font-weight: 700; cursor: pointer;
              box-shadow: 0 4px 18px rgba(200,50,50,0.45);">🔄 Nochmal spielen</button>
          </div>
        </div>
      `;
    }

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
  const frageId = `${quizId}-frage-${zustand.aktuelleFrage}`;
  const antwortButtons = frage.antworten.map(function(antwort, index) {
    return `
      <button
        class="btn btn-outline-warning quiz-antwort"
        data-index="${index}"
        data-quiz-answer
        aria-describedby="${frageId}"
        onkeydown="quizAntwortNavigation(event, this)"
        onclick="quizAntwortPruefen(this)">
        <span class="quiz-antwort-text">${antwort}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="quiz-fortschritt" aria-live="polite">Frage ${zustand.aktuelleFrage + 1} von ${zustand.fragen.length}</div>
    <p class="quiz-frage" id="${frageId}" data-quiz-question-title tabindex="-1">${frage.frage}</p>
    <div class="quiz-antworten">
      ${antwortButtons}
    </div>
    <div class="quiz-feedback" data-quiz-feedback role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
  `;
}

/**
 * Rendert ein Quiz mit Antwort-Buttons.
 * @param {Object} data
 * @returns {string}
 */
function quizRendern(data) {
  const quizId = `quiz-${quizInstanzZaehler}`;
  const reduzierteBewegung = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hatIntroBild = Boolean(data.bild) && !reduzierteBewegung;
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
      ${hatIntroBild ? `
        <div class="quiz-intro" data-quiz-intro onanimationend="quizIntroBeendet(this)">
          <div class="quiz-intro-glow" aria-hidden="true"></div>
          <img src="${data.bild}" alt="${data.titel}" class="quiz-intro-bild">
        </div>
      ` : ''}
      <div class="quiz-fragenbereich ${hatIntroBild ? 'ist-versteckt' : ''}" data-quiz-question-area>
        ${quizFrageHtml(quizId)}
      </div>
    </div>
  `;
}

function quizIntroBeendet(intro) {
  const karte = intro ? intro.closest('[data-quiz-id]') : null;
  const frageBereich = karte ? karte.querySelector('[data-quiz-question-area]') : null;

  if (frageBereich) {
    frageBereich.classList.remove('ist-versteckt');
    frageBereich.classList.add('ist-sichtbar');
    fokussiereErsteQuizAntwort(frageBereich);
  }

  if (intro) {
    intro.remove();
  }
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
  fokussiereQuizElement(feedback.querySelector('.quiz-naechste-frage'));
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
    fokussiereQuizElement(frageBereich.querySelector('[data-quiz-result]'));
    return;
  }

  zustand.aktuelleFrage += 1;
  frageBereich.innerHTML = quizFrageHtml(quizId);
  fokussiereErsteQuizAntwort(frageBereich);
}

function fokussiereQuizElement(element) {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

function fokussiereErsteQuizAntwort(container) {
  if (!container) {
    return;
  }

  const frageBereiche = container.matches('[data-quiz-question-area]')
    ? [container]
    : Array.from(container.querySelectorAll('[data-quiz-question-area]'));
  const sichtbarerBereich = frageBereiche.find(function(bereich) {
    return !bereich.classList.contains('ist-versteckt');
  });

  fokussiereQuizElement(
    sichtbarerBereich && sichtbarerBereich.querySelector('[data-quiz-answer]:not(:disabled)')
  );
}

function quizAntwortNavigation(event, button) {
  const schritt = {
    ArrowLeft: -1,
    ArrowUp: -1,
    ArrowRight: 1,
    ArrowDown: 1
  }[event.key];
  const antworten = button && button.parentElement
    ? Array.from(button.parentElement.querySelectorAll('[data-quiz-answer]:not(:disabled)'))
    : [];
  const index = antworten.indexOf(button);

  if (!schritt || index < 0 || antworten.length < 2) {
    return;
  }

  event.preventDefault();
  antworten[(index + schritt + antworten.length) % antworten.length].focus();
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
        <span class="quiz-ergebnis-status" aria-hidden="true">${antwort.istRichtig ? '\u2713' : '\u00d7'}</span>
        <div>
          <strong>Frage ${index + 1}</strong>
          <span class="quiz-ergebnis-frage">${antwort.frage}</span>
          <small>Deine Antwort: ${gewaehlteAntwort}${antwort.istRichtig ? '' : ' | Richtig: ' + richtigeAntwort}</small>
        </div>
      </li>
    `;
  }).join('');

  return `
    <div class="quiz-ergebnis" data-quiz-result tabindex="-1" role="status" aria-live="polite" aria-atomic="true">
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


// ============================================================
// SPIEL: SCHNEEBALL-FANG (Tuerchen 7)
// ============================================================

function stoppeAktivesSpiel() {
  if (aktivesSpiel && typeof aktivesSpiel.stop === 'function') {
    aktivesSpiel.stop();
  }
  aktivesSpiel = null;
}

function starteSpiel(spielId) {
  stoppeAktivesSpiel();
  if (spielId === 'tuerchen7-schneeball') {
    starteSchneeball();
  } else if (spielId === 'tuerchen-huetchenspiel') {
    starteHuetchenspiel();
  }
}

function starteSchneeball() {
  const canvas = document.getElementById('ak-spiel-canvas');
  const spielWrapper = document.getElementById('ak-spiel-wrapper');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const breite = canvas.clientWidth || 600;
  const hoehe = 420;
  canvas.width = breite;
  canvas.height = hoehe;

  const hintergrund = new Image();
  hintergrund.src = 'img/thws-hof-winter.jpg';

  const z = { laeuft: true, punkte: 0, kohle: 0, frameId: null };

  const sp = { x: breite / 2, y: hoehe - 56, speed: 5, links: false, rechts: false };

  const objekte = [];
  let letzterSpawn = 0;
  const SPAWN_MS = 1100;

  const TYPEN = [
    { typ: 'schneeball', w: 4 },
    { typ: 'zuckerstange', w: 3 },
    { typ: 'kohle', w: 2 }
  ];

  function zufallTyp() {
    const gesamt = TYPEN.reduce(function(s, t) { return s + t.w; }, 0);
    let r = Math.random() * gesamt;
    for (let i = 0; i < TYPEN.length; i++) {
      r -= TYPEN[i].w;
      if (r <= 0) return TYPEN[i].typ;
    }
    return 'schneeball';
  }

  function spawne() {
    objekte.push({
      typ: zufallTyp(),
      x: 28 + Math.random() * (breite - 56),
      y: -24,
      vy: 2.2 + Math.random() * 1.6,
      rot: 0,
      rotV: (Math.random() - 0.5) * 0.08
    });
  }

  function zeichneSchneeball(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowColor = 'rgba(180,220,255,0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#dff0fb';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,240,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-4, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }

  function zeichneZuckerstange(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(0, -7);
    ctx.arc(0, -7, 6, Math.PI, 0, false);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#e63946';
    for (let i = -6; i <= 12; i += 6) {
      ctx.beginPath();
      ctx.moveTo(-3, i);
      ctx.lineTo(3, i + 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function zeichneKohle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 10, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#181824';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-4, -3, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(110,110,150,0.45)';
    ctx.fill();
    ctx.restore();
  }

  function zeichneSpieler() {
    const x = sp.x;
    const y = sp.y;
    ctx.save();
    ctx.translate(x, y);

    // --- Grüner Weidenkorb (Option A) ---
    const kW = 52; // halbe Breite
    const kT = 32; // Tiefe
    const rimH = 13; // Rand-Höhe

    // Korb-Körper (geflochtenes Grün)
    ctx.beginPath();
    ctx.moveTo(-kW, 0);
    ctx.bezierCurveTo(-kW, kT + 8, -kW * 0.3, kT + 14, 0, kT + 14);
    ctx.bezierCurveTo(kW * 0.3, kT + 14, kW, kT + 8, kW, 0);
    ctx.closePath();
    ctx.fillStyle = '#2A6B2A';
    ctx.fill();

    // Flechtmuster vertikal
    ctx.strokeStyle = '#1E5020';
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      const lx = i * (kW / 3.5);
      ctx.beginPath();
      ctx.moveTo(lx, 1);
      ctx.lineTo(lx * 0.6, kT + 12);
      ctx.stroke();
    }
    // Flechtmuster horizontal
    ctx.lineWidth = 1.2;
    for (let row = 0; row < 4; row++) {
      const t = (row + 1) / 5;
      const ry = kT * t + t * 5;
      const rw = kW * (1 - t * 0.25);
      ctx.beginPath();
      ctx.ellipse(0, ry, rw, rimH * 0.35, 0, 0, Math.PI);
      ctx.stroke();
    }

    // Heller Naturholz-Rand oben
    ctx.beginPath();
    ctx.ellipse(0, 0, kW, rimH, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#D4B87A';
    ctx.fill();
    ctx.strokeStyle = '#B89A50';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Innere Ellipse (Tiefe andeuten)
    ctx.beginPath();
    ctx.ellipse(0, -3, kW - 8, rimH - 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#C4A860';
    ctx.fill();
    ctx.strokeStyle = '#B89A50';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Schleife vorne (Naturseil)
    ctx.save();
    ctx.translate(0, rimH - 2);
    // linke Schlaufe
    ctx.beginPath();
    ctx.ellipse(-11, 5, 10, 5, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#D4B87A';
    ctx.strokeStyle = '#A08030';
    ctx.lineWidth = 1;
    ctx.fill(); ctx.stroke();
    // rechte Schlaufe
    ctx.beginPath();
    ctx.ellipse(11, 5, 10, 5, 0.45, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Knoten
    ctx.beginPath();
    ctx.arc(0, 5, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#C4A860';
    ctx.fill(); ctx.stroke();

    // Weihnachtsbaum-Anhänger
    ctx.fillStyle = '#D4B87A';
    ctx.strokeStyle = '#A08030';
    ctx.lineWidth = 0.8;
    ctx.fillRect(-3, 10, 5, 7);
    ctx.strokeRect(-3, 10, 5, 7);
    // Baum
    ctx.fillStyle = '#2A7A2A';
    ctx.strokeStyle = '#1A5A1A';
    const baumX = 0, baumY = 17;
    [[0,0,7,8],[0,5,6,7],[0,10,5,6]].forEach(([dx,dy,hw,bh]) => {
      ctx.beginPath();
      ctx.moveTo(baumX+dx, baumY+dy);
      ctx.lineTo(baumX-hw, baumY+dy+bh);
      ctx.lineTo(baumX+hw, baumY+dy+bh);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
    // Stamm
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(-2, baumY+18, 4, 4);
    ctx.restore();

    ctx.restore();
  }

  function aktualisiereHUD() {
    const elP = document.getElementById('ak-hud-punkte');
    const elK = document.getElementById('ak-hud-kohle');
    const status = document.getElementById('ak-spiel-status');
    if (elP) elP.textContent = '⚪ ' + z.punkte + ' / 8';
    if (elK) elK.textContent = '🪨 ' + z.kohle + ' / 3';
    if (status) status.textContent = z.punkte + ' von 8 Überraschungen und ' + z.kohle + ' von 3 Kohlen gefangen.';
  }

  function setzeRichtungAktiv(richtung, aktiv) {
    const button = document.getElementById(richtung === 'links' ? 'ak-btn-links' : 'ak-btn-rechts');
    sp[richtung] = aktiv;
    if (button) button.classList.toggle('ist-aktiv', aktiv);
  }

  function stoppeBewegung() {
    setzeRichtungAktiv('links', false);
    setzeRichtungAktiv('rechts', false);
  }

  function fokussiereSpiel() {
    if (spielWrapper && typeof spielWrapper.focus === 'function') {
      spielWrapper.focus();
    }
  }

  function trifftKorb(o) {
    return o.x > sp.x - 50 && o.x < sp.x + 50 &&
           o.y > sp.y - 14  && o.y < sp.y + 46;
  }

  function zeigeOverlay(gewonnen) {
    const overlay = document.getElementById('ak-spiel-overlay');
    const btnNeustart = document.getElementById('ak-btn-neustart');
    if (!overlay) return;
    stoppeBewegung();
    overlay.style.display = 'flex';
    overlay.querySelector('.ak-overlay-titel').textContent =
      gewonnen ? '🎉 Gewonnen!' : '💨 Verloren!';
    overlay.querySelector('.ak-overlay-text').textContent = gewonnen
      ? 'Du hast 8 \u00dcberraschungen gefangen!'
      : 'Zu viel Kohle erwischt \u2013 das war nichts!';
    if (btnNeustart) btnNeustart.focus();
  }

  function schritt(ts) {
    if (!z.laeuft) return;

    if (hintergrund.complete && hintergrund.naturalWidth > 0) {
      ctx.drawImage(hintergrund, 0, 0, breite, hoehe);
      ctx.fillStyle = 'rgba(5,15,40,0.28)';
      ctx.fillRect(0, 0, breite, hoehe);
    } else {
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, breite, hoehe);
    }

    if (sp.links)  sp.x = Math.max(28, sp.x - sp.speed);
    if (sp.rechts) sp.x = Math.min(breite - 28, sp.x + sp.speed);

    if (ts - letzterSpawn > SPAWN_MS) {
      spawne();
      letzterSpawn = ts;
    }

    for (let i = objekte.length - 1; i >= 0; i--) {
      const o = objekte[i];
      o.y  += o.vy;
      o.rot += o.rotV;

      if (trifftKorb(o)) {
        objekte.splice(i, 1);
        if (o.typ === 'kohle') {
          z.kohle++;
          aktualisiereHUD();
          if (z.kohle >= 3) {
            z.laeuft = false;
            zeichneSpieler();
            zeigeOverlay(false);
            return;
          }
        } else {
          z.punkte++;
          aktualisiereHUD();
          if (z.punkte >= 8) {
            z.laeuft = false;
            zeichneSpieler();
            zeigeOverlay(true);
            return;
          }
        }
        continue;
      }

      if (o.y > hoehe + 30) { objekte.splice(i, 1); continue; }

      if      (o.typ === 'schneeball')    zeichneSchneeball(o);
      else if (o.typ === 'zuckerstange')  zeichneZuckerstange(o);
      else                                zeichneKohle(o);
    }

    zeichneSpieler();
    z.frameId = requestAnimationFrame(schritt);
  }

  // Tastatur
  function onKeyDown(e) {
    if (!z.laeuft) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      fokussiereSpiel();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setzeRichtungAktiv('links', true);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setzeRichtungAktiv('rechts', true);
    }
  }
  function onKeyUp(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setzeRichtungAktiv('links', false);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setzeRichtungAktiv('rechts', false);
    }
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  // Touch-Buttons
  function bindBtn(id, richtung) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown',  function() { setzeRichtungAktiv(richtung, true);  });
    btn.addEventListener('pointerup',    function() { setzeRichtungAktiv(richtung, false); });
    btn.addEventListener('pointerleave', function() { setzeRichtungAktiv(richtung, false); });
    btn.addEventListener('pointercancel', function() { setzeRichtungAktiv(richtung, false); });
  }
  bindBtn('ak-btn-links',  'links');
  bindBtn('ak-btn-rechts', 'rechts');

  // Neustart
  const btnNeustart = document.getElementById('ak-btn-neustart');
  if (btnNeustart) {
    btnNeustart.addEventListener('click', function() {
      z.laeuft = true;
      z.punkte = 0;
      z.kohle  = 0;
      objekte.length = 0;
      sp.x = breite / 2;
      stoppeBewegung();
      letzterSpawn = 0;
      const overlay = document.getElementById('ak-spiel-overlay');
      if (overlay) overlay.style.display = 'none';
      aktualisiereHUD();
      fokussiereSpiel();
      z.frameId = requestAnimationFrame(schritt);
    });
  }

  aktualisiereHUD();
  const status = document.getElementById('ak-spiel-status');
  if (status) status.textContent = 'Schneeball-Fangspiel gestartet. Steuere den Korb mit der linken und rechten Pfeiltaste. Drücke Escape, um das Spiel zu schließen.';
  fokussiereSpiel();
  z.frameId = requestAnimationFrame(schritt);
  window.addEventListener('blur', stoppeBewegung);

  aktivesSpiel = {
    stop: function() {
      z.laeuft = false;
      stoppeBewegung();
      if (z.frameId) cancelAnimationFrame(z.frameId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('blur', stoppeBewegung);
    }
  };

}
function starteHuetchenspiel() {
  const canvas = document.getElementById('ak-spiel-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const breite = canvas.clientWidth || 600;
  const hoehe = 420;
  canvas.width = breite;
  canvas.height = hoehe;

  let aktiv = true;
  let phase = 'zeige'; // zeige | mische | rate | ergebnis
  let geschenkIdx = Math.floor(Math.random() * 3);
  let positionen = [0, 1, 2]; // logischer Index an visueller Position
  let runde = 1;
  let animFrame = null;

  const hutX = [breite * 0.25, breite * 0.5, breite * 0.75];
  const hutY = hoehe * 0.55;
  const huts = hutX.map((x, i) => ({ x, y: hutY, vi: i }));

  function zeigeOverlay(gewonnen) {
    const overlay = document.getElementById('ak-spiel-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.querySelector('.ak-overlay-titel').textContent =
      gewonnen ? '🎉 Gewonnen!' : '💨 Verloren!';
    overlay.querySelector('.ak-overlay-text').textContent = gewonnen
      ? 'Du hast das Geschenk gefunden!'
      : 'Das Geschenk war woanders!';
  }

  function zeichneHintergrund() {
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(0, 0, breite, hoehe);
    // Sterne
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 50) % breite;
      const sy = (i * 89 + 20) % (hoehe * 0.6);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Schneeflaeche
    ctx.fillStyle = 'rgba(200,230,255,0.15)';
    ctx.fillRect(0, hoehe * 0.78, breite, hoehe * 0.22);
  }

  function zeichneGeschenk(x, y) {
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(x - 18, y + 8, 36, 28);
    ctx.fillStyle = '#a07810';
    ctx.fillRect(x - 2, y + 8, 5, 28);
    ctx.fillRect(x - 18, y + 18, 36, 5);
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a07810';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function zeichneHut(x, y, gehoben, zeigGeschenk) {
    const ly = gehoben ? y - 70 : y;
    if (zeigGeschenk) zeichneGeschenk(x, y);
    // Krempe
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(x, ly + 52, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Koerper
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(x - 32, ly + 52);
    ctx.quadraticCurveTo(x - 28, ly - 5, x, ly - 18);
    ctx.quadraticCurveTo(x + 28, ly - 5, x + 32, ly + 52);
    ctx.closePath();
    ctx.fill();
    // Weisser Rand
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x - 32, ly + 40, 64, 12);
    // Bommel
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(x, ly - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    // Krempe-Umriss
    ctx.strokeStyle = '#8b1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, ly + 52, 46, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function render(gehobenIdx) {
    zeichneHintergrund();
    for (let vi = 0; vi < 3; vi++) {
      const logIdx = positionen[vi];
      const istGeschenk = logIdx === geschenkIdx;
      const gehoben = gehobenIdx === vi;
      const zeig = gehoben && istGeschenk && (phase === 'zeige' || phase === 'ergebnis');
      zeichneHut(huts[vi].x, huts[vi].y, gehoben, istGeschenk && (phase === 'zeige' || (phase === 'ergebnis')));
    }
    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Runde ' + runde, 16, 28);
    if (phase === 'rate') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Wo ist das Geschenk?', breite / 2, 36);
    }
    if (phase === 'zeige') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Merke dir den Hut!', breite / 2, 36);
    }
  }

  // Hut sanft senken (animiert)
  function senkeHut(vi, callback) {
    const startY = huts[vi].y - 70;
    const endY   = huts[vi].y;
    const dauer  = 420;
    const start  = performance.now();
    function anim(now) {
      if (!aktiv) return;
      const t = Math.min((now - start) / dauer, 1);
      const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      const offsetY = startY + (endY - startY) * e;
      // render mit interpoliertem Offset
      zeichneHintergrund();
      for (let i = 0; i < 3; i++) {
        const logIdx = positionen[i];
        const istG = logIdx === geschenkIdx;
        const ly = i === vi ? offsetY - huts[i].y : 0;
        zeichneHutMitOffset(huts[i].x, huts[i].y, ly, istG && i === vi);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Runde ' + runde, 16, 28);
      if (t < 1) {
        animFrame = requestAnimationFrame(anim);
      } else {
        render(-1);
        if (callback) callback();
      }
    }
    animFrame = requestAnimationFrame(anim);
  }

  // Hut zeichnen mit Y-Offset (für Animation)
  function zeichneHutMitOffset(x, y, offsetY, zeigGeschenk) {
    const ly = y + offsetY;
    if (zeigGeschenk) zeichneGeschenk(x, y);
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(x, ly + 52, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(x - 32, ly + 52);
    ctx.quadraticCurveTo(x - 28, ly - 5, x, ly - 18);
    ctx.quadraticCurveTo(x + 28, ly - 5, x + 32, ly + 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(x - 32, ly + 40, 64, 12);
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(x, ly - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, ly + 52, 46, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Zeige-Phase: Geschenk enthüllen
  function zeigePhase() {
    phase = 'zeige';
    const vi = positionen.indexOf(geschenkIdx);
    render(vi);
    setTimeout(() => {
      if (!aktiv) return;
      senkeHut(vi, () => {
        setTimeout(() => {
          if (!aktiv) return;
          mischPhase();
        }, 200);
      });
    }, 2200);
  }

  // Misch-Animation
  function mischPhase() {
    phase = 'mische';
    render(-1);
    const anzahlTausche = 4 + runde * 2;
    let schritt = 0;

    function naechsterTausch() {
      if (!aktiv) return;
      if (schritt >= anzahlTausche) {
        phase = 'rate';
        render(-1);
        canvas.style.cursor = 'pointer';
        return;
      }
      let vi1 = Math.floor(Math.random() * 3);
      let vi2;
      do { vi2 = Math.floor(Math.random() * 3); } while (vi2 === vi1);

      const x1 = huts[vi1].x, x2 = huts[vi2].x;
      const dauer = Math.max(250, 450 - runde * 30);
      const start = performance.now();

      function animTausch(now) {
        if (!aktiv) return;
        const t = Math.min((now - start) / dauer, 1);
        const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        huts[vi1].x = x1 + (x2 - x1) * e;
        huts[vi2].x = x2 + (x1 - x2) * e;
        render(-1);
        if (t < 1) {
          animFrame = requestAnimationFrame(animTausch);
        } else {
          huts[vi1].x = x2; huts[vi2].x = x1;
          const tmp = positionen[vi1];
          positionen[vi1] = positionen[vi2];
          positionen[vi2] = tmp;
          schritt++;
          setTimeout(naechsterTausch, 80);
        }
      }
      animFrame = requestAnimationFrame(animTausch);
    }
    naechsterTausch();
  }

  // Klick-Handler
  function onKlick(e) {
    if (phase !== 'rate') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (breite / rect.width);
    const my = (e.clientY - rect.top) * (hoehe / rect.height);

    for (let vi = 0; vi < 3; vi++) {
      const hx = huts[vi].x;
      const hy = huts[vi].y;
      if (Math.abs(mx - hx) < 50 && my > hy - 20 && my < hy + 65) {
        canvas.style.cursor = 'default';
        phase = 'ergebnis';
        const logIdx = positionen[vi];
        const gewonnen = logIdx === geschenkIdx;
        render(-1);
        setTimeout(() => {
          if (!aktiv) return;
          zeigeOverlay(gewonnen);
        }, 600);
        break;
      }
    }
  }

  canvas.addEventListener('click', onKlick);

  // Neustart-Button
  const btnNeustart = document.getElementById('ak-btn-neustart');
  if (btnNeustart) {
    btnNeustart.addEventListener('click', function() {
      const overlay = document.getElementById('ak-spiel-overlay');
      if (overlay) overlay.style.display = 'none';
      geschenkIdx = Math.floor(Math.random() * 3);
      positionen = [0, 1, 2];
      huts[0].x = hutX[0]; huts[1].x = hutX[1]; huts[2].x = hutX[2];
      runde++;
      canvas.style.cursor = 'default';
      zeigePhase();
    });
  }

  zeigePhase();

  aktivesSpiel = {
    stop: function() {
      aktiv = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.removeEventListener('click', onKlick);
    }
  };
}

