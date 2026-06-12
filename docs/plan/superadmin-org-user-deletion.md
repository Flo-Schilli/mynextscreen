# Super-Admin Org/User-Löschung, Self-Delete & 24h-Cleanup

## Context

Beim Self-Signup wurde ein User mit falscher E-Mail angelegt. Aktuell gibt es **keine**
Möglichkeit, eine Organisation oder einen Benutzer zu löschen — der DELETE-Endpoint
fehlt komplett (`organisation.controller.ts` hat nur create/find/update + Member-Mgmt).
Self-Signups bleiben bis zu **48h** (Default `SIGNUP_UNVERIFIED_TTL_HOURS`) liegen, bevor
der stündliche Cron sie aufräumt.

Diese Änderung gibt dem Super-Admin Löschrechte für Orgs und einzelne Benutzer, eine
Benutzerübersicht mit Verifizierungs-Status, jedem User ein Self-Delete, und verkürzt
das Cleanup-Fenster auf **24h** (passt zur ohnehin 24h gültigen Verifizierungs-Token-TTL).

Bestätigte Produktentscheidungen:

- **Org-Löschung** entfernt die Org + alle Inhalte (DB-Cascade) und löscht danach nur
  **verwaiste** Benutzer (keine Mitgliedschaft in einer anderen Org). Super-Admins werden nie gelöscht.
- Die **Super-Admin-Benutzerliste** erlaubt das direkte Löschen einzelner Benutzer.

> **Kein DB-Migrationsbedarf.** Alle org-scoped Tabellen haben bereits
> `onDelete: 'cascade'` auf `organisation_id`; `user_organisation_memberships.user_id`
> cascaded beim User-Delete. Es kommen keine neuen Tabellen/Spalten hinzu.

---

## Backend (`apps/backend`)

### 1. Org-Löschung (Super-Admin)

**`src/audit-log/audit.events.ts`** — neues Event neben `AUDIT_ORGANISATION_UPDATED`:

```ts
export const AUDIT_ORGANISATION_DELETED = "audit.organisation.deleted";
```

> Prüfen: ist `audit_entries.organisation_id` nullable? Wenn nicht (FK cascade löscht
> den Eintrag mit der Org sofort wieder), das Org-Delete stattdessen via `Logger.log`
> protokollieren statt Audit-Eintrag — analog zum Cron in
> `unverified-signup-cleanup.service.ts`. (Entscheidung beim Umsetzen anhand der Spalte.)

**`src/content/content-storage.util.ts`** — Helper neben `getOriginalPath`/`getTranscodedPath`:

```ts
import * as fs from "fs/promises";
export function getOrganisationMediaDir(
  basePath: string,
  organisationId: string,
): string {
  return path.join(basePath, organisationId);
}
export async function removeOrganisationMedia(
  basePath: string,
  organisationId: string,
): Promise<void> {
  await fs.rm(getOrganisationMediaDir(basePath, organisationId), {
    recursive: true,
    force: true,
  });
}
```

**`src/organisation/organisation.service.ts`** — neue Methode `remove(orgId)`:

- `await this.findOne(orgId)` (404-Guard, schon vorhanden).
- Member-`userId`s sammeln (Query `userOrganisationMemberships` für die Org).
- In **einer Transaktion**:
  - `tx.delete(organisations).where(eq(organisations.id, orgId))` → cascade entfernt
    Memberships, Content-Rows, Screens, Playlists, Schedules, sliced_renditions, Audit-Einträge.
  - Für jede gesammelte `userId`: prüfen ob noch Memberships existieren; wenn **keine**
    UND `users.isSuperAdmin === false` → `tx.delete(users)`.
- Nach Commit (best-effort, außerhalb tx): `removeOrganisationMedia(mediaBasePath, orgId)`.
  `ConfigService` injizieren und `MEDIA_BASE_PATH` lesen (gleicher Key wie `content.service`).
- Audit/Log gemäß obiger Entscheidung.

Verwaiste-User-Löschung als wiederverwendbaren Helper auslegen
(`UserService.deleteOrphanUsers(tx, userIds)`), den auch der Cron nutzen kann.

**`src/organisation/organisation.controller.ts`** — analog zu `removeMember`:

```ts
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
  return this.organisationService.remove(id);
}
```

### 2. Self-Delete (jeder eingeloggte User)

**`src/auth/dto/delete-account.dto.ts`** — `{ currentPassword: string }` (`@IsString`).

**`src/user/user.service.ts`** — wiederverwendbare `deleteUser(userId)`:

- In Transaktion: Org-IDs des Users sammeln → `tx.delete(users)` (cascaded Memberships)
  → verwaiste Orgs löschen (Logik aus `deleteStaleUnverifiedSignups` extrahieren/teilen).
- Liefert die gelöschten verwaisten Org-IDs zurück (für Media-Cleanup).
- `deleteStaleUnverifiedSignups` auf den geteilten Helper umstellen (DRY).

**`src/auth/auth.service.ts`** — `deleteAccount(userId, currentPassword)`:

- User laden; Passwort per bcrypt prüfen (gleiche Logik wie `changePassword`); bei
  `passwordHash === null` (Invitee) bzw. Mismatch → `UnauthorizedException`.
- **Lockout-Schutz:** wenn `isSuperAdmin` und letzter Super-Admin → `ForbiddenException`.
- `users.deleteUser(userId)` aufrufen; Refresh-Tokens des Users widerrufen (vorhandenes
  Token/Logout-Mechanismus nutzen); danach Media-Dirs der verwaisten Orgs entfernen.

**`src/auth/auth.controller.ts`** — neuer Endpoint (Cookie-Auth, kein `@Public`):

```ts
@Post('delete-account')
@HttpCode(HttpStatus.NO_CONTENT)
async deleteAccount(@Req() req, @Body() dto: DeleteAccountDto, @Res({ passthrough: true }) res) {
  await this.auth.deleteAccount(req.user.userId, dto.currentPassword);
  clearAuthCookies(res, this.config);
}
```

### 3. Benutzerübersicht + Einzel-Löschung (Super-Admin)

**`src/user/user.service.ts`** — `listAllWithMemberships()`: `db.query.users.findMany`
mit Memberships-Relation inkl. `organisation` (id, name, role); Felder id, email, name,
`emailVerified`, `isSuperAdmin`, `createdAt`.

**`src/user/admin-user.controller.ts`** (neu, `@Controller('admin/users')` + `@UseGuards(SuperAdminGuard)`),
im `UserModule` registrieren:

- `GET /api/admin/users` → `listAllWithMemberships()`.
- `DELETE /api/admin/users/:id` (`@HttpCode(204)`): Lockout-Schutz (letzter Super-Admin),
  dann `users.deleteUser(id)` + Media-Cleanup der verwaisten Orgs.

### 4. Cleanup-Fenster 24h

- **`src/config/env.validation.ts`**: `SIGNUP_UNVERIFIED_TTL_HOURS = 48` → `24`.
- **`src/auth/unverified-signup-cleanup.service.ts`**: `DEFAULT_UNVERIFIED_TTL_HOURS = 48` → `24`.
- Doku: `.env.example`, `ansible/` env-Template, `CLAUDE.md` (Default 48 → 24).

### 5. Bugfix: per „Add Member" eingeladener User kann sich nicht einloggen

**Problem:** `MembershipService.addMember` legt einen neuen Invitee mit
`emailVerified: false` (Schema-Default) an und mailt einen `/set-password`-Link über den
Platform-Mailer. `AuthService.setPassword` (→ `UserService.setPassword`, `user.service.ts:184`)
setzt das Passwort, flippt aber **`emailVerified` nie auf `true`**. Da `login()`
(`auth.service.ts:67-70`) bei `emailVerified=false` mit „Email not verified" blockt, kann
sich der eingeladene User nach dem Passwort-Setzen **nicht einloggen**.

**Fix:** In **`src/user/user.service.ts`** `setPassword` zusätzlich `emailVerified: true`
setzen:

```ts
.set({ passwordHash, emailVerified: true, passwordResetToken: null, passwordResetTokenExpiresAt: null })
```

Der Klick auf den gemailten Set-Password-Link beweist den E-Mail-Besitz → korrekt für den
Invite-Flow; für den Forgot-Password-Flow harmlos (User ist dort ohnehin verifiziert).

> Hinweis: Org-SMTP ist **nicht** beteiligt — Invite/Set-Password/Reset laufen immer über
> den env-getriebenen `PlatformMailerService` (`SMTP_*`). Org-SMTP gilt nur für
> Org-Notifications. Dieser Teil funktioniert bereits korrekt.

---

## Frontend (`apps/frontend`)

### A. Super-Admin Route-Guard (Sicherheit)

Neuer funktionaler Guard `src/app/auth/super-admin.guard.ts` (nutzt
`OrganisationStateService.isSuperAdmin()`), als `canActivate` auf die `/admin/*`-Routes
in `src/app/app.routes.ts`. Aktuell hängt der Schutz nur am 403 des Backends — Rule
verlangt einen Guard für rollenbeschränkte Routen.

### B. Org-Löschung

- **`src/app/admin/organisations/organisation.service.ts`**: `delete(id) => http.delete('/api/organisations/'+id)`.
- **`src/app/admin/organisations/organisations.ts`**: „Delete Org"-Button im Detail-Header
  - Bestätigungs-Modal (Pattern aus `live-stream-delete-modal.ts` / `org-remove-member-modal.ts`;
    Klassen `.modal`, `.btn-danger`). Warntext: löscht alle Screens/Content/Playlists/Schedules
    unwiderruflich. Bei Erfolg Liste neu laden + Auswahl zurücksetzen.

### C. Benutzerübersicht + Einzel-Löschung

- Neuer Ordner `src/app/admin/users/`:
  - `admin-user.service.ts`: `getAll()` → `GET /api/admin/users`; `delete(id)` → `DELETE /api/admin/users/:id`
    (kein `X-Organisation-Id`, wie der Org-Service — super-admin-scoped).
  - `all-users.ts` (Smart-Component): Tabelle email · name · **Status-Badge** (verifiziert /
    ausstehend) · Super-Admin-Badge · Orgs+Rollen · erstellt. Pro Zeile Delete-Button mit
    Bestätigungs-Modal. Design-System-Klassen (`.page`, `.table-container`, `.btn-danger`).
- **`src/app/app.routes.ts`**: Lazy-Route `admin/users`.
- **`src/app/shell/app-sidebar.ts`**: Admin-Nav-Link „Benutzer" → `/admin/users` (nur `isSuperAdmin()`).

### D. Self-Delete (Account)

- **`src/app/auth/auth.service.ts`**: `deleteAccount(currentPassword)` → `POST /api/auth/delete-account`;
  bei Erfolg lokalen Auth-State leeren + zu `/login` navigieren (Hinweis „Account gelöscht").
- **`src/app/settings/user/user-settings.ts`**: „Danger Zone"-Section unten — Button
  „Account löschen" → Modal mit Passwort-Bestätigung (Reactive Form, `required`). Nutzt das
  bestehende Toast-/Error-Pattern der Komponente.

---

## Tests

- **Backend (Jest, Coverage-Gate ~80%)**:
  - `organisation.service` `remove`: cascade löscht Org-Inhalte; verwaister User wird
    gelöscht; Multi-Org-User **bleibt**; Super-Admin bleibt; Media-Dir-Aufruf.
  - `auth.service` `deleteAccount`: falsches Passwort → 401; letzter Super-Admin → 403;
    Happy-Path löscht User + verwaiste Org; Refresh-Token widerrufen.
  - `admin-user.controller`/service: `listAllWithMemberships` Shape inkl. `emailVerified`;
    DELETE letzter Super-Admin → 403.
  - Cron-Default = 24 (Cutoff-Berechnung).
  - `setPassword` setzt `emailVerified=true`; Regressionstest: Invitee → `setPassword` →
    `login` erfolgreich (vorher 403 „Email not verified").
- **Frontend (Vitest)**: Service-Specs für `organisation.service.delete`,
  `admin-user.service.getAll/delete`, `auth.service.deleteAccount` (HttpTestingController,
  korrekte URL/Methode, kein Org-Header bei Admin-Calls).

## Verifikation (E2E manuell)

1. `npm run dev` (backend:3000 · frontend:4200 · Mailpit:8025).
2. Self-Signup mit falscher Mail anlegen → als Super-Admin einloggen.
3. `/admin/users`: neuer User erscheint mit Status „ausstehend".
4. **Variante 1:** User in `/admin/users` direkt löschen → User + verwaiste Org weg
   (DB prüfen, Media-Dir `MEDIA_BASE_PATH/{orgId}` entfernt).
5. **Variante 2:** Org in `/admin/organisations` löschen → Org + verwaister User weg.
6. **Self-Delete:** als normaler User unter Einstellungen Account löschen (Passwort
   bestätigen) → ausgeloggt, Login schlägt mit „nicht gefunden" fehl.
7. Cron-Fenster: `SIGNUP_UNVERIFIED_TTL_HOURS` Default = 24 (env/log prüfen).
8. `npm run lint && npm run typecheck && npm run test` grün.

## Guardrails / Edge Cases

- Verwaiste-User-Cleanup ist **orphan-only** — Multi-Org-User & Super-Admins nie gelöscht.
- Self-Delete & Admin-Delete blocken den **letzten Super-Admin** (kein System-Lockout).
- Media-Löschung ist best-effort außerhalb der DB-Transaktion (DB bleibt konsistent,
  auch wenn `fs.rm` fehlschlägt — nur Log-Warnung).
- Access-Cookie (15m) bleibt bis Ablauf gültig; daher Refresh-Tokens beim Delete widerrufen.
