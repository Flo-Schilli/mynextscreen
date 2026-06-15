# Dashboard Reskin — Umsetzungsplan

**Verzeichnis:** `apps/frontend/src/app/dashboard/`
**Referenz:** `docs/design/design_handoff_mynextscreen/reference/dashboard.jsx` + `dashboard_widgets.jsx`
**Aktueller Stand:** Weitgehend fertig reskinned. Zwei Dateien enthalten noch alte `var(--color-*)` Tokens:

1. **`dashboard.ts`** — 11 Vorkommen in SVG-Sparklines (Zeilen 253, 254, 261, 319, 320, 327, 354, 355, 362) und in den `.kpi-icon--*` CSS-Regeln (Zeilen 497, 505, 509, 573)
2. **`dashboard-alerts.ts`** — 3 Vorkommen in der `TONE_COLOR`-Map (Zeilen 18–20); die zugehörige Spec-Datei spiegelt die alten Tokens in ihren Assertions (Zeilen 60–62)

---

## Offene Entscheidungen

### E-1 — `var(--color-info)` hat kein direktes Gegenstück im neuen Token-Set

**Kontext:** Das neue Token-Set definiert `--online`, `--warn`, `--offline` als semantische Status-Farben. `--info` (blau, `#3b9dff`) ist nicht als eigenständiger Semantic-Token benannt, taucht aber in der Referenz als `var(--info)` auf (z. B. `dashboard_widgets.jsx` Zeile 9: `const c = tone === 'accent' ? 'var(--accent)' : var(--${tone})`; für `tone='info'` ergibt das `var(--info)`).

**Optionen:**
- A) `var(--color-info)` → `var(--info)` (parallel zu `--online`, `--warn`, `--offline`; Referenz nutzt genau dieses Muster)
- B) `var(--color-info)` → `var(--accent)` (Info = Akzentfarbe; passt für KPI-Icon des „Active playlists"-Felds, aber nicht für den Sparkline-Gradientstroke, der semantisch info-blau sein soll)

**Empfehlung:** Option A — `var(--info)` verwenden. Die Referenz (`dashboard_widgets.jsx` Zeile 9) konstruiert dynamisch `var(--${tone})`, womit `var(--info)` implizit genutzt wird. Im `tailwind-theme.css` / `design-tokens.md` ist Info (`#3b9dff`) als Status-Farbe gelistet; der Token `--info` existiert im Theme analog zu `--online`, `--warn`, `--offline`.

---

## Soll/Ist-Vergleich

| Stelle | Datei | Ist (alt) | Soll (neu) |
|---|---|---|---|
| KPI-Icon „Screens online" — Farbe | `dashboard.ts` Z. 497 | `color: var(--color-online)` | `color: var(--online)` |
| KPI-Icon „Active playlists" — Farbe | `dashboard.ts` Z. 505 | `color: var(--color-info)` | `color: var(--info)` |
| KPI-Icon „Open alerts" — Farbe | `dashboard.ts` Z. 509 | `color: var(--color-offline)` | `color: var(--offline)` |
| Onboarding step-icon--done — Farbe | `dashboard.ts` Z. 573 | `color: var(--color-online)` | `color: var(--online)` |
| Sparkline „Screens online" — Gradient stop + stroke (3×) | `dashboard.ts` Z. 253, 254, 261 | `var(--color-online)` | `var(--online)` |
| Sparkline „Active playlists" — Gradient stop + stroke (3×) | `dashboard.ts` Z. 319, 320, 327 | `var(--color-info)` | `var(--info)` |
| Sparkline „Open alerts" — Gradient stop + stroke (3×) | `dashboard.ts` Z. 354, 355, 362 | `var(--color-offline)` | `var(--offline)` |
| `TONE_COLOR['offline']` | `dashboard-alerts.ts` Z. 18 | `'var(--color-offline)'` | `'var(--offline)'` |
| `TONE_COLOR['warn']` | `dashboard-alerts.ts` Z. 19 | `'var(--color-warn)'` | `'var(--warn)'` |
| `TONE_COLOR['info']` | `dashboard-alerts.ts` Z. 20 | `'var(--color-info)'` | `'var(--info)'` |
| Spec-Assertion offline | `dashboard-alerts.spec.ts` Z. 60 | `'var(--color-offline)'` | `'var(--offline)'` |
| Spec-Assertion warn | `dashboard-alerts.spec.ts` Z. 61 | `'var(--color-warn)'` | `'var(--warn)'` |
| Spec-Assertion info | `dashboard-alerts.spec.ts` Z. 62 | `'var(--color-info)'` | `'var(--info)'` |

**Keine weiteren Abweichungen gefunden.** Alle anderen Dashboard-Dateien (`dashboard-screen-grid.ts`, `dashboard-schedule-timeline.ts`, `dashboard-activity-feed.ts`, `dashboard-history.model.ts`, `dashboard-summary.model.ts`, `dashboard.service.ts`, `dashboard-sse.service.ts`) sind sauber — kein `var(--color-*)`.

---

## Umsetzung

### Phase 1 — `dashboard-alerts.ts` bereinigen (3 Token-Ersetzungen)

**Datei:** `apps/frontend/src/app/dashboard/dashboard-alerts.ts`

In der `TONE_COLOR`-Konstante (Zeilen 17–21) alle drei Werte ersetzen:

```typescript
// ALT
const TONE_COLOR: Record<DashboardAlertTone, string> = {
  offline: 'var(--color-offline)',
  warn:    'var(--color-warn)',
  info:    'var(--color-info)',
};

// NEU
const TONE_COLOR: Record<DashboardAlertTone, string> = {
  offline: 'var(--offline)',
  warn:    'var(--warn)',
  info:    'var(--info)',
};
```

### Phase 2 — Spec-Datei anpassen (3 Assertion-Ersetzungen)

**Datei:** `apps/frontend/src/app/dashboard/dashboard-alerts.spec.ts`

Zeilen 60–62 — Assertions auf neue Token-Namen umschreiben:

```typescript
// ALT
expect(component.color('offline')).toBe('var(--color-offline)');
expect(component.color('warn')).toBe('var(--color-warn)');
expect(component.color('info')).toBe('var(--color-info)');

// NEU
expect(component.color('offline')).toBe('var(--offline)');
expect(component.color('warn')).toBe('var(--warn)');
expect(component.color('info')).toBe('var(--info)');
```

### Phase 3 — `dashboard.ts` bereinigen (11 Token-Ersetzungen)

**Datei:** `apps/frontend/src/app/dashboard/dashboard.ts`

**3a — SVG-Sparklines im Template (Zeilen 253–362):**

Sparkline „Screens online" (Zeilen 253, 254, 261):
```html
<!-- ALT -->
<stop offset="0" stop-color="var(--color-online)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--color-online)" stop-opacity="0" />
stroke="var(--color-online)"

<!-- NEU -->
<stop offset="0" stop-color="var(--online)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--online)" stop-opacity="0" />
stroke="var(--online)"
```

Sparkline „Active playlists" (Zeilen 319, 320, 327):
```html
<!-- ALT -->
<stop offset="0" stop-color="var(--color-info)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--color-info)" stop-opacity="0" />
stroke="var(--color-info)"

<!-- NEU -->
<stop offset="0" stop-color="var(--info)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--info)" stop-opacity="0" />
stroke="var(--info)"
```

Sparkline „Open alerts" (Zeilen 354, 355, 362):
```html
<!-- ALT -->
<stop offset="0" stop-color="var(--color-offline)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--color-offline)" stop-opacity="0" />
stroke="var(--color-offline)"

<!-- NEU -->
<stop offset="0" stop-color="var(--offline)" stop-opacity="0.28" />
<stop offset="1" stop-color="var(--offline)" stop-opacity="0" />
stroke="var(--offline)"
```

**3b — CSS-Regeln in `styles:` (Zeilen 497, 505, 509, 573):**

```css
/* ALT */
.kpi-icon--online  { background: var(--online-dim);  color: var(--color-online);  }
.kpi-icon--info    { background: var(--info-dim);    color: var(--color-info);    }
.kpi-icon--offline { background: var(--offline-dim); color: var(--color-offline); }
.step-icon--done   { background: var(--online-dim);  color: var(--color-online);  }

/* NEU */
.kpi-icon--online  { background: var(--online-dim);  color: var(--online);  }
.kpi-icon--info    { background: var(--info-dim);    color: var(--info);    }
.kpi-icon--offline { background: var(--offline-dim); color: var(--offline); }
.step-icon--done   { background: var(--online-dim);  color: var(--online);  }
```

### Phase 4 — Verifikation

```bash
# Keine alten Tokens mehr im Dashboard-Verzeichnis
grep -rn "var(--color-" apps/frontend/src/app/dashboard/

# Tests laufen durch
npx nx test frontend --testPathPattern="dashboard"
```

Erwartet: `grep` gibt keine Ausgabe; alle Dashboard-Specs bestehen.

---

## Betroffene Dateien

| Datei | Art der Änderung | Zeilen |
|---|---|---|
| `apps/frontend/src/app/dashboard/dashboard-alerts.ts` | Token-Ersetzung in `TONE_COLOR` | 18–20 |
| `apps/frontend/src/app/dashboard/dashboard-alerts.spec.ts` | Assertion-Update (spiegelt neue Token) | 60–62 |
| `apps/frontend/src/app/dashboard/dashboard.ts` | Token-Ersetzung in SVG-Attrs + CSS-Regeln | 253, 254, 261, 319, 320, 327, 354, 355, 362, 497, 505, 509, 573 |

**Nicht anzufassen:**
- `dashboard-screen-grid.ts` — bereits sauber
- `dashboard-schedule-timeline.ts` — bereits sauber
- `dashboard-activity-feed.ts` — bereits sauber
- `dashboard.service.ts`, `dashboard-sse.service.ts`, `*.model.ts` — keine Token-Nutzung

---

## Risiken / Hinweise

1. **`--info`-Token muss im Theme definiert sein.** Vor dem Merge prüfen, ob `apps/frontend/src/styles.css` (oder das importierte `tailwind-theme.css`) `--info: #3b9dff` enthält. Falls nicht, muss der Token dort ergänzt werden — analog zu `--online`, `--warn`, `--offline`. Ohne diesen Token bleibt die Farbe bei allen „Info"-Stellen leer (unsichtbar).

2. **Spec-Datei muss synchron mit Impl bleiben.** Die Spec in `dashboard-alerts.spec.ts` testet explizit den String-Wert des zurückgegebenen CSS-Tokens. Nach der Änderung müssen Impl und Test identisch sein — sonst schlägt Phase 4 fehl.

3. **Keine funktionale Änderung.** Es handelt sich ausschließlich um Token-Umbenennung. Keine Logik, keine Signale, keine Service-APIs werden berührt.

4. **SVG-Gradient-IDs bleiben unberührt.** Die `id`-Attribute (`sg-online`, `sg-info`, `sg-offline`) in den Sparkline-`<defs>` sind unabhängig von den CSS-Tokens und müssen nicht geändert werden.
