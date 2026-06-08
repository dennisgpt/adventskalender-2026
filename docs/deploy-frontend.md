# N1b — Frontend auf THWS-Server deployen

Statische Frontend-Dateien (HTML / CSS / JS / img) nach
`/var/www/advent-frontend/` auf den THWS-Server übertragen.
Nginx (N1a) liefert sie als catch-all über Port 80 aus.

**Voraussetzungen**

- THWS-Netzwerk oder VPN aktiv
- SSH-Zugang zu `elsadi@10.10.103.15`
- Nginx bereits eingerichtet (I4 / N1a)
- Zielverzeichnis auf dem Server anlegen (einmalig):

```bash
ssh elsadi@10.10.103.15 "sudo mkdir -p /var/www/advent-frontend && sudo chown elsadi:www-data /var/www/advent-frontend && sudo chmod 755 /var/www/advent-frontend"
```

---

## Erstmalig & bei jeder Aktualisierung

```bash
# Vom Repo-Root ausführen (feature/frontend-integration oder main):
bash deploy/copy-frontend.sh
```

Das Script überträgt `index.html`, `css/`, `js/` und `img/` per rsync
auf den Server und entfernt dort nicht mehr vorhandene Dateien.

---

## Verifikation

```bash
# Gibt die ersten Zeilen der index.html zurück
curl -s http://10.10.103.15/ | head -10

# API-Verbindung testen
curl -s http://10.10.103.15/api/health

# Media-Pfad testen (liefert 404 wenn noch keine Datei vorhanden – das ist ok)
curl -o /dev/null -sw "%{http_code}\n" http://10.10.103.15/media/
```

---

## Lokale Entwicklung

Da `js/config.js` im Produktionsbetrieb einen leeren API-Base-URL setzt,
können Entwickler die URL lokal per Browser-Konsole überschreiben:

```js
// Railway (Staging)
localStorage.setItem('ADVENTSKALENDER_API_BASE_URL', 'https://adventskalender-2026-production.up.railway.app')

// Lokaler Backend-Dev-Server
localStorage.setItem('ADVENTSKALENDER_API_BASE_URL', 'http://localhost:3000')

// Zurücksetzen (= Produktionsverhalten)
localStorage.removeItem('ADVENTSKALENDER_API_BASE_URL')
```
