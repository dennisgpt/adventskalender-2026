/**
 * inhalte.js - Inhalts-Anzeige und Modal
 * Zustaendig: Artjom
 */

let moodFadeInterval = null;
let aktivesMoodFrame = null;

// ============================================================
// API-ANTWORT MAPPEN
// ============================================================

function mappeApiAntwort(apiDaten) {
  const ersterInhalt = apiDaten.contents && apiDaten.contents[0];

  if (!ersterInhalt) {
    return { typ: 'funfact', titel: 'Türchen ' + apiDaten.day_number, inhalt: 'Kein Inhalt verfügbar.' };
  }

  let typ;
  if (ersterInhalt.type === 'image') {
    typ = 'bild';
  } else if (ersterInhalt.type === 'text' || ersterInhalt.type === 'funfact') {
    typ = 'funfact';
  } else {
    typ = ersterInhalt.type;
  }

  const gemappt = {
    typ: typ,
    titel: 'Türchen ' + apiDaten.day_number,
    inhalt: ersterInhalt.body
  };

  if (ersterInhalt.type === 'video') gemappt.videoUrl = ersterInhalt.media_url;
  if (ersterInhalt.type === 'image') gemappt.bild = ersterInhalt.media_url;

  return gemappt;
}

// ============================================================
// HAUPT-FUNKTION: Inhalt anzeigen
// ============================================================

async function inhaltAnzeigen(nummer) {
  const modalElement = document.getElementById('tuerchen-modal');
  const modalTitel = document.getElementById('tuerchen-modal-titel');
  const modalInhalt = document.getElementById('tuerchen-modal-inhalt');

  modalTitel.textContent = 'Türchen ' + nummer;
  modalInhalt.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-warning" role="status"><span class="visually-hidden">Lädt...</span></div></div>';

  const modal = new bootstrap.Modal(modalElement);
  modal.show();

  modalElement.addEventListener('hidden.bs.modal', function() {
    stoppeMoodMusik(modalElement);
  }, { once: true });

  try {
    const apiDaten = await window.AdventskalenderApi.ladeTuerchenInhalt(nummer);
    const data = mappeApiAntwort(apiDaten);

    modalTitel.textContent = data.titel;
    modalInhalt.innerHTML = inhaltRendern(data);

    if (data.typ === 'mood') {
      starteMoodMusik(modalElement);
    }
  } catch (fehler) {
    if (fehler.status === 403) {
      modalInhalt.innerHTML = '<div class="text-center py-4"><p class="text-warning">⏳ Dieses Türchen ist noch nicht verfügbar.</p></div>';
    } else if (fehler.status === 404) {
      modalInhalt.innerHTML = '<div class="text-center py-4"><p class="text-muted">Inhalt nicht gefunden.</p></div>';
    } else {
      modalInhalt.innerHTML = '<div class="text-center py-4"><p class="text-warning">⚠️ Inhalt konnte nicht geladen werden. Bitte erneut versuchen.</p></div>';
    }
  }
}

// ============================================================
// INHALTS-TYPEN RENDERN
// ============================================================

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
        <div class="text-center p-2">
          <img
            src="${data.bild}"
            alt="${data.titel}"
            class="img-fluid rounded-4"
            style="max-height: 420px; width: 100%; object-fit: cover;">
          ${data.inhalt ? `<p class="lead mt-3">${data.inhalt}</p>` : ''}
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

function quizRendern(data) {
  const antwortButtons = data.antworten.map(function(antwort, index) {
    return `
      <button
        class="btn btn-outline-warning w-100 mb-2 quiz-antwort"
        data-index="${index}"
        data-richtig="${data.richtig}"
        onclick="quizAntwortPruefen(this)">
        ${antwort}
      </button>
    `;
  }).join('');

  return `
    <div class="p-3">
      <p class="lead text-center mb-4">${data.frage}</p>
      <div id="quiz-antworten">
        ${antwortButtons}
      </div>
      <div id="quiz-feedback" class="text-center mt-3 fw-bold" style="display:none;"></div>
    </div>
  `;
}

function quizAntwortPruefen(button) {
  const gewaehlt = parseInt(button.getAttribute('data-index'), 10);
  const richtig = parseInt(button.getAttribute('data-richtig'), 10);
  const feedback = document.getElementById('quiz-feedback');

  document.querySelectorAll('.quiz-antwort').forEach(function(btn) {
    btn.disabled = true;
  });

  if (gewaehlt === richtig) {
    button.classList.replace('btn-outline-warning', 'btn-success');
    feedback.textContent = 'Richtig! Super gemacht!';
    feedback.style.color = '#5cb85c';
  } else {
    button.classList.replace('btn-outline-warning', 'btn-danger');
    document.querySelectorAll('.quiz-antwort')[richtig]
      .classList.replace('btn-outline-warning', 'btn-success');
    feedback.textContent = 'Leider falsch. Versuchs naechstes Mal!';
    feedback.style.color = '#d9534f';
  }

  feedback.style.display = 'block';
}
