# LG webOS Player – Installationsanleitung

Diese Anleitung beschreibt die Installation der Digital-Signage-App auf einem LG webOS TV.

## Voraussetzungen

- LG webOS TV (2020 oder neuer)
- Node.js auf dem Computer installiert
- Developer Mode auf dem TV aktiviert (siehe unten)
- Laufender Signage Server und Zugang zum Admin-UI (zum Koppeln des Screens)

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
ares-install --device mytv com.cbf.webos_1.0.0_all.ipk
```

---

## 6. App starten

```bash
ares-launch --device mytv com.cbf.webos
```

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
- DevTools öffnen: `ares-inspect --device mytv --app com.cbf.webos --open`

### „Screen lief und fragt plötzlich wieder nach Kopplung"
- Die Session ist weg: App neu installiert oder TV-Speicher geleert
- Im Admin-UI beim bestehenden Screen **Reparieren** wählen und den neuen Code eintragen — Name, Playlists und Zeitpläne bleiben erhalten

### App aktualisieren

```bash
ares-install --device mytv com.cbf.webos_1.0.0_all.ipk
ares-launch --device mytv com.cbf.webos
```
