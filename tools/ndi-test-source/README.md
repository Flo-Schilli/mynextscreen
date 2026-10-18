# NDI-Testquelle (Fake-Kamera)

Sendet ein NDI-Testbild (`testsrc2`) mit eingeblendeter Uhrzeit (`HH:MM:SS.mmm`) unter dem
Namen `TEST-CAM`. Grundlage für die Entwicklung des NDI-Live-Stream-Pfads ohne Kamera
(siehe `docs/ndi-ptz-plan.md`, Abschnitt „Testen ohne Kamera").

> **Nur Labor/Entwicklung — nicht im Venue-LAN betreiben.** Die Testquelle erscheint dort als
> fremde NDI-Quelle mit Kameranamen (`TEST-CAM`) und kann mit echten Kameras verwechselt werden.

Eigenständiges Dev-Tool mit eigenem `package.json` (nur `grandi`). Gehört nicht zum
Root-Workspace und wird nur im eigenen Docker-Image installiert.

## Build

```bash
docker build -t mns-ndi-test-source tools/ndi-test-source
```

## Start

NDI-Discovery läuft über mDNS. Sender und Empfänger müssen im selben L2-Netz liegen, daher
`--network host`.

**Modus A: avahi im Container** (Default, `START_AVAHI=1`). Für Hosts ohne eigenes avahi:

```bash
docker run --rm --network host -e TZ=Europe/Zurich mns-ndi-test-source
```

**Modus B: avahi des Hosts.** Läuft auf dem Host bereits `avahi-daemon`, kollidiert ein
zweiter Daemon im Container auf UDP 5353. Dann den D-Bus-Socket des Hosts mounten:

```bash
docker run --rm --network host -e START_AVAHI=0 -e TZ=Europe/Zurich \
  -v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket \
  mns-ndi-test-source
```

**Ohne Host-Netz** (nur lokaler Test): Empfänger im selben Container starten
(`docker exec`), siehe `tools/ndi-spike/README.md`.

## Konfiguration

| Variable      | Default    | Zweck                                          |
| ------------- | ---------- | ---------------------------------------------- |
| `NDI_NAME`    | `TEST-CAM` | NDI-Quellname                                  |
| `WIDTH`       | `1280`     | Breite in Pixel                                |
| `HEIGHT`      | `720`      | Höhe in Pixel                                  |
| `FPS`         | `30`       | Bildrate                                       |
| `START_AVAHI` | `1`        | `0` = avahi des Hosts über D-Bus-Socket nutzen |
| `TZ`          | UTC        | Zeitzone der eingeblendeten Uhr                |

Die Uhr startet beim Start mit der lokalen Uhrzeit und läuft über die Stream-Zeitstempel
(`-re`) weiter. Für Latenzmessungen über Stunden den Container neu starten.

---

NDI® is a registered trademark of Vizrt NDI AB. https://ndi.video
