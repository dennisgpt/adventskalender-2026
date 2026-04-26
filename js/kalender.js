/**
 * kalender.js - Tuerchen-Logik, Grid und Geschenk-Reveal-Animation
 * Zustaendig: Dennis
 */

let geschenkAnimationLaeuft = false;

// Tuerchen die in dieser Sitzung geoeffnet wurden (kein localStorage)
const geoeffneteDieSitzung = new Set();

// ============================================================
// ZUSTAND BERECHNEN
// ============================================================

function berechneTuerchenzustand(tag) {
  if (geoeffneteDieSitzung.has(tag.day_number)) {
    return 'geoeffnet';
  }

  const unlockDatum = new Date(tag.unlock_date);
  const jetzt = new Date();

  if (unlockDatum > jetzt) {
    return 'gesperrt';
  }

  const istHeute =
    unlockDatum.getFullYear() === jetzt.getFullYear() &&
    unlockDatum.getMonth() === jetzt.getMonth() &&
    unlockDatum.getDate() === jetzt.getDate();

  return istHeute ? 'heute' : 'verfuegbar';
}

// ============================================================
// GRID AUFBAUEN
// ============================================================

function kalenderGridAufbauen(tage) {
  const grid = document.getElementById('kalender-grid');
  const tageMap = new Map(tage.map(function(t) { return [t.day_number, t]; }));
  const reihenfolge = mischeArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);

  reihenfolge.forEach(function(nummer) {
    const tag = tageMap.get(nummer);
    const zustand = tag ? berechneTuerchenzustand(tag) : 'gesperrt';

    const spalte = document.createElement('div');
    spalte.className = 'col-4 col-sm-3 col-md-2';

    const karte = document.createElement('div');
    karte.className = 'tuerchen-karte ' + zustand;
    karte.setAttribute('data-nummer', nummer);
    karte.setAttribute('aria-label', 'Tuerchen ' + nummer);

    let symbol = '';
    if (zustand === 'geoeffnet') symbol = '✓';
    else if (zustand === 'gesperrt') symbol = '🔒';
    else symbol = '🎁';

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

    spalte.appendChild(karte);
    grid.appendChild(spalte);
  });
}

// ============================================================
// TUERCHEN OEFFNEN
// ============================================================

function tuercheoeffnen(nummer, karte) {
  if (geschenkAnimationLaeuft) return;
  geschenkAnimationLaeuft = true;

  starteGeschenkRevealAnimation()
    .then(function() {
      geoeffneteDieSitzung.add(nummer);

      karte.classList.remove('verfuegbar', 'heute', 'gesperrt');
      karte.classList.add('geoeffnet');
      karte.querySelector('.tuerchen-nummer').textContent = '✓';

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

function erstellePRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

function zeigeLadefehler() {
  const grid = document.getElementById('kalender-grid');
  grid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-warning">⚠️ Der Kalender konnte nicht geladen werden. Bitte Seite neu laden.</p></div>';
}

document.addEventListener('DOMContentLoaded', async function() {
  if (new URLSearchParams(window.location.search).get('reset') === 'true') {
    window.location.replace(window.location.pathname);
    return;
  }

  try {
    const tage = await window.AdventskalenderApi.ladeTage();
    kalenderGridAufbauen(tage);
  } catch (fehler) {
    zeigeLadefehler();
  }
});
