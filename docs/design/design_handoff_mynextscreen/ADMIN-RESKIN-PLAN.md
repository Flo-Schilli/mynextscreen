# Instance-Admin Reskin — Umsetzungsplan

**Verzeichnis:** `apps/frontend/src/app/admin/` (4 lazy-Routen unter `app.routes.ts`
Z. 43–65, alle hinter `superAdminGuard`: `/admin/dashboard`, `/admin/organisations`,
`/admin/users`, `/admin/audit-log`).

**Referenz (Design-Spec):**
`docs/design/design_handoff_mynextscreen/reference/admin.jsx` (+ `admin_data.jsx` für
die Mock-Datenformen), `LoadGraph`-Spec in `components.md` Z. 125–132. Phase 4 =
**amber Instance-Chrome** (`CLAUDE.md` Z. 42–44, „Instance Admin amber"). Tokens:
`tailwind-theme.css` Z. 41–43 (`--color-elevated` `#f5a623` / `--color-elevated-2`
`#f97316`), Z. 80 (`--elevated-soft` `rgb(245 166 35 / .16)`), Z. 144
(`--color-elevated-soft` als Tailwind-Util `bg-elevated-soft`).

**Ist-Status (Code gewinnt — die Aufgabenstellung „Currently untouched" stimmt
NICHT mehr):** Die vier **Seiten-Container** sind bereits reskinnt — amber
Page-Header-Tile (gleicher Inline-Style in allen vieren:
`instance-dashboard.ts:56`, `organisations.ts:57`, `all-users.ts:46`,
`instance-audit-log.ts:50`), Tab-Bar, `mns-card`/`mns-badge`/`mns-bar`/`mns-ring`/
`mns-count`/`mns-icon`/`mns-empty`, `mns-load-graph` (`load-graph.component.ts`,
verbatim-Port der Referenz). Der instanzweite Audit-Tab nutzt die geteilte
`AuditLogTable` (`audit-log/audit-log-table.ts`) mit `showOrganisation`.

**Echte Rest-Gaps (= dieser Plan):**
1. **`org-table.ts`** — alte HTML-`<table>` + alte `var(--color-*)`-Tokens
   (`org-table.ts:92/105/110/120`), entspricht NICHT dem `ORG_COLS`-Grid der Referenz
   (`admin.jsx:441–491`). Keine Plan-Badge / Online-Screens / Owner / Storage-Bar-Grid.
2. **`org-member-list.ts`** — alte HTML-`<table>` + `var(--color-*)`
   (`:62/63/67/68/70/76`); native `<select>`.
3. **`org-form.ts`** — alte `.form-card`/`.btn`-Klassen + `var(--color-bg-secondary)`
   (`:89/90`); native Inputs/Select.
4. **4 Modals** mit `.modal-overlay`/`.modal`/`.btn` (global aus `src/styles.css`):
   `org-add-member-modal.ts`, `org-remove-member-modal.ts`, `org-delete-modal.ts`,
   `users/user-delete-modal.ts` → auf `mns-overlay`/`mns-modal`/`mns-btn` umstellen.
5. **`instance-audit-log.ts`** Filter-Bar nutzt native `<select>`/`<input>` + lokale
   `.filter-bar`-Styles (`:80–150`, `:183–238`) statt `mns-select`/`mns-sinput`.
6. **Dashboard** dem `DashboardTab` (`admin.jsx:313–435`) fehlen: Per-Org-Legende
   in der Storage-Karte, die „Organisations · Usage at a glance"-Snapshot-Karte und
   die „Instance · Runtime & health"-Info-Karte. Die KPI-„Storage Used"-Kachel weicht
   von der Referenz-„Host disk free"-Kachel ab (Referenz hat 4 KPIs: Organisations /
   Users-dual / Screens / Host-disk-free — KEINE „Storage Used"-Kachel).

> **Es gibt KEINE eigene Admin-Shell.** Die Referenz (`admin.jsx:53–182`,
> `AdminSidebar`/`AdminTopbar`) zeigt eine separate amber Sidebar + Topbar mit
> „Superuser"-Identity-Chip. Im realen Repo läuft Instance-Admin **innerhalb der
> normalen App-Shell** (`shell/layout.ts`, `app-sidebar.ts`, `app-topbar.ts`). Siehe
> Entscheidung 1.

---

## Offene Entscheidungen

### 1. Eigene amber Admin-Shell (Sidebar + Topbar) — bauen oder weglassen?
**Frage:** Die Referenz rendert eine eigenständige `AdminSidebar` (einziger amber-
aktiver Nav-Eintrag + „Back to workspace" + Logout, `admin.jsx:53–145`) und
`AdminTopbar` (Search „⌘K" + amber „Superuser"-Identity-Chip, `:150–182`) — eine
eigene Shell außerhalb von `app-shell`. Real teilen sich alle 4 Admin-Routen die
normale `shell/layout.ts`.
**Optionen:**
- **(A)** Eigene `admin-shell`-Komponente bauen (neue Route-Ebene `/admin` mit
  `loadChildren`, amber Sidebar/Topbar), wie `angular-architecture.md:86–95` vorsieht.
- **(B)** Bei der bestehenden Shell bleiben; amber-Chrome nur über Page-Header-Tile +
  „Superuser"-Badges + amber-aktiven Sidebar-Eintrag in der bestehenden `app-sidebar.ts`.
- **(C)** Hybrid: keine neue Shell, aber den bestehenden `/admin/*`-Sidebar-Eintrag in
  `app-sidebar.ts` amber einfärben (aktiver Zustand `bg-elevated-soft text-[--color-elevated]`
  + amber Akzent-Balken) und in `app-topbar.ts` einen „Superuser"-Chip ergänzen, wenn
  `auth.isSuperAdmin()`.
**Empfehlung: (C).** Die geteilte Shell ist bereits über alle anderen reskinnten
Features (Screens/Audit/Settings) etabliert; eine parallele Shell zu bauen wäre ein
großer, riskanter Umbau mit Routing-/Guard-/Navigation-Duplikat. Die amber-Signalwirkung
(Chrome-Akzent) lässt sich vollständig über (C) erreichen, ohne die bestehende
Navigation zu zerlegen. Eigene Shell (A) nur, falls das Produkt eine echte
Mode-Trennung „workspace ↔ instance" mit „Back to workspace" verlangt → dann als
separater Folge-PR.

### 2. Org-Tabelle: Plan / Screens-online / Owner — woher die Daten?
**Frage:** Referenz-`OrganisationsTab` (`admin.jsx:441–491`) zeigt pro Org: Plan-Badge
(`Business`/`Trial`), Screens `online / total` mit grünem Status-Dot, Owner-E-Mail,
Storage-Bar. Das `organisations`-Schema (`backend/src/db/schema.ts:64`) hat **nur**
`name`, `timeZone`, Storage-Felder, `defaultPlaylistId`, Timestamps — **kein** plan,
status, owner, screen-count. `Organisation` (Frontend-Model) ebenso.
**Optionen:**
- **(A)** Backend erweitern: `plan`-Enum-Spalte + Screens-Aggregat
  (`COUNT(screens)`, `COUNT(... online)`) + Owner (erster `org_admin`-Membership) im
  `GET /api/organisations`-Response (oder eigener Admin-Endpoint). Migration nötig.
- **(B)** Nur Owner + Screen-Counts serverseitig aggregieren (existieren als Relationen),
  Plan/Status **weglassen** (kein Geschäftskonzept im Repo — VISION nennt keine Pläne).
- **(C)** Reine Reskin: vorhandene Felder neu layouten (Name, Time Zone, Members,
  Storage-Bar, Created), Plan/Screens/Owner-Spalten **streichen** (Scope-Cut).
**Empfehlung: (B) für Screens+Owner, Plan streichen.** Member-Count wird heute schon
clientseitig je Org geladen (`organisations.ts:291–296`); Screen-Online/Total und
Owner sind echte, sinnvolle Admin-Infos und über bestehende Relationen ohne neues
Fachkonzept aggregierbar. **Plan/Status** sind reine Mock-Fiktion (kein Billing im
Produkt) → streichen, sonst Fake-Daten. Konkreter Vorschlag: neuer
`GET /api/admin/organisations`-Endpoint im bestehenden `instance-admin`-Modul, der
`Organisation & { memberCount, screenCount, screenOnlineCount, ownerEmail }` liefert;
spart zugleich das N+1-Member-Count-Laden in `organisations.ts`.

### 3. LoadGraph: `transcodeWindows`-Schraffur — Daten liefern oder leer lassen?
**Frage:** Referenz schraffiert Transcode-Fenster (`admin.jsx:259–264`,
`transcodeWindows: [[9,12],[17,20]]`). Real liefert `SystemLoad`
(`instance-admin.model.ts:30`) **kein** `transcodeWindows`; das Dashboard setzt es
hart auf `[]` (`instance-dashboard.ts:363`) und das Badge wurde von „Transcode peaks
shaded" auf „Hourly average" geändert (`:270`).
**Optionen:**
- **(A)** Backend: aus BullMQ-Transcoding-Job-Historie pro Stunde Fenster ableiten und
  in `/api/admin/dashboard/load` als `transcodeWindows: [number,number][]` (Index-Paare
  in die 24h-Serie) zurückgeben. `SystemLoad`-Model + DTO erweitern.
- **(B)** Status quo: keine Schraffur, Badge „Hourly average" beibehalten.
**Empfehlung: (B) jetzt, (A) als optionaler Folge-Schritt.** Der Chart ist visuell
bereits korrekt (Port ist verbatim); die Schraffur ist „nice to have" und erfordert
Job-Historien-Aggregation, die es noch nicht gibt. Wenn (A) gewünscht: Phase F unten.
Badge dann wieder auf `Transcode peaks shaded` zurücksetzen.

### 4. Dashboard-KPI: „Storage Used" behalten oder durch Referenz-Layout ersetzen?
**Frage:** Real existiert eine 4. KPI „Storage Used" (`instance-dashboard.ts:144–162`);
Referenz hat stattdessen die Reihenfolge Organisations / Users(dual) / **Screens** /
Host-disk-free — KEINE „Storage Used"-Kachel (Screens stattdessen).
**Optionen:**
- **(A)** Referenz exakt: „Screens"-KPI (`tone=online`, Icon `Screens`,
  `{online} online across instance`) einführen, „Storage Used" entfernen. Braucht
  Screen-Aggregat aus dem Summary-Endpoint (Entscheidung 2/Backend).
- **(B)** „Storage Used" behalten (zeigt vorhandene Daten), Screens-KPI weglassen.
- **(C)** 5 KPIs (beide) — Grid auf `repeat(5,1fr)` / responsive.
**Empfehlung: (A)**, gekoppelt an Entscheidung 2-Backend (Screen-Counts). Screens sind
die aussagekräftigere instanzweite KPI und matchen die Referenz; das kombinierte
Storage-Total ist in der „Storage — Allocated vs Used"-Karte direkt darunter ohnehin
sichtbar. Falls das Backend-Aggregat nicht gebaut wird → Fallback (B).

### 5. Per-Org-Daten im Dashboard (Legende + Snapshot-Karte) — Datenquelle?
**Frage:** Referenz-Storage-Karte hat eine Per-Org-Legende (`admin.jsx:349–359`) und es
gibt eine eigene „Organisations · Usage at a glance"-Snapshot-Karte
(`:394–414`) — beide brauchen die **Org-Liste mit Storage je Org**. Das aktuelle
`InstanceAdminSummary` (`instance-admin.model.ts:19`) liefert nur **Aggregat-Totale**,
keine Org-Liste.
**Optionen:**
- **(A)** Dashboard lädt zusätzlich `organisationService.getAll()` (existiert) und
  rendert Legende + Snapshot aus den echten Org-Storage-Feldern.
- **(B)** Summary-Endpoint um `organisations: {id,name,origUsed,...}[]` erweitern
  (ein Call statt zwei).
**Empfehlung: (A).** `OrganisationService.getAll()` ist vorhanden und org-scoped-sicher;
kein Backend-Change nötig. Die Org-Initialen-Tile (Gradient) aus `name.slice(0,1)`
ableiten wie in der Referenz (`grad`-Mock entfällt — deterministisch aus Name/ID via
vorhandenem Avatar/Identicon-Schema).

### 6. Topbar-Search „⌘K" + Notifications-Bell (Referenz-AdminTopbar)
**Frage:** Referenz-Topbar hat ein Such-Input + Bell. Real (Entscheidung 1=C) bleibt
die normale `app-topbar.ts`.
**Optionen:** (A) globale Such-/Bell-Features ergänzen — großes Eigen-Feature;
(B) weglassen, da nicht Teil des Reskin-Scopes.
**Empfehlung: (B).** Außerhalb des Phase-4-Reskins; Suche/Notifications sind eigene
Produkt-Features (separater Plan).

---

## Soll/Ist-Vergleich

### Shell / Chrome (Entscheidung 1 = C)
| Aspekt | Soll (Referenz) | Ist | Aktion |
|---|---|---|---|
| Shell | Eigene `AdminSidebar`+`AdminTopbar` (amber) | Geteilte `shell/layout.ts` | Bei geteilter Shell bleiben |
| Sidebar aktiver Eintrag | amber `bg-elevated-soft`, `color #f5a623`, amber Akzent-Balken (`admin.jsx:91–99`) | normaler Accent | `app-sidebar.ts`: `/admin/*`-Eintrag amber, wenn aktiv |
| Topbar Identity | amber „Superuser"-Chip (`:173–179`) | normaler User-Menu | `app-topbar.ts`: amber „Superuser"-Chip, wenn `isSuperAdmin()` |
| Page-Header | amber 44×44 Gradient-Tile + H1 27/800 + Sub (`:649–662`) | bereits vorhanden (alle 4 Seiten) | Inline-Style → optional `mns-page-header` (s. u.) |

### Tab: Dashboard
| Element | Soll (`admin.jsx`) | Ist (`instance-dashboard.ts`) | Aktion |
|---|---|---|---|
| KPI 1 Organisations | `StatTile` accent, Building, `sub "1 Business · 1 Trial"` (`:320`) | vorhanden, sub „Active tenants" | sub neutral lassen (kein Plan, Entsch. 2) |
| KPI 2 Users dual | Verified(online)/Pending(warn) + „N total"-Pill (`:321–333`) | vorhanden (`:114–142`) | ok |
| KPI 3 Screens | online/total, `tone=online` (`:334`) | **fehlt** (statt „Storage Used") | Screens-KPI (Entsch. 4A) |
| KPI 4 Host disk free | warn, `freeGB of totalGB · %used` (`:335`) | vorhanden | ok |
| Storage Allocated vs Used | 2 `StorageLine` (Bar+glow) **+ Per-Org-Legende** (`:341–360`) | Bars ja, **Legende fehlt** | Legende ergänzen (Entsch. 5A) |
| Host Disk | Ring 104 + Used/Free + Bar (`:363–386`) | vorhanden | ok |
| System load | CardHead + 2 `LoadReadout` + `LoadGraph` (`:296–311`) | vorhanden, Badge „Hourly average" | ok; Badge ggf. Entsch. 3 |
| Organisations snapshot | „Usage at a glance"-Liste, Bar je Org (`:394–414`) | **fehlt** | neue Karte (Entsch. 5A) |
| Instance info | „Runtime & health" Key/Value-Liste (`:416–432`) | **fehlt** | neue Karte; Daten s. Entsch. 3/Meta |

### Tab: Organisations
| Element | Soll (`admin.jsx:441–491`) | Ist (`org-table.ts`) | Aktion |
|---|---|---|---|
| Container | `mns-card [pad=false]` + `overflow-x-auto` + `min-w-[920px]`, Grid `ORG_COLS` | alte `<table>` + `.table-container` | komplett neu als Grid |
| Header-Row | `bg-surface-2` 10.5/700 uppercase faint | `<thead>` | Grid-Header |
| Org-Zelle | 38×38 Gradient-Initial + Name + **Plan-Badge** + Owner-mono | Name plain | Initial-Tile + Owner; **Plan streichen** (Entsch. 2) |
| Users | mono 14 | Member-Count | ok (aus Endpoint, Entsch. 2B) |
| Screens | Status-Dot + `online / total` | **fehlt** | ergänzen (Entsch. 2B) |
| Storage | `mns-bar` h=7 + `used / max · %` mono | 2× mini-bar (orig/trans) alte Tokens | 1 kombinierte Bar wie Referenz |
| Created | mono 12.5 muted | `date` | ok |
| Actions | `mns-btn outline sm` „Manage" (Eye) | Row-Click | „Manage"-Btn → `selectOrg` |
| Detail/Form/Members | (Referenz hat keinen Detail-Drilldown) | vorhanden (`organisations.ts:100–164`) | behalten, Sub-Komp. reskinnen |

### Tab: Users
| Element | Soll (`admin.jsx:499–566`) | Ist (`all-users.ts`) | Aktion |
|---|---|---|---|
| Summary-Strip | 4 Tiles Total/Verified/Pending/Instance-admins (`:504–516`) | vorhanden (`:82–98`) | ok |
| Tabelle | `mns-card [pad=false]` Grid `USER_COLS` | vorhanden (`:100–208`) | ok (bereits reskinnt) |
| Superuser-Badge | amber Pill (`:537`) | vorhanden (`:140–145`), `var(--color-elevated)` | Token via `text-[color:var(--color-elevated)]`/`bg-elevated-soft` |
| Org-Spalte | `OrgChip` (Gradient-Initial + Name) (`:543`) | Pill ohne Initial (`:159–165`) | optional Initial-Tile ergänzen |
| Status/Role/Actions | Badges + Manage/Resend | vorhanden, zusätzlich Delete | ok (Delete behalten) |

### Tab: Audit Log
| Element | Soll (`admin.jsx:574–618`) | Ist (`instance-audit-log.ts`) | Aktion |
|---|---|---|---|
| Tabelle | eigene Grid `AUD_COLS` | geteilte `AuditLogTable` (`showOrganisation`) | behalten (besser als Referenz) |
| Filter-Bar | (Referenz: keine) | native `<select>`/`<input>` + `.filter-bar`-CSS (`:80–238`) | auf `mns-select`/`mns-sinput` umstellen |
| Export CSV | `mns-btn outline` (`admin.jsx:638`) | vorhanden, Placeholder (`:254`) | ok |

---

## Umsetzung

> Reihenfolge: optionale Backend-Aggregate zuerst (entsperrt KPI/Org-Tabelle),
> dann Frontend-Phasen. Pro Phase: `npx nx test frontend`, `lint`, `typecheck`,
> `format:check` grün halten. Bestehende Services/Signals
> (`InstanceAdminService`, `OrganisationService`, `AdminUserService`,
> `InstanceAuditLogService`) **wiederverwenden**, nicht neu bauen.

### Phase A — (optional, falls Entscheidung 2B/4A „ja") Backend-Aggregat
- Neuer Endpoint im bestehenden Modul `apps/backend/src/instance-admin/`:
  `GET /api/admin/organisations` (Controller + Service-Methode), liefert je Org
  `Organisation & { memberCount, screenCount, screenOnlineCount, ownerEmail }`.
  Aggregation via Drizzle-Joins über `screens` (online = `status`/heartbeat) und
  `user_organisation_memberships` (Owner = erster `org_admin`).
- `instance-admin-dashboard.service.ts`: Summary um `screens: {total, online}`
  erweitern (für KPI 3). DTO + Frontend-Model (`InstanceAdminSummary`,
  `instance-admin.model.ts:19`) spiegeln.
- Tests: Service-Spec (Aggregat-Korrektheit, org-scope), Coverage-Gate (Backend ~80%).
- **Wenn Phase A entfällt:** Frontend lädt Org-Liste via `OrganisationService.getAll()`
  (Entsch. 5A) und zeigt Member-Count clientseitig wie heute; Screens-KPI → Fallback 4B.

### Phase B — Modals auf `mns-overlay`/`mns-modal` (kleinster, isolierter Schritt)
Vier Dateien, identisches Muster (Referenz-Modal-Struktur `components.md:116–119`,
Vorbild `ui/overlay.component.ts`):
- `org-add-member-modal.ts`, `org-remove-member-modal.ts`, `org-delete-modal.ts`,
  `users/user-delete-modal.ts`.
- Ersetzen: `.modal-overlay`/`.modal`-Wrapper → `<mns-overlay (closed)="dismiss.emit()">
  <mns-modal title="…" icon="…" (closed)="dismiss.emit()"> … <div slot="footer"> …
  </div></mns-modal></mns-overlay>`. Esc/Backdrop kommen aus `mns-overlay`.
- Buttons: `.btn .btn-secondary/.btn-danger/.btn-primary` → `<mns-btn variant="…">`.
- Form-Felder (Add-Member): native `<input>`/`<select>` → `mns-sfield` + `mns-sinput` +
  `mns-select`.
- `imports` der jeweiligen Komponente um `OverlayComponent, ModalComponent, BtnComponent`
  (+ ggf. `SFieldComponent, SInputComponent, SelectComponent`) ergänzen; `OnPush` setzen.
- Specs (`org-add-member-modal.spec.ts`, `org-remove-member-modal.spec.ts`) anpassen
  (Selektoren auf `mns-overlay`/`mns-modal`/`mns-btn`).

### Phase C — `org-form.ts` reskin
- `.form-card` → `<mns-card>` mit `mns-card-head title="Create/Edit Organisation"`.
- Inputs/Select → `mns-sfield` + `mns-sinput` (Name; Storage MB → `[mono]`,
  `suffix="MB"`) + `mns-select` (Time Zone, `SelectOption[]` aus `IANA_TIME_ZONES`).
- Actions → `mns-btn` (Cancel `ghost`/`outline`, Submit `primary`,
  `[disabled]="submitting()"`).
- Error-Zeile → `text-offline text-sm`. Lokale `styles` entfernen, `OnPush`.

### Phase D — `org-table.ts` reskin (Hauptgap)
- Komplett neu als `mns-card [pad]="false"` + `overflow-x-auto` + `min-w-[920px]`,
  Grid analog Referenz `ORG_COLS` (angepasste Spalten, da Plan gestrichen, Entsch. 2):
  `Organisation | Users | Screens | Storage | Created | Actions`.
- Header-Row: `bg-surface-2 border-b border-border`, Labels 10.5/700 uppercase
  `text-faint`.
- Org-Zelle: 38×38 `rounded-[10px]` Gradient-Initial (deterministisch aus `org.name`,
  Vorbild `OrgChip` `admin.jsx:205–212` / vorhandenes `mns-avatar`), Name 14/700,
  Owner-E-Mail mono 11.5 faint (Entsch. 2B).
- Screens-Zelle: grüner Status-Dot (`bg-online`, `shadow 0 0 0 3px var(--online-dim)`)
  + `online / total` mono.
- Storage: **eine** `mns-bar [value]="pct" color="var(--accent)" [h]="7"` +
  `used / max · %` mono faint (kombiniert orig+trans wie Referenz).
- Actions: `<mns-btn variant="outline" size="sm" icon="Eye" (mnsClick)="selectOrg.emit(org)">
  Manage</mns-btn>`.
- Alte `styles` + `var(--color-*)` entfernen; `imports` um `mns-*`; `OnPush`.
- `org-table.spec.ts` an neue Struktur anpassen.

### Phase E — `org-member-list.ts` reskin
- `<table>` → `mns-card [pad]="false"`-Grid (Spalten Name | Email | Role | Joined |
  Actions) oder einfache Row-Liste mit `border-t border-border`.
- Role-`<select>` → `mns-select` (`SelectOption[]` Org Admin/Editor/Viewer),
  `[disabled]` an `updatingMemberId`.
- Remove-Button → `<mns-btn variant="danger" size="sm" icon="Trash"
  [disabled]="removingMemberId()===member.userId">`.
- Alte `styles`/Tokens raus; `imports` um `mns-*`; `OnPush`.

### Phase F — `instance-audit-log.ts` Filter-Bar reskin
- `.filter-bar` + native `<select>`/`<input>` → Karte/`flex flex-wrap` mit
  `mns-sfield` + `mns-select` (Organisation/Action/User/Resource) und `mns-sinput`
  (From/To `type="date"`). „Clear filters" → `mns-btn variant="ghost" size="sm"`.
- Lokale `styles` (`:183–238`) entfernen; FormsModule bleibt nur, wo nötig (oder auf
  `mns-select`-`model()` umstellen).

### Phase G — Dashboard-Ergänzungen
- **KPI 3 Screens** (Entsch. 4A) statt „Storage Used" — `tone=online`, Icon `Screens`,
  Wert `screens.total`, sub `{online} online across instance` (Daten aus Phase A oder
  Fallback weglassen).
- **Per-Org-Legende** in Storage-Karte (Entsch. 5A): unter den 2 Bars
  `border-t border-border`, Grid `1fr 1fr`, je Org 26×26 Initial-Tile + Name +
  `usedBytes used · {limitGB} GB` mono. Org-Liste via `OrganisationService.getAll()`.
- **Snapshot-Karte** „Organisations · Usage at a glance" (`mns-card [pad]="false"`,
  CardHead + Row je Org mit 36×36 Tile + `users · screens` + `mns-bar` h=7).
- **Instance-Info-Karte** „Runtime & health": Key/Value-Liste (Health-Badge online,
  Version, Uptime, Region, Last backup). **Datenquelle klären** — die Meta-Werte
  (`admin_data.jsx:52–59`) sind Mock; entweder aus `/api/version` (Version) +
  künftigem Meta-Endpoint, oder Karte vorerst weglassen (Scope-Cut, in Entsch.-Notiz
  vermerken). Empfehlung: nur „Version" aus echtem `/api/version` zeigen, Rest später.

### Phase H — Chrome-Akzent (Entscheidung 1 = C)
- `shell/app-sidebar.ts`: `/admin/*`-Nav-Eintrag im aktiven Zustand amber
  (`bg-elevated-soft`, `text-[color:var(--color-elevated)]`, amber Akzent-Balken),
  wenn `isSuperAdmin()`.
- `shell/app-topbar.ts`: amber „Superuser"-Chip (`border [color:var(--color-elevated)]/20`,
  `bg-elevated-soft`, Label „Superuser" in `--color-elevated`), wenn `isSuperAdmin()`.
- Page-Header-Tile (4 Seiten) optional auf gemeinsames `mns-page-header` heben oder
  Inline-Style belassen (kosmetisch).

### Phase I — (optional) `transcodeWindows` (Entscheidung 3A)
- Backend `/api/admin/dashboard/load`: `transcodeWindows: [number,number][]` aus
  BullMQ-Job-Historie ableiten; `SystemLoad` + DTO + Frontend-Model erweitern.
- `instance-dashboard.ts:363`: hartes `[]` durch echte Daten ersetzen; Badge wieder
  „Transcode peaks shaded" (`:270`). `LoadGraphComponent` rendert die Schraffur bereits.

---

## Betroffene Dateien

### Frontend — umbauen (Reskin, kein Datei-Neuschnitt)
- `apps/frontend/src/app/admin/organisations/org-table.ts` (+ `.spec.ts`) — Phase D
- `apps/frontend/src/app/admin/organisations/org-member-list.ts` (+ `.spec.ts`) — Phase E
- `apps/frontend/src/app/admin/organisations/org-form.ts` (+ `.spec.ts`) — Phase C
- `apps/frontend/src/app/admin/organisations/org-add-member-modal.ts` (+ `.spec.ts`) — Phase B
- `apps/frontend/src/app/admin/organisations/org-remove-member-modal.ts` (+ `.spec.ts`) — Phase B
- `apps/frontend/src/app/admin/organisations/org-delete-modal.ts` — Phase B
- `apps/frontend/src/app/admin/users/user-delete-modal.ts` — Phase B
- `apps/frontend/src/app/admin/audit-log/instance-audit-log.ts` (Filter-Bar) — Phase F
- `apps/frontend/src/app/admin/dashboard/instance-dashboard.ts` — Phase G
- `apps/frontend/src/app/admin/organisations/organisations.ts` — KPI/Service-Verdrahtung
  (Org-Liste für Dashboard ggf. hier nicht; eher im Dashboard-Container), Detail-Header
  ggf. amber-Token-Cleanup
- `apps/frontend/src/app/shell/app-sidebar.ts`, `app-topbar.ts` — Phase H (Entsch. 1C)

### Frontend — neu (nur falls nötig)
- ggf. `apps/frontend/src/app/admin/organisations/org-initial.component.ts` — falls die
  Gradient-Initial-Tile mehrfach gebraucht wird und `mns-avatar` nicht passt
  (sonst `mns-avatar` wiederverwenden — bevorzugt, kein Neu-Bau).

### Frontend — Modelle anpassen (nur bei Phase A)
- `apps/frontend/src/app/admin/dashboard/instance-admin.model.ts` — `screens`-Feld am
  `InstanceAdminSummary`; `transcodeWindows` an `SystemLoad` (nur Phase I).
- `apps/frontend/src/app/admin/dashboard/instance-admin.service.ts` /
  `apps/frontend/src/app/admin/organisations/organisation.service.ts` — neuer
  Admin-Org-Aggregat-Call (nur Phase A).

### Backend — neu/anpassen (nur Phase A / I)
- `apps/backend/src/instance-admin/instance-admin-dashboard.controller.ts` /
  `instance-admin-dashboard.service.ts` — Screens-Aggregat im Summary; ggf. neuer
  `GET /api/admin/organisations` (Phase A).
- `apps/backend/src/metrics/admin-metrics.controller.ts` /
  `metrics/system-metrics.service.ts` / `metrics/dto/metrics.dto.ts` — `transcodeWindows`
  (nur Phase I).
- Migration unter `apps/backend/src/db/migrations/` **nur**, falls eine neue Spalte
  eingeführt wird (Empfehlung: keine — Aggregate sind Joins, keine Schema-Änderung).

### Entfernen
- Lokale `styles`-Blöcke + `var(--color-*)`-Referenzen in `org-table.ts`,
  `org-member-list.ts`, `org-form.ts`, `instance-audit-log.ts` (Filter-Bar).
- `.modal-overlay`/`.modal`/`.btn`/`.table-container`-Abhängigkeiten der 4 Modals
  (kommen aus `src/styles.css`; **`styles.css` NICHT anfassen** — andere, noch nicht
  reskinnte Features nutzen die Klassen weiter).

---

## Risiken / Hinweise

- **Aufgaben-Annahme „untouched" ist falsch.** Die 4 Seiten-Container sind schon
  reskinnt. Nicht neu bauen — nur die Sub-Komponenten/Modals/Filter + Dashboard-Karten
  schließen. Vor Beginn `git status`/Diff der `admin/`-Dateien prüfen.
- **Mock-Felder ≠ echte Daten.** Plan/Status (`admin_data.jsx`) existieren im Schema
  nicht → nicht erfinden (Entsch. 2). Screen-Counts/Owner sind aggregierbar, brauchen
  aber Phase A; ohne Phase A diese Spalten/KPI weglassen statt faken.
- **`var(--color-elevated)` ist korrekt** (in `@theme` definiert, `tailwind-theme.css:41`)
  — NICHT zu `--accent` machen. Amber-Chrome nur via `--color-elevated`/
  `--color-elevated-2`/`--elevated-soft` bzw. Util `bg-elevated-soft`. Das normale
  `--accent` (indigo) bleibt für Content-Karten/Tabs (`CLAUDE.md:42–44`).
- **OnPush + imperative Subscribes = bekannte Falle.** `organisations.ts`/`all-users.ts`/
  `instance-audit-log.ts` nutzen plain Felder + `subscribe` (kein `OnPush`/Signals).
  Beim Reskin der Sub-Komponenten **nicht** unbedacht `OnPush` auf die Container setzen,
  ohne State auf Signals zu heben (siehe MEMORY „OnPush + imperative subscribe
  regression": audit-log blieb auf „Loading…" hängen). Sub-Komponenten sind
  input-getrieben → `OnPush` dort sicher.
- **`mns-icon` ist `display:contents`** (MEMORY): absolute/rotate-Klassen am Host werden
  ignoriert — für den amber Sidebar-Akzent-Balken / Status-Dot ein positioniertes
  `<span>` wrappen, nicht das Icon selbst positionieren.
- **`format:check` ist harter CI-Gate** (MEMORY): vor Commit `npx nx format:check frontend`
  — lange Tailwind-Klassenstrings brechen sonst die Pipeline.
- **Tabellen horizontal scrollbar halten** (`overflow-x-auto` + `min-w-[…]`),
  Breakpoints 1100/880/560 (`CLAUDE.md` DoD), dark+light prüfen.
- **Entrance-Animationen** nie auf `opacity:0` stranden lassen; `prefers-reduced-motion`
  respektieren (in `audit-log-table.ts` schon vorgemacht).
- **Backend-Coverage-Gate (~80%)** greift nur bei Phase A/I — neue Service-Methoden
  brauchen Specs, sonst rote CI.
