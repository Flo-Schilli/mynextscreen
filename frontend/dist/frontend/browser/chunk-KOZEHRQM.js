import {
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  DragDropModule,
  moveItemInArray
} from "./chunk-2CGUZD7J.js";
import {
  PlaylistService
} from "./chunk-UDVTV4ED.js";
import {
  ContentService
} from "./chunk-GVIOZNC5.js";
import "./chunk-3W6OO4XR.js";
import {
  OrganisationService
} from "./chunk-RZDGRQCL.js";
import "./chunk-PHEIM2OP.js";
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
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/playlists/playlist.model.ts
var TRANSITION_OPTIONS = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "zoom-out", label: "Zoom Out" }
];

// src/app/playlists/playlists.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.value;
function Playlists_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 15);
    \u0275\u0275listener("click", function Playlists_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(1, " + Create Playlist ");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_8_Template(rf, ctx) {
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
function Playlists_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading playlists...");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_10_Conditional_8_Template(rf, ctx) {
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
function Playlists_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 7)(1, "h2");
    \u0275\u0275text(2, "Create Playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "form", 16);
    \u0275\u0275listener("ngSubmit", function Playlists_Conditional_10_Template_form_ngSubmit_3_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitCreate());
    });
    \u0275\u0275elementStart(4, "div", 17)(5, "label", 18);
    \u0275\u0275text(6, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function Playlists_Conditional_10_Template_input_ngModelChange_7_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.createName, $event) || (ctx_r1.createName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(8, Playlists_Conditional_10_Conditional_8_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(9, "div", 20)(10, "button", 21);
    \u0275\u0275listener("click", function Playlists_Conditional_10_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelCreate());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 22);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.createName);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.createError ? 8 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.creating);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.creating ? "Creating..." : "Create Playlist", " ");
  }
}
function Playlists_Conditional_11_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "input", 34);
    \u0275\u0275twoWayListener("ngModelChange", function Playlists_Conditional_11_Conditional_3_Template_input_ngModelChange_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.editNameValue, $event) || (ctx_r1.editNameValue = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("keydown.enter", function Playlists_Conditional_11_Conditional_3_Template_input_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.saveName());
    })("keydown.escape", function Playlists_Conditional_11_Conditional_3_Template_input_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelEditName());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "button", 31);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_3_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.saveName());
    });
    \u0275\u0275text(2, "Save");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 28);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_3_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelEditName());
    });
    \u0275\u0275text(4, "Cancel");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editNameValue);
  }
}
function Playlists_Conditional_11_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 28);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_4_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startEditName());
    });
    \u0275\u0275text(3, "Rename");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.selectedPlaylist.name);
  }
}
function Playlists_Conditional_11_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 35);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_6_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleDefault());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("btn-primary", !ctx_r1.isDefault)("btn-secondary", ctx_r1.isDefault);
    \u0275\u0275property("disabled", ctx_r1.settingDefault);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.isDefault ? "Default Playlist" : "Set as Default", " ");
  }
}
function Playlists_Conditional_11_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.editorError);
  }
}
function Playlists_Conditional_11_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 32)(1, "p", 36);
    \u0275\u0275text(2, "No items in this playlist yet.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 15);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_18_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openAddContent());
    });
    \u0275\u0275text(4, "Add Your First Item");
    \u0275\u0275elementEnd()();
  }
}
function Playlists_Conditional_11_Conditional_19_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 43);
  }
  if (rf & 2) {
    const item_r11 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("src", ctx_r1.getThumbUrl(item_r11), \u0275\u0275sanitizeUrl);
  }
}
function Playlists_Conditional_11_Conditional_19_For_2_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44)(1, "span", 60);
    \u0275\u0275text(2, "\u25B6");
    \u0275\u0275elementEnd()();
  }
}
function Playlists_Conditional_11_Conditional_19_For_2_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 51);
    \u0275\u0275text(1, "~");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_11_Conditional_19_For_2_For_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 56);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r12 = ctx.$implicit;
    \u0275\u0275property("value", opt_r12.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(opt_r12.label);
  }
}
function Playlists_Conditional_11_Conditional_19_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 38)(1, "div", 40)(2, "span", 41);
    \u0275\u0275text(3, "\u2630");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 42);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_19_For_2_Template_div_click_4_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.previewItem(item_r11));
    })("keydown.enter", function Playlists_Conditional_11_Conditional_19_For_2_Template_div_keydown_enter_4_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.previewItem(item_r11));
    })("keydown.space", function Playlists_Conditional_11_Conditional_19_For_2_Template_div_keydown_space_4_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.previewItem(item_r11));
    });
    \u0275\u0275conditionalCreate(5, Playlists_Conditional_11_Conditional_19_For_2_Conditional_5_Template, 1, 1, "img", 43)(6, Playlists_Conditional_11_Conditional_19_For_2_Conditional_6_Template, 3, 0, "div", 44);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 45)(8, "span", 46);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 47);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 48)(13, "label", 49);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 50);
    \u0275\u0275conditionalCreate(16, Playlists_Conditional_11_Conditional_19_For_2_Conditional_16_Template, 2, 0, "span", 51);
    \u0275\u0275elementStart(17, "input", 52);
    \u0275\u0275listener("ngModelChange", function Playlists_Conditional_11_Conditional_19_For_2_Template_input_ngModelChange_17_listener($event) {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.updateItemDuration(item_r11, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span", 53);
    \u0275\u0275text(19, "s");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(20, "div", 54)(21, "label", 49);
    \u0275\u0275text(22, "Transition");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "select", 55);
    \u0275\u0275listener("ngModelChange", function Playlists_Conditional_11_Conditional_19_For_2_Template_select_ngModelChange_23_listener($event) {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.updateItemTransition(item_r11, $event));
    });
    \u0275\u0275repeaterCreate(24, Playlists_Conditional_11_Conditional_19_For_2_For_25_Template, 2, 2, "option", 56, _forTrack1);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 57)(27, "label", 49);
    \u0275\u0275text(28, "Trans. ms");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 50)(30, "input", 58);
    \u0275\u0275listener("ngModelChange", function Playlists_Conditional_11_Conditional_19_For_2_Template_input_ngModelChange_30_listener($event) {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.updateItemTransitionDuration(item_r11, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span", 53);
    \u0275\u0275text(32, "ms");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(33, "button", 59);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_19_For_2_Template_button_click_33_listener() {
      const item_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.removeItem(item_r11));
    });
    \u0275\u0275text(34, " \u2715 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(5);
    \u0275\u0275conditional((item_r11.content == null ? null : item_r11.content.type) === "image" ? 5 : 6);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate((item_r11.content == null ? null : item_r11.content.title) || "Untitled");
    \u0275\u0275advance();
    \u0275\u0275classProp("type-image", (item_r11.content == null ? null : item_r11.content.type) === "image")("type-video", (item_r11.content == null ? null : item_r11.content.type) === "video");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (item_r11.content == null ? null : item_r11.content.type) || "unknown", " ");
    \u0275\u0275advance(2);
    \u0275\u0275attribute("for", "dur_" + item_r11.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (item_r11.content == null ? null : item_r11.content.type) === "video" ? "Video length" : "Duration", " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional((item_r11.content == null ? null : item_r11.content.type) === "video" && (item_r11.content == null ? null : item_r11.content.durationSeconds) === null ? 16 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("id", "dur_" + item_r11.id)("ngModel", (item_r11.content == null ? null : item_r11.content.type) === "video" ? (item_r11.content == null ? null : item_r11.content.durationSeconds) ?? item_r11.durationSeconds : item_r11.durationSeconds)("name", "dur_" + item_r11.id)("disabled", (item_r11.content == null ? null : item_r11.content.type) === "video");
    \u0275\u0275advance(4);
    \u0275\u0275attribute("for", "trans_" + item_r11.id);
    \u0275\u0275advance(2);
    \u0275\u0275property("id", "trans_" + item_r11.id)("ngModel", item_r11.transition)("name", "trans_" + item_r11.id);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.transitionOptions);
    \u0275\u0275advance(3);
    \u0275\u0275attribute("for", "tdur_" + item_r11.id);
    \u0275\u0275advance(3);
    \u0275\u0275property("id", "tdur_" + item_r11.id)("ngModel", item_r11.transitionDurationMs)("name", "tdur_" + item_r11.id);
  }
}
function Playlists_Conditional_11_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275listener("cdkDropListDropped", function Playlists_Conditional_11_Conditional_19_Template_div_cdkDropListDropped_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onDrop($event));
    });
    \u0275\u0275repeaterCreate(1, Playlists_Conditional_11_Conditional_19_For_2_Template, 35, 22, "div", 38, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 39);
    \u0275\u0275text(4, " Total Duration: ");
    \u0275\u0275elementStart(5, "strong");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.selectedPlaylist.items);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.formatDuration(ctx_r1.totalDuration));
  }
}
function Playlists_Conditional_11_Conditional_20_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 63);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("src", ctx_r1.getPreviewUrl(ctx_r1.previewingItem), \u0275\u0275sanitizeUrl);
  }
}
function Playlists_Conditional_11_Conditional_20_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "video", 64);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("src", ctx_r1.getPreviewUrl(ctx_r1.previewingItem), \u0275\u0275sanitizeUrl);
  }
}
function Playlists_Conditional_11_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 33)(1, "div", 61)(2, "h3");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 28);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Conditional_20_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closePreview());
    });
    \u0275\u0275text(5, "Close Preview");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 62);
    \u0275\u0275conditionalCreate(7, Playlists_Conditional_11_Conditional_20_Conditional_7_Template, 1, 1, "img", 63)(8, Playlists_Conditional_11_Conditional_20_Conditional_8_Template, 1, 1, "video", 64);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("Preview: ", (ctx_r1.previewingItem.content == null ? null : ctx_r1.previewingItem.content.title) || "Untitled");
    \u0275\u0275advance(4);
    \u0275\u0275conditional((ctx_r1.previewingItem.content == null ? null : ctx_r1.previewingItem.content.type) === "image" ? 7 : 8);
  }
}
function Playlists_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 8)(1, "div", 23)(2, "div", 24);
    \u0275\u0275conditionalCreate(3, Playlists_Conditional_11_Conditional_3_Template, 5, 1)(4, Playlists_Conditional_11_Conditional_4_Template, 4, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 25);
    \u0275\u0275conditionalCreate(6, Playlists_Conditional_11_Conditional_6_Template, 2, 6, "button", 26);
    \u0275\u0275elementStart(7, "button", 27);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmDelete());
    });
    \u0275\u0275text(8, "Delete");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 28);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(10, "Close");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(11, Playlists_Conditional_11_Conditional_11_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(12, "div", 29)(13, "div", 30)(14, "h3");
    \u0275\u0275text(15, "Items");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 31);
    \u0275\u0275listener("click", function Playlists_Conditional_11_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openAddContent());
    });
    \u0275\u0275text(17, "+ Add Content");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(18, Playlists_Conditional_11_Conditional_18_Template, 5, 0, "div", 32)(19, Playlists_Conditional_11_Conditional_19_Template, 7, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(20, Playlists_Conditional_11_Conditional_20_Template, 9, 2, "div", 33);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.editingName ? 3 : 4);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.isOrgAdmin ? 6 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.editorError ? 11 : -1);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(ctx_r1.selectedPlaylist.items.length === 0 ? 18 : 19);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.previewingItem ? 20 : -1);
  }
}
function Playlists_Conditional_12_For_6_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 75);
    \u0275\u0275text(1, "Default");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_12_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275listener("click", function Playlists_Conditional_12_For_6_Template_div_click_0_listener() {
      const playlist_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectPlaylist(playlist_r15));
    })("keydown.enter", function Playlists_Conditional_12_For_6_Template_div_keydown_enter_0_listener() {
      const playlist_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectPlaylist(playlist_r15));
    })("keydown.space", function Playlists_Conditional_12_For_6_Template_div_keydown_space_0_listener() {
      const playlist_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectPlaylist(playlist_r15));
    });
    \u0275\u0275elementStart(1, "div", 72)(2, "app-selection-checkbox", 73);
    \u0275\u0275listener("click", function Playlists_Conditional_12_For_6_Template_app_selection_checkbox_click_2_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 74);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(5, Playlists_Conditional_12_For_6_Conditional_5_Template, 2, 0, "span", 75);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 76)(7, "div", 77)(8, "span", 78);
    \u0275\u0275text(9, "Items");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 79);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 77)(13, "span", 78);
    \u0275\u0275text(14, "Duration");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "span", 79);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 77)(18, "span", 78);
    \u0275\u0275text(19, "Created");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "span", 79);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const playlist_r15 = ctx.$implicit;
    const \u0275$index_217_r16 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r1.selectionService.selectedIds().has(playlist_r15.id));
    \u0275\u0275advance(2);
    \u0275\u0275property("itemId", playlist_r15.id)("itemIndex", \u0275$index_217_r16)("orderedIds", ctx_r1.playlistIds);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(playlist_r15.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(playlist_r15.id === ctx_r1.defaultPlaylistId ? 5 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(playlist_r15.items.length);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.formatDuration(ctx_r1.getPlaylistDuration(playlist_r15)));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(playlist_r15.createdAt));
  }
}
function Playlists_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 65);
    \u0275\u0275element(1, "app-select-all-checkbox", 66);
    \u0275\u0275elementStart(2, "span", 67);
    \u0275\u0275text(3, "Select all");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 68);
    \u0275\u0275repeaterCreate(5, Playlists_Conditional_12_For_6_Template, 22, 10, "div", 69, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275element(7, "app-bulk-action-toolbar", 70);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("allIds", ctx_r1.playlistIds);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.playlists);
    \u0275\u0275advance(2);
    \u0275\u0275property("actions", ctx_r1.bulkActions);
  }
}
function Playlists_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "p", 36);
    \u0275\u0275text(2, "No playlists created yet.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 15);
    \u0275\u0275listener("click", function Playlists_Conditional_13_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(4, "Create Your First Playlist");
    \u0275\u0275elementEnd()();
  }
}
function Playlists_Conditional_14_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 82);
    \u0275\u0275text(1, "This playlist is currently set as the organisation's default. Deleting it will clear the default playlist setting.");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 80);
    \u0275\u0275listener("click", function Playlists_Conditional_14_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    })("keydown.escape", function Playlists_Conditional_14_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275elementStart(1, "div", 81);
    \u0275\u0275listener("click", function Playlists_Conditional_14_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Playlists_Conditional_14_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Are you sure you want to delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, "? This action cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(9, Playlists_Conditional_14_Conditional_9_Template, 2, 0, "p", 82);
    \u0275\u0275elementStart(10, "div", 20)(11, "button", 83);
    \u0275\u0275listener("click", function Playlists_Conditional_14_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275text(12, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 84);
    \u0275\u0275listener("click", function Playlists_Conditional_14_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeDelete());
    });
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.selectedPlaylist == null ? null : ctx_r1.selectedPlaylist.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional((ctx_r1.selectedPlaylist == null ? null : ctx_r1.selectedPlaylist.id) === ctx_r1.defaultPlaylistId ? 9 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.deleting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.deleting ? "Deleting..." : "Delete", " ");
  }
}
function Playlists_Conditional_15_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading content library...");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_15_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 36);
    \u0275\u0275text(1, "No content available. Upload content first.");
    \u0275\u0275elementEnd();
  }
}
function Playlists_Conditional_15_Conditional_6_For_9_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 92);
  }
  if (rf & 2) {
    const content_r22 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("src", ctx_r1.getContentThumbUrl(content_r22), \u0275\u0275sanitizeUrl);
  }
}
function Playlists_Conditional_15_Conditional_6_For_9_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 93)(1, "span", 60);
    \u0275\u0275text(2, "\u25B6");
    \u0275\u0275elementEnd()();
  }
}
function Playlists_Conditional_15_Conditional_6_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 91);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Conditional_6_For_9_Template_div_click_0_listener() {
      const content_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.addContentToPlaylist(content_r22));
    })("keydown.enter", function Playlists_Conditional_15_Conditional_6_For_9_Template_div_keydown_enter_0_listener() {
      const content_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.addContentToPlaylist(content_r22));
    })("keydown.space", function Playlists_Conditional_15_Conditional_6_For_9_Template_div_keydown_space_0_listener() {
      const content_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.addContentToPlaylist(content_r22));
    });
    \u0275\u0275conditionalCreate(1, Playlists_Conditional_15_Conditional_6_For_9_Conditional_1_Template, 1, 1, "img", 92)(2, Playlists_Conditional_15_Conditional_6_For_9_Conditional_2_Template, 3, 0, "div", 93);
    \u0275\u0275elementStart(3, "div", 94)(4, "span", 95);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 96);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const content_r22 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275conditional(content_r22.type === "image" ? 1 : 2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(content_r22.title);
    \u0275\u0275advance();
    \u0275\u0275classProp("type-image", content_r22.type === "image")("type-video", content_r22.type === "video");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", content_r22.type, " ");
  }
}
function Playlists_Conditional_15_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 87)(1, "button", 88);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Conditional_6_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.contentFilter = void 0);
    });
    \u0275\u0275text(2, "All");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 88);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Conditional_6_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.contentFilter = "image");
    });
    \u0275\u0275text(4, "Images");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 88);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Conditional_6_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.contentFilter = "video");
    });
    \u0275\u0275text(6, "Videos");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 89);
    \u0275\u0275repeaterCreate(8, Playlists_Conditional_15_Conditional_6_For_9_Template, 8, 7, "div", 90, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275classProp("active", !ctx_r1.contentFilter);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.contentFilter === "image");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.contentFilter === "video");
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.filteredContent);
  }
}
function Playlists_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 85);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddContent());
    })("keydown.escape", function Playlists_Conditional_15_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddContent());
    });
    \u0275\u0275elementStart(1, "div", 86);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Playlists_Conditional_15_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Add Content to Playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, Playlists_Conditional_15_Conditional_4_Template, 2, 0, "p", 6)(5, Playlists_Conditional_15_Conditional_5_Template, 2, 0, "p", 36)(6, Playlists_Conditional_15_Conditional_6_Template, 10, 6);
    \u0275\u0275elementStart(7, "div", 20)(8, "button", 83);
    \u0275\u0275listener("click", function Playlists_Conditional_15_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddContent());
    });
    \u0275\u0275text(9, "Close");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.contentLoading ? 4 : ctx_r1.availableContent.length === 0 ? 5 : 6);
  }
}
function Playlists_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 97);
    \u0275\u0275listener("click", function Playlists_Conditional_16_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    })("keydown.escape", function Playlists_Conditional_16_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275elementStart(1, "div", 81);
    \u0275\u0275listener("click", function Playlists_Conditional_16_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Playlists_Conditional_16_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Playlists");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "You are about to permanently delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, ". This cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 20)(10, "button", 83);
    \u0275\u0275listener("click", function Playlists_Conditional_16_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 98);
    \u0275\u0275listener("click", function Playlists_Conditional_16_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeBulkDelete());
    });
    \u0275\u0275text(13, " Delete ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.selectionService.count(), " playlist(s)");
  }
}
function Playlists_Conditional_17_For_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 56);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const screen_r25 = ctx.$implicit;
    \u0275\u0275property("value", screen_r25.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", screen_r25.name, " (", screen_r25.location, ")");
  }
}
function Playlists_Conditional_17_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.screensLoadError);
  }
}
function Playlists_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 99);
    \u0275\u0275listener("click", function Playlists_Conditional_17_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignScreen());
    })("keydown.escape", function Playlists_Conditional_17_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignScreen());
    });
    \u0275\u0275elementStart(1, "div", 81);
    \u0275\u0275listener("click", function Playlists_Conditional_17_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Playlists_Conditional_17_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Assign to Screen");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Select a screen to assign ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " to:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 17)(10, "label", 100);
    \u0275\u0275text(11, "Screen");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 101);
    \u0275\u0275twoWayListener("ngModelChange", function Playlists_Conditional_17_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.selectedScreenId, $event) || (ctx_r1.selectedScreenId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 102);
    \u0275\u0275text(14, "-- Select a screen --");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(15, Playlists_Conditional_17_For_16_Template, 2, 3, "option", 56, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(17, Playlists_Conditional_17_Conditional_17_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(18, "div", 20)(19, "button", 83);
    \u0275\u0275listener("click", function Playlists_Conditional_17_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelAssignScreen());
    });
    \u0275\u0275text(20, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 103);
    \u0275\u0275listener("click", function Playlists_Conditional_17_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r24);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeAssignScreen());
    });
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.selectionService.count(), " playlist(s)");
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.selectedScreenId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.availableScreens);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.screensLoadError ? 17 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.screensLoading || !ctx_r1.selectedScreenId);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.screensLoading ? "Loading..." : "Assign", " ");
  }
}
function Playlists_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 104);
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
var Playlists = class _Playlists {
  playlistService = inject(PlaylistService);
  contentService = inject(ContentService);
  screenService = inject(ScreenService);
  memberService = inject(MemberService);
  organisationService = inject(OrganisationService);
  router = inject(Router);
  selectionService = inject(SelectionService);
  orgId = "";
  userRole = "";
  playlists = [];
  playlistIds = [];
  loading = true;
  loadError = "";
  defaultPlaylistId = null;
  // Create form
  showCreateForm = false;
  createName = "";
  createError = "";
  creating = false;
  // Detail / editor
  selectedPlaylist = null;
  editorError = "";
  // Rename
  editingName = false;
  editNameValue = "";
  // Delete
  showDeleteConfirm = false;
  deleting = false;
  // Set as Default
  settingDefault = false;
  // Add content modal
  showAddContent = false;
  availableContent = [];
  contentLoading = false;
  contentFilter;
  // Preview
  previewingItem = null;
  // Transition options for dropdown
  transitionOptions = TRANSITION_OPTIONS;
  // Debounce timers for item field updates
  durationTimers = /* @__PURE__ */ new Map();
  // Bulk delete confirmation
  showBulkDeleteConfirm = false;
  bulkDeleteResolve = null;
  // Assign to screen modal
  showAssignScreenModal = false;
  availableScreens = [];
  selectedScreenId = "";
  screensLoading = false;
  screensLoadError = "";
  assignScreenResolve = null;
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
      label: "Assign to screen(s)",
      variant: "default",
      handler: () => this.handleBulkAssignScreen()
    }
  ];
  get isOrgAdmin() {
    return this.userRole === "org_admin";
  }
  get isDefault() {
    return this.selectedPlaylist?.id === this.defaultPlaylistId;
  }
  get totalDuration() {
    if (!this.selectedPlaylist)
      return 0;
    return this.selectedPlaylist.items.reduce((sum, item) => sum + item.durationSeconds, 0);
  }
  get filteredContent() {
    let content = this.availableContent.filter((c) => c.transcodingStatus === "completed");
    if (this.contentFilter) {
      content = content.filter((c) => c.type === this.contentFilter);
    }
    return content;
  }
  ngOnInit() {
    this.loadCurrentOrg();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.userRole = adminMembership.role;
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.userRole = memberships[0].role;
        } else {
          this.loadError = "You are not a member of any organisation.";
          this.loading = false;
          return;
        }
        this.loadPlaylists();
        this.loadDefaultPlaylist();
      },
      error: () => {
        this.loadError = "Failed to load organisation context.";
        this.loading = false;
      }
    });
  }
  loadDefaultPlaylist() {
    this.organisationService.getOne(this.orgId).subscribe({
      next: (org) => {
        this.defaultPlaylistId = org.defaultPlaylistId;
      },
      error: () => {
      }
    });
  }
  loadPlaylists() {
    this.loading = true;
    this.loadError = "";
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
        this.playlistIds = playlists.map((p) => p.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied." : "Failed to load playlists.";
        this.loading = false;
      }
    });
  }
  // --- Create ---
  openCreateForm() {
    this.createName = "";
    this.createError = "";
    this.showCreateForm = true;
  }
  cancelCreate() {
    this.showCreateForm = false;
  }
  submitCreate() {
    if (!this.createName.trim()) {
      this.createError = "Name is required.";
      return;
    }
    this.creating = true;
    this.createError = "";
    this.playlistService.create(this.orgId, { name: this.createName.trim() }).subscribe({
      next: (playlist) => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadPlaylists();
        this.selectPlaylist(playlist);
      },
      error: (err) => {
        this.createError = err.error?.message || "Failed to create playlist.";
        this.creating = false;
      }
    });
  }
  // --- Detail ---
  selectPlaylist(playlist) {
    this.editorError = "";
    this.previewingItem = null;
    this.editingName = false;
    this.playlistService.getOne(this.orgId, playlist.id).subscribe({
      next: (full) => {
        this.selectedPlaylist = full;
      },
      error: () => {
        this.editorError = "Failed to load playlist details.";
      }
    });
  }
  closeDetail() {
    this.selectedPlaylist = null;
    this.previewingItem = null;
    this.loadPlaylists();
  }
  // --- Rename ---
  startEditName() {
    if (!this.selectedPlaylist)
      return;
    this.editNameValue = this.selectedPlaylist.name;
    this.editingName = true;
  }
  cancelEditName() {
    this.editingName = false;
  }
  saveName() {
    if (!this.selectedPlaylist || !this.editNameValue.trim())
      return;
    this.playlistService.update(this.orgId, this.selectedPlaylist.id, { name: this.editNameValue.trim() }).subscribe({
      next: (updated) => {
        if (this.selectedPlaylist) {
          this.selectedPlaylist.name = updated.name;
        }
        this.editingName = false;
      },
      error: (err) => {
        this.editorError = err.error?.message || "Failed to rename playlist.";
      }
    });
  }
  // --- Delete ---
  confirmDelete() {
    this.showDeleteConfirm = true;
  }
  cancelDelete() {
    this.showDeleteConfirm = false;
  }
  executeDelete() {
    if (!this.selectedPlaylist)
      return;
    const deletedId = this.selectedPlaylist.id;
    this.deleting = true;
    this.playlistService.delete(this.orgId, deletedId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.selectedPlaylist = null;
        this.previewingItem = null;
        if (this.defaultPlaylistId === deletedId) {
          this.defaultPlaylistId = null;
        }
        this.loadPlaylists();
      },
      error: (err) => {
        this.editorError = err.error?.message || "Failed to delete playlist.";
        this.deleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }
  // --- Set as Default ---
  toggleDefault() {
    if (!this.selectedPlaylist)
      return;
    this.settingDefault = true;
    const newDefault = this.isDefault ? null : this.selectedPlaylist.id;
    this.playlistService.setAsDefault(this.orgId, newDefault).subscribe({
      next: () => {
        this.defaultPlaylistId = newDefault;
        this.settingDefault = false;
      },
      error: (err) => {
        this.editorError = err.error?.message || "Failed to set default playlist.";
        this.settingDefault = false;
      }
    });
  }
  // --- Add Content ---
  openAddContent() {
    this.showAddContent = true;
    this.contentFilter = void 0;
    this.contentLoading = true;
    this.contentService.getAll(this.orgId).subscribe({
      next: (content) => {
        this.availableContent = content;
        this.contentLoading = false;
      },
      error: () => {
        this.availableContent = [];
        this.contentLoading = false;
      }
    });
  }
  closeAddContent() {
    this.showAddContent = false;
  }
  addContentToPlaylist(content) {
    if (!this.selectedPlaylist)
      return;
    const defaultDuration = content.type === "video" ? content.durationSeconds ?? 30 : 10;
    this.playlistService.addItem(this.orgId, this.selectedPlaylist.id, {
      contentId: content.id,
      durationSeconds: defaultDuration,
      transition: "fade",
      transitionDurationMs: 500
    }).subscribe({
      next: () => {
        this.reloadPlaylist();
      },
      error: (err) => {
        this.editorError = err.error?.message || "Failed to add item.";
      }
    });
  }
  // --- Remove Item ---
  removeItem(item) {
    if (!this.selectedPlaylist)
      return;
    this.playlistService.removeItem(this.orgId, this.selectedPlaylist.id, item.id).subscribe({
      next: () => {
        if (this.previewingItem?.id === item.id) {
          this.previewingItem = null;
        }
        this.reloadPlaylist();
      },
      error: (err) => {
        this.editorError = err.error?.message || "Failed to remove item.";
      }
    });
  }
  // --- Reorder ---
  onDrop(event) {
    if (!this.selectedPlaylist || event.previousIndex === event.currentIndex)
      return;
    moveItemInArray(this.selectedPlaylist.items, event.previousIndex, event.currentIndex);
    const itemIds = this.selectedPlaylist.items.map((i) => i.id);
    this.playlistService.reorderItems(this.orgId, this.selectedPlaylist.id, { itemIds }).subscribe({
      error: (err) => {
        this.editorError = err.error?.message || "Failed to reorder items.";
        this.reloadPlaylist();
      }
    });
  }
  // --- Item Field Updates (debounced PATCH) ---
  debouncedPatchItem(item, patch) {
    const key = item.id;
    const existing = this.durationTimers.get(key);
    if (existing)
      clearTimeout(existing);
    this.durationTimers.set(key, setTimeout(() => {
      if (!this.selectedPlaylist)
        return;
      this.playlistService.updateItem(this.orgId, this.selectedPlaylist.id, item.id, patch).subscribe({
        next: () => this.reloadPlaylist(),
        error: () => this.reloadPlaylist()
      });
      this.durationTimers.delete(key);
    }, 800));
  }
  updateItemDuration(item, value) {
    if (value < 1)
      return;
    item.durationSeconds = value;
    this.debouncedPatchItem(item, { durationSeconds: value });
  }
  updateItemTransition(item, value) {
    item.transition = value;
    this.debouncedPatchItem(item, { transition: value });
  }
  updateItemTransitionDuration(item, value) {
    if (value < 0 || value > 3e3)
      return;
    item.transitionDurationMs = value;
    this.debouncedPatchItem(item, { transitionDurationMs: value });
  }
  // --- Preview ---
  previewItem(item) {
    this.previewingItem = this.previewingItem?.id === item.id ? null : item;
  }
  closePreview() {
    this.previewingItem = null;
  }
  // --- Helpers ---
  reloadPlaylist() {
    if (!this.selectedPlaylist)
      return;
    this.playlistService.getOne(this.orgId, this.selectedPlaylist.id).subscribe({
      next: (full) => {
        this.selectedPlaylist = full;
      }
    });
  }
  getThumbUrl(item) {
    return this.contentService.getTranscodedUrl(item.contentId);
  }
  getPreviewUrl(item) {
    return this.contentService.getTranscodedUrl(item.contentId);
  }
  getContentThumbUrl(content) {
    return this.contentService.getTranscodedUrl(content.id);
  }
  getPlaylistDuration(playlist) {
    if (!playlist.items)
      return 0;
    return playlist.items.reduce((sum, item) => sum + item.durationSeconds, 0);
  }
  formatDuration(seconds) {
    if (seconds < 60)
      return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60)
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
  }
  // --- Bulk Delete ---
  async handleBulkDelete() {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.playlistService.bulkDelete(this.orgId, ids));
    this.showToast(`${result.deleted} playlist(s) deleted`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadPlaylists();
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
  // --- Bulk Assign to Screen ---
  async handleBulkAssignScreen() {
    const confirmed = await this.openAssignScreenModal();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.playlistService.bulkAssignScreen(this.orgId, ids, this.selectedScreenId));
    const screenName = this.availableScreens.find((s) => s.id === this.selectedScreenId)?.name ?? "selected screen";
    this.showToast(`${result.assigned} playlist(s) assigned to ${screenName}`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadPlaylists();
  }
  openAssignScreenModal() {
    this.showAssignScreenModal = true;
    this.selectedScreenId = "";
    this.screensLoadError = "";
    this.screensLoading = true;
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.availableScreens = screens;
        this.screensLoading = false;
      },
      error: () => {
        this.screensLoadError = "Failed to load screens.";
        this.screensLoading = false;
      }
    });
    return new Promise((resolve) => {
      this.assignScreenResolve = resolve;
    });
  }
  cancelAssignScreen() {
    this.showAssignScreenModal = false;
    this.assignScreenResolve?.(false);
    this.assignScreenResolve = null;
  }
  executeAssignScreen() {
    this.showAssignScreenModal = false;
    this.assignScreenResolve?.(true);
    this.assignScreenResolve = null;
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
  static \u0275fac = function Playlists_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Playlists)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Playlists, selectors: [["app-playlists"]], features: [\u0275\u0275ProvidersFeature([SelectionService])], decls: 19, vars: 12, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "error"], [1, "loading-text"], [1, "form-card"], [1, "editor-card"], [1, "empty-state"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add content", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Assign to screens", "tabindex", "0", 1, "modal-overlay"], [1, "toast", 3, "toast-error", "toast-success", "toast-warning"], [1, "btn", "btn-primary", 3, "click"], [3, "ngSubmit"], [1, "form-group"], ["for", "createName"], ["id", "createName", "type", "text", "name", "createName", "required", "", "placeholder", "e.g. Main Stage Loop", 3, "ngModelChange", "ngModel"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], [1, "editor-header"], [1, "editor-title-row"], [1, "editor-actions"], [1, "btn", "btn-sm", 3, "btn-primary", "btn-secondary", "disabled"], [1, "btn", "btn-danger", "btn-sm", 3, "click"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [1, "items-section"], [1, "items-header"], [1, "btn", "btn-primary", "btn-sm", 3, "click"], [1, "empty-items"], [1, "preview-section"], ["type", "text", 1, "name-input", 3, "ngModelChange", "keydown.enter", "keydown.escape", "ngModel"], [1, "btn", "btn-sm", 3, "click", "disabled"], [1, "empty-text"], ["cdkDropList", "", 1, "item-list", 3, "cdkDropListDropped"], ["cdkDrag", "", 1, "item-row"], [1, "total-duration"], ["cdkDragHandle", "", 1, "drag-handle"], [1, "drag-icon"], ["tabindex", "0", "role", "button", 1, "item-thumbnail", 3, "click", "keydown.enter", "keydown.space"], ["alt", "", 1, "thumb-img", 3, "src"], [1, "thumb-video"], [1, "item-info"], [1, "item-title"], [1, "item-type"], [1, "item-duration"], [1, "duration-label"], [1, "duration-input-group"], [1, "duration-approx"], ["type", "number", "min", "1", 1, "duration-input", 3, "ngModelChange", "id", "ngModel", "name", "disabled"], [1, "duration-unit"], [1, "item-transition"], [1, "transition-select", 3, "ngModelChange", "id", "ngModel", "name"], [3, "value"], [1, "item-transition-duration"], ["type", "number", "min", "0", "max", "3000", 1, "duration-input", 3, "ngModelChange", "id", "ngModel", "name"], ["title", "Remove item", 1, "btn-remove", 3, "click"], [1, "video-icon"], [1, "preview-header"], [1, "preview-content"], ["alt", "Preview", 1, "preview-media", 3, "src"], ["controls", "", 1, "preview-media", 3, "src"], [1, "select-all-row"], [3, "allIds"], [1, "select-all-label"], [1, "playlist-grid"], ["tabindex", "0", "role", "button", 1, "playlist-card", 3, "selected"], [3, "actions"], ["tabindex", "0", "role", "button", 1, "playlist-card", 3, "click", "keydown.enter", "keydown.space"], [1, "card-header"], [3, "click", "itemId", "itemIndex", "orderedIds"], [1, "playlist-name"], [1, "default-badge"], [1, "card-body"], [1, "card-field"], [1, "card-label"], [1, "card-value"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [1, "warning-text"], [1, "btn", "btn-secondary", 3, "click"], [1, "btn", "btn-danger", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add content", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", "modal-lg", 3, "click", "keydown"], [1, "content-type-filter"], [1, "toggle-btn", 3, "click"], [1, "content-grid"], ["tabindex", "0", "role", "button", 1, "content-item"], ["tabindex", "0", "role", "button", 1, "content-item", 3, "click", "keydown.enter", "keydown.space"], ["alt", "", 1, "content-thumb", 3, "src"], [1, "content-thumb-video"], [1, "content-item-info"], [1, "content-item-title"], [1, "content-item-type"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "btn", "btn-danger", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Assign to screens", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["for", "screenSelect"], ["id", "screenSelect", "name", "screenSelect", 3, "ngModelChange", "ngModel"], ["value", ""], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "toast"]], template: function Playlists_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function Playlists_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Playlists");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, Playlists_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, Playlists_Conditional_8_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(9, Playlists_Conditional_9_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(10, Playlists_Conditional_10_Template, 14, 4, "div", 7);
      \u0275\u0275conditionalCreate(11, Playlists_Conditional_11_Template, 21, 5, "div", 8);
      \u0275\u0275conditionalCreate(12, Playlists_Conditional_12_Template, 8, 2);
      \u0275\u0275conditionalCreate(13, Playlists_Conditional_13_Template, 5, 0, "div", 9);
      \u0275\u0275conditionalCreate(14, Playlists_Conditional_14_Template, 15, 4, "div", 10);
      \u0275\u0275conditionalCreate(15, Playlists_Conditional_15_Template, 10, 1, "div", 11);
      \u0275\u0275conditionalCreate(16, Playlists_Conditional_16_Template, 14, 1, "div", 12);
      \u0275\u0275conditionalCreate(17, Playlists_Conditional_17_Template, 23, 5, "div", 13);
      \u0275\u0275conditionalCreate(18, Playlists_Conditional_18_Template, 2, 7, "div", 14);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedPlaylist && !ctx.showCreateForm ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showCreateForm ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.selectedPlaylist ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedPlaylist && !ctx.showCreateForm && ctx.playlists.length > 0 ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedPlaylist && !ctx.showCreateForm && ctx.playlists.length === 0 && !ctx.loadError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showDeleteConfirm ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAddContent ? 15 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showBulkDeleteConfirm ? 16 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAssignScreenModal ? 17 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toastMessage ? 18 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, MinValidator, MaxValidator, NgModel, NgForm, DragDropModule, CdkDropList, CdkDrag, CdkDragHandle, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n  padding-bottom: 5rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-sm[_ngcontent-%COMP%] {\n  padding: 0.325rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.select-all-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 0.75rem;\n  padding: 0.25rem 0;\n}\n.select-all-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.playlist-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));\n  gap: 1rem;\n}\n.playlist-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.25rem;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.playlist-card[_ngcontent-%COMP%]:hover, \n.playlist-card[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.playlist-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n}\n.card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.playlist-name[_ngcontent-%COMP%] {\n  font-size: 1rem;\n  font-weight: 600;\n  flex: 1;\n}\n.default-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.6875rem;\n  font-weight: 600;\n  background: var(--color-accent);\n  color: #fff;\n}\n.card-body[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.card-field[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.8125rem;\n}\n.card-label[_ngcontent-%COMP%] {\n  color: var(--color-text-secondary);\n}\n.card-value[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n}\n.form-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.form-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.editor-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.editor-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n.editor-title-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.editor-title-row[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.name-input[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.name-input[_ngcontent-%COMP%]:focus {\n  outline: none;\n}\n.editor-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.items-section[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n}\n.items-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.items-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.empty-items[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 2rem;\n}\n.item-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.item-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  transition: border-color 0.15s;\n}\n.item-row[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-text-muted);\n}\n.drag-handle[_ngcontent-%COMP%] {\n  cursor: grab;\n  color: var(--color-text-muted);\n  font-size: 1rem;\n  padding: 0.25rem;\n  -webkit-user-select: none;\n  user-select: none;\n  display: flex;\n  align-items: center;\n}\n.drag-handle[_ngcontent-%COMP%]:active {\n  cursor: grabbing;\n}\n.drag-icon[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n}\n.item-thumbnail[_ngcontent-%COMP%] {\n  width: 3.5rem;\n  height: 2.5rem;\n  border-radius: 0.25rem;\n  overflow: hidden;\n  flex-shrink: 0;\n  cursor: pointer;\n  background: var(--color-bg-tertiary);\n}\n.thumb-img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.thumb-video[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-muted);\n  font-size: 1rem;\n}\n.item-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.item-title[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.item-type[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.type-image[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.type-video[_ngcontent-%COMP%] {\n  color: #a78bfa;\n}\n.item-duration[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  flex-shrink: 0;\n}\n.duration-label[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.duration-input-group[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.duration-input[_ngcontent-%COMP%] {\n  width: 4rem;\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.25rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  text-align: right;\n}\n.duration-input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.duration-input[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.duration-approx[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n  margin-right: -0.125rem;\n}\n.duration-unit[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.item-transition[_ngcontent-%COMP%], \n.item-transition-duration[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  flex-shrink: 0;\n}\n.transition-select[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.25rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n}\n.transition-select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.btn-remove[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-muted);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  transition: color 0.15s, background-color 0.15s;\n}\n.btn-remove[_ngcontent-%COMP%]:hover {\n  color: #ef4444;\n  background: #ef444420;\n}\n.cdk-drag-preview[_ngcontent-%COMP%] {\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  padding: 0.625rem 0.75rem;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.cdk-drag-placeholder[_ngcontent-%COMP%] {\n  opacity: 0.3;\n}\n.cdk-drag-animating[_ngcontent-%COMP%] {\n  transition: transform 200ms ease;\n}\n.item-list.cdk-drop-list-dragging[_ngcontent-%COMP%]   .item-row[_ngcontent-%COMP%]:not(.cdk-drag-placeholder) {\n  transition: transform 200ms ease;\n}\n.total-duration[_ngcontent-%COMP%] {\n  margin-top: 1rem;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-align: right;\n}\n.total-duration[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n}\n.preview-section[_ngcontent-%COMP%] {\n  margin-top: 1.5rem;\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n}\n.preview-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.preview-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.preview-content[_ngcontent-%COMP%] {\n  text-align: center;\n}\n.preview-media[_ngcontent-%COMP%] {\n  max-width: 100%;\n  max-height: 24rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal-lg[_ngcontent-%COMP%] {\n  max-width: 52rem;\n  width: 90vw;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.warning-text[_ngcontent-%COMP%] {\n  color: #fbbf24 !important;\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  font-size: 0.8125rem !important;\n}\n.content-type-filter[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.375rem;\n  margin-bottom: 1rem;\n}\n.toggle-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  transition: all 0.15s;\n}\n.toggle-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.toggle-btn.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n  border-color: var(--color-accent);\n}\n.content-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n  max-height: 50vh;\n  overflow-y: auto;\n}\n.content-item[_ngcontent-%COMP%] {\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  overflow: hidden;\n  cursor: pointer;\n  transition: border-color 0.15s;\n}\n.content-item[_ngcontent-%COMP%]:hover, \n.content-item[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-accent);\n  outline: none;\n}\n.content-thumb[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 6rem;\n  object-fit: cover;\n  display: block;\n}\n.content-thumb-video[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 6rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-muted);\n  font-size: 1.5rem;\n}\n.video-icon[_ngcontent-%COMP%] {\n  opacity: 0.6;\n}\n.content-item-info[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.content-item-title[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.content-item-type[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: _ngcontent-%COMP%_toast-in 0.3s ease;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n.toast-warning[_ngcontent-%COMP%] {\n  background: #92400e;\n  color: #fef3c7;\n  border: 1px solid #d97706;\n}\n@keyframes _ngcontent-%COMP%_toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n/*# sourceMappingURL=playlists.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Playlists, [{
    type: Component,
    args: [{ selector: "app-playlists", standalone: true, imports: [FormsModule, DragDropModule, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent], providers: [SelectionService], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Playlists</h1>
        </div>
        @if (!loading && !selectedPlaylist && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + Create Playlist
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading playlists...</p>
      }

      <!-- Create Playlist Form -->
      @if (showCreateForm) {
        <div class="form-card">
          <h2>Create Playlist</h2>
          <form (ngSubmit)="submitCreate()">
            <div class="form-group">
              <label for="createName">Name</label>
              <input
                id="createName"
                type="text"
                [(ngModel)]="createName"
                name="createName"
                required
                placeholder="e.g. Main Stage Loop"
              />
            </div>
            @if (createError) {
              <p class="error">{{ createError }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="creating">
                {{ creating ? 'Creating...' : 'Create Playlist' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Playlist Detail / Editor View -->
      @if (selectedPlaylist) {
        <div class="editor-card">
          <div class="editor-header">
            <div class="editor-title-row">
              @if (editingName) {
                <input
                  class="name-input"
                  type="text"
                  [(ngModel)]="editNameValue"
                  (keydown.enter)="saveName()"
                  (keydown.escape)="cancelEditName()"
                />
                <button class="btn btn-primary btn-sm" (click)="saveName()">Save</button>
                <button class="btn btn-secondary btn-sm" (click)="cancelEditName()">Cancel</button>
              } @else {
                <h2>{{ selectedPlaylist.name }}</h2>
                <button class="btn btn-secondary btn-sm" (click)="startEditName()">Rename</button>
              }
            </div>
            <div class="editor-actions">
              @if (isOrgAdmin) {
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="!isDefault"
                  [class.btn-secondary]="isDefault"
                  (click)="toggleDefault()"
                  [disabled]="settingDefault"
                >
                  {{ isDefault ? 'Default Playlist' : 'Set as Default' }}
                </button>
              }
              <button class="btn btn-danger btn-sm" (click)="confirmDelete()">Delete</button>
              <button class="btn btn-secondary btn-sm" (click)="closeDetail()">Close</button>
            </div>
          </div>

          @if (editorError) {
            <p class="error">{{ editorError }}</p>
          }

          <!-- Playlist Items -->
          <div class="items-section">
            <div class="items-header">
              <h3>Items</h3>
              <button class="btn btn-primary btn-sm" (click)="openAddContent()">+ Add Content</button>
            </div>

            @if (selectedPlaylist.items.length === 0) {
              <div class="empty-items">
                <p class="empty-text">No items in this playlist yet.</p>
                <button class="btn btn-primary" (click)="openAddContent()">Add Your First Item</button>
              </div>
            } @else {
              <div
                cdkDropList
                class="item-list"
                (cdkDropListDropped)="onDrop($event)"
              >
                @for (item of selectedPlaylist.items; track item.id) {
                  <div class="item-row" cdkDrag>
                    <div class="drag-handle" cdkDragHandle>
                      <span class="drag-icon">&#9776;</span>
                    </div>
                    <div class="item-thumbnail" (click)="previewItem(item)" tabindex="0" role="button"
                         (keydown.enter)="previewItem(item)" (keydown.space)="previewItem(item)">
                      @if (item.content?.type === 'image') {
                        <img [src]="getThumbUrl(item)" alt="" class="thumb-img" />
                      } @else {
                        <div class="thumb-video">
                          <span class="video-icon">&#9654;</span>
                        </div>
                      }
                    </div>
                    <div class="item-info">
                      <span class="item-title">{{ item.content?.title || 'Untitled' }}</span>
                      <span class="item-type" [class.type-image]="item.content?.type === 'image'" [class.type-video]="item.content?.type === 'video'">
                        {{ item.content?.type || 'unknown' }}
                      </span>
                    </div>
                    <div class="item-duration">
                      <label class="duration-label" [attr.for]="'dur_' + item.id">
                        {{ item.content?.type === 'video' ? 'Video length' : 'Duration' }}
                      </label>
                      <div class="duration-input-group">
                        @if (item.content?.type === 'video' && item.content?.durationSeconds === null) {
                          <span class="duration-approx">~</span>
                        }
                        <input
                          type="number"
                          class="duration-input"
                          [id]="'dur_' + item.id"
                          [ngModel]="item.content?.type === 'video' ? (item.content?.durationSeconds ?? item.durationSeconds) : item.durationSeconds"
                          (ngModelChange)="updateItemDuration(item, $event)"
                          min="1"
                          [name]="'dur_' + item.id"
                          [disabled]="item.content?.type === 'video'"
                        />
                        <span class="duration-unit">s</span>
                      </div>
                    </div>
                    <div class="item-transition">
                      <label class="duration-label" [attr.for]="'trans_' + item.id">Transition</label>
                      <select
                        class="transition-select"
                        [id]="'trans_' + item.id"
                        [ngModel]="item.transition"
                        (ngModelChange)="updateItemTransition(item, $event)"
                        [name]="'trans_' + item.id"
                      >
                        @for (opt of transitionOptions; track opt.value) {
                          <option [value]="opt.value">{{ opt.label }}</option>
                        }
                      </select>
                    </div>
                    <div class="item-transition-duration">
                      <label class="duration-label" [attr.for]="'tdur_' + item.id">Trans. ms</label>
                      <div class="duration-input-group">
                        <input
                          type="number"
                          class="duration-input"
                          [id]="'tdur_' + item.id"
                          [ngModel]="item.transitionDurationMs"
                          (ngModelChange)="updateItemTransitionDuration(item, $event)"
                          min="0"
                          max="3000"
                          [name]="'tdur_' + item.id"
                        />
                        <span class="duration-unit">ms</span>
                      </div>
                    </div>
                    <button class="btn-remove" (click)="removeItem(item)" title="Remove item">
                      &#10005;
                    </button>
                  </div>
                }
              </div>

              <div class="total-duration">
                Total Duration: <strong>{{ formatDuration(totalDuration) }}</strong>
              </div>
            }
          </div>

          <!-- Inline Preview -->
          @if (previewingItem) {
            <div class="preview-section">
              <div class="preview-header">
                <h3>Preview: {{ previewingItem.content?.title || 'Untitled' }}</h3>
                <button class="btn btn-secondary btn-sm" (click)="closePreview()">Close Preview</button>
              </div>
              <div class="preview-content">
                @if (previewingItem.content?.type === 'image') {
                  <img [src]="getPreviewUrl(previewingItem)" alt="Preview" class="preview-media" />
                } @else {
                  <video [src]="getPreviewUrl(previewingItem)" controls class="preview-media"></video>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Playlist Grid -->
      @if (!loading && !selectedPlaylist && !showCreateForm && playlists.length > 0) {
        <div class="select-all-row">
          <app-select-all-checkbox [allIds]="playlistIds" />
          <span class="select-all-label">Select all</span>
        </div>
        <div class="playlist-grid">
          @for (playlist of playlists; track playlist.id; let i = $index) {
            <div class="playlist-card" [class.selected]="selectionService.selectedIds().has(playlist.id)"
                 (click)="selectPlaylist(playlist)" tabindex="0" role="button"
                 (keydown.enter)="selectPlaylist(playlist)" (keydown.space)="selectPlaylist(playlist)">
              <div class="card-header">
                <app-selection-checkbox
                  [itemId]="playlist.id"
                  [itemIndex]="i"
                  [orderedIds]="playlistIds"
                  (click)="$event.stopPropagation()"
                />
                <span class="playlist-name">{{ playlist.name }}</span>
                @if (playlist.id === defaultPlaylistId) {
                  <span class="default-badge">Default</span>
                }
              </div>
              <div class="card-body">
                <div class="card-field">
                  <span class="card-label">Items</span>
                  <span class="card-value">{{ playlist.items.length }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Duration</span>
                  <span class="card-value">{{ formatDuration(getPlaylistDuration(playlist)) }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Created</span>
                  <span class="card-value">{{ formatDate(playlist.createdAt) }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <app-bulk-action-toolbar [actions]="bulkActions" />
      }

      @if (!loading && !selectedPlaylist && !showCreateForm && playlists.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No playlists created yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Create Your First Playlist</button>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Playlist</h2>
            <p>Are you sure you want to delete <strong>{{ selectedPlaylist?.name }}</strong>? This action cannot be undone.</p>
            @if (selectedPlaylist?.id === defaultPlaylistId) {
              <p class="warning-text">This playlist is currently set as the organisation's default. Deleting it will clear the default playlist setting.</p>
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

      <!-- Add Content Modal -->
      @if (showAddContent) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add content"
             tabindex="0" (click)="closeAddContent()" (keydown.escape)="closeAddContent()">
          <div class="modal modal-lg" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add Content to Playlist</h2>

            @if (contentLoading) {
              <p class="loading-text">Loading content library...</p>
            } @else if (availableContent.length === 0) {
              <p class="empty-text">No content available. Upload content first.</p>
            } @else {
              <div class="content-type-filter">
                <button class="toggle-btn" [class.active]="!contentFilter" (click)="contentFilter = undefined">All</button>
                <button class="toggle-btn" [class.active]="contentFilter === 'image'" (click)="contentFilter = 'image'">Images</button>
                <button class="toggle-btn" [class.active]="contentFilter === 'video'" (click)="contentFilter = 'video'">Videos</button>
              </div>
              <div class="content-grid">
                @for (content of filteredContent; track content.id) {
                  <div class="content-item" (click)="addContentToPlaylist(content)" tabindex="0" role="button"
                       (keydown.enter)="addContentToPlaylist(content)" (keydown.space)="addContentToPlaylist(content)">
                    @if (content.type === 'image') {
                      <img [src]="getContentThumbUrl(content)" alt="" class="content-thumb" />
                    } @else {
                      <div class="content-thumb-video">
                        <span class="video-icon">&#9654;</span>
                      </div>
                    }
                    <div class="content-item-info">
                      <span class="content-item-title">{{ content.title }}</span>
                      <span class="content-item-type" [class.type-image]="content.type === 'image'" [class.type-video]="content.type === 'video'">
                        {{ content.type }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="form-actions">
              <button class="btn btn-secondary" (click)="closeAddContent()">Close</button>
            </div>
          </div>
        </div>
      }
      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm bulk delete"
             tabindex="0" (click)="cancelBulkDelete()" (keydown.escape)="cancelBulkDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Playlists</h2>
            <p>You are about to permanently delete <strong>{{ selectionService.count() }} playlist(s)</strong>. This cannot be undone.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelBulkDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeBulkDelete()">
                Delete
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Assign to Screen(s) Modal -->
      @if (showAssignScreenModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Assign to screens"
             tabindex="0" (click)="cancelAssignScreen()" (keydown.escape)="cancelAssignScreen()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Assign to Screen</h2>
            <p>Select a screen to assign <strong>{{ selectionService.count() }} playlist(s)</strong> to:</p>
            <div class="form-group">
              <label for="screenSelect">Screen</label>
              <select id="screenSelect" [(ngModel)]="selectedScreenId" name="screenSelect">
                <option value="">-- Select a screen --</option>
                @for (screen of availableScreens; track screen.id) {
                  <option [value]="screen.id">{{ screen.name }} ({{ screen.location }})</option>
                }
              </select>
            </div>
            @if (screensLoadError) {
              <p class="error">{{ screensLoadError }}</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelAssignScreen()">Cancel</button>
              <button class="btn btn-primary" (click)="executeAssignScreen()" [disabled]="screensLoading || !selectedScreenId">
                {{ screensLoading ? 'Loading...' : 'Assign' }}
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
  `, styles: ["/* angular:styles/component:css;8f24c578272d0f282a59c20658544bbc9e539fa15bc5fccc8c9d0a14a6b67c89;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/playlists/playlists.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n  padding-bottom: 5rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-sm {\n  padding: 0.325rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.select-all-row {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 0.75rem;\n  padding: 0.25rem 0;\n}\n.select-all-label {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.playlist-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));\n  gap: 1rem;\n}\n.playlist-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.25rem;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.playlist-card:hover,\n.playlist-card:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.playlist-card.selected {\n  border-color: var(--color-accent);\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n}\n.card-header {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.playlist-name {\n  font-size: 1rem;\n  font-weight: 600;\n  flex: 1;\n}\n.default-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.6875rem;\n  font-weight: 600;\n  background: var(--color-accent);\n  color: #fff;\n}\n.card-body {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.card-field {\n  display: flex;\n  justify-content: space-between;\n  font-size: 0.8125rem;\n}\n.card-label {\n  color: var(--color-text-secondary);\n}\n.card-value {\n  color: var(--color-text-primary);\n}\n.form-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.form-card h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.editor-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.editor-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n.editor-title-row {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.editor-title-row h2 {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.name-input {\n  padding: 0.375rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.name-input:focus {\n  outline: none;\n}\n.editor-actions {\n  display: flex;\n  gap: 0.5rem;\n  align-items: center;\n}\n.items-section {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n}\n.items-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.items-header h3 {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.empty-items {\n  text-align: center;\n  padding: 2rem;\n}\n.item-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.item-row {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.625rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  transition: border-color 0.15s;\n}\n.item-row:hover {\n  border-color: var(--color-text-muted);\n}\n.drag-handle {\n  cursor: grab;\n  color: var(--color-text-muted);\n  font-size: 1rem;\n  padding: 0.25rem;\n  -webkit-user-select: none;\n  user-select: none;\n  display: flex;\n  align-items: center;\n}\n.drag-handle:active {\n  cursor: grabbing;\n}\n.drag-icon {\n  font-size: 0.875rem;\n}\n.item-thumbnail {\n  width: 3.5rem;\n  height: 2.5rem;\n  border-radius: 0.25rem;\n  overflow: hidden;\n  flex-shrink: 0;\n  cursor: pointer;\n  background: var(--color-bg-tertiary);\n}\n.thumb-img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.thumb-video {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-muted);\n  font-size: 1rem;\n}\n.item-info {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.item-title {\n  font-size: 0.875rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.item-type {\n  font-size: 0.6875rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.type-image {\n  color: #22c55e;\n}\n.type-video {\n  color: #a78bfa;\n}\n.item-duration {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  flex-shrink: 0;\n}\n.duration-label {\n  font-size: 0.625rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.duration-input-group {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n}\n.duration-input {\n  width: 4rem;\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.25rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  text-align: right;\n}\n.duration-input:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.duration-input:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.duration-approx {\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n  margin-right: -0.125rem;\n}\n.duration-unit {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.item-transition,\n.item-transition-duration {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  flex-shrink: 0;\n}\n.transition-select {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.25rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n}\n.transition-select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.btn-remove {\n  background: none;\n  border: none;\n  color: var(--color-text-muted);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  transition: color 0.15s, background-color 0.15s;\n}\n.btn-remove:hover {\n  color: #ef4444;\n  background: #ef444420;\n}\n.cdk-drag-preview {\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-accent);\n  border-radius: 0.375rem;\n  padding: 0.625rem 0.75rem;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.cdk-drag-placeholder {\n  opacity: 0.3;\n}\n.cdk-drag-animating {\n  transition: transform 200ms ease;\n}\n.item-list.cdk-drop-list-dragging .item-row:not(.cdk-drag-placeholder) {\n  transition: transform 200ms ease;\n}\n.total-duration {\n  margin-top: 1rem;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-align: right;\n}\n.total-duration strong {\n  color: var(--color-text-primary);\n}\n.preview-section {\n  margin-top: 1.5rem;\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n}\n.preview-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.preview-header h3 {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.preview-content {\n  text-align: center;\n}\n.preview-media {\n  max-width: 100%;\n  max-height: 24rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal-lg {\n  max-width: 52rem;\n  width: 90vw;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.warning-text {\n  color: #fbbf24 !important;\n  background: #92400e20;\n  border: 1px solid #92400e;\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  font-size: 0.8125rem !important;\n}\n.content-type-filter {\n  display: flex;\n  gap: 0.375rem;\n  margin-bottom: 1rem;\n}\n.toggle-btn {\n  padding: 0.375rem 0.75rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  transition: all 0.15s;\n}\n.toggle-btn:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.toggle-btn.active {\n  background: var(--color-accent);\n  color: #fff;\n  border-color: var(--color-accent);\n}\n.content-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));\n  gap: 0.75rem;\n  margin-bottom: 1rem;\n  max-height: 50vh;\n  overflow-y: auto;\n}\n.content-item {\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  overflow: hidden;\n  cursor: pointer;\n  transition: border-color 0.15s;\n}\n.content-item:hover,\n.content-item:focus {\n  border-color: var(--color-accent);\n  outline: none;\n}\n.content-thumb {\n  width: 100%;\n  height: 6rem;\n  object-fit: cover;\n  display: block;\n}\n.content-thumb-video {\n  width: 100%;\n  height: 6rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-muted);\n  font-size: 1.5rem;\n}\n.video-icon {\n  opacity: 0.6;\n}\n.content-item-info {\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.content-item-title {\n  font-size: 0.75rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.content-item-type {\n  font-size: 0.625rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n  margin-bottom: 1rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.toast {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: toast-in 0.3s ease;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n.toast-warning {\n  background: #92400e;\n  color: #fef3c7;\n  border: 1px solid #d97706;\n}\n@keyframes toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n/*# sourceMappingURL=playlists.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Playlists, { className: "Playlists", filePath: "src/app/playlists/playlists.ts", lineNumber: 1077 });
})();
export {
  Playlists
};
//# sourceMappingURL=chunk-KOZEHRQM.js.map
