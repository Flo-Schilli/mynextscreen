# LG webOS Player – Installationsanleitung

Diese Anleitung beschreibt die Installation der Digital-Signage-App auf einem LG webOS TV.

## Voraussetzungen

- LG webOS TV (2020 oder neuer)
- Node.js auf dem Computer installiert
- Developer Mode auf dem TV aktiviert (siehe unten)
- Laufender myNextScreen und Zugang zum Admin-UI (zum Koppeln des Screens)

---

## 1. Developer Mode auf dem LG TV aktivieren

1. TV-Einstellungen öffnen → **Allgemein** → **Über diesen TV**
2. Den angezeigten TV-Namen mehrmals klicken bis Developer Mode erscheint
3. TV neu starten
4. **Developer Mode App** öffnen → **Key Server** einschalten
5. Die angezeigte IP-Adresse notieren

---

## 2. webOS CLI installieren

```bash
npm install -g @webos-tools/cli
```

---

## 3. SSH-Config einrichten (empfohlen)

Da webOS einen älteren SSH-Client verwendet, müssen Legacy-Algorithmen explizit erlaubt werden. Folgenden Block in `~/.ssh/config` eintragen (IP und Key-Pfad anpassen):

```
Host LG-TV
    Hostname 192.168.x.x
    Port 9922
    User prisoner
    HostkeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
    IdentityFile ~/.ssh/LG-TV_webos
    IdentitiesOnly yes
```

Danach lässt sich der TV direkt per `ssh LG-TV` erreichen — und `ares-*`-Befehle nutzen diese Config automatisch.

---

## 4. TV als Gerät hinzufügen

```bash
ares-setup-device
```

Eingaben im Dialog:
- **Device name**: z. B. `mytv`
- **Device IP**: IP-Adresse aus dem Developer Mode
- **Port**: `9922` (Standard)
- **Username**: `prisoner` (Standard)
- **Authentication**: `password` → Passwort leer lassen (Enter)
- Als Standard-Gerät setzen: `yes`

---

## 5. App auf dem TV installieren

Lade die `.ipk`-Datei herunter (Button oben) und führe aus:

```bash
ares-install --device mytv com.mynextscreen.webos_1.0.0_all.ipk
```

---

## 6. App starten

```bash
ares-launch --device mytv com.mynextscreen.webos
```

### Fernstart ohne Developer Mode (SSAP)

TVs kennen keinen Autostart — nur Signage-Displays. Ersatz: die App von außen
per SSAP starten, LGs WebSocket-Fernsteuerung auf Port 3000 (`ws`) bzw. 3001
(`wss`, self-signed Zertifikat). Das Hilfsskript braucht keine npm-Pakete,
Node 22 bringt alles mit:

```bash
node player-applications/lg-tvos/tools/launch-tv.mjs --host 192.168.1.50
```

Beim ersten Lauf erscheint ein Pairing-Prompt auf dem TV. Nach der Bestätigung
liegt der `client-key` in `tools/.lgtv-key` (gitignored, Modus 600) und weitere
Starts laufen ohne Prompt.

Dauerbetrieb: `--watch` hält die Verbindung, beobachtet die Vordergrund-App und
startet die Signage-App neu, sobald etwas anderes läuft — als systemd-Service
auf dem Backend-Host der praktische Autostart-Ersatz.

```bash
node player-applications/lg-tvos/tools/launch-tv.mjs --host 192.168.1.50 --watch
```

Voraussetzungen auf dem TV: **Quick Start+** aktiv (sonst ist der Netzwerk-Stack
im Standby aus), für das Aufwecken zusätzlich **Über Netzwerk einschalten**
(Wake-on-LAN, vorher ein Magic Packet senden). `--help` listet alle Optionen.

### Developer-Mode-Session verlängern

Ohne Verlängerung läuft die Dev-Mode-Session ab und der TV entfernt die per
Developer Mode installierten Apps. `--extend-devmode` startet die Dev-Mode-App
mit `params.extend` — derselbe Weg, den der „Extend Session Time"-Button auf dem
TV nimmt — und holt danach die Signage-App zurück in den Vordergrund:

```bash
node player-applications/lg-tvos/tools/launch-tv.mjs --host 192.168.1.50 --extend-devmode
```

Kein SSH, kein Session-Token, kein Zugriff auf `/var/luna/preferences/devmode_enabled`
nötig — auf neueren Firmwares läuft die SSH-Session in einer Jail und kommt an
diese Datei ohnehin nicht heran.

> Der oft zitierte `GET https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=…`
> setzt **nur LGs Backend-Zähler** zurück. Der lokale Timer des TV läuft davon
> unbeeindruckt weiter — siehe
> [webosbrew/dev-manager-desktop#256](https://github.com/webosbrew/dev-manager-desktop/issues/256).

Ausführlich — SSAP, Wake-on-LAN, Dev-Mode-Session und die SSH-Stolperfallen:
[`tools/README.md`](tools/README.md).

---

## 7. App konfigurieren

Beim ersten Start öffnet sich automatisch das Einstellungs-Overlay:

1. **Server URL** eingeben (z. B. `https://signage.example.com`)
2. **Player URL** leer lassen (wird automatisch ermittelt)
3. **Speichern & Neu laden** klicken

Einen API Key gibt es nicht mehr. Die App lädt den Web-Player, der daraufhin einen
**sechsstelligen Kopplungscode** auf dem Bildschirm anzeigt.

---

## 8. Screen koppeln

Im Admin-UI **Screens → Screen hinzufügen** öffnen, Name, Auflösung und Standort
ausfüllen und den Code vom Fernseher eintragen. Der Code gilt wenige Minuten und
ist einmal einlösbar; läuft er ab, fordert der Player selbstständig einen neuen an.

Sobald der Code eingelöst ist, startet die Wiedergabe.

---

## Einstellungen erneut öffnen

Jederzeit die **Einstellungen**- oder **Blaue** Taste auf der Fernbedienung drücken.

---

## Fehlerbehebung

### „Device not found"
- TV eingeschaltet und im selben Netzwerk prüfen
- IP-Adresse in der Developer Mode App verifizieren
- `ares-setup-device` erneut ausführen

### „Player lädt nicht"
- Server URL auf korrekte Syntax prüfen (inkl. `https://`)
- Sicherstellen, dass der Server `player.ds.example.com` unter `PLAYER_BASE_URL` konfiguriert hat
- Server darf kein `X-Frame-Options: DENY` senden

### „Player zeigt einen Code, es passiert aber nichts"
- Der Code muss im Admin-UI unter **Screen hinzufügen** eingetragen werden (bei einem bestehenden Screen: **Reparieren**)
- Server vom TV aus erreichbar? Server URL inkl. `https://` prüfen
- DevTools öffnen: `ares-inspect --device mytv --app com.mynextscreen.webos --open`

### „Screen lief und fragt plötzlich wieder nach Kopplung"
- Die Session ist weg: App neu installiert oder TV-Speicher geleert
- Im Admin-UI beim bestehenden Screen **Reparieren** wählen und den neuen Code eintragen — Name, Playlists und Zeitpläne bleiben erhalten

### App aktualisieren

```bash
ares-install --device mytv com.mynextscreen.webos_1.0.0_all.ipk
ares-launch --device mytv com.mynextscreen.webos
```
