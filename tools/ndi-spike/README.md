# NDI-Spike: Empfang → FFmpeg → Short-HLS

Machbarkeits-Skript für PR 1 der NDI-Integration (`docs/ndi-ptz-plan.md`, B1). Sucht eine
NDI-Quelle, empfängt UYVY-Frames, schreibt sie über eine begrenzte Queue (Tiefe 3, älteste
Frames werden verworfen) in FFmpeg und erzeugt lokal Short-HLS (1-s-Segmente, 4 in der
Playlist, Keyframe jede Sekunde). Am Ende steht ein Summary-JSON mit Durchsatz, Drops und
CPU-Last.

Ein Auflösungswechsel der Quelle während des Laufs bricht mit Exit-Code 3 ab
(`abortReason` im Summary). Ein FFmpeg-Neustart würde die HLS-Sequenz zurücksetzen.

## Start gegen die Testquelle

Das Skript importiert `grandi` regulär und läuft damit im Site-Agent-Image (dort liegt
`grandi` in `/app/node_modules`) oder im Image der Testquelle. Einfachster Weg ohne
Host-Netz, alles in einem Container:

```bash
docker build -t mns-ndi-test-source tools/ndi-test-source
docker run -d --name ndi-src mns-ndi-test-source        # Sender + avahi
docker exec ndi-src mkdir -p /app/tools/ndi-spike
docker cp tools/ndi-spike/spike.mjs ndi-src:/app/tools/ndi-spike/
docker exec -e PRESET=720p30 -w /app/tools/ndi-spike ndi-src node spike.mjs
docker rm -f ndi-src
```

Im Site-Agent-Container: `tools/ndi-spike` nach `/app/tools/ndi-spike` mounten und
`node /app/tools/ndi-spike/spike.mjs` ausführen (Sender per `--network host` erreichbar).

## Umgebungsvariablen

| Variable       | Default               | Zweck                                               |
| -------------- | --------------------- | --------------------------------------------------- |
| `NDI_SOURCE`   | `TEST-CAM`            | Teilstring des Quellnamens (Timeout 15 s)           |
| `PRESET`       | `720p30`              | `preview` (Lowest, Quellgröße), `720p30`, `1080p30` |
| `ENCODER`      | `libx264`             | `libx264`, `h264_v4l2m2m` (Pi), `h264_vaapi`        |
| `NDI_EXTRA_IPS` | –                    | Komma-Liste von Quell-IPs, wenn mDNS-Discovery nicht greift |
| `DURATION_S`   | `20`                  | Laufzeit in Sekunden                                |
| `OUT_DIR`      | `./hls-out`           | Ausgabeverzeichnis (wird vorher geleert)            |
| `VAAPI_DEVICE` | `/dev/dri/renderD128` | Render-Node für `h264_vaapi`                        |

## Summary lesen

- `avgFps`: empfangene Frames pro Sekunde. Soll ≈ Quell-FPS.
- `framesDropped`: in der Queue verworfene Frames, weil FFmpeg nicht nachkam. Soll 0.
- `receiveTimeouts`: `receiver.video()` ohne Frame innerhalb 1 s (Quelle weg/Netz).
- `segmentsProduced`: Segmente insgesamt (Media-Sequence + gelistete). Bei 20 s ≈ 20.
- `agentCpuPctOfCore` / `ffmpegCpuPctOfCore`: CPU in % eines Kerns (Node-Prozess bzw.
  FFmpeg aus `/proc/<pid>/stat`). Über 100 % = mehr als ein Kern.
- `ffmpegExit.code`: 0 = Playlist sauber abgeschlossen.

Alle 2 s erscheint eine Zeile mit Empfangs-FPS, Drops, Queue-Füllstand und FFmpeg-`speed`
(< 1x heißt: Encoder zu langsam).

## Latenz messen

Die Testquelle blendet die Uhrzeit mit Millisekunden ein. `index.m3u8` aus `OUT_DIR` per
HTTP ausliefern (z. B. `npx serve`) und in einem HLS-Player öffnen, daneben eine Uhr
(z. B. https://time.is) mitfilmen oder abfotografieren. Differenz Overlay-Uhr zu Wanduhr =
Latenz Quelle → Player. Sender und Player brauchen dieselbe Zeitzone (`TZ`).

## Tests

```bash
node --test tools/ndi-spike/
```

---

NDI® is a registered trademark of Vizrt NDI AB. https://ndi.video
