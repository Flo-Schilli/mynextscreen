# Plan — Fix empty `.set({})` in `OrgNotificationConfigService.upsert`

> Status: **open** · Severity: **low** (not user-triggerable today) · Surfaced by the
> Drizzle test-migration (see `docs/drizzle-test-migration-todo.md`).

## Problem

`backend/src/notification/org-notification-config.service.ts` `upsert()` builds a
`Partial<OrganisationNotificationConfig>` named `updates` by conditionally copying
only the fields the caller actually sent. The blank-secret rule deliberately skips
`smtpPassword`/`ntfyToken` when they are `''` (so a blank field keeps the stored
secret):

```ts
const updates: Partial<OrganisationNotificationConfig> = {};
if (config.smtpHost !== undefined) updates.smtpHost = config.smtpHost;
// …
if (config.smtpPassword !== undefined && config.smtpPassword !== '') {
  updates.smtpPassword = config.smtpPassword;
}
// …
const [saved] = await this.db
  .update(organisationNotificationConfigs)
  .set(updates)                                   // ← can be {}
  .where(eq(organisationNotificationConfigs.id, existing.id))
  .returning();
return saved;
```

If the caller sends **only** a blank secret (e.g. `{ smtpPassword: '' }`) and an
`existing` config row is present, every branch is skipped, so `updates === {}`.
Drizzle's `.set({})` then throws **`No values to set`** at runtime.

Under the old TypeORM layer `repo.save(existing)` was a silent no-op for this case,
so the path never threw — the migration to Drizzle exposed it.

### Impact / reachability

- **Not reachable from the current UI**: the org-notification-config form always
  submits the full DTO, so a lone blank secret never reaches the service in practice.
- It *is* reachable by any future/alternate caller (partial PATCH, API client,
  scripted update) that sends only secret fields left blank — and it was reachable
  from the isolated unit test, which is why we caught it.

## Fix (preferred)

Make a no-op update a no-op: when `updates` is empty, skip the DB write and return
the existing row unchanged.

```ts
if (Object.keys(updates).length === 0) {
  return existing; // nothing to change (e.g. only a blank secret was sent)
}
const [saved] = await this.db
  .update(organisationNotificationConfigs)
  .set(updates)
  .where(eq(organisationNotificationConfigs.id, existing.id))
  .returning();
return saved;
```

This preserves the existing "blank secret = keep stored value" semantics and returns
a consistent shape (the full row) to callers.

### Alternative considered

Always touch a harmless column (e.g. `updatedAt`) so `.set()` is never empty —
rejected: it adds a spurious write and a schema dependency (`updatedAt` may not
exist on this table) for no behavioural gain.

## Test plan (TDD)

In `backend/src/notification/org-notification-config.service.spec.ts` (already
migrated to the Testcontainers harness):

1. **RED** — add a case: seed an existing config with a known
   `smtpPassword`/`ntfyToken`, call `upsert(orgId, { smtpPassword: '' })`, and assert:
   - it resolves (no throw),
   - the returned row equals the seeded row (secret unchanged),
   - the DB row's `smtpPassword` is still the original value.
   This currently throws `No values to set`.
2. **GREEN** — apply the guard above.
3. Keep the existing cases green (blank secret alongside a real edit still persists
   the real edit; full-DTO upsert still works; insert path for a brand-new org
   unchanged).

## Affected files

- `backend/src/notification/org-notification-config.service.ts` — add the empty-`updates` guard.
- `backend/src/notification/org-notification-config.service.spec.ts` — add the regression test.

## Verification

- `cd backend && npx jest --runTestsByPath src/notification/org-notification-config.service.spec.ts`
- Full gate: `cd backend && npm run test:cov` (must stay ≥ 92/83/84/92), plus
  `npm run lint` / `npm run typecheck`.

## Acceptance criteria

- [ ] `upsert(orgId, { smtpPassword: '' })` on an existing config returns the row
      unchanged and does not throw.
- [ ] Blank-secret-keeps-stored-value semantics preserved.
- [ ] New regression test added; full backend suite + coverage gate green.
