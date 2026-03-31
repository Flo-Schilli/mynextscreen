import {
  BulkActionToolbarComponent,
  SelectAllCheckboxComponent,
  SelectionCheckboxComponent,
  SelectionService
} from "./chunk-GZRWYXK5.js";
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
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  DatePipe,
  Router,
  firstValueFrom,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/screens/screens.ts
var _forTrack0 = ($index, $item) => $item.id;
function Screens_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 15);
    \u0275\u0275listener("click", function Screens_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(1, " + Register Screen ");
    \u0275\u0275elementEnd();
  }
}
function Screens_Conditional_8_Template(rf, ctx) {
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
function Screens_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading screens...");
    \u0275\u0275elementEnd();
  }
}
function Screens_Conditional_10_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "label", 34);
    \u0275\u0275text(2, "Custom Resolution");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 35);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_10_Conditional_29_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.createCustomResolution, $event) || (ctx_r1.createCustomResolution = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createCustomResolution);
  }
}
function Screens_Conditional_10_Conditional_30_Template(rf, ctx) {
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
function Screens_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 7)(1, "h2");
    \u0275\u0275text(2, "Register New Screen");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "form", 16);
    \u0275\u0275listener("ngSubmit", function Screens_Conditional_10_Template_form_ngSubmit_3_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitCreate());
    });
    \u0275\u0275elementStart(4, "div", 17)(5, "div", 18)(6, "label", 19);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_10_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createName, $event) || (ctx_r1.createName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 18)(10, "label", 21);
    \u0275\u0275text(11, "Location");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_10_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createLocation, $event) || (ctx_r1.createLocation = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 18)(14, "label", 23);
    \u0275\u0275text(15, "Resolution");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 24);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_10_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createResolution, $event) || (ctx_r1.createResolution = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(17, "option", 25);
    \u0275\u0275text(18, "1920x1080 (Full HD)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 26);
    \u0275\u0275text(20, "3840x2160 (4K UHD)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "option", 27);
    \u0275\u0275text(22, "1280x720 (HD)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "option", 28);
    \u0275\u0275text(24, "2560x1440 (QHD)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "option", 29);
    \u0275\u0275text(26, "1080x1920 (Full HD Portrait)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "option", 30);
    \u0275\u0275text(28, "Custom...");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(29, Screens_Conditional_10_Conditional_29_Template, 4, 1, "div", 18);
    \u0275\u0275conditionalCreate(30, Screens_Conditional_10_Conditional_30_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(31, "div", 31)(32, "button", 32);
    \u0275\u0275listener("click", function Screens_Conditional_10_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275text(33, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "button", 33);
    \u0275\u0275text(35);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createLocation);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createResolution);
    \u0275\u0275advance(13);
    \u0275\u0275conditional(ctx_r1.createResolution === "custom" ? 29 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.createError ? 30 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.creating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.creating ? "Registering..." : "Register Screen", " ");
  }
}
function Screens_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 8)(1, "div", 36)(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 37)(5, "button", 38);
    \u0275\u0275listener("click", function Screens_Conditional_11_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.startEdit());
    });
    \u0275\u0275text(6, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 38);
    \u0275\u0275listener("click", function Screens_Conditional_11_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(8, "Close");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 39)(10, "div", 40)(11, "span", 41);
    \u0275\u0275text(12, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span", 42);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 40)(16, "span", 41);
    \u0275\u0275text(17, "Location");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span");
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 40)(21, "span", 41);
    \u0275\u0275text(22, "Resolution");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "span");
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div", 40)(26, "span", 41);
    \u0275\u0275text(27, "Last Heartbeat");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span");
    \u0275\u0275text(29);
    \u0275\u0275pipe(30, "date");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(31, "div", 40)(32, "span", 41);
    \u0275\u0275text(33, "Registered");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "span");
    \u0275\u0275text(35);
    \u0275\u0275pipe(36, "date");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(37, "div", 43)(38, "h3");
    \u0275\u0275text(39, "API Key Management");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "p", 44);
    \u0275\u0275text(41, "Regenerate the API key if it has been compromised. The current key will be invalidated immediately.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "button", 45);
    \u0275\u0275listener("click", function Screens_Conditional_11_Template_button_click_42_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmRegenerate());
    });
    \u0275\u0275text(43, " Regenerate API Key ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectedScreen.name);
    \u0275\u0275advance(10);
    \u0275\u0275classProp("online", ctx_r1.selectedScreen.isOnline)("offline", !ctx_r1.selectedScreen.isOnline);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectedScreen.isOnline ? "Online" : "Offline", " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedScreen.location);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedScreen.resolution);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedScreen.lastHeartbeat ? \u0275\u0275pipeBind2(30, 11, ctx_r1.selectedScreen.lastHeartbeat, "medium") : "Never");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(36, 14, ctx_r1.selectedScreen.createdAt, "mediumDate"));
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.regenerating);
  }
}
function Screens_Conditional_12_Conditional_17_Template(rf, ctx) {
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
function Screens_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 7)(1, "h2");
    \u0275\u0275text(2, "Edit Screen");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "form", 16);
    \u0275\u0275listener("ngSubmit", function Screens_Conditional_12_Template_form_ngSubmit_3_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitEdit());
    });
    \u0275\u0275elementStart(4, "div", 17)(5, "div", 18)(6, "label", 46);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 47);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_12_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editName, $event) || (ctx_r1.editName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 18)(10, "label", 48);
    \u0275\u0275text(11, "Location");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 49);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_12_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editLocation, $event) || (ctx_r1.editLocation = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "div", 18)(14, "label", 50);
    \u0275\u0275text(15, "Resolution");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "input", 51);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_12_Template_input_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editResolution, $event) || (ctx_r1.editResolution = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(17, Screens_Conditional_12_Conditional_17_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(18, "div", 31)(19, "button", 32);
    \u0275\u0275listener("click", function Screens_Conditional_12_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    });
    \u0275\u0275text(20, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 33);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editLocation);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editResolution);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editError ? 17 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.saving);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.saving ? "Saving..." : "Save Changes", " ");
  }
}
function Screens_Conditional_13_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 58);
    \u0275\u0275listener("click", function Screens_Conditional_13_For_6_Template_div_click_0_listener() {
      const screen_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectScreen(screen_r8));
    })("keydown.enter", function Screens_Conditional_13_For_6_Template_div_keydown_enter_0_listener() {
      const screen_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectScreen(screen_r8));
    })("keydown.space", function Screens_Conditional_13_For_6_Template_div_keydown_space_0_listener() {
      const screen_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectScreen(screen_r8));
    });
    \u0275\u0275elementStart(1, "div", 59)(2, "app-selection-checkbox", 60);
    \u0275\u0275listener("click", function Screens_Conditional_13_For_6_Template_app_selection_checkbox_click_2_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 61);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "span", 62);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 63)(7, "div", 64)(8, "span", 65);
    \u0275\u0275text(9, "Location");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 66);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 64)(13, "span", 65);
    \u0275\u0275text(14, "Resolution");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "span", 66);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 64)(18, "span", 65);
    \u0275\u0275text(19, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "span", 67);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const screen_r8 = ctx.$implicit;
    const \u0275$index_218_r9 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r1.selectionService.selectedIds().has(screen_r8.id));
    \u0275\u0275advance(2);
    \u0275\u0275property("itemId", screen_r8.id)("itemIndex", \u0275$index_218_r9)("orderedIds", ctx_r1.screenIds);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(screen_r8.name);
    \u0275\u0275advance();
    \u0275\u0275classProp("online", screen_r8.isOnline)("offline", !screen_r8.isOnline);
    \u0275\u0275attribute("title", screen_r8.isOnline ? "Online" : "Offline");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(screen_r8.location);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(screen_r8.resolution);
    \u0275\u0275advance(4);
    \u0275\u0275classProp("online", screen_r8.isOnline)("offline", !screen_r8.isOnline);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", screen_r8.isOnline ? "Online" : "Offline", " ");
  }
}
function Screens_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 52);
    \u0275\u0275element(1, "app-select-all-checkbox", 53);
    \u0275\u0275elementStart(2, "span", 54);
    \u0275\u0275text(3, "Select all");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 55);
    \u0275\u0275repeaterCreate(5, Screens_Conditional_13_For_6_Template, 22, 18, "div", 56, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275element(7, "app-bulk-action-toolbar", 57);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("allIds", ctx_r1.screenIds);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.screens);
    \u0275\u0275advance(2);
    \u0275\u0275property("actions", ctx_r1.bulkActions);
  }
}
function Screens_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "p", 68);
    \u0275\u0275text(2, "No screens registered yet.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 15);
    \u0275\u0275listener("click", function Screens_Conditional_14_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(4, "Register Your First Screen");
    \u0275\u0275elementEnd()();
  }
}
function Screens_Conditional_15_Template(rf, ctx) {
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
function Screens_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 69);
    \u0275\u0275listener("click", function Screens_Conditional_16_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeApiKeyModal());
    })("keydown.escape", function Screens_Conditional_16_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeApiKeyModal());
    });
    \u0275\u0275elementStart(1, "div", 70);
    \u0275\u0275listener("click", function Screens_Conditional_16_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Screens_Conditional_16_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Screen API Key");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 71);
    \u0275\u0275text(5, " This API key will only be shown once. Copy it now and store it securely. ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 72)(7, "code", 73);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 74);
    \u0275\u0275listener("click", function Screens_Conditional_16_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.copyApiKey());
    });
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 31)(12, "button", 15);
    \u0275\u0275listener("click", function Screens_Conditional_16_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeApiKeyModal());
    });
    \u0275\u0275text(13, "Done");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r1.displayedApiKey);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.copied ? "Copied!" : "Copy", " ");
  }
}
function Screens_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 75);
    \u0275\u0275listener("click", function Screens_Conditional_17_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRegenerate());
    })("keydown.escape", function Screens_Conditional_17_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRegenerate());
    });
    \u0275\u0275elementStart(1, "div", 70);
    \u0275\u0275listener("click", function Screens_Conditional_17_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Screens_Conditional_17_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Regenerate API Key");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Are you sure you want to regenerate the API key for ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, "?");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p");
    \u0275\u0275text(10, "The current API key will be invalidated immediately. The screen will need to be reconfigured with the new key.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 31)(12, "button", 38);
    \u0275\u0275listener("click", function Screens_Conditional_17_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRegenerate());
    });
    \u0275\u0275text(13, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 45);
    \u0275\u0275listener("click", function Screens_Conditional_17_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeRegenerate());
    });
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.selectedScreen == null ? null : ctx_r1.selectedScreen.name);
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.regenerating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.regenerating ? "Regenerating..." : "Regenerate", " ");
  }
}
function Screens_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 76);
    \u0275\u0275listener("click", function Screens_Conditional_18_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    })("keydown.escape", function Screens_Conditional_18_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275elementStart(1, "div", 70);
    \u0275\u0275listener("click", function Screens_Conditional_18_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Screens_Conditional_18_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Screens");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "You are about to permanently delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, ". This cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 31)(10, "button", 38);
    \u0275\u0275listener("click", function Screens_Conditional_18_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 77);
    \u0275\u0275listener("click", function Screens_Conditional_18_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeBulkDelete());
    });
    \u0275\u0275text(13, " Delete ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.selectionService.count(), " screen(s)");
  }
}
function Screens_Conditional_19_For_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 82);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const group_r15 = ctx.$implicit;
    \u0275\u0275property("value", group_r15.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(group_r15.name);
  }
}
function Screens_Conditional_19_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.groupsLoadError);
  }
}
function Screens_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 78);
    \u0275\u0275listener("click", function Screens_Conditional_19_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignGroup());
    })("keydown.escape", function Screens_Conditional_19_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignGroup());
    });
    \u0275\u0275elementStart(1, "div", 70);
    \u0275\u0275listener("click", function Screens_Conditional_19_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Screens_Conditional_19_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Assign to Group");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Select a group to assign ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " to:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 18)(10, "label", 79);
    \u0275\u0275text(11, "Group");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 80);
    \u0275\u0275twoWayListener("ngModelChange", function Screens_Conditional_19_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.selectedGroupId, $event) || (ctx_r1.selectedGroupId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 81);
    \u0275\u0275text(14, "-- No group (remove from group) --");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(15, Screens_Conditional_19_For_16_Template, 2, 2, "option", 82, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(17, Screens_Conditional_19_Conditional_17_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(18, "div", 31)(19, "button", 38);
    \u0275\u0275listener("click", function Screens_Conditional_19_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignGroup());
    });
    \u0275\u0275text(20, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 83);
    \u0275\u0275listener("click", function Screens_Conditional_19_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeAssignGroup());
    });
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.selectionService.count(), " screen(s)");
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.selectedGroupId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.groups);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.groupsLoadError ? 17 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.groupsLoading);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.groupsLoading ? "Loading..." : "Assign", " ");
  }
}
function Screens_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 84);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("toast-error", ctx_r1.toastType === "error")("toast-success", ctx_r1.toastType === "success")("toast-warning", ctx_r1.toastType === "warning");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.toastMessage, " ");
  }
}
var Screens = class _Screens {
  screenService = inject(ScreenService);
  memberService = inject(MemberService);
  screenGroupService = inject(ScreenGroupService);
  router = inject(Router);
  selectionService = inject(SelectionService);
  orgId = "";
  screens = [];
  screenIds = [];
  loading = true;
  loadError = "";
  actionError = "";
  // Create form state
  showCreateForm = false;
  createName = "";
  createLocation = "";
  createResolution = "1920x1080";
  createCustomResolution = "";
  createError = "";
  creating = false;
  // Detail view state
  selectedScreen = null;
  // Edit state
  editingScreen = false;
  editName = "";
  editLocation = "";
  editResolution = "";
  editError = "";
  saving = false;
  // API key modal
  showApiKeyModal = false;
  displayedApiKey = "";
  copied = false;
  // Regenerate confirmation
  showRegenerateConfirm = false;
  regenerating = false;
  // Bulk delete confirmation
  showBulkDeleteConfirm = false;
  bulkDeleteResolve = null;
  // Assign to group modal
  showAssignGroupModal = false;
  groups = [];
  selectedGroupId = "";
  groupsLoading = false;
  groupsLoadError = "";
  assignGroupResolve = null;
  // Toast
  toastMessage = "";
  toastType = "success";
  toastTimer = null;
  // Bulk actions
  bulkActions = [
    {
      label: "Delete selected",
      variant: "danger",
      handler: () => this.handleBulkDelete()
    },
    {
      label: "Assign to group",
      variant: "default",
      handler: () => this.handleBulkAssignGroup()
    }
  ];
  ngOnInit() {
    this.loadCurrentOrg();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadScreens();
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.loadScreens();
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
  loadScreens() {
    this.loading = true;
    this.loadError = "";
    this.actionError = "";
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        this.screenIds = screens.map((s) => s.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied." : "Failed to load screens.";
        this.loading = false;
      }
    });
  }
  // --- Create ---
  openCreateForm() {
    this.createName = "";
    this.createLocation = "";
    this.createResolution = "1920x1080";
    this.createCustomResolution = "";
    this.createError = "";
    this.showCreateForm = true;
  }
  cancelCreate() {
    this.showCreateForm = false;
  }
  submitCreate() {
    const resolution = this.createResolution === "custom" ? this.createCustomResolution : this.createResolution;
    if (!this.createName || !this.createLocation || !resolution) {
      this.createError = "All fields are required.";
      return;
    }
    this.creating = true;
    this.createError = "";
    this.screenService.create(this.orgId, {
      name: this.createName,
      resolution,
      location: this.createLocation
    }).subscribe({
      next: (result) => {
        this.creating = false;
        this.showCreateForm = false;
        this.displayedApiKey = result.apiKey;
        this.copied = false;
        this.showApiKeyModal = true;
        this.loadScreens();
      },
      error: (err) => {
        this.createError = err.error?.message || "Failed to register screen.";
        this.creating = false;
      }
    });
  }
  // --- Detail ---
  selectScreen(screen) {
    this.selectedScreen = screen;
    this.editingScreen = false;
  }
  closeDetail() {
    this.selectedScreen = null;
  }
  // --- Edit ---
  startEdit() {
    if (!this.selectedScreen)
      return;
    this.editName = this.selectedScreen.name;
    this.editLocation = this.selectedScreen.location;
    this.editResolution = this.selectedScreen.resolution;
    this.editError = "";
    this.editingScreen = true;
  }
  cancelEdit() {
    this.editingScreen = false;
  }
  submitEdit() {
    if (!this.selectedScreen)
      return;
    if (!this.editName || !this.editLocation || !this.editResolution) {
      this.editError = "All fields are required.";
      return;
    }
    this.saving = true;
    this.editError = "";
    this.screenService.update(this.orgId, this.selectedScreen.id, {
      name: this.editName,
      resolution: this.editResolution,
      location: this.editLocation
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.editingScreen = false;
        this.selectedScreen = updated;
        this.loadScreens();
      },
      error: (err) => {
        this.editError = err.error?.message || "Failed to update screen.";
        this.saving = false;
      }
    });
  }
  // --- Regenerate API Key ---
  confirmRegenerate() {
    this.showRegenerateConfirm = true;
  }
  cancelRegenerate() {
    this.showRegenerateConfirm = false;
  }
  executeRegenerate() {
    if (!this.selectedScreen)
      return;
    this.regenerating = true;
    this.actionError = "";
    this.screenService.regenerateApiKey(this.orgId, this.selectedScreen.id).subscribe({
      next: (result) => {
        this.regenerating = false;
        this.showRegenerateConfirm = false;
        this.selectedScreen = result.screen;
        this.displayedApiKey = result.apiKey;
        this.copied = false;
        this.showApiKeyModal = true;
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to regenerate API key.";
        this.regenerating = false;
        this.showRegenerateConfirm = false;
      }
    });
  }
  // --- API Key Modal ---
  closeApiKeyModal() {
    this.showApiKeyModal = false;
    this.displayedApiKey = "";
  }
  copyApiKey() {
    navigator.clipboard.writeText(this.displayedApiKey).then(() => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2e3);
    });
  }
  // --- Bulk Delete ---
  async handleBulkDelete() {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.screenService.bulkDelete(this.orgId, ids));
    this.showToast(`${result.deleted} screen(s) deleted`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadScreens();
  }
  openBulkDeleteConfirm() {
    this.showBulkDeleteConfirm = true;
    return new Promise((resolve) => {
      this.bulkDeleteResolve = resolve;
    });
  }
  cancelBulkDelete() {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(false);
    this.bulkDeleteResolve = null;
  }
  executeBulkDelete() {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(true);
    this.bulkDeleteResolve = null;
  }
  // --- Bulk Assign Group ---
  async handleBulkAssignGroup() {
    const confirmed = await this.openAssignGroupModal();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const groupId = this.selectedGroupId || null;
    const result = await firstValueFrom(this.screenService.bulkAssignGroup(this.orgId, ids, groupId));
    const groupName = groupId ? this.groups.find((g) => g.id === groupId)?.name ?? "selected group" : "no group";
    this.showToast(`${result.updated} screen(s) assigned to ${groupName}`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadScreens();
  }
  openAssignGroupModal() {
    this.showAssignGroupModal = true;
    this.selectedGroupId = "";
    this.groupsLoadError = "";
    this.groupsLoading = true;
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groupsLoading = false;
      },
      error: () => {
        this.groupsLoadError = "Failed to load groups.";
        this.groupsLoading = false;
      }
    });
    return new Promise((resolve) => {
      this.assignGroupResolve = resolve;
    });
  }
  cancelAssignGroup() {
    this.showAssignGroupModal = false;
    this.assignGroupResolve?.(false);
    this.assignGroupResolve = null;
  }
  executeAssignGroup() {
    this.showAssignGroupModal = false;
    this.assignGroupResolve?.(true);
    this.assignGroupResolve = null;
  }
  // --- Toast ---
  showToast(message, type) {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer)
      clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = "";
    }, 4e3);
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function Screens_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Screens)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Screens, selectors: [["app-screens"]], features: [\u0275\u0275ProvidersFeature([SelectionService])], decls: 21, vars: 14, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "error"], [1, "loading-text"], [1, "form-card"], [1, "detail-card"], [1, "empty-state"], ["role", "dialog", "aria-modal", "true", "aria-label", "API Key", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm regeneration", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Assign to group", "tabindex", "0", 1, "modal-overlay"], [1, "toast", 3, "toast-error", "toast-success", "toast-warning"], [1, "btn", "btn-primary", 3, "click"], [3, "ngSubmit"], [1, "form-row"], [1, "form-group"], ["for", "createName"], ["id", "createName", "type", "text", "name", "createName", "required", "", "placeholder", "e.g. Main Stage Left", 3, "ngModelChange", "ngModel"], ["for", "createLocation"], ["id", "createLocation", "type", "text", "name", "createLocation", "required", "", "placeholder", "e.g. Entrance Hall", 3, "ngModelChange", "ngModel"], ["for", "createResolution"], ["id", "createResolution", "name", "createResolution", "required", "", 3, "ngModelChange", "ngModel"], ["value", "1920x1080"], ["value", "3840x2160"], ["value", "1280x720"], ["value", "2560x1440"], ["value", "1080x1920"], ["value", "custom"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], ["for", "createCustomRes"], ["id", "createCustomRes", "type", "text", "name", "createCustomResolution", "required", "", "placeholder", "e.g. 1920x1200", 3, "ngModelChange", "ngModel"], [1, "detail-header"], [1, "detail-actions"], [1, "btn", "btn-secondary", 3, "click"], [1, "detail-grid"], [1, "detail-item"], [1, "detail-label"], [1, "status-badge"], [1, "api-key-section"], [1, "text-muted"], [1, "btn", "btn-danger", 3, "click", "disabled"], ["for", "editName"], ["id", "editName", "type", "text", "name", "editName", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editLocation"], ["id", "editLocation", "type", "text", "name", "editLocation", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editResolution"], ["id", "editResolution", "type", "text", "name", "editResolution", "required", "", 3, "ngModelChange", "ngModel"], [1, "select-all-row"], [3, "allIds"], [1, "select-all-label"], [1, "screen-grid"], ["tabindex", "0", "role", "button", 1, "screen-card", 3, "selected"], [3, "actions"], ["tabindex", "0", "role", "button", 1, "screen-card", 3, "click", "keydown.enter", "keydown.space"], [1, "card-header"], [3, "click", "itemId", "itemIndex", "orderedIds"], [1, "screen-name"], [1, "status-dot"], [1, "card-body"], [1, "card-field"], [1, "card-label"], [1, "card-value"], [1, "card-value", "status-text"], [1, "empty-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "API Key", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [1, "api-key-warning"], [1, "api-key-display"], [1, "api-key-value"], [1, "btn", "btn-secondary", "btn-copy", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm regeneration", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "btn", "btn-danger", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Assign to group", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["for", "groupSelect"], ["id", "groupSelect", "name", "groupSelect", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "toast"]], template: function Screens_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function Screens_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Screen Management");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, Screens_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, Screens_Conditional_8_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(9, Screens_Conditional_9_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(10, Screens_Conditional_10_Template, 36, 7, "div", 7);
      \u0275\u0275conditionalCreate(11, Screens_Conditional_11_Template, 44, 17, "div", 8);
      \u0275\u0275conditionalCreate(12, Screens_Conditional_12_Template, 23, 6, "div", 7);
      \u0275\u0275conditionalCreate(13, Screens_Conditional_13_Template, 8, 2);
      \u0275\u0275conditionalCreate(14, Screens_Conditional_14_Template, 5, 0, "div", 9);
      \u0275\u0275conditionalCreate(15, Screens_Conditional_15_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(16, Screens_Conditional_16_Template, 14, 2, "div", 10);
      \u0275\u0275conditionalCreate(17, Screens_Conditional_17_Template, 16, 3, "div", 11);
      \u0275\u0275conditionalCreate(18, Screens_Conditional_18_Template, 14, 1, "div", 12);
      \u0275\u0275conditionalCreate(19, Screens_Conditional_19_Template, 23, 5, "div", 13);
      \u0275\u0275conditionalCreate(20, Screens_Conditional_20_Template, 2, 7, "div", 14);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedScreen && !ctx.showCreateForm ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showCreateForm ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.selectedScreen && !ctx.editingScreen ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.editingScreen ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedScreen && !ctx.showCreateForm && !ctx.editingScreen && ctx.screens.length > 0 ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedScreen && !ctx.showCreateForm && ctx.screens.length === 0 && !ctx.loadError ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 15 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showApiKeyModal ? 16 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showRegenerateConfirm ? 17 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showBulkDeleteConfirm ? 18 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAssignGroupModal ? 19 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toastMessage ? 20 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent, DatePipe], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n  padding-bottom: 5rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.select-all-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 0.75rem;\n  padding: 0.25rem 0;\n}\n.select-all-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.screen-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));\n  gap: 1rem;\n}\n.screen-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.25rem;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.screen-card[_ngcontent-%COMP%]:hover, \n.screen-card[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.screen-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n}\n.card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.screen-name[_ngcontent-%COMP%] {\n  font-size: 1rem;\n  font-weight: 600;\n  flex: 1;\n}\n.status-dot[_ngcontent-%COMP%] {\n  width: 0.625rem;\n  height: 0.625rem;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n.status-dot.online[_ngcontent-%COMP%] {\n  background: #22c55e;\n  box-shadow: 0 0 6px #22c55e80;\n}\n.status-dot.offline[_ngcontent-%COMP%] {\n  background: #ef4444;\n  box-shadow: 0 0 6px #ef444480;\n}\n.card-body[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.card-field[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.8125rem;\n}\n.card-label[_ngcontent-%COMP%] {\n  color: var(--color-text-secondary);\n}\n.card-value[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n}\n.status-text.online[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.status-text.offline[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.detail-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.detail-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.detail-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.detail-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.detail-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.25rem;\n  margin-bottom: 2rem;\n}\n.detail-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.status-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.status-badge.online[_ngcontent-%COMP%] {\n  background: #22c55e20;\n  color: #22c55e;\n}\n.status-badge.offline[_ngcontent-%COMP%] {\n  background: #ef444420;\n  color: #ef4444;\n}\n.api-key-section[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.5rem;\n}\n.api-key-section[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 0.5rem;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.text-muted[_ngcontent-%COMP%] {\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  margin: 0 0 1rem;\n  line-height: 1.5;\n}\n.form-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.form-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.api-key-warning[_ngcontent-%COMP%] {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.api-key-display[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.75rem;\n  margin-bottom: 1rem;\n}\n.api-key-value[_ngcontent-%COMP%] {\n  flex: 1;\n  font-size: 0.75rem;\n  word-break: break-all;\n  color: var(--color-accent);\n}\n.btn-copy[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: _ngcontent-%COMP%_toast-in 0.3s ease;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n.toast-warning[_ngcontent-%COMP%] {\n  background: #92400e;\n  color: #fef3c7;\n  border: 1px solid #d97706;\n}\n@keyframes _ngcontent-%COMP%_toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n/*# sourceMappingURL=screens.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Screens, [{
    type: Component,
    args: [{ selector: "app-screens", standalone: true, imports: [DatePipe, FormsModule, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent], providers: [SelectionService], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Management</h1>
        </div>
        @if (!loading && !selectedScreen && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + Register Screen
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading screens...</p>
      }

      <!-- Create Screen Form -->
      @if (showCreateForm) {
        <div class="form-card">
          <h2>Register New Screen</h2>
          <form (ngSubmit)="submitCreate()">
            <div class="form-row">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
                  name="createName"
                  required
                  placeholder="e.g. Main Stage Left"
                />
              </div>
              <div class="form-group">
                <label for="createLocation">Location</label>
                <input
                  id="createLocation"
                  type="text"
                  [(ngModel)]="createLocation"
                  name="createLocation"
                  required
                  placeholder="e.g. Entrance Hall"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="createResolution">Resolution</label>
              <select id="createResolution" [(ngModel)]="createResolution" name="createResolution" required>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="3840x2160">3840x2160 (4K UHD)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="2560x1440">2560x1440 (QHD)</option>
                <option value="1080x1920">1080x1920 (Full HD Portrait)</option>
                <option value="custom">Custom...</option>
              </select>
            </div>
            @if (createResolution === 'custom') {
              <div class="form-group">
                <label for="createCustomRes">Custom Resolution</label>
                <input
                  id="createCustomRes"
                  type="text"
                  [(ngModel)]="createCustomResolution"
                  name="createCustomResolution"
                  required
                  placeholder="e.g. 1920x1200"
                />
              </div>
            }
            @if (createError) {
              <p class="error">{{ createError }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="creating">
                {{ creating ? 'Registering...' : 'Register Screen' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Screen Detail View -->
      @if (selectedScreen && !editingScreen) {
        <div class="detail-card">
          <div class="detail-header">
            <h2>{{ selectedScreen.name }}</h2>
            <div class="detail-actions">
              <button class="btn btn-secondary" (click)="startEdit()">Edit</button>
              <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <span class="status-badge" [class.online]="selectedScreen.isOnline" [class.offline]="!selectedScreen.isOnline">
                {{ selectedScreen.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location</span>
              <span>{{ selectedScreen.location }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Resolution</span>
              <span>{{ selectedScreen.resolution }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Heartbeat</span>
              <span>{{ selectedScreen.lastHeartbeat ? (selectedScreen.lastHeartbeat | date:'medium') : 'Never' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Registered</span>
              <span>{{ selectedScreen.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
          <div class="api-key-section">
            <h3>API Key Management</h3>
            <p class="text-muted">Regenerate the API key if it has been compromised. The current key will be invalidated immediately.</p>
            <button class="btn btn-danger" (click)="confirmRegenerate()" [disabled]="regenerating">
              Regenerate API Key
            </button>
          </div>
        </div>
      }

      <!-- Edit Screen Form -->
      @if (editingScreen) {
        <div class="form-card">
          <h2>Edit Screen</h2>
          <form (ngSubmit)="submitEdit()">
            <div class="form-row">
              <div class="form-group">
                <label for="editName">Name</label>
                <input
                  id="editName"
                  type="text"
                  [(ngModel)]="editName"
                  name="editName"
                  required
                />
              </div>
              <div class="form-group">
                <label for="editLocation">Location</label>
                <input
                  id="editLocation"
                  type="text"
                  [(ngModel)]="editLocation"
                  name="editLocation"
                  required
                />
              </div>
            </div>
            <div class="form-group">
              <label for="editResolution">Resolution</label>
              <input
                id="editResolution"
                type="text"
                [(ngModel)]="editResolution"
                name="editResolution"
                required
              />
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
      }

      <!-- Screen Grid -->
      @if (!loading && !selectedScreen && !showCreateForm && !editingScreen && screens.length > 0) {
        <div class="select-all-row">
          <app-select-all-checkbox [allIds]="screenIds" />
          <span class="select-all-label">Select all</span>
        </div>
        <div class="screen-grid">
          @for (screen of screens; track screen.id; let i = $index) {
            <div class="screen-card" [class.selected]="selectionService.selectedIds().has(screen.id)"
                 (click)="selectScreen(screen)" tabindex="0" role="button"
                 (keydown.enter)="selectScreen(screen)" (keydown.space)="selectScreen(screen)">
              <div class="card-header">
                <app-selection-checkbox
                  [itemId]="screen.id"
                  [itemIndex]="i"
                  [orderedIds]="screenIds"
                  (click)="$event.stopPropagation()"
                />
                <span class="screen-name">{{ screen.name }}</span>
                <span class="status-dot" [class.online]="screen.isOnline" [class.offline]="!screen.isOnline"
                      [attr.title]="screen.isOnline ? 'Online' : 'Offline'"></span>
              </div>
              <div class="card-body">
                <div class="card-field">
                  <span class="card-label">Location</span>
                  <span class="card-value">{{ screen.location }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Resolution</span>
                  <span class="card-value">{{ screen.resolution }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Status</span>
                  <span class="card-value status-text" [class.online]="screen.isOnline" [class.offline]="!screen.isOnline">
                    {{ screen.isOnline ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
            </div>
          }
        </div>

        <app-bulk-action-toolbar [actions]="bulkActions" />
      }

      @if (!loading && !selectedScreen && !showCreateForm && screens.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No screens registered yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Register Your First Screen</button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- API Key Modal -->
      @if (showApiKeyModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="API Key"
             tabindex="0" (click)="closeApiKeyModal()" (keydown.escape)="closeApiKeyModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Screen API Key</h2>
            <div class="api-key-warning">
              This API key will only be shown once. Copy it now and store it securely.
            </div>
            <div class="api-key-display">
              <code class="api-key-value">{{ displayedApiKey }}</code>
              <button class="btn btn-secondary btn-copy" (click)="copyApiKey()">
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="closeApiKeyModal()">Done</button>
            </div>
          </div>
        </div>
      }

      <!-- Regenerate Confirmation Modal -->
      @if (showRegenerateConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm regeneration"
             tabindex="0" (click)="cancelRegenerate()" (keydown.escape)="cancelRegenerate()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Regenerate API Key</h2>
            <p>Are you sure you want to regenerate the API key for <strong>{{ selectedScreen?.name }}</strong>?</p>
            <p>The current API key will be invalidated immediately. The screen will need to be reconfigured with the new key.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRegenerate()">Cancel</button>
              <button class="btn btn-danger" (click)="executeRegenerate()" [disabled]="regenerating">
                {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm bulk delete"
             tabindex="0" (click)="cancelBulkDelete()" (keydown.escape)="cancelBulkDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Screens</h2>
            <p>You are about to permanently delete <strong>{{ selectionService.count() }} screen(s)</strong>. This cannot be undone.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelBulkDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeBulkDelete()">
                Delete
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Assign to Group Modal -->
      @if (showAssignGroupModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Assign to group"
             tabindex="0" (click)="cancelAssignGroup()" (keydown.escape)="cancelAssignGroup()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Assign to Group</h2>
            <p>Select a group to assign <strong>{{ selectionService.count() }} screen(s)</strong> to:</p>
            <div class="form-group">
              <label for="groupSelect">Group</label>
              <select id="groupSelect" [(ngModel)]="selectedGroupId" name="groupSelect">
                <option value="">-- No group (remove from group) --</option>
                @for (group of groups; track group.id) {
                  <option [value]="group.id">{{ group.name }}</option>
                }
              </select>
            </div>
            @if (groupsLoadError) {
              <p class="error">{{ groupsLoadError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelAssignGroup()">Cancel</button>
              <button class="btn btn-primary" (click)="executeAssignGroup()" [disabled]="groupsLoading">
                {{ groupsLoading ? 'Loading...' : 'Assign' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toastMessage) {
        <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'" [class.toast-warning]="toastType === 'warning'">
          {{ toastMessage }}
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;7be26fefaee6e8a3da66a580dd1556016b68ce9b4675ea17901d3fca4aab6fdf;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/screens/screens.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n  padding-bottom: 5rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.select-all-row {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 0.75rem;\n  padding: 0.25rem 0;\n}\n.select-all-label {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.screen-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));\n  gap: 1rem;\n}\n.screen-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.25rem;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.screen-card:hover,\n.screen-card:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.screen-card.selected {\n  border-color: var(--color-accent);\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n}\n.card-header {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.screen-name {\n  font-size: 1rem;\n  font-weight: 600;\n  flex: 1;\n}\n.status-dot {\n  width: 0.625rem;\n  height: 0.625rem;\n  border-radius: 50%;\n  flex-shrink: 0;\n}\n.status-dot.online {\n  background: #22c55e;\n  box-shadow: 0 0 6px #22c55e80;\n}\n.status-dot.offline {\n  background: #ef4444;\n  box-shadow: 0 0 6px #ef444480;\n}\n.card-body {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.card-field {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.8125rem;\n}\n.card-label {\n  color: var(--color-text-secondary);\n}\n.card-value {\n  color: var(--color-text-primary);\n}\n.status-text.online {\n  color: #22c55e;\n}\n.status-text.offline {\n  color: #ef4444;\n}\n.detail-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.detail-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.detail-header h2 {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.detail-actions {\n  display: flex;\n  gap: 0.5rem;\n}\n.detail-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.25rem;\n  margin-bottom: 2rem;\n}\n.detail-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-label {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.status-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.status-badge.online {\n  background: #22c55e20;\n  color: #22c55e;\n}\n.status-badge.offline {\n  background: #ef444420;\n  color: #ef4444;\n}\n.api-key-section {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.5rem;\n}\n.api-key-section h3 {\n  margin: 0 0 0.5rem;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.text-muted {\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  margin: 0 0 1rem;\n  line-height: 1.5;\n}\n.form-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.form-card h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.api-key-warning {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.api-key-display {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.75rem;\n  margin-bottom: 1rem;\n}\n.api-key-value {\n  flex: 1;\n  font-size: 0.75rem;\n  word-break: break-all;\n  color: var(--color-accent);\n}\n.btn-copy {\n  flex-shrink: 0;\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.toast {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: toast-in 0.3s ease;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n.toast-warning {\n  background: #92400e;\n  color: #fef3c7;\n  border: 1px solid #d97706;\n}\n@keyframes toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n/*# sourceMappingURL=screens.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Screens, { className: "Screens", filePath: "src/app/screens/screens.ts", lineNumber: 751 });
})();
export {
  Screens
};
//# sourceMappingURL=chunk-H2U5XHBG.js.map
