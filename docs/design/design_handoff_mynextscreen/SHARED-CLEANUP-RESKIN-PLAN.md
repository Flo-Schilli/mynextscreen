# Shared Cleanup — Umsetzungsplan

> **Scope:** `apps/frontend/src/app/shared/` — ausschließlich Token-Migration
> von alten `var(--color-*)` Referenzen auf die neuen Design-System-Token
> (`tailwind-theme.css`). Kein Verhaltens- oder Layout-Wechsel.
>
> **Canonical-Quellen:** `docs/design/design_handoff_mynextscreen/tailwind-theme.css`
> (Token-Definitionen) und `design-tokens.md` (semantische Beschreibung).
>
> **Aktueller Status:** 5 Dateien verwenden noch alte `var(--color-bg-*)`/
> `var(--color-text-*)` Namenskonventionen, die im neuen Design-System nicht
> existieren:
>
> | # | Datei | Alte Tokens (Anzahl Vorkommen) |
> |---|-------|-------------------------------|
> | 1 | `apps/frontend/src/app/shared/version-badge.ts` | 3 Vorkommen (`--color-bg-tertiary`, `--color-text-secondary`, `--color-border`) |
> | 2 | `apps/frontend/src/app/shared/usage-bar.ts` | 5 Vorkommen (`--color-text-secondary`, `--color-text-muted` ×2, `--color-bg-tertiary`, `--color-accent`) |
> | 3 | `apps/frontend/src/app/shared/selection/selection-checkbox.ts` | 2 Vorkommen (`--color-accent` ×2) |
> | 4 | `apps/frontend/src/app/shared/selection/bulk-action-toolbar.ts` | 8 Vorkommen (`--color-bg-secondary`, `--color-border` ×2, `--color-shadow`, `--color-text-primary` ×2, `--color-accent`, `--color-bg-tertiary`) |
> | 5 | `apps/frontend/src/app/shared/selection/select-all-checkbox.ts` | 2 Vorkommen (`--color-accent` ×2) |
>
> Restliche Shared-Dateien (`toast/toast-container.ts`, `selection/bulk-confirm-dialog.ts`,
> `storage-usage-bars.ts`, `safe-html.pipe.ts`, `format-bytes.ts`) verwenden
> **keine** alten Tokens und bleiben unverändert.

---

## Offene Entscheidungen

### E-1 — `--color-bg-secondary` in `bulk-action-toolbar.ts` (Zeile 54)

**Kontext:** Die Bulk-Action-Toolbar ist `position: sticky; bottom: 0` —
ein schwimmender Aktionsriegel, der über dem Seiteninhalt klebt. Das alte
Token `--color-bg-secondary` sollte eine mittlere Ebene zwischen Background
und Surface darstellen.

**Optionen:**

- **A — `var(--surface-2)`** (`#161d2b` dark / `#f5f7fc` light): Etwas heller
  als `--surface`. Passt semantisch als „erhöhte Schicht" über dem Content-
  Bereich. **Empfehlung.**
- **B — `var(--surface)`** (`#10151f` dark / `#ffffff` light): Passt wenn die
  Toolbar klar vom Hintergrund abgrenzen soll ohne zu stark aufzufallen.
- **C — `var(--surface-3)`** (`#1d2636` dark / `#eceff7` light): Stärkste
  Abhebung — evtl. zu kontrastreich für eine Toolbar.

**Empfehlung: Option A (`--surface-2`)** — semantisch die naheliegendste
„sekundäre Fläche", genug Kontrast zum Content darunter ohne zu dominant zu sein.

### E-2 — `--color-shadow` in `bulk-action-toolbar.ts` (Zeile 57)

**Kontext:** `box-shadow: 0 -2px 8px var(--color-shadow)` — ein Aufwärts-
Schatten der Toolbar zum Inhalt hin. Das alte Token `--color-shadow` enthielt
einen RGBA-Wert (nicht im neuen Design-System als Variable vorhanden).

**Neue Token-Palette:** `tailwind-theme.css` definiert `--shadow` und
`--shadow-lg` als fertige `box-shadow`-Strings (z. B.
`0 18px 40px -24px rgb(0 0 0 / .8)`), **nicht** als reine Farbwerte.
Kein äquivalenter reiner Farb-Token vorhanden.

**Optionen:**

- **A — Literalwert `rgb(0 0 0 / 0.3)` (dark-freundlich):** Einfachster Fix,
  hardgecodet aber semantisch vertretbar für Schatten.
- **B — `var(--border)`:** Nutzt den schwachen Border-Farbton als Schattenfarbe —
  sehr dezent, konsistent mit dem System. **Empfehlung.**
- **C — Ganzen `box-shadow`-String ersetzen durch** `box-shadow: 0 -4px 16px -4px rgb(0 0 0 / .4)` — freier Wert, analog zu `--shadow` aus der CSS aber nach oben gerichtet.

**Empfehlung: Option B (`var(--border)`)** — der Border-Ton ist das schwächste
existierende „Trenn-Signal" im System und macht den Schatten diskret ohne
einen hardcodierten RGBA-Wert einzuführen. Alternativ Option C wenn ein
stärkerer visueller Stapel-Effekt gewünscht wird.

### E-3 — `--color-text-secondary` in `version-badge.ts` (Zeile 30) und `usage-bar.ts` (Zeile 49)

**Kontext:** `--color-text-secondary` ist ein mittlerer Text-Ton (heller als
Muted, dunkler als Primary). Das neue System hat nur `--text` (primär),
`--text-muted` (`#97a1b4` dark) und `--text-faint` (`#5d6680` dark).

**Optionen:**

- **A — `var(--text-muted)`** (`#97a1b4` dark / `#5a6577` light): Passt
  semantisch für Labels und Beschriftungen zweiter Ordnung. **Empfehlung.**
- **B — `var(--text-faint)`** (`#5d6680` dark / `#93a0b3` light): Für noch
  dezentere Metadaten (z. B. Overline-Labels).

**Empfehlung: Option A (`--text-muted`)** — `version-badge` und `usage-label`
sind UI-Metainfo, keine Primärinhalte, aber noch gut lesbar sein müssen.
`--text-muted` entspricht der „zweiten Text-Ebene" des Systems.

---

## Token-Mapping

> Alle neuen Token verifiziert gegen `tailwind-theme.css` (`:root`/`@theme inline`-Block).
> Spalte „CSS-Variable direkt" = Referenz via `var(--name)`.
> Spalte „Tailwind-Utility" = äquivalente Klasse (wenn anwendbar, für künftige Refactorings).

| Alter Token (wird verwendet) | Neuer Token | CSS-Variable direkt | Tailwind-Utility | Anmerkung |
|---|---|---|---|---|
| `--color-accent` | `--accent` | `var(--accent)` | `text-accent` / `bg-accent` | In `@theme inline` als `--color-accent: var(--accent)` gemappt — kein Wechsel nötig wenn Tailwind-Util genutzt würde. Als direkter `var()`-Call bleibt `var(--accent)` korrekt. |
| `--color-border` | `--border` | `var(--border)` | `border-border` | In `@theme inline` als `--color-border: var(--border)` — direkter `var(--border)` ist korrekt. |
| `--color-bg-tertiary` | `--surface-3` | `var(--surface-3)` | `bg-surface-3` | Dritte Flächen-Ebene (`#1d2636` dark / `#eceff7` light). |
| `--color-bg-secondary` | `--surface-2` | `var(--surface-2)` | `bg-surface-2` | Zweite Flächen-Ebene. Offene Entscheidung E-1 — Empfehlung: `--surface-2`. |
| `--color-text-primary` | `--text` | `var(--text)` | `text-text` | Primäre Textfarbe (`#eef2f8` dark / `#131a27` light). |
| `--color-text-secondary` | `--text-muted` | `var(--text-muted)` | `text-muted` | Offene Entscheidung E-3 — Empfehlung: `--text-muted`. |
| `--color-text-muted` | `--text-muted` | `var(--text-muted)` | `text-muted` | Direktes 1:1-Äquivalent. |
| `--color-shadow` | *(kein Äquivalent)* | `var(--border)` | — | Offene Entscheidung E-2 — kein reiner Farb-Shadow-Token im System. Empfehlung: `var(--border)`. |

**Hinweis zu `--color-accent`:** Im `@theme inline`-Block von `tailwind-theme.css`
ist `--color-accent: var(--accent)` definiert. Das bedeutet: ein direkter
`var(--color-accent)` würde über die Tailwind-`@theme`-Schicht funktionieren
**wenn** Tailwind eingebunden ist. Dennoch ist `var(--accent)` die saubere,
design-system-konforme Referenz (direkt in `:root` / `[data-accent]` definiert)
und sollte bevorzugt werden, um keine Abhängigkeit von Tailwinds Compile-Prozess
zu haben.

---

## Betroffene Dateien

### 1. `apps/frontend/src/app/shared/version-badge.ts`

Betroffen: CSS-Block innerhalb von `styles: \`...\`` (Zeilen 22–37).

| Zeile | Alter Token | Neuer Token |
|-------|-------------|-------------|
| 29 | `var(--color-bg-tertiary)` | `var(--surface-3)` |
| 30 | `var(--color-text-secondary)` | `var(--text-muted)` _(E-3)_ |
| 31 | `var(--color-border)` | `var(--border)` |

**Kontext:** Kleines Versionsbadge im Sidebar-Rail. `--surface-3` liefert
einen dezent erhöhten Hintergrund; `--text-muted` entspricht der Label-Semantik.

---

### 2. `apps/frontend/src/app/shared/usage-bar.ts`

Betroffen: CSS-Block innerhalb von `styles: \`...\`` (Zeilen 34–86).

| Zeile | Alter Token | Neuer Token |
|-------|-------------|-------------|
| 49 | `var(--color-text-secondary)` | `var(--text-muted)` _(E-3)_ |
| 53 | `var(--color-text-muted)` | `var(--text-muted)` |
| 57 | `var(--color-bg-tertiary)` | `var(--surface-3)` |
| 68 | `var(--color-accent)` | `var(--accent)` |
| 84 | `var(--color-text-muted)` | `var(--text-muted)` |

**Kontext:** Usage-Balken für Storage-Anzeige. `--surface-3` als Track-Hintergrund
(inaktiver Balken-Bereich) ist semantisch korrekt. `--accent` für die Füllfarbe
folgt dem Design-System (accent-farbe ist theme- und nutzerabhängig).

**Hinweis:** Die Warning/Danger-Füllfarben (Zeilen 77–82, `#f59e0b` und `#ef4444`)
sind **keine** alten Tokens — sie sind Literalwerte. Im neuen Design-System gibt
es `--color-warn: #f5a623` und `--color-offline: #ef4757` als Theme-unabhängige
Status-Farben. Diese könnten in einer Folge-Aufgabe auf `var(--warn)` / `var(--offline)`
umgestellt werden, sind aber **nicht** Gegenstand dieser Migration.

---

### 3. `apps/frontend/src/app/shared/selection/selection-checkbox.ts`

Betroffen: CSS-Block innerhalb von `styles: \`...\`` (Zeilen 16–29).

| Zeile | Alter Token | Neuer Token |
|-------|-------------|-------------|
| 21 | `var(--color-accent)` | `var(--accent)` |
| 26 | `var(--color-accent)` | `var(--accent)` |

**Kontext:** Checkbox-Tint (`accent-color`) und Focus-Ring. Beide Male semantisch
identisch — Accent-Farbe folgt dem gesetzten `data-accent`-Attribut.

---

### 4. `apps/frontend/src/app/shared/selection/bulk-action-toolbar.ts`

Betroffen: CSS-Block innerhalb von `styles: \`...\`` (Zeilen 46–143).

| Zeile | Alter Token | Neuer Token |
|-------|-------------|-------------|
| 54 | `var(--color-bg-secondary)` | `var(--surface-2)` _(E-1)_ |
| 55 | `var(--color-border)` | `var(--border)` |
| 57 | `var(--color-shadow)` | `var(--border)` _(E-2)_ |
| 76 | `var(--color-text-primary)` | `var(--text)` |
| 83 | `var(--color-accent)` | `var(--accent)` |
| 121 | `var(--color-bg-tertiary)` | `var(--surface-3)` |
| 122 | `var(--color-text-primary)` | `var(--text)` |
| 126 | `var(--color-border)` | `var(--border)` |

**Kontext:** Sticky Bulk-Action-Toolbar am Seitenende. Komplexeste Datei mit
8 Vorkommen und zwei offenen Entscheidungen (E-1, E-2). `.btn-danger`-Klasse
(Zeilen 107–117 im Template, aber kein Color-Token in den Styles) ist nicht betroffen.

---

### 5. `apps/frontend/src/app/shared/selection/select-all-checkbox.ts`

Betroffen: CSS-Block innerhalb von `styles: \`...\`` (Zeilen 17–30).

| Zeile | Alter Token | Neuer Token |
|-------|-------------|-------------|
| 22 | `var(--color-accent)` | `var(--accent)` |
| 27 | `var(--color-accent)` | `var(--accent)` |

**Kontext:** Identisch zu `selection-checkbox.ts` — Checkbox-Tint und Focus-Ring.

---

## Umsetzung

> Voraussetzung: Offene Entscheidungen E-1, E-2, E-3 sind geklärt (oder die
> Empfehlungen werden übernommen). Kein Build nötig vor dem Start — nur Text-Ersetzung.

### Schritt 1 — Offene Entscheidungen bestätigen

Empfehlungen aus diesem Plan durchlesen und bestätigen oder abweichende Werte festlegen:
- E-1: `--color-bg-secondary` → `--surface-2` (oder Alternative)
- E-2: `--color-shadow` → `var(--border)` (oder Literalwert)
- E-3: `--color-text-secondary` → `--text-muted` (oder `--text-faint`)

### Schritt 2 — `version-badge.ts` migrieren

Datei: `apps/frontend/src/app/shared/version-badge.ts`

Drei Ersetzungen in den `styles:`-Block:
```
var(--color-bg-tertiary)    → var(--surface-3)
var(--color-text-secondary) → var(--text-muted)
var(--color-border)         → var(--border)
```

### Schritt 3 — `usage-bar.ts` migrieren

Datei: `apps/frontend/src/app/shared/usage-bar.ts`

Fünf Ersetzungen in den `styles:`-Block:
```
var(--color-text-secondary) → var(--text-muted)   (Zeile 49)
var(--color-text-muted)     → var(--text-muted)   (Zeilen 53, 84)
var(--color-bg-tertiary)    → var(--surface-3)    (Zeile 57)
var(--color-accent)         → var(--accent)        (Zeile 68)
```

### Schritt 4 — `selection-checkbox.ts` migrieren

Datei: `apps/frontend/src/app/shared/selection/selection-checkbox.ts`

Zwei Ersetzungen:
```
var(--color-accent) → var(--accent)   (Zeilen 21, 26)
```

### Schritt 5 — `select-all-checkbox.ts` migrieren

Datei: `apps/frontend/src/app/shared/selection/select-all-checkbox.ts`

Zwei Ersetzungen (identisch zu Schritt 4):
```
var(--color-accent) → var(--accent)   (Zeilen 22, 27)
```

### Schritt 6 — `bulk-action-toolbar.ts` migrieren

Datei: `apps/frontend/src/app/shared/selection/bulk-action-toolbar.ts`

Acht Ersetzungen (abhängig von E-1 und E-2):
```
var(--color-bg-secondary) → var(--surface-2)    (Zeile 54)  [E-1]
var(--color-border)       → var(--border)        (Zeilen 55, 126)
var(--color-shadow)       → var(--border)        (Zeile 57)  [E-2]
var(--color-text-primary) → var(--text)          (Zeilen 76, 122)
var(--color-accent)       → var(--accent)        (Zeile 83)
var(--color-bg-tertiary)  → var(--surface-3)    (Zeile 121)
```

### Schritt 7 — Visuelle Verifikation

Nach allen Ersetzungen:
1. Dev-Server starten (`npx nx serve frontend`)
2. Alle Seiten aufrufen, auf denen die Shared-Komponenten erscheinen:
   - Version-Badge: Sidebar-Rail (kollabiert und expandiert)
   - Usage-Bar: Settings → Organisation → Storage-Sektion
   - Selection-Checkboxes + Bulk-Action-Toolbar: Screens-Liste und Content-Liste (mehrere Items auswählen)
3. Theme wechseln (dark ↔ light) und prüfen, dass Tokens korrekt schalten
4. Accent wechseln und prüfen, dass Checkbox-Tint + Accent-Füllfarbe folgen

### Schritt 8 — Lint + Format-Check

```bash
npx nx lint frontend
npx nx run frontend:format:check
```

Nur CSS-in-TypeScript geändert → kein TypeScript-Typfehler zu erwarten.

---

## Risiken / Hinweise

### R-1 — `--color-accent` war im `@theme inline`-Block definiert

`tailwind-theme.css` Zeile 136: `--color-accent: var(--accent)`. Das bedeutet,
`var(--color-accent)` würde theoretisch über die `@theme`-Schicht aufgelöst.
Die Migration auf `var(--accent)` ist dennoch korrekt und vorzuziehen: sie
bindet direkt an den Quell-Token aus `:root`/`[data-accent]` ohne Tailwind-
Indirektion. Kein Regressionsrisiko.

### R-2 — `--color-border` war im `@theme inline`-Block definiert

Analog zu R-1: `--color-border: var(--border)` (Zeile 129). Die Migration auf
`var(--border)` ist sicher und bevorzugt.

### R-3 — Keine automatischen Tests für visuelle Token-Korrektheit

Die Shared-Komponenten haben Unit-Tests (`*.spec.ts`), die das Verhalten testen
(Selection-Logic, Format-Pipes, etc.), aber keine CSS-Wert-Assertions.
Token-Korrektheit muss visuell (Schritt 7) verifiziert werden.

### R-4 — `--color-shadow` hat kein direktes Äquivalent

Wie in E-2 dokumentiert: Das neue System definiert `--shadow` und `--shadow-lg`
als fertige `box-shadow`-Strings, nicht als pure Farbwerte. Die Migration auf
`var(--border)` für den `box-shadow: 0 -2px 8px …`-Wert ist ein pragmatischer
Kompromiss. Alternativ kann der Wert komplett als Literal geschrieben werden
(z. B. `box-shadow: 0 -4px 20px -4px rgb(0 0 0 / .35)`). Kein funktionaler
Unterschied bei dunklem Theme; im Light-Theme wird `--border` sehr dezent
(`rgb(15 23 42 / .09)`), was einen fast unsichtbaren Schatten ergibt — ggf.
Literalwert bevorzugen.

### R-5 — Keine Abhängigkeiten zwischen den 5 Dateien

Alle 5 Dateien sind unabhängig voneinander — die Migration kann in beliebiger
Reihenfolge oder parallel durchgeführt werden.

### R-6 — `usage-bar.ts` Warning/Danger-Farben sind Literalwerte (kein Scope dieser Migration)

Zeilen 78 (`#f59e0b`) und 81 (`#ef4444`) in `usage-bar.ts` sind hardcodierte
Hex-Farben, keine alten Tokens. Sie sind **bewusst** nicht Teil dieser Migration.
Eine Folgeaufgabe könnte sie auf `var(--warn)` (`#f5a623`) und `var(--offline)`
(`#ef4757`) umstellen (beide in `@theme` definiert) — semantisch sinnvoll, aber
nicht dringend da die Abweichung zu den System-Farben minimal ist.
