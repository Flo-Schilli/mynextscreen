# Settings Reskin — Umsetzungsplan

> Self-contained Plan für einen frischen Agent. Ziel: die Settings-Area (Org-Settings:
> User-Management / Notification-Config / Storage) **und** die Profil-/User-Settings-Seite
> vollständig an das myNextScreen-Design angleichen — inkl. nötiger Verhaltens-/Backend-Anpassungen,
> wo das Design es verlangt.

## Verzeichnis & Routing

Die Settings-Area ist **nicht** eine Komponente mit internem Tab-State (wie in `reference/settings.jsx`),
sondern vier separate, lazy-geladene Routen unter `apps/frontend/src/app/settings/`:

| Route | Component | Datei |
|---|---|---|
| `settings/users` | `Users` | `settings/users/users.ts` (542 Z.) |
| `settings/org/notifications` | `OrgNotificationConfig` | `settings/org/org-notification-config.ts` (461 Z.) |
| `settings/org/storage` | `OrgStorage` | `settings/org/org-storage.ts` (116 Z.) |
| `settings/user` | `UserSettings` (Profil) | `settings/user/user-settings.ts` (667 Z.) |

Registriert in `apps/frontend/src/app/app.routes.ts:65–81`. Die drei Org-Tabs teilen sich
eine **per-Komponente duplizierte** Underline-Tab-Leiste (jede Datei hat dieselben
`.settings-tab`-Styles dupliziert) und navigieren per `routerLink`. `settings/user` (Profil)
ist eine eigenständige Seite ohne Tab-Leiste (erreichbar über das User-Menü in der Topbar).

## Referenzen

- `docs/design/design_handoff_mynextscreen/reference/settings.jsx` — User-Mgmt (Tab 1, Seat-Summary
  + Member-Tabelle als CSS-Grid + Invite-Modal + RoleSelect), Notification-Config (Tab 2, SMTP-Card +
  ntfy-Card + Alert-Rules-Card mit 5 ToggleRows), Storage (Tab 3, StorageRow-Bars + Stats-Footer).
  Definiert die settings-scoped Primitive `SInput/SField/Switch/ToggleRow/RoleSelect`.
- `docs/design/design_handoff_mynextscreen/reference/profile.jsx` — SwitchOrgModal,
  DeleteAccountModal (type-„delete"-Confirm), UserSettingsPage (Profile + Notification-Channels +
  Change-Password + Change-Email + Danger-Zone).
- Token-/Primitive-Kanon: `design-tokens.md`, `components.md`, `IMPLEMENTATION-PLAN.md` (Phase 3 „Settings").

## Aktueller Stand (Ist)

**Fertig reskinnt (Tokens + UI-Primitive, kein Handlungsbedarf außer Detail-Politur):**
- `settings/user/user-settings.ts` — nutzt bereits `mns-card/-head`, `mns-sfield/-sinput`,
  `mns-switch/-toggle-row`, `mns-btn`; enthält bereits den **Accent/Density-Picker** (Card „Appearance",
  Z. 186–244) verdrahtet an `ThemeService.accent/density`. **Offen hier:** der Delete-Account-Modal
  (Z. 346–404) ist noch ein handgebautes `.modal-overlay` statt `mns-overlay`/`mns-modal`.
- `settings/org/org-storage.ts` — vollständig auf `mns-card/-head` + `app-storage-usage-bars`;
  nur die Tab-Leiste ist dupliziert (siehe Entscheidung 1).
- `settings/org/org-notification-config.ts` — nutzt Primitive für SMTP/ntfy-Cards; **aber**: (a) die
  5 Alert-Rules-`mns-toggle-row` (Z. 208–232) sind **nicht verdrahtet** (kein `[checked]`/`(toggled)`),
  (b) verwendet `ChangeDetectorRef` + plain Felder statt Signals (OnPush-Regression-Muster, siehe
  MEMORY „OnPush + imperative subscribe regression"), (c) ein `<input type="number">` für den Port
  statt `mns-sinput` (Z. 73–80).

**Offen (alt, noch nicht reskinnt):**
- `settings/users/users.ts` — komplette **HTML-`<table>`** (Z. 83–169) statt Card-Grid/Cards, ein
  native `<select>` für die Rolle (statt `mns-select`/RoleSelect), **2 handgebaute `.modal-overlay`-Modals**
  (Invite Z. 192–296, Remove-Confirm Z. 299–334). Kein Seat-Summary, kein `mns-page-header`.

## Offene Entscheidungen

### 1. Tab-Shell: dupliziert lassen vs. zentrale `SettingsTabsComponent`
Jede der drei Org-Komponenten dupliziert die `.settings-tab`-Styles + die drei `routerLink`-Tabs
(`users.ts:341–364`, `org-notification-config.ts:244–267`, `org-storage.ts:51–74`). Das ist DRY-Verletzung
und die Underline ist als Custom-CSS statt Tailwind gelöst.
- **Option A:** Belassen wie es ist (nur Klassen normalisieren) — minimaler Aufwand, kein Refactor-Risiko.
- **Option B:** Eine kleine, standalone, `OnPush` `SettingsTabsComponent` (`settings/settings-tabs.component.ts`)
  mit `routerLink` + `routerLinkActive`, die in allen drei Org-Views eingebunden wird. Underline via
  Tailwind (`border-b-2 border-accent`/`border-transparent`), aktiver Tab über `routerLinkActive`-Klasse.
- **Empfehlung:** **Option B.** Beseitigt 3× Duplikat + Custom-CSS, ist exakt das Underline-Tab-Muster aus
  `settings.jsx:419–434`, und `routerLinkActive` ersetzt das manuelle `--active`-Flag. Klein (~40 Z.),
  geringes Risiko. Profil (`settings/user`) bleibt ohne diese Leiste.

### 2. Member-Tabelle → Grid-Card vs. Card-Liste vs. responsive Hybrid
`reference/settings.jsx:222–261` rendert Member als **eine `pad=false`-Card** mit CSS-Grid-Header-Row +
Grid-Daten-Rows (`COLS = '2fr 1.7fr 160px 140px 116px 96px'`), nicht als `<table>`. Der Task nennt
„member table → cards" als Major-Decision.
- **Option A:** 1:1 zur Referenz — eine `mns-card [pad]="false"` mit CSS-Grid-Rows (Header + je Row ein
  `grid grid-cols-[...]`). Avatar + Name, Email, RoleSelect, Status-Badge, Joined (mono), Actions-Btn.
  Auf < 880px Grid auf gestapelte Karten umbrechen.
- **Option B:** Pro Member eine eigene `mns-card` (echte Card-Liste). Weicht visuell von der Referenz ab
  (Referenz ist klar eine zusammenhängende Tabellen-Card).
- **Option C:** `<table>` behalten, nur Tailwind-Tokens. Verstößt gegen den Reskin-Auftrag (Tabelle entfernen).
- **Empfehlung:** **Option A** (Grid-Card 1:1 zur Referenz). Native `<table>` raus, ein `mns-card`-Container
  mit Grid-Rows. Auf schmalen Breakpoints (< 880px) Spaltengrid auf `1fr` kollabieren / Label-Value-Stapel.
  Behält Pixel-Treue zur Referenz und entfernt die Tabelle wie gefordert.

### 3. RoleSelect: `mns-select` wiederverwenden vs. native `<select>` belassen
Die Referenz nutzt einen Custom-Dropdown (`RoleSelect`, `settings.jsx:62–103`); das vorhandene
`mns-select` (`ui/select.component.ts`) ist genau dieser Custom-Dropdown (Button + Popover + Check,
Focus-Ring `accent-soft`, schließt auf Outside-Click/Esc). users.ts nutzt aktuell ein natives `<select>`.
- **Option A:** `mns-select` mit `[(value)]` + `(changed)` einsetzen; Optionen
  `[{value:'org_admin',label:'Org Admin'},{value:'editor',label:'Editor'},{value:'viewer',label:'Viewer'}]`.
  Owner-Zeile bleibt ein read-only `mns-badge tone="accent"` mit Lock-Icon (Referenz `settings.jsx:243–245`).
- **Option B:** Natives `<select>` mit Token-Styling belassen (kein Popover, keine Check-Markierung).
- **Empfehlung:** **Option A** — exakt das Referenz-Verhalten, Primitive existiert bereits. Hinweis:
  `mns-select` ist nicht ngModel-fähig (nur Signal-`model`); im Invite-Modal das Role-`<select>` ebenfalls
  durch `mns-select` ersetzen und an ein Signal binden statt `[(ngModel)] inviteRole`.

### 4. Owner-/„Pending"-Semantik: Referenz vs. echtes Datenmodell
Referenz kennt Rollen `owner|admin|editor|viewer` und einen Seat-Counter (`seats=8`). Das echte Modell
(`member.model.ts`) hat **nur** `org_admin|editor|viewer` (kein „owner") und **keine** Seat-Limits; Status
ist `pending|active` (serverseitig abgeleitet).
- **Option A:** Reines Re-Skin der echten Daten: keine „owner"-Rolle, kein Seat-Limit. Seat-Summary auf
  **Members** (active) + **Pending** reduzieren (2 Kacheln statt 3), „Seats used" weglassen.
- **Option B:** „owner"/Seats fingieren — würde Fake-Daten ins UI bringen (verboten laut Reskin-Regeln).
- **Empfehlung:** **Option A.** Seat-Summary mit 2 Kacheln (Members = `status==='active'`-Count,
  Pending = `status==='pending'`-Count), Icon-Tiles wie Referenz (`User`, `Mail`, je 38×38 `bg-accent-soft`).
  Status-Badge: `active` → `mns-badge tone="online"` „Active", `pending` → `tone="warning"` „Pending invite".
  Keine Owner-Sonderzeile (das echte Modell hat keinen unremovable Owner — der Self-Remove-Schutz liegt
  serverseitig; Remove-Button bleibt für alle, Backend lehnt unzulässige Fälle ab).

### 5. Alert-Rules (Notification-Config Tab 2): verdrahten vs. entfernen — **Backend-Entscheidung**
`reference/settings.jsx:341–352` zeigt 5 Alert-Rule-Toggles (offline / recovered / transcodeFail /
storage / weekly). Das Backend-DTO (`org-notification-config.service.ts:5–29`) speichert **nur**
SMTP-/ntfy-Felder — es gibt **keine** Persistenz für Alert-Rules. Aktuell sind die 5 ToggleRows im
Template sichtbar, aber tot (kein Binding).
- **Option A (UI-only, kein Backend):** Toggles entfernen — nur SMTP- + ntfy-Card rendern. Ehrlichstes
  Minimum, keine toten Controls.
- **Option B (volle Treue, Backend-Änderung):** Alert-Rules echt machen: Drizzle-Schema
  (`apps/backend/src/db/`) um `alertRules jsonb`/Boolean-Spalten an der Notification-Config-Entity erweitern,
  Migration generieren (`nx run backend:db-generate`), DTO + Service + Controller erweitern, Frontend-DTO
  (`OrgNotificationConfigFull`/`UpdateOrgNotificationConfig`) ergänzen und die 5 ToggleRows mit
  `[(checked)]`-Signal-State + Save-Button verdrahten. Backend muss die Rules dann auch beim
  Alert-Versand respektieren — sonst sind es gespeicherte, aber wirkungslose Flags.
- **Empfehlung:** **Option A für diesen Reskin-PR.** Die Reskin-Policy „backend changes if required" gilt
  fürs *Design*, aber funktionslose, gespeicherte Flags wären ein Feature-Versprechen ohne Backend-Wirkung
  (Alert-Dispatch-Logik müsste sie auswerten — das ist ein eigenes Feature, nicht Reskin). Daher: Alert-Rules-Card
  **entfernen** und als separates Backlog-Item dokumentieren (Entscheidung hier festhalten). Falls der User
  Option B will, ist der Pfad oben vollständig beschrieben.

### 6. Notification-Config: ChangeDetectorRef → Signals
`org-notification-config.ts` nutzt `ChangeDetectorRef.markForCheck()` + plain Felder. Das ist genau das in
MEMORY dokumentierte „OnPush + imperative subscribe"-Anti-Muster (zwar mit `markForCheck()` abgesichert,
aber inkonsistent zum Rest der reskinnten Views, die Signals nutzen).
- **Option A:** So lassen (funktioniert mit `markForCheck()`).
- **Option B:** Auf Signals umstellen (`loading`/`loadError`/`saving*`/`testing*` als `signal()`, Formularwerte
  als Signals oder weiter `[(ngModel)]` mit plain Feldern — ngModel funktioniert auch ohne markForCheck, weil
  der Input-Event die View dirty macht; nur die HTTP-Callback-gesetzten Flags brauchen Signals).
- **Empfehlung:** **Option B (Teilumbau).** Mindestens `loading`, `loadError`, `saving*`, `testing*`,
  `hasSmtpPassword`, `hasNtfyToken` zu Signals machen und `ChangeDetectorRef` entfernen — konsistent zu
  `users.ts`/`org-storage.ts`/`user-settings`. Form-Models dürfen `[(ngModel)]` + plain Felder bleiben.

### 7. Invite-/Remove-/Delete-Modals: `mns-overlay`+`mns-modal` vs. handgebaut
Drei handgebaute `.modal-overlay`-Modals existieren (Invite + Remove in `users.ts`, Delete-Account in
`user-settings.ts`). Das Primitive-Paar `mns-overlay`/`mns-modal` (`ui/overlay.component.ts`) liefert
Backdrop + Blur + Esc/Backdrop-Close + Icon-Tile-Header + Close-X + `fadeUp` + Footer-Slot bereits.
- **Option A:** Alle drei auf `mns-overlay` + `mns-modal` (Footer-Buttons via `<div slot="footer">`) umstellen.
- **Option B:** Handgebaut lassen, nur Tokens.
- **Empfehlung:** **Option A.** Entfernt 3 `.modal-overlay`-Duplikate, vereinheitlicht Esc/Backdrop-Verhalten
  und die Close-X-Optik. Hinweis: `mns-modal` hat `max-w-[520px]`; der Remove-/Delete-Confirm in der Referenz
  ist schmaler (max-w-460/420) — entweder akzeptieren (520 ist ok) oder einen schmaleren Container ohne
  `mns-modal` nur mit `mns-overlay` + eigenem Panel (wie Referenz `DeleteAccountModal`). Empfehlung:
  `mns-overlay` + `mns-modal` für Invite; für Remove/Delete (kürzer, ohne Icon-Tile-Header in der Referenz)
  `mns-overlay` + schlankes eigenes Panel ist akzeptabel — Hauptsache kein `.modal-overlay` mehr und
  Esc/Backdrop über `(closed)`.

### 8. Profil-Layout: Cards-Stack vs. zentriert + Back-Header
Referenz `profile.jsx:152–164` hat einen `maxWidth:760; margin:0 auto`-Container mit Back-Button + großem
H1 „User Settings". Die echte App rendert die Profilseite als Route innerhalb der Shell (Sidebar/Topbar),
ohne Back-Button; Cards sind `max-w-[640px]` linksbündig.
- **Option A:** Wie jetzt (linksbündige Card-Stack, kein Back, Shell liefert Navigation). Konsistent zum
  Rest der App (alle Feature-Views sind in der Shell, kein Back-Button-Muster sonst).
- **Option B:** Referenz-treu zentrieren + Back-Button + H1 „User Settings".
- **Empfehlung:** **Option A**, aber einen `mns-page-header` (title „User Settings", sub „Manage your personal
  account across every organisation", icon `Settings`) oben ergänzen — gibt der Seite den Titel der Referenz,
  bleibt aber im Shell-Navigationsmodell der App. Container darf von `max-w-[640px]` auf `max-w-[760px]`
  angehoben werden (Referenzbreite).

## Soll/Ist-Vergleich

### Tabs / Shell
| Aspekt | Soll (Referenz) | Ist | Aktion |
|---|---|---|---|
| Tab-Bar | Underline-Tabs (`settings.jsx:419–434`), gap 4, `border-b border-border`, aktiv = `text` + `2px accent` | 3× dupliziert als `.settings-tab` Custom-CSS pro Datei | Entscheidung 1 (B): `SettingsTabsComponent` mit `routerLinkActive`, Tailwind statt Custom-CSS |
| Page-Header | `PageHeader` (title+sub+actions), bei Tab „users" Action „Invite user" | nur `users.ts` hat eine Ad-hoc-Invite-Zeile; kein `mns-page-header` | `mns-page-header` je Tab; in `users` mit `mns-btn`-Invite-Action im Slot |
| Tab-Inhaltswechsel-Anim | `fadeIn .25s` pro Tab | n/a (separate Routen) | optional: View-Transition / `fadeIn` auf Root-Div je View |

### User Management (`settings/users/users.ts`)
| Aspekt | Soll | Ist | Aktion |
|---|---|---|---|
| Seat-Summary | 3 Kacheln (Members/Pending/Seats); Icon-Tiles 38×38 `bg-accent-soft` `text-accent`, mono-Zahl 18/700 | 1 Kachel (Members), Ad-hoc | Entscheidung 4 (A): 2 Kacheln Members+Pending (kein Seats), Icons `User`/`Mail` |
| Member-Liste | `mns-card [pad]="false"` Grid-Card (Header-Row + Grid-Rows), `COLS 2fr 1.7fr 160px 140px 116px 96px` | native `<table>` (Z. 83–169) | Entscheidung 2 (A): Grid-Card, `<table>` entfernen |
| Avatar | `Avatar` Gradient-Initials 34px | keiner | `mns-avatar` (`ui/avatar.component.ts`) mit Initialen aus `user.name` |
| Rolle | Custom `RoleSelect` Popover; Owner = Badge+Lock | natives `<select>` | Entscheidung 3 (A): `mns-select`; (kein Owner, siehe Entsch. 4) |
| Status | Badge `online`/`warning` | inline Tailwind-Pills | `mns-badge tone="online"`/`tone="warning"` |
| Joined | mono 12.5 `text-muted` | `DatePipe` mono (ok) | beibehalten, in Grid-Cell |
| Actions | `Btn danger sm` „Remove"/„Revoke" | `mns-btn danger sm` (ok) | beibehalten; Label „Revoke" wenn `status==='pending'`, sonst „Remove" |
| Empty | `mns-empty` (vorhanden, ok) | `mns-empty` | beibehalten |
| Invite-Trigger | Header-Action `Btn primary icon Plus` | Ad-hoc-Zeile | in `mns-page-header`-Slot |

### Notification Config (`settings/org/org-notification-config.ts`)
| Aspekt | Soll | Ist | Aktion |
|---|---|---|---|
| SMTP-Card | `Card`+`CardHead` icon `Mail`; Felder Host/Port/User/Pass/From; TLS-ToggleRow; Footer Save+Test | vorhanden (Primitive) | Port-`<input number>` → `mns-sinput [mono]` (Entsch. siehe unten); sonst ok |
| ntfy-Card | `Card`+`CardHead` icon `Bell`; URL/Topic/Token; Info-Hinweis `accent-soft`; Footer Save+Test | vorhanden | Info-Icon-SVG → `mns-icon name="Info"`/`Cast` falls vorhanden, sonst belassen |
| Alert-Rules-Card | 5 ToggleRows (offline/recovered/transcodeFail/storage/weekly) | sichtbar aber **tot** (kein Binding) | **Entscheidung 5 (A): Card entfernen** (Backlog: echtes Backend-Feature) |
| Port-Feld | `SInput mono` | `<input type=number>` | auf `mns-sinput [mono]` umstellen (Port als String-Signal, beim Save zu number casten) |
| State | Signals | `ChangeDetectorRef`+plain | Entscheidung 6 (B): Flags zu Signals, `cdr` raus |

### Storage (`settings/org/org-storage.ts`)
| Aspekt | Soll | Ist | Aktion |
|---|---|---|---|
| Card | `Card`+`CardHead` icon `Storage`, max-w 720 | vorhanden (`max-w-[720px]`) | beibehalten |
| Storage-Rows | 2 `StorageRow` (Originals `info`, Transcoded `accent`), `Bar glow h=9`, mono Used-Label + „% used" | `app-storage-usage-bars` (geteilt) | beibehalten; prüfen ob `storage-usage-bars` Glow + mono-Labels + „% used" wie Referenz darstellt — wenn nicht, angleichen (Bar `glow`, mono) |
| Stats-Footer | 4 Stats (Total/Allocation/Files/Largest) mono | aktuell nur Bars | optional ergänzen, **nur** wenn `StorageInfo` diese Felder liefert (sonst weglassen — keine Fake-Daten) |
| Tab-Bar | siehe Tabs | dupliziert | Entscheidung 1 (B) |

### Profile / User Settings (`settings/user/user-settings.ts`)
| Aspekt | Soll | Ist | Aktion |
|---|---|---|---|
| Profile-Card | Gravatar-Switch-Row + Email(disabled)+Display-Name | vorhanden, reskinnt | ok; optional `mns-page-header` voranstellen (Entsch. 8 A) |
| Notification-Channels | 3 ChannelRows (In-app/Email/ntfy) mit Switches | `mns-toggle-row` verdrahtet | ok |
| Change-Password | Grid 1fr/1fr, 3 Felder, Hint „≥8" / Mismatch | vorhanden | ok |
| Change-Email | New-Email + Current-Password | vorhanden | ok |
| Danger-Zone | rote Card, Delete-Account | `mns-card border-offline/40` | ok; Card-Border evtl. zusätzlich `box-shadow 0 0 0 1px offline-dim` (Referenz `profile.jsx:91`) |
| Delete-Modal | `Overlay` + Panel + type-„delete"-Confirm (Referenz) bzw. Passwort-Confirm (echte App) | **handgebautes `.modal-overlay`** (Z. 346–404) | Entscheidung 7 (A): `mns-overlay` + Panel; Passwort-Confirm beibehalten (echtes Backend nutzt Passwort, nicht „type delete") |
| Appearance-Picker | (nicht in Referenz settings.jsx — eigene Erweiterung) | vorhanden + verdrahtet an `ThemeService` | ok, beibehalten |

### Accent / Density Picker
| Aspekt | Soll/Plan | Ist | Aktion |
|---|---|---|---|
| Ort | In `settings/user` („Profile & settings") laut IMPLEMENTATION-PLAN Phase 2/3 | bereits in `user-settings.ts:186–244` | keine Aktion — bereits implementiert |
| Wiring | `ThemeService.setAccent()/setDensity()`, `accent`/`density`-Signals | `themeService.accent/density` + `setAccent/setDensity` (Z. 431–440) | ok; Picker spiegelt sich über `ThemeService`-`effect` auf `<html data-accent/-density>` |
| Optik | Accent: 4 Swatch-Buttons; Density: 3 Karten | vorhanden | beibehalten; ggf. an Token-Klassen statt inline-`+'22'` angleichen (Accent-aktiv → `bg-accent-soft`/`border-accent`/`text-accent` statt `opt.color+'22'`) |

### Modals
| Modal | Soll | Ist | Aktion |
|---|---|---|---|
| Invite (users) | Overlay + Icon-Tile-Header `Mail` + Email-`SInput` + Role-Select + Cancel/Send | `.modal-overlay` handgebaut (Z. 192–296) | Entsch. 7 (A): `mns-overlay`+`mns-modal`, Role → `mns-select`, Footer-Slot |
| Remove-Confirm (users) | Overlay + kurzer Confirm | `.modal-overlay` handgebaut (Z. 299–334) | Entsch. 7 (A): `mns-overlay` + schlankes Panel (`mns-modal` optional) |
| Delete-Account (profile) | Overlay + Danger-Header + Confirm | `.modal-overlay` handgebaut (Z. 346–404) | Entsch. 7 (A): `mns-overlay` + Panel; Passwort-Confirm beibehalten |
| Switch-Org | Overlay + Org-Liste (in Topbar/Shell, nicht Settings) | `shell/org-switch-modal.ts` (separat, Phase 2) | **out of scope** dieses Plans (Shell) |

## Umsetzung (Phasen)

> Reihenfolge so, dass die App nach jeder Phase lauffähig bleibt. Bestehende Services/Signals bleiben:
> `MemberService`, `OrgNotificationConfigService`, `ContentService.getStorage`, `ProfileService`,
> `NotificationPreferencesService`, `ThemeService`. Specs nach jeder Phase anpassen.

### Phase A — Shared `SettingsTabsComponent` (Entscheidung 1B)
1. Neu: `settings/settings-tabs.component.ts` — standalone, `OnPush`, `RouterLink` + `RouterLinkActive`,
   3 Tabs (User Management → `/settings/users`, Notification Config → `/settings/org/notifications`,
   Storage → `/settings/org/storage`). Underline via Tailwind: Wrapper `flex gap-1 border-b border-border
   mb-[var(--gap)]`, Tab `flex items-center gap-2 px-3.5 py-3 -mb-px text-sm font-semibold border-b-2
   border-transparent text-muted hover:text-text transition-colors`, aktiv (`routerLinkActive`) →
   `text-text border-accent`. Optional `mns-icon` je Tab (`User`/`Bell`/`Storage`).
2. In `users.ts`, `org-notification-config.ts`, `org-storage.ts`: die duplizierte Tab-Leiste + `.settings-tab`-Styles
   entfernen, `<app-settings-tabs />` einbinden, `RouterLink`-Import entfernen wo nur dafür genutzt.

### Phase B — User Management Grid-Card (Entscheidungen 2A, 3A, 4A, 7A)
1. `mns-page-header title="User Management" sub="Manage who has access to <org> and what they can do"
   icon="User"` voranstellen; Invite-`mns-btn primary icon="Plus"` in den Header-Slot (öffnet Invite-Modal).
2. Seat-Summary: 2 Kacheln (Members = `members().filter(active).length`, Pending = `…pending`),
   Icon-Tiles 38×38 `rounded-[11px] bg-accent-soft text-accent`, Zahl `font-mono text-lg font-bold`.
   Als `computed()` von `members()`.
3. `<table>` durch `mns-card [pad]="false"` Grid-Card ersetzen: Header-Row (`grid` + `COLS`,
   `bg-surface-2 border-b border-border`, Spalten-Labels Overline 10.5/700 uppercase `text-faint`),
   pro Member eine Grid-Row (`grid` + `COLS`, `border-t border-border` ab Row 2):
   Avatar (`mns-avatar [name]` Initialen) + Name; Email (`text-muted` truncate); Rolle
   (`mns-select` `[(value)]`+`(changed)="changeRole(member,$event)"`, options Org-Rollen);
   Status (`mns-badge` online/warning); Joined (`| date:'mediumDate'` mono); Actions
   (`mns-btn danger sm icon="Trash"` „Remove"/„Revoke"). Auf < 880px Grid auf `grid-cols-1`/Label-Value-Stapel.
4. Invite-Modal: `@if (showInviteModal())` → `<mns-overlay (closed)="closeInviteModal()">`
   `<mns-modal title="Invite a user" icon="Mail" (closed)="closeInviteModal()">` mit `mns-sfield`/`mns-sinput`
   (Email) + `mns-sfield` + `mns-select` (Role, an `inviteRole`-Signal). Footer in `<div slot="footer"
   class="flex gap-2.5 px-6 pb-5">`: Cancel (`outline full`) + Send (`primary full icon="Mail"`,
   disabled bis `isInviteEmailValid()`). `inviteRole` von plain Feld zu `signal<OrganisationRole>` ändern
   (mns-select bindet kein ngModel).
5. Remove-Confirm-Modal: `<mns-overlay (closed)="cancelRemove()">` + schlankes Panel (`bg-surface
   border border-border-strong rounded-xl p-6 max-w-[420px]`, `(click)="$event.stopPropagation()"`),
   Titel „Remove member" + Text mit `removingMember()?.user?.email` + Cancel/Remove-Buttons.
6. `.modal-overlay`-Markup + dazugehörige Styles entfernen. Keine Service-/Methoden-Signatur ändern
   (`openInviteModal/closeInviteModal/submitInvite/changeRole/confirmRemove/cancelRemove/executeRemove` bleiben).
7. `users.spec.ts` (488 Z.) anpassen: Selektoren von `<table>`/`<select>` auf Grid-Card/`mns-select`/`mns-overlay`
   umstellen (siehe Risiken).

### Phase C — Notification Config aufräumen (Entscheidungen 5A, 6B)
1. Alert-Rules-Card (Z. 197–235) **entfernen**.
2. Port-`<input type="number">` (Z. 73–80) durch `mns-sinput [mono]` ersetzen; `smtpPort` als String-Signal
   führen, beim Save zu `number | null` casten (`Number(port) || null`).
3. `loading`/`loadError`/`savingSmtp`/`savingNtfy`/`testingEmail`/`testingNtfy`/`hasSmtpPassword`/`hasNtfyToken`
   zu `signal()` machen; `ChangeDetectorRef` + alle `markForCheck()` entfernen; Template auf Signal-Aufrufe
   (`loading()` etc.) umstellen. Form-Felder dürfen `[(ngModel)]`+plain bleiben.
4. `mns-page-header title="Notification Config" sub="Email & push delivery settings for your organisation"
   icon="Bell"` voranstellen.
5. `org-notification-config.spec.ts` (456 Z.) + `…service.spec.ts` anpassen (Alert-Rules-Asserts raus,
   Signal-Zugriffe).

### Phase D — Storage Politur (Entscheidung 1B)
1. `mns-page-header title="Storage" sub="Track media usage against your allocated limits" icon="Storage"`.
2. Prüfen, ob `app-storage-usage-bars` die Referenz-Optik (zwei Rows mit Icon-Tile, mono Used-Label,
   `Bar glow h=9`, „% used"-Zeile) trifft; falls nicht, in `shared/storage-usage-bars.ts` an die `StorageRow`-Optik
   angleichen (Bar `glow`, mono, Farben `info`/`accent`). Stats-Footer nur ergänzen, wenn `StorageInfo` die Werte hat.

### Phase E — Profile-Modal + Header (Entscheidungen 7A, 8A)
1. Delete-Account-Modal von `.modal-overlay` auf `<mns-overlay (closed)="cancelDeleteAccount()">` + schlankes
   Panel umstellen; Passwort-Confirm-Form beibehalten. `.modal-overlay`-Reste entfernen.
2. `mns-page-header title="User Settings" sub="Manage your personal account across every organisation"
   icon="Settings"` voranstellen; Container-Breite optional auf `max-w-[760px]`.
3. Danger-Card-Border optional an Referenz angleichen (`box-shadow:0 0 0 1px var(--offline-dim)`).
4. `user-settings.spec.ts` (325 Z.) anpassen (Modal-Selektoren).

### Phase F — Verifikation
- `npx nx run-many -t lint typecheck build -p frontend` + `format:check`.
- `npx nx test frontend` (Vitest, harter Gate, `pool:'forks'`) — alle vier Settings-Specs grün.
- Visuell `npm run dev` → :4200: alle vier Views in dark+light, Accent indigo/teal/amber/blue, Density
  compact/regular/comfy, Breakpoints 1100/880/560px. Modals schließen per Esc/Backdrop. Keine Konsolenfehler.
- DoD je View (IMPLEMENTATION-PLAN „Verifikation"): Hover/Active/Focus/Loading/Empty vorhanden;
  Entrance-Anim strandet nicht bei `opacity:0`; `prefers-reduced-motion` respektiert; OnPush/Signals; keine NgModules.

## Betroffene Dateien

**Neu:**
- `apps/frontend/src/app/settings/settings-tabs.component.ts` (Shared Underline-Tabs, Entscheidung 1B)
- ggf. `apps/frontend/src/app/settings/settings-tabs.component.spec.ts`

**Umbauen (Re-Skin / Logik teils anpassen):**
- `apps/frontend/src/app/settings/users/users.ts` — Tabelle→Grid-Card, `<select>`→`mns-select`,
  2 Modals→`mns-overlay`, Seat-Summary, `mns-page-header`, `inviteRole` plain→Signal.
- `apps/frontend/src/app/settings/users/users.spec.ts` — Selektoren.
- `apps/frontend/src/app/settings/org/org-notification-config.ts` — Alert-Rules entfernen, Port→`mns-sinput`,
  Signals statt `ChangeDetectorRef`, `mns-page-header`, Tab-Leiste→Shared.
- `apps/frontend/src/app/settings/org/org-notification-config.spec.ts` — Asserts anpassen.
- `apps/frontend/src/app/settings/org/org-storage.ts` — Tab-Leiste→Shared, `mns-page-header`, Politur.
- `apps/frontend/src/app/settings/org/org-storage.spec.ts` — Selektoren ggf.
- `apps/frontend/src/app/settings/user/user-settings.ts` — Delete-Modal→`mns-overlay`, `mns-page-header`,
  Container-Breite, Danger-Border.
- `apps/frontend/src/app/settings/user/user-settings.spec.ts` — Modal-Selektoren.
- ggf. `apps/frontend/src/app/shared/storage-usage-bars.ts` — Bar-Optik an `StorageRow` angleichen.

**Entfernen (innerhalb der Dateien):**
- `.modal-overlay`-Markup + zugehörige Styles in `users.ts` (2×) und `user-settings.ts` (1×).
- `.settings-tab`-Custom-CSS + duplizierte Tab-Leiste in den drei Org-Views.
- Native `<table>` + native `<select>` in `users.ts`.
- Alert-Rules-Card in `org-notification-config.ts`; `ChangeDetectorRef`-Import + `markForCheck()`-Aufrufe.

**Nicht anfassen (bleiben):**
- `apps/frontend/src/app/app.routes.ts` (Routen bleiben — 4 separate Pfade).
- Services + Models: `settings/users/member.service.ts` + `member.model.ts`,
  `settings/org/org-notification-config.service.ts`, `settings/user/profile.service.ts`,
  `settings/user/notification-preferences.service.ts`, `content/content.service.ts`.
- `apps/frontend/src/app/shell/theme.service.ts` (Picker bindet daran; keine Änderung nötig).
- UI-Primitive in `apps/frontend/src/app/ui/**` (werden nur konsumiert).

## Risiken / Hinweise

- **OnPush + async (MEMORY):** Alle HTTP-Callback-gesetzten Werte müssen Signals sein, sonst bleibt die
  View bei „Loading…" hängen (dokumentierte Regression in audit-log). `users.ts`/`org-storage.ts`/`user-settings`
  machen das bereits richtig; `org-notification-config.ts` ist umzustellen (Entsch. 6).
- **`mns-select` ist nicht ngModel-fähig** (nur Signal-`model<string>` + `changed`-Output). Beim Ersetzen der
  nativen `<select>` (Member-Rolle + Invite-Rolle) auf Signal-Bindung umstellen; `inviteRole` von plain Feld
  zu `signal<OrganisationRole>` ändern und in `submitInvite()`/`openInviteModal()` `.set()` nutzen.
- **`mns-overlay`/`mns-modal` Close-Verhalten:** Schließen über `(closed)`-Output (Backdrop + Esc bereits
  integriert) — die alten `(click)`/`(keydown.escape)`-Handler am `.modal-overlay` entfallen. `mns-modal`
  rendert Close-X selbst (kein eigenes ✕ mehr nötig). Footer geht über `<div slot="footer">`.
- **`mns-modal` max-w-[520px]:** Remove-/Delete-Confirm in der Referenz sind schmaler (420/460). Für diese
  ist `mns-overlay` + eigenes schlankes Panel sauberer als `mns-modal`; Hauptsache kein `.modal-overlay`.
- **Specs sind umfangreich** (users 488, notif 456, user-settings 325, storage 73 Z.) und prüfen aktuell
  Tabellen-/`<select>`-/`.modal-overlay`-Selektoren. Nach jedem Template-Umbau die Specs synchron anpassen —
  Frontend-Tests sind in CI ein **harter Gate** (kein `continue-on-error`).
- **Keine Fake-Daten:** Owner-Rolle, Seat-Limits, Alert-Rules-Persistenz, Storage-Stats-Footer-Felder nur
  rendern, wenn das echte Datenmodell sie liefert (Reskin-Regel: an echte Services binden, Mock-Daten nur
  als Form-Referenz).
- **Alert-Rules-Backlog:** Falls der User die volle Treue (Entsch. 5 Option B) will, ist das ein separates
  Backend-Feature (Schema-Migration + DTO + Dispatch-Auswertung) — nicht Teil eines reinen Reskin-PRs.
- **`prefers-reduced-motion`** + Entrance-Gating: `mns-card [animate]` nutzt `fadeUp`; sicherstellen, dass
  der sichtbare End-State Default ist (nie bei `opacity:0` stranden), wie in den anderen reskinnten Views.
- **i18n der Texte:** Referenz nennt „ExampleOrg"; im echten UI den aktiven Org-Namen aus
  `OrganisationStateService` einsetzen (oder generisch „your organisation"), nicht hardcoden.
