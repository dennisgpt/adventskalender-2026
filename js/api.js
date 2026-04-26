(function(window) {
    'use strict';

    const API_BASE_URL =
      window.ADVENTSKALENDER_API_BASE_URL ||
      localStorage.getItem('ADVENTSKALENDER_API_BASE_URL') ||
      'http://localhost:3000';

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

    // GET /api/years/current
    // Erfolgsantwort: { id, year, is_current, start_date }
    function ladeAktuellesJahr() {
      return apiFetch('/api/years/current');
    }

    // GET /api/days
    // Erfolgsantwort: Array<{ day_id, day_number, unlock_date, year_id }>
    function ladeTage() {
      return apiFetch('/api/days');
    }
    // GET /api/days/:dayNumber/content
    // Erfolgsantwort: {
    //   day_number: number,
    //   unlock_date: string,
    //   contents: Array<{ id, type, body, media_url }>
    // }
    // Mögliche Fehler:
    //   400 ungültige Türchen-Nummer
    //   403 Türchen ist noch gesperrt
    //   404 Kalendertag nicht gefunden
    //   500 Serverfehler
    function ladeTuerchenInhalt(dayNumber) {
      const nummer = Number.parseInt(dayNumber, 10);

      if (Number.isNaN(nummer)) {
        return Promise.reject(
          new AdventskalenderApiError(
            'Die Türchen-Nummer ist ungültig.',
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
      ladeAktuellesJahr,
      ladeTage,
      ladeTuerchenInhalt
    };
  })(window);
