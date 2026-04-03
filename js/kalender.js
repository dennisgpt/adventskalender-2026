/**
 * kalender.js – Türchen-Logik & Grid
 * Zuständig: Dennis
 *
 * Was diese Datei macht:
 *  1. Die 24 Türchen-Karten im Grid erstellen
 *  2. Prüfen welches Türchen heute verfügbar ist (kein Schummeln!)
 *  3. Bereits geöffnete Türchen aus dem Speicher laden
 *  4. Klick auf ein Türchen verarbeiten
 */

// ============================================================
// KONFIGURATION
// ============================================================

// Advent beginnt immer am 1. Dezember
const ADVENTSSTART_MONAT = 11; // Monate in JavaScript: 0 = Januar, 11 = Dezember
const ADVENTSSTART_TAG   = 1;

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

/**
 * Gibt zurück welches Türchen heute geöffnet werden darf.
 * Außerhalb des Advents (1.–24. Dez) gibt es kein aktives Türchen.
 * @returns {number|null} Türchen-Nummer (1–24) oder null
 */
function heutigesTuerchen() {
  const heute = new Date();
  const monat = heute.getMonth();   // 11 = Dezember
  const tag   = heute.getDate();    // 1–31

  if (monat === ADVENTSSTART_MONAT && tag >= 1 && tag <= 24) {
    return tag; // Tag = Türchen-Nummer
  }
  return null; // Nicht im Advent
}

/**
 * Prüft ob ein bestimmtes Türchen bereits geöffnet wurde.
 * Geöffnete Türchen werden im localStorage des Browsers gespeichert.
 * @param {number} nummer - Türchen-Nummer
 * @returns {boolean}
 */
function istGeoeffnet(nummer) {
  const geoeffnet = JSON.parse(localStorage.getItem('geoeffneteTuerchen') || '[]');
  return geoeffnet.includes(nummer);
}

/**
 * Merkt sich dass ein Türchen geöffnet wurde.
 * @param {number} nummer - Türchen-Nummer
 */
function alsGeoeffnetSpeichern(nummer) {
  const geoeffnet = JSON.parse(localStorage.getItem('geoeffneteTuerchen') || '[]');
  if (!geoeffnet.includes(nummer)) {
    geoeffnet.push(nummer);
    localStorage.setItem('geoeffneteTuerchen', JSON.stringify(geoeffnet));
  }
}

/**
 * Bestimmt den Zustand eines Türchens.
 * @param {number} nummer - Türchen-Nummer (1–24)
 * @returns {'geoeffnet'|'verfuegbar'|'heute'|'gesperrt'}
 */
function tuerchenzustand(nummer) {
  const aktuellesTuerchen = heutigesTuerchen();

  if (istGeoeffnet(nummer)) {
    return 'geoeffnet';
  }

  if (aktuellesTuerchen === null) {
    // Nicht im Advent → alle gesperrt
    return 'gesperrt';
  }

  if (nummer === aktuellesTuerchen) {
    return 'heute'; // Heutiges Türchen hervorheben
  }

  if (nummer < aktuellesTuerchen) {
    return 'verfuegbar'; // Vergangene Türchen (noch nicht geöffnet)
  }

  return 'gesperrt'; // Zukünftige Türchen
}

// ============================================================
// GRID AUFBAUEN
// ============================================================

/**
 * Erstellt alle 24 Türchen-Karten und fügt sie ins Grid ein.
 */
function kalenderGridAufbauen() {
  const grid = document.getElementById('kalender-grid');

  // Die Reihenfolge der Türchen-Nummern mischen für einen schönen Kalender-Look
  const reihenfolge = mischeArray([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);

  reihenfolge.forEach(function(nummer) {
    const zustand = tuerchenzustand(nummer);

    // Spalte erstellen (Bootstrap Grid: 3 Spalten auf Desktop, 4 auf Tablet, 6 auf Handy)
    const spalte = document.createElement('div');
    spalte.className = 'col-4 col-sm-3 col-md-2';

    // Karte erstellen
    const karte = document.createElement('div');
    karte.className = 'tuerchen-karte ' + zustand;
    karte.setAttribute('data-nummer', nummer);
    karte.setAttribute('aria-label', 'Türchen ' + nummer); // Barrierefreiheit

    // Icon je nach Zustand
    let symbol = '';
    if (zustand === 'geoeffnet') symbol = '✓';
    else if (zustand === 'gesperrt') symbol = '🔒';
    else symbol = '🎁'; // verfuegbar oder heute

    karte.innerHTML = `
      <span class="tuerchen-nummer">${symbol}</span>
      <span class="tuerchen-label">${nummer}</span>
    `;

    // Klick-Handler: nur wenn verfügbar oder heute
    if (zustand === 'verfuegbar' || zustand === 'heute') {
      karte.addEventListener('click', function() {
        tuercheoeffnen(nummer, karte);
      });
    }

    spalte.appendChild(karte);
    grid.appendChild(spalte);
  });
}

/**
 * Wird aufgerufen wenn der Nutzer auf ein Türchen klickt.
 * @param {number} nummer - Türchen-Nummer
 * @param {HTMLElement} karte - Das geklickte DOM-Element
 */
function tuercheoeffnen(nummer, karte) {
  // Als geöffnet speichern
  alsGeoeffnetSpeichern(nummer);

  // Karte optisch als geöffnet markieren
  karte.classList.remove('verfuegbar', 'heute', 'gesperrt');
  karte.classList.add('geoeffnet');
  karte.querySelector('.tuerchen-nummer').textContent = '✓';

  // Inhalt im Modal anzeigen (Funktion kommt aus inhalte.js von Artjom)
  inhaltAnzeigen(nummer);
}

// ============================================================
// HILFSFUNKTION: Array mischen (für zufällige Türchen-Anordnung)
// ============================================================

/**
 * Mischt ein Array zufällig (Fisher-Yates Algorithmus).
 * @param {Array} array
 * @returns {Array}
 */
function mischeArray(array) {
  const kopie = [...array];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// ============================================================
// START: Grid aufbauen wenn die Seite geladen ist
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  kalenderGridAufbauen();
});
