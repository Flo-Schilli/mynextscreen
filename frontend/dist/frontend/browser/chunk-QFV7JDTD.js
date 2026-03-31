import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  MemberService
} from "./chunk-6QLUTZ4R.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  DatePipe,
  HttpClient,
  HttpHeaders,
  HttpParams,
  Injectable,
  Router,
  TitleCasePipe,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/audit-log/audit-log.service.ts
var AuditLogService = class _AuditLogService {
  http = inject(HttpClient);
  getAuditLog(orgId, filters = {}) {
    let params = new HttpParams();
    if (filters.action)
      params = params.set("action", filters.action);
    if (filters.userId)
      params = params.set("userId", filters.userId);
    if (filters.resourceType)
      params = params.set("resourceType", filters.resourceType);
    if (filters.from)
      params = params.set("from", filters.from);
    if (filters.to)
      params = params.set("to", filters.to);
    if (filters.limit != null)
      params = params.set("limit", String(filters.limit));
    if (filters.offset != null)
      params = params.set("offset", String(filters.offset));
    return this.http.get("/api/audit-log", {
      headers: new HttpHeaders({ "X-Organisation-Id": orgId }),
      params
    });
  }
  static \u0275fac = function AuditLogService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuditLogService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AuditLogService, factory: _AuditLogService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuditLogService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/audit-log/audit-log.model.ts
var AUDIT_ACTION_LABELS = {
  "content.upload": "Content uploaded",
  "content.delete": "Content deleted",
  "content.reupload": "Content re-uploaded",
  "playlist.create": "Playlist created",
  "playlist.update": "Playlist updated",
  "playlist.delete": "Playlist deleted",
  "schedule.create": "Schedule created",
  "schedule.update": "Schedule updated",
  "schedule.delete": "Schedule deleted",
  "screen.register": "Screen registered",
  "screen.update": "Screen updated",
  "screen.key_regenerated": "Screen key regenerated",
  "screen.online": "Screen came online",
  "screen.offline": "Screen went offline",
  "user.invited": "User invited",
  "user.role_changed": "User role changed",
  "user.removed": "User removed",
  "organisation.created": "Organisation created",
  "organisation.updated": "Organisation updated",
  "group.created": "Screen group created",
  "group.updated": "Screen group updated",
  "group.deleted": "Screen group deleted",
  "group.screen_added": "Screen added to group",
  "group.screen_removed": "Screen removed from group",
  "group.mode_changed": "Group mode changed",
  "live_stream.created": "Live stream created",
  "live_stream.updated": "Live stream updated",
  "live_stream.deleted": "Live stream deleted",
  "live_stream.activated": "Live stream activated",
  "live_stream.deactivated": "Live stream deactivated",
  "live_stream.failed": "Live stream failed",
  "screen.bulk_deleted": "Screen deleted (bulk)",
  "screen.bulk_group_assigned": "Screen group assigned (bulk)",
  "content.bulk_deleted": "Content deleted (bulk)",
  "content.bulk_tagged": "Content tagged (bulk)",
  "content.bulk_untagged": "Content untagged (bulk)",
  "content.bulk_added_to_playlist": "Content added to playlist (bulk)",
  "playlist.bulk_deleted": "Playlist deleted (bulk)",
  "playlist.bulk_screen_assigned": "Playlist assigned to screen (bulk)"
};
var AUDIT_ACTIONS = [
  "content.upload",
  "content.delete",
  "content.reupload",
  "playlist.create",
  "playlist.update",
  "playlist.delete",
  "schedule.create",
  "schedule.update",
  "schedule.delete",
  "screen.register",
  "screen.update",
  "screen.key_regenerated",
  "screen.online",
  "screen.offline",
  "user.invited",
  "user.role_changed",
  "user.removed",
  "organisation.created",
  "organisation.updated",
  "group.created",
  "group.updated",
  "group.deleted",
  "group.screen_added",
  "group.screen_removed",
  "group.mode_changed",
  "live_stream.created",
  "live_stream.updated",
  "live_stream.deleted",
  "live_stream.activated",
  "live_stream.deactivated",
  "live_stream.failed",
  "screen.bulk_deleted",
  "screen.bulk_group_assigned",
  "content.bulk_deleted",
  "content.bulk_tagged",
  "content.bulk_untagged",
  "content.bulk_added_to_playlist",
  "playlist.bulk_deleted",
  "playlist.bulk_screen_assigned"
];
var RESOURCE_TYPES = [
  "content",
  "playlist",
  "schedule",
  "screen",
  "user",
  "organisation",
  "screen-group",
  "live-stream"
];

// src/app/audit-log/audit-log.ts
var _forTrack0 = ($index, $item) => $item.userId;
var _forTrack1 = ($index, $item) => $item.id;
function AuditLog_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 2);
    \u0275\u0275text(1, "Access denied. Org Admin privileges required.");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const action_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", action_r3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.actionLabel(action_r3));
  }
}
function AuditLog_Conditional_5_For_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const member_r4 = ctx.$implicit;
    \u0275\u0275property("value", member_r4.userId);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(member_r4.user.name || member_r4.user.email);
  }
}
function AuditLog_Conditional_5_For_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 8);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "titlecase");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const type_r5 = ctx.$implicit;
    \u0275\u0275property("value", type_r5);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 2, type_r5));
  }
}
function AuditLog_Conditional_5_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 20);
    \u0275\u0275listener("click", function AuditLog_Conditional_5_Conditional_33_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.clearFilters());
    });
    \u0275\u0275text(1, "Clear filters");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 2);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError);
  }
}
function AuditLog_Conditional_5_Conditional_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 18);
    \u0275\u0275text(1, "Loading audit log...");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 19);
    \u0275\u0275text(1, "No audit log entries found.");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "a", 30);
    \u0275\u0275listener("click", function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_12_Template_a_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const entry_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.navigateToResource(entry_r8.resourceType, entry_r8.resourceId));
    })("keydown.enter", function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_12_Template_a_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r7);
      const entry_r8 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.navigateToResource(entry_r8.resourceType, entry_r8.resourceId));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getResourceDisplay(entry_r8), " ");
  }
}
function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 27);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r8 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("title", ctx_r1.formatDetailsTooltip(entry_r8.details));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.formatDetails(entry_r8.details), " ");
  }
}
function AuditLog_Conditional_5_Conditional_37_For_18_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 27);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function AuditLog_Conditional_5_Conditional_37_For_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 23);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "td");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "td")(7, "span", 24);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "td", 25);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td");
    \u0275\u0275conditionalCreate(12, AuditLog_Conditional_5_Conditional_37_For_18_Conditional_12_Template, 2, 1, "a", 26)(13, AuditLog_Conditional_5_Conditional_37_For_18_Conditional_13_Template, 2, 0, "span", 27);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td", 28);
    \u0275\u0275conditionalCreate(15, AuditLog_Conditional_5_Conditional_37_For_18_Conditional_15_Template, 2, 2, "span", 29)(16, AuditLog_Conditional_5_Conditional_37_For_18_Conditional_16_Template, 2, 0, "span", 27);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const entry_r8 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(3, 7, entry_r8.timestamp, "medium"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getUserDisplay(entry_r8.userId));
    \u0275\u0275advance(2);
    \u0275\u0275attribute("data-category", ctx_r1.actionCategory(entry_r8.action));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.actionLabel(entry_r8.action), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(entry_r8.resourceType);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(entry_r8.resourceId ? 12 : 13);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(entry_r8.details && ctx_r1.hasDetails(entry_r8.details) ? 15 : 16);
  }
}
function AuditLog_Conditional_5_Conditional_37_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 22)(1, "button", 31);
    \u0275\u0275listener("click", function AuditLog_Conditional_5_Conditional_37_Conditional_19_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.loadMore());
    });
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 32);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.loading);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.loading ? "Loading..." : "Load more", " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Showing ", ctx_r1.entries.length, " of ", ctx_r1.total, " entries");
  }
}
function AuditLog_Conditional_5_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 21)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Timestamp");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "User");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Action");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Resource Type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Resource");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Details");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "tbody");
    \u0275\u0275repeaterCreate(17, AuditLog_Conditional_5_Conditional_37_For_18_Template, 17, 10, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(19, AuditLog_Conditional_5_Conditional_37_Conditional_19_Template, 5, 4, "div", 22);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(17);
    \u0275\u0275repeater(ctx_r1.entries);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.hasMore ? 19 : -1);
  }
}
function AuditLog_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 3)(1, "div", 4)(2, "label", 5);
    \u0275\u0275text(3, "Action");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "select", 6);
    \u0275\u0275twoWayListener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterAction, $event) || (ctx_r1.filterAction = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_4_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyFilters());
    });
    \u0275\u0275elementStart(5, "option", 7);
    \u0275\u0275text(6, "All actions");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(7, AuditLog_Conditional_5_For_8_Template, 2, 2, "option", 8, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 4)(10, "label", 9);
    \u0275\u0275text(11, "User");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 10);
    \u0275\u0275twoWayListener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterUserId, $event) || (ctx_r1.filterUserId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_12_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyFilters());
    });
    \u0275\u0275elementStart(13, "option", 7);
    \u0275\u0275text(14, "All users");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(15, AuditLog_Conditional_5_For_16_Template, 2, 2, "option", 8, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 4)(18, "label", 11);
    \u0275\u0275text(19, "Resource Type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "select", 12);
    \u0275\u0275twoWayListener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_20_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterResourceType, $event) || (ctx_r1.filterResourceType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AuditLog_Conditional_5_Template_select_ngModelChange_20_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyFilters());
    });
    \u0275\u0275elementStart(21, "option", 7);
    \u0275\u0275text(22, "All types");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(23, AuditLog_Conditional_5_For_24_Template, 3, 4, "option", 8, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 4)(26, "label", 13);
    \u0275\u0275text(27, "From");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function AuditLog_Conditional_5_Template_input_ngModelChange_28_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterFrom, $event) || (ctx_r1.filterFrom = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AuditLog_Conditional_5_Template_input_ngModelChange_28_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyFilters());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 4)(30, "label", 15);
    \u0275\u0275text(31, "To");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function AuditLog_Conditional_5_Template_input_ngModelChange_32_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterTo, $event) || (ctx_r1.filterTo = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function AuditLog_Conditional_5_Template_input_ngModelChange_32_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.applyFilters());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(33, AuditLog_Conditional_5_Conditional_33_Template, 2, 0, "button", 17);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(34, AuditLog_Conditional_5_Conditional_34_Template, 2, 1, "p", 2);
    \u0275\u0275conditionalCreate(35, AuditLog_Conditional_5_Conditional_35_Template, 2, 0, "p", 18);
    \u0275\u0275conditionalCreate(36, AuditLog_Conditional_5_Conditional_36_Template, 2, 0, "p", 19);
    \u0275\u0275conditionalCreate(37, AuditLog_Conditional_5_Conditional_37_Template, 20, 1);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterAction);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.auditActions);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterUserId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.members);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterResourceType);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.resourceTypes);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterFrom);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterTo);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.hasActiveFilters() ? 33 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.loadError ? 34 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.loading && ctx_r1.entries.length === 0 ? 35 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.loading && ctx_r1.entries.length === 0 && !ctx_r1.loadError ? 36 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.entries.length > 0 ? 37 : -1);
  }
}
var AuditLog = class _AuditLog {
  auditLogService = inject(AuditLogService);
  memberService = inject(MemberService);
  orgState = inject(OrganisationStateService);
  router = inject(Router);
  auditActions = AUDIT_ACTIONS;
  resourceTypes = RESOURCE_TYPES;
  entries = [];
  total = 0;
  loading = true;
  loadError = "";
  isOrgAdmin = false;
  members = [];
  userMap = /* @__PURE__ */ new Map();
  // Filter state
  filterAction = "";
  filterUserId = "";
  filterResourceType = "";
  filterFrom = "";
  filterTo = "";
  pageSize = 50;
  get hasMore() {
    return this.entries.length < this.total;
  }
  ngOnInit() {
    const org = this.orgState.selectedOrg();
    if (!org) {
      this.loadError = "No organisation selected.";
      this.loading = false;
      return;
    }
    if (org.role !== "org_admin") {
      this.isOrgAdmin = false;
      this.loading = false;
      return;
    }
    this.isOrgAdmin = true;
    this.loadMembers(org.id);
    this.loadEntries();
  }
  loadMembers(orgId) {
    this.memberService.listMembers(orgId).subscribe({
      next: (members) => {
        this.members = members;
        for (const m of members) {
          this.userMap.set(m.userId, m.user.name || m.user.email);
        }
      }
    });
  }
  buildFilters(offset = 0) {
    const filters = {
      limit: this.pageSize,
      offset
    };
    if (this.filterAction)
      filters.action = this.filterAction;
    if (this.filterUserId)
      filters.userId = this.filterUserId;
    if (this.filterResourceType)
      filters.resourceType = this.filterResourceType;
    if (this.filterFrom)
      filters.from = new Date(this.filterFrom).toISOString();
    if (this.filterTo) {
      const to = new Date(this.filterTo);
      to.setHours(23, 59, 59, 999);
      filters.to = to.toISOString();
    }
    return filters;
  }
  loadEntries() {
    const org = this.orgState.selectedOrg();
    if (!org)
      return;
    this.loading = true;
    this.loadError = "";
    this.auditLogService.getAuditLog(org.id, this.buildFilters(0)).subscribe({
      next: (response) => {
        this.entries = response.data;
        this.total = response.total;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied. Org Admin privileges required." : "Failed to load audit log.";
        this.loading = false;
      }
    });
  }
  loadMore() {
    const org = this.orgState.selectedOrg();
    if (!org)
      return;
    this.loading = true;
    this.auditLogService.getAuditLog(org.id, this.buildFilters(this.entries.length)).subscribe({
      next: (response) => {
        this.entries = [...this.entries, ...response.data];
        this.total = response.total;
        this.loading = false;
      },
      error: () => {
        this.loadError = "Failed to load more entries.";
        this.loading = false;
      }
    });
  }
  applyFilters() {
    this.entries = [];
    this.total = 0;
    this.loadEntries();
  }
  clearFilters() {
    this.filterAction = "";
    this.filterUserId = "";
    this.filterResourceType = "";
    this.filterFrom = "";
    this.filterTo = "";
    this.applyFilters();
  }
  hasActiveFilters() {
    return !!(this.filterAction || this.filterUserId || this.filterResourceType || this.filterFrom || this.filterTo);
  }
  actionLabel(action) {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }
  actionCategory(action) {
    return action.split(".")[0];
  }
  getUserDisplay(userId) {
    if (!userId)
      return "System";
    return this.userMap.get(userId) ?? userId.substring(0, 8) + "...";
  }
  getResourceDisplay(entry) {
    if (!entry.resourceId)
      return "\u2014";
    const details = entry.details;
    if (details) {
      const name = details["name"] ?? details["title"] ?? details["filename"] ?? details["email"];
      if (name)
        return name;
    }
    return entry.resourceId.substring(0, 8) + "...";
  }
  hasDetails(details) {
    return Object.keys(details).length > 0;
  }
  formatDetails(details) {
    const parts = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === "name" || key === "title" || key === "filename" || key === "email")
        continue;
      parts.push(`${key}: ${value}`);
    }
    return parts.join(", ") || "\u2014";
  }
  formatDetailsTooltip(details) {
    return JSON.stringify(details, null, 2);
  }
  navigateToResource(resourceType, resourceId) {
    if (!resourceId)
      return;
    const routeMap = {
      content: "/content",
      playlist: "/playlists",
      schedule: "/schedules",
      screen: "/screens",
      user: "/settings/users",
      organisation: "/admin/organisations"
    };
    const route = routeMap[resourceType];
    if (route) {
      this.router.navigate([route]);
    }
  }
  static \u0275fac = function AuditLog_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuditLog)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AuditLog, selectors: [["app-audit-log"]], decls: 6, vars: 1, consts: [[1, "page"], [1, "page-header"], [1, "error"], [1, "filter-bar"], [1, "filter-group"], ["for", "filterAction"], ["id", "filterAction", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], ["for", "filterUser"], ["id", "filterUser", 3, "ngModelChange", "ngModel"], ["for", "filterResource"], ["id", "filterResource", 3, "ngModelChange", "ngModel"], ["for", "filterFrom"], ["id", "filterFrom", "type", "date", 3, "ngModelChange", "ngModel"], ["for", "filterTo"], ["id", "filterTo", "type", "date", 3, "ngModelChange", "ngModel"], [1, "btn", "btn-secondary", "btn-small", "clear-btn"], [1, "loading-text"], [1, "empty-text"], [1, "btn", "btn-secondary", "btn-small", "clear-btn", 3, "click"], [1, "table-container"], [1, "load-more-container"], [1, "timestamp-cell"], [1, "action-badge"], [1, "resource-type-cell"], ["tabindex", "0", 1, "resource-link"], [1, "text-muted"], [1, "details-cell"], [1, "details-text", 3, "title"], ["tabindex", "0", 1, "resource-link", 3, "click", "keydown.enter"], [1, "btn", "btn-secondary", 3, "click", "disabled"], [1, "count-text"]], template: function AuditLog_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
      \u0275\u0275text(3, "Audit Log");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(4, AuditLog_Conditional_4_Template, 2, 0, "p", 2)(5, AuditLog_Conditional_5_Template, 38, 10);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275conditional(!ctx.isOrgAdmin ? 4 : 5);
    }
  }, dependencies: [FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, DatePipe, TitleCasePipe], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.filter-bar[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n  align-items: flex-end;\n  margin-bottom: 1.5rem;\n  padding: 1rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n}\n.filter-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.filter-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n.filter-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  min-width: 10rem;\n}\n.filter-group[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%] {\n  min-width: 9rem;\n}\n.filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus, \n.filter-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.clear-btn[_ngcontent-%COMP%] {\n  align-self: flex-end;\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.table-container[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n}\nth[_ngcontent-%COMP%] {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n}\ntd[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n  vertical-align: top;\n}\ntr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n}\n.timestamp-cell[_ngcontent-%COMP%] {\n  white-space: nowrap;\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n}\n.resource-type-cell[_ngcontent-%COMP%] {\n  text-transform: capitalize;\n}\n.action-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n}\n.action-badge[data-category=content][_ngcontent-%COMP%] {\n  background: rgba(59, 130, 246, 0.15);\n  color: #93c5fd;\n}\n.action-badge[data-category=playlist][_ngcontent-%COMP%] {\n  background: rgba(168, 85, 247, 0.15);\n  color: #d8b4fe;\n}\n.action-badge[data-category=schedule][_ngcontent-%COMP%] {\n  background: rgba(34, 197, 94, 0.15);\n  color: #86efac;\n}\n.action-badge[data-category=screen][_ngcontent-%COMP%] {\n  background: rgba(234, 179, 8, 0.15);\n  color: #fde047;\n}\n.action-badge[data-category=user][_ngcontent-%COMP%] {\n  background: rgba(244, 63, 94, 0.15);\n  color: #fda4af;\n}\n.action-badge[data-category=organisation][_ngcontent-%COMP%] {\n  background: rgba(20, 184, 166, 0.15);\n  color: #5eead4;\n}\n.resource-link[_ngcontent-%COMP%] {\n  color: var(--color-accent);\n  cursor: pointer;\n  text-decoration: none;\n  font-size: 0.8125rem;\n  font-family: monospace;\n}\n.resource-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.details-cell[_ngcontent-%COMP%] {\n  max-width: 20rem;\n}\n.details-text[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  display: block;\n  max-width: 20rem;\n  cursor: help;\n}\n.text-muted[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n}\n.load-more-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-top: 1rem;\n  justify-content: center;\n}\n.count-text[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%], \n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n@media (max-width: 768px) {\n  .filter-bar[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n  .filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n   .filter-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n    min-width: 100%;\n  }\n}\n/*# sourceMappingURL=audit-log.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuditLog, [{
    type: Component,
    args: [{ selector: "app-audit-log", standalone: true, imports: [DatePipe, TitleCasePipe, FormsModule], template: `
    <div class="page">
      <header class="page-header">
        <h1>Audit Log</h1>
      </header>

      @if (!isOrgAdmin) {
        <p class="error">Access denied. Org Admin privileges required.</p>
      } @else {
        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <label for="filterAction">Action</label>
            <select id="filterAction" [(ngModel)]="filterAction" (ngModelChange)="applyFilters()">
              <option value="">All actions</option>
              @for (action of auditActions; track action) {
                <option [value]="action">{{ actionLabel(action) }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterUser">User</label>
            <select id="filterUser" [(ngModel)]="filterUserId" (ngModelChange)="applyFilters()">
              <option value="">All users</option>
              @for (member of members; track member.userId) {
                <option [value]="member.userId">{{ member.user.name || member.user.email }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterResource">Resource Type</label>
            <select id="filterResource" [(ngModel)]="filterResourceType" (ngModelChange)="applyFilters()">
              <option value="">All types</option>
              @for (type of resourceTypes; track type) {
                <option [value]="type">{{ type | titlecase }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterFrom">From</label>
            <input id="filterFrom" type="date" [(ngModel)]="filterFrom" (ngModelChange)="applyFilters()" />
          </div>

          <div class="filter-group">
            <label for="filterTo">To</label>
            <input id="filterTo" type="date" [(ngModel)]="filterTo" (ngModelChange)="applyFilters()" />
          </div>

          @if (hasActiveFilters()) {
            <button class="btn btn-secondary btn-small clear-btn" (click)="clearFilters()">Clear filters</button>
          }
        </div>

        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (loading && entries.length === 0) {
          <p class="loading-text">Loading audit log...</p>
        }

        @if (!loading && entries.length === 0 && !loadError) {
          <p class="empty-text">No audit log entries found.</p>
        }

        @if (entries.length > 0) {
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource Type</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries; track entry.id) {
                  <tr>
                    <td class="timestamp-cell">{{ entry.timestamp | date:'medium' }}</td>
                    <td>{{ getUserDisplay(entry.userId) }}</td>
                    <td>
                      <span class="action-badge" [attr.data-category]="actionCategory(entry.action)">
                        {{ actionLabel(entry.action) }}
                      </span>
                    </td>
                    <td class="resource-type-cell">{{ entry.resourceType }}</td>
                    <td>
                      @if (entry.resourceId) {
                        <a class="resource-link" (click)="navigateToResource(entry.resourceType, entry.resourceId)" (keydown.enter)="navigateToResource(entry.resourceType, entry.resourceId)" tabindex="0">
                          {{ getResourceDisplay(entry) }}
                        </a>
                      } @else {
                        <span class="text-muted">\u2014</span>
                      }
                    </td>
                    <td class="details-cell">
                      @if (entry.details && hasDetails(entry.details)) {
                        <span class="details-text" [title]="formatDetailsTooltip(entry.details)">
                          {{ formatDetails(entry.details) }}
                        </span>
                      } @else {
                        <span class="text-muted">\u2014</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (hasMore) {
            <div class="load-more-container">
              <button class="btn btn-secondary" (click)="loadMore()" [disabled]="loading">
                {{ loading ? 'Loading...' : 'Load more' }}
              </button>
              <span class="count-text">Showing {{ entries.length }} of {{ total }} entries</span>
            </div>
          }
        }
      }
    </div>
  `, styles: ["/* angular:styles/component:css;8cacad05fbfed446bd09145ac24cfbeab3ad3239d9df573e8525897d1b7cfa5c;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/audit-log/audit-log.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.page-header h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.filter-bar {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n  align-items: flex-end;\n  margin-bottom: 1.5rem;\n  padding: 1rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n}\n.filter-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.filter-group label {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.filter-group select,\n.filter-group input {\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  min-width: 10rem;\n}\n.filter-group input[type=date] {\n  min-width: 9rem;\n}\n.filter-group select:focus,\n.filter-group input:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.clear-btn {\n  align-self: flex-end;\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-small {\n  padding: 0.375rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.table-container {\n  overflow-x: auto;\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead {\n  background: var(--color-bg-tertiary);\n}\nth {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n}\ntd {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n  vertical-align: top;\n}\ntr:hover td {\n  background: var(--color-bg-tertiary);\n}\n.timestamp-cell {\n  white-space: nowrap;\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n}\n.resource-type-cell {\n  text-transform: capitalize;\n}\n.action-badge {\n  display: inline-block;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n}\n.action-badge[data-category=content] {\n  background: rgba(59, 130, 246, 0.15);\n  color: #93c5fd;\n}\n.action-badge[data-category=playlist] {\n  background: rgba(168, 85, 247, 0.15);\n  color: #d8b4fe;\n}\n.action-badge[data-category=schedule] {\n  background: rgba(34, 197, 94, 0.15);\n  color: #86efac;\n}\n.action-badge[data-category=screen] {\n  background: rgba(234, 179, 8, 0.15);\n  color: #fde047;\n}\n.action-badge[data-category=user] {\n  background: rgba(244, 63, 94, 0.15);\n  color: #fda4af;\n}\n.action-badge[data-category=organisation] {\n  background: rgba(20, 184, 166, 0.15);\n  color: #5eead4;\n}\n.resource-link {\n  color: var(--color-accent);\n  cursor: pointer;\n  text-decoration: none;\n  font-size: 0.8125rem;\n  font-family: monospace;\n}\n.resource-link:hover {\n  text-decoration: underline;\n}\n.details-cell {\n  max-width: 20rem;\n}\n.details-text {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  display: block;\n  max-width: 20rem;\n  cursor: help;\n}\n.text-muted {\n  color: var(--color-text-muted);\n}\n.load-more-container {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-top: 1rem;\n  justify-content: center;\n}\n.count-text {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text,\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n@media (max-width: 768px) {\n  .filter-bar {\n    flex-direction: column;\n  }\n  .filter-group select,\n  .filter-group input {\n    min-width: 100%;\n  }\n}\n/*# sourceMappingURL=audit-log.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AuditLog, { className: "AuditLog", filePath: "src/app/audit-log/audit-log.ts", lineNumber: 383 });
})();
export {
  AuditLog
};
//# sourceMappingURL=chunk-QFV7JDTD.js.map
