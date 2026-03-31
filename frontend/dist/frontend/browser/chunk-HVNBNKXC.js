import {
  PlaylistService
} from "./chunk-UDVTV4ED.js";
import {
  ContentService
} from "./chunk-GVIOZNC5.js";
import {
  DashboardSseService
} from "./chunk-RS5BXU3T.js";
import "./chunk-3W6OO4XR.js";
import "./chunk-PHEIM2OP.js";
import {
  BulkActionToolbarComponent,
  SelectAllCheckboxComponent,
  SelectionCheckboxComponent,
  SelectionService
} from "./chunk-GZRWYXK5.js";
import {
  MemberService
} from "./chunk-6QLUTZ4R.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  RadioControlValueAccessor
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  Router,
  __spreadValues,
  firstValueFrom,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵarrowFunction,
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
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/content/content-library.ts
var _forTrack0 = ($index, $item) => $item.file.name;
var _forTrack1 = ($index, $item) => $item.id;
var arrowFn0 = (ctx, view) => (t) => t.trim();
function ContentLibrary_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 18)(2, "button", 19);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_7_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTypeFilter(void 0));
    });
    \u0275\u0275text(3, "All");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 19);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_7_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTypeFilter("image"));
    });
    \u0275\u0275text(5, "Images");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 19);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_7_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setTypeFilter("video"));
    });
    \u0275\u0275text(7, "Videos");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", !ctx_r1.filterType);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.filterType === "image");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r1.filterType === "video");
  }
}
function ContentLibrary_Conditional_8_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" / ", ctx_r1.formatBytes((ctx_r1.storage.originalLimitBytes || ctx_r1.Infinity) + (ctx_r1.storage.transcodedLimitBytes || ctx_r1.Infinity)), " ");
  }
}
function ContentLibrary_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5)(1, "div", 20)(2, "span", 21);
    \u0275\u0275text(3, "Storage");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 22);
    \u0275\u0275text(5);
    \u0275\u0275conditionalCreate(6, ContentLibrary_Conditional_8_Conditional_6_Template, 1, 1);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 23);
    \u0275\u0275element(8, "div", 24)(9, "div", 25);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 26)(11, "span", 27);
    \u0275\u0275element(12, "span", 28);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 27);
    \u0275\u0275element(15, "span", 29);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", ctx_r1.formatBytes(ctx_r1.storage.originalUsedBytes + ctx_r1.storage.transcodedUsedBytes), " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.storage.originalLimitBytes > 0 || ctx_r1.storage.transcodedLimitBytes > 0 ? 6 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r1.getOriginalPercent(), "%");
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r1.getTranscodedPercent(), "%")("left", ctx_r1.getOriginalPercent(), "%");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" Original (", ctx_r1.formatBytes(ctx_r1.storage.originalUsedBytes), ")");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" Transcoded (", ctx_r1.formatBytes(ctx_r1.storage.transcodedUsedBytes), ")");
  }
}
function ContentLibrary_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError);
  }
}
function ContentLibrary_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 7);
    \u0275\u0275text(1, "Loading content...");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_11_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 32);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_11_For_2_Template_button_click_0_listener() {
      const tag_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleTag(tag_r4));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tag_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("active", ctx_r1.filterTags.includes(tag_r4));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tag_r4, " ");
  }
}
function ContentLibrary_Conditional_11_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 33);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_11_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.clearTags());
    });
    \u0275\u0275text(1, "Clear");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8);
    \u0275\u0275repeaterCreate(1, ContentLibrary_Conditional_11_For_2_Template, 2, 3, "button", 30, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275conditionalCreate(3, ContentLibrary_Conditional_11_Conditional_3_Template, 2, 0, "button", 31);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.allTags);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.filterTags.length > 0 ? 3 : -1);
  }
}
function ContentLibrary_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34);
    \u0275\u0275listener("dragover", function ContentLibrary_Conditional_12_Template_div_dragover_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDragOver($event));
    })("dragleave", function ContentLibrary_Conditional_12_Template_div_dragleave_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDragLeave($event));
    })("drop", function ContentLibrary_Conditional_12_Template_div_drop_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onDrop($event));
    });
    \u0275\u0275elementStart(1, "div", 35)(2, "p", 36);
    \u0275\u0275text(3, "Drag & drop files here");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 37);
    \u0275\u0275text(5, "or");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "label", 38);
    \u0275\u0275text(7, " Browse Files ");
    \u0275\u0275elementStart(8, "input", 39);
    \u0275\u0275listener("change", function ContentLibrary_Conditional_12_Template_input_change_8_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onFileSelect($event));
    });
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("drag-over", ctx_r1.isDragOver);
  }
}
function ContentLibrary_Conditional_13_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const item_r7 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", item_r7.progress, "% ");
  }
}
function ContentLibrary_Conditional_13_For_2_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Done ");
  }
}
function ContentLibrary_Conditional_13_For_2_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const item_r7 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", item_r7.error || "Error", " ");
  }
}
function ContentLibrary_Conditional_13_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40)(1, "div", 41)(2, "span", 42);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 43);
    \u0275\u0275conditionalCreate(5, ContentLibrary_Conditional_13_For_2_Conditional_5_Template, 1, 1)(6, ContentLibrary_Conditional_13_For_2_Conditional_6_Template, 1, 0)(7, ContentLibrary_Conditional_13_For_2_Conditional_7_Template, 1, 1);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 44);
    \u0275\u0275element(9, "div", 45);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r7 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r7.file.name);
    \u0275\u0275advance();
    \u0275\u0275classProp("error", item_r7.status === "error");
    \u0275\u0275advance();
    \u0275\u0275conditional(item_r7.status === "uploading" ? 5 : item_r7.status === "done" ? 6 : 7);
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("width", item_r7.progress, "%");
    \u0275\u0275classProp("error", item_r7.status === "error")("done", item_r7.status === "done");
  }
}
function ContentLibrary_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10);
    \u0275\u0275repeaterCreate(1, ContentLibrary_Conditional_13_For_2_Template, 10, 10, "div", 40, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.uploads);
  }
}
function ContentLibrary_Conditional_14_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 53);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r1.getPreviewUrl(ctx_r1.selectedContent), \u0275\u0275sanitizeUrl);
  }
}
function ContentLibrary_Conditional_14_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "video", 54);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r1.getPreviewUrl(ctx_r1.selectedContent), \u0275\u0275sanitizeUrl);
  }
}
function ContentLibrary_Conditional_14_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" Processing ", ctx_r1.transcodingProgress[ctx_r1.selectedContent.id] ?? 0, "% ");
  }
}
function ContentLibrary_Conditional_14_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectedContent.transcodingStatus, " ");
  }
}
function ContentLibrary_Conditional_14_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 58);
    \u0275\u0275element(1, "div", 72);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r1.transcodingProgress[ctx_r1.selectedContent.id] ?? 0, "%");
  }
}
function ContentLibrary_Conditional_14_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.transcodingError);
  }
}
function ContentLibrary_Conditional_14_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.metadataError);
  }
}
function ContentLibrary_Conditional_14_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 69);
    \u0275\u0275text(1, "Changes saved.");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 11)(1, "div", 46)(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 47)(5, "label", 48);
    \u0275\u0275text(6, " Re-upload ");
    \u0275\u0275elementStart(7, "input", 49);
    \u0275\u0275listener("change", function ContentLibrary_Conditional_14_Template_input_change_7_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onReUpload($event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "button", 50);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_14_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmDelete());
    });
    \u0275\u0275text(9, "Delete");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 51);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_14_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(11, "Close");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(12, "div", 52);
    \u0275\u0275conditionalCreate(13, ContentLibrary_Conditional_14_Conditional_13_Template, 1, 1, "img", 53)(14, ContentLibrary_Conditional_14_Conditional_14_Template, 1, 1, "video", 54);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 55)(16, "span", 56);
    \u0275\u0275text(17, "Transcoding");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span", 57);
    \u0275\u0275conditionalCreate(19, ContentLibrary_Conditional_14_Conditional_19_Template, 1, 1)(20, ContentLibrary_Conditional_14_Conditional_20_Template, 1, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(21, ContentLibrary_Conditional_14_Conditional_21_Template, 2, 2, "div", 58);
    \u0275\u0275conditionalCreate(22, ContentLibrary_Conditional_14_Conditional_22_Template, 2, 1, "p", 6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 59)(24, "div", 60)(25, "label", 61);
    \u0275\u0275text(26, "Title");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "input", 62);
    \u0275\u0275twoWayListener("ngModelChange", function ContentLibrary_Conditional_14_Template_input_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editTitle, $event) || (ctx_r1.editTitle = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 60)(29, "label", 63);
    \u0275\u0275text(30, "Description");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "textarea", 64);
    \u0275\u0275twoWayListener("ngModelChange", function ContentLibrary_Conditional_14_Template_textarea_ngModelChange_31_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editDescription, $event) || (ctx_r1.editDescription = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 60)(33, "label", 65);
    \u0275\u0275text(34, "Tags (comma-separated)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "input", 66);
    \u0275\u0275twoWayListener("ngModelChange", function ContentLibrary_Conditional_14_Template_input_ngModelChange_35_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.editTagsStr, $event) || (ctx_r1.editTagsStr = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(36, "div", 67)(37, "button", 68);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_14_Template_button_click_37_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.saveMetadata());
    });
    \u0275\u0275text(38);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(39, ContentLibrary_Conditional_14_Conditional_39_Template, 2, 1, "p", 6);
    \u0275\u0275conditionalCreate(40, ContentLibrary_Conditional_14_Conditional_40_Template, 2, 0, "p", 69);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div", 70)(42, "div", 71)(43, "span", 56);
    \u0275\u0275text(44, "Type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "span");
    \u0275\u0275text(46);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(47, "div", 71)(48, "span", 56);
    \u0275\u0275text(49, "Original File");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "span");
    \u0275\u0275text(51);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(52, "div", 71)(53, "span", 56);
    \u0275\u0275text(54, "Original Size");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "span");
    \u0275\u0275text(56);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(57, "div", 71)(58, "span", 56);
    \u0275\u0275text(59, "Transcoded Size");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "span");
    \u0275\u0275text(61);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(62, "div", 71)(63, "span", 56);
    \u0275\u0275text(64, "MIME Type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "span");
    \u0275\u0275text(66);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(67, "div", 71)(68, "span", 56);
    \u0275\u0275text(69, "Uploaded");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(70, "span");
    \u0275\u0275text(71);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.title);
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r1.selectedContent.type === "image" ? 13 : 14);
    \u0275\u0275advance(5);
    \u0275\u0275attribute("data-status", ctx_r1.selectedContent.transcodingStatus);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.selectedContent.transcodingStatus === "processing" ? 19 : 20);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.selectedContent.transcodingStatus === "processing" ? 21 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.selectedContent.transcodingStatus === "failed" && ctx_r1.selectedContent.transcodingError ? 22 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editTitle);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editDescription);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.editTagsStr);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.savingMetadata);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.savingMetadata ? "Saving..." : "Save Changes", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.metadataError ? 39 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.metadataSaved ? 40 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.type);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.originalFilename);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.formatBytes(ctx_r1.selectedContent.originalSizeBytes));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.transcodedSizeBytes !== null ? ctx_r1.formatBytes(ctx_r1.selectedContent.transcodedSizeBytes) : "\u2014");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent.originalMimeType);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(ctx_r1.selectedContent.createdAt));
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 82);
  }
  if (rf & 2) {
    const item_r10 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r1.getPreviewUrl(item_r10), \u0275\u0275sanitizeUrl);
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 83)(1, "span", 89);
    \u0275\u0275text(2, "\u25B6");
    \u0275\u0275elementEnd()();
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 84)(1, "span", 89);
    \u0275\u0275text(2, "\u{1F4F7}");
    \u0275\u0275elementEnd()();
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 90);
    \u0275\u0275text(1, "Pending");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 90);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 92);
    \u0275\u0275element(3, "div", 93);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r10 = \u0275\u0275nextContext(2).$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", ctx_r1.transcodingProgress[item_r10.id] ?? 0, "%");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r1.transcodingProgress[item_r10.id] ?? 0, "%");
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 91);
    \u0275\u0275text(1, "Failed");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_15_For_4_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 85);
    \u0275\u0275conditionalCreate(1, ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_1_Template, 2, 0, "span", 90)(2, ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_2_Template, 4, 3)(3, ContentLibrary_Conditional_15_For_4_Conditional_7_Conditional_3_Template, 2, 0, "span", 91);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r10 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275conditional(item_r10.transcodingStatus === "pending" ? 1 : item_r10.transcodingStatus === "processing" ? 2 : 3);
  }
}
function ContentLibrary_Conditional_15_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 78);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_15_For_4_Template_div_click_0_listener() {
      const item_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectContent(item_r10));
    })("keydown.enter", function ContentLibrary_Conditional_15_For_4_Template_div_keydown_enter_0_listener() {
      const item_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectContent(item_r10));
    })("keydown.space", function ContentLibrary_Conditional_15_For_4_Template_div_keydown_space_0_listener() {
      const item_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectContent(item_r10));
    });
    \u0275\u0275elementStart(1, "div", 79)(2, "div", 80)(3, "app-selection-checkbox", 81);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_15_For_4_Template_app_selection_checkbox_click_3_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(4, ContentLibrary_Conditional_15_For_4_Conditional_4_Template, 1, 1, "img", 82)(5, ContentLibrary_Conditional_15_For_4_Conditional_5_Template, 3, 0, "div", 83)(6, ContentLibrary_Conditional_15_For_4_Conditional_6_Template, 3, 0, "div", 84);
    \u0275\u0275conditionalCreate(7, ContentLibrary_Conditional_15_For_4_Conditional_7_Template, 4, 1, "div", 85);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 86)(9, "span", 87);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 88);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r10 = ctx.$implicit;
    const \u0275$index_258_r11 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r1.selectionService.isSelected(item_r10.id)());
    \u0275\u0275advance(2);
    \u0275\u0275classProp("any-selected", ctx_r1.selectionService.hasSelection());
    \u0275\u0275advance();
    \u0275\u0275property("itemId", item_r10.id)("itemIndex", \u0275$index_258_r11)("orderedIds", ctx_r1.contentIds);
    \u0275\u0275advance();
    \u0275\u0275conditional(item_r10.type === "image" && item_r10.transcodingStatus === "completed" ? 4 : item_r10.type === "video" ? 5 : 6);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(item_r10.transcodingStatus !== "completed" ? 7 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r10.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", item_r10.type, " \xB7 ", ctx_r1.formatBytes(item_r10.originalSizeBytes));
  }
}
function ContentLibrary_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 73);
    \u0275\u0275element(1, "app-select-all-checkbox", 74);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 75);
    \u0275\u0275repeaterCreate(3, ContentLibrary_Conditional_15_For_4_Template, 13, 12, "div", 76, _forTrack1);
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "app-bulk-action-toolbar", 77);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("allIds", ctx_r1.contentIds);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.filteredContent);
    \u0275\u0275advance(2);
    \u0275\u0275property("actions", ctx_r1.bulkActions);
  }
}
function ContentLibrary_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 12)(1, "p", 94);
    \u0275\u0275text(2, "No content uploaded yet. Drag files above to get started.");
    \u0275\u0275elementEnd()();
  }
}
function ContentLibrary_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 95);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_17_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    })("keydown.escape", function ContentLibrary_Conditional_17_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275elementStart(1, "div", 96);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_17_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ContentLibrary_Conditional_17_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Content");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Are you sure you want to delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, "? This will permanently remove the original and transcoded files.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 67)(10, "button", 51);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_17_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelDelete());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 97);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_17_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeDelete());
    });
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.selectedContent == null ? null : ctx_r1.selectedContent.title);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r1.deleting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.deleting ? "Deleting..." : "Delete", " ");
  }
}
function ContentLibrary_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 98);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_18_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    })("keydown.escape", function ContentLibrary_Conditional_18_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275elementStart(1, "div", 96);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_18_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ContentLibrary_Conditional_18_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Delete Content");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "You are about to permanently delete ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, ". This will remove all original and transcoded files. This cannot be undone.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 67)(10, "button", 51);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_18_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelBulkDelete());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 50);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_18_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeBulkDelete());
    });
    \u0275\u0275text(13, "Delete");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.selectionService.count(), " item(s)");
  }
}
function ContentLibrary_Conditional_19_Conditional_8_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 32);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_19_Conditional_8_For_2_Template_button_click_0_listener() {
      const tag_r16 = \u0275\u0275restoreView(_r15).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.toggleBulkTag(tag_r16));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tag_r16 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", ctx_r1.bulkTagInput.split(",").map(\u0275\u0275arrowFunction(3, arrowFn0, ctx)).includes(tag_r16));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tag_r16, " ");
  }
}
function ContentLibrary_Conditional_19_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 102);
    \u0275\u0275repeaterCreate(1, ContentLibrary_Conditional_19_Conditional_8_For_2_Template, 2, 4, "button", 30, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.allTags);
  }
}
function ContentLibrary_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 99);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_19_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelTagModal());
    })("keydown.escape", function ContentLibrary_Conditional_19_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelTagModal());
    });
    \u0275\u0275elementStart(1, "div", 96);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_19_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ContentLibrary_Conditional_19_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 60)(5, "label", 100);
    \u0275\u0275text(6, "Tags (comma-separated)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "input", 101);
    \u0275\u0275twoWayListener("ngModelChange", function ContentLibrary_Conditional_19_Template_input_ngModelChange_7_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.bulkTagInput, $event) || (ctx_r1.bulkTagInput = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(8, ContentLibrary_Conditional_19_Conditional_8_Template, 3, 0, "div", 102);
    \u0275\u0275elementStart(9, "div", 67)(10, "button", 51);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_19_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelTagModal());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 68);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_19_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeTagModal());
    });
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.tagModalMode === "add" ? "Add Tags" : "Remove Tags");
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.bulkTagInput);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.allTags.length > 0 ? 8 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", !ctx_r1.bulkTagInput.trim());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.tagModalMode === "add" ? "Add Tags" : "Remove Tags", " ");
  }
}
function ContentLibrary_Conditional_20_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p");
    \u0275\u0275text(1, "Loading playlists...");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_20_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.playlistsLoadError);
  }
}
function ContentLibrary_Conditional_20_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 105)(1, "input", 106);
    \u0275\u0275twoWayListener("ngModelChange", function ContentLibrary_Conditional_20_Conditional_6_For_2_Template_input_ngModelChange_1_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r1.selectedPlaylistId, $event) || (ctx_r1.selectedPlaylistId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const pl_r19 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("value", pl_r19.id);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.selectedPlaylistId);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(pl_r19.name);
  }
}
function ContentLibrary_Conditional_20_Conditional_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 94);
    \u0275\u0275text(1, "No playlists available.");
    \u0275\u0275elementEnd();
  }
}
function ContentLibrary_Conditional_20_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 104);
    \u0275\u0275repeaterCreate(1, ContentLibrary_Conditional_20_Conditional_6_For_2_Template, 4, 3, "label", 105, _forTrack1);
    \u0275\u0275conditionalCreate(3, ContentLibrary_Conditional_20_Conditional_6_Conditional_3_Template, 2, 0, "p", 94);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.playlists);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.playlists.length === 0 ? 3 : -1);
  }
}
function ContentLibrary_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 103);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_20_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelPlaylistModal());
    })("keydown.escape", function ContentLibrary_Conditional_20_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelPlaylistModal());
    });
    \u0275\u0275elementStart(1, "div", 96);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_20_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function ContentLibrary_Conditional_20_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Add to Playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, ContentLibrary_Conditional_20_Conditional_4_Template, 2, 0, "p")(5, ContentLibrary_Conditional_20_Conditional_5_Template, 2, 1, "p", 6)(6, ContentLibrary_Conditional_20_Conditional_6_Template, 4, 1, "div", 104);
    \u0275\u0275elementStart(7, "div", 67)(8, "button", 51);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_20_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelPlaylistModal());
    });
    \u0275\u0275text(9, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "button", 68);
    \u0275\u0275listener("click", function ContentLibrary_Conditional_20_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executePlaylistModal());
    });
    \u0275\u0275text(11, " Add to Playlist ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.playlistsLoading ? 4 : ctx_r1.playlistsLoadError ? 5 : 6);
    \u0275\u0275advance(6);
    \u0275\u0275property("disabled", !ctx_r1.selectedPlaylistId || ctx_r1.playlistsLoading);
  }
}
function ContentLibrary_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.actionError);
  }
}
function ContentLibrary_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 107);
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
var ContentLibrary = class _ContentLibrary {
  contentService = inject(ContentService);
  memberService = inject(MemberService);
  playlistService = inject(PlaylistService);
  router = inject(Router);
  selectionService = inject(SelectionService);
  orgId = "";
  contents = [];
  filteredContent = [];
  contentIds = [];
  allTags = [];
  loading = true;
  loadError = "";
  actionError = "";
  // Filters
  filterType;
  filterTags = [];
  // Storage
  storage = null;
  Infinity = Infinity;
  // Upload
  isDragOver = false;
  uploads = [];
  // Detail view
  selectedContent = null;
  editTitle = "";
  editDescription = "";
  editTagsStr = "";
  savingMetadata = false;
  metadataError = "";
  metadataSaved = false;
  // Delete
  showDeleteConfirm = false;
  deleting = false;
  // Bulk operations
  showBulkDeleteConfirm = false;
  bulkDeleteResolve = null;
  showTagModal = false;
  tagModalMode = "add";
  bulkTagInput = "";
  tagModalResolve = null;
  showPlaylistModal = false;
  playlists = [];
  playlistsLoading = false;
  playlistsLoadError = "";
  selectedPlaylistId = "";
  playlistModalResolve = null;
  // Toast
  toastMessage = "";
  toastType = "success";
  toastTimer = null;
  bulkActions = [
    {
      label: "Delete selected",
      variant: "danger",
      handler: () => this.handleBulkDelete()
    },
    {
      label: "Add tags",
      variant: "default",
      handler: () => this.handleBulkTag("add")
    },
    {
      label: "Remove tags",
      variant: "default",
      handler: () => this.handleBulkTag("remove")
    },
    {
      label: "Add to playlist",
      variant: "default",
      handler: () => this.handleBulkAddToPlaylist()
    }
  ];
  // Transcoding progress
  transcodingProgress = {};
  sseService = inject(DashboardSseService);
  sseSubs = [];
  ngOnInit() {
    this.loadCurrentOrg();
  }
  ngOnDestroy() {
    for (const sub of this.sseSubs)
      sub.unsubscribe();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const membership = memberships.find((m) => m.role === "org_admin") || memberships.find((m) => m.role === "editor") || memberships[0];
        if (membership) {
          this.orgId = membership.organisationId;
          this.loadContent();
          this.loadStorage();
          this.subscribeToTranscoding();
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
  subscribeToTranscoding() {
    this.sseSubs.push(this.sseService.transcodingProgress$.subscribe((event) => {
      const data = event.data;
      this.transcodingProgress[data.contentId] = data.progress;
      const item = this.contents.find((c) => c.id === data.contentId);
      if (item && item.transcodingStatus !== "processing") {
        item.transcodingStatus = "processing";
        this.applyFilters();
      }
    }), this.sseService.transcodingComplete$.subscribe((event) => {
      const data = event.data;
      const item = this.contents.find((c) => c.id === data.contentId);
      if (item) {
        item.transcodingStatus = "completed";
        item.transcodedSizeBytes = data.transcodedSizeBytes;
        delete this.transcodingProgress[data.contentId];
        this.applyFilters();
        if (this.selectedContent?.id === data.contentId) {
          this.selectedContent = __spreadValues({}, item);
        }
      }
      this.loadStorage();
    }), this.sseService.transcodingFailed$.subscribe((event) => {
      const data = event.data;
      const item = this.contents.find((c) => c.id === data.contentId);
      if (item) {
        item.transcodingStatus = "failed";
        item.transcodingError = data.error;
        delete this.transcodingProgress[data.contentId];
        this.applyFilters();
        if (this.selectedContent?.id === data.contentId) {
          this.selectedContent = __spreadValues({}, item);
        }
      }
    }));
  }
  loadContent() {
    this.loading = true;
    this.loadError = "";
    this.contentService.getAll(this.orgId).subscribe({
      next: (contents) => {
        this.contents = contents;
        this.extractTags();
        this.applyFilters();
        this.contentIds = this.filteredContent.map((c) => c.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied." : "Failed to load content.";
        this.loading = false;
      }
    });
  }
  loadStorage() {
    this.contentService.getStorage(this.orgId).subscribe({
      next: (info) => this.storage = info
    });
  }
  extractTags() {
    const tagSet = /* @__PURE__ */ new Set();
    this.contents.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    this.allTags = Array.from(tagSet).sort();
  }
  applyFilters() {
    let filtered = this.contents;
    if (this.filterType) {
      filtered = filtered.filter((c) => c.type === this.filterType);
    }
    if (this.filterTags.length > 0) {
      filtered = filtered.filter((c) => this.filterTags.some((t) => c.tags.includes(t)));
    }
    this.filteredContent = filtered;
    this.contentIds = filtered.map((c) => c.id);
  }
  setTypeFilter(type) {
    this.filterType = type;
    this.applyFilters();
  }
  toggleTag(tag) {
    const idx = this.filterTags.indexOf(tag);
    if (idx >= 0) {
      this.filterTags.splice(idx, 1);
    } else {
      this.filterTags.push(tag);
    }
    this.applyFilters();
  }
  clearTags() {
    this.filterTags = [];
    this.applyFilters();
  }
  // --- Upload ---
  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }
  onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }
  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (event.dataTransfer?.files) {
      this.uploadFiles(Array.from(event.dataTransfer.files));
    }
  }
  onFileSelect(event) {
    const input = event.target;
    if (input.files) {
      this.uploadFiles(Array.from(input.files));
      input.value = "";
    }
  }
  uploadFiles(files) {
    for (const file of files) {
      const item = {
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        progress: 0,
        status: "uploading"
      };
      this.uploads.push(item);
      this.contentService.upload(this.orgId, file, item.title, "", []).subscribe({
        next: (event) => {
          if (event.type === "progress") {
            item.progress = event.progress ?? 0;
          } else if (event.type === "complete") {
            item.progress = 100;
            item.status = "done";
            if (event.content) {
              this.contents.unshift(event.content);
              this.extractTags();
              this.applyFilters();
            }
            this.loadStorage();
            this.clearDoneUploads();
          }
        },
        error: (err) => {
          item.status = "error";
          item.error = err.error?.message || "Upload failed";
        }
      });
    }
  }
  clearDoneUploads() {
    setTimeout(() => {
      this.uploads = this.uploads.filter((u) => u.status === "uploading");
    }, 2e3);
  }
  // --- Detail ---
  selectContent(content) {
    this.selectedContent = content;
    this.editTitle = content.title;
    this.editDescription = content.description || "";
    this.editTagsStr = content.tags.join(", ");
    this.metadataError = "";
    this.metadataSaved = false;
  }
  closeDetail() {
    this.selectedContent = null;
  }
  getPreviewUrl(content) {
    if (content.transcodingStatus === "completed") {
      return this.contentService.getTranscodedUrl(content.id);
    }
    return this.contentService.getOriginalUrl(content.id);
  }
  // --- Metadata ---
  saveMetadata() {
    if (!this.selectedContent)
      return;
    this.savingMetadata = true;
    this.metadataError = "";
    this.metadataSaved = false;
    const tags = this.editTagsStr.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    this.contentService.updateMetadata(this.orgId, this.selectedContent.id, {
      title: this.editTitle,
      description: this.editDescription,
      tags
    }).subscribe({
      next: (updated) => {
        this.savingMetadata = false;
        this.metadataSaved = true;
        this.selectedContent = updated;
        const idx = this.contents.findIndex((c) => c.id === updated.id);
        if (idx >= 0)
          this.contents[idx] = updated;
        this.extractTags();
        this.applyFilters();
      },
      error: (err) => {
        this.metadataError = err.error?.message || "Failed to save changes.";
        this.savingMetadata = false;
      }
    });
  }
  // --- Re-upload ---
  onReUpload(event) {
    const input = event.target;
    if (!input.files?.length || !this.selectedContent)
      return;
    const file = input.files[0];
    input.value = "";
    const item = {
      file,
      title: this.selectedContent.title,
      progress: 0,
      status: "uploading"
    };
    this.uploads.push(item);
    this.contentService.reUpload(this.orgId, this.selectedContent.id, file).subscribe({
      next: (event2) => {
        if (event2.type === "progress") {
          item.progress = event2.progress ?? 0;
        } else if (event2.type === "complete") {
          item.progress = 100;
          item.status = "done";
          if (event2.content) {
            this.selectedContent = event2.content;
            const idx = this.contents.findIndex((c) => c.id === event2.content.id);
            if (idx >= 0)
              this.contents[idx] = event2.content;
            this.applyFilters();
          }
          this.loadStorage();
          this.clearDoneUploads();
        }
      },
      error: (err) => {
        item.status = "error";
        item.error = err.error?.message || "Re-upload failed";
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
    if (!this.selectedContent)
      return;
    this.deleting = true;
    this.actionError = "";
    this.contentService.delete(this.orgId, this.selectedContent.id).subscribe({
      next: () => {
        this.contents = this.contents.filter((c) => c.id !== this.selectedContent.id);
        this.extractTags();
        this.applyFilters();
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.selectedContent = null;
        this.loadStorage();
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to delete content.";
        this.deleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }
  // --- Bulk Operations ---
  async handleBulkDelete() {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.contentService.bulkDelete(this.orgId, ids));
    this.showToast(`${result.deleted} item(s) deleted`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadContent();
    this.loadStorage();
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
  async handleBulkTag(mode) {
    const confirmed = await this.openTagModal(mode);
    if (!confirmed)
      throw new Error("cancelled");
    const tags = this.bulkTagInput.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    if (tags.length === 0)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = mode === "add" ? await firstValueFrom(this.contentService.bulkTag(this.orgId, ids, tags)) : await firstValueFrom(this.contentService.bulkUntag(this.orgId, ids, tags));
    this.showToast(`${result.updated} item(s) ${mode === "add" ? "tagged" : "untagged"}`, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadContent();
  }
  openTagModal(mode) {
    this.tagModalMode = mode;
    this.bulkTagInput = "";
    this.showTagModal = true;
    return new Promise((resolve) => {
      this.tagModalResolve = resolve;
    });
  }
  cancelTagModal() {
    this.showTagModal = false;
    this.tagModalResolve?.(false);
    this.tagModalResolve = null;
  }
  executeTagModal() {
    this.showTagModal = false;
    this.tagModalResolve?.(true);
    this.tagModalResolve = null;
  }
  toggleBulkTag(tag) {
    const tags = this.bulkTagInput.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.bulkTagInput = tags.join(", ");
  }
  async handleBulkAddToPlaylist() {
    const confirmed = await this.openPlaylistModal();
    if (!confirmed)
      throw new Error("cancelled");
    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.contentService.bulkAddToPlaylist(this.orgId, ids, this.selectedPlaylistId));
    const playlistName = this.playlists.find((p) => p.id === this.selectedPlaylistId)?.name ?? "selected playlist";
    let message = `${result.added} item(s) added to ${playlistName}`;
    if (result.alreadyPresent > 0) {
      message += ` (${result.alreadyPresent} were already in the playlist)`;
    }
    this.showToast(message, "success");
    if (result.notFound.length > 0) {
      this.showToast(`${result.notFound.length} item(s) could not be found and were skipped`, "warning");
    }
    this.loadContent();
  }
  openPlaylistModal() {
    this.showPlaylistModal = true;
    this.selectedPlaylistId = "";
    this.playlistsLoadError = "";
    this.playlistsLoading = true;
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
        this.playlistsLoading = false;
      },
      error: () => {
        this.playlistsLoadError = "Failed to load playlists.";
        this.playlistsLoading = false;
      }
    });
    return new Promise((resolve) => {
      this.playlistModalResolve = resolve;
    });
  }
  cancelPlaylistModal() {
    this.showPlaylistModal = false;
    this.playlistModalResolve?.(false);
    this.playlistModalResolve = null;
  }
  executePlaylistModal() {
    this.showPlaylistModal = false;
    this.playlistModalResolve?.(true);
    this.playlistModalResolve = null;
  }
  showToast(message, type) {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer)
      clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = "";
    }, 4e3);
  }
  // --- Helpers ---
  formatBytes(bytes) {
    if (bytes === 0)
      return "0 B";
    if (!isFinite(bytes))
      return "Unlimited";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
  }
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  getOriginalPercent() {
    if (!this.storage)
      return 0;
    const combinedLimit = (this.storage.originalLimitBytes || 0) + (this.storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = this.storage.originalUsedBytes + this.storage.transcodedUsedBytes;
      if (totalUsed === 0)
        return 0;
      return this.storage.originalUsedBytes / totalUsed * 100;
    }
    return this.storage.originalUsedBytes / combinedLimit * 100;
  }
  getTranscodedPercent() {
    if (!this.storage)
      return 0;
    const combinedLimit = (this.storage.originalLimitBytes || 0) + (this.storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = this.storage.originalUsedBytes + this.storage.transcodedUsedBytes;
      if (totalUsed === 0)
        return 0;
      return this.storage.transcodedUsedBytes / totalUsed * 100;
    }
    return this.storage.transcodedUsedBytes / combinedLimit * 100;
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function ContentLibrary_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ContentLibrary)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ContentLibrary, selectors: [["app-content-library"]], features: [\u0275\u0275ProvidersFeature([SelectionService])], decls: 23, vars: 16, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "header-right"], [1, "storage-bar-container"], [1, "error"], [1, "loading-text"], [1, "tag-filter"], [1, "upload-zone", 3, "drag-over"], [1, "upload-list"], [1, "detail-card", "wide"], [1, "empty-state"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Manage tags", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add to playlist", "tabindex", "0", 1, "modal-overlay"], [1, "toast", 3, "toast-error", "toast-success", "toast-warning"], [1, "type-toggle"], [1, "toggle-btn", 3, "click"], [1, "storage-info"], [1, "storage-label"], [1, "storage-values"], [1, "storage-bar"], [1, "storage-bar-original"], [1, "storage-bar-transcoded"], [1, "storage-legend"], [1, "legend-item"], [1, "legend-dot", "original"], [1, "legend-dot", "transcoded"], [1, "tag-chip", 3, "active"], [1, "tag-chip", "clear"], [1, "tag-chip", 3, "click"], [1, "tag-chip", "clear", 3, "click"], [1, "upload-zone", 3, "dragover", "dragleave", "drop"], [1, "upload-content"], [1, "upload-text"], [1, "upload-sub"], [1, "btn", "btn-primary", "upload-btn"], ["type", "file", "multiple", "", "accept", "image/*,video/*", 2, "display", "none", 3, "change"], [1, "upload-item"], [1, "upload-item-info"], [1, "upload-item-name"], [1, "upload-item-status"], [1, "progress-bar"], [1, "progress-fill"], [1, "detail-header"], [1, "detail-actions"], [1, "btn", "btn-secondary"], ["type", "file", "accept", "image/*,video/*", 2, "display", "none", 3, "change"], [1, "btn", "btn-danger", 3, "click"], [1, "btn", "btn-secondary", 3, "click"], [1, "preview-area"], ["alt", "Preview", 1, "preview-img", 3, "src"], ["controls", "", 1, "preview-video", 3, "src"], [1, "transcoding-status"], [1, "detail-label"], [1, "status-badge"], [1, "progress-bar", "transcoding-bar"], [1, "metadata-section"], [1, "form-group"], ["for", "editTitle"], ["id", "editTitle", "type", "text", "name", "editTitle", 3, "ngModelChange", "ngModel"], ["for", "editDescription"], ["id", "editDescription", "name", "editDescription", "rows", "3", 3, "ngModelChange", "ngModel"], ["for", "editTags"], ["id", "editTags", "type", "text", "name", "editTags", 3, "ngModelChange", "ngModel"], [1, "form-actions"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "success"], [1, "file-info-grid"], [1, "detail-item"], [1, "progress-fill", "processing"], [1, "grid-header"], [3, "allIds"], [1, "content-grid"], ["tabindex", "0", "role", "button", 1, "content-card", 3, "selected"], [3, "actions"], ["tabindex", "0", "role", "button", 1, "content-card", 3, "click", "keydown.enter", "keydown.space"], [1, "card-thumbnail"], [1, "card-checkbox"], [3, "click", "itemId", "itemIndex", "orderedIds"], ["alt", "", "loading", "lazy", 1, "thumb-img", 3, "src"], [1, "thumb-placeholder", "video"], [1, "thumb-placeholder"], [1, "transcoding-overlay"], [1, "card-info"], [1, "card-title"], [1, "card-meta"], [1, "thumb-icon"], [1, "overlay-text"], [1, "overlay-text", "failed"], [1, "overlay-bar"], [1, "overlay-fill"], [1, "empty-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm deletion", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [1, "btn", "btn-danger", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm bulk delete", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "dialog", "aria-modal", "true", "aria-label", "Manage tags", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["for", "bulkTagInput"], ["id", "bulkTagInput", "type", "text", "name", "bulkTagInput", "placeholder", "e.g. promo, seasonal", 3, "ngModelChange", "ngModel"], [1, "tag-suggestions"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add to playlist", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "playlist-list"], [1, "playlist-option"], ["type", "radio", "name", "playlistPick", 3, "ngModelChange", "value", "ngModel"], [1, "toast"]], template: function ContentLibrary_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function ContentLibrary_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Content Library");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, ContentLibrary_Conditional_7_Template, 8, 6, "div", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, ContentLibrary_Conditional_8_Template, 17, 10, "div", 5);
      \u0275\u0275conditionalCreate(9, ContentLibrary_Conditional_9_Template, 2, 1, "p", 6);
      \u0275\u0275conditionalCreate(10, ContentLibrary_Conditional_10_Template, 2, 0, "p", 7);
      \u0275\u0275conditionalCreate(11, ContentLibrary_Conditional_11_Template, 4, 1, "div", 8);
      \u0275\u0275conditionalCreate(12, ContentLibrary_Conditional_12_Template, 9, 2, "div", 9);
      \u0275\u0275conditionalCreate(13, ContentLibrary_Conditional_13_Template, 3, 0, "div", 10);
      \u0275\u0275conditionalCreate(14, ContentLibrary_Conditional_14_Template, 72, 19, "div", 11);
      \u0275\u0275conditionalCreate(15, ContentLibrary_Conditional_15_Template, 6, 2);
      \u0275\u0275conditionalCreate(16, ContentLibrary_Conditional_16_Template, 3, 0, "div", 12);
      \u0275\u0275conditionalCreate(17, ContentLibrary_Conditional_17_Template, 14, 3, "div", 13);
      \u0275\u0275conditionalCreate(18, ContentLibrary_Conditional_18_Template, 14, 1, "div", 14);
      \u0275\u0275conditionalCreate(19, ContentLibrary_Conditional_19_Template, 14, 5, "div", 15);
      \u0275\u0275conditionalCreate(20, ContentLibrary_Conditional_20_Template, 12, 2, "div", 16);
      \u0275\u0275conditionalCreate(21, ContentLibrary_Conditional_21_Template, 2, 1, "p", 6);
      \u0275\u0275conditionalCreate(22, ContentLibrary_Conditional_22_Template, 2, 7, "div", 17);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.selectedContent ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.storage && !ctx.selectedContent ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedContent && ctx.allTags.length > 0 ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.selectedContent ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.uploads.length > 0 && !ctx.selectedContent ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.selectedContent ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedContent && ctx.filteredContent.length > 0 ? 15 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.selectedContent && ctx.filteredContent.length === 0 && !ctx.loadError ? 16 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showDeleteConfirm ? 17 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showBulkDeleteConfirm ? 18 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showTagModal ? 19 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showPlaylistModal ? 20 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 21 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toastMessage ? 22 : -1);
    }
  }, dependencies: [FormsModule, DefaultValueAccessor, RadioControlValueAccessor, NgControlStatus, NgModel, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.header-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.type-toggle[_ngcontent-%COMP%] {\n  display: flex;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  overflow: hidden;\n}\n.toggle-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  border: none;\n  background: none;\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  transition: all 0.15s;\n}\n.toggle-btn.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.toggle-btn[_ngcontent-%COMP%]:hover:not(.active) {\n  background: var(--color-bg-tertiary);\n}\n.tag-filter[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.tag-chip[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.75rem;\n  border-radius: 9999px;\n  border: 1px solid var(--color-border);\n  background: var(--color-bg-secondary);\n  color: var(--color-text-secondary);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.15s;\n}\n.tag-chip.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  border-color: var(--color-accent);\n  color: #fff;\n}\n.tag-chip.clear[_ngcontent-%COMP%] {\n  background: none;\n  border-color: var(--color-text-muted);\n  color: var(--color-text-muted);\n}\n.tag-chip[_ngcontent-%COMP%]:hover:not(.active) {\n  border-color: var(--color-text-secondary);\n  color: var(--color-text-primary);\n}\n.storage-bar-container[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1rem 1.25rem;\n  margin-bottom: 1.25rem;\n}\n.storage-info[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.5rem;\n}\n.storage-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n}\n.storage-values[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n}\n.storage-bar[_ngcontent-%COMP%] {\n  height: 0.5rem;\n  background: var(--color-bg-tertiary);\n  border-radius: 9999px;\n  position: relative;\n  overflow: hidden;\n}\n.storage-bar-original[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 0;\n  top: 0;\n  height: 100%;\n  background: var(--color-accent);\n  border-radius: 9999px 0 0 9999px;\n  transition: width 0.3s;\n}\n.storage-bar-transcoded[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0;\n  height: 100%;\n  background: #8b5cf6;\n  border-radius: 0;\n  transition: width 0.3s, left 0.3s;\n}\n.storage-legend[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  margin-top: 0.5rem;\n}\n.legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n}\n.legend-dot[_ngcontent-%COMP%] {\n  width: 0.5rem;\n  height: 0.5rem;\n  border-radius: 50%;\n}\n.legend-dot.original[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n}\n.legend-dot.transcoded[_ngcontent-%COMP%] {\n  background: #8b5cf6;\n}\n.upload-zone[_ngcontent-%COMP%] {\n  border: 2px dashed var(--color-border);\n  border-radius: 0.5rem;\n  padding: 2rem;\n  text-align: center;\n  margin-bottom: 1.25rem;\n  transition: all 0.15s;\n  cursor: pointer;\n}\n.upload-zone.drag-over[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n  background: rgba(59, 130, 246, 0.05);\n}\n.upload-text[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 0.25rem;\n}\n.upload-sub[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin: 0 0 0.75rem;\n}\n.upload-btn[_ngcontent-%COMP%] {\n  cursor: pointer;\n  display: inline-block;\n}\n.upload-list[_ngcontent-%COMP%] {\n  margin-bottom: 1.25rem;\n}\n.upload-item[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 0.5rem;\n}\n.upload-item-info[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.375rem;\n}\n.upload-item-name[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 70%;\n}\n.upload-item-status[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n}\n.upload-item-status.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.progress-bar[_ngcontent-%COMP%] {\n  height: 0.375rem;\n  background: var(--color-bg-tertiary);\n  border-radius: 9999px;\n  overflow: hidden;\n}\n.progress-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  background: var(--color-accent);\n  border-radius: 9999px;\n  transition: width 0.2s;\n}\n.progress-fill.done[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.progress-fill.error[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.progress-fill.processing[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.transcoding-bar[_ngcontent-%COMP%] {\n  margin-top: 0.5rem;\n}\n.content-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));\n  gap: 1rem;\n}\n.content-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.content-card[_ngcontent-%COMP%]:hover, \n.content-card[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.card-thumbnail[_ngcontent-%COMP%] {\n  position: relative;\n  aspect-ratio: 16/9;\n  background: var(--color-bg-tertiary);\n  overflow: hidden;\n}\n.thumb-img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.thumb-placeholder[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 2rem;\n  color: var(--color-text-muted);\n}\n.thumb-placeholder.video[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n}\n.transcoding-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.375rem;\n  padding: 0.5rem;\n}\n.overlay-text[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: #fbbf24;\n}\n.overlay-text.failed[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.overlay-bar[_ngcontent-%COMP%] {\n  width: 80%;\n  height: 0.25rem;\n  background: rgba(255, 255, 255, 0.2);\n  border-radius: 9999px;\n  overflow: hidden;\n}\n.overlay-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  background: #fbbf24;\n  border-radius: 9999px;\n  transition: width 0.2s;\n}\n.card-info[_ngcontent-%COMP%] {\n  padding: 0.75rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.card-title[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.card-meta[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  text-transform: capitalize;\n}\n.detail-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 52rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.detail-card.wide[_ngcontent-%COMP%] {\n  max-width: 52rem;\n}\n.detail-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.detail-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.detail-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.preview-area[_ngcontent-%COMP%] {\n  margin-bottom: 1.5rem;\n  background: #000;\n  border-radius: 0.375rem;\n  overflow: hidden;\n  max-height: 28rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.preview-img[_ngcontent-%COMP%] {\n  max-width: 100%;\n  max-height: 28rem;\n  object-fit: contain;\n}\n.preview-video[_ngcontent-%COMP%] {\n  max-width: 100%;\n  max-height: 28rem;\n}\n.transcoding-status[_ngcontent-%COMP%] {\n  margin-bottom: 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.status-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.status-badge[data-status=completed][_ngcontent-%COMP%] {\n  background: #22c55e20;\n  color: #22c55e;\n}\n.status-badge[data-status=pending][_ngcontent-%COMP%] {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.status-badge[data-status=processing][_ngcontent-%COMP%] {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.status-badge[data-status=failed][_ngcontent-%COMP%] {\n  background: #ef444420;\n  color: #ef4444;\n}\n.metadata-section[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n  margin-bottom: 1.25rem;\n}\n.file-info-grid[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.detail-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n  font-family: inherit;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   textarea[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1rem;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.grid-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.75rem;\n}\n.card-checkbox[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 0.375rem;\n  left: 0.375rem;\n  z-index: 2;\n  opacity: 0;\n  transition: opacity 0.15s;\n}\n.content-card[_ngcontent-%COMP%]:hover   .card-checkbox[_ngcontent-%COMP%], \n.card-checkbox.any-selected[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.content-card.selected[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n  box-shadow: 0 0 0 1px var(--color-accent);\n}\n.tag-suggestions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n  margin-bottom: 1rem;\n}\n.playlist-list[_ngcontent-%COMP%] {\n  max-height: 16rem;\n  overflow-y: auto;\n  margin-bottom: 1rem;\n}\n.playlist-option[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n  transition: background 0.1s;\n}\n.playlist-option[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n}\n.playlist-option[_ngcontent-%COMP%]   input[type=radio][_ngcontent-%COMP%] {\n  accent-color: var(--color-accent);\n}\n.toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 1.5rem;\n  right: 1.5rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.5rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  z-index: 2000;\n  animation: _ngcontent-%COMP%_slideUp 0.2s ease-out;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #166534;\n  color: #bbf7d0;\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.toast-warning[_ngcontent-%COMP%] {\n  background: #92400e;\n  color: #fef3c7;\n}\n@keyframes _ngcontent-%COMP%_slideUp {\n  from {\n    transform: translateY(1rem);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.success[_ngcontent-%COMP%] {\n  color: #22c55e;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=content-library.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ContentLibrary, [{
    type: Component,
    args: [{ selector: "app-content-library", standalone: true, imports: [FormsModule, SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent], providers: [SelectionService], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Content Library</h1>
        </div>
        @if (!selectedContent) {
          <div class="header-right">
            <div class="type-toggle">
              <button class="toggle-btn" [class.active]="!filterType" (click)="setTypeFilter(undefined)">All</button>
              <button class="toggle-btn" [class.active]="filterType === 'image'" (click)="setTypeFilter('image')">Images</button>
              <button class="toggle-btn" [class.active]="filterType === 'video'" (click)="setTypeFilter('video')">Videos</button>
            </div>
          </div>
        }
      </header>

      <!-- Storage Usage -->
      @if (storage && !selectedContent) {
        <div class="storage-bar-container">
          <div class="storage-info">
            <span class="storage-label">Storage</span>
            <span class="storage-values">
              {{ formatBytes(storage.originalUsedBytes + storage.transcodedUsedBytes) }}
              @if (storage.originalLimitBytes > 0 || storage.transcodedLimitBytes > 0) {
                / {{ formatBytes((storage.originalLimitBytes || Infinity) + (storage.transcodedLimitBytes || Infinity)) }}
              }
            </span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-original" [style.width.%]="getOriginalPercent()"></div>
            <div class="storage-bar-transcoded" [style.width.%]="getTranscodedPercent()" [style.left.%]="getOriginalPercent()"></div>
          </div>
          <div class="storage-legend">
            <span class="legend-item"><span class="legend-dot original"></span> Original ({{ formatBytes(storage.originalUsedBytes) }})</span>
            <span class="legend-item"><span class="legend-dot transcoded"></span> Transcoded ({{ formatBytes(storage.transcodedUsedBytes) }})</span>
          </div>
        </div>
      }

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading content...</p>
      }

      <!-- Tag Filter -->
      @if (!loading && !selectedContent && allTags.length > 0) {
        <div class="tag-filter">
          @for (tag of allTags; track tag) {
            <button class="tag-chip" [class.active]="filterTags.includes(tag)" (click)="toggleTag(tag)">
              {{ tag }}
            </button>
          }
          @if (filterTags.length > 0) {
            <button class="tag-chip clear" (click)="clearTags()">Clear</button>
          }
        </div>
      }

      <!-- Upload Area -->
      @if (!selectedContent) {
        <div
          class="upload-zone"
          [class.drag-over]="isDragOver"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
        >
          <div class="upload-content">
            <p class="upload-text">Drag & drop files here</p>
            <p class="upload-sub">or</p>
            <label class="btn btn-primary upload-btn">
              Browse Files
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                (change)="onFileSelect($event)"
                style="display:none"
              />
            </label>
          </div>
        </div>
      }

      <!-- Upload Progress -->
      @if (uploads.length > 0 && !selectedContent) {
        <div class="upload-list">
          @for (item of uploads; track item.file.name) {
            <div class="upload-item">
              <div class="upload-item-info">
                <span class="upload-item-name">{{ item.file.name }}</span>
                <span class="upload-item-status" [class.error]="item.status === 'error'">
                  @if (item.status === 'uploading') {
                    {{ item.progress }}%
                  } @else if (item.status === 'done') {
                    Done
                  } @else {
                    {{ item.error || 'Error' }}
                  }
                </span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [class.error]="item.status === 'error'"
                  [class.done]="item.status === 'done'"
                  [style.width.%]="item.progress"
                ></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Content Detail View -->
      @if (selectedContent) {
        <div class="detail-card wide">
          <div class="detail-header">
            <h2>{{ selectedContent.title }}</h2>
            <div class="detail-actions">
              <label class="btn btn-secondary">
                Re-upload
                <input
                  type="file"
                  accept="image/*,video/*"
                  (change)="onReUpload($event)"
                  style="display:none"
                />
              </label>
              <button class="btn btn-danger" (click)="confirmDelete()">Delete</button>
              <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-area">
            @if (selectedContent.type === 'image') {
              <img [src]="getPreviewUrl(selectedContent)" alt="Preview" class="preview-img" />
            } @else {
              <video
                [src]="getPreviewUrl(selectedContent)"
                controls
                class="preview-video"
              ></video>
            }
          </div>

          <!-- Transcoding Status -->
          <div class="transcoding-status">
            <span class="detail-label">Transcoding</span>
            <span class="status-badge" [attr.data-status]="selectedContent.transcodingStatus">
              @if (selectedContent.transcodingStatus === 'processing') {
                Processing {{ transcodingProgress[selectedContent.id] ?? 0 }}%
              } @else {
                {{ selectedContent.transcodingStatus }}
              }
            </span>
            @if (selectedContent.transcodingStatus === 'processing') {
              <div class="progress-bar transcoding-bar">
                <div class="progress-fill processing" [style.width.%]="transcodingProgress[selectedContent.id] ?? 0"></div>
              </div>
            }
            @if (selectedContent.transcodingStatus === 'failed' && selectedContent.transcodingError) {
              <p class="error">{{ selectedContent.transcodingError }}</p>
            }
          </div>

          <!-- Metadata Editing -->
          <div class="metadata-section">
            <div class="form-group">
              <label for="editTitle">Title</label>
              <input id="editTitle" type="text" [(ngModel)]="editTitle" name="editTitle" />
            </div>
            <div class="form-group">
              <label for="editDescription">Description</label>
              <textarea id="editDescription" [(ngModel)]="editDescription" name="editDescription" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="editTags">Tags (comma-separated)</label>
              <input id="editTags" type="text" [(ngModel)]="editTagsStr" name="editTags" />
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" (click)="saveMetadata()" [disabled]="savingMetadata">
                {{ savingMetadata ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
            @if (metadataError) {
              <p class="error">{{ metadataError }}</p>
            }
            @if (metadataSaved) {
              <p class="success">Changes saved.</p>
            }
          </div>

          <!-- File Info -->
          <div class="file-info-grid">
            <div class="detail-item">
              <span class="detail-label">Type</span>
              <span>{{ selectedContent.type }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Original File</span>
              <span>{{ selectedContent.originalFilename }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Original Size</span>
              <span>{{ formatBytes(selectedContent.originalSizeBytes) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Transcoded Size</span>
              <span>{{ selectedContent.transcodedSizeBytes !== null ? formatBytes(selectedContent.transcodedSizeBytes) : '\u2014' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">MIME Type</span>
              <span>{{ selectedContent.originalMimeType }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Uploaded</span>
              <span>{{ formatDate(selectedContent.createdAt) }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Content Grid -->
      @if (!loading && !selectedContent && filteredContent.length > 0) {
        <div class="grid-header">
          <app-select-all-checkbox [allIds]="contentIds" />
        </div>
        <div class="content-grid">
          @for (item of filteredContent; track item.id; let i = $index) {
            <div class="content-card" [class.selected]="selectionService.isSelected(item.id)()" (click)="selectContent(item)" tabindex="0" role="button"
                 (keydown.enter)="selectContent(item)" (keydown.space)="selectContent(item)">
              <div class="card-thumbnail">
                <div class="card-checkbox" [class.any-selected]="selectionService.hasSelection()">
                  <app-selection-checkbox
                    [itemId]="item.id"
                    [itemIndex]="i"
                    [orderedIds]="contentIds"
                    (click)="$event.stopPropagation()"
                  />
                </div>
                @if (item.type === 'image' && item.transcodingStatus === 'completed') {
                  <img [src]="getPreviewUrl(item)" alt="" class="thumb-img" loading="lazy" />
                } @else if (item.type === 'video') {
                  <div class="thumb-placeholder video">
                    <span class="thumb-icon">&#9654;</span>
                  </div>
                } @else {
                  <div class="thumb-placeholder">
                    <span class="thumb-icon">&#128247;</span>
                  </div>
                }
                <!-- Transcoding overlay -->
                @if (item.transcodingStatus !== 'completed') {
                  <div class="transcoding-overlay">
                    @if (item.transcodingStatus === 'pending') {
                      <span class="overlay-text">Pending</span>
                    } @else if (item.transcodingStatus === 'processing') {
                      <span class="overlay-text">{{ transcodingProgress[item.id] ?? 0 }}%</span>
                      <div class="overlay-bar">
                        <div class="overlay-fill" [style.width.%]="transcodingProgress[item.id] ?? 0"></div>
                      </div>
                    } @else {
                      <span class="overlay-text failed">Failed</span>
                    }
                  </div>
                }
              </div>
              <div class="card-info">
                <span class="card-title">{{ item.title }}</span>
                <span class="card-meta">{{ item.type }} &middot; {{ formatBytes(item.originalSizeBytes) }}</span>
              </div>
            </div>
          }
        </div>

        <app-bulk-action-toolbar [actions]="bulkActions" />
      }

      @if (!loading && !selectedContent && filteredContent.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No content uploaded yet. Drag files above to get started.</p>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Content</h2>
            <p>Are you sure you want to delete <strong>{{ selectedContent?.title }}</strong>? This will permanently remove the original and transcoded files.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete' }}
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
            <h2>Delete Content</h2>
            <p>You are about to permanently delete <strong>{{ selectionService.count() }} item(s)</strong>. This will remove all original and transcoded files. This cannot be undone.</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelBulkDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeBulkDelete()">Delete</button>
            </div>
          </div>
        </div>
      }

      <!-- Tag Entry Modal -->
      @if (showTagModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Manage tags"
             tabindex="0" (click)="cancelTagModal()" (keydown.escape)="cancelTagModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>{{ tagModalMode === 'add' ? 'Add Tags' : 'Remove Tags' }}</h2>
            <div class="form-group">
              <label for="bulkTagInput">Tags (comma-separated)</label>
              <input id="bulkTagInput" type="text" [(ngModel)]="bulkTagInput" name="bulkTagInput" placeholder="e.g. promo, seasonal" />
            </div>
            @if (allTags.length > 0) {
              <div class="tag-suggestions">
                @for (tag of allTags; track tag) {
                  <button class="tag-chip" [class.active]="bulkTagInput.split(',').map(t => t.trim()).includes(tag)" (click)="toggleBulkTag(tag)">
                    {{ tag }}
                  </button>
                }
              </div>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelTagModal()">Cancel</button>
              <button class="btn btn-primary" (click)="executeTagModal()" [disabled]="!bulkTagInput.trim()">
                {{ tagModalMode === 'add' ? 'Add Tags' : 'Remove Tags' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Playlist Picker Modal -->
      @if (showPlaylistModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add to playlist"
             tabindex="0" (click)="cancelPlaylistModal()" (keydown.escape)="cancelPlaylistModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add to Playlist</h2>
            @if (playlistsLoading) {
              <p>Loading playlists...</p>
            } @else if (playlistsLoadError) {
              <p class="error">{{ playlistsLoadError }}</p>
            } @else {
              <div class="playlist-list">
                @for (pl of playlists; track pl.id) {
                  <label class="playlist-option">
                    <input type="radio" name="playlistPick" [value]="pl.id" [(ngModel)]="selectedPlaylistId" />
                    <span>{{ pl.name }}</span>
                  </label>
                }
                @if (playlists.length === 0) {
                  <p class="empty-text">No playlists available.</p>
                }
              </div>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelPlaylistModal()">Cancel</button>
              <button class="btn btn-primary" (click)="executePlaylistModal()" [disabled]="!selectedPlaylistId || playlistsLoading">
                Add to Playlist
              </button>
            </div>
          </div>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Toast -->
      @if (toastMessage) {
        <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'" [class.toast-warning]="toastType === 'warning'">
          {{ toastMessage }}
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;77fe920b8e5b2482225a8c941dcc4b5eed690f80be1b6fe6fc0330ab70e4c92d;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/content/content-library.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.header-right {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.type-toggle {\n  display: flex;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  overflow: hidden;\n}\n.toggle-btn {\n  padding: 0.375rem 0.75rem;\n  border: none;\n  background: none;\n  color: var(--color-text-secondary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  transition: all 0.15s;\n}\n.toggle-btn.active {\n  background: var(--color-accent);\n  color: #fff;\n}\n.toggle-btn:hover:not(.active) {\n  background: var(--color-bg-tertiary);\n}\n.tag-filter {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-bottom: 1rem;\n}\n.tag-chip {\n  padding: 0.25rem 0.75rem;\n  border-radius: 9999px;\n  border: 1px solid var(--color-border);\n  background: var(--color-bg-secondary);\n  color: var(--color-text-secondary);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.15s;\n}\n.tag-chip.active {\n  background: var(--color-accent);\n  border-color: var(--color-accent);\n  color: #fff;\n}\n.tag-chip.clear {\n  background: none;\n  border-color: var(--color-text-muted);\n  color: var(--color-text-muted);\n}\n.tag-chip:hover:not(.active) {\n  border-color: var(--color-text-secondary);\n  color: var(--color-text-primary);\n}\n.storage-bar-container {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1rem 1.25rem;\n  margin-bottom: 1.25rem;\n}\n.storage-info {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.5rem;\n}\n.storage-label {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  color: var(--color-text-secondary);\n}\n.storage-values {\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n}\n.storage-bar {\n  height: 0.5rem;\n  background: var(--color-bg-tertiary);\n  border-radius: 9999px;\n  position: relative;\n  overflow: hidden;\n}\n.storage-bar-original {\n  position: absolute;\n  left: 0;\n  top: 0;\n  height: 100%;\n  background: var(--color-accent);\n  border-radius: 9999px 0 0 9999px;\n  transition: width 0.3s;\n}\n.storage-bar-transcoded {\n  position: absolute;\n  top: 0;\n  height: 100%;\n  background: #8b5cf6;\n  border-radius: 0;\n  transition: width 0.3s, left 0.3s;\n}\n.storage-legend {\n  display: flex;\n  gap: 1rem;\n  margin-top: 0.5rem;\n}\n.legend-item {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n}\n.legend-dot {\n  width: 0.5rem;\n  height: 0.5rem;\n  border-radius: 50%;\n}\n.legend-dot.original {\n  background: var(--color-accent);\n}\n.legend-dot.transcoded {\n  background: #8b5cf6;\n}\n.upload-zone {\n  border: 2px dashed var(--color-border);\n  border-radius: 0.5rem;\n  padding: 2rem;\n  text-align: center;\n  margin-bottom: 1.25rem;\n  transition: all 0.15s;\n  cursor: pointer;\n}\n.upload-zone.drag-over {\n  border-color: var(--color-accent);\n  background: rgba(59, 130, 246, 0.05);\n}\n.upload-text {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 0.25rem;\n}\n.upload-sub {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  margin: 0 0 0.75rem;\n}\n.upload-btn {\n  cursor: pointer;\n  display: inline-block;\n}\n.upload-list {\n  margin-bottom: 1.25rem;\n}\n.upload-item {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  padding: 0.75rem 1rem;\n  margin-bottom: 0.5rem;\n}\n.upload-item-info {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 0.375rem;\n}\n.upload-item-name {\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  max-width: 70%;\n}\n.upload-item-status {\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n}\n.upload-item-status.error {\n  color: #ef4444;\n}\n.progress-bar {\n  height: 0.375rem;\n  background: var(--color-bg-tertiary);\n  border-radius: 9999px;\n  overflow: hidden;\n}\n.progress-fill {\n  height: 100%;\n  background: var(--color-accent);\n  border-radius: 9999px;\n  transition: width 0.2s;\n}\n.progress-fill.done {\n  background: #22c55e;\n}\n.progress-fill.error {\n  background: #ef4444;\n}\n.progress-fill.processing {\n  background: #f59e0b;\n}\n.transcoding-bar {\n  margin-top: 0.5rem;\n}\n.content-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));\n  gap: 1rem;\n}\n.content-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  cursor: pointer;\n  transition: border-color 0.15s, background-color 0.15s;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.content-card:hover,\n.content-card:focus {\n  border-color: var(--color-accent);\n  background: var(--color-bg-tertiary);\n  outline: none;\n}\n.card-thumbnail {\n  position: relative;\n  aspect-ratio: 16/9;\n  background: var(--color-bg-tertiary);\n  overflow: hidden;\n}\n.thumb-img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.thumb-placeholder {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 2rem;\n  color: var(--color-text-muted);\n}\n.thumb-placeholder.video {\n  background: #1a1a2e;\n}\n.transcoding-overlay {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.375rem;\n  padding: 0.5rem;\n}\n.overlay-text {\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: #fbbf24;\n}\n.overlay-text.failed {\n  color: #ef4444;\n}\n.overlay-bar {\n  width: 80%;\n  height: 0.25rem;\n  background: rgba(255, 255, 255, 0.2);\n  border-radius: 9999px;\n  overflow: hidden;\n}\n.overlay-fill {\n  height: 100%;\n  background: #fbbf24;\n  border-radius: 9999px;\n  transition: width 0.2s;\n}\n.card-info {\n  padding: 0.75rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.card-title {\n  font-size: 0.8125rem;\n  font-weight: 600;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.card-meta {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  text-transform: capitalize;\n}\n.detail-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 52rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.detail-card.wide {\n  max-width: 52rem;\n}\n.detail-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.detail-header h2 {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.detail-actions {\n  display: flex;\n  gap: 0.5rem;\n}\n.preview-area {\n  margin-bottom: 1.5rem;\n  background: #000;\n  border-radius: 0.375rem;\n  overflow: hidden;\n  max-height: 28rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.preview-img {\n  max-width: 100%;\n  max-height: 28rem;\n  object-fit: contain;\n}\n.preview-video {\n  max-width: 100%;\n  max-height: 28rem;\n}\n.transcoding-status {\n  margin-bottom: 1.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.status-badge {\n  display: inline-block;\n  padding: 0.125rem 0.5rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  width: fit-content;\n}\n.status-badge[data-status=completed] {\n  background: #22c55e20;\n  color: #22c55e;\n}\n.status-badge[data-status=pending] {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.status-badge[data-status=processing] {\n  background: #f59e0b20;\n  color: #f59e0b;\n}\n.status-badge[data-status=failed] {\n  background: #ef444420;\n  color: #ef4444;\n}\n.metadata-section {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n  margin-bottom: 1.25rem;\n}\n.file-info-grid {\n  border-top: 1px solid var(--color-border);\n  padding-top: 1.25rem;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.detail-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.detail-label {\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group textarea {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n  font-family: inherit;\n}\n.form-group input:focus,\n.form-group textarea:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1rem;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 36rem;\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.grid-header {\n  display: flex;\n  align-items: center;\n  margin-bottom: 0.75rem;\n}\n.card-checkbox {\n  position: absolute;\n  top: 0.375rem;\n  left: 0.375rem;\n  z-index: 2;\n  opacity: 0;\n  transition: opacity 0.15s;\n}\n.content-card:hover .card-checkbox,\n.card-checkbox.any-selected {\n  opacity: 1;\n}\n.content-card.selected {\n  border-color: var(--color-accent);\n  box-shadow: 0 0 0 1px var(--color-accent);\n}\n.tag-suggestions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n  margin-bottom: 1rem;\n}\n.playlist-list {\n  max-height: 16rem;\n  overflow-y: auto;\n  margin-bottom: 1rem;\n}\n.playlist-option {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0.75rem;\n  border-radius: 0.375rem;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n  transition: background 0.1s;\n}\n.playlist-option:hover {\n  background: var(--color-bg-tertiary);\n}\n.playlist-option input[type=radio] {\n  accent-color: var(--color-accent);\n}\n.toast {\n  position: fixed;\n  bottom: 1.5rem;\n  right: 1.5rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.5rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  z-index: 2000;\n  animation: slideUp 0.2s ease-out;\n}\n.toast-success {\n  background: #166534;\n  color: #bbf7d0;\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n}\n.toast-warning {\n  background: #92400e;\n  color: #fef3c7;\n}\n@keyframes slideUp {\n  from {\n    transform: translateY(1rem);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.empty-state {\n  text-align: center;\n  padding: 4rem 2rem;\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.success {\n  color: #22c55e;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=content-library.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ContentLibrary, { className: "ContentLibrary", filePath: "src/app/content/content-library.ts", lineNumber: 1071 });
})();
export {
  ContentLibrary
};
//# sourceMappingURL=chunk-HVNBNKXC.js.map
