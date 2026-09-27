import { SetMetadata } from '@nestjs/common';

export const IS_USER_SCOPED_KEY = 'isUserScoped';

/**
 * Marks a route as authenticated but **not** organisation-scoped: it operates
 * purely on `req.user` (own profile, own password, own notification prefs) or
 * on repo-owned static content.
 *
 * This is the explicit opt-out for the RolesGuard's default-deny. Previously a
 * missing `@Roles()` silently meant "allow, and never check membership", so any
 * new organisation-scoped route that forgot the decorator was an instant
 * cross-tenant hole. Now the guard denies by default and a route must declare
 * one of `@Public()`, `@ScreenAuth()`, `@Roles(...)` or `@UserScoped()`.
 *
 * Do NOT use this on a route that reads an organisation id from the request —
 * use `@Roles(...)` (plus `@OrgFromParam(...)` when the id is a route param).
 */
export const UserScoped = () => SetMetadata(IS_USER_SCOPED_KEY, true);
