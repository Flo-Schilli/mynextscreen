# Screens Reskin — Umsetzungsplan

**Verzeichnis:** `apps/frontend/src/app/screens/`  
**Referenz:** `docs/design/design_handoff_mynextscreen/reference/pages.jsx` (Screens-Seite) + `reference/modals.jsx` (Pairing-Modal) + `reference/components.jsx` (Badge/Btn/StatusDot-Primitiven)  
**Aktueller Stand:** Die Screens-View ist bereits vollständig reskinned und gilt als Referenz-Pattern für andere Views. Alle Dateien außer einer verwenden ausschließlich neue Design-Token.

**Einzige offene Datei:** `apps/frontend/src/app/screens/screen-form.ts` — enthält auf Zeile 420 noch einen veralteten `var(--color-offline, #ef4444)`-Token für die Fehlertext-Farbe der `.error`-Klasse. Alle anderen Styles in derselben Datei sind bereits korrekt auf das neue Token-System migriert.

---

## Offene Entscheidungen

*(keine weiteren — die Änderung ist eindeutig und hat keinen Ermessensspielraum)*

---

## Soll/Ist-Vergleich

| Element | CSS-Klasse / Selector | Ist (aktuell) | Soll (Design-Token) | Referenz |
|---|---|---|---|---|
| Inline-Formular-Fehlermeldung | `.error` | `color: var(--color-offline, #ef4444)` | `color: var(--offline)` | `components.jsx` Z. 53: danger-Variante = `var(--offline)`; `design-tokens.md`: `--offline: #ef4757` |

**Kontext der Änderung:**  
Das `--offline`-Token ist im Design-System als `#ef4757` definiert (nicht `#ef4444` wie der Fallback-Wert suggeriert). `var(--color-offline, …)` ist das alte Token-Schema; `var(--offline)` ist das gültige neue Schema, analog zu allen anderen Status-Tokens (`--online`, `--warn`) die bereits korrekt im selben File verwendet werden (Zeilen 501–507, `.status-badge.online` / `.status-badge.offline`).

---

## Umsetzung

### Schritt 1 — Token ersetzen

**Datei:** `apps/frontend/src/app/screens/screen-form.ts`  
**Zeile:** 420

```css
/* VORHER */
.error {
  font-size: 13px;
  color: var(--color-offline, #ef4444);
  margin: 0;
}

/* NACHHER */
.error {
  font-size: 13px;
  color: var(--offline);
  margin: 0;
}
```

Das ist die einzige Code-Änderung. Kein weiterer Handlungsbedarf im `screens/`-Verzeichnis.

### Schritt 2 — Visuell prüfen

Nach der Änderung kurz verifizieren:
- `npm run dev` starten (oder `npx nx serve frontend`)
- Screens-View aufrufen → einen Screen zum Bearbeiten öffnen
- Im Formular absichtlich einen Validierungsfehler provozieren (z. B. Name-Feld leeren → „Register screen" drücken)
- Fehlermeldungsfarbe in Dark- und Light-Theme prüfen → muss dem Offline-Rot (`#ef4757` dark / entsprechender Light-Wert) entsprechen

### Schritt 3 — Tests laufen lassen

```bash
npx nx test frontend
```

Die `.error`-Klasse ist semantisch load-bearing für Specs (`screen-form.spec.ts` prüft das Rendering von Fehlermeldungen), aber der Klassenname ändert sich nicht — nur die CSS-Eigenschaft. Alle bestehenden Tests sollten unverändert grün bleiben.

---

## Betroffene Dateien

| Datei | Änderung | Zeile(n) |
|---|---|---|
| `apps/frontend/src/app/screens/screen-form.ts` | `var(--color-offline, #ef4444)` → `var(--offline)` | 420 |

**Nicht betroffen** (bereits vollständig migriert):

| Datei | Status |
|---|---|
| `apps/frontend/src/app/screens/screens.ts` | Grün — verwendet ausschließlich neue Token |
| `apps/frontend/src/app/screens/screen-tile.ts` | Grün |
| `apps/frontend/src/app/screens/screen-grid.ts` | Grün |
| `apps/frontend/src/app/screens/screen.service.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screen.model.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screen-form.spec.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screen-grid.spec.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screen-tile.spec.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screen.service.spec.ts` | Grün — kein CSS |
| `apps/frontend/src/app/screens/screens.spec.ts` | Grün — kein CSS |

---

## Risiken / Hinweise

**Risiko: keines** — Diese Änderung ist minimal und rein visuell. Der Klassenname `.error` bleibt unverändert; die Specs prüfen nur Vorhandensein des Elements, nicht die CSS-Farbe. Ein Bruch ist ausgeschlossen.

**Hinweis 1 — Farbwert-Abweichung:**  
Der ersetzte Fallback `#ef4444` (Tailwind red-500) weicht vom Design-Token `#ef4757` (myNextScreen offline-Rot) ab. Nach der Korrektur stimmt die Fehlermeldungsfarbe exakt mit den Status-Badges auf derselben Edit-Maske überein — ein visuell kohärenteres Ergebnis.

**Hinweis 2 — `.status-badge.offline` bereits korrekt:**  
Zeilen 504–507 in `screen-form.ts` verwenden bereits `var(--offline)` und `var(--offline-dim)` korrekt. Die `.error`-Klasse war schlicht übersehen worden.

**Hinweis 3 — `--online-dim` / `--offline-dim` nicht definiert im Fallback:**  
Die Tokens `--online-dim`, `--offline-dim` werden bereits im File verwendet und sind in `tailwind-theme.css` global definiert. Die einzige fehlerhafte Stelle ist `.error` auf Zeile 420; keine weiteren Lücken.

**Hinweis 4 — Kein Shared-Primitive für Inline-Fehler:**  
Die Referenz (`modals.jsx`, `components.jsx`) zeigt kein dediziertes Error-Text-Primitiv. Das lokale `.error`-Pattern im Template ist das richtige Vorgehen für diese Art modaler Validierungsmeldung.
