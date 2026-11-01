# Plan: MFA (TOTP) für die Benutzer-Auth

> Status: **Plan**, noch nichts implementiert (Stand 2026-10-31, Basis `main` @ 0.42.1).
> Entscheidungen vom 2026-10-31 sind eingearbeitet (siehe „Getroffene Entscheidungen").

## Context

Heute ist der Login einstufig: `POST /api/auth/login` prüft E-Mail + Passwort
(`AuthService.login`), das Gate `emailVerified`, und setzt sofort Access-Cookie (JWT)
und Refresh-Cookie (Redis, Rotation mit Family-Reuse-Erkennung, `TokenService`).
Ein geleaktes Passwort reicht also für den vollen Zugriff, auch auf Super-Admin-Konten,
die alle Orgs sehen.

Ziel:

- **TOTP** (RFC 6238, Authenticator-Apps) pro User mit **Recovery-Codes** und
  zweistufigem Login.
- **MFA-Pflicht pro Organisation**, vom Org-Admin einschaltbar.
- **Super-Admins müssen immer MFA nutzen**, auch auf bestehenden Installationen.
  Dafür gibt es einen Upgrade-Pfad, bei dem sich niemand aussperrt.
- **Reset** durch Super-Admin (alle User) und durch Org-Admin (User seiner Org).
- **Notfall-Reset per SQL-Snippet** für den Fall, dass sich ein Super-Admin aussperrt.

Was schon da ist und wiederverwendet wird:

| Baustein                                        | Nutzung für MFA                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `common/secret-cipher.service.ts` (AES-256-GCM) | TOTP-Secret verschlüsselt speichern (muss rückholbar sein)              |
| `auth/token-hash.util.ts`                       | Recovery-Codes nur gehasht speichern                                    |
| `qrcode` (bereits Dependency)                   | QR-Code serverseitig als Data-URL rendern, kein Drittdienst             |
| Redis (Refresh-Tokens, Throttler)               | Pending-Enrolment, Login-Challenge, Fehlversuchszähler                  |
| `PlatformMailerService` + Auth-Events           | Sicherheitsmails (MFA aktiviert/deaktiviert/zurückgesetzt)              |
| `audit-log/audit.events.ts` (`AUDIT_AUTH_*`)    | neue Audit-Events                                                       |
| `@Throttle` + `ProxyAwareThrottlerGuard`        | Rate-Limit auf den Code-Endpoint                                        |
| `JwtAuthGuard` + `MfaService.requiredBy`        | benutzerweite Durchsetzung (Super-Admin oder eine Org mit `requireMfa`) |

## Getroffene Entscheidungen

1. **MFA-Pflicht pro Org gehört direkt zum Umfang** und kommt nicht erst in einer
   späteren Phase.
2. **Org-Admins dürfen die MFA von Usern ihrer Org zurücksetzen.** Die Regeln dafür
   stehen unten im Abschnitt „Reset".
3. **Notfall per SQL-Snippet**, ohne CLI-Kommando.
4. **Super-Admins müssen immer MFA nutzen.** Bestehende Super-Admins werden beim
   nächsten Request in die Einrichtung gezwungen. Mehr dazu im Abschnitt „Upgrade-Pfad".

## Technische Festlegungen

1. **Bibliothek: `otpauth`** (hectorm/otpauth): ohne Abhängigkeiten, ESM-fähig (passt zu
   NestJS 12 / ESM-only), aktiv gepflegt. `TOTP.validate({ token, window })` liefert das
   Delta und ermöglicht damit den Replay-Schutz. Parameter: SHA-1, 6 Stellen, 30 s.
   Das ist der Standard, den alle Apps unterstützen. Toleranz `window: 1` (±30 s).
2. **`SECRETS_ENCRYPTION_KEY` wird ab diesem Release überall Pflicht** (Prod und Dev).
   Ohne Key startet das Backend nicht. Einzelheiten stehen im Abschnitt
   „Grundsatz: keine Secrets im Klartext".
3. **Login-Challenge als kurzlebiges httpOnly-Cookie** (`mfa_challenge`, Pfad
   `/api/auth`, 5 min), nicht als Token im Response-Body.
4. **Eigene Tabelle `user_mfa` (1:1 zu `users`)**, damit später Passkeys/WebAuthn
   daneben passen.
5. **Recovery-Codes: 10 Stück**, je 10 Zeichen Base32 (≈50 Bit) im Format `xxxxx-xxxxx`,
   gespeichert als SHA-256. Einmal verwendbar und nur einmal im Klartext angezeigt.
6. **Ein Claim `mfa: boolean` im Access-Token ist die einzige Wahrheitsquelle** für
   „diese Session ist per MFA bestätigt". Fehlt er (alte Tokens), gilt `false`.
7. **Kein „Gerät merken" in v1.**

## Grundsatz: keine Secrets im Klartext (DB, Redis, Logs, Responses, Platte)

Vorgabe: **Kein Secret liegt irgendwo unverschlüsselt.** Was nur verglichen werden muss,
wird gehasht. Was rückholbar sein muss, wird mit AES-256-GCM (`SecretCipher`)
verschlüsselt. Das gilt nicht nur für MFA. Der MFA-Release zieht diese Regel für das
ganze Backend durch.

### Bestandsaufnahme (Stand `main` @ 0.42.1)

| Ort                                                                            | Wert                                                 | Heute                                                 | Ziel                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `users.passwordHash`                                                           | Passwort                                             | bcrypt ✅                                             | bleibt                                             |
| `users.*Token` (Reset/Verify/E-Mail)                                           | Einmal-Tokens                                        | SHA-256 ✅                                            | bleibt                                             |
| Redis `auth:refresh:<hash>`                                                    | Refresh-Token                                        | SHA-256 als Key ✅                                    | bleibt                                             |
| `screens.apiKeyHash`                                                           | Screen-API-Key                                       | Hash ✅                                               | bleibt                                             |
| `screen_pairings.pairingSecretHash`                                            | Poll-Token                                           | SHA-256 ✅                                            | bleibt                                             |
| `site_agent_enrolments.tokenHash`                                              | Setup-/Session-Token                                 | Hash ✅                                               | bleibt                                             |
| `org_notification_config.smtpPassword`                                         | SMTP-Passwort                                        | ⚠️ verschlüsselt **nur mit Key**, Altbestand Klartext | immer `enc:v1:`, Altbestand migriert               |
| `org_notification_config.ntfyToken`                                            | ntfy-Token                                           | ⚠️ wie oben                                           | wie oben                                           |
| `screen_remote_controls.devmodePassphrase`                                     | Devmode-Passphrase                                   | ⚠️ wie oben                                           | wie oben                                           |
| `screen_pairings.apiKey`                                                       | Screen-API-Key bis zur Abholung                      | ❌ Klartext (transient, danach `NULL`)                | `enc:v1:` verschlüsselt                            |
| **neu** `user_mfa.totpSecretEnc`                                               | TOTP-Secret                                          | –                                                     | `enc:v1:`                                          |
| **neu** Redis `mfa:enrol:*`                                                    | Pending-TOTP-Secret                                  | –                                                     | `enc:v1:`                                          |
| **neu** `user_mfa_recovery_codes`                                              | Recovery-Codes                                       | –                                                     | SHA-256                                            |
| **neu** Redis `mfa:challenge:*`                                                | Challenge-ID                                         | –                                                     | SHA-256 als Key                                    |
| Site-Agent-Platte (`connection.store`, `agent-config.store`, `ssap-key.store`) | Refresh-Token, Devmode-Passphrasen, SSAP-Client-Keys | ❌ Klartext-Dateien, nur Modus `0600`                 | eigener Folge-PR, siehe unten                      |
| Player `localStorage`                                                          | Screen-API-Key                                       | ❌ Klartext (bekannter Backlog-Punkt H-3)             | außerhalb dieses Plans, bleibt im Security-Backlog |

### Maßnahmen im Backend (Teil dieses Releases)

1. **Key-Pflicht überall.** Ohne gültigen `SECRETS_ENCRYPTION_KEY` (32 Byte, Base64)
   startet das Backend nicht. Das gilt unabhängig von `NODE_ENV`, mit einer klaren
   Fehlermeldung inkl. `openssl rand -base64 32`.
   - `SecretCipher` verliert den Pfad „ohne Key Klartext speichern". `encrypt()`
     verschlüsselt immer.
   - `decrypt()` **lehnt Werte ohne `enc:v1:`-Präfix ab** (Fehler + Log ohne den Wert),
     sobald die Altbestands-Migration (Punkt 2) gelaufen ist.
   - Dev: `docker-compose.yml` und `.env.example` bekommen einen festen Dev-Key, analog
     zu `JWT_ACCESS_SECRET`. Er ist als unsicher markiert.
   - Ansible: `assert` auf `secrets_encryption_key` in `deploy.yml`, bevor irgendetwas
     deployt wird. In `env.mynextscreen.j2` fällt der `default('')` weg.
2. **Altbestand einmalig verschlüsseln.** Eine Drizzle-SQL-Migration kommt nicht an den
   Key. Deshalb übernimmt das ein `SecretAtRestMigrationService`
   (`OnApplicationBootstrap`, **bevor** der HTTP-Server Requests annimmt):
   - Er verschlüsselt alle Zeilen von `smtpPassword`, `ntfyToken`, `devmodePassphrase`
     und `screen_pairings.apiKey`, deren Wert nicht mit `enc:v1:` beginnt, in einer
     Transaktion. Der Lauf ist idempotent und gefahrlos wiederholbar.
   - Er loggt nur die Anzahl je Spalte und keine Werte.
   - Danach validiert er die DB-Constraints (Punkt 3).
3. **Absicherung auf DB-Ebene.** Die Drizzle-Migration legt pro Secret-Spalte einen
   Check-Constraint an:
   `CHECK (col IS NULL OR col LIKE 'enc:v1:%')`. Für die Bestandsspalten ist er
   `NOT VALID`, damit die Migration auf Altbestand nicht scheitert. Er greift trotzdem
   sofort für jedes neue INSERT/UPDATE. Der Boot-Service führt nach dem Verschlüsseln
   `ALTER TABLE … VALIDATE CONSTRAINT …` aus. Für `user_mfa.totp_secret_enc` ist der
   Constraint von Anfang an gültig. **Ab dann lehnt Postgres selbst jeden Klartext ab**,
   auch wenn ein künftiger Code-Pfad den Cipher vergisst.
4. **`screen_pairings.apiKey` verschlüsselt** speichern und beim Ausliefern
   entschlüsseln. Das bestehende Nullen nach der Abholung bleibt.
5. **Responses mit Secrets** (`/auth/mfa/totp/setup` mit Secret + QR,
   `/totp/confirm` und `/recovery-codes/regenerate` mit Recovery-Codes, die bestehenden
   Screen-Key-Antworten) bekommen `Cache-Control: no-store` und `Pragma: no-cache`.
   Das Frontend hält die Werte nur im Component-Signal und **nie** in
   `localStorage`/`sessionStorage`. Beim Schließen des Dialogs werden sie verworfen.
6. **Logs und Audit:** Werte kommen nie in Logs, Audit-`details`, Exceptions oder
   Event-Payloads. Ein Spec prüft für `MfaService` per Logger-Spy, dass Secret und Codes
   in keinem Log-Aufruf vorkommen. Der veraltete `// TODO: … column-level encryption`
   in `schema.ts` wird entfernt.
7. **Backups:** `ansible/download_db.yml` enthält danach nur noch Chiffrat. Die Doku
   verlangt, den Key **getrennt** von den Dumps zu sichern.

### Site-Agent-Platte (eigener Folge-PR)

Der Agent muss seine Secrets unbeaufsichtigt nutzen: Refresh-Token, Devmode-Passphrasen
und SSAP-Client-Keys. Verschlüsselung hilft dort nur, wenn der Key **nicht** neben den
Dateien liegt. Vorschlag: ein Agent-Key als Podman-Secret bzw.
`systemd-creds`-Credential (vom Ansible-Playbook `site-agent.yml` erzeugt), damit
AES-256-GCM für `connection.json`, `agent-config.json` und die SSAP-Key-Dateien. Die
bestehende `backup/backup-crypto.ts` liefert das Muster. Die Migration läuft beim
Agent-Start: Klartext-Datei lesen, verschlüsselt neu schreiben, alte Datei entfernen.
Das betrifft eine andere App mit eigenem Deployment und kommt deshalb **nicht** in die
MFA-PRs. Es wird aber als PR 5 eingeplant.

## Datenmodell (Drizzle, `src/db/schema.ts` + Migration)

```ts
export const userMfa = pgTable('user_mfa', {
  userId: uuid().primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  totpSecretEnc: text().notNull(),               // SecretCipher-Envelope `enc:v1:…`
  totpEnabledAt: timestamp({ withTimezone: true }).notNull(),
  totpLastUsedStep: bigint({ mode: 'number' }),  // Replay-Schutz
  ...timestamps,
});

export const userMfaRecoveryCodes = pgTable('user_mfa_recovery_codes', {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text().notNull(),
  usedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index().on(t.userId)]);

// organisations
requireMfa: boolean().notNull().default(false),
requireMfaSince: timestamp({ withTimezone: true }),   // für Anzeige/Audit
```

Die Migration wird mit `nx run backend:db-generate` erzeugt. Sie ist **additiv**: zwei
neue Tabellen, eine Spalte mit Default `false`, kein Backfill. Dazu kommen die
`enc:v1:`-Check-Constraints (Bestandsspalten `NOT VALID`, siehe „Grundsatz"). Für bestehende
Super-Admins braucht es **keine Datenmigration**. Ihr Zustand „Super-Admin ohne
`user_mfa`-Zeile" ist genau der Auslöser für die erzwungene Einrichtung (siehe
„Upgrade-Pfad").

Redis (kein DB-State):

| Key                          | Inhalt                         | TTL    |
| ---------------------------- | ------------------------------ | ------ |
| `mfa:enrol:{userId}`         | Pending-Secret (verschlüsselt) | 10 min |
| `mfa:challenge:{sha256(id)}` | `{ userId, attempts }`         | 5 min  |
| `mfa:fail:{userId}`          | Fehlversuchszähler (Lockout)   | 15 min |

Die bestehenden Refresh-Records (`auth:refresh:<hash>`) bekommen das Feld `mfa`.
Alte Records haben es nicht und gelten als `false`.

## Backend

### Neue Bausteine in `auth/mfa/` (Teil der Auth-Domain, kein eigenes Modul)

- `totp.service.ts`: Secret erzeugen, `otpauth://`-URI bauen (Issuer `myNextScreen`,
  Label = E-Mail), Code validieren und Zeitschritt zurückgeben, QR als Data-URL.
  Die Uhr ist für Tests injizierbar.
- `recovery-code.service.ts`: Codes erzeugen und hashen. Die Einlösung ist atomar:
  `UPDATE … SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id`.
- `mfa.service.ts`: Einrichtung, Bestätigung, Deaktivierung, Status, Reset,
  Challenge-Erzeugung und -Prüfung, Policy-Abfrage `isMfaRequired(user, orgId?)`.
  Der Replay-Schutz ist ein atomares
  `UPDATE user_mfa SET totp_last_used_step = $step WHERE user_id = $1 AND (totp_last_used_step IS NULL OR totp_last_used_step < $step)`.
  Betrifft das 0 Zeilen, wird der Code abgelehnt.
- `mfa.controller.ts` + `dto/` (class-validator: `@Matches(/^\d{6}$/)` bzw.
  Recovery-Format).
- `allow-without-mfa.decorator.ts`: Markiert die Routen, die eine Session ohne MFA
  auch dann erreichen darf, wenn MFA für sie Pflicht ist: `GET /auth/me`,
  `/auth/mfa/*`, `logout`, `GET /api/me/profile` (für die Shell).

### Login-Flow (zweistufig)

```
POST /api/auth/login {email, password}
  ├─ Passwort falsch / nicht verifiziert ─► wie heute (401 / 403)
  ├─ kein TOTP eingerichtet ─► Session mit mfa:false + { user, mfaEnrolmentRequired? }
  │     (Super-Admin → mfaEnrolmentRequired: true → Frontend öffnet Pflicht-Wizard)
  └─ TOTP eingerichtet ─► KEINE Session-Cookies
                          Set-Cookie mfa_challenge=<random> (httpOnly, /api/auth, 5 min)
                          200 { mfaRequired: true, methods: ['totp','recovery'] }

POST /api/auth/login/mfa {code} | {recoveryCode}      @Public, @Throttle 5/min
  ├─ Challenge fehlt/abgelaufen ─► 401 (Frontend → zurück zum Passwort-Schritt)
  ├─ falsch ─► attempts++ ; ab 5 → Challenge löschen ; mfa:fail:{userId}++ ; 401
  └─ ok ─► Challenge löschen, Session mit mfa:true, Challenge-Cookie leeren
           Recovery-Code benutzt → Audit + Mail „Recovery-Code verwendet, noch N übrig"
```

- Die Session-Ausstellung wird aus `login()` in `issueSession(user, { mfa })` gezogen.
  `login`, `loginMfa`, `verifyEmail`, `setup`, `changePassword` und `confirmTotp` nutzen
  ihn alle. Hat der User TOTP eingerichtet, stellt **kein** Pfad außer `loginMfa` eine
  Session aus. Das gilt auch für den Auto-Login von `verify-email`.
- `changePassword` übernimmt das `mfa` der laufenden Session in die neue Session.
- **Ein Passwort-Reset deaktiviert MFA nicht.**
- User-Lockout: Bei `mfa:fail` ≥ 10 in 15 min antworten neue Challenges für den User
  mit `429`.
- Die Antwort ist eine Union `AuthSuccessResponse | MfaRequiredResponse`. Der Typ liegt
  in `libs/shared-types`.

### JWT / Refresh

- Neuer Claim `mfa: boolean` in `AccessClaims`. `JwtAuthGuard` legt ihn auf `req.user`.
- Der Refresh-Record trägt `mfa`. `rotateRefreshToken` reicht ihn an die Folge-Tokens
  und `AuthService.refresh` an den neuen Access-Token weiter.

### Durchsetzung (benutzergebunden, eine Stelle, ein Fehlerformat)

MFA hängt am **User**, nicht an der Org. Pflicht ist sie, sobald **eine** dieser
Bedingungen gilt, und dann für **alle** Orgs des Users:

| Super-Admin | Org 1 `requireMfa` | Org 2 `requireMfa` | Ergebnis                   |
| ----------- | ------------------ | ------------------ | -------------------------- |
| ja          | egal               | egal               | Pflicht                    |
| nein        | ja                 | nein               | Pflicht (auch in Org 2)    |
| nein        | ja                 | ja                 | Pflicht                    |
| nein        | nein               | nein               | optional, aber einrichtbar |

- Durchgesetzt wird in `JwtAuthGuard` nach der Token-Prüfung, für **alle** Routen außer
  `@AllowWithoutMfa`: Session ohne `mfa` + `MfaService.requiredBy(user)` ergibt Pflicht →
  `403 { code: 'MFA_ENROLMENT_REQUIRED', requiredBy: { superAdmin, organisationIds } }`.
  Sessions mit `mfa: true` kosten keine DB-Abfrage.
- Die Regel wird live aus der DB ausgewertet und nicht im Token gecacht. Schaltet ein
  Org-Admin die Pflicht ein, greift sie beim nächsten Request für alle Mitglieder.
- Es gibt **keinen** org-gescopten Code `MFA_REQUIRED` mehr und keine Ausnahme „andere
  Org ohne Pflicht weiter nutzen“ (Entscheidung 2026-11-01). `RolesGuard` braucht dafür
  nichts.
- `login`, `login/mfa`, `verify-email`, `setup` und `GET /api/auth/me` liefern
  `mfaEnrolmentRequired = !mfa && Pflicht`; `/auth/me` zusätzlich `mfa`.
- `POST /auth/mfa/totp/confirm` ohne Pending-Setup: `400 MFA_SETUP_EXPIRED` (PR 3).
- Weitere Fehlercodes: `401 MFA_CHALLENGE_EXPIRED` (Challenge fehlt/abgelaufen),
  `401 MFA_INVALID_CODE` (falscher Code), `401 MFA_INVALID_PASSWORD` (falsches Passwort
  bei `/api/auth/mfa/*`).
- `mfa` bedeutet: Die Session wurde per TOTP bestätigt. Ein User, der TOTP eingerichtet
  hat, bekommt ohnehin nur noch solche Sessions. Die Durchsetzung trifft also nur User
  ohne Einrichtung, und die landen im Wizard.

### Management-Endpoints (`@UserScoped`, `@AllowWithoutMfa`, unter `/api/auth/mfa`)

| Methode + Pfad                    | Body                        | Wirkung                                                                                                                                             |
| --------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET  /status`                    | –                           | `{ totpEnabled, enabledAt, recoveryCodesRemaining, requiredBy: { superAdmin, organisationIds[] } }`                                                 |
| `POST /totp/setup`                | `{ currentPassword }`       | Pending-Secret in Redis → `{ otpauthUri, qrDataUrl, secret }`                                                                                       |
| `POST /totp/confirm`              | `{ code }`                  | persistiert, erzeugt 10 Recovery-Codes (einmalige Antwort), revoked alle Sessions und stellt eine neue mit `mfa: true` aus                          |
| `POST /totp/disable`              | `{ currentPassword, code }` | **abgelehnt (409), wenn MFA für den User Pflicht ist** (Super-Admin oder eine Org mit `requireMfa`); sonst `user_mfa` + Codes löschen, Sessions neu |
| `POST /recovery-codes/regenerate` | `{ currentPassword, code }` | alte Codes löschen, 10 neue zurückgeben                                                                                                             |

Will ein Pflicht-User sein Gerät wechseln, richtet er TOTP neu ein: `setup` + `confirm`
bei bereits aktivem TOTP. Dafür verlangt `setup` zusätzlich zum Passwort einen gültigen
Code des alten Geräts.

**Nachtrag (Fix in PR 3):** Das `code`-Feld von `totp/setup` (Gerätewechsel), `totp/disable`
und `recovery-codes/regenerate` akzeptiert auch einen **Recovery-Code** (Format entscheidet:
6 Ziffern = TOTP, sonst Recovery-Code). Der Code wird verbraucht, Mail + Audit
`mfa_recovery_code_used` wie beim Login; ein falscher Code zählt gegen den Lockout. Sonst
könnte ein User mit verlorenem Handy zwar per Recovery-Code einloggen, den Faktor aber nicht
selbst umziehen — ein alleiniger Super-Admin bräuchte dann das Notfall-SQL.

### Org-Einstellung `requireMfa`

- **Umgesetzt (PR 3) als eigener Endpoint** `GET|PATCH /api/organisations/:orgId/mfa-requirement`
  (`@Roles(OrgAdmin)`, Super-Admin wie üblich) mit `{ requireMfa }` → `{ requireMfa, requireMfaSince }`.
  Abweichung vom Plan: `PATCH /api/organisations/:id` ist als ganzer Controller
  `SuperAdminGuard`-geschützt (Name, Storage-Limits); ein Org-Admin-Feld dort hätte den Guard
  aufgeweicht. Der Controller liegt in `auth/mfa/mfa-admin.controller.ts`.
- Das Einschalten verlangt, dass der Org-Admin **selbst eine `mfa`-Session hat**. Sonst
  `403 { code: 'MFA_SELF_REQUIRED' }`, damit er sich nicht selbst aussperrt. Ausschalten geht
  immer. Ein Wechsel setzt bzw. leert `requireMfaSince`; ein unveränderter Wert ist ein No-op
  (kein Audit, keine Mail).
- Beim Einschalten geht eine Platform-Mail an alle Mitglieder ohne TOTP: „Deine
  Organisation X verlangt ab sofort MFA. Beim nächsten Öffnen wirst du durch die
  Einrichtung geführt." Dazu kommt ein Audit-Event `org.mfa_requirement_changed`
  (`{ name, requireMfa }`, an und aus). Die Mail geht nur an Mitglieder mit Passwort;
  offene Einladungen treffen die Pflicht bei der ersten Anmeldung.

### Reset

**Super-Admin:** `DELETE /api/admin/users/:id/mfa` (`SuperAdminGuard`)

- Ist für jeden User erlaubt, auch für andere Super-Admins, aber nicht für sich selbst.
- Löscht `user_mfa` + Codes und revoked alle Sessions des Users. Dazu kommen ein
  Audit-Event und eine Mail an den User.

**Org-Admin:** `DELETE /api/organisations/:orgId/members/:userId/mfa` (`RolesGuard`, OrgAdmin)

Der Reset wirkt global, weil MFA am User hängt und nicht an der Org. Deshalb gelten
diese Regeln, damit ein Org-Admin keine fremden Tenants schwächt:

1. Der Aufrufer hat selbst eine `mfa`-Session.
2. Das Ziel ist Mitglied von `:orgId` und ist nicht der Aufrufer selbst.
3. Das Ziel ist **kein Super-Admin**.
4. Das Ziel hat **keine Membership in einer Org, in der der Aufrufer nicht OrgAdmin
   ist**. Sonst `403 { code: 'MFA_RESET_NEEDS_SUPER_ADMIN' }`, und die UI zeigt:
   „Dieser User gehört weiteren Organisationen an, bitte den Plattform-Admin
   kontaktieren."

Die Wirkung ist dieselbe wie beim Super-Admin-Reset. Das Audit-Event landet in **jeder**
Org des Ziels, damit die übrigen Org-Admins es auch sehen.

**Umsetzung (PR 3), Fehlercodes je Ablehnungsgrund:** `403 MFA_SELF_REQUIRED` (Regel 1),
`403 MFA_RESET_SELF` (Regel 2, auch beim Super-Admin-Reset), `404 MFA_RESET_NOT_MEMBER`
(Regel 2), `403 MFA_RESET_TARGET_SUPER_ADMIN` (Regel 3), `403 MFA_RESET_NEEDS_SUPER_ADMIN`
(Regel 4), `409 MFA_NOT_ENABLED` (Ziel hat kein TOTP). Ein Super-Admin auf der Org-Route
bekommt die Super-Admin-Regeln (`by: 'super_admin'`). Der Reset löscht `user_mfa` + Codes in
einer Transaktion, dazu `mfa:enrol` und `mfa:fail`, und revoked alle Refresh-Familien. Auch der
Super-Admin-Reset wird in jeder Org des Ziels auditiert (`auth.mfa_reset`, Resource `user`,
Actor = Admin, `{ by, actorId, email }`); ohne Org einmal instanzweit. Schon ausgestellte
Access-Tokens werden sofort ungültig: `revokeAllForUser` setzt den Marker
`auth:revoked-before:{userId}` (TTL = `JWT_ACCESS_TTL`), den `JwtAuthGuard` gegen `iat` prüft
(gilt ebenso für Passwort-Reset/-Änderung, MFA-Einrichtung und Account-Löschung).
Mitgliederliste und Instance-Admin-Userliste liefern `mfaEnabled` für das Badge.

Nach einem Reset muss ein Pflicht-User beim nächsten Login TOTP neu einrichten. Der
Wizard wird erzwungen, ein Aussperren ist nicht möglich.

### Audit, Mails, Logging

- Audit-Events: `audit.auth.mfa_enabled`, `mfa_disabled`, `mfa_reset` (mit
  `{ by: 'super_admin' | 'org_admin', actorId }`), `mfa_recovery_code_used`,
  `mfa_recovery_codes_regenerated`, `mfa_lockout`, `org.mfa_requirement_changed`.
- Platform-Mails (event-getrieben, best-effort wie `AUTH_PASSWORD_CHANGED`): MFA
  aktiviert, deaktiviert, zurückgesetzt (mit Angabe durch wen), Recovery-Code
  verwendet, Org verlangt jetzt MFA.
- Codes, Secrets, Recovery-Codes und Challenge-IDs werden **nie** geloggt. Geloggt wird
  nur `userId` und das Ergebnis.

## Upgrade-Pfad für bestehende Installationen

Ziel: Super-Admins sind nach dem Update sofort zur MFA gezwungen, und **niemand wird
ausgesperrt**. Das funktioniert, weil eine Session ohne `mfa` gültig bleibt, aber nur
noch die Einrichtung erreicht.

1. **Vor dem Deploy:** `SECRETS_ENCRYPTION_KEY` setzen (Ansible-Vault-Variable
   `secrets_encryption_key`). Der Playbook-`assert` und der Boot-Check im Backend
   verhindern, dass das vergessen wird.
2. **Deploy:** Die Migration läuft beim Start. Danach verschlüsselt der
   `SecretAtRestMigrationService` alle Klartext-Altwerte und validiert die
   Check-Constraints, bevor das Backend Requests annimmt. Ab hier liegt kein Secret
   mehr im Klartext in der DB. Wird der Deploy mittendrin abgebrochen, ist das
   unkritisch: Der Lauf wiederholt sich beim nächsten Start.
3. **Super-Admin mit laufender Session:** Sein alter Access-Token hat keinen
   `mfa`-Claim und gilt damit als `false`. Auch die Refresh-Records ohne Feld liefern
   `false`. Der nächste API-Call bekommt `403 MFA_ENROLMENT_REQUIRED`, und das Frontend
   öffnet den **Pflicht-Wizard** (Vollbild, ohne Shell, nicht überspringbar, nur
   „Abmelden" möglich). Er bestätigt sein Passwort, scannt den QR-Code, gibt einen Code
   ein und sichert die Recovery-Codes. Danach hat er eine neue Session mit `mfa: true`.
4. **Super-Admin loggt sich neu ein:** Das Passwort genügt für eine Session mit
   `mfa: false`. `mfaEnrolmentRequired: true` öffnet direkt denselben Wizard.
5. **Neue Installation (First-Run-Setup):** `POST /auth/setup` legt den Super-Admin an.
   Das Frontend leitet danach sofort in den Wizard weiter. Damit gehört die MFA zum
   Setup.
6. **Normale User und Org-Admins** merken nichts, bis ihre Org `requireMfa` einschaltet.
   Dann gilt derselbe Mechanismus über `403 MFA_ENROLMENT_REQUIRED`, und zwar für alle
   ihre Orgs.
7. **Release-Notes / CHANGELOG** (Breaking für Betreiber): Der Key ist Pflicht, und
   Super-Admins richten beim ersten Öffnen nach dem Update MFA ein.

## Notfall: Super-Admin hat sich ausgesperrt (SQL-Snippet)

Das Snippet kommt in `docs/configuration.md` (Abschnitt „MFA-Notfall") und in
`SECURITY.md`. Es gilt für den Fall, dass Gerät und Recovery-Codes weg sind und es
keinen zweiten Super-Admin gibt.

```bash
# Prod (rootless Podman, Postgres-Container) — E-Mail anpassen
podman exec -i signage-postgres psql -U signage -d signage <<'SQL'
BEGIN;
DELETE FROM user_mfa_recovery_codes
  WHERE user_id = (SELECT id FROM users WHERE email = lower('admin@example.org'));
DELETE FROM user_mfa
  WHERE user_id = (SELECT id FROM users WHERE email = lower('admin@example.org'));
COMMIT;
SQL
```

Danach meldet sich der Super-Admin mit seinem Passwort an und landet automatisch im
Pflicht-Wizard. Die Pflicht entfällt dadurch nicht. Ein Audit-Eintrag entsteht bei
diesem Weg nicht, das wird in der Doku erwähnt. Die Container- und DB-Namen werden bei
der Umsetzung gegen die Quadlets in `ansible/` geprüft.

## Frontend (Angular, Signals, Standalone, Transloco)

1. **Login (`login/`)**: zweiter Schritt im selben View (Signal `step: 'password' | 'mfa'`).
   - Code-Feld: `autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength=6`,
     Auto-Submit bei 6 Ziffern. Link „Recovery-Code verwenden".
   - 401 bei abgelaufener Challenge → zurück zu Schritt 1 mit Toast.
   - Logik in `auth/auth.service.ts` (`login()` → `'ok' | 'mfa-required' | 'enrolment-required'`,
     neu `verifyMfa()`).
2. **Pflicht-Wizard (`auth/mfa-enrolment/`)**, neue Route ohne Shell, aufgerufen bei
   `MFA_ENROLMENT_REQUIRED` (Super-Admin oder Org-Pflicht) und nach dem First-Run-Setup.
   - Schritte: Passwort → QR + manuelles Secret → Code → Recovery-Codes
     (Kopieren / `.txt` herunterladen) mit Pflicht-Checkbox „gesichert".
   - Erklärt, _warum_ MFA verlangt wird (Super-Admin bzw. Namen der Orgs mit Pflicht).
     Kein Org-Switcher: die Pflicht gilt benutzerweit.
   - Der `auth.interceptor` mappt `403 MFA_ENROLMENT_REQUIRED` auf diese Route. Der `auth.guard`
     lässt nur diese Route zu, solange `mfaEnrolmentRequired` gilt.
3. **User-Settings → Abschnitt „Sicherheit"** (`settings/user/`, neuer `mfa.service.ts`):
   Status, derselbe Wizard als Dialog (freiwillig), Gerät wechseln, Recovery-Codes neu
   erzeugen, Deaktivieren. Die Deaktivierung ist ausgeblendet und mit Erklärung
   versehen, wenn MFA Pflicht ist. Warnung bei ≤ 3 verbleibenden Recovery-Codes.
4. **Org-Settings**: Schalter „MFA für alle Mitglieder verlangen". Er ist deaktiviert
   mit Hinweis, solange der Admin selbst kein MFA hat, und hat einen Bestätigungsdialog.
   Umgesetzt als neuer Tab „Sicherheit" (`settings/org/security`), da es keine allgemeine
   Org-Settings-Seite für Org-Admins gibt.
5. **Mitgliederliste (`settings/users/`)**: MFA-Badge je Mitglied und die Aktion
   „MFA zurücksetzen". Bei `MFA_RESET_NEEDS_SUPER_ADMIN` gibt es einen erklärenden Toast.
6. **Instance-Admin → Users**: MFA-Badge + „MFA zurücksetzen".
7. i18n-Keys (de/en), Feedback über den globalen `ToastService`, OnPush + Signals.

## Tests (Jest-Gate 92/83/84/92 halten)

- `totp.service.spec`: RFC-6238-Vektoren mit fixer Uhr, ±1 Fenster, außerhalb des
  Fensters, Format, URI.
- `mfa.service.spec`: Enrolment-TTL, Confirm ohne Pending, **Replay desselben
  Zeitschritts abgelehnt**, Recovery-Code einmalig, `disable` bei Pflicht abgelehnt,
  Gerätewechsel braucht den alten Code, Reset-Regeln 1–4 für Org-Admins (je ein Test
  pro Ablehnungsgrund), Super-Admin-Reset revoked Sessions.
- `auth.service.spec` / `auth.controller.spec`: Login ohne TOTP unverändert, mit TOTP
  keine Cookies, Challenge-Ablauf, 5 Fehlversuche, Lockout, Refresh behält `mfa`,
  `verifyEmail`/`setup` stellen bei aktivem TOTP keine Session aus, Super-Admin ohne
  TOTP erhält `mfaEnrolmentRequired`.
- `jwt-auth.guard.spec`: Super-Admin ohne `mfa` → 403 außer `@AllowWithoutMfa`.
  **Alter Token ohne Claim → wie `false`** (Upgrade-Fall). User mit einer Org mit
  `requireMfa` → 403 `MFA_ENROLMENT_REQUIRED` auf jeder Route (auch Routen anderer Orgs),
  keine Org mit Pflicht → erlaubt, `mfa: true` → keine DB-Abfrage.
- `token.service.spec`: Refresh-Record ohne `mfa`-Feld → `false`.
- Config-Test: Boot ohne bzw. mit falsch langem `SECRETS_ENCRYPTION_KEY` schlägt fehl.
- `secret-cipher.spec`: kein Klartext-Pfad mehr, `decrypt` lehnt Werte ohne Präfix ab.
- `secret-at-rest-migration.spec`: verschlüsselt nur Klartext-Zeilen, lässt `enc:v1:`
  unverändert, ist idempotent und loggt keine Werte. Integration gegen Postgres:
  Constraint validiert, ein Klartext-INSERT danach scheitert.
- `screen-pairing.service.spec`: `apiKey` wird verschlüsselt gespeichert und im
  Klartext ausgeliefert.
- Logger-Spy-Tests: TOTP-Secret, Codes und Recovery-Codes kommen in keinem Log vor.
- Frontend (Vitest): Login-Step-Wechsel, Interceptor-Mapping der 403-Codes, Wizard
  inkl. Pflicht-Checkbox, Org-Schalter deaktiviert ohne eigenes MFA.

## Umsetzung in PRs (PR 0 → `main`, weil `develop` gerade den PTZ/NDI-Stand trägt; Rest nach Absprache)

| PR  | Inhalt                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Secrets at rest:** Key-Pflicht überall (Boot-Check, compose/.env.example, Ansible-`assert`), `SecretCipher` ohne Klartext-Pfad, `SecretAtRestMigrationService`, Check-Constraints, `screen_pairings.apiKey` verschlüsselt, `no-store`-Header. Unabhängig von MFA, kann zuerst gemergt werden |
| 1   | **Backend-Kern:** Schema + Migration, `TotpService`, `RecoveryCodeService`, `MfaService`, Management-Endpoints, zweistufiger Login, `mfa`-Claim + Refresh-Weitergabe, `@AllowWithoutMfa` + Super-Admin-Durchsetzung, Audit + Mails, Tests                                                      |
| 2   | **Frontend-Kern:** Login-Schritt 2, Pflicht-Wizard + Interceptor/Guard, Sicherheits-Abschnitt, Setup → Wizard, i18n, Tests                                                                                                                                                                     |
| 3   | **Org-Pflicht + Resets:** `requireMfa` (Backend + Org-Settings-UI + Mitglieder-Mail), Durchsetzung ist schon in PR 2 (benutzerweit im `JwtAuthGuard`), Org-Admin- und Super-Admin-Reset inkl. UI                                                                                               |
| 4   | **Betrieb + Doku:** `docs/configuration.md` (Key-Pflicht, Key-Backup getrennt von Dumps, Notfall-SQL), `SECURITY.md`, CHANGELOG/Release-Notes                                                                                                                                                  |
| 5   | **Site-Agent-Secrets verschlüsseln** (Podman-Secret/`systemd-creds`-Key, Migration der Klartext-Dateien beim Start), eigener Release des Agents                                                                                                                                                |

PR 1 und PR 2 werden **gemeinsam** von `develop` nach `main` gebracht. PR 1 allein würde
Super-Admins ohne Wizard-UI mit 403 blockieren. Ein Release nach `main` passiert erst,
wenn alle vier PRs auf `develop` sind. Jeder PR geht durch `typescript-reviewer` und
`security-reviewer`.

## Risiken

- **Super-Admin ohne zweiten Admin verliert Gerät + Codes:** Dann hilft das SQL-Snippet.
  Empfehlung in der Doku: einen zweiten Super-Admin anlegen.
- **Key-Verlust `SECRETS_ENCRYPTION_KEY`:** Alle TOTP-Secrets (und SMTP/ntfy) wären
  unbrauchbar, und jeder bräuchte einen Reset. Das gehört in die Backup-Doku: der Key
  muss getrennt von DB-Dumps gesichert werden.
- **Uhrzeitdrift auf dem Server:** NTP wird vorausgesetzt. `window: 1` deckt ±30 s ab.
- **Lücken bei der Durchsetzung:** Routen, die nicht über den globalen `JwtAuthGuard`
  laufen, würden die Pflicht umgehen. **Geprüft in PR 3:** `JwtAuthGuard` ist `APP_GUARD`;
  übersprungen wird er nur für `@Public` (Health/Version/Time/Config, Metrics mit eigenem
  Token, die Auth-Endpoints vor der Session), `@ScreenAuth` (Screens, Signed-Media) und
  `@AgentAuth` (Site-Agent) — keine davon trägt eine User-Session. Alle User-Routen inkl.
  Dashboard-SSE (`@Roles`) laufen hindurch; es gibt keinen WebSocket-Gateway und keine
  Express-Handler außerhalb von Nest (nur Body-Parser/Cookie-Middleware).
  `@AllowWithoutMfa` steht nur auf `POST /auth/logout`, `GET /auth/me`, `/auth/mfa/*`,
  `GET /me/profile` und `GET /me/memberships`.
