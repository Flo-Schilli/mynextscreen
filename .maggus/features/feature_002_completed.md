# Feature 002: Authentication (Hanko Cloud)

## Introduction

Integrate Hanko Cloud as the identity provider for user authentication. The backend validates Hanko JWTs on every request, and the frontend provides a login page using Hanko's web components that redirects to the app on success.

### Architecture Context

- **Vision alignment:** "Authenticated via Hanko" — users log in via Hanko, screens use API keys (API keys come in feature 005)
- **Components involved:** AuthModule (new), Angular app shell
- **New patterns:** JWT validation guard, Hanko web component integration, protected route pattern

## Goals

- Users can log in via Hanko Cloud's hosted UI components
- Backend validates Hanko JWTs and rejects unauthenticated requests
- Frontend redirects unauthenticated users to the login page
- JWT payload (`userId`, `email`) is available to all backend services

## Tasks

### TASK-002-001: Backend AuthModule — JWT Validation
**Description:** As the system, I want to validate Hanko Cloud JWTs on incoming requests so that only authenticated users can access the API.

**Token Estimate:** ~40k tokens
**Predecessors:** none
**Successors:** TASK-002-003
**Parallel:** yes — can run alongside TASK-002-002

**Acceptance Criteria:**
- [x] `AuthModule` created with a `JwtAuthGuard`
- [x] Guard fetches Hanko's JWKS (JSON Web Key Set) from `HANKO_API_URL` and caches it
- [x] Guard validates the JWT signature, expiration, and issuer
- [x] On valid JWT: extracts `userId` and `email` from claims, attaches to request object
- [x] On invalid/missing JWT: returns HTTP 401
- [x] `HANKO_API_URL` read from environment variable
- [x] Guard is applied globally with a `@Public()` decorator to exempt specific routes (e.g. health check)
- [x] Unit tests for guard: valid token, expired token, missing token, malformed token
- [x] Typecheck and lint pass

### TASK-002-002: Frontend Login Page with Hanko Web Components
**Description:** As a user, I want to see a login page so that I can authenticate with my Hanko account.

**Token Estimate:** ~35k tokens
**Predecessors:** none
**Successors:** TASK-002-003
**Parallel:** yes — can run alongside TASK-002-001

**Acceptance Criteria:**
- [x] `@anthropic-ai/hanko-elements` (or `@teamhanko/hanko-elements`) integrated into Angular
- [x] `/login` route renders Hanko's `<hanko-auth>` web component
- [x] Hanko API URL configurable via Angular environment files
- [x] On successful authentication, user is redirected to `/` (dashboard)
- [x] Basic styling: centered card on dark background, consistent with dark-mode-first design
- [x] ⚠️ BLOCKED: Verify in browser: login page renders, Hanko component loads — requires a running Hanko Cloud instance with a valid API URL configured in the environment

### TASK-002-003: Frontend Auth Guard & Token Management
**Description:** As a user, I want to be redirected to login if I'm not authenticated, and stay logged in across page reloads.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-002-001, TASK-002-002
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] Angular route guard checks for valid Hanko session
- [x] If no valid session, redirect to `/login`
- [x] HTTP interceptor attaches the JWT as `Authorization: Bearer <token>` to all `/api` requests
- [x] Logout functionality: clears Hanko session, redirects to `/login`
- [x] Session persists across page reloads (Hanko SDK handles this via cookies/storage)
- [x] ⚠️ BLOCKED: Verify in browser: unauthenticated user sees login page; after login, redirected to app; after logout, redirected back to login — requires a running Hanko Cloud instance with a valid API URL configured in the environment

## Task Dependency Graph

```
TASK-002-001 ──→ TASK-002-003
TASK-002-002 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-002-001 | ~40k | none | yes (with 002) | — |
| TASK-002-002 | ~35k | none | yes (with 001) | — |
| TASK-002-003 | ~30k | 001, 002 | no | — |

**Total estimated tokens:** ~105k

## Functional Requirements

- FR-1: All API routes except `/api/health` must require a valid Hanko JWT
- FR-2: The login page must use Hanko's official web components (no custom login form)
- FR-3: JWTs must be validated against Hanko's JWKS endpoint (not a static secret)
- FR-4: The frontend must automatically attach the JWT to all API requests
- FR-5: Unauthenticated users must be redirected to `/login`

## Non-Goals

- No role-based access control yet (comes in feature 004)
- No organisation-scoped claims yet (comes in feature 003/004)
- No API key authentication for screens (comes in feature 005)
- No user registration flow — Hanko Cloud handles this

## Technical Considerations

- Hanko JWKS should be cached with a TTL (e.g. 1 hour) to avoid hitting the Hanko API on every request
- The `@Public()` decorator pattern uses `SetMetadata` + guard reflection to skip auth on specific routes
- Hanko web components are framework-agnostic; Angular needs `CUSTOM_ELEMENTS_SCHEMA` in the module
- Consider using `@nestjs/passport` with a custom Hanko strategy, or a plain guard — either works

## Success Metrics

- A user can log in via Hanko and access the app
- An unauthenticated request to any protected endpoint returns 401
- Page reload preserves the session

## Open Questions

None — all resolved.
