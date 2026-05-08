(function(window) {
  'use strict';

  const DEFAULT_API_BASE_URL = 'https://adventskalender-2026-production.up.railway.app/';
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

  function adminFetch(pfad, optionen) {
    const fetchOptionen = optionen || {};
    const headers = {
      Accept: 'application/json',
      ...baueAdminAuthHeader(),
      ...(fetchOptionen.headers || {})
    };

    if (Object.prototype.hasOwnProperty.call(fetchOptionen, 'body') && typeof fetchOptionen.body !== 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      fetchOptionen.body = JSON.stringify(fetchOptionen.body);
    }

    return apiFetch(pfad, {
      ...fetchOptionen,
      headers: headers
    }).catch(function(error) {
      if (error && error.status === 401) {
        loescheAdminSession();
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
    baueAdminAuthHeader,
    adminFetch,
    adminLogin,
    adminLogout,
    getHealth,
    ladeAktuellesJahr,
    ladeTage,
    ladeTuerchenInhalt
  };
})(window);
