# Plan: Self-Signup + Organisation Creation + Account Email Flows

> Status: PLANNED (not yet implemented). Written 2026-06-12 for a future session.

## Context

Today the platform has **no public registration**: the first user is created via the
UI first-run setup (`POST /api/auth/setup`, becomes system super-admin), and every
other user is *invited* by a super-admin/org-admin (`createInvitee` + set-password
link). Account emails (invite, password-reset) are sent **only through the inviting
org's per-org SMTP config** (`AuthEmailService` → `OrgNotificationConfigService`); if
the org has no SMTP, the link is just logged.

The goal is **self-service signup**: anyone can register with email+password, get a
verification email, and on verifying gets their **own new organisation** (as OrgAdmin)
— removing the super-admin-must-invite bottleneck. Plus the full account-email surface:
**email verification on signup, password reset, email change, password change** (the
last two partially exist). The **first-run super-admin stays** — they still see all
organisations and raise per-org storage limits (already implemented under
`SuperAdminGuard`).

**The core architectural gap:** a self-signup user has no org → no per-org SMTP → the
existing `AuthEmailService` can't email them. So we introduce a **platform-level mailer
driven by ENV** (reusing the proven myNextTrip convention) for *account/system* emails,
while per-org SMTP stays for *org notifications*.

### Decisions (confirmed with user)
1. **Org created at registration**, atomically (user + org + OrgAdmin membership), but
   `emailVerified=false` → **login blocked until verified**. Org-name uniqueness checked
   immediately. A cleanup job removes never-verified signups.
2. **Default storage limits env-configurable** (`SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES`
   / `_TRANSCODED_BYTES`, default 5 GB each). Super-admin can raise later (exists).
3. **Mailpit** added to `docker-compose.yml` (SMTP 1025 / UI 8025). Send a
   **password-changed notice** and notify the **old address on email change**.

## Reuse (existing code — do NOT reinvent)
- `SmtpEmailProvider` (`apps/backend/src/notification/channels/smtp-email-provider.ts`) —
  nodemailer wrapper; reuse for the platform mailer, constructed from env instead of org config.
- `EmailProvider`/`MailOptions` interface (`channels/email-provider.interface.ts`).
- `AuthEmailService` (`channels/auth-email.service.ts`) — keep for org-scoped invite/reset; its `buildSetPasswordUrl` URL pattern is the template for new link builders.
- `TokenService` (Redis refresh + access JWT), `PasswordService` (bcrypt), `generateUrlSafeToken()` in `auth.service.ts`.
- Token-on-user-row pattern: `users.passwordResetToken(+ExpiresAt)` — extend with the same shape for verification/email-change (no separate token table; matches existing design, KISS/YAGNI).
- `OrganisationService.create(dto, creator?)` (`organisation/organisation.service.ts`) — already assigns creator as OrgAdmin; call it inside the signup transaction with env default limits.
- `UserService` transaction pattern in `createFirstSuperAdmin` (atomic existence-check+insert).
- Frontend dark-theme auth page pattern (`login.html`/`setup.html` design tokens), `setup.service.ts`/`auth.service.ts`/guards, `app.routes.ts`.

> myNextTrip reference (env + mailer convention to mirror):
> `~/GIT/Github/myNextTrip/apps/api/src/config/env.validation.ts` (SMTP_HOST/PORT/USER/PASSWORD/FROM/SECURE + PUBLIC_BASE_URL, with the string→bool `@Transform`),
> and `apps/api/src/mailer/{mailer.module.ts,mailer.service.ts}` (nodemailer transport built from config; `sendVerifyEmail`/`sendPasswordReset` shape).

---

## Backend changes (`apps/backend/src`)

### 1. DB schema + migration (`db/schema.ts`)
Add to `users` table (mirroring the existing `passwordResetToken` columns):
- `emailVerified boolean notNull default false`
- `emailVerificationToken text`, `emailVerificationTokenExpiresAt timestamptz`
- `pendingEmail text`, `emailChangeToken text`, `emailChangeTokenExpiresAt timestamptz`

Generate via `nx run backend:db-generate`, then **hand-edit the generated SQL** to
backfill existing rows `UPDATE users SET email_verified = true;` (so the current
super-admin + active users aren't locked out), then `nx run backend:db-migrate`.

### 2. Platform mailer + env config
- **New `PlatformMailerService`** (place in `notification/channels/` next to `AuthEmailService`, export from NotificationModule). Builds one `SmtpEmailProvider` from env (`SMTP_HOST/PORT/USER/PASSWORD/FROM/SECURE`). Methods: `sendVerifyEmail`, `sendPasswordReset`, `sendEmailChangeConfirm`, `sendOldAddressChangeNotice`, `sendPasswordChangedNotice`. URL builders off `PUBLIC_BASE_URL`: `/verify-email?t=`, `/set-password?t=`, `/confirm-email-change?t=`. Best-effort (log, never throw) — same enumeration-safety as `AuthEmailService`.
- **Env validation**: `app.module.ts` already uses `ConfigModule.forRoot({…})`. Add a `validate` function (new `src/config/env.validation.ts`) modelled on myNextTrip's `EnvironmentVariables`, declaring `SMTP_HOST`(default `localhost`), `SMTP_PORT`(1025), `SMTP_USER`/`SMTP_PASSWORD`(''), `SMTP_FROM`, `SMTP_SECURE`(bool, myNextTrip's string-coerce `@Transform`), `PUBLIC_BASE_URL`, `SIGNUP_ENABLED`(bool, default true), `SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES`/`_TRANSCODED_BYTES` (default 5 GiB). Wire `validate` into `forRoot`.

### 3. AuthService + UserService + OrganisationService (signup)
- `UserService.createUserWithOrganisation({email,passwordHash,name,organisationName, originalLimit, transcodedLimit})` → **one transaction**: insert user (`emailVerified:false`, with hash + verification token), create org (reuse org insert + default limits), insert `userOrganisationMemberships` row with `role: OrgAdmin`. Enforce email + org-name uniqueness (catch unique violations → `ConflictException`).
- `UserService` token helpers: `setEmailVerificationToken`, `findByEmailVerificationToken`, `markEmailVerified`; email-change: `setPendingEmail`, `findByEmailChangeToken`, `applyEmailChange`.
- `AuthService.register(...)` orchestrates: hash password, `generateUrlSafeToken()`, call `createUserWithOrganisation`, return token for the controller to email. `AuthService.verifyEmail(token)` → validate+unexpired → `markEmailVerified` → issue access+refresh (auto-login). `AuthService.changeEmail(userId, newEmail, currentPassword)` and `confirmEmailChange(token)`.
- **Block unverified login**: in `AuthService.login`, after credential check, if `!user.emailVerified` throw `ForbiddenException('Email not verified')` (distinct from invalid-credentials so the SPA can offer "resend").

### 4. AuthController endpoints (all `@Public()` + `@Throttle`, except authed ones)
- `POST /api/auth/register` `{email,password,name?,organisationName}` → 201; reads `SIGNUP_ENABLED` (404/403 if off); sends verify email via `PlatformMailerService`.
- `POST /api/auth/verify-email` `{token}` → 200 + sets auth cookies (auto-login).
- `POST /api/auth/resend-verification` `{email}` → 204 (enumeration-safe, throttled).
- `POST /api/auth/change-email` (authed) `{newEmail,currentPassword}` → 204; emails confirm link to NEW address + notice to OLD.
- `POST /api/auth/confirm-email-change` `{token}` → 204.
- Update `forgot-password`: send via `PlatformMailerService.sendPasswordReset` (works without org SMTP); keep the existing org-event path for invited users or drop in favour of platform mailer (prefer platform for consistency).
- Update `change-password`: after success, `sendPasswordChangedNotice`.
- New DTOs in `auth/dto/`: `register.dto.ts`, `verify-email.dto.ts`, `resend-verification.dto.ts`, `change-email.dto.ts`, `confirm-email-change.dto.ts` (class-validator: `@IsEmail`, `@MinLength(8)` password, non-empty org name).
- Add `setup-status` sibling or extend it to also return `signupEnabled` so the SPA can show/hide the "Create account" link.

### 5. Cleanup job (never-verified signups)
Add a `@nestjs/schedule` cron in AuthModule (or a small service) deleting users with
`emailVerified=false` AND `createdAt < now()-48h` (cascades remove the orphan org +
membership via FK `onDelete: cascade`). Make the window env-configurable.

---

## Frontend changes (`apps/frontend/src/app`)

- **New public routes** in `app.routes.ts`: `/register`, `/verify-email`, `/confirm-email-change` (lazy `loadComponent`).
- **`register/`** component+service: form (email, password, confirm, organisation name) → `POST /api/auth/register` → "check your inbox" state. Dark design tokens (match existing auth pages).
- **`verify-email/`**: reads `?t=`, calls verify, auto-login → redirect `/dashboard`; error + "resend" affordance.
- **`confirm-email-change/`**: reads `?t=`, calls confirm, shows result.
- **`login.html`/`login.ts`**: add "Create account" link gated on `signupEnabled` (from `setup-status`); on login 403 "Email not verified" show inline message + resend button.
- **`settings/user/`**: add "Change email" (new email + current password) + ensure change-password present, calling the new endpoints via `auth.service.ts`.
- `auth.service.ts`: add `register`, `verifyEmail`, `resendVerification`, `changeEmail`, `confirmEmailChange` methods (`withCredentials`, `firstValueFrom`).
- Guards: `loginGuard`/`setupGuard`/`authGuard` unaffected; verify/register/confirm routes are public like `set-password`.

---

## Ops / docs
- `docker-compose.yml`: add **Mailpit** (`axllent/mailpit`, 1025/8025); point backend `SMTP_HOST=mailpit`, `SMTP_PORT=1025`.
- `.env.example`: add `SMTP_*`, `PUBLIC_BASE_URL`, `SIGNUP_ENABLED`, `SIGNUP_DEFAULT_STORAGE_*`.
- Ansible: add the new env to `ansible/templates/signage-backend.container.j2` (+ vars/defaults); document real SMTP in prod.
- `CLAUDE.md`: update Auth section (self-signup + platform vs per-org SMTP; first super-admin retained).

---

## Tests (TDD; keep backend coverage gate 92/83/84/92)
**Backend (Jest):**
- `register`: creates user+org+OrgAdmin membership, unverified, sends verify mail (mock `PlatformMailerService`); duplicate email/org-name → 409; `SIGNUP_ENABLED=false` → blocked.
- `verify-email`: happy (verifies + issues cookies), expired, invalid/unknown token.
- `resend-verification`: 204 for known+unknown (enumeration-safe).
- `login`: blocked (403) when unverified; works after verify; super-admin/invitee flows unchanged.
- `change-email` + `confirm-email-change`: happy, wrong password, expired token; old-address notice + new-address confirm sent.
- `forgot-password`/`set-password`: now via platform mailer; `change-password` sends notice.
- cleanup cron: deletes stale unverified, keeps verified + recent.
- env validation: missing/invalid SMTP shape fails fast.
**Frontend (Vitest):** register/verify/confirm-email-change component+service specs (`HttpTestingController`), login "create account"/"resend" behaviour, settings change-email.

## Verification (end-to-end)
1. `npm run dev` (compose w/ Mailpit). 2. Open `/register`, sign up → check Mailpit UI (`:8025`) for verify mail. 3. Click link → `/verify-email` → auto-login → dashboard; confirm a new org exists with default limits, user is OrgAdmin. 4. Try login before verifying → blocked with "verify email" + resend works. 5. As super-admin: see the new org under `/admin/organisations`, raise its storage limit. 6. Settings → change email → confirm via Mailpit (new addr) + old-addr notice arrives. 7. Forgot-password + change-password → reset + notice mails. 8. Gates: `npx nx run-many -t lint typecheck test build --projects=backend,frontend` green; backend coverage gate holds; `cd apps/frontend && npx prettier --check "src/**/*.{ts,html,css}"`.

## Rollout
Feature-flag via `SIGNUP_ENABLED` (default on). Migration backfills `email_verified=true`
for existing users. Ship behind the flag; enable in prod once SMTP env is set.

## Suggested commit sequence (one logical step each, keep gates green)
1. DB schema + migration (with backfill)
2. Platform mailer + env validation + Mailpit/compose/.env.example
3. Signup: register + verify-email + resend + login-gating (+ tests)
4. Email change + password-changed notice (+ tests)
5. Frontend: register/verify/confirm pages + login link + settings change-email (+ tests)
6. Ansible env + CLAUDE.md docs
