import {
  ContentService
} from "./chunk-GVIOZNC5.js";
import {
  ScheduleService
} from "./chunk-5J7OLF7P.js";
import {
  DashboardSseService
} from "./chunk-RS5BXU3T.js";
import "./chunk-3W6OO4XR.js";
import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  ScreenService
} from "./chunk-DASS7FWB.js";
import {
  Component,
  DatePipe,
  Router,
  __spreadProps,
  __spreadValues,
  computed,
  effect,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵdomProperty,
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind2,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-F2IK7UH5.js";

// src/app/dashboard/dashboard.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.screenName;
var _forTrack2 = ($index, $item) => $item.startPercent;
var _forTrack3 = ($index, $item) => $item.timestamp;
function Dashboard_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 8);
    \u0275\u0275text(1, "Loading screens...");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 9);
    \u0275\u0275text(1, "No screens registered yet.");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_13_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 15);
    \u0275\u0275domListener("click", function Dashboard_Conditional_13_For_2_Template_button_click_0_listener() {
      const screen_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.navigateToScreen(screen_r2.id));
    });
    \u0275\u0275domElement(1, "span", 16);
    \u0275\u0275domElementStart(2, "span", 17);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 18);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const screen_r2 = ctx.$implicit;
    \u0275\u0275classProp("online", screen_r2.isOnline)("offline", !screen_r2.isOnline && screen_r2.lastHeartbeat)("never", !screen_r2.isOnline && !screen_r2.lastHeartbeat);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(screen_r2.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(screen_r2.location || "No location");
  }
}
function Dashboard_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 10);
    \u0275\u0275repeaterCreate(1, Dashboard_Conditional_13_For_2_Template, 6, 8, "button", 14, _forTrack0);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.screens());
  }
}
function Dashboard_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 8);
    \u0275\u0275text(1, "Loading storage info...");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 9);
    \u0275\u0275text(1, "No storage data available.");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 19)(1, "div", 20)(2, "span", 21);
    \u0275\u0275text(3, "Originals");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 22);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "div", 23);
    \u0275\u0275domElement(7, "div", 24);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "span", 25);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(10, "div", 19)(11, "div", 20)(12, "span", 21);
    \u0275\u0275text(13, "Transcoded");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(14, "span", 22);
    \u0275\u0275text(15);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(16, "div", 23);
    \u0275\u0275domElement(17, "div", 26);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(18, "span", 25);
    \u0275\u0275text(19);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2("", ctx_r2.formatBytes(ctx_r2.storage().originalUsedBytes), " / ", ctx_r2.formatBytes(ctx_r2.storage().originalLimitBytes));
    \u0275\u0275advance();
    \u0275\u0275classProp("warning", ctx_r2.originalPercent() > 80 && ctx_r2.originalPercent() <= 95)("danger", ctx_r2.originalPercent() > 95);
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r2.originalPercent(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r2.originalPercent().toFixed(1), "%");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate2("", ctx_r2.formatBytes(ctx_r2.storage().transcodedUsedBytes), " / ", ctx_r2.formatBytes(ctx_r2.storage().transcodedLimitBytes));
    \u0275\u0275advance();
    \u0275\u0275classProp("warning", ctx_r2.transcodedPercent() > 80 && ctx_r2.transcodedPercent() <= 95)("danger", ctx_r2.transcodedPercent() > 95);
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r2.transcodedPercent(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r2.transcodedPercent().toFixed(1), "%");
  }
}
function Dashboard_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 8);
    \u0275\u0275text(1, "Loading schedule...");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 9);
    \u0275\u0275text(1, "No upcoming schedules.");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_31_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 30);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const hour_r4 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(hour_r4);
  }
}
function Dashboard_Conditional_31_For_7_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElement(0, "div", 35);
  }
  if (rf & 2) {
    const entry_r5 = ctx.$implicit;
    \u0275\u0275styleProp("left", entry_r5.startPercent, "%")("width", entry_r5.widthPercent, "%")("background", entry_r5.colour);
    \u0275\u0275domProperty("title", entry_r5.playlistName + " (" + entry_r5.startTime + " - " + entry_r5.endTime + ")");
  }
}
function Dashboard_Conditional_31_For_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 31)(1, "span", 32);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 33);
    \u0275\u0275repeaterCreate(4, Dashboard_Conditional_31_For_7_For_5_Template, 1, 7, "div", 34, _forTrack2);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const row_r6 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275domProperty("title", row_r6.screenName);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r6.screenName);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(row_r6.entries);
  }
}
function Dashboard_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 12)(1, "div", 27);
    \u0275\u0275domElement(2, "span", 28);
    \u0275\u0275domElementStart(3, "div", 29);
    \u0275\u0275repeaterCreate(4, Dashboard_Conditional_31_For_5_Template, 2, 1, "span", 30, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275domElementEnd()();
    \u0275\u0275repeaterCreate(6, Dashboard_Conditional_31_For_7_Template, 6, 2, "div", 31, _forTrack1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r2.timelineHours());
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.timelineRows());
  }
}
function Dashboard_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 9);
    \u0275\u0275text(1, "No recent activity.");
    \u0275\u0275domElementEnd();
  }
}
function Dashboard_Conditional_38_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 36);
    \u0275\u0275domElement(1, "span", 37);
    \u0275\u0275domElementStart(2, "span", 38);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "date");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 39);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const entry_r7 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275classMap("activity-dot--" + entry_r7.category);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(4, 4, entry_r7.timestamp, "HH:mm:ss"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(entry_r7.description);
  }
}
function Dashboard_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 13);
    \u0275\u0275repeaterCreate(1, Dashboard_Conditional_38_For_2_Template, 7, 7, "div", 36, _forTrack3);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.activityFeed());
  }
}
var Dashboard = class _Dashboard {
  router = inject(Router);
  screenService = inject(ScreenService);
  contentService = inject(ContentService);
  scheduleService = inject(ScheduleService);
  orgState = inject(OrganisationStateService);
  socketService = inject(DashboardSseService);
  subscriptions = [];
  screens = signal([], ...ngDevMode ? [{ debugName: "screens" }] : (
    /* istanbul ignore next */
    []
  ));
  storage = signal(null, ...ngDevMode ? [{ debugName: "storage" }] : (
    /* istanbul ignore next */
    []
  ));
  scheduleEntries = signal([], ...ngDevMode ? [{ debugName: "scheduleEntries" }] : (
    /* istanbul ignore next */
    []
  ));
  activityFeed = signal([], ...ngDevMode ? [{ debugName: "activityFeed" }] : (
    /* istanbul ignore next */
    []
  ));
  loadingScreens = signal(false, ...ngDevMode ? [{ debugName: "loadingScreens" }] : (
    /* istanbul ignore next */
    []
  ));
  loadingStorage = signal(false, ...ngDevMode ? [{ debugName: "loadingStorage" }] : (
    /* istanbul ignore next */
    []
  ));
  loadingSchedule = signal(false, ...ngDevMode ? [{ debugName: "loadingSchedule" }] : (
    /* istanbul ignore next */
    []
  ));
  timelineStart = /* @__PURE__ */ new Date();
  originalPercent = computed(() => {
    const s = this.storage();
    if (!s || s.originalLimitBytes === 0)
      return 0;
    return Math.min(s.originalUsedBytes / s.originalLimitBytes * 100, 100);
  }, ...ngDevMode ? [{ debugName: "originalPercent" }] : (
    /* istanbul ignore next */
    []
  ));
  transcodedPercent = computed(() => {
    const s = this.storage();
    if (!s || s.transcodedLimitBytes === 0)
      return 0;
    return Math.min(s.transcodedUsedBytes / s.transcodedLimitBytes * 100, 100);
  }, ...ngDevMode ? [{ debugName: "transcodedPercent" }] : (
    /* istanbul ignore next */
    []
  ));
  timelineHours = computed(() => {
    const hours = [];
    const start = new Date(this.timelineStart);
    for (let i = 0; i <= 24; i += 3) {
      const h = new Date(start.getTime() + i * 60 * 60 * 1e3);
      hours.push(h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
    return hours;
  }, ...ngDevMode ? [{ debugName: "timelineHours" }] : (
    /* istanbul ignore next */
    []
  ));
  timelineRows = computed(() => {
    const entries = this.scheduleEntries();
    const screenMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const screenName = entry.screen?.name ?? entry.group?.name ?? "Unknown";
      const targetId = entry.screenId ?? entry.groupId ?? "unknown";
      if (!screenMap.has(targetId)) {
        screenMap.set(targetId, { name: screenName, entries: [] });
      }
      screenMap.get(targetId).entries.push(entry);
    }
    const startMs = this.timelineStart.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1e3;
    const rangeMs = endMs - startMs;
    const rows = [];
    for (const [, screen] of screenMap) {
      const timelineEntries = [];
      for (const entry of screen.entries) {
        const entryStart = Math.max(new Date(entry.startTime).getTime(), startMs);
        const entryEnd = Math.min(new Date(entry.endTime).getTime(), endMs);
        if (entryEnd <= entryStart)
          continue;
        const startPercent = (entryStart - startMs) / rangeMs * 100;
        const widthPercent = (entryEnd - entryStart) / rangeMs * 100;
        timelineEntries.push({
          playlistName: entry.playlist?.name ?? "Unknown",
          colour: entry.colour || "#3b82f6",
          startPercent,
          widthPercent,
          startTime: new Date(entryStart).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          endTime: new Date(entryEnd).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        });
      }
      rows.push({ screenName: screen.name, entries: timelineEntries });
    }
    return rows;
  }, ...ngDevMode ? [{ debugName: "timelineRows" }] : (
    /* istanbul ignore next */
    []
  ));
  orgEffect = effect(() => {
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      this.loadData(orgId);
    }
  }, ...ngDevMode ? [{ debugName: "orgEffect" }] : (
    /* istanbul ignore next */
    []
  ));
  ngOnInit() {
    this.subscriptions.push(this.socketService.screenOnline$.subscribe((event) => {
      this.updateScreenStatus(event.data["screenId"], true);
      this.addActivity("screen", `Screen came online`);
    }), this.socketService.screenOffline$.subscribe((event) => {
      this.updateScreenStatus(event.data["screenId"], false);
      this.addActivity("screen", `Screen went offline`);
    }), this.socketService.scheduleUpdated$.subscribe(() => {
      this.addActivity("schedule", `Schedule updated`);
      const orgId = this.orgState.selectedOrgId();
      if (orgId)
        this.loadSchedule(orgId);
    }), this.socketService.transcodingComplete$.subscribe(() => {
      this.addActivity("transcoding", `Transcoding completed`);
    }), this.socketService.transcodingFailed$.subscribe(() => {
      this.addActivity("transcoding", `Transcoding failed`);
    }), this.socketService.transcodingProgress$.subscribe((event) => {
      const progress = event.data["progress"];
      this.addActivity("transcoding", `Transcoding progress: ${progress}%`);
    }));
  }
  ngOnDestroy() {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }
  loadData(orgId) {
    this.loadScreens(orgId);
    this.loadStorage(orgId);
    this.loadSchedule(orgId);
  }
  loadScreens(orgId) {
    this.loadingScreens.set(true);
    this.screenService.getAll(orgId).subscribe({
      next: (screens) => {
        this.screens.set(screens);
        this.loadingScreens.set(false);
      },
      error: () => this.loadingScreens.set(false)
    });
  }
  loadStorage(orgId) {
    this.loadingStorage.set(true);
    this.contentService.getStorage(orgId).subscribe({
      next: (info) => {
        this.storage.set(info);
        this.loadingStorage.set(false);
      },
      error: () => this.loadingStorage.set(false)
    });
  }
  loadSchedule(orgId) {
    this.loadingSchedule.set(true);
    this.timelineStart = /* @__PURE__ */ new Date();
    const from = this.timelineStart.toISOString();
    const to = new Date(this.timelineStart.getTime() + 24 * 60 * 60 * 1e3).toISOString();
    this.scheduleService.getByDateRange(orgId, from, to).subscribe({
      next: (entries) => {
        this.scheduleEntries.set(entries);
        this.loadingSchedule.set(false);
      },
      error: () => this.loadingSchedule.set(false)
    });
  }
  updateScreenStatus(screenId, isOnline) {
    const updated = this.screens().map((s) => s.id === screenId ? __spreadProps(__spreadValues({}, s), { isOnline }) : s);
    this.screens.set(updated);
  }
  addActivity(category, description) {
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      category,
      description
    };
    const current = this.activityFeed();
    this.activityFeed.set([entry, ...current].slice(0, 20));
  }
  navigateToScreen(id) {
    this.router.navigate(["/screens"], { queryParams: { id } });
  }
  formatBytes(bytes) {
    if (bytes === 0)
      return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
  }
  static \u0275fac = function Dashboard_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Dashboard)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Dashboard, selectors: [["app-dashboard"]], decls: 39, vars: 5, consts: [[1, "dashboard"], [1, "page-title"], [1, "dashboard-grid"], [1, "card"], [1, "card-header"], [1, "card-title"], [1, "card-badge"], [1, "card-body"], [1, "loading-placeholder"], [1, "empty-state"], [1, "screen-grid"], [1, "card", "card-wide"], [1, "timeline"], [1, "activity-feed"], [1, "screen-tile", 3, "online", "offline", "never"], [1, "screen-tile", 3, "click"], [1, "screen-dot"], [1, "screen-name"], [1, "screen-location"], [1, "storage-section"], [1, "storage-label-row"], [1, "storage-label"], [1, "storage-value"], [1, "storage-bar"], [1, "storage-fill", "originals"], [1, "storage-percent"], [1, "storage-fill", "transcoded"], [1, "timeline-header"], [1, "timeline-screen-label"], [1, "timeline-hours"], [1, "timeline-hour"], [1, "timeline-row"], [1, "timeline-screen-label", 3, "title"], [1, "timeline-track"], [1, "timeline-block", 3, "left", "width", "background", "title"], [1, "timeline-block", 3, "title"], [1, "activity-item"], [1, "activity-dot"], [1, "activity-time"], [1, "activity-text"]], template: function Dashboard_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "div", 0)(1, "h1", 1);
      \u0275\u0275text(2, "Dashboard");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(3, "div", 2)(4, "section", 3)(5, "div", 4)(6, "h2", 5);
      \u0275\u0275text(7, "Screen Status");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(8, "span", 6);
      \u0275\u0275text(9);
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(10, "div", 7);
      \u0275\u0275conditionalCreate(11, Dashboard_Conditional_11_Template, 2, 0, "div", 8)(12, Dashboard_Conditional_12_Template, 2, 0, "div", 9)(13, Dashboard_Conditional_13_Template, 3, 0, "div", 10);
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(14, "section", 3)(15, "div", 4)(16, "h2", 5);
      \u0275\u0275text(17, "Storage Usage");
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(18, "div", 7);
      \u0275\u0275conditionalCreate(19, Dashboard_Conditional_19_Template, 2, 0, "div", 8)(20, Dashboard_Conditional_20_Template, 2, 0, "div", 9)(21, Dashboard_Conditional_21_Template, 20, 18);
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(22, "section", 11)(23, "div", 4)(24, "h2", 5);
      \u0275\u0275text(25, "Upcoming Schedule");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(26, "span", 6);
      \u0275\u0275text(27, "Next 24 hours");
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(28, "div", 7);
      \u0275\u0275conditionalCreate(29, Dashboard_Conditional_29_Template, 2, 0, "div", 8)(30, Dashboard_Conditional_30_Template, 2, 0, "div", 9)(31, Dashboard_Conditional_31_Template, 8, 0, "div", 12);
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(32, "section", 11)(33, "div", 4)(34, "h2", 5);
      \u0275\u0275text(35, "Recent Activity");
      \u0275\u0275domElementEnd()();
      \u0275\u0275domElementStart(36, "div", 7);
      \u0275\u0275conditionalCreate(37, Dashboard_Conditional_37_Template, 2, 0, "div", 9)(38, Dashboard_Conditional_38_Template, 3, 0, "div", 13);
      \u0275\u0275domElementEnd()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance(9);
      \u0275\u0275textInterpolate1("", ctx.screens().length, " screens");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loadingScreens() ? 11 : ctx.screens().length === 0 ? 12 : 13);
      \u0275\u0275advance(8);
      \u0275\u0275conditional(ctx.loadingStorage() ? 19 : !ctx.storage() ? 20 : 21);
      \u0275\u0275advance(10);
      \u0275\u0275conditional(ctx.loadingSchedule() ? 29 : ctx.timelineRows().length === 0 ? 30 : 31);
      \u0275\u0275advance(8);
      \u0275\u0275conditional(ctx.activityFeed().length === 0 ? 37 : 38);
    }
  }, dependencies: [DatePipe], styles: ["\n.dashboard[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.25rem;\n}\n.dashboard-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.25rem;\n}\n.card-wide[_ngcontent-%COMP%] {\n  grid-column: 1 / -1;\n}\n.card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.875rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.card-title[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 600;\n  margin: 0;\n  color: var(--color-text-primary);\n}\n.card-badge[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  background: var(--color-bg-tertiary);\n  padding: 0.125rem 0.5rem;\n  border-radius: 999px;\n}\n.card-body[_ngcontent-%COMP%] {\n  padding: 1rem;\n}\n.loading-placeholder[_ngcontent-%COMP%], \n.empty-state[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n  padding: 1rem 0;\n  text-align: center;\n}\n.screen-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.625rem;\n}\n.screen-tile[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  padding: 0.75rem;\n  border-radius: 6px;\n  border: 1px solid var(--color-border);\n  background: var(--color-bg-tertiary);\n  cursor: pointer;\n  text-align: left;\n  color: var(--color-text-primary);\n  transition: border-color 0.15s, transform 0.1s;\n}\n.screen-tile[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-accent);\n  transform: translateY(-1px);\n}\n.screen-dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  margin-bottom: 0.25rem;\n}\n.screen-tile.online[_ngcontent-%COMP%]   .screen-dot[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.screen-tile.offline[_ngcontent-%COMP%]   .screen-dot[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.screen-tile.never[_ngcontent-%COMP%]   .screen-dot[_ngcontent-%COMP%] {\n  background: #6b7280;\n}\n.screen-name[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.screen-location[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.storage-section[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.storage-section[_ngcontent-%COMP%]:last-child {\n  margin-bottom: 0;\n}\n.storage-label-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.375rem;\n}\n.storage-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.storage-value[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.storage-bar[_ngcontent-%COMP%] {\n  height: 8px;\n  background: var(--color-bg-tertiary);\n  border-radius: 4px;\n  overflow: hidden;\n  margin-bottom: 0.25rem;\n}\n.storage-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  border-radius: 4px;\n  transition: width 0.3s ease;\n}\n.storage-fill.originals[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n}\n.storage-fill.transcoded[_ngcontent-%COMP%] {\n  background: #8b5cf6;\n}\n.storage-bar.warning[_ngcontent-%COMP%]   .storage-fill[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.storage-bar.danger[_ngcontent-%COMP%]   .storage-fill[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.storage-percent[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.timeline[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\n.timeline-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.25rem;\n}\n.timeline-hours[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  justify-content: space-between;\n  padding: 0 2px;\n}\n.timeline-hour[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n  width: 0;\n  text-align: center;\n}\n.timeline-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.375rem;\n}\n.timeline-screen-label[_ngcontent-%COMP%] {\n  width: 90px;\n  min-width: 90px;\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  padding-right: 0.5rem;\n}\n.timeline-track[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 20px;\n  background: var(--color-bg-tertiary);\n  border-radius: 3px;\n  position: relative;\n  overflow: hidden;\n}\n.timeline-block[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 2px;\n  bottom: 2px;\n  border-radius: 2px;\n  min-width: 2px;\n  opacity: 0.85;\n}\n.activity-feed[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 320px;\n  overflow-y: auto;\n}\n.activity-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.8125rem;\n}\n.activity-dot[_ngcontent-%COMP%] {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n.activity-dot--screen[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.activity-dot--schedule[_ngcontent-%COMP%] {\n  background: #3b82f6;\n}\n.activity-dot--transcoding[_ngcontent-%COMP%] {\n  background: #8b5cf6;\n}\n.activity-dot--info[_ngcontent-%COMP%] {\n  background: #6b7280;\n}\n.activity-time[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  min-width: 56px;\n  font-variant-numeric: tabular-nums;\n}\n.activity-text[_ngcontent-%COMP%] {\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n@media (max-width: 768px) {\n  .dashboard-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .card-wide[_ngcontent-%COMP%] {\n    grid-column: 1;\n  }\n}\n/*# sourceMappingURL=dashboard.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Dashboard, [{
    type: Component,
    args: [{ selector: "app-dashboard", imports: [DatePipe], template: `
    <div class="dashboard">
      <h1 class="page-title">Dashboard</h1>

      <div class="dashboard-grid">
        <!-- Screen Status Grid -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Screen Status</h2>
            <span class="card-badge">{{ screens().length }} screens</span>
          </div>
          <div class="card-body">
            @if (loadingScreens()) {
              <div class="loading-placeholder">Loading screens...</div>
            } @else if (screens().length === 0) {
              <div class="empty-state">No screens registered yet.</div>
            } @else {
              <div class="screen-grid">
                @for (screen of screens(); track screen.id) {
                  <button
                    class="screen-tile"
                    [class.online]="screen.isOnline"
                    [class.offline]="!screen.isOnline && screen.lastHeartbeat"
                    [class.never]="!screen.isOnline && !screen.lastHeartbeat"
                    (click)="navigateToScreen(screen.id)"
                  >
                    <span class="screen-dot"></span>
                    <span class="screen-name">{{ screen.name }}</span>
                    <span class="screen-location">{{ screen.location || 'No location' }}</span>
                  </button>
                }
              </div>
            }
          </div>
        </section>

        <!-- Storage Usage Bar -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Storage Usage</h2>
          </div>
          <div class="card-body">
            @if (loadingStorage()) {
              <div class="loading-placeholder">Loading storage info...</div>
            } @else if (!storage()) {
              <div class="empty-state">No storage data available.</div>
            } @else {
              <div class="storage-section">
                <div class="storage-label-row">
                  <span class="storage-label">Originals</span>
                  <span class="storage-value">{{ formatBytes(storage()!.originalUsedBytes) }} / {{ formatBytes(storage()!.originalLimitBytes) }}</span>
                </div>
                <div
                  class="storage-bar"
                  [class.warning]="originalPercent() > 80 && originalPercent() <= 95"
                  [class.danger]="originalPercent() > 95"
                >
                  <div class="storage-fill originals" [style.width.%]="originalPercent()"></div>
                </div>
                <span class="storage-percent">{{ originalPercent().toFixed(1) }}%</span>
              </div>

              <div class="storage-section">
                <div class="storage-label-row">
                  <span class="storage-label">Transcoded</span>
                  <span class="storage-value">{{ formatBytes(storage()!.transcodedUsedBytes) }} / {{ formatBytes(storage()!.transcodedLimitBytes) }}</span>
                </div>
                <div
                  class="storage-bar"
                  [class.warning]="transcodedPercent() > 80 && transcodedPercent() <= 95"
                  [class.danger]="transcodedPercent() > 95"
                >
                  <div class="storage-fill transcoded" [style.width.%]="transcodedPercent()"></div>
                </div>
                <span class="storage-percent">{{ transcodedPercent().toFixed(1) }}%</span>
              </div>
            }
          </div>
        </section>

        <!-- Upcoming Schedule Timeline -->
        <section class="card card-wide">
          <div class="card-header">
            <h2 class="card-title">Upcoming Schedule</h2>
            <span class="card-badge">Next 24 hours</span>
          </div>
          <div class="card-body">
            @if (loadingSchedule()) {
              <div class="loading-placeholder">Loading schedule...</div>
            } @else if (timelineRows().length === 0) {
              <div class="empty-state">No upcoming schedules.</div>
            } @else {
              <div class="timeline">
                <div class="timeline-header">
                  <span class="timeline-screen-label"></span>
                  <div class="timeline-hours">
                    @for (hour of timelineHours(); track hour) {
                      <span class="timeline-hour">{{ hour }}</span>
                    }
                  </div>
                </div>
                @for (row of timelineRows(); track row.screenName) {
                  <div class="timeline-row">
                    <span class="timeline-screen-label" [title]="row.screenName">{{ row.screenName }}</span>
                    <div class="timeline-track">
                      @for (entry of row.entries; track entry.startPercent) {
                        <div
                          class="timeline-block"
                          [style.left.%]="entry.startPercent"
                          [style.width.%]="entry.widthPercent"
                          [style.background]="entry.colour"
                          [title]="entry.playlistName + ' (' + entry.startTime + ' - ' + entry.endTime + ')'"
                        ></div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>

        <!-- Recent Activity Feed -->
        <section class="card card-wide">
          <div class="card-header">
            <h2 class="card-title">Recent Activity</h2>
          </div>
          <div class="card-body">
            @if (activityFeed().length === 0) {
              <div class="empty-state">No recent activity.</div>
            } @else {
              <div class="activity-feed">
                @for (entry of activityFeed(); track entry.timestamp) {
                  <div class="activity-item">
                    <span class="activity-dot" [class]="'activity-dot--' + entry.category"></span>
                    <span class="activity-time">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
                    <span class="activity-text">{{ entry.description }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;7c7bd72d9c8670596191a8eb95b8cb36c0e5f7989897db11c651ca9497a41a9b;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/dashboard/dashboard.ts */\n.dashboard {\n  color: var(--color-text-primary);\n}\n.page-title {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.25rem;\n}\n.dashboard-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.25rem;\n}\n.card-wide {\n  grid-column: 1 / -1;\n}\n.card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.card-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.875rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.card-title {\n  font-size: 0.875rem;\n  font-weight: 600;\n  margin: 0;\n  color: var(--color-text-primary);\n}\n.card-badge {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  background: var(--color-bg-tertiary);\n  padding: 0.125rem 0.5rem;\n  border-radius: 999px;\n}\n.card-body {\n  padding: 1rem;\n}\n.loading-placeholder,\n.empty-state {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n  padding: 1rem 0;\n  text-align: center;\n}\n.screen-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.625rem;\n}\n.screen-tile {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  padding: 0.75rem;\n  border-radius: 6px;\n  border: 1px solid var(--color-border);\n  background: var(--color-bg-tertiary);\n  cursor: pointer;\n  text-align: left;\n  color: var(--color-text-primary);\n  transition: border-color 0.15s, transform 0.1s;\n}\n.screen-tile:hover {\n  border-color: var(--color-accent);\n  transform: translateY(-1px);\n}\n.screen-dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  margin-bottom: 0.25rem;\n}\n.screen-tile.online .screen-dot {\n  background: #22c55e;\n}\n.screen-tile.offline .screen-dot {\n  background: #ef4444;\n}\n.screen-tile.never .screen-dot {\n  background: #6b7280;\n}\n.screen-name {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.screen-location {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.storage-section {\n  margin-bottom: 1rem;\n}\n.storage-section:last-child {\n  margin-bottom: 0;\n}\n.storage-label-row {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.375rem;\n}\n.storage-label {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.storage-value {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.storage-bar {\n  height: 8px;\n  background: var(--color-bg-tertiary);\n  border-radius: 4px;\n  overflow: hidden;\n  margin-bottom: 0.25rem;\n}\n.storage-fill {\n  height: 100%;\n  border-radius: 4px;\n  transition: width 0.3s ease;\n}\n.storage-fill.originals {\n  background: var(--color-accent);\n}\n.storage-fill.transcoded {\n  background: #8b5cf6;\n}\n.storage-bar.warning .storage-fill {\n  background: #f59e0b;\n}\n.storage-bar.danger .storage-fill {\n  background: #ef4444;\n}\n.storage-percent {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.timeline {\n  overflow-x: auto;\n}\n.timeline-header {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.25rem;\n}\n.timeline-hours {\n  flex: 1;\n  display: flex;\n  justify-content: space-between;\n  padding: 0 2px;\n}\n.timeline-hour {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n  width: 0;\n  text-align: center;\n}\n.timeline-row {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.375rem;\n}\n.timeline-screen-label {\n  width: 90px;\n  min-width: 90px;\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  padding-right: 0.5rem;\n}\n.timeline-track {\n  flex: 1;\n  height: 20px;\n  background: var(--color-bg-tertiary);\n  border-radius: 3px;\n  position: relative;\n  overflow: hidden;\n}\n.timeline-block {\n  position: absolute;\n  top: 2px;\n  bottom: 2px;\n  border-radius: 2px;\n  min-width: 2px;\n  opacity: 0.85;\n}\n.activity-feed {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 320px;\n  overflow-y: auto;\n}\n.activity-item {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.8125rem;\n}\n.activity-dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n.activity-dot--screen {\n  background: #22c55e;\n}\n.activity-dot--schedule {\n  background: #3b82f6;\n}\n.activity-dot--transcoding {\n  background: #8b5cf6;\n}\n.activity-dot--info {\n  background: #6b7280;\n}\n.activity-time {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  min-width: 56px;\n  font-variant-numeric: tabular-nums;\n}\n.activity-text {\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n@media (max-width: 768px) {\n  .dashboard-grid {\n    grid-template-columns: 1fr;\n  }\n  .card-wide {\n    grid-column: 1;\n  }\n}\n/*# sourceMappingURL=dashboard.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Dashboard, { className: "Dashboard", filePath: "src/app/dashboard/dashboard.ts", lineNumber: 444 });
})();
export {
  Dashboard
};
//# sourceMappingURL=chunk-NUSPKNFT.js.map
