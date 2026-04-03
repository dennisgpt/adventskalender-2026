/**
 * inhalte.js – Inhalts-Anzeige & Modal
 * Zuständig: Artjom
 *
 * Was diese Datei macht:
 *  1. Das Modal öffnen wenn ein Türchen geklickt wird
 *  2. Den richtigen Inhalt für jedes Türchen laden (vom Backend-API)
 *  3. Verschiedene Inhalts-Typen darstellen (Quiz, Fun Fact, Video, Karte)
 */

// ============================================================
// BEISPIEL-INHALTE (Platzhalter – später kommt das vom Backend)
// ============================================================
// TODO: Diese Daten später durch einen echten API-Call ersetzen
// Beispiel API-Aufruf: fetch('/api/tuerchen/3') → gibt JSON zurück

const BEISPIEL_INHALTE = {
  1:  { typ: 'funfact',    titel: 'Türchen 1 – Fun Fact!',     inhalt: 'Wusstest du? Die THWS hat über 9.000 Studierende verteilt auf zwei Standorte.' },
  2:  { typ: 'video',      titel: 'Türchen 2 – Weihnachts-Vibe!', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  3:  { typ: 'quiz',       titel: 'Türchen 3 – Quiz!',          frage: 'Wofür steht das "W" in THWS?', antworten: ['Würzburg', 'Westfalen', 'Weihnachten', 'Wolfsburg'], richtig: 0 },
  4:  { typ: 'karte',      titel: 'Türchen 4 – Frohe Weihnachten!', nachricht: '🎄 Wir wünschen euch besinnliche Feiertage und einen guten Rutsch ins neue Jahr!' },
  // Weitere Türchen hier ergänzen ...
};

// ============================================================
// HAUPT-FUNKTION: Inhalt anzeigen
// ============================================================

/**
 * Öffnet das Modal und zeigt den passenden Inhalt für ein Türchen.
 * Wird aus kalender.js aufgerufen wenn ein Türchen geklickt wird.
 * @param {number} nummer - Türchen-Nummer (1–24)
 */
function inhaltAnzeigen(nummer) {
  const modalTitel  = document.getElementById('tuerchen-modal-titel');
  const modalInhalt = document.getElementById('tuerchen-modal-inhalt');

  // Inhalt aus den Beispiel-Daten holen
  // TODO: Später durch echten API-Call ersetzen: await fetch('/api/tuerchen/' + nummer)
  const data = BEISPIEL_INHALTE[nummer];

  if (!data) {
    // Fallback wenn kein Inhalt vorhanden
    modalTitel.textContent  = 'Türchen ' + nummer;
    modalInhalt.innerHTML   = '<p class="text-center py-4">🎅 Inhalt kommt bald!</p>';
  } else {
    modalTitel.textContent = data.titel;
    modalInhalt.innerHTML  = inhaltRendern(data);
  }

  // Bootstrap Modal öffnen
  const modal = new bootstrap.Modal(document.getElementById('tuerchen-modal'));
  modal.show();
}

// ============================================================
// INHALTS-TYPEN RENDERN
// ============================================================

/**
 * Erzeugt den HTML-Code für den jeweiligen Inhalts-Typ.
 * @param {Object} data - Inhalts-Daten
 * @returns {string} HTML-String
 */
function inhaltRendern(data) {
  switch (data.typ) {

    // ---- Fun Fact ----
    case 'funfact':
      return `
        <div class="text-center p-3">
          <div style="font-size: 4rem;">💡</div>
          <p class="lead mt-3">${data.inhalt}</p>
        </div>
      `;

    // ---- Video ----
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

    // ---- Quiz ----
    case 'quiz':
      return quizRendern(data);

    // ---- Weihnachtskarte ----
    case 'karte':
      return `
        <div class="text-center p-4" style="background: linear-gradient(135deg, #16213e, #0f3460); border-radius: 12px;">
          <div style="font-size: 3rem;">🎄</div>
          <p class="lead mt-3">${data.nachricht}</p>
          <div style="font-size: 2rem;">⭐🦌🎁</div>
        </div>
      `;

    // ---- Unbekannter Typ ----
    default:
      return '<p>Unbekannter Inhalts-Typ.</p>';
  }
}

// ============================================================
// QUIZ-LOGIK
// ============================================================

/**
 * Rendert ein Quiz mit Antwort-Buttons.
 * @param {Object} data - Quiz-Daten
 * @returns {string} HTML-String
 */
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
      <p class="lead text-center mb-4">❓ ${data.frage}</p>
      <div id="quiz-antworten">
        ${antwortButtons}
      </div>
      <div id="quiz-feedback" class="text-center mt-3 fw-bold" style="display:none;"></div>
    </div>
  `;
}

/**
 * Prüft ob die geklickte Antwort richtig ist und zeigt Feedback.
 * @param {HTMLElement} button - Der geklickte Antwort-Button
 */
function quizAntwortPruefen(button) {
  const gewaehlt = parseInt(button.getAttribute('data-index'));
  const richtig  = parseInt(button.getAttribute('data-richtig'));
  const feedback = document.getElementById('quiz-feedback');

  // Alle Buttons deaktivieren (nur einmal antworten)
  document.querySelectorAll('.quiz-antwort').forEach(function(btn) {
    btn.disabled = true;
  });

  if (gewaehlt === richtig) {
    button.classList.replace('btn-outline-warning', 'btn-success');
    feedback.textContent  = '🎉 Richtig! Super gemacht!';
    feedback.style.color  = '#5cb85c';
  } else {
    button.classList.replace('btn-outline-warning', 'btn-danger');
    // Richtigen Button grün markieren
    document.querySelectorAll('.quiz-antwort')[richtig]
            .classList.replace('btn-outline-warning', 'btn-success');
    feedback.textContent  = '❌ Leider falsch. Versuch\'s nächstes Mal!';
    feedback.style.color  = '#d9534f';
  }

  feedback.style.display = 'block';
}
