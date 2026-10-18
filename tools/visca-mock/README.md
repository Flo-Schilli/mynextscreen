# VISCA-Mock

Kleiner Kameraersatz für den Laboreinsatz. Dekodiert VISCA-Befehle und loggt sie lesbar.
Keine Abhängigkeiten, nur Node.js (ESM).

```bash
node tools/visca-mock/mock.mjs          # Klartext-Log
node tools/visca-mock/mock.mjs --json   # ein JSON-Objekt pro Befehl
node --test tools/visca-mock/           # Tests des Decoders
```

| Protokoll | Standardport | Umgebungsvariable | Framing |
| --------- | ------------ | ----------------- | ------- |
| `visca_udp` | 52381 | `VISCA_UDP_PORT` | VISCA-over-IP mit 8-Byte-Header; beantwortet RESET sowie jeden Befehl mit ACK (`90 41 FF`) und Completion (`90 51 FF`) mit derselben Sequenznummer |
| `visca_tcp` | 5678 | `VISCA_TCP_PORT` | rohes VISCA, ACK und Completion direkt zurück |

Beispielzeilen: `pan_tilt left pan=8 tilt=6`, `zoom in speed=3`, `home`, `preset_recall 2`,
`stop` (Pan/Tilt-Stopp), `zoom_stop`, `reset`. Unbekannte Nachrichten erscheinen als Hex.

Im Dashboard als Kamera-Host die IP des Rechners eintragen, auf dem der Mock läuft, und das
passende Protokoll wählen. Das Tool ist nur für Entwicklung und Labor gedacht.
