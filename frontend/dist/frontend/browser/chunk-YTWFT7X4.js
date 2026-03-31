import {
  ScreenService
} from "./chunk-DASS7FWB.js";
import {
  ScreenGroupService
} from "./chunk-7TQIZX6R.js";
import {
  MemberService
} from "./chunk-6QLUTZ4R.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  RadioControlValueAccessor,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  HttpClient,
  HttpHeaders,
  Injectable,
  Router,
  UpperCasePipe,
  forkJoin,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
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

// src/app/live-streams/live-stream.service.ts
var LiveStreamService = class _LiveStreamService {
  http = inject(HttpClient);
  getAll(orgId) {
    return this.http.get("/api/live-streams", {
      headers: this.orgHeader(orgId)
    });
  }
  getOne(orgId, id) {
    return this.http.get(`/api/live-streams/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  create(orgId, dto) {
    return this.http.post("/api/live-streams", dto, {
      headers: this.orgHeader(orgId)
    });
  }
  update(orgId, id, dto) {
    return this.http.patch(`/api/live-streams/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  delete(orgId, id) {
    return this.http.delete(`/api/live-streams/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  activate(orgId, id, dto) {
    return this.http.post(`/api/live-streams/${id}/activate`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  deactivate(orgId, id) {
    return this.http.post(`/api/live-streams/${id}/deactivate`, {}, {
      headers: this.orgHeader(orgId)
    });
  }
  getHealth(orgId, id) {
    return this.http.get(`/api/live-streams/${id}/health`, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function LiveStreamService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LiveStreamService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LiveStreamService, factory: _LiveStreamService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LiveStreamService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/live-streams/live-stream.model.ts
var TRANSCODING_PRESET_LABELS = {
  low_480p: "Low (480p)",
  medium_720p: "Medium (720p)",
  high_1080p: "High (1080p)",
  full_hd_plus_1440p: "Full HD+ (1440p)",
  passthrough: "Passthrough (no re-encode)"
};
var TRANSCODING_PRESETS = [
  "low_480p",
  "medium_720p",
  "high_1080p",
  "full_hd_plus_1440p",
  "passthrough"
];

// src/app/live-streams/live-streams.ts
var _forTrack0 = ($index, $item) => $item.id;
function LiveStreams_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 14);
    \u0275\u0275listener("click", function LiveStreams_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(1, " + New Stream ");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError);
  }
}
function LiveStreams_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading live streams...");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_10_For_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const preset_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", preset_r4);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.presetLabel(preset_r4));
  }
}
function LiveStreams_Conditional_10_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.createError);
  }
}
function LiveStreams_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275listener("click", function LiveStreams_Conditional_10_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    })("keydown.escape", function LiveStreams_Conditional_10_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275elementStart(1, "div", 16);
    \u0275\u0275listener("click", function LiveStreams_Conditional_10_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function LiveStreams_Conditional_10_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Create Live Stream");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 17);
    \u0275\u0275listener("ngSubmit", function LiveStreams_Conditional_10_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitCreate());
    });
    \u0275\u0275elementStart(5, "div", 18)(6, "label", 19);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_10_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createName, $event) || (ctx_r1.createName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 18)(10, "label", 21);
    \u0275\u0275text(11, "Source URL");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_10_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createSourceUrl, $event) || (ctx_r1.createSourceUrl = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 18)(14, "label", 23);
    \u0275\u0275text(15, "Protocol");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 24);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_10_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createProtocol, $event) || (ctx_r1.createProtocol = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(17, "option", 25);
    \u0275\u0275text(18, "RTMP");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 26);
    \u0275\u0275text(20, "RTP");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(21, "div", 18)(22, "label", 27);
    \u0275\u0275text(23, "Quality Preset");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "select", 28);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_10_Template_select_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createPreset, $event) || (ctx_r1.createPreset = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(25, LiveStreams_Conditional_10_For_26_Template, 2, 2, "option", 29, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(27, "div", 18)(28, "label", 30)(29, "input", 31);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_10_Template_input_ngModelChange_29_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createAudioEnabled, $event) || (ctx_r1.createAudioEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(30, " Enable audio ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(31, LiveStreams_Conditional_10_Conditional_31_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(32, "div", 32)(33, "button", 33);
    \u0275\u0275listener("click", function LiveStreams_Conditional_10_Template_button_click_33_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275text(34, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 34);
    \u0275\u0275text(36);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createSourceUrl);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createProtocol);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createPreset);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.transcodingPresets);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createAudioEnabled);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.createError ? 31 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.creating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.creating ? "Creating..." : "Create Stream", " ");
  }
}
function LiveStreams_Conditional_11_For_20_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 43);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const stream_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275classProp("health-healthy", stream_r5.health.health === "healthy")("health-degraded", stream_r5.health.health === "degraded")("health-stopped", stream_r5.health.health === "stopped");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", stream_r5.health.health, " ");
  }
}
function LiveStreams_Conditional_11_For_20_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 40);
    \u0275\u0275text(1, "-");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_11_For_20_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 44);
    \u0275\u0275listener("click", function LiveStreams_Conditional_11_For_20_Conditional_18_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const stream_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openActivateModal(stream_r5));
    });
    \u0275\u0275text(1, "Activate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 45);
    \u0275\u0275listener("click", function LiveStreams_Conditional_11_For_20_Conditional_18_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r6);
      const stream_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.editStream(stream_r5));
    });
    \u0275\u0275text(3, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 46);
    \u0275\u0275listener("click", function LiveStreams_Conditional_11_For_20_Conditional_18_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r6);
      const stream_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.confirmDelete(stream_r5));
    });
    \u0275\u0275text(5, "Delete");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_11_For_20_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 47);
    \u0275\u0275listener("click", function LiveStreams_Conditional_11_For_20_Conditional_19_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const stream_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.deactivateStream(stream_r5));
    });
    \u0275\u0275text(1, "Deactivate");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_11_For_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 35);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 36);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td")(6, "span", 37);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "uppercase");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "td");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td")(12, "span", 38);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "td");
    \u0275\u0275conditionalCreate(15, LiveStreams_Conditional_11_For_20_Conditional_15_Template, 2, 7, "span", 39)(16, LiveStreams_Conditional_11_For_20_Conditional_16_Template, 2, 0, "span", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 41);
    \u0275\u0275conditionalCreate(18, LiveStreams_Conditional_11_For_20_Conditional_18_Template, 6, 0)(19, LiveStreams_Conditional_11_For_20_Conditional_19_Template, 2, 0, "button", 42);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const stream_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stream_r5.name);
    \u0275\u0275advance();
    \u0275\u0275property("title", stream_r5.sourceUrl);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(stream_r5.sourceUrl);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 14, stream_r5.protocol));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.presetLabel(stream_r5.transcodingPreset));
    \u0275\u0275advance(2);
    \u0275\u0275classProp("status-idle", stream_r5.status === "idle")("status-active", stream_r5.status === "active")("status-error", stream_r5.status === "error");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", stream_r5.status, " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(stream_r5.status === "active" && stream_r5.health ? 15 : 16);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(stream_r5.status === "idle" || stream_r5.status === "error" ? 18 : 19);
  }
}
function LiveStreams_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Source URL");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Protocol");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Quality");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Health");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "tbody");
    \u0275\u0275repeaterCreate(19, LiveStreams_Conditional_11_For_20_Template, 20, 16, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(19);
    \u0275\u0275repeater(ctx_r1.streams);
  }
}
function LiveStreams_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 48);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(2, "svg", 49);
    \u0275\u0275element(3, "circle", 50)(4, "path", 51);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(5, "p", 52);
    \u0275\u0275text(6, "No live streams yet");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p", 53);
    \u0275\u0275text(8, "Create your first live stream to start broadcasting to screens.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 14);
    \u0275\u0275listener("click", function LiveStreams_Conditional_12_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(10, "Create Your First Stream");
    \u0275\u0275elementEnd()();
  }
}
function LiveStreams_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.actionError);
  }
}
function LiveStreams_Conditional_14_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "li");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const warning_r10 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(warning_r10);
  }
}
function LiveStreams_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "div", 54)(2, "strong");
    \u0275\u0275text(3, "Passthrough Compatibility Warnings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 55);
    \u0275\u0275listener("click", function LiveStreams_Conditional_14_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dismissWarnings());
    });
    \u0275\u0275text(5, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "ul", 56);
    \u0275\u0275repeaterCreate(7, LiveStreams_Conditional_14_For_8_Template, 2, 1, "li", null, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275repeater(ctx_r1.passthroughWarnings);
  }
}
function LiveStreams_Conditional_15_For_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const preset_r12 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("value", preset_r12);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.presetLabel(preset_r12));
  }
}
function LiveStreams_Conditional_15_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.editError);
  }
}
function LiveStreams_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 57);
    \u0275\u0275listener("click", function LiveStreams_Conditional_15_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    })("keydown.escape", function LiveStreams_Conditional_15_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    });
    \u0275\u0275elementStart(1, "div", 16);
    \u0275\u0275listener("click", function LiveStreams_Conditional_15_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function LiveStreams_Conditional_15_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Edit Live Stream");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 17);
    \u0275\u0275listener("ngSubmit", function LiveStreams_Conditional_15_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitEdit());
    });
    \u0275\u0275elementStart(5, "div", 18)(6, "label", 58);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 59);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_15_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editName, $event) || (ctx_r1.editName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 18)(10, "label", 60);
    \u0275\u0275text(11, "Source URL");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 61);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_15_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editSourceUrl, $event) || (ctx_r1.editSourceUrl = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 18)(14, "label", 62);
    \u0275\u0275text(15, "Protocol");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 63);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_15_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editProtocol, $event) || (ctx_r1.editProtocol = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(17, "option", 25);
    \u0275\u0275text(18, "RTMP");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 26);
    \u0275\u0275text(20, "RTP");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(21, "div", 18)(22, "label", 64);
    \u0275\u0275text(23, "Quality Preset");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "select", 65);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_15_Template_select_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editPreset, $event) || (ctx_r1.editPreset = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(25, LiveStreams_Conditional_15_For_26_Template, 2, 2, "option", 29, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(27, "div", 18)(28, "label", 30)(29, "input", 66);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_15_Template_input_ngModelChange_29_listener($event) {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editAudioEnabled, $event) || (ctx_r1.editAudioEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(30, " Enable audio ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(31, LiveStreams_Conditional_15_Conditional_31_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(32, "div", 32)(33, "button", 33);
    \u0275\u0275listener("click", function LiveStreams_Conditional_15_Template_button_click_33_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    });
    \u0275\u0275text(34, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 34);
    \u0275\u0275text(36);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editSourceUrl);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editProtocol);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editPreset);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.transcodingPresets);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editAudioEnabled);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.editError ? 31 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.saving);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.saving ? "Saving..." : "Save Changes", " ");
  }
}
function LiveStreams_Conditional_16_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.deleteError);
  }
}
function LiveStreams_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 67);
    \u0275\u0275listener("click", function LiveStreams_Conditional_16_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    })("keydown.escape", function LiveStreams_Conditional_16_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275elementStart(1, "div", 16);
    \u0275\u0275listener("click", function LiveStreams_Conditional_16_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function LiveStreams_Conditional_16_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Live Stream");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Are you sure you want to delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, "? This action cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(9, LiveStreams_Conditional_16_Conditional_9_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(10, "div", 32)(11, "button", 68);
    \u0275\u0275listener("click", function LiveStreams_Conditional_16_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275text(12, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 69);
    \u0275\u0275listener("click", function LiveStreams_Conditional_16_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeDelete());
    });
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.deletingStream.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.deleteError ? 9 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.deleting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.deleting ? "Deleting..." : "Delete", " ");
  }
}
function LiveStreams_Conditional_17_Conditional_16_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 40);
    \u0275\u0275text(1, "No screens available.");
    \u0275\u0275elementEnd();
  }
}
function LiveStreams_Conditional_17_Conditional_16_Conditional_4_For_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 40);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const screen_r16 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("(", screen_r16.location, ")");
  }
}
function LiveStreams_Conditional_17_Conditional_16_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 30)(1, "input", 78);
    \u0275\u0275listener("change", function LiveStreams_Conditional_17_Conditional_16_Conditional_4_For_2_Template_input_change_1_listener() {
      const screen_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r1.toggleScreen(screen_r16.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(2);
    \u0275\u0275conditionalCreate(3, LiveStreams_Conditional_17_Conditional_16_Conditional_4_For_2_Conditional_3_Template, 2, 1, "span", 40);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const screen_r16 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.activateScreenIds.has(screen_r16.id));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", screen_r16.name, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(screen_r16.location ? 3 : -1);
  }
}
function LiveStreams_Conditional_17_Conditional_16_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 77);
    \u0275\u0275repeaterCreate(1, LiveStreams_Conditional_17_Conditional_16_Conditional_4_For_2_Template, 4, 3, "label", 30, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.screens);
  }
}
function LiveStreams_Conditional_17_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 18)(1, "label");
    \u0275\u0275text(2, "Select screens");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, LiveStreams_Conditional_17_Conditional_16_Conditional_3_Template, 2, 0, "p", 40)(4, LiveStreams_Conditional_17_Conditional_16_Conditional_4_Template, 3, 0, "div", 77);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.screens.length === 0 ? 3 : 4);
  }
}
function LiveStreams_Conditional_17_Conditional_17_For_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const group_r18 = ctx.$implicit;
    \u0275\u0275property("value", group_r18.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", group_r18.name, " (", group_r18.screens.length, " screens)");
  }
}
function LiveStreams_Conditional_17_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "label", 79);
    \u0275\u0275text(2, "Select screen group");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "select", 80);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_17_Conditional_17_Template_select_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.activateGroupId, $event) || (ctx_r1.activateGroupId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(4, "option", 81);
    \u0275\u0275text(5, "-- Select a group --");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(6, LiveStreams_Conditional_17_Conditional_17_For_7_Template, 2, 3, "option", 29, _forTrack0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.activateGroupId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.screenGroups);
  }
}
function LiveStreams_Conditional_17_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.activateError);
  }
}
function LiveStreams_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 70);
    \u0275\u0275listener("click", function LiveStreams_Conditional_17_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelActivate());
    })("keydown.escape", function LiveStreams_Conditional_17_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelActivate());
    });
    \u0275\u0275elementStart(1, "div", 71);
    \u0275\u0275listener("click", function LiveStreams_Conditional_17_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function LiveStreams_Conditional_17_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Choose target screens or a screen group to stream to.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 18)(7, "label");
    \u0275\u0275text(8, "Target type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 72)(10, "label", 73)(11, "input", 74);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_17_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.activateTargetType, $event) || (ctx_r1.activateTargetType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(12, " Individual Screens ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "label", 73)(14, "input", 75);
    \u0275\u0275twoWayListener("ngModelChange", function LiveStreams_Conditional_17_Template_input_ngModelChange_14_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.activateTargetType, $event) || (ctx_r1.activateTargetType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(15, " Screen Group ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(16, LiveStreams_Conditional_17_Conditional_16_Template, 5, 1, "div", 18)(17, LiveStreams_Conditional_17_Conditional_17_Template, 8, 1, "div", 18);
    \u0275\u0275conditionalCreate(18, LiveStreams_Conditional_17_Conditional_18_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(19, "div", 32)(20, "button", 68);
    \u0275\u0275listener("click", function LiveStreams_Conditional_17_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelActivate());
    });
    \u0275\u0275text(21, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 76);
    \u0275\u0275listener("click", function LiveStreams_Conditional_17_Template_button_click_22_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitActivate());
    });
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1('Activate "', ctx_r1.activatingStream.name, '"');
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.activateTargetType);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.activateTargetType);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.activateTargetType === "screens" ? 16 : 17);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.activateError ? 18 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.activating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.activating ? "Activating..." : "Activate", " ");
  }
}
var LiveStreams = class _LiveStreams {
  liveStreamService = inject(LiveStreamService);
  screenService = inject(ScreenService);
  screenGroupService = inject(ScreenGroupService);
  memberService = inject(MemberService);
  router = inject(Router);
  orgId = "";
  streams = [];
  screens = [];
  screenGroups = [];
  loading = true;
  loadError = "";
  actionError = "";
  // Preset options
  transcodingPresets = TRANSCODING_PRESETS;
  // Create form state
  showCreateForm = false;
  createName = "";
  createSourceUrl = "";
  createProtocol = "rtmp";
  createPreset = "high_1080p";
  createAudioEnabled = true;
  createError = "";
  creating = false;
  // Edit state
  editingStream = null;
  editName = "";
  editSourceUrl = "";
  editProtocol = "rtmp";
  editPreset = "high_1080p";
  editAudioEnabled = true;
  editError = "";
  saving = false;
  // Delete state
  deletingStream = null;
  deleteError = "";
  deleting = false;
  // Activate state
  activatingStream = null;
  activateTargetType = "screens";
  activateScreenIds = /* @__PURE__ */ new Set();
  activateGroupId = "";
  activateError = "";
  activating = false;
  // Passthrough warnings
  passthroughWarnings = [];
  ngOnInit() {
    this.loadCurrentOrg();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadData();
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.loadData();
        } else {
          this.loadError = "You are not a member of any organisation.";
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = "Failed to load organisation context.";
        this.loading = false;
      }
    });
  }
  loadData() {
    this.loading = true;
    this.loadError = "";
    this.actionError = "";
    forkJoin({
      streams: this.liveStreamService.getAll(this.orgId),
      screens: this.screenService.getAll(this.orgId),
      groups: this.screenGroupService.getAll(this.orgId)
    }).subscribe({
      next: ({ streams, screens, groups }) => {
        this.streams = streams;
        this.screens = screens;
        this.screenGroups = groups;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied." : "Failed to load live streams.";
        this.loading = false;
      }
    });
  }
  // --- Create ---
  openCreateForm() {
    this.createName = "";
    this.createSourceUrl = "";
    this.createProtocol = "rtmp";
    this.createPreset = "high_1080p";
    this.createAudioEnabled = true;
    this.createError = "";
    this.showCreateForm = true;
  }
  cancelCreate() {
    this.showCreateForm = false;
  }
  submitCreate() {
    if (!this.createName) {
      this.createError = "Name is required.";
      return;
    }
    if (!this.createSourceUrl) {
      this.createError = "Source URL is required.";
      return;
    }
    this.creating = true;
    this.createError = "";
    const dto = {
      name: this.createName,
      sourceUrl: this.createSourceUrl,
      protocol: this.createProtocol,
      transcodingPreset: this.createPreset,
      audioEnabled: this.createAudioEnabled
    };
    this.liveStreamService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadData();
      },
      error: (err) => {
        this.createError = err.error?.message || "Failed to create live stream.";
        this.creating = false;
      }
    });
  }
  // --- Edit ---
  editStream(stream) {
    this.editingStream = stream;
    this.editName = stream.name;
    this.editSourceUrl = stream.sourceUrl;
    this.editProtocol = stream.protocol;
    this.editPreset = stream.transcodingPreset;
    this.editAudioEnabled = stream.audioEnabled;
    this.editError = "";
  }
  cancelEdit() {
    this.editingStream = null;
  }
  submitEdit() {
    if (!this.editingStream)
      return;
    if (!this.editName) {
      this.editError = "Name is required.";
      return;
    }
    if (!this.editSourceUrl) {
      this.editError = "Source URL is required.";
      return;
    }
    this.saving = true;
    this.editError = "";
    const dto = {
      name: this.editName,
      sourceUrl: this.editSourceUrl,
      protocol: this.editProtocol,
      transcodingPreset: this.editPreset,
      audioEnabled: this.editAudioEnabled
    };
    this.liveStreamService.update(this.orgId, this.editingStream.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingStream = null;
        this.loadData();
      },
      error: (err) => {
        this.editError = err.error?.message || "Failed to update live stream.";
        this.saving = false;
      }
    });
  }
  // --- Delete ---
  confirmDelete(stream) {
    this.deletingStream = stream;
    this.deleteError = "";
  }
  cancelDelete() {
    this.deletingStream = null;
    this.deleteError = "";
  }
  executeDelete() {
    if (!this.deletingStream)
      return;
    this.deleting = true;
    this.deleteError = "";
    this.liveStreamService.delete(this.orgId, this.deletingStream.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deletingStream = null;
        this.loadData();
      },
      error: (err) => {
        this.deleteError = err.error?.message || "Failed to delete live stream.";
        this.deleting = false;
      }
    });
  }
  // --- Activate ---
  openActivateModal(stream) {
    this.activatingStream = stream;
    this.activateTargetType = "screens";
    this.activateScreenIds = /* @__PURE__ */ new Set();
    this.activateGroupId = "";
    this.activateError = "";
  }
  cancelActivate() {
    this.activatingStream = null;
  }
  toggleScreen(screenId) {
    if (this.activateScreenIds.has(screenId)) {
      this.activateScreenIds.delete(screenId);
    } else {
      this.activateScreenIds.add(screenId);
    }
  }
  submitActivate() {
    if (!this.activatingStream)
      return;
    const dto = {};
    if (this.activateTargetType === "screens") {
      if (this.activateScreenIds.size === 0) {
        this.activateError = "Select at least one screen.";
        return;
      }
      dto.targetScreenIds = Array.from(this.activateScreenIds);
    } else {
      if (!this.activateGroupId) {
        this.activateError = "Select a screen group.";
        return;
      }
      dto.targetGroupId = this.activateGroupId;
    }
    this.activating = true;
    this.activateError = "";
    this.liveStreamService.activate(this.orgId, this.activatingStream.id, dto).subscribe({
      next: (response) => {
        this.activating = false;
        this.activatingStream = null;
        if (response.warnings && response.warnings.length > 0) {
          this.passthroughWarnings = response.warnings;
        }
        this.loadData();
      },
      error: (err) => {
        this.activateError = err.error?.message || "Failed to activate live stream.";
        this.activating = false;
      }
    });
  }
  // --- Deactivate ---
  deactivateStream(stream) {
    this.actionError = "";
    this.liveStreamService.deactivate(this.orgId, stream.id).subscribe({
      next: () => this.loadData(),
      error: (err) => {
        this.actionError = err.error?.message || "Failed to deactivate live stream.";
      }
    });
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  dismissWarnings() {
    this.passthroughWarnings = [];
  }
  presetLabel(preset) {
    return TRANSCODING_PRESET_LABELS[preset] ?? preset;
  }
  uppercase(value) {
    return value.toUpperCase();
  }
  static \u0275fac = function LiveStreams_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LiveStreams)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LiveStreams, selectors: [["app-live-streams"]], decls: 18, vars: 11, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "error"], [1, "loading-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "Create Live Stream", "tabindex", "0", 1, "modal-overlay"], [1, "table-container"], [1, "empty-state"], [1, "warning-banner"], ["role", "dialog", "aria-modal", "true", "aria-label", "Edit Live Stream", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Activate Live Stream", "tabindex", "0", 1, "modal-overlay"], [1, "btn", "btn-primary", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Create Live Stream", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [3, "ngSubmit"], [1, "form-group"], ["for", "createName"], ["id", "createName", "type", "text", "name", "createName", "required", "", "placeholder", "e.g. Lobby Camera", 3, "ngModelChange", "ngModel"], ["for", "createSourceUrl"], ["id", "createSourceUrl", "type", "text", "name", "createSourceUrl", "required", "", "placeholder", "rtmp://example.com/live/stream-key", 3, "ngModelChange", "ngModel"], ["for", "createProtocol"], ["id", "createProtocol", "name", "createProtocol", "required", "", 3, "ngModelChange", "ngModel"], ["value", "rtmp"], ["value", "rtp"], ["for", "createPreset"], ["id", "createPreset", "name", "createPreset", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "checkbox-label"], ["type", "checkbox", "name", "createAudioEnabled", 3, "ngModelChange", "ngModel"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], [1, "name-cell"], [1, "url-cell", 3, "title"], [1, "protocol-badge"], [1, "status-badge"], [1, "health-badge", 3, "health-healthy", "health-degraded", "health-stopped"], [1, "text-muted"], [1, "actions-cell"], [1, "btn", "btn-small", "btn-warning"], [1, "health-badge"], [1, "btn", "btn-small", "btn-primary", 3, "click"], [1, "btn", "btn-small", "btn-secondary", 3, "click"], [1, "btn", "btn-small", "btn-danger", 3, "click"], [1, "btn", "btn-small", "btn-warning", 3, "click"], [1, "empty-icon"], ["width", "48", "height", "48", "viewBox", "0 0 48 48", "fill", "none"], ["cx", "24", "cy", "24", "r", "8", "stroke", "currentColor", "stroke-width", "2"], ["d", "M12 12a17 17 0 000 24M36 12a17 17 0 010 24M8 8a23 23 0 000 32M40 8a23 23 0 010 32", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round"], [1, "empty-title"], [1, "empty-text"], [1, "warning-banner-header"], ["aria-label", "Dismiss warnings", 1, "warning-dismiss", 3, "click"], [1, "warning-list"], ["role", "dialog", "aria-modal", "true", "aria-label", "Edit Live Stream", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["for", "editName"], ["id", "editName", "type", "text", "name", "editName", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editSourceUrl"], ["id", "editSourceUrl", "type", "text", "name", "editSourceUrl", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editProtocol"], ["id", "editProtocol", "name", "editProtocol", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editPreset"], ["id", "editPreset", "name", "editPreset", 3, "ngModelChange", "ngModel"], ["type", "checkbox", "name", "editAudioEnabled", 3, "ngModelChange", "ngModel"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "btn", "btn-secondary", 3, "click"], [1, "btn", "btn-danger", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Activate Live Stream", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", "modal-wide", 3, "click", "keydown"], [1, "radio-group"], [1, "radio-label"], ["type", "radio", "name", "targetType", "value", "screens", 3, "ngModelChange", "ngModel"], ["type", "radio", "name", "targetType", "value", "group", 3, "ngModelChange", "ngModel"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "checkbox-list"], ["type", "checkbox", 3, "change", "checked"], ["for", "activateGroupId"], ["id", "activateGroupId", "name", "activateGroupId", 3, "ngModelChange", "ngModel"], ["value", ""]], template: function LiveStreams_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function LiveStreams_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Live Streams");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, LiveStreams_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, LiveStreams_Conditional_8_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(9, LiveStreams_Conditional_9_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(10, LiveStreams_Conditional_10_Template, 37, 8, "div", 7);
      \u0275\u0275conditionalCreate(11, LiveStreams_Conditional_11_Template, 21, 0, "div", 8);
      \u0275\u0275conditionalCreate(12, LiveStreams_Conditional_12_Template, 11, 0, "div", 9);
      \u0275\u0275conditionalCreate(13, LiveStreams_Conditional_13_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(14, LiveStreams_Conditional_14_Template, 9, 0, "div", 10);
      \u0275\u0275conditionalCreate(15, LiveStreams_Conditional_15_Template, 37, 8, "div", 11);
      \u0275\u0275conditionalCreate(16, LiveStreams_Conditional_16_Template, 15, 4, "div", 12);
      \u0275\u0275conditionalCreate(17, LiveStreams_Conditional_17_Template, 24, 7, "div", 13);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.loading && !ctx.showCreateForm ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showCreateForm ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && ctx.streams.length > 0 ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && ctx.streams.length === 0 && !ctx.loadError ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.passthroughWarnings.length > 0 ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.editingStream ? 15 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.deletingStream ? 16 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.activatingStream ? 17 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, RadioControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, UpperCasePipe], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-warning[_ngcontent-%COMP%] {\n  background: #92400e;\n  color: #fde68a;\n}\n.btn-warning[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #a16207;\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.table-container[_ngcontent-%COMP%] {\n  width: 100%;\n  overflow-x: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n}\nth[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-weight: 600;\n  font-size: 0.8125rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  border-bottom: 2px solid var(--color-border);\n}\ntd[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n  font-size: 0.875rem;\n}\ntr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {\n  border-bottom: none;\n}\n.name-cell[_ngcontent-%COMP%] {\n  font-weight: 500;\n}\n.url-cell[_ngcontent-%COMP%] {\n  max-width: 250px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--color-text-secondary);\n  font-family: monospace;\n  font-size: 0.8125rem;\n}\n.actions-cell[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.protocol-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-secondary);\n}\n.status-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: capitalize;\n}\n.status-idle[_ngcontent-%COMP%] {\n  background: #6b728020;\n  color: #9ca3af;\n}\n.status-active[_ngcontent-%COMP%] {\n  background: #16a34a20;\n  color: #22c55e;\n}\n.status-error[_ngcontent-%COMP%] {\n  background: #dc262620;\n  color: #ef4444;\n}\n.health-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: capitalize;\n}\n.health-healthy[_ngcontent-%COMP%] {\n  background: #16a34a20;\n  color: #22c55e;\n}\n.health-degraded[_ngcontent-%COMP%] {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.health-stopped[_ngcontent-%COMP%] {\n  background: #dc262620;\n  color: #ef4444;\n}\n.text-muted[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n}\n.modal-wide[_ngcontent-%COMP%] {\n  max-width: 40rem;\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[type=text][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.radio-group[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1.5rem;\n}\n.radio-label[_ngcontent-%COMP%], \n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n  cursor: pointer;\n}\n.checkbox-list[_ngcontent-%COMP%] {\n  max-height: 200px;\n  overflow-y: auto;\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-icon[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  margin-bottom: 1rem;\n}\n.empty-title[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n  margin: 0 0 0.5rem;\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1.5rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.warning-banner[_ngcontent-%COMP%] {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.5rem;\n  padding: 1rem;\n  margin-top: 1rem;\n  color: #fde68a;\n}\n.warning-banner-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 0.5rem;\n}\n.warning-banner-header[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n}\n.warning-dismiss[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: #fde68a;\n  font-size: 1.25rem;\n  cursor: pointer;\n  padding: 0 0.25rem;\n  line-height: 1;\n}\n.warning-dismiss[_ngcontent-%COMP%]:hover {\n  color: #fff;\n}\n.warning-list[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-left: 1.25rem;\n  font-size: 0.8125rem;\n  line-height: 1.6;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.uppercase[_ngcontent-%COMP%] {\n  text-transform: uppercase;\n}\n@media (max-width: 768px) {\n  .page[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .page-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .modal[_ngcontent-%COMP%] {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=live-streams.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LiveStreams, [{
    type: Component,
    args: [{ selector: "app-live-streams", standalone: true, imports: [FormsModule, UpperCasePipe], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Live Streams</h1>
        </div>
        @if (!loading && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + New Stream
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading live streams...</p>
      }

      <!-- Create Stream Modal -->
      @if (showCreateForm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Create Live Stream"
             tabindex="0" (click)="cancelCreate()" (keydown.escape)="cancelCreate()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Create Live Stream</h2>
            <form (ngSubmit)="submitCreate()">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
                  name="createName"
                  required
                  placeholder="e.g. Lobby Camera"
                />
              </div>
              <div class="form-group">
                <label for="createSourceUrl">Source URL</label>
                <input
                  id="createSourceUrl"
                  type="text"
                  [(ngModel)]="createSourceUrl"
                  name="createSourceUrl"
                  required
                  placeholder="rtmp://example.com/live/stream-key"
                />
              </div>
              <div class="form-group">
                <label for="createProtocol">Protocol</label>
                <select id="createProtocol" [(ngModel)]="createProtocol" name="createProtocol" required>
                  <option value="rtmp">RTMP</option>
                  <option value="rtp">RTP</option>
                </select>
              </div>
              <div class="form-group">
                <label for="createPreset">Quality Preset</label>
                <select id="createPreset" [(ngModel)]="createPreset" name="createPreset">
                  @for (preset of transcodingPresets; track preset) {
                    <option [value]="preset">{{ presetLabel(preset) }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="createAudioEnabled" name="createAudioEnabled" />
                  Enable audio
                </label>
              </div>
              @if (createError) {
                <p class="error">{{ createError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="creating">
                  {{ creating ? 'Creating...' : 'Create Stream' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Streams Table -->
      @if (!loading && streams.length > 0) {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source URL</th>
                <th>Protocol</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Health</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (stream of streams; track stream.id) {
                <tr>
                  <td class="name-cell">{{ stream.name }}</td>
                  <td class="url-cell" [title]="stream.sourceUrl">{{ stream.sourceUrl }}</td>
                  <td>
                    <span class="protocol-badge">{{ stream.protocol | uppercase }}</span>
                  </td>
                  <td>{{ presetLabel(stream.transcodingPreset) }}</td>
                  <td>
                    <span
                      class="status-badge"
                      [class.status-idle]="stream.status === 'idle'"
                      [class.status-active]="stream.status === 'active'"
                      [class.status-error]="stream.status === 'error'"
                    >
                      {{ stream.status }}
                    </span>
                  </td>
                  <td>
                    @if (stream.status === 'active' && stream.health) {
                      <span
                        class="health-badge"
                        [class.health-healthy]="stream.health.health === 'healthy'"
                        [class.health-degraded]="stream.health.health === 'degraded'"
                        [class.health-stopped]="stream.health.health === 'stopped'"
                      >
                        {{ stream.health.health }}
                      </span>
                    } @else {
                      <span class="text-muted">-</span>
                    }
                  </td>
                  <td class="actions-cell">
                    @if (stream.status === 'idle' || stream.status === 'error') {
                      <button class="btn btn-small btn-primary" (click)="openActivateModal(stream)">Activate</button>
                      <button class="btn btn-small btn-secondary" (click)="editStream(stream)">Edit</button>
                      <button class="btn btn-small btn-danger" (click)="confirmDelete(stream)">Delete</button>
                    } @else {
                      <button class="btn btn-small btn-warning" (click)="deactivateStream(stream)">Deactivate</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && streams.length === 0 && !loadError) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M12 12a17 17 0 000 24M36 12a17 17 0 010 24M8 8a23 23 0 000 32M40 8a23 23 0 010 32" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="empty-title">No live streams yet</p>
          <p class="empty-text">Create your first live stream to start broadcasting to screens.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Create Your First Stream</button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Passthrough Warnings Banner -->
      @if (passthroughWarnings.length > 0) {
        <div class="warning-banner">
          <div class="warning-banner-header">
            <strong>Passthrough Compatibility Warnings</strong>
            <button class="warning-dismiss" (click)="dismissWarnings()" aria-label="Dismiss warnings">&times;</button>
          </div>
          <ul class="warning-list">
            @for (warning of passthroughWarnings; track warning) {
              <li>{{ warning }}</li>
            }
          </ul>
        </div>
      }

      <!-- Edit Stream Modal -->
      @if (editingStream) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Live Stream"
             tabindex="0" (click)="cancelEdit()" (keydown.escape)="cancelEdit()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Edit Live Stream</h2>
            <form (ngSubmit)="submitEdit()">
              <div class="form-group">
                <label for="editName">Name</label>
                <input id="editName" type="text" [(ngModel)]="editName" name="editName" required />
              </div>
              <div class="form-group">
                <label for="editSourceUrl">Source URL</label>
                <input id="editSourceUrl" type="text" [(ngModel)]="editSourceUrl" name="editSourceUrl" required />
              </div>
              <div class="form-group">
                <label for="editProtocol">Protocol</label>
                <select id="editProtocol" [(ngModel)]="editProtocol" name="editProtocol" required>
                  <option value="rtmp">RTMP</option>
                  <option value="rtp">RTP</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editPreset">Quality Preset</label>
                <select id="editPreset" [(ngModel)]="editPreset" name="editPreset">
                  @for (preset of transcodingPresets; track preset) {
                    <option [value]="preset">{{ presetLabel(preset) }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="editAudioEnabled" name="editAudioEnabled" />
                  Enable audio
                </label>
              </div>
              @if (editError) {
                <p class="error">{{ editError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingStream) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Live Stream</h2>
            <p>Are you sure you want to delete <strong>{{ deletingStream.name }}</strong>? This action cannot be undone.</p>
            @if (deleteError) {
              <p class="error">{{ deleteError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Activate Modal -->
      @if (activatingStream) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Activate Live Stream"
             tabindex="0" (click)="cancelActivate()" (keydown.escape)="cancelActivate()">
          <div class="modal modal-wide" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Activate "{{ activatingStream.name }}"</h2>
            <p>Choose target screens or a screen group to stream to.</p>

            <div class="form-group">
              <label>Target type</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="targetType" value="screens" [(ngModel)]="activateTargetType" />
                  Individual Screens
                </label>
                <label class="radio-label">
                  <input type="radio" name="targetType" value="group" [(ngModel)]="activateTargetType" />
                  Screen Group
                </label>
              </div>
            </div>

            @if (activateTargetType === 'screens') {
              <div class="form-group">
                <label>Select screens</label>
                @if (screens.length === 0) {
                  <p class="text-muted">No screens available.</p>
                } @else {
                  <div class="checkbox-list">
                    @for (screen of screens; track screen.id) {
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [checked]="activateScreenIds.has(screen.id)"
                          (change)="toggleScreen(screen.id)"
                        />
                        {{ screen.name }}
                        @if (screen.location) {
                          <span class="text-muted">({{ screen.location }})</span>
                        }
                      </label>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="form-group">
                <label for="activateGroupId">Select screen group</label>
                <select id="activateGroupId" [(ngModel)]="activateGroupId" name="activateGroupId">
                  <option value="">-- Select a group --</option>
                  @for (group of screenGroups; track group.id) {
                    <option [value]="group.id">{{ group.name }} ({{ group.screens.length }} screens)</option>
                  }
                </select>
              </div>
            }

            @if (activateError) {
              <p class="error">{{ activateError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelActivate()">Cancel</button>
              <button class="btn btn-primary" (click)="submitActivate()" [disabled]="activating">
                {{ activating ? 'Activating...' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;d8f58d747cad70a9cc6184a80449650c626c36f630228dad570661b52b8226be;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/live-streams/live-streams.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-warning {\n  background: #92400e;\n  color: #fde68a;\n}\n.btn-warning:hover:not(:disabled) {\n  background: #a16207;\n}\n.btn-small {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.table-container {\n  width: 100%;\n  overflow-x: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n}\nth {\n  background: var(--color-bg-tertiary);\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-weight: 600;\n  font-size: 0.8125rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  border-bottom: 2px solid var(--color-border);\n}\ntd {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n  font-size: 0.875rem;\n}\ntr:last-child td {\n  border-bottom: none;\n}\n.name-cell {\n  font-weight: 500;\n}\n.url-cell {\n  max-width: 250px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--color-text-secondary);\n  font-family: monospace;\n  font-size: 0.8125rem;\n}\n.actions-cell {\n  display: flex;\n  gap: 0.5rem;\n}\n.protocol-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-secondary);\n}\n.status-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: capitalize;\n}\n.status-idle {\n  background: #6b728020;\n  color: #9ca3af;\n}\n.status-active {\n  background: #16a34a20;\n  color: #22c55e;\n}\n.status-error {\n  background: #dc262620;\n  color: #ef4444;\n}\n.health-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: capitalize;\n}\n.health-healthy {\n  background: #16a34a20;\n  color: #22c55e;\n}\n.health-degraded {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.health-stopped {\n  background: #dc262620;\n  color: #ef4444;\n}\n.text-muted {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n}\n.modal-wide {\n  max-width: 40rem;\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input[type=text],\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.radio-group {\n  display: flex;\n  gap: 1.5rem;\n}\n.radio-label,\n.checkbox-label {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n  cursor: pointer;\n}\n.checkbox-list {\n  max-height: 200px;\n  overflow-y: auto;\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-icon {\n  color: var(--color-text-muted);\n  margin-bottom: 1rem;\n}\n.empty-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n  margin: 0 0 0.5rem;\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1.5rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.warning-banner {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.5rem;\n  padding: 1rem;\n  margin-top: 1rem;\n  color: #fde68a;\n}\n.warning-banner-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 0.5rem;\n}\n.warning-banner-header strong {\n  font-size: 0.875rem;\n}\n.warning-dismiss {\n  background: none;\n  border: none;\n  color: #fde68a;\n  font-size: 1.25rem;\n  cursor: pointer;\n  padding: 0 0.25rem;\n  line-height: 1;\n}\n.warning-dismiss:hover {\n  color: #fff;\n}\n.warning-list {\n  margin: 0;\n  padding-left: 1.25rem;\n  font-size: 0.8125rem;\n  line-height: 1.6;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.uppercase {\n  text-transform: uppercase;\n}\n@media (max-width: 768px) {\n  .page {\n    padding: 1rem;\n  }\n  .page-header {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .modal {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=live-streams.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LiveStreams, { className: "LiveStreams", filePath: "src/app/live-streams/live-streams.ts", lineNumber: 722 });
})();
export {
  LiveStreams
};
//# sourceMappingURL=chunk-YTWFT7X4.js.map
