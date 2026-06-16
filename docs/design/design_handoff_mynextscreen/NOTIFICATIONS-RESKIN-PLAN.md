# Notifications Reskin — Umsetzungsplan

**Verzeichnis:** `apps/frontend/src/app/notifications/`
**Referenz:** `docs/design/design_handoff_mynextscreen/reference/shell.jsx` (Topbar-Bell Z. 209–214, UserMenu-Muster)
**Token-Quelle:** `docs/design/design_handoff_mynextscreen/design-tokens.md`

Die zwei Dateien mit noch aktiven `var(--color-*)` Alttoken sind:

| Datei | Anzahl Alttoken-Vorkommen |
|---|---|
| `notification-bell.ts` | 4 (Z. 56, 61, 62, 75) |
| `notification-dropdown.ts` | 14 (Z. 48, 49, 51, 63, 69, 74, 82, 99, 102, 108, 112, 147, 155, 167) |

`notification.model.ts`, `notification.service.ts` und beide `.spec.ts` enthalten keine Style-Token und bleiben unverändert.

---

## Offene Entscheidungen

### E-1 — Unread-Badge: Zähler-Pill vs. einfacher Status-Dot

**Ist:** `notification-bell.ts` rendert einen kleinen Zähler-Badge (z. B. „3", „99+") als positionierte Pill über dem Bell-Icon.

**Referenz (`shell.jsx` Z. 212–213):** Das Design zeigt *keinen* Zähler-Text — nur einen 8×8 px Dot in `var(--offline)` mit `box-shadow: 0 0 0 2px var(--surface)` (Trennring zum Button-Hintergrund) als reines Präsenz-Signal.

**Optionen:**
- **A (Empfohlen):** Dot ersetzen — passt exakt zur Referenz, reduziert visuelle Komplexität. Logik `badgeText()` / `unreadCount()` bleibt im Service erhalten, wird aber nur als boolean Schwellwert genutzt (`> 0`).
- **B:** Pill behalten — mehr Information für den User, aber nicht im Design vorgesehen.

**Empfehlung: Option A.** Die Referenz ist eindeutig; ein unstyled Zähler ist nicht vorgesehen.

### E-2 — Dropdown: `var(--color-shadow)` → welches Shadow-Token?

**Ist:** `box-shadow: 0 8px 24px var(--color-shadow)` (Z. 51).

**Neu:** Das Design definiert `--shadow` (`0 18px 40px -24px rgb(0 0 0 / .8)`) und `--shadow-lg` (`0 30px 70px -30px rgb(0 0 0 / .85)`). Popovers/Overlays verwenden laut `components.md` `shadow-lg`.

**Optionen:**
- **A (Empfohlen):** `box-shadow: var(--shadow-lg)` — entspricht dem Muster aller anderen Dropdowns/Overlays im Design.
- **B:** `box-shadow: var(--shadow)` — dezenter, für Karten gedacht.

**Empfehlung: Option A.**

### E-3 — Unread-Zeile: Hardcodierter `rgba(59,130,246,…)` Blue-Tint

**Ist:** `.notification-row.unread { background: rgba(59, 130, 246, 0.08) }` und Hover `rgba(59, 130, 246, 0.14)` (Z. 111, 115) — accent-blue hardcodiert, reagiert nicht auf den aktiven Accent (`indigo`/`teal`/`amber`/`blue`).

**Optionen:**
- **A (Empfohlen):** `background: var(--accent-soft)` / Hover `background: color-mix(in srgb, var(--accent-soft) 140%, transparent)` — accent-agnostisch, entspricht dem Systemtoken.
- **B:** Hardcoded Blue belassen — nur korrekt, wenn Accent immer Blue ist.

**Empfehlung: Option A.**

---

## Soll/Ist-Vergleich

### `notification-bell.ts`

| Element | Ist (`var(--color-*)`) | Soll (neues Token) | Referenz |
|---|---|---|---|
| `.topbar-btn` Textfarbe | `var(--color-text-secondary)` | `var(--text-muted)` | shell.jsx Z. 210 |
| `.topbar-btn:hover` Hintergrund | `var(--color-bg-tertiary)` | `var(--hover)` | shell.jsx Z. 47 (NavItem hover) |
| `.topbar-btn:hover` Textfarbe | `var(--color-text-primary)` | `var(--text)` | shell.jsx Z. 48 |
| `.badge` Hintergrund | `var(--color-accent)` | Entfällt (→ Status-Dot per E-1) | shell.jsx Z. 212–213 |
| Button-Größe/-Radius | `36×36 px, border-radius:6px` | `40×40 px, border-radius:11px, border:1px solid var(--border), background:var(--surface)` | shell.jsx Z. 209–210 |
| Unread-Indikator (neu) | — | `8×8 px Dot, background:var(--offline), box-shadow:0 0 0 2px var(--surface), border-radius:99px, position:absolute, top:8px, right:9px` | shell.jsx Z. 212–213 |

### `notification-dropdown.ts`

| Element | Ist (`var(--color-*)`) | Soll (neues Token) | Zeile |
|---|---|---|---|
| `.dropdown` Hintergrund | `var(--color-bg-secondary)` | `var(--surface)` | Z. 48 |
| `.dropdown` Rahmen | `var(--color-border)` | `var(--border-strong)` | Z. 49 |
| `.dropdown` Shadow | `var(--color-shadow)` | `var(--shadow-lg)` (→ E-2) | Z. 51 |
| `.dropdown` Radius | `border-radius:8px` | `border-radius:14px` | shell.jsx UserMenu Z. 136 |
| `.dropdown-header` Trennlinie | `var(--color-border)` | `var(--border)` | Z. 63 |
| `.dropdown-title` Farbe | `var(--color-text-primary)` | `var(--text)` | Z. 69 |
| `.mark-all-btn` Farbe | `var(--color-accent)` | `var(--accent)` | Z. 74 |
| `.mark-all-btn:hover` Hintergrund | `var(--color-bg-tertiary)` | `var(--hover)` | Z. 82 |
| `.notification-row` Trennlinie | `var(--color-border)` | `var(--border)` | Z. 99 |
| `.notification-row` Farbe | `var(--color-text-secondary)` | `var(--text-muted)` | Z. 102 |
| `.notification-row:hover` Hintergrund | `var(--color-bg-tertiary)` | `var(--hover)` | Z. 108 |
| `.notification-row.unread` Farbe | `var(--color-text-primary)` | `var(--text)` | Z. 112 |
| `.notification-row.unread` Hintergrund | `rgba(59,130,246,0.08)` | `var(--accent-soft)` (→ E-3) | Z. 111 |
| `.notification-row.unread:hover` Hintergrund | `rgba(59,130,246,0.14)` | `color-mix(in srgb,var(--accent-soft) 160%,transparent)` | Z. 115 |
| `.notification-message` Farbe | `var(--color-text-secondary)` | `var(--text-muted)` | Z. 147 |
| `.notification-time` Farbe | `var(--color-text-muted)` | `var(--text-faint)` | Z. 155 |
| `.empty-state` Farbe | `var(--color-text-muted)` | `var(--text-muted)` | Z. 167 |
| `animation` (fehlt) | — | `animation: fadeUp .14s ease both` auf `.dropdown` | shell.jsx Z. 136 |

---

## Umsetzung

### Schritt 1 — `notification-bell.ts` bereinigen

**Ziel:** Button an Topbar-Referenz angleichen, Badge durch Dot ersetzen.

1. **Button-Wrapper-Stil** anpassen:
   - `width/height` von `36px` auf `40px`
   - `border-radius` von `6px` auf `11px`
   - `border: 1px solid var(--border)` hinzufügen
   - `background: var(--surface)` (Ruhezustand)

2. **Token-Ersetzungen in `.topbar-btn`:**
   ```
   color: var(--color-text-secondary)  →  color: var(--text-muted)
   ```
   ```
   background: var(--color-bg-tertiary); color: var(--color-text-primary)
   →  background: var(--hover); color: var(--text)
   ```

3. **`.badge`-Klasse entfernen**, `badgeText()`-Computed entfernen.

4. **Neuen Unread-Dot einbauen** (ersetzt `<span class="badge">`):
   ```html
   @if (notificationService.unreadCount() > 0) {
     <span class="unread-dot"></span>
   }
   ```
   ```css
   .unread-dot {
     position: absolute;
     top: 8px;
     right: 9px;
     width: 8px;
     height: 8px;
     border-radius: 99px;
     background: var(--offline);
     box-shadow: 0 0 0 2px var(--surface);
   }
   ```

### Schritt 2 — `notification-dropdown.ts` bereinigen

**Token-Ersetzungen (alle `var(--color-*)` → neue Token):**

```
var(--color-bg-secondary)    →  var(--surface)
var(--color-border)          →  var(--border)         [Trennlinien]
var(--color-border)          →  var(--border-strong)  [nur .dropdown Rahmen Z.49]
var(--color-shadow)          →  var(--shadow-lg)      [.dropdown box-shadow]
var(--color-text-primary)    →  var(--text)
var(--color-text-secondary)  →  var(--text-muted)
var(--color-text-muted)      →  var(--text-faint)     [nur .notification-time, .empty-state: var(--text-muted)]
var(--color-accent)          →  var(--accent)
var(--color-bg-tertiary)     →  var(--hover)
rgba(59,130,246,0.08)        →  var(--accent-soft)
rgba(59,130,246,0.14)        →  color-mix(in srgb,var(--accent-soft) 160%,transparent)
```

**Strukturelle Anpassungen:**

- `.dropdown` Radius: `8px` → `14px`
- `.dropdown`: `animation: fadeUp .14s ease both` hinzufügen (entspricht UserMenu-Dropdown, shell.jsx Z. 136; keyframe `fadeUp` ist in `tailwind-theme.css` definiert)
- `.notification-time` Farbe: `var(--color-text-muted)` → `var(--text-faint)` (Zeitstempel = faintest, Typ-Skala: „Mono small / timestamps")
- `.empty-state` Farbe: `var(--color-text-muted)` → `var(--text-muted)` (sekundärer Platzhaltertext, nicht ganz faint)

**Event-Icons in `getEventIcon()` — hardcodierte Hex-Farben:**

Die SVG-Farben in `getEventIcon()` (`#ef4444`, `#22c55e`, `#3b82f6`, `#f59e0b`) sind hardcodiert. Ersetzung durch Design-Systemtokene:

```
#ef4444  →  var(--offline)   [screen.offline, Kreis + X]
#22c55e  →  var(--online)    [screen.online, Kreis + Haken]
#3b82f6  →  var(--accent)    [transcoding.complete, Kreis + Haken]
#f59e0b  →  var(--warn)      [transcoding.failed, Kreis + Ausrufezeichen]
```

Da `innerHTML`-Bindings keine CSS-Vars in SVG-Attributen auflösen (SVG `stroke` ist kein Style-Property), muss `getEventIcon()` entweder:
- **a)** Inline-`style="color:..."` auf dem `<span class="event-icon">` setzen und `stroke="currentColor"` im SVG verwenden (Empfehlung — sauber und token-agnostisch), oder
- **b)** Die Methode als `@switch`-Block in das Template verlagern und `<mns-icon>` mit Farb-Input nutzen.

**Empfehlung Option a):** `getEventIcon()` liefert weiter HTML-String, aber alle `stroke` erhalten `"currentColor"`, und die aufrufende Stelle setzt die CSS-Farbe per `[style.color]`-Binding auf dem `<span>`.

### Schritt 3 — Qualitätssicherung

1. `grep -r "var(--color-" apps/frontend/src/app/notifications/` → muss leer sein.
2. Visuell in Dark- und Light-Theme prüfen (Topbar-Button, Badge-Dot, Dropdown-Öffnen/Schließen, Unread-Zeile, Hover-States, leere Liste).
3. `npx nx test frontend` — bestehende Specs dürfen nicht brechen (keine Logikänderung).
4. `npx nx run frontend:format:check` ausführen (CI-Gate).

---

## Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `apps/frontend/src/app/notifications/notification-bell.ts` | Token-Ersetzung (4 Stellen), Badge→Dot, Button-Sizing |
| `apps/frontend/src/app/notifications/notification-dropdown.ts` | Token-Ersetzung (14 Stellen), Radius, Animation, SVG-Farben |
| `apps/frontend/src/app/notifications/notification.model.ts` | Keine Änderung |
| `apps/frontend/src/app/notifications/notification.service.ts` | Keine Änderung |
| `apps/frontend/src/app/notifications/notification-bell.spec.ts` | Keine Änderung (ggf. Badge-Selector anpassen falls Spec darauf testet) |
| `apps/frontend/src/app/notifications/notification-dropdown.spec.ts` | Keine Änderung |

---

## Risiken / Hinweise

- **`innerHTML` + CSS-Vars:** SVG-`stroke`-Attribute in `innerHTML`-Bindings lösen `var(--token)` nicht auf — deshalb zwingend `currentColor`+`[style.color]`-Ansatz (Schritt 2, Event-Icons).
- **`fadeUp`-Keyframe:** Das Keyframe ist in `tailwind-theme.css` (globale Styles) definiert. Es muss im globalen Stylesheet geladen sein, bevor die Animation greift — ist es in der bestehenden Konfiguration, da andere Komponenten es bereits nutzen.
- **`badgeText()` Computed:** Nach dem Entfernen des Zähler-Badges wird `badgeText()` nicht mehr benötigt; es sollte mitentfernt werden, um toten Code zu vermeiden (keine Logik-Seiteneffekte).
- **Unread-Dot-Position:** Der Dot sitzt laut Referenz bei `top:8, right:9` — das setzt voraus, dass der Button-Container `position:relative` hat. `.notification-btn` hat das bereits; `.bell-wrapper` ebenfalls — kein Risiko.
- **`color-mix()`-Kompatibilität:** `color-mix(in srgb, ...)` ist in allen modernen Browsern (Chrome 111+, Firefox 113+, Safari 16.2+) verfügbar und wird im Projekt bereits an anderer Stelle genutzt.
- **Keine Service-/Signal-Änderung:** `NotificationService`, alle Signals (`unreadCount()`, `notifications()`, `loading()`) und die Routing-Logik bleiben vollständig unverändert.
