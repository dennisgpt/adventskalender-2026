(function(window) {
  'use strict';

  const DEFAULT_API_BASE_URL = 'https://adventskalender-2026-production.up.railway.app/';
  const API_BASE_URL =
    window.ADVENTSKALENDER_API_BASE_URL ||
    localStorage.getItem('ADVENTSKALENDER_API_BASE_URL') ||
    DEFAULT_API_BASE_URL;

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
    getHealth,
    ladeAktuellesJahr,
    ladeTage,
    ladeTuerchenInhalt
  };
})(window);
