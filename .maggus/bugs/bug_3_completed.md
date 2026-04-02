# Bug: WebSocket connection leak crashes Angular dev server after repeated navigation

## Summary

Navigating between pages (especially Dashboard and Screen Groups) causes repeated Socket.IO connect/disconnect cycles through the Angular dev server proxy. After ~10-20 navigation cycles, the dev server stops serving all assets (CSS, JS, HMR WebSocket), making the page completely unresponsive. Console shows `ws://localhost:4200/socket.io/?EIO=4&transport=websocket` errors.

## Steps to Reproduce

1. Start the frontend dev server (`ng serve`)
2. Log in and navigate to Dashboard
3. Click "Screen Groups" in the navbar
4. Click "Dashboard" in the navbar
5. Repeat steps 3-4 approximately 10-20 times
6. Observe: WebSocket errors appear in the console, eventually CSS/JS stop loading entirely

## Expected Behavior

Navigation between pages should not degrade the dev server. The Socket.IO connection should be established once and reused across page navigations, not torn down and recreated on every route change.

## Root Cause

The `DashboardSocketService` (`frontend/src/app/dashboard/dashboard-socket.service.ts`) is a root-level singleton (`providedIn: 'root'`), but its `connect()` method is only called from the Dashboard component's `orgEffect` (`frontend/src/app/dashboard/dashboard.ts:539-545`):

```typescript
private orgEffect = effect(() => {
  const orgId = this.orgState.selectedOrgId();
  if (orgId) {
    this.loadData(orgId);
    this.socketService.connect();  // creates new socket every time
  }
});
```

And `disconnect()` is called in Dashboard's `ngOnDestroy` (`frontend/src/app/dashboard/dashboard.ts:579`):

```typescript
ngOnDestroy(): void {
  for (const sub of this.subscriptions) {
    sub.unsubscribe();
  }
  this.socketService.disconnect();
}
```

**This creates a connect/disconnect cycle on every navigation to/from Dashboard.** Each cycle goes through the Angular dev server's WebSocket proxy (`frontend/proxy.conf.json:7-12`, `ws: true`). The proxy accumulates stale WebSocket state, eventually exhausting its connection handling capacity.

**Compounding factors:**

1. **Reconnection attempts race with disconnect:** `DashboardSocketService.connect()` at line 34-40 configures `reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000`. When `disconnect()` is called while a reconnection attempt is in-flight, the old socket may not fully tear down before the reference is nullified at line 68.

2. **NotificationBell is broken outside Dashboard:** The `NotificationBell` component lives in the Layout (always rendered) and subscribes to `socketService.notificationNew$` via `NotificationService` (`frontend/src/app/notifications/notification.service.ts:73-81`). But since the socket only connects when Dashboard is active, real-time notifications silently stop working on every other page.

3. **No connection guard:** `connect()` at line 27-40 always creates a new socket — there's no check for an existing healthy connection. The `disconnect()` call on line 28 tears down a working connection just to immediately recreate it.

## User Stories

### BUG-003-001: Move Socket.IO connection lifecycle to app level

**Description:** As a user, I want the WebSocket connection to be established once on login and maintained across page navigations so that real-time updates work everywhere and the dev server doesn't crash.

**Acceptance Criteria:**
- [x] `DashboardSocketService.connect()` is called once from the Layout component (or an app initializer) when the user is authenticated and an organisation is selected
- [x] `DashboardSocketService.connect()` is a no-op if a healthy connection already exists for the same org — only reconnects if the organisation changes
- [x] `DashboardSocketService.disconnect()` is called on logout, not on route changes
- [x] Dashboard component (`frontend/src/app/dashboard/dashboard.ts`) no longer calls `connect()` or `disconnect()` — it only subscribes to the existing Subjects
- [x] Dashboard `ngOnDestroy` unsubscribes from Subjects but does NOT disconnect the socket
- [x] `NotificationBell` receives real-time notifications on all pages, not just Dashboard
- [x] Navigating between Dashboard and Screen Groups 50+ times does not produce WebSocket errors or degrade the dev server
- [x] Organisation switching in the navbar reconnects the socket with the new org context (single reconnect, not a leak)
- [x] Typecheck/lint passes
- [x] Existing unit tests pass, update Dashboard and NotificationService specs if needed

### BUG-003-002: Add connection guard and cleanup to prevent ghost connections

**Description:** As a developer, I want the Socket.IO service to defensively prevent ghost connections so that even edge cases (rapid org switching, network flaps) don't leak sockets.

**Acceptance Criteria:**
- [x] `connect()` removes all listeners from the old socket before calling `socket.disconnect()` (use `socket.removeAllListeners()` before `socket.disconnect()` at `dashboard-socket.service.ts:66-69`)
- [x] `connect()` disables reconnection on the old socket before disconnecting (`socket.io.opts.reconnection = false`) to prevent reconnection attempts racing with the new connection
- [x] If `connect()` is called while a connection is already active for the same `orgId`, it returns early without creating a new socket
- [x] If `connect()` is called with a different `orgId`, it cleanly tears down the old connection before creating the new one
- [x] No regression in real-time dashboard updates (screen online/offline, transcoding progress, notifications)
- [x] Typecheck/lint passes
