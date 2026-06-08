(function(window) {
  'use strict';

  const DEFAULT_API_BASE_URL = '';
  const API_BASE_URL =
    window.ADVENTSKALENDER_API_BASE_URL ||
    localStorage.getItem('ADVENTSKALENDER_API_BASE_URL') ||
    DEFAULT_API_BASE_URL;
  const ADMIN_SESSION_STORAGE_KEY = 'ADVENTSKALENDER_ADMIN_SESSION';

  class AdventskalenderApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'AdventskalenderApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  function baueApiUrl(pfad) {
    return API_BASE_URL.replace(/\/$/, '') + pfad;
  }

  function speichereAdminSession(session) {
    if (!session || !session.token) {
      throw new AdventskalenderApiError(
        'Die Admin-Session ist ungueltig.',
        0,
        session || null
      );
    }

    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify({
      token: session.token,
      expires_at: session.expires_at || null,
      role: session.role || null
    }));
  }

  function ladeAdminSession() {
    const gespeicherteSession = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!gespeicherteSession) {
      return null;
    }

    try {
      const session = JSON.parse(gespeicherteSession);
      if (!session || !session.token) {
        return null;
      }

      if (istAdminSessionAbgelaufen(session)) {
        loescheAdminSession();
        return null;
      }

      return session;
    } catch (error) {
      loescheAdminSession();
      return null;
    }
  }

  function istAdminSessionAbgelaufen(session) {
    if (!session || !session.expires_at) {
      return false;
    }

    const ablaufZeit = new Date(session.expires_at).getTime();

    if (Number.isNaN(ablaufZeit)) {
      return false;
    }

    return ablaufZeit <= Date.now();
  }

  function ladeAdminToken() {
    const session = ladeAdminSession();
    return session ? session.token : null;
  }

  function loescheAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  }

  function meldeAdminSessionVerloren(grund) {
    window.dispatchEvent(new CustomEvent('adventskalender:admin-session-verloren', {
      detail: {
        grund: grund || 'unbekannt'
      }
    }));
  }

  function baueAdminAuthHeader() {
    const token = ladeAdminToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  async function leseJsonAntwort(response) {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new AdventskalenderApiError(
        'Die Server-Antwort konnte nicht gelesen werden.',
        response.status,
        { raw: text }
      );
    }
  }

  async function apiFetch(pfad, optionen) {
    let response;

    try {
      response = await fetch(baueApiUrl(pfad), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        ...optionen
      });
    } catch (error) {
      throw new AdventskalenderApiError(
        'Das Backend ist aktuell nicht erreichbar.',
        0,
        { originalError: error }
      );
    }

    const payload = await leseJsonAntwort(response);

    if (!response.ok) {
      throw new AdventskalenderApiError(
        payload && payload.error ? payload.error : 'Die Anfrage ist fehlgeschlagen.',
        response.status,
        payload
      );
    }

    return payload;
  }

  function fehlertextFuerApiFehler(error, fallback) {
    if (!error) {
      return fallback || 'Die Anfrage ist fehlgeschlagen.';
    }

    if (error.status === 0) {
      return 'Das Backend ist aktuell nicht erreichbar.';
    }

    if (error.status === 401) {
      return 'Die Sitzung ist abgelaufen oder die Anmeldung ist ungueltig.';
    }

    if (error.status === 403) {
      return 'Fuer diese Aktion fehlt die Berechtigung.';
    }

    if (error.status === 404) {
      return 'Der angeforderte Eintrag wurde nicht gefunden.';
    }

    if (error.status === 409) {
      return error.message || 'Diese Aktion steht im Konflikt mit vorhandenen Daten.';
    }

    if (error.status >= 500) {
      return 'Auf dem Server ist ein Fehler aufgetreten.';
    }

    return error.message || fallback || 'Die Anfrage ist fehlgeschlagen.';
  }

  function adminFetch(pfad, optionen) {
    const fetchOptionen = optionen || {};
    const istFormData = typeof FormData !== 'undefined' && fetchOptionen.body instanceof FormData;
    const headers = {
      Accept: 'application/json',
      ...baueAdminAuthHeader(),
      ...(fetchOptionen.headers || {})
    };

    if (Object.prototype.hasOwnProperty.call(fetchOptionen, 'body') && typeof fetchOptionen.body !== 'string' && !istFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      fetchOptionen.body = JSON.stringify(fetchOptionen.body);
    }

    return apiFetch(pfad, {
      ...fetchOptionen,
      headers: headers
    }).catch(function(error) {
      if (error && error.status === 401) {
        loescheAdminSession();
        meldeAdminSessionVerloren('unauthorized');
      }

      throw error;
    });
  }

  function adminLogin(username, password) {
    return apiFetch('/api/admin/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    }).then(function(session) {
      speichereAdminSession(session);
      return session;
    });
  }

  function adminLogout() {
    return adminFetch('/api/admin/logout', {
      method: 'POST'
    }).finally(function() {
      loescheAdminSession();
    });
  }

  // GET /api/admin/days
  // Erfolgsantwort: Array der 24 Admin-Tuerchen inkl. Einstellungen und zugewiesener Inhalte
  function ladeAdminTage() {
    return adminFetch('/api/admin/days');
  }

  // PUT /api/admin/days/:dayId
  // Aktualisiert Freischaltdatum und/oder Randomisierung eines Admin-Tuerchens.
  function aktualisiereAdminTag(dayId, daten) {
    return adminFetch(`/api/admin/days/${encodeURIComponent(dayId)}`, {
      method: 'PUT',
      body: daten || {}
    });
  }

  // POST /api/admin/days/:dayId/assign
  // Weist einem Admin-Tuerchen einen Content-Eintrag zu.
  function weiseContentAdminTagZu(dayId, contentId, sortOrder) {
    return adminFetch(`/api/admin/days/${encodeURIComponent(dayId)}/assign`, {
      method: 'POST',
      body: {
        content_id: contentId,
        sort_order: sortOrder || 0
      }
    });
  }

  // DELETE /api/admin/days/:dayId/assign/:contentId
  // Entfernt einen Content-Eintrag aus einem Admin-Tuerchen.
  function entferneContentVonAdminTag(dayId, contentId) {
    return adminFetch(
      `/api/admin/days/${encodeURIComponent(dayId)}/assign/${encodeURIComponent(contentId)}`,
      { method: 'DELETE' }
    );
  }

  // GET /api/admin/content
  // Erfolgsantwort: Array aller Content-Eintraege inkl. inaktiver Inhalte
  function ladeAdminContent() {
    return adminFetch('/api/admin/content');
  }

  // POST /api/admin/content
  // Erstellt einen neuen Content-Eintrag.
  function erstelleAdminContent(daten) {
    return adminFetch('/api/admin/content', {
      method: 'POST',
      body: daten || {}
    });
  }

  // PUT /api/admin/content/:id
  // Aktualisiert einen bestehenden Content-Eintrag.
  function aktualisiereAdminContent(contentId, daten) {
    return adminFetch(`/api/admin/content/${encodeURIComponent(contentId)}`, {
      method: 'PUT',
      body: daten || {}
    });
  }

  // DELETE /api/admin/content/:id
  // Loescht einen bestehenden Content-Eintrag.
  function loescheAdminContent(contentId) {
    return adminFetch(`/api/admin/content/${encodeURIComponent(contentId)}`, {
      method: 'DELETE'
    });
  }

  // POST /api/admin/upload
  // Laedt eine Datei per multipart/form-data hoch.
  function ladeAdminDateiHoch(datei) {
    const daten = new FormData();
    daten.append('file', datei);

    return adminFetch('/api/admin/upload', {
      method: 'POST',
      body: daten
    });
  }

  // GET /api/admin/years
  // Erfolgsantwort: Array aller Kalenderjahre inkl. aktiver Markierung
  function ladeAdminJahre() {
    return adminFetch('/api/admin/years');
  }

  // POST /api/admin/years
  // Erstellt ein neues Kalenderjahr und generiert die 24 Tuerchen.
  function erstelleAdminJahr(daten) {
    return adminFetch('/api/admin/years', {
      method: 'POST',
      body: daten || {}
    });
  }

  // PUT /api/admin/years/:id
  // Aktualisiert ein Kalenderjahr, z. B. um es als aktuelles Jahr zu setzen.
  function aktualisiereAdminJahr(yearId, daten) {
    return adminFetch(`/api/admin/years/${encodeURIComponent(yearId)}`, {
      method: 'PUT',
      body: daten || {}
    });
  }

  // DELETE /api/admin/years/:id
  // Loescht ein Kalenderjahr. Einige Backends erwarten statt der ID die Jahreszahl,
  // deshalb probieren wir bei 404 genau diesen Fallback.
  function loescheAdminJahr(jahr) {
    const id = jahr && typeof jahr === 'object' ? jahr.id : jahr;
    const jahrZahl = jahr && typeof jahr === 'object' ? jahr.year : null;

    return adminFetch(`/api/admin/years/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(function(error) {
      if (!jahrZahl || error.status !== 404 || String(jahrZahl) === String(id)) {
        throw error;
      }

      return adminFetch(`/api/admin/years/${encodeURIComponent(jahrZahl)}`, {
        method: 'DELETE'
      });
    });
  }

  // GET /api/health
  // Erfolgsantwort: Backend-Health-Status
  function getHealth() {
    return apiFetch('/api/health');
  }

  // GET /api/years/current
  // Erfolgsantwort: { id, year, is_current, start_date }
  function ladeAktuellesJahr() {
    return apiFetch('/api/years/current');
  }

  // GET /api/days
  // Erfolgsantwort: Array<{ day_number, unlock_date, is_unlocked }>
  // is_unlocked wird serverseitig berechnet
  function ladeTage() {
    return apiFetch('/api/days');
  }

  // GET /api/days/:dayNumber/content
  // Erfolgsantwort: {
  //   day_number: number,
  //   unlock_date: string,
  //   contents: Array<{ id, type, body, media_url }>
  // }
  // Moegliche Fehler:
  //   400 ungueltige Tuerchen-Nummer
  //   403 Tuerchen ist noch gesperrt
  //   404 Kalendertag nicht gefunden
  //   500 Serverfehler
  function ladeTuerchenInhalt(dayNumber) {
    const nummer = Number.parseInt(dayNumber, 10);

    if (Number.isNaN(nummer)) {
      return Promise.reject(
        new AdventskalenderApiError(
          'Die Tuerchen-Nummer ist ungueltig.',
          400,
          null
        )
      );
    }

    return apiFetch(`/api/days/${encodeURIComponent(nummer)}/content`);
  }

  window.AdventskalenderApi = {
    API_BASE_URL,
    AdventskalenderApiError,
    speichereAdminSession,
    ladeAdminSession,
    ladeAdminToken,
    istAdminSessionAbgelaufen,
    loescheAdminSession,
    meldeAdminSessionVerloren,
    baueAdminAuthHeader,
    fehlertextFuerApiFehler,
    adminFetch,
    adminLogin,
    adminLogout,
    ladeAdminTage,
    aktualisiereAdminTag,
    weiseContentAdminTagZu,
    entferneContentVonAdminTag,
    ladeAdminContent,
    erstelleAdminContent,
    aktualisiereAdminContent,
    loescheAdminContent,
    ladeAdminDateiHoch,
    ladeAdminJahre,
    erstelleAdminJahr,
    aktualisiereAdminJahr,
    loescheAdminJahr,
    getHealth,
    ladeAktuellesJahr,
    ladeTage,
    ladeTuerchenInhalt
  };
})(window);
