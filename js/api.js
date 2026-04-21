/**
 * api.js - API-Client fuer das Adventskalender-Backend.
 *
 * Diese Datei ist bewusst eigenstaendig und wird erst genutzt, wenn sie in
 * index.html eingebunden und aus kalender.js/inhalte.js aufgerufen wird.
 */

(function(window) {
  'use strict';

  const DEFAULT_API_BASE_URL = 'http://localhost:3000';
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

  /**
   * Laedt den Inhalt fuer ein bestimmtes Adventskalender-Tuerchen.
   *
   * Backend-Route:
   * GET /api/calendar/:year/day/:dayNumber
   *
   * Erfolgsantwort:
   * {
   *   year: number,
   *   dayNumber: number,
   *   unlockDate: string,
   *   contents: Array<{
   *     id: number,
   *     type: string,
   *     body: string | null,
   *     media_url: string | null,
   *     is_active: boolean,
   *     sort_order: number
   *   }>
   * }
   *
   * Moegliche Fehler:
   * 400 ungueltige Parameter
   * 403 Tuerchen ist noch gesperrt
   * 404 Kalenderjahr oder Kalendertag nicht gefunden
   * 500 Serverfehler
   */
  function ladeTuerchenInhalt(year, dayNumber) {
    const jahr = Number.parseInt(year, 10);
    const nummer = Number.parseInt(dayNumber, 10);

    if (Number.isNaN(jahr) || Number.isNaN(nummer)) {
      return Promise.reject(
        new AdventskalenderApiError(
          'Jahr oder Tuerchen-Nummer ist ungueltig.',
          400,
          null
        )
      );
    }

    return apiFetch(`/api/calendar/${encodeURIComponent(jahr)}/day/${encodeURIComponent(nummer)}`);
  }

  window.AdventskalenderApi = {
    API_BASE_URL,
    AdventskalenderApiError,
    ladeTuerchenInhalt
  };
})(window);
