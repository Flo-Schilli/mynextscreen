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
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  Router,
  __spreadValues,
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
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
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

// src/app/screen-groups/screen-groups.ts
var _forTrack0 = ($index, $item) => $item.id;
function ScreenGroups_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 12);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(1, " + New Group ");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroups_Conditional_8_Template(rf, ctx) {
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
function ScreenGroups_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading screen groups...");
    \u0275\u0275elementEnd();
  }
}
function ScreenGroups_Conditional_10_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 23)(1, "div", 16)(2, "label", 27);
    \u0275\u0275text(3, "Grid Columns");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 28);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_10_Conditional_17_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.createGridColumns, $event) || (ctx_r1.createGridColumns = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 16)(6, "label", 29);
    \u0275\u0275text(7, "Grid Rows");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 30);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_10_Conditional_17_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.createGridRows, $event) || (ctx_r1.createGridRows = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createGridColumns);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createGridRows);
  }
}
function ScreenGroups_Conditional_10_Conditional_18_Template(rf, ctx) {
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
function ScreenGroups_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 13);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_10_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    })("keydown.escape", function ScreenGroups_Conditional_10_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275elementStart(1, "div", 14);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_10_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ScreenGroups_Conditional_10_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Create Screen Group");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 15);
    \u0275\u0275listener("ngSubmit", function ScreenGroups_Conditional_10_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitCreate());
    });
    \u0275\u0275elementStart(5, "div", 16)(6, "label", 17);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 18);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_10_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createName, $event) || (ctx_r1.createName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 16)(10, "label", 19);
    \u0275\u0275text(11, "Mode");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 20);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_10_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createMode, $event) || (ctx_r1.createMode = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 21);
    \u0275\u0275text(14, "Mirror");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 22);
    \u0275\u0275text(16, "Split (Video Wall)");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(17, ScreenGroups_Conditional_10_Conditional_17_Template, 9, 2, "div", 23);
    \u0275\u0275conditionalCreate(18, ScreenGroups_Conditional_10_Conditional_18_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(19, "div", 24)(20, "button", 25);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_10_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275text(21, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 26);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createMode);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.createMode === "split" ? 17 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.createError ? 18 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.creating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.creating ? "Creating..." : "Create Group", " ");
  }
}
function ScreenGroups_Conditional_11_For_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 31)(2, "a", 32);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_11_For_16_Template_a_click_2_listener() {
      const group_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.viewGroup(group_r6));
    })("keydown.enter", function ScreenGroups_Conditional_11_For_16_Template_a_keydown_enter_2_listener() {
      const group_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.viewGroup(group_r6));
    });
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "td")(5, "span", 33);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "td");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td", 34)(12, "button", 35);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_11_For_16_Template_button_click_12_listener() {
      const group_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.editGroup(group_r6));
    });
    \u0275\u0275text(13, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "button", 36);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_11_For_16_Template_button_click_14_listener() {
      const group_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.confirmDelete(group_r6));
    });
    \u0275\u0275text(15, "Delete");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const group_r6 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(group_r6.name);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("mirror", group_r6.mode === "mirror")("split", group_r6.mode === "split");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", group_r6.mode === "mirror" ? "Mirror" : "Split", " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(group_r6.mode === "split" && group_r6.gridColumns && group_r6.gridRows ? group_r6.gridColumns + "x" + group_r6.gridRows : "-");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(group_r6.screens.length);
  }
}
function ScreenGroups_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Mode");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Grid Size");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Screen Count");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275repeaterCreate(15, ScreenGroups_Conditional_11_For_16_Template, 16, 8, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(15);
    \u0275\u0275repeater(ctx_r1.groups);
  }
}
function ScreenGroups_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 37);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(2, "svg", 38);
    \u0275\u0275element(3, "rect", 39)(4, "rect", 40)(5, "rect", 41)(6, "rect", 42)(7, "path", 43);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(8, "p", 44);
    \u0275\u0275text(9, "No screen groups yet");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "p", 45);
    \u0275\u0275text(11, "Create your first screen group to start building mirror displays or video walls.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 12);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_12_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(13, "Create Your First Group");
    \u0275\u0275elementEnd()();
  }
}
function ScreenGroups_Conditional_13_Template(rf, ctx) {
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
function ScreenGroups_Conditional_14_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 23)(1, "div", 16)(2, "label", 51);
    \u0275\u0275text(3, "Grid Columns");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 52);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_14_Conditional_17_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editGridColumns, $event) || (ctx_r1.editGridColumns = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 16)(6, "label", 53);
    \u0275\u0275text(7, "Grid Rows");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 54);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_14_Conditional_17_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editGridRows, $event) || (ctx_r1.editGridRows = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editGridColumns);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editGridRows);
  }
}
function ScreenGroups_Conditional_14_Conditional_18_Template(rf, ctx) {
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
function ScreenGroups_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_14_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    })("keydown.escape", function ScreenGroups_Conditional_14_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    });
    \u0275\u0275elementStart(1, "div", 14);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_14_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ScreenGroups_Conditional_14_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Edit Screen Group");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 15);
    \u0275\u0275listener("ngSubmit", function ScreenGroups_Conditional_14_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitEdit());
    });
    \u0275\u0275elementStart(5, "div", 16)(6, "label", 47);
    \u0275\u0275text(7, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 48);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_14_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editName, $event) || (ctx_r1.editName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 16)(10, "label", 49);
    \u0275\u0275text(11, "Mode");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 50);
    \u0275\u0275twoWayListener("ngModelChange", function ScreenGroups_Conditional_14_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editMode, $event) || (ctx_r1.editMode = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 21);
    \u0275\u0275text(14, "Mirror");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 22);
    \u0275\u0275text(16, "Split (Video Wall)");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(17, ScreenGroups_Conditional_14_Conditional_17_Template, 9, 2, "div", 23);
    \u0275\u0275conditionalCreate(18, ScreenGroups_Conditional_14_Conditional_18_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(19, "div", 24)(20, "button", 25);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_14_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelEdit());
    });
    \u0275\u0275text(21, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 26);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editMode);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.editMode === "split" ? 17 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editError ? 18 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.saving);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.saving ? "Saving..." : "Save Changes", " ");
  }
}
function ScreenGroups_Conditional_15_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 56);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 24)(3, "button", 57);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_15_Conditional_4_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275text(4, "Close");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(' Cannot delete "', ctx_r1.deletingGroup.name, '" because it still has ', ctx_r1.deletingGroup.screens.length, " assigned screen(s). Remove all screens from the group before deleting it. ");
  }
}
function ScreenGroups_Conditional_15_Conditional_5_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.deleteError);
  }
}
function ScreenGroups_Conditional_15_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "p");
    \u0275\u0275text(1, "Are you sure you want to delete the screen group ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, "? This action cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(5, ScreenGroups_Conditional_15_Conditional_5_Conditional_5_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(6, "div", 24)(7, "button", 57);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_15_Conditional_5_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275text(8, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 58);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_15_Conditional_5_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.executeDelete());
    });
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.deletingGroup.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.deleteError ? 5 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.deleting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.deleting ? "Deleting..." : "Delete", " ");
  }
}
function ScreenGroups_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 55);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_15_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    })("keydown.escape", function ScreenGroups_Conditional_15_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275elementStart(1, "div", 14);
    \u0275\u0275listener("click", function ScreenGroups_Conditional_15_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ScreenGroups_Conditional_15_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Screen Group");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ScreenGroups_Conditional_15_Conditional_4_Template, 5, 2)(5, ScreenGroups_Conditional_15_Conditional_5_Template, 11, 4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.deletingGroup.screens.length > 0 ? 4 : 5);
  }
}
var ScreenGroups = class _ScreenGroups {
  screenGroupService = inject(ScreenGroupService);
  memberService = inject(MemberService);
  router = inject(Router);
  orgId = "";
  groups = [];
  loading = true;
  loadError = "";
  actionError = "";
  // Create form state
  showCreateForm = false;
  createName = "";
  createMode = "mirror";
  createGridColumns = 2;
  createGridRows = 2;
  createError = "";
  creating = false;
  // Edit state
  editingGroup = null;
  editName = "";
  editMode = "mirror";
  editGridColumns = 2;
  editGridRows = 2;
  editError = "";
  saving = false;
  // Delete state
  deletingGroup = null;
  deleteError = "";
  deleting = false;
  ngOnInit() {
    this.loadCurrentOrg();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadGroups();
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.loadGroups();
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
  loadGroups() {
    this.loading = true;
    this.loadError = "";
    this.actionError = "";
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied." : "Failed to load screen groups.";
        this.loading = false;
      }
    });
  }
  // --- Create ---
  openCreateForm() {
    this.createName = "";
    this.createMode = "mirror";
    this.createGridColumns = 2;
    this.createGridRows = 2;
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
    if (this.createMode === "split" && (!this.createGridColumns || !this.createGridRows)) {
      this.createError = "Grid columns and rows are required for split mode.";
      return;
    }
    this.creating = true;
    this.createError = "";
    const dto = __spreadValues({
      name: this.createName,
      mode: this.createMode
    }, this.createMode === "split" ? { gridColumns: this.createGridColumns, gridRows: this.createGridRows } : {});
    this.screenGroupService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadGroups();
      },
      error: (err) => {
        this.createError = err.error?.message || "Failed to create screen group.";
        this.creating = false;
      }
    });
  }
  // --- Edit ---
  editGroup(group) {
    this.editingGroup = group;
    this.editName = group.name;
    this.editMode = group.mode;
    this.editGridColumns = group.gridColumns ?? 2;
    this.editGridRows = group.gridRows ?? 2;
    this.editError = "";
  }
  cancelEdit() {
    this.editingGroup = null;
  }
  submitEdit() {
    if (!this.editingGroup)
      return;
    if (!this.editName) {
      this.editError = "Name is required.";
      return;
    }
    if (this.editMode === "split" && (!this.editGridColumns || !this.editGridRows)) {
      this.editError = "Grid columns and rows are required for split mode.";
      return;
    }
    this.saving = true;
    this.editError = "";
    const dto = __spreadValues({
      name: this.editName,
      mode: this.editMode
    }, this.editMode === "split" ? { gridColumns: this.editGridColumns, gridRows: this.editGridRows } : {});
    this.screenGroupService.update(this.orgId, this.editingGroup.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingGroup = null;
        this.loadGroups();
      },
      error: (err) => {
        this.editError = err.error?.message || "Failed to update screen group.";
        this.saving = false;
      }
    });
  }
  // --- Delete ---
  confirmDelete(group) {
    this.deletingGroup = group;
    this.deleteError = "";
  }
  cancelDelete() {
    this.deletingGroup = null;
    this.deleteError = "";
  }
  executeDelete() {
    if (!this.deletingGroup)
      return;
    this.deleting = true;
    this.deleteError = "";
    this.screenGroupService.delete(this.orgId, this.deletingGroup.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deletingGroup = null;
        this.loadGroups();
      },
      error: (err) => {
        this.deleteError = err.error?.message || "Failed to delete screen group.";
        this.deleting = false;
      }
    });
  }
  viewGroup(group) {
    this.router.navigate(["/screen-groups", group.id]);
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function ScreenGroups_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScreenGroups)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ScreenGroups, selectors: [["app-screen-groups"]], decls: 16, vars: 9, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "error"], [1, "loading-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "Create Screen Group", "tabindex", "0", 1, "modal-overlay"], [1, "table-container"], [1, "empty-state"], ["role", "dialog", "aria-modal", "true", "aria-label", "Edit Screen Group", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay"], [1, "btn", "btn-primary", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Create Screen Group", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [3, "ngSubmit"], [1, "form-group"], ["for", "createName"], ["id", "createName", "type", "text", "name", "createName", "required", "", "placeholder", "e.g. Lobby Video Wall", 3, "ngModelChange", "ngModel"], ["for", "createMode"], ["id", "createMode", "name", "createMode", "required", "", 3, "ngModelChange", "ngModel"], ["value", "mirror"], ["value", "split"], [1, "form-row"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], ["for", "createGridColumns"], ["id", "createGridColumns", "type", "number", "name", "createGridColumns", "required", "", "min", "1", "max", "10", "placeholder", "e.g. 2", 3, "ngModelChange", "ngModel"], ["for", "createGridRows"], ["id", "createGridRows", "type", "number", "name", "createGridRows", "required", "", "min", "1", "max", "10", "placeholder", "e.g. 2", 3, "ngModelChange", "ngModel"], [1, "name-cell"], ["tabindex", "0", "role", "link", 1, "group-link", 3, "click", "keydown.enter"], [1, "mode-badge"], [1, "actions-cell"], [1, "btn", "btn-small", "btn-secondary", 3, "click"], [1, "btn", "btn-small", "btn-danger", 3, "click"], [1, "empty-icon"], ["width", "48", "height", "48", "viewBox", "0 0 48 48", "fill", "none"], ["x", "4", "y", "6", "width", "16", "height", "12", "rx", "2", "stroke", "currentColor", "stroke-width", "2"], ["x", "28", "y", "6", "width", "16", "height", "12", "rx", "2", "stroke", "currentColor", "stroke-width", "2"], ["x", "4", "y", "30", "width", "16", "height", "12", "rx", "2", "stroke", "currentColor", "stroke-width", "2"], ["x", "28", "y", "30", "width", "16", "height", "12", "rx", "2", "stroke", "currentColor", "stroke-width", "2"], ["d", "M20 12h8M12 18v12M36 18v12", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-dasharray", "2 3"], [1, "empty-title"], [1, "empty-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "Edit Screen Group", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["for", "editName"], ["id", "editName", "type", "text", "name", "editName", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editMode"], ["id", "editMode", "name", "editMode", "required", "", 3, "ngModelChange", "ngModel"], ["for", "editGridColumns"], ["id", "editGridColumns", "type", "number", "name", "editGridColumns", "required", "", "min", "1", "max", "10", 3, "ngModelChange", "ngModel"], ["for", "editGridRows"], ["id", "editGridRows", "type", "number", "name", "editGridRows", "required", "", "min", "1", "max", "10", 3, "ngModelChange", "ngModel"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "delete-blocked"], [1, "btn", "btn-secondary", 3, "click"], [1, "btn", "btn-danger", 3, "click", "disabled"]], template: function ScreenGroups_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function ScreenGroups_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Screen Groups");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, ScreenGroups_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, ScreenGroups_Conditional_8_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(9, ScreenGroups_Conditional_9_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(10, ScreenGroups_Conditional_10_Template, 24, 6, "div", 7);
      \u0275\u0275conditionalCreate(11, ScreenGroups_Conditional_11_Template, 17, 0, "div", 8);
      \u0275\u0275conditionalCreate(12, ScreenGroups_Conditional_12_Template, 14, 0, "div", 9);
      \u0275\u0275conditionalCreate(13, ScreenGroups_Conditional_13_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(14, ScreenGroups_Conditional_14_Template, 24, 6, "div", 10);
      \u0275\u0275conditionalCreate(15, ScreenGroups_Conditional_15_Template, 6, 1, "div", 11);
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
      \u0275\u0275conditional(!ctx.loading && ctx.groups.length > 0 ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && ctx.groups.length === 0 && !ctx.loadError ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.editingGroup ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.deletingGroup ? 15 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, MinValidator, MaxValidator, NgModel, NgForm], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.table-container[_ngcontent-%COMP%] {\n  width: 100%;\n  overflow-x: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n}\nth[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-weight: 600;\n  font-size: 0.8125rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  border-bottom: 1px solid var(--color-border);\n}\ntd[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n  font-size: 0.875rem;\n}\ntr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {\n  border-bottom: none;\n}\n.name-cell[_ngcontent-%COMP%] {\n  font-weight: 500;\n}\n.group-link[_ngcontent-%COMP%] {\n  color: var(--color-accent);\n  cursor: pointer;\n  text-decoration: none;\n}\n.group-link[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.actions-cell[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.mode-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.mode-badge.mirror[_ngcontent-%COMP%] {\n  background: #3b82f620;\n  color: #3b82f6;\n}\n.mode-badge.split[_ngcontent-%COMP%] {\n  background: #a855f720;\n  color: #a855f7;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.delete-blocked[_ngcontent-%COMP%] {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-icon[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  margin-bottom: 1rem;\n}\n.empty-title[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n  margin: 0 0 0.5rem;\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1.5rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n@media (max-width: 768px) {\n  .page[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .page-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .form-row[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .modal[_ngcontent-%COMP%] {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=screen-groups.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScreenGroups, [{
    type: Component,
    args: [{ selector: "app-screen-groups", standalone: true, imports: [FormsModule], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Groups</h1>
        </div>
        @if (!loading && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + New Group
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading screen groups...</p>
      }

      <!-- Create Group Modal -->
      @if (showCreateForm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Create Screen Group"
             tabindex="0" (click)="cancelCreate()" (keydown.escape)="cancelCreate()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Create Screen Group</h2>
            <form (ngSubmit)="submitCreate()">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
                  name="createName"
                  required
                  placeholder="e.g. Lobby Video Wall"
                />
              </div>
              <div class="form-group">
                <label for="createMode">Mode</label>
                <select id="createMode" [(ngModel)]="createMode" name="createMode" required>
                  <option value="mirror">Mirror</option>
                  <option value="split">Split (Video Wall)</option>
                </select>
              </div>
              @if (createMode === 'split') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="createGridColumns">Grid Columns</label>
                    <input
                      id="createGridColumns"
                      type="number"
                      [(ngModel)]="createGridColumns"
                      name="createGridColumns"
                      required
                      min="1"
                      max="10"
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div class="form-group">
                    <label for="createGridRows">Grid Rows</label>
                    <input
                      id="createGridRows"
                      type="number"
                      [(ngModel)]="createGridRows"
                      name="createGridRows"
                      required
                      min="1"
                      max="10"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              }
              @if (createError) {
                <p class="error">{{ createError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="creating">
                  {{ creating ? 'Creating...' : 'Create Group' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Groups Table -->
      @if (!loading && groups.length > 0) {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mode</th>
                <th>Grid Size</th>
                <th>Screen Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (group of groups; track group.id) {
                <tr>
                  <td class="name-cell"><a class="group-link" tabindex="0" role="link" (click)="viewGroup(group)" (keydown.enter)="viewGroup(group)">{{ group.name }}</a></td>
                  <td>
                    <span class="mode-badge" [class.mirror]="group.mode === 'mirror'" [class.split]="group.mode === 'split'">
                      {{ group.mode === 'mirror' ? 'Mirror' : 'Split' }}
                    </span>
                  </td>
                  <td>{{ group.mode === 'split' && group.gridColumns && group.gridRows ? group.gridColumns + 'x' + group.gridRows : '-' }}</td>
                  <td>{{ group.screens.length }}</td>
                  <td class="actions-cell">
                    <button class="btn btn-small btn-secondary" (click)="editGroup(group)">Edit</button>
                    <button class="btn btn-small btn-danger" (click)="confirmDelete(group)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && groups.length === 0 && !loadError) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="28" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="4" y="30" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="28" y="30" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M20 12h8M12 18v12M36 18v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 3"/>
            </svg>
          </div>
          <p class="empty-title">No screen groups yet</p>
          <p class="empty-text">Create your first screen group to start building mirror displays or video walls.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Create Your First Group</button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Edit Group Modal -->
      @if (editingGroup) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Screen Group"
             tabindex="0" (click)="cancelEdit()" (keydown.escape)="cancelEdit()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Edit Screen Group</h2>
            <form (ngSubmit)="submitEdit()">
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
                <label for="editMode">Mode</label>
                <select id="editMode" [(ngModel)]="editMode" name="editMode" required>
                  <option value="mirror">Mirror</option>
                  <option value="split">Split (Video Wall)</option>
                </select>
              </div>
              @if (editMode === 'split') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="editGridColumns">Grid Columns</label>
                    <input
                      id="editGridColumns"
                      type="number"
                      [(ngModel)]="editGridColumns"
                      name="editGridColumns"
                      required
                      min="1"
                      max="10"
                    />
                  </div>
                  <div class="form-group">
                    <label for="editGridRows">Grid Rows</label>
                    <input
                      id="editGridRows"
                      type="number"
                      [(ngModel)]="editGridRows"
                      name="editGridRows"
                      required
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              }
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
      @if (deletingGroup) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Screen Group</h2>
            @if (deletingGroup.screens.length > 0) {
              <div class="delete-blocked">
                Cannot delete "{{ deletingGroup.name }}" because it still has {{ deletingGroup.screens.length }} assigned screen(s). Remove all screens from the group before deleting it.
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelDelete()">Close</button>
              </div>
            } @else {
              <p>Are you sure you want to delete the screen group <strong>{{ deletingGroup.name }}</strong>? This action cannot be undone.</p>
              @if (deleteError) {
                <p class="error">{{ deleteError }}</p>
              }
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
                <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;b82c320b658a50158bc94dcc77e5803f24b3a85717a7020af2301eb9b7218779;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/screen-groups/screen-groups.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.btn-small {\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8125rem;\n}\n.table-container {\n  width: 100%;\n  overflow-x: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n}\nth {\n  background: var(--color-bg-tertiary);\n  padding: 0.75rem 1rem;\n  text-align: left;\n  font-weight: 600;\n  font-size: 0.8125rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n  border-bottom: 1px solid var(--color-border);\n}\ntd {\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n  font-size: 0.875rem;\n}\ntr:last-child td {\n  border-bottom: none;\n}\n.name-cell {\n  font-weight: 500;\n}\n.group-link {\n  color: var(--color-accent);\n  cursor: pointer;\n  text-decoration: none;\n}\n.group-link:hover {\n  text-decoration: underline;\n}\n.actions-cell {\n  display: flex;\n  gap: 0.5rem;\n}\n.mode-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.mode-badge.mirror {\n  background: #3b82f620;\n  color: #3b82f6;\n}\n.mode-badge.split {\n  background: #a855f720;\n  color: #a855f7;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n  width: 100%;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.form-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.delete-blocked {\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: #fbbf24;\n  line-height: 1.5;\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-icon {\n  color: var(--color-text-muted);\n  margin-bottom: 1rem;\n}\n.empty-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n  margin: 0 0 0.5rem;\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1.5rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n@media (max-width: 768px) {\n  .page {\n    padding: 1rem;\n  }\n  .page-header {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 1rem;\n  }\n  .form-row {\n    grid-template-columns: 1fr;\n  }\n  .modal {\n    min-width: auto;\n    margin: 1rem;\n  }\n}\n/*# sourceMappingURL=screen-groups.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ScreenGroups, { className: "ScreenGroups", filePath: "src/app/screen-groups/screen-groups.ts", lineNumber: 531 });
})();
export {
  ScreenGroups
};
//# sourceMappingURL=chunk-DQWBHSTN.js.map
