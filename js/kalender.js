/**
 * kalender.js - Tuerchen-Logik, Grid und Geschenk-Reveal-Animation
 * Zustaendig: Dennis
 */

// ============================================================
// KONFIGURATION
// ============================================================

const ADVENTSSTART_MONAT = 11; // Monate in JavaScript: 0 = Januar, 11 = Dezember
const ADVENTSSTART_TAG = 1;
const TESTMODUS_TUERCHEN_NUMMER = 1; // null fuer echten Kalenderbetrieb, 1 simuliert den 1. Dezember

let geschenkAnimationLaeuft = false;
let gesperrtHinweisTimeout = null;

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

/**
 * Gibt zurueck welches Tuerchen heute geoeffnet werden darf.
 * @returns {number|null} Tuerchen-Nummer (1-24) oder null
 */
function heutigesTuerchen() {
  if (TESTMODUS_TUERCHEN_NUMMER >= 1 && TESTMODUS_TUERCHEN_NUMMER <= 24) {
    return TESTMODUS_TUERCHEN_NUMMER;
  }

  const heute = new Date();
  const monat = heute.getMonth();
  const tag = heute.getDate();

  if (monat === ADVENTSSTART_MONAT && tag >= ADVENTSSTART_TAG && tag <= 24) {
    return tag;
  }
  return null;
}

/**
 * Prueft ob ein bestimmtes Tuerchen bereits geoeffnet wurde.
 * @param {number} nummer
 * @returns {boolean}
 */
function istGeoeffnet(nummer) {
  const geoeffnet = JSON.parse(localStorage.getItem('geoeffneteTuerchen') || '[]');
  return geoeffnet.includes(nummer);
}

/**
 * Merkt sich dass ein Tuerchen geoeffnet wurde.
 * @param {number} nummer
 */
function alsGeoeffnetSpeichern(nummer) {
  const geoeffnet = JSON.parse(localStorage.getItem('geoeffneteTuerchen') || '[]');
  if (!geoeffnet.includes(nummer)) {
    geoeffnet.push(nummer);
    localStorage.setItem('geoeffneteTuerchen', JSON.stringify(geoeffnet));
  }
}

function zeigeGesperrtHinweis(text) {
  const hinweis = document.getElementById('gesperrt-hinweis');
  if (!hinweis) return;

  hinweis.textContent = text;
  hinweis.classList.add('sichtbar');

  if (gesperrtHinweisTimeout) {
    clearTimeout(gesperrtHinweisTimeout);
  }

  gesperrtHinweisTimeout = setTimeout(function() {
    hinweis.classList.remove('sichtbar');
    gesperrtHinweisTimeout = null;
  }, 2200);
}

function formatiereDatumFuerHinweis(datumWert) {
  let datum;

  if (datumWert instanceof Date) {
    datum = datumWert;
  } else if (typeof datumWert === 'string') {
    const nurDatumTreffer = datumWert.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (nurDatumTreffer) {
      datum = new Date(
        Number.parseInt(nurDatumTreffer[1], 10),
        Number.parseInt(nurDatumTreffer[2], 10) - 1,
        Number.parseInt(nurDatumTreffer[3], 10)
      );
    } else {
      datum = new Date(datumWert);
    }
  } else {
    datum = new Date(datumWert);
  }

  if (Number.isNaN(datum.getTime())) {
    return null;
  }

  const tag = String(datum.getDate()).padStart(2, '0');
  const monat = String(datum.getMonth() + 1).padStart(2, '0');
  const jahr = datum.getFullYear();

  return tag + '.' + monat + '.' + jahr;
}

function textFuerGesperrtesTuerchen(nummer, apiTage) {
  if (apiTage) {
    const tag = apiTage.find(function(eintrag) {
      return eintrag.day_number === nummer;
    });

    if (tag && tag.unlock_date) {
      const formatiert = formatiereDatumFuerHinweis(tag.unlock_date);
      if (formatiert) {
        return 'Verfügbar ab dem ' + formatiert + '!';
      }
    }
  }

  const fallbackDatum = formatiereDatumFuerHinweis(
    new Date(new Date().getFullYear(), ADVENTSSTART_MONAT, nummer)
  );

  if (fallbackDatum) {
    return 'Verfügbar ab dem ' + fallbackDatum + '!';
  }

  return 'Dieses Türchen ist noch gesperrt!';
}

/**
 * Bestimmt den Zustand eines Tuerchens.
 * @param {number} nummer
 * @returns {'geoeffnet'|'verfuegbar'|'heute'|'gesperrt'}
 */
function tuerchenzustand(nummer) {
  const aktuellesTuerchen = heutigesTuerchen();

  if (istGeoeffnet(nummer)) {
    return 'geoeffnet';
  }

  if (aktuellesTuerchen === null) {
    return 'gesperrt';
  }

  if (nummer === aktuellesTuerchen) {
    return 'heute';
  }

  if (nummer < aktuellesTuerchen) {
    return 'verfuegbar';
  }

  return 'gesperrt';
}

// ============================================================
// ZUSTAND AUS API-DATEN
// ============================================================

function tuerchenzustandAusApi(nummer, tage) {
  const tag = tage.find(function(t) { return t.day_number === nummer; });
  if (!tag || !tag.is_unlocked) return 'gesperrt';
  if (istGeoeffnet(nummer)) return 'geoeffnet';
  if (nummer === heutigesTuerchen()) return 'heute';
  return 'verfuegbar';
}

// ============================================================
// GRID AUFBAUEN
// ============================================================

// apiTage: Array<{ day_number, unlock_date, is_unlocked }> oder null (Fallback auf lokale Logik)
function kalenderGridAufbauen(apiTage) {
  const grid = document.getElementById('kalender-grid');
  grid.innerHTML = '';
  const reihenfolge = mischeArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);

  reihenfolge.forEach(function(nummer) {
    const zustand = apiTage ? tuerchenzustandAusApi(nummer, apiTage) : tuerchenzustand(nummer);

    const spalte = document.createElement('div');
    spalte.className = 'col-4 col-sm-3 col-md-2';

    const karte = document.createElement('div');
    const farbeIndex = ((nummer - 1) % 7) + 1;
    karte.className = 'tuerchen-karte tuerchen-farbe-' + farbeIndex + ' ' + zustand;
    karte.setAttribute('data-nummer', nummer);
    karte.setAttribute('aria-label', 'Tuerchen ' + nummer);

    let symbol = '';
    if (zustand === 'geoeffnet') symbol = '\u2713';
    else if (zustand === 'gesperrt') symbol = '\uD83D\uDD12';
    else symbol = '\uD83C\uDF81';

    karte.innerHTML = `
      <span class="tuerchen-nummer">${symbol}</span>
      <span class="tuerchen-label">${nummer}</span>
    `;

    if (zustand === 'verfuegbar' || zustand === 'heute') {
      karte.addEventListener('click', function() {
        if (geschenkAnimationLaeuft) return;

        karte.style.transform = 'scale(0.95)';

        setTimeout(function() {
          karte.style.transform = '';
          tuercheoeffnen(nummer, karte);
        }, 100);
      });
    }

    if (zustand === 'gesperrt') {
      karte.addEventListener('click', function() {
        if (karte.classList.contains('schuetteln')) return;
        karte.classList.add('schuetteln');
        zeigeGesperrtHinweis(textFuerGesperrtesTuerchen(nummer, apiTage));
        setTimeout(function() { karte.classList.remove('schuetteln'); }, 500);
      });
    }

    spalte.appendChild(karte);
    grid.appendChild(spalte);
  });
}

/**
 * Wird aufgerufen wenn der Nutzer auf ein Tuerchen klickt.
 * @param {number} nummer
 * @param {HTMLElement} karte
 */
function tuercheoeffnen(nummer, karte) {
  if (geschenkAnimationLaeuft) return;
  geschenkAnimationLaeuft = true;

  starteGeschenkRevealAnimation()
    .then(function() {
      alsGeoeffnetSpeichern(nummer);

      karte.classList.remove('verfuegbar', 'heute', 'gesperrt');
      karte.classList.add('geoeffnet');
      karte.querySelector('.tuerchen-nummer').textContent = '\u2713';

      inhaltAnzeigen(nummer);
    })
    .finally(function() {
      geschenkAnimationLaeuft = false;
    });
}

/**
 * Cinematic Reveal: Geschenk gross im Vordergrund, wackeln, oeffnen, Inhalt andeuten.
 * @returns {Promise<void>}
 */
function starteGeschenkRevealAnimation() {
  return new Promise(function(resolve) {
    const overlay = document.createElement('div');
    overlay.className = 'geschenk-reveal-overlay';
    overlay.innerHTML = `
      <div class="geschenk-reveal-buehne" role="status" aria-live="polite">
        <div class="geschenk-reveal-box" aria-hidden="true">
          <div class="geschenk-deckel"></div>
          <div class="geschenk-koerper"></div>
          <div class="geschenk-schleife-vertikal"></div>
          <div class="geschenk-schleife-horizontal"></div>
          <div class="geschenk-schleife-knoten"></div>
        </div>

        <div class="geschenk-konfetti" aria-hidden="true">
          <span class="partikel">&#10052;</span>
          <span class="partikel">&#10024;</span>
          <span class="partikel">&#9733;</span>
          <span class="partikel">&#10052;</span>
          <span class="partikel">&#10024;</span>
          <span class="partikel">&#9733;</span>
          <span class="partikel">&#10052;</span>
          <span class="partikel">&#10024;</span>
          <span class="partikel">&#9733;</span>
          <span class="partikel">&#10052;</span>
          <span class="partikel">&#10024;</span>
          <span class="partikel">&#9733;</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('geschenk-reveal-aktiv');

    requestAnimationFrame(function() {
      overlay.classList.add('sichtbar');
    });

    setTimeout(function() {
      overlay.querySelector('.geschenk-reveal-box').classList.add('wackeln');
    }, 220);

    setTimeout(function() {
      overlay.querySelector('.geschenk-reveal-box').classList.add('oeffnen');
      overlay.classList.add('inhalt-erscheint');
    }, 1350);

    setTimeout(function() {
      overlay.classList.add('ausblenden');
    }, 2750);

    setTimeout(function() {
      document.body.classList.remove('geschenk-reveal-aktiv');
      overlay.remove();
      resolve();
    }, 3200);
  });
}

// ============================================================
// HILFSFUNKTION: Array mischen (deterministisch per Jahr-Seed)
// ============================================================

/**
 * Einfacher seeded PRNG (mulberry32).
 * Gibt eine Funktion zurueck, die bei jedem Aufruf eine Zufallszahl [0, 1) liefert.
 * @param {number} seed
 * @returns {function(): number}
 */
function erstellePRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mischt ein Array deterministisch anhand des aktuellen Jahres als Seed.
 * Die Reihenfolge bleibt das gesamte Jahr identisch und aendert sich jedes Jahr.
 * @param {number[]} array
 * @returns {number[]}
 */
function mischeArray(array) {
  const seed = new Date().getFullYear();
  const zufall = erstellePRNG(seed);
  const kopie = [...array];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// ============================================================
// START
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  if (new URLSearchParams(window.location.search).get('reset') === 'true') {
    localStorage.clear();
    window.location.replace(window.location.pathname);
    return;
  }

  const grid = document.getElementById('kalender-grid');
  grid.innerHTML = '<p class="kalender-laden text-center text-muted py-5">Kalender wird geladen\u2026</p>';

  window.AdventskalenderApi.ladeTage()
    .then(function(tage) {
      kalenderGridAufbauen(tage);
    })
    .catch(function() {
      grid.innerHTML = '<p class="kalender-fehler text-center text-danger py-3">Backend nicht erreichbar \u2013 lokaler Modus wird geladen\u2026</p>';
      setTimeout(function() { kalenderGridAufbauen(null); }, 1500);
    });
});

