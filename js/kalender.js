/**
 * kalender.js - Tuerchen-Logik, Grid und Geschenk-Reveal-Animation
 * Zustaendig: Dennis
 */

// ============================================================
// KONFIGURATION
// ============================================================

const ADVENTSSTART_MONAT = 11; // Monate in JavaScript: 0 = Januar, 11 = Dezember
const ADVENTSSTART_TAG = 1;
const TESTMODUS_TUERCHEN_NUMMER = null; // null fuer echten Kalenderbetrieb, 1 simuliert den 1. Dezember
const WIEDERHOLBAR_OEFFENBARE_TUERCHEN = [1, 2, 3, 4, 5];

let geschenkAnimationLaeuft = false;
let gesperrtHinweisTimeout = null;
const geoeffneteDieSitzung = new Set();

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

/**
 * Gibt zurueck welches Tuerchen heute geoeffnet werden darf.
 * @returns {number|null} Tuerchen-Nummer (1-24) oder null
 */
function heutigesTuerchen() {
  const urlTag = parseInt(new URLSearchParams(window.location.search).get('tag'), 10);
  if (urlTag >= 1 && urlTag <= 24) {
    return urlTag;
  }

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

function istGeoeffnet(nummer) {
  return geoeffneteDieSitzung.has(nummer);
}

function darfWiederholtGeoeffnetWerden(nummer) {
  return WIEDERHOLBAR_OEFFENBARE_TUERCHEN.includes(nummer);
}

function alsGeoeffnetSpeichern(nummer) {
  geoeffneteDieSitzung.add(nummer);
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

function ariaLabelFuerTuerchen(nummer, zustand, apiTage) {
  if (zustand === 'gesperrt') {
    return 'Türchen ' + nummer + ', gesperrt. ' + textFuerGesperrtesTuerchen(nummer, apiTage);
  }

  if (zustand === 'heute') {
    return 'Türchen ' + nummer + ', heute verfügbar. Öffnen.';
  }

  if (zustand === 'verfuegbar') {
    return 'Türchen ' + nummer + ', verfügbar. Öffnen.';
  }

  if (darfWiederholtGeoeffnetWerden(nummer)) {
    return 'Türchen ' + nummer + ', bereits geöffnet. Erneut öffnen.';
  }

  return 'Türchen ' + nummer + ', bereits geöffnet.';
}

function aktualisiereTuerchenBarrierefreiheit(karte, nummer, zustand, apiTage) {
  karte.setAttribute('aria-label', ariaLabelFuerTuerchen(nummer, zustand, apiTage));

  if (zustand === 'geoeffnet' && !darfWiederholtGeoeffnetWerden(nummer)) {
    karte.setAttribute('aria-disabled', 'true');
  } else {
    karte.removeAttribute('aria-disabled');
  }
}

function anzahlSichtbareKalenderSpalten(grid) {
  const karten = Array.from(grid.querySelectorAll('.tuerchen-karte'));

  if (karten.length < 2) {
    return 1;
  }

  const ersteZeile = Math.round(karten[0].getBoundingClientRect().top);
  const spalten = karten.filter(function(karte) {
    return Math.abs(Math.round(karte.getBoundingClientRect().top) - ersteZeile) <= 1;
  }).length;

  return Math.max(spalten, 1);
}

function fokussiereBenachbartesTuerchen(event, karte, grid) {
  const richtung = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -anzahlSichtbareKalenderSpalten(grid),
    ArrowDown: anzahlSichtbareKalenderSpalten(grid)
  }[event.key];

  if (!richtung) {
    return;
  }

  const karten = Array.from(grid.querySelectorAll('.tuerchen-karte'));
  const index = karten.indexOf(karte);
  const zielIndex = index + richtung;

  event.preventDefault();

  if (zielIndex >= 0 && zielIndex < karten.length) {
    karten[zielIndex].focus();
  }
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

// ============================================================
// GESCHENK-ICON (inline SVG, realistisch mit Muster)
// ============================================================

/**
 * Hilfsfunktion: Hellere oder dunklere Variante einer Hex-Farbe.
 * @param {string} hex - z.B. '#c8102e'
 * @param {number} menge - Positiv = heller, negativ = dunkler
 * @returns {string}
 */
function adjFarbe(hex, menge) {
  try {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgb('
      + Math.max(0, Math.min(255, r + menge)) + ','
      + Math.max(0, Math.min(255, g + menge)) + ','
      + Math.max(0, Math.min(255, b + menge)) + ')';
  } catch (e) { return hex; }
}

/**
 * Gibt das inline SVG fuer das Geschenk-Icon zurueck.
 * Jede Nummer bekommt ein eigenes Muster (zyklisch ueber 5 Muster).
 * Tuerchen 24 erhaelt goldenes Band, goldene Schleife und Goldrahmen.
 * Box-Farbe kommt aus der CSS-Variable --icon-farbe (per data-nummer gesetzt).
 * @param {number} nummer - Tuerchen-Nummer (1-24)
 * @returns {string} SVG-HTML-String
 */
function geschenkIconHTML(nummer) {
  var id = 'gk' + nummer;
  var MUSTER = ['dots', 'stripes', 'stars', 'diamonds', 'crosses'];
  var muster = MUSTER[(nummer - 1) % MUSTER.length];

  // Schleife & Band: rot fuer 1-23, gold fuer Tuerchen 24
  var rib     = nummer === 24 ? '#e8c84a' : '#c8102e';
  var ribDark = nummer === 24 ? '#b8960a' : '#8b0a1e';

  // ---- Muster-Definition (Geschenkpapier) ----
  var pat = '';
  if (muster === 'dots') {
    pat = '<pattern id="' + id + '-p" x="0" y="0" width="11" height="11" patternUnits="userSpaceOnUse">'
        + '<circle cx="5.5" cy="5.5" r="2.2" fill="rgba(255,255,255,0.22)"/>'
        + '</pattern>';
  } else if (muster === 'stripes') {
    pat = '<pattern id="' + id + '-p" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
        + '<rect x="0" y="0" width="5" height="10" fill="rgba(255,255,255,0.17)"/>'
        + '</pattern>';
  } else if (muster === 'stars') {
    pat = '<pattern id="' + id + '-p" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">'
        + '<polygon points="8,1.5 9.6,6.4 14.8,6.4 10.7,9.6 12.2,14.5 8,11.4 3.8,14.5 5.3,9.6 1.2,6.4 6.4,6.4" fill="rgba(255,255,255,0.22)"/>'
        + '</pattern>';
  } else if (muster === 'diamonds') {
    pat = '<pattern id="' + id + '-p" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">'
        + '<rect x="3" y="3" width="6" height="6" fill="rgba(255,255,255,0.20)" transform="rotate(45 6 6)"/>'
        + '</pattern>';
  } else if (muster === 'crosses') {
    pat = '<pattern id="' + id + '-p" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">'
        + '<line x1="6" y1="2" x2="6" y2="10" stroke="rgba(255,255,255,0.20)" stroke-width="1.5" stroke-linecap="round"/>'
        + '<line x1="2" y1="6" x2="10" y2="6" stroke="rgba(255,255,255,0.20)" stroke-width="1.5" stroke-linecap="round"/>'
        + '</pattern>';
  }

  // ---- Schleife (groesser & luxurioese fuer #24) ----
  var bogen = '';
  if (nummer === 24) {
    bogen += '<ellipse cx="30" cy="17" rx="15" ry="9" fill="' + ribDark + '" transform="rotate(-28 30 17)" opacity=".72"/>';
    bogen += '<ellipse cx="50" cy="17" rx="15" ry="9" fill="' + ribDark + '" transform="rotate(28 50 17)" opacity=".72"/>';
    bogen += '<path d="M37 26 L32 37" stroke="' + rib + '" stroke-width="5.5" stroke-linecap="round"/>';
    bogen += '<path d="M43 26 L48 37" stroke="' + rib + '" stroke-width="5.5" stroke-linecap="round"/>';
  }
  bogen += '<ellipse cx="29" cy="20" rx="13" ry="8" fill="' + adjFarbe(rib, -20) + '" transform="rotate(-18 29 20)"/>';
  bogen += '<ellipse cx="51" cy="20" rx="13" ry="8" fill="' + adjFarbe(rib, -20) + '" transform="rotate(18 51 20)"/>';
  bogen += '<ellipse cx="25" cy="18" rx="5" ry="2.5" fill="rgba(255,255,255,0.26)" transform="rotate(-18 25 18)"/>';
  bogen += '<ellipse cx="55" cy="18" rx="5" ry="2.5" fill="rgba(255,255,255,0.26)" transform="rotate(18 55 18)"/>';
  bogen += '<circle cx="40" cy="21" r="7" fill="' + rib + '"/>';
  bogen += '<circle cx="38.5" cy="19.5" r="2.8" fill="rgba(255,255,255,0.28)"/>';

  // ---- Goldener Rahmen nur fuer Tuerchen 24 ----
  var rahmen = '';
  if (nummer === 24) {
    rahmen = '<rect x="5" y="23" width="70" height="53" rx="7" fill="none" stroke="#e8c84a" stroke-width="2.5"/>'
           + '<rect x="2" y="20" width="76" height="59" rx="9" fill="none" stroke="#e8c84a" stroke-width="1" opacity=".4"/>'
           // Goldene Eckverzierungen
           + '<polygon points="6,29 8,24 13,22 8,27 11,32" fill="#e8c84a" opacity=".85"/>'
           + '<polygon points="74,29 72,24 67,22 72,27 69,32" fill="#e8c84a" opacity=".85"/>'
           + '<polygon points="6,67 8,72 13,74 8,69 11,64" fill="#e8c84a" opacity=".85"/>'
           + '<polygon points="74,67 72,72 67,74 72,69 69,64" fill="#e8c84a" opacity=".85"/>';
  }

  return '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
    + '<defs>' + pat + '</defs>'
    // Koerper (statisch)
    + '<rect x="9" y="37" width="62" height="37" rx="5" fill="var(--icon-farbe)"/>'
    + '<rect x="9" y="37" width="62" height="37" rx="5" fill="url(#' + id + '-p)"/>'
    + '<rect x="43" y="37" width="28" height="37" fill="rgba(0,0,0,0.15)"/>'
    + '<rect x="11" y="42" width="15" height="5" rx="2" fill="rgba(255,255,255,0.08)"/>'
    // Band am Koerper – sichtbar wenn Deckel aufklappt
    + '<rect x="35" y="37" width="10" height="37" fill="' + rib + '"/>'
    + '<rect x="6" y="37" width="68" height="6" fill="' + rib + '"/>'
    // Deckel-Gruppe – dreht sich beim Hover auf
    // Scharnier liegt an der Unterkante des Deckels (y=40)
    + '<g class="gk-deckel">'
    +   '<rect x="6" y="27" width="68" height="13" rx="5" fill="var(--icon-farbe)"/>'
    +   '<rect x="6" y="27" width="68" height="13" rx="5" fill="url(#' + id + '-p)"/>'
    +   '<rect x="6" y="27" width="68" height="13" rx="5" fill="rgba(255,255,255,0.18)"/>'
    +   '<rect x="43" y="27" width="31" height="13" fill="rgba(0,0,0,0.10)"/>'
    +   '<rect x="9" y="28" width="20" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>'
    // Band auf dem Deckel (hebt sich mit)
    +   '<rect x="35" y="27" width="10" height="13" fill="' + rib + '"/>'
    +   '<rect x="6" y="32" width="68" height="8" fill="' + rib + '"/>'
    // Schleife sitzt auf dem Deckel und hebt sich mit
    +   bogen
    + '</g>'
    // Goldener Rahmen (nur Tuerchen 24, immer sichtbar)
    + rahmen
    + '</svg>';
}

// apiTage: Array<{ day_number, unlock_date, is_unlocked }> oder null (Fallback auf lokale Logik)
function kalenderGridAufbauen(apiTage) {
  const grid = document.getElementById('kalender-grid');
  grid.innerHTML = '';
  const reihenfolge = mischeArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);

  reihenfolge.forEach(function(nummer) {
    const zustand = apiTage ? tuerchenzustandAusApi(nummer, apiTage) : tuerchenzustand(nummer);

    const spalte = document.createElement('div');
    spalte.className = 'col-4 col-sm-3 col-md-2';

    const karte = document.createElement('button');
    const farbeIndex = ((nummer - 1) % 7) + 1;
    karte.type = 'button';
    karte.className = 'tuerchen-karte tuerchen-farbe-' + farbeIndex + ' ' + zustand;
    karte.setAttribute('data-nummer', nummer);
    aktualisiereTuerchenBarrierefreiheit(karte, nummer, zustand, apiTage);
    karte.addEventListener('keydown', function(event) {
      fokussiereBenachbartesTuerchen(event, karte, grid);
    });

    karte.innerHTML = `
      <div class="geschenk-icon">${geschenkIconHTML(nummer)}</div>
      <span class="tuerchen-label">${nummer}</span>
    `;

    if (zustand === 'verfuegbar' || zustand === 'heute' || (zustand === 'geoeffnet' && darfWiederholtGeoeffnetWerden(nummer))) {
      karte.addEventListener('click', function() {
        if (geschenkAnimationLaeuft || (karte.classList.contains('geoeffnet') && !darfWiederholtGeoeffnetWerden(nummer))) return;

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

  starteGeschenkRevealAnimation(karte)
    .then(function() {
      alsGeoeffnetSpeichern(nummer);

      karte.classList.remove('verfuegbar', 'heute', 'gesperrt');
      karte.classList.add('geoeffnet');
      karte.querySelector('.tuerchen-label').textContent = '\u2713';
      aktualisiereTuerchenBarrierefreiheit(karte, nummer, 'geoeffnet');

      inhaltAnzeigen(nummer);
    })
    .finally(function() {
      geschenkAnimationLaeuft = false;
    });
}

/**
 * Reveal: Das echte SVG-Geschenk-Icon der Karte fliegt zur Mitte,
 * der Deckel klappt auf, Lichtblitz und Konfetti.
 * @param {HTMLElement} karte
 * @returns {Promise<void>}
 */
function starteGeschenkRevealAnimation(karte) {
  return new Promise(function(resolve) {
    var ikonEl = karte ? karte.querySelector('.geschenk-icon') : null;
    var startRect = ikonEl ? ikonEl.getBoundingClientRect() : null;

    // SVG klonen und CSS-Variable --icon-farbe sichern
    var ikonHtml = '';
    if (ikonEl) {
      var klon = ikonEl.cloneNode(true);
      var farbe = getComputedStyle(ikonEl).getPropertyValue('--icon-farbe').trim();
      if (farbe) klon.style.setProperty('--icon-farbe', farbe);
      ikonHtml = klon.outerHTML;
    }

    var overlay = document.createElement('div');
    overlay.className = 'geschenk-reveal-overlay';
    overlay.innerHTML =
      '<div class="geschenk-reveal-buehne" role="status" aria-live="polite">' +
        '<div class="geschenk-reveal-ikon-wrap" aria-hidden="true">' +
          ikonHtml +
        '</div>' +
        '<div class="geschenk-konfetti" aria-hidden="true">' +
          '<span class="partikel">&#10052;</span>' +
          '<span class="partikel">&#10024;</span>' +
          '<span class="partikel">&#9733;</span>' +
          '<span class="partikel">&#10052;</span>' +
          '<span class="partikel">&#10024;</span>' +
          '<span class="partikel">&#9733;</span>' +
          '<span class="partikel">&#10052;</span>' +
          '<span class="partikel">&#10024;</span>' +
          '<span class="partikel">&#9733;</span>' +
          '<span class="partikel">&#10052;</span>' +
          '<span class="partikel">&#10024;</span>' +
          '<span class="partikel">&#9733;</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.classList.add('geschenk-reveal-aktiv');

    var ikonWrap = overlay.querySelector('.geschenk-reveal-ikon-wrap');
    var ikonKlon = ikonWrap ? ikonWrap.querySelector('.geschenk-icon') : null;

    // FLIP: Icon startet an Kartenposition und fliegt zur Bildschirmmitte
    if (ikonWrap && startRect) {
      var endRect = ikonWrap.getBoundingClientRect();
      var scale = startRect.width / Math.max(endRect.width, 1);
      var tx = (startRect.left + startRect.width / 2) - (endRect.left + endRect.width / 2);
      var ty = (startRect.top + startRect.height / 2) - (endRect.top + endRect.height / 2);

      ikonWrap.style.transition = 'none';
      ikonWrap.style.opacity = '0';
      ikonWrap.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
      ikonWrap.getBoundingClientRect(); // Reflow erzwingen
      ikonWrap.style.transition = 'transform 0.48s cubic-bezier(0.34, 1.15, 0.64, 1), opacity 0.22s ease';
    }

    requestAnimationFrame(function() {
      overlay.classList.add('sichtbar');
      if (ikonWrap) {
        ikonWrap.style.transform = '';
        ikonWrap.style.opacity = '1';
      }
    });

    // Deckel aufklappen
    setTimeout(function() {
      if (ikonKlon) {
        var deckel = ikonKlon.querySelector('.gk-deckel');
        if (deckel) {
          deckel.style.transition = 'transform 0.52s cubic-bezier(0.22, 1, 0.36, 1)';
          deckel.style.transform = 'rotate(-95deg)';
        }
      }
      if (ikonWrap) ikonWrap.classList.add('aufgeklappt');
      overlay.classList.add('inhalt-erscheint');
    }, 580);

    setTimeout(function() {
      overlay.classList.add('ausblenden');
    }, 1150);

    setTimeout(function() {
      document.body.classList.remove('geschenk-reveal-aktiv');
      overlay.remove();
      resolve();
    }, 1600);
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
      grid.innerHTML = '<p class="kalender-fehler text-center text-danger py-3">⚠ Der Kalender konnte nicht geladen werden. Bitte Seite neu laden.</p>';
    });
});

