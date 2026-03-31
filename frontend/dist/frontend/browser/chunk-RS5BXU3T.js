import {
  AuthService
} from "./chunk-3W6OO4XR.js";
import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  Injectable,
  NgZone,
  Subject,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/dashboard/dashboard-sse.service.ts
var SSE_INITIAL_RETRY_MS = 1e3;
var SSE_MAX_RETRY_MS = 3e4;
var DashboardSseService = class _DashboardSseService {
  authService = inject(AuthService);
  orgState = inject(OrganisationStateService);
  zone = inject(NgZone);
  connectedOrgId = null;
  sseAbortController = null;
  sseRetryTimeout = null;
  sseRetryDelay = SSE_INITIAL_RETRY_MS;
  destroyed = false;
  screenOnline$ = new Subject();
  screenOffline$ = new Subject();
  scheduleUpdated$ = new Subject();
  transcodingProgress$ = new Subject();
  transcodingComplete$ = new Subject();
  transcodingFailed$ = new Subject();
  notificationNew$ = new Subject();
  liveStreamHealth$ = new Subject();
  connect() {
    const token = this.authService.getToken();
    const orgId = this.orgState.selectedOrgId();
    if (!token || !orgId)
      return;
    if (this.sseAbortController && this.connectedOrgId === orgId)
      return;
    this.disconnect();
    this.connectedOrgId = orgId;
    const controller = new AbortController();
    this.sseAbortController = controller;
    this.zone.runOutsideAngular(() => {
      this.startSseStream(token, controller);
    });
  }
  disconnect() {
    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }
    if (this.sseRetryTimeout !== null) {
      clearTimeout(this.sseRetryTimeout);
      this.sseRetryTimeout = null;
    }
    this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
    this.connectedOrgId = null;
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.disconnect();
  }
  async startSseStream(token, controller) {
    try {
      const response = await fetch("/api/dashboard/events", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          "X-Organisation-Id": this.connectedOrgId
        },
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }
      this.zone.run(() => {
        this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        buffer += decoder.decode(value, { stream: true });
        const events = this.parseSseBuffer(buffer);
        buffer = events.remaining;
        for (const event of events.parsed) {
          this.zone.run(() => this.routeEvent(event));
        }
      }
      if (!controller.signal.aborted) {
        this.scheduleSseReconnect();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (!controller.signal.aborted && !this.destroyed) {
        this.scheduleSseReconnect();
      }
    }
  }
  parseSseBuffer(buffer) {
    const parsed = [];
    const blocks = buffer.split("\n\n");
    const remaining = blocks.pop() ?? "";
    for (const block of blocks) {
      const lines = block.split("\n");
      let data = "";
      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        } else if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        }
      }
      if (!data || eventType === "keepalive")
        continue;
      try {
        const payload = JSON.parse(data);
        if (payload["type"] === "keepalive")
          continue;
        const event = {
          type: payload["type"] ?? eventType,
          timestamp: payload["timestamp"] ?? (/* @__PURE__ */ new Date()).toISOString(),
          data: payload["data"] ?? payload
        };
        if (event.type) {
          parsed.push(event);
        }
      } catch {
      }
    }
    return { parsed, remaining };
  }
  routeEvent(event) {
    switch (event.type) {
      case "screen.online":
        this.screenOnline$.next(event);
        break;
      case "screen.offline":
        this.screenOffline$.next(event);
        break;
      case "schedule.updated":
        this.scheduleUpdated$.next(event);
        break;
      case "transcoding.progress":
        this.transcodingProgress$.next(event);
        break;
      case "transcoding.complete":
        this.transcodingComplete$.next(event);
        break;
      case "transcoding.failed":
        this.transcodingFailed$.next(event);
        break;
      case "notification.new":
        this.notificationNew$.next(event);
        break;
      case "live-stream-health":
        this.liveStreamHealth$.next(event);
        break;
    }
  }
  scheduleSseReconnect() {
    if (this.destroyed)
      return;
    this.sseRetryTimeout = setTimeout(() => {
      this.sseRetryDelay = Math.min(this.sseRetryDelay * 2, SSE_MAX_RETRY_MS);
      const token = this.authService.getToken();
      const orgId = this.orgState.selectedOrgId();
      if (!token || !orgId)
        return;
      const controller = new AbortController();
      this.sseAbortController = controller;
      this.connectedOrgId = orgId;
      this.zone.runOutsideAngular(() => {
        this.startSseStream(token, controller);
      });
    }, this.sseRetryDelay);
  }
  static \u0275fac = function DashboardSseService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DashboardSseService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DashboardSseService, factory: _DashboardSseService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardSseService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  DashboardSseService
};
//# sourceMappingURL=chunk-RS5BXU3T.js.map
