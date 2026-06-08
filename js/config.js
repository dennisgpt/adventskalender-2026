// Produktionsbetrieb (THWS-Server): leerer String → Nginx proxied /api/ und /media/ auf demselben Host.
// Entwicklung lokal: Wert per Browser-Konsole überschreiben:
//   localStorage.setItem('ADVENTSKALENDER_API_BASE_URL', 'http://localhost:3000')
// oder Railway:
//   localStorage.setItem('ADVENTSKALENDER_API_BASE_URL', 'https://adventskalender-2026-production.up.railway.app')
window.ADVENTSKALENDER_API_BASE_URL = "";
