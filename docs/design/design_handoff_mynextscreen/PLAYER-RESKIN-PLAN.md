# Player Reskin (Phase 5) — Umsetzungsplan

## Scope & Ist-Stand

**Scope:** `apps/player/` — eine separate Angular-21-App, die auf den TV-Screens läuft.
Der Reskin beschränkt sich auf **visuelle Token-Angleichung**: Fonts, Surface-/Text-/Border-Farben und Radii aus dem neuen Design-System. Kein Rebuild von Komponenten-Logik, Routing oder Services.

**Aktueller Stand (`apps/player/src/styles.css`, 91 Zeilen):**
Die Datei wurde bereits im Zuge der bisherigen Phasen auf das neue Token-System vorausgerüstet:
- `@import "tailwindcss"` vorhanden (Zeile 1)
- `@theme`-Block mit Fonts, Radii und Status-Farben — **1:1 identisch** mit `tailwind-theme.css` (Zeilen 6–22)
- `:root`-Block mit dem kompletten dunklen Surface/Text/Border-Set — **1:1 identisch** mit dem Dark-Theme aus `tailwind-theme.css` (Zeilen 28–46)
- `@theme inline`-Mapping aller semantischen CSS-Variablen — vollständig (Zeilen 51–67)
- Basis (`* { box-sizing }`, `html/body`, `font-family`, `background-color`, `color`, `overflow:hidden`) korrekt gesetzt (Zeilen 72–90)

**`apps/player/src/index.html` (19 Zeilen):**
- Google Fonts `<link>` für Hanken Grotesk (400/500/600/700/800) + JetBrains Mono (400/500/600) mit `preconnect` — **bereits vorhanden** (Zeilen 9–14)
- **Fehlt:** `data-theme`, `data-accent`, `data-density` auf `<html>` — der Player benötigt diese Attribute als Fallback, damit Token-Werte aus `[data-accent]` und `[data-density]`-Selektoren greifen

**Komponenten-Styling — Ist-Stand:**

| Datei | Styling-Ansatz | Befund |
|---|---|---|
| `connection/disconnect-overlay.ts` | Tailwind-Utilities | nutzt `border-border`, `bg-surface-2/80`, `text-muted` — **bereits Token-konform** |
| `connection/connection-dialog.ts` | Component-interne `styles:`-Klassen | **nicht token-konform** — hartcodierte Hex-Werte, falscher Monospace-Font |
| `playback/status-overlay.component.ts` | Component-interne `styles:`-Klassen | **nicht token-konform** — hartcodierte Farben, `system-ui`-Font (nicht Hanken Grotesk) |
| `playback/playback.component.ts` | Tailwind-Utilities + Component-Styles | `text-text-muted` bereits token-konform; `no-content`/`content-layer`-Klassen zu prüfen |
| `app.ts` | minimale `:host`-Styles | vollständig token-neutral (nur `width/height: 100vw/vh`) |

---

## Offene Entscheidungen

**E-1: Accent-Token in `index.html` — welcher Default?**

Der Player-UI nutzt keine Accent-Farbe aktiv (kein Button-Gradient, kein Sidebar-Active). Dennoch greift der `[data-accent="indigo"]`-Selektor aus `styles.css` nur, wenn das Attribut auf `<html>` gesetzt ist — ohne das Attribut bleiben `--accent`, `--accent-soft`, `--accent-ring` undefiniert.

- Option A: `data-accent="indigo"` setzen (Konsistenz mit Frontend-Default, `--accent` ist definiert falls doch mal genutzt) — **Empfehlung**
- Option B: Kein `data-accent` setzen und `--accent`/`--accent-soft` direkt in `:root` mit Fallback-Werten hardcoden
- Option C: Accent-Attribute weglassen und nur die genutzten Tokens per direktem Wert deklarieren

**E-2: `data-density` auf `<html>` setzen?**

Der Player hat kein Density-Picker-UI; `--gap` und `--card-pad` werden durch die Player-Komponenten nicht verwendet. Ohne `data-density`-Attribut greift der `:root`-Fallback in `tailwind-theme.css` (`regular`), der im Player-`styles.css` aber **nicht** deklariert ist.

- Option A: `data-density="regular"` auf `<html>` setzen (sicherstellt korrekte `--gap`/`--card-pad`-Werte als Fallback, schadet nicht) — **Empfehlung**
- Option B: `--gap: 20px; --card-pad: 22px;` direkt in `:root` im Player-`styles.css` ergänzen (lokal explizit, kein HTML-Attribut nötig)

**E-3: Font-Migration in `connection-dialog.ts` — Tailwind-Utilities oder CSS-Klassen beibehalten?**

`connection-dialog.ts` nutzt umfangreiche `styles:`-interne Klassen (`.card`, `.code`, `.spinner` usw.). Die Tokens sind dort hartcodiert.

- Option A: Lediglich die hartcodierten Farb- und Font-Werte durch Token-Referenzen (`var(--text)`, `var(--text-muted)`, `var(--surface)`, `var(--border)`, `var(--font-mono)` etc.) ersetzen — Struktur der Klassen bleibt erhalten. Minimaler Eingriff, kein Template-Umbau. — **Empfehlung für Phase 5**
- Option B: Vollständige Migration auf Tailwind-Utilities (wie `disconnect-overlay.ts` bereits macht) — sauberer, aber größerer Umbau, Template-Änderungen nötig → eher Phase 6

**E-4: Fonts in `status-overlay.component.ts` — `font-family: system-ui` ersetzen?**

Das Status-Overlay (Debug-Overlay, via `I`-Taste sichtbar) setzt explizit `font-family: system-ui, -apple-system, sans-serif`. Das weicht vom globalen `font-family: var(--font-sans)` im `body` ab.

- Option A: `font-family`-Deklaration im `.status-overlay`-Block entfernen — erbt dann korrekt `Hanken Grotesk` vom `body`. — **Empfehlung**
- Option B: Explizit auf `var(--font-sans)` umstellen (dokumentiert die Absicht klarer)
- Option C: `font-family: var(--font-mono)` — das Overlay zeigt Debugging-Readouts (Screen-Name, Playlist, Item-Index) — würde gut zu `JetBrains Mono` passen, ist aber ein bewussteres Design-Statement

**E-5: `styles.css` — `--gap`/`--card-pad`/`--hover`/`--rail` ergänzen?**

Die aktuelle Player-`styles.css` deklariert `--hover`, `--rail`, `--bg-grad` und density-vars (`--gap`, `--card-pad`) **nicht**, weil der Player diese genutzten Tokens nicht braucht. Der `tailwind-theme.css`-Drop-in enthält sie jedoch alle.

- Option A: Nur ergänzen, was auch von Tailwind-Utilities im Player genutzt wird (`--hover` für `hover:`-Varianten in `disconnect-overlay`). `--rail`, `--bg-grad`, Density, Shadows weglassen. — **Empfehlung** (YAGNI)
- Option B: Vollständigen Dark-Theme-Block aus `tailwind-theme.css` 1:1 übernehmen (maximale Konsistenz, kein späteres Nachpflegen falls neue Komponenten hinzukommen)

---

## Soll/Ist-Vergleich

| Aspekt | Ist (Player) | Soll (Design-System) | Delta |
|---|---|---|---|
| **Font Sans** | `"Hanken Grotesk"` in `@theme` + `body` ✅ | `"Hanken Grotesk", system-ui, -apple-system, sans-serif` | Kein Delta in `styles.css`; `status-overlay` überschreibt mit `system-ui` ⚠️ |
| **Font Mono** | `"JetBrains Mono"` in `@theme` ✅ | `"JetBrains Mono", ui-monospace, monospace` | `connection-dialog` nutzt `'SFMono-Regular', ui-monospace, ...` statt `var(--font-mono)` ⚠️ |
| **Google Fonts `<link>`** | Vorhanden in `index.html` (Zeilen 9–14) ✅ | Hanken Grotesk 400–800, JetBrains Mono 400–600 | Kein Delta |
| **`data-theme` auf `<html>`** | Fehlt ⚠️ | `data-theme="dark"` | Kein `[data-theme]`-Selektor in Player-`styles.css` (nur `:root`) → funktioniert ohne Attribut, aber inkonsistent mit Frontend |
| **`data-accent` auf `<html>`** | Fehlt ⚠️ | `data-accent="indigo"` | `--accent*`-Vars undefiniert ohne Attribut; Player nutzt sie aktuell nicht aktiv, aber `@theme inline`-Mapping referenziert sie |
| **`data-density` auf `<html>`** | Fehlt ⚠️ | `data-density="regular"` | `--gap`/`--card-pad` nicht in Player-`:root` → potentiell undefiniert |
| **Surface-Farben (Dark)** | `--bg`, `--surface`, `--surface-2`, `--surface-3` in `:root` ✅ | `#080b12`, `#10151f`, `#161d2b`, `#1d2636` | Kein Delta — Werte identisch |
| **Text-Farben** | `--text: #eef2f8`, `--text-muted: #97a1b4`, `--text-faint: #5d6680` in `:root` ✅ | Identisch | Kein Delta |
| **Border-Farben** | `--border: rgb(255 255 255 / 0.07)`, `--border-strong: rgb(255 255 255 / 0.13)` in `:root` ✅ | Identisch | Kein Delta; Schreibweise `0.07` statt `.07` ist rein kosmetisch |
| **Status-Farben** | `--color-online`, `--color-warn`, `--color-offline`, `--color-info` in `@theme` ✅ | Identisch | Kein Delta |
| **Status-Dim-BGs** | `--online-dim`, `--warn-dim`, `--offline-dim`, `--info-dim` in `:root` ✅ | Identisch | Kein Delta |
| **Radii** | `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-xl: 22px` ✅ | Identisch | Kein Delta |
| **Radii in `connection-dialog`** | `.card: border-radius: 16px` (entspricht `--radius-lg`) ✅; `.icon: 12px` ✅; `.retry/input: 10px` (entspricht Buttons `rounded-[10px]`) ✅; `.error: 10px` ✅ | `--radius-lg` (cards), `--radius-md` (icons), Buttons `rounded-[10px]` | Delta: hartcodierte px statt `var(--radius-*)` — funktional korrekt, semantisch nicht token-konform ⚠️ |
| **Pairing-Code-Font** | `.code { font-family: 'SFMono-Regular', ui-monospace, ... }` ⚠️ | `var(--font-mono)` = JetBrains Mono | Falscher Monospace-Font — muss auf `var(--font-mono)` umgestellt werden |
| **Farben in `connection-dialog`** | `.title: #f1f5f9`, `.subtitle: #64748b`, `.code: #f1f5f9`, `.waiting: #94a3b8`, `.error: #f87171`, `.retry bg: #3b82f6` — alle hartcodiert ⚠️ | `var(--text)`, `var(--text-muted)`, `var(--text-faint)`, `--color-offline`, `--color-info` | Kein Tailwind-4-Token-Mapping; Werte weichen teils von den Design-Token-Hexcodes ab (z. B. `#f1f5f9` statt `#eef2f8` für `--text`) |
| **Farben in `status-overlay`** | `.status-connected: #4ade80`, `.status-reconnecting: #fbbf24`, `.status-disconnected: #f87171` — hartcodiert ⚠️ | `var(--color-online)` = `#2ecc71`, `var(--color-warn)` = `#f5a623`, `var(--color-offline)` = `#ef4757` | Falsche Hex-Werte! Grün/Gelb/Rot weichen vom Token-Set ab |
| **Font in `status-overlay`** | `font-family: system-ui, -apple-system, sans-serif` ⚠️ | `var(--font-sans)` (erbt von `body`) | Explizite Überschreibung muss entfernt werden |
| **`--hover`-Token** | Fehlt in `:root` ⚠️ | `rgb(255 255 255 / .04)` | `disconnect-overlay` nutzt `hover:`-Utilities; `bg-hover` (falls genutzt) würde undefiniert sein |
| **Scrollbar-Styles** | Fehlen | Optional (im `tailwind-theme.css` vorhanden) | Irrelevant: Player ist `overflow: hidden` |
| **Keyframes** | `spin` lokal in `connection-dialog` deklariert; `fadeIn` in `status-overlay` | Design-System: `fadeUp`, `fadeIn`, `pulseDot`, `ringPulse`, `spin` global in `styles.css` | Sinnvoll: globale Keyframes in `styles.css` ergänzen, lokale Duplikate entfernen |
| **Accent-Tokens (`--accent*`)** | Im `@theme inline`-Block referenziert, aber kein `[data-accent]`-Selektor in Player-`styles.css` ⚠️ | `[data-accent="indigo"]` etc. in `tailwind-theme.css` | Tokens undefiniert; `data-accent="indigo"` auf `<html>` + Selektor-Block in `styles.css` nötig |

**Betroffene Komponenten:**

| Komponente | Token-Konformität | Handlungsbedarf |
|---|---|---|
| `disconnect-overlay.ts` | Hoch ✅ | Keiner |
| `app.ts` | N/A (keine Farben) ✅ | Keiner |
| `playback.component.ts` | Gemischt — Tailwind-Utilities token-konform, interne Styles prüfen | Intern verwendete Farb-Hardcodes prüfen |
| `connection-dialog.ts` | Niedrig ⚠️ | Font-Mono, Farb-Vars, Radii-Vars einsetzen |
| `status-overlay.component.ts` | Niedrig ⚠️ | Font-Family entfernen, Status-Farben auf Tokens umstellen |

---

## Umsetzung

### Schritt 1 — `index.html`: HTML-Attribute ergänzen

**Datei:** `apps/player/src/index.html`, Zeile 2

Auf dem `<html>`-Tag die drei Attribute ergänzen:

```html
<html lang="en" data-theme="dark" data-accent="indigo" data-density="regular">
```

Begründung: `[data-accent="indigo"]`-Selektor in `styles.css` definiert `--accent`, `--accent-2`, `--accent-soft`, `--accent-ring`. Ohne das Attribut sind diese Vars undefiniert — auch wenn der Player sie aktuell nicht aktiv nutzt, referenziert `@theme inline` sie. `data-density="regular"` stellt `--gap`/`--card-pad` sicher. `data-theme="dark"` ist semantisch korrekt (Player ist permanent dunkel).

### Schritt 2 — `styles.css`: Fehlende Token-Blöcke ergänzen

**Datei:** `apps/player/src/styles.css`

2a. **Accent-Selektor-Block** nach dem `@theme`-Block einfügen (nach Zeile 22):

```css
/* Accent palettes — aktiviert durch data-accent auf <html> */
[data-accent="indigo"] { --accent: #6d6cf6; --accent-2: #a855f7; --accent-soft: rgb(109 108 246 / .14); --accent-ring: rgb(109 108 246 / .35); }
[data-accent="teal"]   { --accent: #14b8a6; --accent-2: #22d3ee; --accent-soft: rgb(20 184 166 / .14);  --accent-ring: rgb(20 184 166 / .35); }
[data-accent="amber"]  { --accent: #f59e0b; --accent-2: #f97316; --accent-soft: rgb(245 158 11 / .14);  --accent-ring: rgb(245 158 11 / .35); }
[data-accent="blue"]   { --accent: #3b82f6; --accent-2: #60a5fa; --accent-soft: rgb(59 130 246 / .14);  --accent-ring: rgb(59 130 246 / .35); }
```

2b. **`--hover`-Token** in den `:root`-Block ergänzen (nach `--track`):

```css
--hover: rgb(255 255 255 / .04);
```

2c. **`--accent*`-Mapping** im `@theme inline`-Block ergänzen (nach `--color-track`):

```css
--color-accent: var(--accent);
--color-accent-2: var(--accent-2);
--color-accent-soft: var(--accent-soft);
--color-hover: var(--hover);
```

2d. **Globale Keyframes** ans Ende von `styles.css` anfügen (damit lokale Duplikate in Komponenten entfernt werden können):

```css
@keyframes fadeUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes spin     { to { transform: rotate(360deg); } }
```

2e. **Dichte-Fallback** in `:root` ergänzen (Absicherung, auch wenn `data-density` auf `<html>` gesetzt wird):

```css
--gap: 20px;
--card-pad: 22px;
```

### Schritt 3 — `connection-dialog.ts`: Token-Migration der Component-Styles

**Datei:** `apps/player/src/app/connection/connection-dialog.ts`, `styles:`-Block

Folgende Ersetzungen in den Component-Styles (Struktur der Klassen bleibt erhalten, nur Werte werden tokenisiert):

| Selektor / Property | Ist | Soll |
|---|---|---|
| `.overlay { background }` | `rgba(0,0,0,0.92)` | `rgb(0 0 0 / .92)` (Wert passt, nur Syntax) |
| `.card { background }` | `linear-gradient(180deg, rgba(255,255,255,0.07)..., rgba(255,255,255,0.025)...)` | `linear-gradient(180deg, var(--border-strong) 0%, rgb(255 255 255 / .025) 100%)` |
| `.card { border }` | `1px solid rgba(255,255,255,0.1)` | `1px solid var(--border)` |
| `.card { border-radius }` | `16px` | `var(--radius-lg)` |
| `.icon { border-radius }` | `12px` | `var(--radius-md)` |
| `.icon { background }` | `rgba(59,130,246,0.15)` | `var(--info-dim)` |
| `.icon { color }` | `#3b82f6` | `var(--color-info)` |
| `.title { color }` | `#f1f5f9` | `var(--text)` |
| `.subtitle { color }` | `#64748b` | `var(--text-muted)` |
| `.code { font-family }` | `'SFMono-Regular', ui-monospace, ...` | `var(--font-mono)` |
| `.code { color }` | `#f1f5f9` | `var(--text)` |
| `.waiting { color }` | `#94a3b8` | `var(--text-muted)` |
| `.spinner { border }` | `2px solid rgba(148,163,184,0.3)` | `2px solid var(--track)` |
| `.spinner { border-top-color }` | `#3b82f6` | `var(--color-info)` |
| `.error { color }` | `#f87171` | `var(--color-offline)` |
| `.error { background }` | `rgba(239,68,68,0.1)` | `var(--offline-dim)` |
| `.error { border }` | `1px solid rgba(239,68,68,0.2)` | `1px solid rgb(239 71 87 / .2)` |
| `.error { border-radius }` | `10px` | `var(--radius-sm)` (8px, nächster passender Token; alternativ `rounded-[10px]` direkt lassen) |
| `.retry { background }` | `#3b82f6` | `var(--color-info)` |
| `.retry { border-radius }` | `10px` | `10px` (Buttons: `rounded-[10px]` laut Design — kein Standard-Token, Wert beibehalten) |
| `.retry:hover { background }` | `#2563eb` | `color-mix(in srgb, var(--color-info) 85%, #000)` oder Hex-Wert `#2563eb` beibehalten |
| `.advanced-toggle { color }` | `#64748b` | `var(--text-faint)` |
| `.advanced-toggle:hover { color }` | `#94a3b8` | `var(--text-muted)` |
| `.field label { color }` | `#64748b` | `var(--text-faint)` |
| `.field input { color }` | `#f1f5f9` | `var(--text)` |
| `.field input { background }` | `rgba(255,255,255,0.05)` | `var(--hover)` |
| `.field input { border }` | `1px solid rgba(255,255,255,0.1)` | `1px solid var(--border)` |
| `.field input { border-radius }` | `10px` | `10px` (Button-Radius, beibehalten) |
| `.field input::placeholder { color }` | `#475569` | `var(--text-faint)` |
| `.field input:focus { border-color }` | `#3b82f6` | `var(--color-info)` |
| `.field input:focus { background }` | `rgba(255,255,255,0.08)` | `rgb(255 255 255 / .08)` |
| `@keyframes spin` | lokal deklariert | **entfernen** (globaler Keyframe in `styles.css` nach Schritt 2d) |

### Schritt 4 — `status-overlay.component.ts`: Token-Migration

**Datei:** `apps/player/src/app/playback/status-overlay.component.ts`, `styles:`-Array

| Selektor / Property | Ist | Soll |
|---|---|---|
| `.status-overlay { font-family }` | `system-ui, -apple-system, sans-serif` | **Zeile entfernen** (erbt `var(--font-sans)` vom `body`) |
| `.status-overlay { color }` | `rgba(255,255,255,0.8)` | `var(--text-muted)` |
| `.status-overlay { background }` | `rgba(0,0,0,0.7)` | `rgb(0 0 0 / .7)` (Wert passt, kein Token — Overlay-spezifisches semi-transparentes Schwarz) |
| `.status-overlay { border }` | `1px solid rgba(255,255,255,0.1)` | `1px solid var(--border)` |
| `.status-label { color }` | `rgba(255,255,255,0.4)` | `var(--text-faint)` |
| `.status-connected { color }` | `#4ade80` | `var(--color-online)` (`#2ecc71`) |
| `.status-reconnecting { color }` | `#fbbf24` | `var(--color-warn)` (`#f5a623`) |
| `.status-disconnected { color }` | `#f87171` | `var(--color-offline)` (`#ef4757`) |
| `.stream-healthy { color }` | `#4ade80` | `var(--color-online)` |
| `.stream-degraded { color }` | `#fbbf24` | `var(--color-warn)` |
| `.stream-stopped { color }` | `#f87171` | `var(--color-offline)` |
| `@keyframes fadeIn` | lokal deklariert | **entfernen** (globaler Keyframe in `styles.css` nach Schritt 2d) |

### Schritt 5 — Verifikation

```bash
# Build + Typecheck + Lint
npx nx run-many -t lint typecheck build -p player

# Format-Check (Prettier — harter CI-Gate)
npx nx run player:format:check

# Tests
npx nx test player

# Visuell: Player-Dev-Server starten
npx nx serve player
# → http://localhost:4300
# Prüfen:
#   - Pairing-Dialog: Font Hanken Grotesk (DevTools → Computed → font-family)
#   - Pairing-Code: JetBrains Mono
#   - Status-Farben im Status-Overlay (I-Taste drücken): korrekte Token-Farben
#   - Disconnect-Button (oben rechts): weiterhin korrekt
```

---

## Betroffene Dateien

| Datei | Änderungstyp | Beschreibung |
|---|---|---|
| `apps/player/src/index.html` | Ergänzung (1 Zeile) | `data-theme="dark" data-accent="indigo" data-density="regular"` auf `<html>` |
| `apps/player/src/styles.css` | Ergänzung (~20 Zeilen) | Accent-Selektoren, `--hover`, `--accent*`-Mapping, Density-Fallback, globale Keyframes |
| `apps/player/src/app/connection/connection-dialog.ts` | Token-Migration (Styles-Block) | ~25 Wert-Ersetzungen; ein `@keyframes spin` entfernen |
| `apps/player/src/app/playback/status-overlay.component.ts` | Token-Migration (Styles-Array) | ~10 Wert-Ersetzungen; `font-family` + `@keyframes fadeIn` entfernen |

**Nicht angefasst (keine Änderung nötig):**
- `apps/player/src/app/connection/disconnect-overlay.ts` — bereits token-konform
- `apps/player/src/app/app.ts` — keine Farben/Fonts
- `apps/player/src/app/playback/playback.component.ts` — Tailwind-Utilities token-konform; interne Styles nur prüfen, falls explizite Farb-Hardcodes vorhanden
- `apps/player/src/app/playback/live-stream-view.component.ts` — Video-Fullscreen, keine UI-Farben
- `apps/player/src/app/playback/group-play-view.component.ts` — Video-Fullscreen, keine UI-Farben
- Alle Services, Guards, Models, Specs

---

## Risiken / Hinweise

**R-1: Status-Farb-Abweichung hat visuellen Effekt.**
`status-overlay` nutzt `#4ade80` (Tailwind green-400) statt Design-Token `#2ecc71` (Emerald-Ton). Nach Migration wird das Grün leicht dunkler/satter. Ebenso Gelb (`#fbbf24` → `#f5a623`) und Rot (`#f87171` → `#ef4757`). Das ist beabsichtigt — Konsistenz mit dem Token-System.

**R-2: `@keyframes spin` in `connection-dialog` vs. globaler Keyframe.**
Angular-Component-Styles sind per View-Encapsulation automatisch gescoped — der lokale `@keyframes spin`-Name kollidiert nicht mit dem globalen. Nach Entfernung des lokalen Keyframes greift der globale aus `styles.css`. Nur entfernen, wenn Schritt 2d (`styles.css` Keyframes) **vorher** committed ist.

**R-3: Player ist `overflow: hidden` — kein Scrollbar-Styling nötig.**
Die Scrollbar-Styles aus `tailwind-theme.css` müssen **nicht** in den Player übernommen werden.

**R-4: Kein Light-Theme für den Player.**
Der Player ist permanent im Dark-Mode. Ein `[data-theme="light"]`-Block wird nicht eingefügt und ist auch nicht vorgesehen. `data-theme="dark"` wird auf `<html>` gesetzt, die `:root`-Deklaration im Player-`styles.css` ist der primäre Anker.

**R-5: `playback.component.ts` — interne Styles vor Abschluss prüfen.**
Die Datei wurde in Phase 5 nicht vollständig gelesen (nur die ersten 60 Zeilen). Vor dem Commit sollte der vollständige `styles:`-Block des `PlaybackComponent` auf hartcodierte Farb-Werte geprüft werden. Tailwind-Utilities (`text-text-muted` etc.) sind bereits token-konform.

**R-6: `connection-dialog.ts` — `.retry`-Hover-Farbe.**
`#2563eb` (Tailwind blue-600) ist der Hover-State für den blauen Button. Es gibt keinen `--color-info-hover`-Token. Optionen: Wert `#2563eb` beibehalten (einfach), oder `color-mix()` nutzen. Empfehlung: `#2563eb` beibehalten — der Unterschied ist minimal und kein Token dafür vorgesehen.

**R-7: Prettier vor Commit.**
Der Player-`styles.css` nutzt `0.07` statt `.07` (mit führender Null) in den `rgb()`-Werten. Prettier normalisiert das nicht — die Schreibweise ist konsistent innerhalb der Datei zu halten. Die neu eingefügten Zeilen sollten dem bestehenden Stil folgen oder konsequent auf `.07`-Schreibweise (wie in `tailwind-theme.css`) vereinheitlicht werden.
