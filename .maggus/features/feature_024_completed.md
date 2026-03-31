# Feature 024: Real-Time Screen Status Updates on Screens Page

## Introduction

The Screens management page does not update screen online/offline status in real time. Users must manually refresh the page to see status changes. The backend already emits `SCREEN_STATUS_CHANGED` events, and the Angular `DashboardSseService` already routes `screen.online` / `screen.offline` SSE events to observable subjects — the Dashboard page subscribes and updates in-place. The Screens page simply doesn't subscribe.

### Architecture Context

- **Vision alignment:** "Real-time updates — dashboard and screen status update live via push (no manual refresh)" (Design Principles)
- **Components involved:** `DashboardSseService` (frontend, already has `screenOnline$` / `screenOffline$` subjects), `ScreensComponent` (frontend, missing subscription)
- **No backend changes needed** — the SSE event chain is already complete

## Goals

- Screen online/offline status updates in real time on the Screens page without manual refresh
- Both the screen grid (list view) and the detail view update when status changes
- No new services or backend changes required

## Tasks

### TASK-024-001: Subscribe to screen status SSE events in Screens component
**Description:** As an admin viewing the Screens page, I want to see screen status (online/offline) update in real time so that I don't need to refresh the page.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** none
**Parallel:** n/a
**Model:** sonnet

**Implementation Notes:**

In `frontend/src/app/screens/screens.ts`:

1. Inject `DashboardSseService`
2. In `ngOnInit` (or equivalent lifecycle), subscribe to `screenOnline$` and `screenOffline$`
3. On event, update the `screens` array in-place — find the screen by `event.data['screenId']` and toggle `isOnline`
4. Also update `selectedScreen` if the currently viewed screen's status changed (detail view)
5. Clean up subscriptions on destroy

Follow the same pattern as the Dashboard component (`dashboard.ts` lines 549–556).

**Acceptance Criteria:**
- [x] `DashboardSseService` is injected into `ScreensComponent`
- [x] Subscriptions to `screenOnline$` and `screenOffline$` are set up on init
- [x] Screen grid cards update their status dot and text in real time when a screen goes online/offline
- [x] Screen detail view updates its status badge in real time if the selected screen's status changes
- [x] Subscriptions are cleaned up on component destroy
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser: open Screens page, toggle a screen's status → status updates without refresh — requires running application and manual browser testing

## Task Dependency Graph

```
TASK-024-001 (single task, no dependencies)
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-024-001 | ~25k | none | n/a | sonnet |

**Total estimated tokens:** ~25k

## Functional Requirements

- FR-1: When a screen goes online, its status dot, status text, and status badge must update to "Online" on the Screens page without a page refresh
- FR-2: When a screen goes offline, its status dot, status text, and status badge must update to "Offline" on the Screens page without a page refresh
- FR-3: If a screen's detail view is open and that screen's status changes, the detail view must reflect the new status immediately

## Non-Goals

- Backend changes (SSE event chain is already complete)
- Screen Groups page (does not display online/offline status)
- Adding new SSE event types or changing the event format
- Adding toast/notification on status change (existing notification system handles that separately)

## Technical Considerations

- The `DashboardSseService` is `providedIn: 'root'` and connected at the shell/layout level — it's always active when the user is logged in, so no connection management is needed in the Screens component
- Follow the existing pattern in `dashboard.ts` for updating screen status in-place to keep consistency

## Success Metrics

- Screen status changes are reflected on the Screens page within the same latency as the Dashboard page (~1-2 seconds after the backend detects the change)
- No manual page refresh needed to see status updates

## Open Questions

None — all questions resolved.
