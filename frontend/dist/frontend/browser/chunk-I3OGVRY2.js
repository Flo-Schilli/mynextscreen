import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDropList
} from "./chunk-2CGUZD7J.js";
import {
  ContentService
} from "./chunk-GVIOZNC5.js";
import "./chunk-3W6OO4XR.js";
import "./chunk-PHEIM2OP.js";
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
  MaxValidator,
  MinValidator,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-GQPSZY6K.js";
import {
  ActivatedRoute,
  Component,
  Router,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
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
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/screen-groups/screen-group-detail.ts
var _forTrack0 = ($index, $item) => $item.dropListId;
var _forTrack1 = ($index, $item) => $item.id;
function ScreenGroupDetail_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h1");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 10);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.group.name);
    \u0275\u0275advance();
    \u0275\u0275classProp("mirror", ctx_r0.group.mode === "mirror")("split", ctx_r0.group.mode === "split");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.group.mode === "mirror" ? "Mirror" : "Split", " ");
  }
}
function ScreenGroupDetail_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 11);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.openSwitchMode());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" Switch to ", ctx_r0.group.mode === "mirror" ? "Split" : "Mirror", " ");
  }
}
function ScreenGroupDetail_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.loadError);
  }
}
function ScreenGroupDetail_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading group details...");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 7);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.actionError);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_1_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 28);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275template(1, ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_1_div_1_Template, 1, 0, "div", 25);
    \u0275\u0275elementStart(2, "span", 26);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 27);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cell_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("cdkDragData", cell_r4.screen);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(cell_r4.screen.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", cell_r4.col, ",", cell_r4.row);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "span", 29);
    \u0275\u0275text(2, "Empty");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 27);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cell_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate2("", cell_r4.col, ",", cell_r4.row);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275listener("cdkDropListDropped", function ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Template_div_cdkDropListDropped_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.onDropToCell($event));
    });
    \u0275\u0275conditionalCreate(1, ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_1_Template, 6, 4, "div", 23)(2, ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Conditional_2_Template, 5, 2, "div", 24);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const cell_r4 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("occupied", cell_r4.screen)("dropping", ctx_r0.isDroppingOver === cell_r4.dropListId);
    \u0275\u0275property("id", cell_r4.dropListId)("cdkDropListData", cell_r4)("cdkDropListConnectedTo", ctx_r0.allDropListIds);
    \u0275\u0275advance();
    \u0275\u0275conditional(cell_r4.screen ? 1 : 2);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading screens...");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 19);
    \u0275\u0275text(1, "No unassigned screens available.");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 35);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 34);
    \u0275\u0275text(1, "In another group");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275template(1, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_div_1_Template, 1, 0, "div", 32);
    \u0275\u0275elementStart(2, "span", 33);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_Conditional_4_Template, 2, 0, "span", 34);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const screen_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275property("cdkDragData", screen_r6);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(screen_r6.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(screen_r6.groupId && screen_r6.groupId !== ctx_r0.group.id ? 4 : -1);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30);
    \u0275\u0275listener("cdkDropListDropped", function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_Template_div_cdkDropListDropped_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.onDropToSidebar($event));
    });
    \u0275\u0275repeaterCreate(1, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_For_2_Template, 5, 3, "div", 31, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275property("cdkDropListData", ctx_r0.availableScreens)("cdkDropListConnectedTo", ctx_r0.allDropListIds);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.availableScreens);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 6);
    \u0275\u0275text(1, "Loading content...");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_For_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 42);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r8 = ctx.$implicit;
    \u0275\u0275property("value", item_r8.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", item_r8.title, " (", item_r8.type, ")");
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "select", 40);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_Template_select_ngModelChange_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(4);
      \u0275\u0275twoWayBindingSet(ctx_r0.selectedContentId, $event) || (ctx_r0.selectedContentId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_Template_select_ngModelChange_0_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onPreviewContentSelect($event));
    });
    \u0275\u0275elementStart(1, "option", 41);
    \u0275\u0275text(2, "-- Select content --");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(3, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_For_4_Template, 2, 3, "option", 42, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.selectedContentId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.contentItems);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_8_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 45)(1, "span", 46);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cell_r9 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(5);
    \u0275\u0275styleProp("background-image", cell_r9.screen ? "url(" + ctx_r0.previewImageUrl + ")" : "none")("background-size", ctx_r0.getPreviewBgSize())("background-position", ctx_r0.getPreviewBgPosition(cell_r9.col, cell_r9.row));
    \u0275\u0275classProp("unassigned", !cell_r9.screen);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((cell_r9.screen == null ? null : cell_r9.screen.name) ?? "Empty");
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 43);
    \u0275\u0275repeaterCreate(1, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_8_For_2_Template, 3, 9, "div", 44, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275styleProp("grid-template-columns", "repeat(" + ctx_r0.group.gridColumns + ", 1fr)")("grid-template-rows", "repeat(" + ctx_r0.group.gridRows + ", 1fr)")("aspect-ratio", ctx_r0.previewAspectRatio);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.gridCells);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 21)(1, "h2", 15);
    \u0275\u0275text(2, "Preview Wall");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 36)(4, "label", 37);
    \u0275\u0275text(5, "Select content to preview:");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(6, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_6_Template, 2, 0, "span", 6)(7, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_7_Template, 5, 1, "select", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(8, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Conditional_8_Template, 3, 6, "div", 39);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(6);
    \u0275\u0275conditional(ctx_r0.loadingContent ? 6 : 7);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.previewImageUrl ? 8 : -1);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 13)(1, "div", 14)(2, "h2", 15);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 16);
    \u0275\u0275repeaterCreate(5, ScreenGroupDetail_Conditional_10_Conditional_0_For_6_Template, 3, 8, "div", 17, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 18)(8, "h2", 15);
    \u0275\u0275text(9, "Available Screens");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_10_Template, 2, 0, "p", 6)(11, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_11_Template, 2, 0, "p", 19)(12, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_12_Template, 3, 2, "div", 20);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(13, ScreenGroupDetail_Conditional_10_Conditional_0_Conditional_13_Template, 9, 2, "div", 21);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("Grid Layout (", ctx_r0.group.gridColumns, "x", ctx_r0.group.gridRows, ")");
    \u0275\u0275advance();
    \u0275\u0275styleProp("grid-template-columns", "repeat(" + ctx_r0.group.gridColumns + ", 1fr)")("grid-template-rows", "repeat(" + ctx_r0.group.gridRows + ", 1fr)");
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.gridCells);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r0.loadingScreens ? 10 : ctx_r0.availableScreens.length === 0 ? 11 : 12);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.allCellsAssigned ? 13 : -1);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 50)(1, "p");
    \u0275\u0275text(2, "No screens assigned to this group yet.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 52);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_7_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.openAddScreen());
    });
    \u0275\u0275text(4, "Add Screen");
    \u0275\u0275elementEnd()();
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_8_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 53)(1, "div", 54)(2, "span", 55);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 56);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "button", 57);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_8_For_2_Template_button_click_6_listener() {
      const screen_r13 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.removeScreenFromGroup(screen_r13.id));
    });
    \u0275\u0275text(7, " Remove ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const screen_r13 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(screen_r13.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(screen_r13.location);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.operationInProgress);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51);
    \u0275\u0275repeaterCreate(1, ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_8_For_2_Template, 8, 3, "div", 53, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.group.screens);
  }
}
function ScreenGroupDetail_Conditional_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 12)(1, "div", 47)(2, "div", 48)(3, "h2", 15);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 49);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_10_Conditional_1_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.openAddScreen());
    });
    \u0275\u0275text(6, "+ Add Screen");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(7, ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_7_Template, 5, 0, "div", 50)(8, ScreenGroupDetail_Conditional_10_Conditional_1_Conditional_8_Template, 3, 0, "div", 51);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("Assigned Screens (", ctx_r0.group.screens.length, ")");
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.group.screens.length === 0 ? 7 : 8);
  }
}
function ScreenGroupDetail_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, ScreenGroupDetail_Conditional_10_Conditional_0_Template, 14, 8);
    \u0275\u0275conditionalCreate(1, ScreenGroupDetail_Conditional_10_Conditional_1_Template, 9, 2, "div", 12);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r0.group.mode === "split" && ctx_r0.group.gridColumns && ctx_r0.group.gridRows ? 0 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.group.mode === "mirror" ? 1 : -1);
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading screens...");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "p", 19);
    \u0275\u0275text(1, "No unassigned screens available.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 60)(3, "button", 11);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_11_Conditional_5_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.cancelAddScreen());
    });
    \u0275\u0275text(4, "Close");
    \u0275\u0275elementEnd()();
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_6_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 34);
    \u0275\u0275text(1, "Already in another group");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 62)(1, "div", 63)(2, "span", 64);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ScreenGroupDetail_Conditional_11_Conditional_6_For_2_Conditional_4_Template, 2, 0, "span", 34);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 65);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_11_Conditional_6_For_2_Template_button_click_5_listener() {
      const screen_r18 = \u0275\u0275restoreView(_r17).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.addScreenMirror(screen_r18));
    });
    \u0275\u0275text(6, " Add ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const screen_r18 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(screen_r18.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(screen_r18.groupId && screen_r18.groupId !== ctx_r0.group.id ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.operationInProgress || !!(screen_r18.groupId && screen_r18.groupId !== ctx_r0.group.id));
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.addScreenError);
  }
}
function ScreenGroupDetail_Conditional_11_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 61);
    \u0275\u0275repeaterCreate(1, ScreenGroupDetail_Conditional_11_Conditional_6_For_2_Template, 7, 3, "div", 62, _forTrack1);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, ScreenGroupDetail_Conditional_11_Conditional_6_Conditional_3_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(4, "div", 60)(5, "button", 11);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_11_Conditional_6_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.cancelAddScreen());
    });
    \u0275\u0275text(6, "Close");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.availableScreens);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.addScreenError ? 3 : -1);
  }
}
function ScreenGroupDetail_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 58);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_11_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.cancelAddScreen());
    })("keydown.escape", function ScreenGroupDetail_Conditional_11_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.cancelAddScreen());
    });
    \u0275\u0275elementStart(1, "div", 59);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_11_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ScreenGroupDetail_Conditional_11_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Add Screen to Group");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ScreenGroupDetail_Conditional_11_Conditional_4_Template, 2, 0, "p", 6)(5, ScreenGroupDetail_Conditional_11_Conditional_5_Template, 5, 0)(6, ScreenGroupDetail_Conditional_11_Conditional_6_Template, 7, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r0.loadingScreens ? 4 : ctx_r0.availableScreens.length === 0 ? 5 : 6);
  }
}
function ScreenGroupDetail_Conditional_12_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 67);
    \u0275\u0275text(1, " Switching from Split to Mirror will clear all grid positions for assigned screens. This action cannot be undone. ");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroupDetail_Conditional_12_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 68)(1, "div", 70)(2, "label", 71);
    \u0275\u0275text(3, "Grid Columns");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 72);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroupDetail_Conditional_12_Conditional_5_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r20);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.switchGridColumns, $event) || (ctx_r0.switchGridColumns = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 70)(6, "label", 73);
    \u0275\u0275text(7, "Grid Rows");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 74);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroupDetail_Conditional_12_Conditional_5_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r20);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.switchGridRows, $event) || (ctx_r0.switchGridRows = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.switchGridColumns);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.switchGridRows);
  }
}
function ScreenGroupDetail_Conditional_12_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.switchError);
  }
}
function ScreenGroupDetail_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 66);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_12_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.cancelSwitchMode());
    })("keydown.escape", function ScreenGroupDetail_Conditional_12_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.cancelSwitchMode());
    });
    \u0275\u0275elementStart(1, "div", 59);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_12_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ScreenGroupDetail_Conditional_12_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Switch Mode");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ScreenGroupDetail_Conditional_12_Conditional_4_Template, 2, 0, "div", 67);
    \u0275\u0275conditionalCreate(5, ScreenGroupDetail_Conditional_12_Conditional_5_Template, 9, 2, "div", 68);
    \u0275\u0275conditionalCreate(6, ScreenGroupDetail_Conditional_12_Conditional_6_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(7, "div", 60)(8, "button", 11);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_12_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.cancelSwitchMode());
    });
    \u0275\u0275text(9, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 69);
    \u0275\u0275listener("click", function ScreenGroupDetail_Conditional_12_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.executeSwitchMode());
    });
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r0.group.mode === "split" ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.group.mode === "mirror" ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.switchError ? 6 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r0.switching);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.switching ? "Switching..." : "Confirm Switch", " ");
  }
}
var ScreenGroupDetail = class _ScreenGroupDetail {
  route = inject(ActivatedRoute);
  router = inject(Router);
  screenGroupService = inject(ScreenGroupService);
  screenService = inject(ScreenService);
  memberService = inject(MemberService);
  contentService = inject(ContentService);
  orgId = "";
  group = null;
  loading = true;
  loadError = "";
  actionError = "";
  operationInProgress = false;
  // All org screens (for available list)
  allScreens = [];
  loadingScreens = true;
  // Grid state (split mode)
  gridCells = [];
  allDropListIds = [];
  isDroppingOver = "";
  // Add screen modal (mirror mode)
  showAddScreen = false;
  addScreenError = "";
  // Switch mode
  showSwitchMode = false;
  switchGridColumns = 2;
  switchGridRows = 2;
  switchError = "";
  switching = false;
  // Wall preview state
  contentItems = [];
  loadingContent = false;
  selectedContentId = "";
  selectedContent = null;
  previewImageUrl = null;
  previewAspectRatio = "16 / 9";
  get allCellsAssigned() {
    if (!this.group || this.group.mode !== "split" || !this.group.gridColumns || !this.group.gridRows)
      return false;
    const totalCells = this.group.gridColumns * this.group.gridRows;
    return this.gridCells.length === totalCells && this.gridCells.every((cell) => cell.screen !== null);
  }
  ngOnInit() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const m = memberships.find((m2) => m2.role === "org_admin") ?? memberships[0];
        if (m) {
          this.orgId = m.organisationId;
          this.loadGroup();
          this.loadAllScreens();
          this.loadContentItems();
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
  loadGroup() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.loadError = "No group ID provided.";
      this.loading = false;
      return;
    }
    this.loading = true;
    this.loadError = "";
    this.screenGroupService.getOne(this.orgId, id).subscribe({
      next: (group) => {
        this.group = group;
        this.loading = false;
        if (group.mode === "split") {
          this.buildGrid();
        }
      },
      error: (err) => {
        this.loadError = err.status === 404 ? "Screen group not found." : "Failed to load screen group.";
        this.loading = false;
      }
    });
  }
  loadAllScreens() {
    this.loadingScreens = true;
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.allScreens = screens;
        this.loadingScreens = false;
        if (this.group?.mode === "split") {
          this.buildGrid();
        }
      },
      error: () => {
        this.loadingScreens = false;
      }
    });
  }
  get availableScreens() {
    if (!this.group)
      return [];
    const assignedIds = new Set(this.group.screens.map((s) => s.id));
    return this.allScreens.filter((s) => !assignedIds.has(s.id));
  }
  // --- Grid Builder ---
  buildGrid() {
    if (!this.group || this.group.mode !== "split" || !this.group.gridColumns || !this.group.gridRows)
      return;
    const cells = [];
    for (let row = 0; row < this.group.gridRows; row++) {
      for (let col = 0; col < this.group.gridColumns; col++) {
        const screen = this.group.screens.find((s) => s.gridRow === row && s.gridColumn === col) ?? null;
        cells.push({
          row,
          col,
          screen,
          dropListId: `cell-${row}-${col}`
        });
      }
    }
    this.gridCells = cells;
    this.allDropListIds = [
      "sidebar-list",
      ...cells.map((c) => c.dropListId)
    ];
  }
  // --- Drag & Drop (Split Mode) ---
  onDropToCell(event) {
    if (this.operationInProgress)
      return;
    const targetCell = event.container.data;
    const screen = event.item.data;
    if (targetCell.screen && targetCell.screen.id !== screen.id)
      return;
    const sourceContainerId = event.previousContainer.id;
    if (sourceContainerId === "sidebar-list") {
      this.assignScreenToCell(screen, targetCell);
    } else {
      const sourceCell = event.previousContainer.data;
      if (sourceCell.dropListId === targetCell.dropListId)
        return;
      this.moveScreenToCell(screen, sourceCell, targetCell);
    }
  }
  onDropToSidebar(event) {
    if (this.operationInProgress)
      return;
    const sourceContainerId = event.previousContainer.id;
    if (sourceContainerId === "sidebar-list")
      return;
    const screen = event.item.data;
    this.removeScreenFromGroup(screen.id);
  }
  assignScreenToCell(screen, cell) {
    if (!this.group)
      return;
    const fullScreen = this.allScreens.find((s) => s.id === screen.id);
    if (fullScreen && fullScreen.groupId && fullScreen.groupId !== this.group.id) {
      this.actionError = `Screen "${screen.name}" already belongs to another group.`;
      return;
    }
    this.operationInProgress = true;
    this.actionError = "";
    this.screenGroupService.assignScreen(this.orgId, this.group.id, screen.id, {
      gridRow: cell.row,
      gridColumn: cell.col
    }).subscribe({
      next: () => {
        this.operationInProgress = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to assign screen.";
        this.operationInProgress = false;
      }
    });
  }
  moveScreenToCell(screen, _sourceCell, targetCell) {
    if (!this.group)
      return;
    this.operationInProgress = true;
    this.actionError = "";
    this.screenGroupService.removeScreen(this.orgId, this.group.id, screen.id).subscribe({
      next: () => {
        this.screenGroupService.assignScreen(this.orgId, this.group.id, screen.id, {
          gridRow: targetCell.row,
          gridColumn: targetCell.col
        }).subscribe({
          next: () => {
            this.operationInProgress = false;
            this.refreshGroup();
          },
          error: (err) => {
            this.actionError = err.error?.message || "Failed to move screen.";
            this.operationInProgress = false;
            this.refreshGroup();
          }
        });
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to move screen.";
        this.operationInProgress = false;
      }
    });
  }
  // --- Remove Screen ---
  removeScreenFromGroup(screenId) {
    if (!this.group || this.operationInProgress)
      return;
    this.operationInProgress = true;
    this.actionError = "";
    this.screenGroupService.removeScreen(this.orgId, this.group.id, screenId).subscribe({
      next: () => {
        this.operationInProgress = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to remove screen.";
        this.operationInProgress = false;
      }
    });
  }
  // --- Mirror Mode: Add Screen ---
  openAddScreen() {
    this.addScreenError = "";
    this.showAddScreen = true;
    if (this.allScreens.length === 0) {
      this.loadAllScreens();
    }
  }
  cancelAddScreen() {
    this.showAddScreen = false;
  }
  addScreenMirror(screen) {
    if (!this.group || this.operationInProgress)
      return;
    if (screen.groupId && screen.groupId !== this.group.id) {
      this.addScreenError = `Screen "${screen.name}" already belongs to another group.`;
      return;
    }
    this.operationInProgress = true;
    this.addScreenError = "";
    this.screenGroupService.assignScreen(this.orgId, this.group.id, screen.id, {}).subscribe({
      next: () => {
        this.operationInProgress = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.addScreenError = err.error?.message || "Failed to add screen.";
        this.operationInProgress = false;
      }
    });
  }
  // --- Switch Mode ---
  openSwitchMode() {
    this.switchError = "";
    this.switchGridColumns = this.group?.gridColumns ?? 2;
    this.switchGridRows = this.group?.gridRows ?? 2;
    this.showSwitchMode = true;
  }
  cancelSwitchMode() {
    this.showSwitchMode = false;
  }
  executeSwitchMode() {
    if (!this.group)
      return;
    const newMode = this.group.mode === "mirror" ? "split" : "mirror";
    if (newMode === "split" && (!this.switchGridColumns || !this.switchGridRows)) {
      this.switchError = "Grid columns and rows are required for split mode.";
      return;
    }
    this.switching = true;
    this.switchError = "";
    const dto = { mode: newMode };
    if (newMode === "split") {
      dto.gridColumns = this.switchGridColumns;
      dto.gridRows = this.switchGridRows;
    }
    this.screenGroupService.update(this.orgId, this.group.id, dto).subscribe({
      next: () => {
        this.switching = false;
        this.showSwitchMode = false;
        this.refreshGroup();
      },
      error: (err) => {
        this.switchError = err.error?.message || "Failed to switch mode.";
        this.switching = false;
      }
    });
  }
  // --- Helpers ---
  refreshGroup() {
    if (!this.group)
      return;
    this.screenGroupService.getOne(this.orgId, this.group.id).subscribe({
      next: (group) => {
        this.group = group;
        if (group.mode === "split") {
          this.buildGrid();
        }
        this.loadAllScreens();
      },
      error: () => {
        this.actionError = "Failed to refresh group data.";
      }
    });
  }
  // --- Wall Preview ---
  loadContentItems() {
    this.loadingContent = true;
    this.contentService.getAll(this.orgId).subscribe({
      next: (items) => {
        this.contentItems = items.filter((i) => i.transcodingStatus === "completed" || i.type === "image" && i.transcodingStatus !== "failed");
        this.loadingContent = false;
      },
      error: () => {
        this.loadingContent = false;
      }
    });
  }
  onPreviewContentSelect(contentId) {
    if (!contentId) {
      this.selectedContent = null;
      this.previewImageUrl = null;
      return;
    }
    const content = this.contentItems.find((c) => c.id === contentId);
    if (!content)
      return;
    this.selectedContent = content;
    const url = this.getContentPreviewUrl(content);
    if (content.type === "image") {
      const img = new Image();
      img.onload = () => {
        this.previewAspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        this.previewImageUrl = url;
      };
      img.onerror = () => {
        this.previewAspectRatio = "16 / 9";
        this.previewImageUrl = url;
      };
      img.src = url;
    } else {
      this.extractVideoThumbnail(url);
    }
  }
  extractVideoThumbnail(url) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = 0;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.previewAspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        this.previewImageUrl = canvas.toDataURL("image/jpeg");
      }
    };
    video.onerror = () => {
      this.previewAspectRatio = "16 / 9";
      this.previewImageUrl = url;
    };
    video.src = url;
  }
  getContentPreviewUrl(content) {
    if (content.transcodingStatus === "completed") {
      return this.contentService.getTranscodedUrl(content.id);
    }
    return this.contentService.getOriginalUrl(content.id);
  }
  getPreviewBgSize() {
    if (!this.group?.gridColumns || !this.group?.gridRows)
      return "100% 100%";
    return `${this.group.gridColumns * 100}% ${this.group.gridRows * 100}%`;
  }
  getPreviewBgPosition(col, row) {
    const cols = this.group?.gridColumns ?? 1;
    const rows = this.group?.gridRows ?? 1;
    const xPct = cols > 1 ? col / (cols - 1) * 100 : 0;
    const yPct = rows > 1 ? row / (rows - 1) * 100 : 0;
    return `${xPct}% ${yPct}%`;
  }
  goBack() {
    this.router.navigate(["/screen-groups"]);
  }
  static \u0275fac = function ScreenGroupDetail_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScreenGroupDetail)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ScreenGroupDetail, selectors: [["app-screen-group-detail"]], decls: 13, vars: 8, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-secondary"], [1, "error"], [1, "loading-text"], [1, "error", "action-error"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add Screen", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Switch mode", "tabindex", "0", 1, "modal-overlay"], [1, "mode-badge"], [1, "btn", "btn-secondary", 3, "click"], [1, "mirror-layout"], [1, "grid-editor-layout"], [1, "grid-section"], [1, "section-title"], [1, "grid-container"], ["cdkDropList", "", 1, "grid-cell", 3, "id", "cdkDropListData", "cdkDropListConnectedTo", "occupied", "dropping"], [1, "sidebar-section"], [1, "sidebar-empty"], ["cdkDropList", "", "id", "sidebar-list", 1, "sidebar-list", 3, "cdkDropListData", "cdkDropListConnectedTo"], [1, "wall-preview-section"], ["cdkDropList", "", 1, "grid-cell", 3, "cdkDropListDropped", "id", "cdkDropListData", "cdkDropListConnectedTo"], ["cdkDrag", "", 1, "cell-screen", 3, "cdkDragData"], [1, "cell-empty"], ["class", "cell-screen-placeholder", 4, "cdkDragPlaceholder"], [1, "cell-screen-name"], [1, "cell-position"], [1, "cell-screen-placeholder"], [1, "cell-empty-label"], ["cdkDropList", "", "id", "sidebar-list", 1, "sidebar-list", 3, "cdkDropListDropped", "cdkDropListData", "cdkDropListConnectedTo"], ["cdkDrag", "", 1, "sidebar-screen", 3, "cdkDragData"], ["class", "sidebar-screen-placeholder", 4, "cdkDragPlaceholder"], [1, "sidebar-screen-name"], [1, "already-assigned-badge"], [1, "sidebar-screen-placeholder"], [1, "preview-content-picker"], ["for", "previewContentSelect"], ["id", "previewContentSelect", 3, "ngModel"], [1, "preview-grid", 3, "grid-template-columns", "grid-template-rows", "aspect-ratio"], ["id", "previewContentSelect", 3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], [1, "preview-grid"], [1, "preview-cell", 3, "unassigned", "background-image", "background-size", "background-position"], [1, "preview-cell"], [1, "preview-label"], [1, "mirror-section"], [1, "mirror-header"], [1, "btn", "btn-primary", "btn-small", 3, "click"], [1, "mirror-empty"], [1, "mirror-list"], [1, "btn", "btn-primary", 3, "click"], [1, "mirror-screen"], [1, "mirror-screen-info"], [1, "mirror-screen-name"], [1, "mirror-screen-location"], [1, "btn", "btn-small", "btn-danger", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add Screen", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [1, "form-actions"], [1, "add-screen-list"], [1, "add-screen-item"], [1, "add-screen-info"], [1, "add-screen-name"], [1, "btn", "btn-small", "btn-primary", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Switch mode", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "warning-box"], [1, "form-row"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "form-group"], ["for", "switchGridColumns"], ["id", "switchGridColumns", "type", "number", "name", "switchGridColumns", "required", "", "min", "1", "max", "10", 3, "ngModelChange", "ngModel"], ["for", "switchGridRows"], ["id", "switchGridRows", "type", "number", "name", "switchGridRows", "required", "", "min", "1", "max", "10", 3, "ngModelChange", "ngModel"]], template: function ScreenGroupDetail_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function ScreenGroupDetail_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back to Groups");
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(5, ScreenGroupDetail_Conditional_5_Template, 4, 6);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(6, ScreenGroupDetail_Conditional_6_Template, 2, 1, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(7, ScreenGroupDetail_Conditional_7_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(8, ScreenGroupDetail_Conditional_8_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(9, ScreenGroupDetail_Conditional_9_Template, 2, 1, "p", 7);
      \u0275\u0275conditionalCreate(10, ScreenGroupDetail_Conditional_10_Template, 2, 2);
      \u0275\u0275conditionalCreate(11, ScreenGroupDetail_Conditional_11_Template, 7, 1, "div", 8);
      \u0275\u0275conditionalCreate(12, ScreenGroupDetail_Conditional_12_Template, 12, 5, "div", 9);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(5);
      \u0275\u0275conditional(ctx.group ? 5 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.group ? 6 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.group && !ctx.loading ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAddScreen ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showSwitchMode ? 12 : -1);
    }
  }, dependencies: [FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, RequiredValidator, MinValidator, MaxValidator, NgModel, CdkDrag, CdkDropList, CdkDragPlaceholder], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.mode-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.mode-badge.mirror[_ngcontent-%COMP%] {\n  background: #3b82f620;\n  color: #3b82f6;\n}\n.mode-badge.split[_ngcontent-%COMP%] {\n  background: #a855f720;\n  color: #a855f7;\n}\n.section-title[_ngcontent-%COMP%] {\n  font-size: 1rem;\n  font-weight: 600;\n  margin: 0 0 1rem;\n}\n.grid-editor-layout[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 18rem;\n  gap: 1.5rem;\n  align-items: start;\n}\n.grid-section[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.grid-container[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 0.5rem;\n  aspect-ratio: auto;\n}\n.grid-cell[_ngcontent-%COMP%] {\n  border: 2px dashed var(--color-border);\n  border-radius: 0.375rem;\n  min-height: 5rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: border-color 0.15s, background-color 0.15s;\n  position: relative;\n}\n.grid-cell.occupied[_ngcontent-%COMP%] {\n  border-style: solid;\n  border-color: var(--color-accent);\n  background: var(--color-accent)08;\n}\n.grid-cell.cdk-drop-list-dragging[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n  background: var(--color-accent)12;\n}\n.cell-screen[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.75rem;\n  cursor: grab;\n  width: 100%;\n  height: 100%;\n  justify-content: center;\n  box-sizing: border-box;\n}\n.cell-screen[_ngcontent-%COMP%]:active {\n  cursor: grabbing;\n}\n.cell-screen-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  text-align: center;\n  word-break: break-word;\n}\n.cell-position[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.cell-empty[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n}\n.cell-empty-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.cell-screen-placeholder[_ngcontent-%COMP%], \n.sidebar-screen-placeholder[_ngcontent-%COMP%] {\n  background: var(--color-accent)20;\n  border: 2px dashed var(--color-accent);\n  border-radius: 0.375rem;\n  min-height: 3rem;\n}\n.cdk-drag-preview[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  padding: 0.5rem 1rem;\n  box-shadow: 0 4px 12px var(--color-shadow);\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n}\n.cdk-drag-animating[_ngcontent-%COMP%] {\n  transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);\n}\n.sidebar-section[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.sidebar-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  min-height: 3rem;\n}\n.sidebar-screen[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  cursor: grab;\n  transition: border-color 0.15s;\n}\n.sidebar-screen[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-accent);\n}\n.sidebar-screen[_ngcontent-%COMP%]:active {\n  cursor: grabbing;\n}\n.sidebar-screen-name[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n}\n.sidebar-empty[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.already-assigned-badge[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: #f59e0b;\n  background: #f59e0b18;\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n}\n.mirror-layout[_ngcontent-%COMP%] {\n  max-width: 40rem;\n}\n.mirror-section[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.mirror-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.mirror-header[_ngcontent-%COMP%]   .section-title[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.mirror-empty[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem 1rem;\n  color: var(--color-text-muted);\n}\n.mirror-empty[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n}\n.mirror-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.mirror-screen[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n}\n.mirror-screen-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.mirror-screen-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.mirror-screen-location[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.add-screen-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 20rem;\n  overflow-y: auto;\n  margin-bottom: 1rem;\n}\n.add-screen-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n}\n.add-screen-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.add-screen-name[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.warning-box[_ngcontent-%COMP%] {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.action-error[_ngcontent-%COMP%] {\n  background: #991b1b20;\n  border: 1px solid #991b1b;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.wall-preview-section[_ngcontent-%COMP%] {\n  margin-top: 1.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.preview-content-picker[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n}\n.preview-content-picker[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n}\n.preview-content-picker[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  flex: 1;\n  max-width: 24rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n}\n.preview-content-picker[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.preview-grid[_ngcontent-%COMP%] {\n  display: grid;\n  border: 2px solid var(--color-text-muted);\n  border-radius: 0.375rem;\n  overflow: hidden;\n  max-width: 48rem;\n}\n.preview-cell[_ngcontent-%COMP%] {\n  position: relative;\n  border: 1px solid var(--color-text-muted);\n  background-repeat: no-repeat;\n  display: flex;\n  align-items: flex-end;\n  justify-content: center;\n  min-height: 4rem;\n}\n.preview-cell.unassigned[_ngcontent-%COMP%] {\n  background:\n    repeating-linear-gradient(\n      45deg,\n      var(--color-bg-tertiary),\n      var(--color-bg-tertiary) 8px,\n      var(--color-border) 8px,\n      var(--color-border) 16px);\n}\n.preview-label[_ngcontent-%COMP%] {\n  background: rgba(0, 0, 0, 0.65);\n  color: #fff;\n  font-size: 0.6875rem;\n  font-weight: 600;\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n  margin-bottom: 0.25rem;\n  max-width: 90%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n@media (max-width: 768px) {\n  .page[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .page-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .grid-editor-layout[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .form-row[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .modal[_ngcontent-%COMP%] {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=screen-group-detail.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScreenGroupDetail, [{
    type: Component,
    args: [{ selector: "app-screen-group-detail", standalone: true, imports: [FormsModule, CdkDrag, CdkDropList, CdkDragPlaceholder], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back to Groups</button>
          @if (group) {
            <h1>{{ group.name }}</h1>
            <span class="mode-badge" [class.mirror]="group.mode === 'mirror'" [class.split]="group.mode === 'split'">
              {{ group.mode === 'mirror' ? 'Mirror' : 'Split' }}
            </span>
          }
        </div>
        @if (group) {
          <button class="btn btn-secondary" (click)="openSwitchMode()">
            Switch to {{ group.mode === 'mirror' ? 'Split' : 'Mirror' }}
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading group details...</p>
      }

      @if (actionError) {
        <p class="error action-error">{{ actionError }}</p>
      }

      @if (group && !loading) {
        <!-- Split mode: Grid Editor -->
        @if (group.mode === 'split' && group.gridColumns && group.gridRows) {
          <div class="grid-editor-layout">
            <div class="grid-section">
              <h2 class="section-title">Grid Layout ({{ group.gridColumns }}x{{ group.gridRows }})</h2>
              <div class="grid-container"
                   [style.grid-template-columns]="'repeat(' + group.gridColumns + ', 1fr)'"
                   [style.grid-template-rows]="'repeat(' + group.gridRows + ', 1fr)'">
                @for (cell of gridCells; track cell.dropListId) {
                  <div class="grid-cell"
                       cdkDropList
                       [id]="cell.dropListId"
                       [cdkDropListData]="cell"
                       [cdkDropListConnectedTo]="allDropListIds"
                       (cdkDropListDropped)="onDropToCell($event)"
                       [class.occupied]="cell.screen"
                       [class.dropping]="isDroppingOver === cell.dropListId">
                    @if (cell.screen) {
                      <div class="cell-screen" cdkDrag [cdkDragData]="cell.screen">
                        <div class="cell-screen-placeholder" *cdkDragPlaceholder></div>
                        <span class="cell-screen-name">{{ cell.screen.name }}</span>
                        <span class="cell-position">{{ cell.col }},{{ cell.row }}</span>
                      </div>
                    } @else {
                      <div class="cell-empty">
                        <span class="cell-empty-label">Empty</span>
                        <span class="cell-position">{{ cell.col }},{{ cell.row }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="sidebar-section">
              <h2 class="section-title">Available Screens</h2>
              @if (loadingScreens) {
                <p class="loading-text">Loading screens...</p>
              } @else if (availableScreens.length === 0) {
                <p class="sidebar-empty">No unassigned screens available.</p>
              } @else {
                <div class="sidebar-list"
                     cdkDropList
                     id="sidebar-list"
                     [cdkDropListData]="availableScreens"
                     [cdkDropListConnectedTo]="allDropListIds"
                     (cdkDropListDropped)="onDropToSidebar($event)">
                  @for (screen of availableScreens; track screen.id) {
                    <div class="sidebar-screen" cdkDrag [cdkDragData]="screen">
                      <div class="sidebar-screen-placeholder" *cdkDragPlaceholder></div>
                      <span class="sidebar-screen-name">{{ screen.name }}</span>
                      @if (screen.groupId && screen.groupId !== group.id) {
                        <span class="already-assigned-badge">In another group</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Wall Preview -->
          @if (allCellsAssigned) {
            <div class="wall-preview-section">
              <h2 class="section-title">Preview Wall</h2>
              <div class="preview-content-picker">
                <label for="previewContentSelect">Select content to preview:</label>
                @if (loadingContent) {
                  <span class="loading-text">Loading content...</span>
                } @else {
                  <select id="previewContentSelect" [(ngModel)]="selectedContentId" (ngModelChange)="onPreviewContentSelect($event)">
                    <option value="">-- Select content --</option>
                    @for (item of contentItems; track item.id) {
                      <option [value]="item.id">{{ item.title }} ({{ item.type }})</option>
                    }
                  </select>
                }
              </div>
              @if (previewImageUrl) {
                <div class="preview-grid"
                     [style.grid-template-columns]="'repeat(' + group.gridColumns + ', 1fr)'"
                     [style.grid-template-rows]="'repeat(' + group.gridRows + ', 1fr)'"
                     [style.aspect-ratio]="previewAspectRatio">
                  @for (cell of gridCells; track cell.dropListId) {
                    <div class="preview-cell"
                         [class.unassigned]="!cell.screen"
                         [style.background-image]="cell.screen ? 'url(' + previewImageUrl + ')' : 'none'"
                         [style.background-size]="getPreviewBgSize()"
                         [style.background-position]="getPreviewBgPosition(cell.col, cell.row)">
                      <span class="preview-label">{{ cell.screen?.name ?? 'Empty' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- Mirror mode: Simple List -->
        @if (group.mode === 'mirror') {
          <div class="mirror-layout">
            <div class="mirror-section">
              <div class="mirror-header">
                <h2 class="section-title">Assigned Screens ({{ group.screens.length }})</h2>
                <button class="btn btn-primary btn-small" (click)="openAddScreen()">+ Add Screen</button>
              </div>
              @if (group.screens.length === 0) {
                <div class="mirror-empty">
                  <p>No screens assigned to this group yet.</p>
                  <button class="btn btn-primary" (click)="openAddScreen()">Add Screen</button>
                </div>
              } @else {
                <div class="mirror-list">
                  @for (screen of group.screens; track screen.id) {
                    <div class="mirror-screen">
                      <div class="mirror-screen-info">
                        <span class="mirror-screen-name">{{ screen.name }}</span>
                        <span class="mirror-screen-location">{{ screen.location }}</span>
                      </div>
                      <button class="btn btn-small btn-danger" (click)="removeScreenFromGroup(screen.id)" [disabled]="operationInProgress">
                        Remove
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Add Screen Modal (Mirror mode) -->
      @if (showAddScreen) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Screen"
             tabindex="0" (click)="cancelAddScreen()" (keydown.escape)="cancelAddScreen()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add Screen to Group</h2>
            @if (loadingScreens) {
              <p class="loading-text">Loading screens...</p>
            } @else if (availableScreens.length === 0) {
              <p class="sidebar-empty">No unassigned screens available.</p>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelAddScreen()">Close</button>
              </div>
            } @else {
              <div class="add-screen-list">
                @for (screen of availableScreens; track screen.id) {
                  <div class="add-screen-item">
                    <div class="add-screen-info">
                      <span class="add-screen-name">{{ screen.name }}</span>
                      @if (screen.groupId && screen.groupId !== group!.id) {
                        <span class="already-assigned-badge">Already in another group</span>
                      }
                    </div>
                    <button class="btn btn-small btn-primary"
                            (click)="addScreenMirror(screen)"
                            [disabled]="operationInProgress || !!(screen.groupId && screen.groupId !== group!.id)">
                      Add
                    </button>
                  </div>
                }
              </div>
              @if (addScreenError) {
                <p class="error">{{ addScreenError }}</p>
              }
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelAddScreen()">Close</button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Switch Mode Confirmation Modal -->
      @if (showSwitchMode) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Switch mode"
             tabindex="0" (click)="cancelSwitchMode()" (keydown.escape)="cancelSwitchMode()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Switch Mode</h2>
            @if (group!.mode === 'split') {
              <div class="warning-box">
                Switching from Split to Mirror will clear all grid positions for assigned screens. This action cannot be undone.
              </div>
            }
            @if (group!.mode === 'mirror') {
              <div class="form-row">
                <div class="form-group">
                  <label for="switchGridColumns">Grid Columns</label>
                  <input id="switchGridColumns" type="number" [(ngModel)]="switchGridColumns" name="switchGridColumns" required min="1" max="10" />
                </div>
                <div class="form-group">
                  <label for="switchGridRows">Grid Rows</label>
                  <input id="switchGridRows" type="number" [(ngModel)]="switchGridRows" name="switchGridRows" required min="1" max="10" />
                </div>
              </div>
            }
            @if (switchError) {
              <p class="error">{{ switchError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelSwitchMode()">Cancel</button>
              <button class="btn btn-primary" (click)="executeSwitchMode()" [disabled]="switching">
                {{ switching ? 'Switching...' : 'Confirm Switch' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;42e90a3864230712d2feb6f88d8950b0ea3fb91b43545e0a6ad3921b3c8afe9c;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/screen-groups/screen-group-detail.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-small {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.mode-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.mode-badge.mirror {\n  background: #3b82f620;\n  color: #3b82f6;\n}\n.mode-badge.split {\n  background: #a855f720;\n  color: #a855f7;\n}\n.section-title {\n  font-size: 1rem;\n  font-weight: 600;\n  margin: 0 0 1rem;\n}\n.grid-editor-layout {\n  display: grid;\n  grid-template-columns: 1fr 18rem;\n  gap: 1.5rem;\n  align-items: start;\n}\n.grid-section {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.grid-container {\n  display: grid;\n  gap: 0.5rem;\n  aspect-ratio: auto;\n}\n.grid-cell {\n  border: 2px dashed var(--color-border);\n  border-radius: 0.375rem;\n  min-height: 5rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: border-color 0.15s, background-color 0.15s;\n  position: relative;\n}\n.grid-cell.occupied {\n  border-style: solid;\n  border-color: var(--color-accent);\n  background: var(--color-accent)08;\n}\n.grid-cell.cdk-drop-list-dragging {\n  border-color: var(--color-accent);\n  background: var(--color-accent)12;\n}\n.cell-screen {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.75rem;\n  cursor: grab;\n  width: 100%;\n  height: 100%;\n  justify-content: center;\n  box-sizing: border-box;\n}\n.cell-screen:active {\n  cursor: grabbing;\n}\n.cell-screen-name {\n  font-size: 0.875rem;\n  font-weight: 500;\n  text-align: center;\n  word-break: break-word;\n}\n.cell-position {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.cell-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n}\n.cell-empty-label {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.cell-screen-placeholder,\n.sidebar-screen-placeholder {\n  background: var(--color-accent)20;\n  border: 2px dashed var(--color-accent);\n  border-radius: 0.375rem;\n  min-height: 3rem;\n}\n.cdk-drag-preview {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  padding: 0.5rem 1rem;\n  box-shadow: 0 4px 12px var(--color-shadow);\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n}\n.cdk-drag-animating {\n  transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);\n}\n.sidebar-section {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.sidebar-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  min-height: 3rem;\n}\n.sidebar-screen {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  cursor: grab;\n  transition: border-color 0.15s;\n}\n.sidebar-screen:hover {\n  border-color: var(--color-accent);\n}\n.sidebar-screen:active {\n  cursor: grabbing;\n}\n.sidebar-screen-name {\n  font-size: 0.8125rem;\n  font-weight: 500;\n}\n.sidebar-empty {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.already-assigned-badge {\n  font-size: 0.6875rem;\n  color: #f59e0b;\n  background: #f59e0b18;\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n}\n.mirror-layout {\n  max-width: 40rem;\n}\n.mirror-section {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.mirror-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.mirror-header .section-title {\n  margin: 0;\n}\n.mirror-empty {\n  text-align: center;\n  padding: 2rem 1rem;\n  color: var(--color-text-muted);\n}\n.mirror-empty p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n}\n.mirror-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.mirror-screen {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n}\n.mirror-screen-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.mirror-screen-name {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.mirror-screen-location {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.add-screen-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  max-height: 20rem;\n  overflow-y: auto;\n  margin-bottom: 1rem;\n}\n.add-screen-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n}\n.add-screen-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.add-screen-name {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.warning-box {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.action-error {\n  background: #991b1b20;\n  border: 1px solid #991b1b;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.wall-preview-section {\n  margin-top: 1.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n}\n.preview-content-picker {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n}\n.preview-content-picker label {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n}\n.preview-content-picker select {\n  flex: 1;\n  max-width: 24rem;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n}\n.preview-content-picker select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.preview-grid {\n  display: grid;\n  border: 2px solid var(--color-text-muted);\n  border-radius: 0.375rem;\n  overflow: hidden;\n  max-width: 48rem;\n}\n.preview-cell {\n  position: relative;\n  border: 1px solid var(--color-text-muted);\n  background-repeat: no-repeat;\n  display: flex;\n  align-items: flex-end;\n  justify-content: center;\n  min-height: 4rem;\n}\n.preview-cell.unassigned {\n  background:\n    repeating-linear-gradient(\n      45deg,\n      var(--color-bg-tertiary),\n      var(--color-bg-tertiary) 8px,\n      var(--color-border) 8px,\n      var(--color-border) 16px);\n}\n.preview-label {\n  background: rgba(0, 0, 0, 0.65);\n  color: #fff;\n  font-size: 0.6875rem;\n  font-weight: 600;\n  padding: 0.125rem 0.375rem;\n  border-radius: 0.25rem;\n  margin-bottom: 0.25rem;\n  max-width: 90%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n@media (max-width: 768px) {\n  .page {\n    padding: 1rem;\n  }\n  .page-header {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .grid-editor-layout {\n    grid-template-columns: 1fr;\n  }\n  .form-row {\n    grid-template-columns: 1fr;\n  }\n  .modal {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=screen-group-detail.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ScreenGroupDetail, { className: "ScreenGroupDetail", filePath: "src/app/screen-groups/screen-group-detail.ts", lineNumber: 787 });
})();
export {
  ScreenGroupDetail
};
//# sourceMappingURL=chunk-I3OGVRY2.js.map
