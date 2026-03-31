import {
  PlaylistService
} from "./chunk-UDVTV4ED.js";
import {
  ScheduleService
} from "./chunk-5J7OLF7P.js";
import {
  OrganisationService
} from "./chunk-RZDGRQCL.js";
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
  Router,
  ViewChild,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
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
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty,
  ɵɵviewQuery
} from "./chunk-F2IK7UH5.js";

// src/app/schedules/schedules.ts
var _c0 = ["timeGrid"];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.entry.id;
var _forTrack2 = ($index, $item) => $item.value;
function Schedules_Conditional_7_Template(rf, ctx) {
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
function Schedules_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 6);
    \u0275\u0275text(1, "Loading...");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 13);
    \u0275\u0275text(1, "No screens or groups");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r3 = ctx.$implicit;
    \u0275\u0275property("value", "screen:" + opt_r3.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u25A1 ", opt_r3.name);
  }
}
function Schedules_Conditional_9_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "optgroup", 14);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_9_Conditional_6_For_2_Template, 2, 2, "option", 30, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.screenTargets);
  }
}
function Schedules_Conditional_9_Conditional_7_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r4 = ctx.$implicit;
    \u0275\u0275property("value", "group:" + opt_r4.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("\u25A6 ", opt_r4.name, " (", opt_r4.mode, ")");
  }
}
function Schedules_Conditional_9_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "optgroup", 15);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_9_Conditional_7_For_2_Template, 2, 3, "option", 30, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.groupTargets);
  }
}
function Schedules_Conditional_9_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275element(1, "span", 31);
    \u0275\u0275text(2, " Processing slices... Content is being prepared for the video wall. ");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_29_For_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 33);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const dayName_r5 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(dayName_r5);
  }
}
function Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 41);
    \u0275\u0275text(1, "G");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1, "\u21BA");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40);
    \u0275\u0275conditionalCreate(1, Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Conditional_1_Template, 2, 0, "span", 41);
    \u0275\u0275conditionalCreate(2, Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Conditional_2_Template, 2, 0, "span", 42);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const block_r8 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(5);
    \u0275\u0275styleProp("background", block_r8.entry.colour);
    \u0275\u0275property("title", ctx_r0.getEntryLabel(block_r8.entry));
    \u0275\u0275advance();
    \u0275\u0275conditional(block_r8.entry.groupId ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(block_r8.isRecurring ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getEntryLabel(block_r8.entry), " ");
  }
}
function Schedules_Conditional_9_Conditional_29_For_5_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Conditional_29_For_5_For_2_Template_div_click_0_listener() {
      const day_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onMonthDayClick(day_r7.date));
    })("keydown.enter", function Schedules_Conditional_9_Conditional_29_For_5_For_2_Template_div_keydown_enter_0_listener() {
      const day_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onMonthDayClick(day_r7.date));
    });
    \u0275\u0275elementStart(1, "span", 37);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 38);
    \u0275\u0275repeaterCreate(4, Schedules_Conditional_9_Conditional_29_For_5_For_2_For_5_Template, 4, 6, "div", 39, _forTrack1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const day_r7 = ctx.$implicit;
    \u0275\u0275classProp("other-month", !day_r7.isCurrentMonth)("today", day_r7.isToday);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(day_r7.dayNumber);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(day_r7.blocks);
  }
}
function Schedules_Conditional_9_Conditional_29_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_9_Conditional_29_For_5_For_2_Template, 6, 5, "div", 35, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const week_r9 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275repeater(week_r9);
  }
}
function Schedules_Conditional_9_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25)(1, "div", 32);
    \u0275\u0275repeaterCreate(2, Schedules_Conditional_9_Conditional_29_For_3_Template, 2, 1, "div", 33, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(4, Schedules_Conditional_9_Conditional_29_For_5_Template, 3, 0, "div", 34, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.weekdayNames);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.monthWeeks);
  }
}
function Schedules_Conditional_9_Conditional_30_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "span", 52);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const day_r11 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("today", ctx_r0.isDayToday(day_r11));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatDayHeader(day_r11));
  }
}
function Schedules_Conditional_9_Conditional_30_For_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const hour_r12 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275styleProp("height", ctx_r0.hourHeight, "px");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.formatHour(hour_r12), " ");
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 57);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275styleProp("height", ctx_r0.hourHeight, "px");
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_For_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 58)(1, "span", 59);
    \u0275\u0275text(2, "Fallback playlist");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const gap_r13 = ctx.$implicit;
    \u0275\u0275styleProp("top", gap_r13.top, "px")("height", gap_r13.height, "px");
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_For_6_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 63);
    \u0275\u0275text(1, "Group");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_For_6_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1, "\u21BA");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 60);
    \u0275\u0275listener("mousedown", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_mousedown_0_listener($event) {
      const block_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onBlockMouseDown($event, block_r15));
    })("click", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_click_0_listener($event) {
      const block_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onBlockClick($event, block_r15));
    })("keydown.enter", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_keydown_enter_0_listener() {
      const block_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.openEditModal(block_r15.entry));
    });
    \u0275\u0275elementStart(1, "div", 61);
    \u0275\u0275listener("mousedown", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_mousedown_1_listener($event) {
      const block_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onResizeMouseDown($event, block_r15, "top"));
    })("keydown.enter", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_keydown_enter_1_listener($event) {
      return $event.preventDefault();
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 62);
    \u0275\u0275conditionalCreate(3, Schedules_Conditional_9_Conditional_30_For_12_For_6_Conditional_3_Template, 2, 0, "span", 63);
    \u0275\u0275conditionalCreate(4, Schedules_Conditional_9_Conditional_30_For_12_For_6_Conditional_4_Template, 2, 0, "span", 42);
    \u0275\u0275elementStart(5, "span", 64);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 65);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 66);
    \u0275\u0275listener("mousedown", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_mousedown_9_listener($event) {
      const block_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.onResizeMouseDown($event, block_r15, "bottom"));
    })("keydown.enter", function Schedules_Conditional_9_Conditional_30_For_12_For_6_Template_div_keydown_enter_9_listener($event) {
      return $event.preventDefault();
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const block_r15 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275styleProp("top", block_r15.top, "px")("height", block_r15.height, "px")("background", block_r15.entry.colour);
    \u0275\u0275classProp("dragging", (ctx_r0.dragState == null ? null : ctx_r0.dragState.entryId) === block_r15.entry.id);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(block_r15.entry.groupId ? 3 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(block_r15.isRecurring ? 4 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.getEntryLabel(block_r15.entry));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", ctx_r0.formatBlockTime(block_r15.occurrenceStart), " - ", ctx_r0.formatBlockTime(block_r15.occurrenceEnd), " ");
  }
}
function Schedules_Conditional_9_Conditional_30_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 50);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_9_Conditional_30_For_12_For_2_Template, 1, 2, "div", 54, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275repeaterCreate(3, Schedules_Conditional_9_Conditional_30_For_12_For_4_Template, 3, 4, "div", 55, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275repeaterCreate(5, Schedules_Conditional_9_Conditional_30_For_12_For_6_Template, 10, 13, "div", 56, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const \u0275$index_142_r16 = ctx.$index;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275attribute("data-day-index", \u0275$index_142_r16);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.hours);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.getGapsForDay(\u0275$index_142_r16));
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.getBlocksForDay(\u0275$index_142_r16));
  }
}
function Schedules_Conditional_9_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 26, 0)(2, "div", 43);
    \u0275\u0275element(3, "div", 44);
    \u0275\u0275repeaterCreate(4, Schedules_Conditional_9_Conditional_30_For_5_Template, 3, 3, "div", 45, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 46);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Conditional_30_Template_div_click_6_listener($event) {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.onTimeGridClick($event));
    })("keydown.enter", function Schedules_Conditional_9_Conditional_30_Template_div_keydown_enter_6_listener($event) {
      return $event.preventDefault();
    });
    \u0275\u0275elementStart(7, "div", 47);
    \u0275\u0275repeaterCreate(8, Schedules_Conditional_9_Conditional_30_For_9_Template, 2, 3, "div", 48, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 49);
    \u0275\u0275repeaterCreate(11, Schedules_Conditional_9_Conditional_30_For_12_Template, 7, 1, "div", 50, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r0.visibleDays);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r0.hours);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.visibleDays);
  }
}
function Schedules_Conditional_9_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 28);
    \u0275\u0275text(1, "No schedule entries for this day.");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_For_36_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 70);
    \u0275\u0275text(1, "G");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_For_36_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 71);
    \u0275\u0275text(1, "\u21BA");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_9_For_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275element(1, "div", 67);
    \u0275\u0275elementStart(2, "div", 68)(3, "span", 69);
    \u0275\u0275conditionalCreate(4, Schedules_Conditional_9_For_36_Conditional_4_Template, 2, 0, "span", 70);
    \u0275\u0275text(5);
    \u0275\u0275conditionalCreate(6, Schedules_Conditional_9_For_36_Conditional_6_Template, 2, 0, "span", 71);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 72);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 73);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r17 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", item_r17.colour);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(item_r17.isGroup ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", item_r17.playlistName, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(item_r17.isRecurring ? 6 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r17.targetName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", item_r17.startTime, " - ", item_r17.endTime);
  }
}
function Schedules_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 10)(2, "label", 11);
    \u0275\u0275text(3, "Target:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "select", 12);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_9_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.selectedTargetId, $event) || (ctx_r0.selectedTargetId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function Schedules_Conditional_9_Template_select_ngModelChange_4_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.onTargetChange());
    });
    \u0275\u0275conditionalCreate(5, Schedules_Conditional_9_Conditional_5_Template, 2, 0, "option", 13);
    \u0275\u0275conditionalCreate(6, Schedules_Conditional_9_Conditional_6_Template, 3, 0, "optgroup", 14);
    \u0275\u0275conditionalCreate(7, Schedules_Conditional_9_Conditional_7_Template, 3, 0, "optgroup", 15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 16)(9, "button", 17);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.setView("day"));
    });
    \u0275\u0275text(10, "Day");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 17);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.setView("week"));
    });
    \u0275\u0275text(12, "Week");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 17);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.setView("month"));
    });
    \u0275\u0275text(14, "Month");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 18)(16, "button", 19);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.navigatePrev());
    });
    \u0275\u0275text(17, "\u2190");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "button", 19);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_18_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.navigateToday());
    });
    \u0275\u0275text(19, "Today");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "button", 19);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.navigateNext());
    });
    \u0275\u0275text(21, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "span", 20);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "button", 21);
    \u0275\u0275listener("click", function Schedules_Conditional_9_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.openCreateModal());
    });
    \u0275\u0275text(25, "+ Schedule");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(26, Schedules_Conditional_9_Conditional_26_Template, 3, 0, "div", 22);
    \u0275\u0275elementStart(27, "div", 23)(28, "div", 24);
    \u0275\u0275conditionalCreate(29, Schedules_Conditional_9_Conditional_29_Template, 6, 0, "div", 25)(30, Schedules_Conditional_9_Conditional_30_Template, 13, 0, "div", 26);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 27)(32, "h3");
    \u0275\u0275text(33);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(34, Schedules_Conditional_9_Conditional_34_Template, 2, 0, "p", 28);
    \u0275\u0275repeaterCreate(35, Schedules_Conditional_9_For_36_Template, 11, 8, "div", 29, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.selectedTargetId);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.targetOptions.length === 0 ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.screenTargets.length > 0 ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.groupTargets.length > 0 ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r0.viewMode === "day");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r0.viewMode === "week");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", ctx_r0.viewMode === "month");
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r0.currentRangeLabel);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.sliceProcessing ? 26 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.viewMode === "month" ? 29 : 30);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.formatSidePanelDate(ctx_r0.selectedDate));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.dayTimeline.length === 0 ? 34 : -1);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.dayTimeline);
  }
}
function Schedules_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 74);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("toast-error", ctx_r0.toastType === "error")("toast-success", ctx_r0.toastType === "success");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.toastMessage, " ");
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_6_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r20 = ctx.$implicit;
    \u0275\u0275property("value", "screen:" + opt_r20.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u25A1 ", opt_r20.name);
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "optgroup", 14);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_11_Conditional_5_Conditional_6_For_2_Template, 2, 2, "option", 30, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.screenTargets);
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_7_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const opt_r21 = ctx.$implicit;
    \u0275\u0275property("value", "group:" + opt_r21.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("\u25A6 ", opt_r21.name, " (", opt_r21.mode, ")");
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "optgroup", 15);
    \u0275\u0275repeaterCreate(1, Schedules_Conditional_11_Conditional_5_Conditional_7_For_2_Template, 2, 3, "option", 30, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.groupTargets);
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 107)(1, "span", 109);
    \u0275\u0275text(2, "Mode:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" ", ctx_r0.modalTargetGroup.mode === "mirror" ? "Mirror" : "Split", " (", ctx_r0.modalTargetGroup.mode === "mirror" ? "all screens show the same content" : ctx_r0.modalTargetGroup.gridColumns + "x" + ctx_r0.modalTargetGroup.gridRows + " grid", ") ");
  }
}
function Schedules_Conditional_11_Conditional_5_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 108);
    \u0275\u0275text(1, " Content will be pre-sliced for each screen in the video wall. This may take a moment to process after saving. ");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_11_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 78)(1, "label", 105);
    \u0275\u0275text(2, "Target");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "select", 106);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Conditional_5_Template_select_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.modalTargetId, $event) || (ctx_r0.modalTargetId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function Schedules_Conditional_11_Conditional_5_Template_select_ngModelChange_3_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.onModalTargetChange());
    });
    \u0275\u0275elementStart(4, "option", 13);
    \u0275\u0275text(5, "Select a screen or group");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(6, Schedules_Conditional_11_Conditional_5_Conditional_6_Template, 3, 0, "optgroup", 14);
    \u0275\u0275conditionalCreate(7, Schedules_Conditional_11_Conditional_5_Conditional_7_Template, 3, 0, "optgroup", 15);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(8, Schedules_Conditional_11_Conditional_5_Conditional_8_Template, 4, 2, "div", 107);
    \u0275\u0275conditionalCreate(9, Schedules_Conditional_11_Conditional_5_Conditional_9_Template, 2, 0, "div", 108);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalTargetId);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.screenTargets.length > 0 ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.groupTargets.length > 0 ? 7 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.modalTargetGroup ? 8 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional((ctx_r0.modalTargetGroup == null ? null : ctx_r0.modalTargetGroup.mode) === "split" ? 9 : -1);
  }
}
function Schedules_Conditional_11_For_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r22 = ctx.$implicit;
    \u0275\u0275property("value", p_r22.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r22.name);
  }
}
function Schedules_Conditional_11_For_37_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 110);
    \u0275\u0275listener("click", function Schedules_Conditional_11_For_37_Template_button_click_0_listener() {
      const c_r24 = \u0275\u0275restoreView(_r23).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.modalColour = c_r24);
    });
    \u0275\u0275text(1, "\xA0");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r24 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("background", c_r24);
    \u0275\u0275classProp("selected", ctx_r0.modalColour === c_r24);
    \u0275\u0275attribute("aria-label", "Select colour " + c_r24);
  }
}
function Schedules_Conditional_11_Conditional_51_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 113)(1, "input", 114);
    \u0275\u0275listener("change", function Schedules_Conditional_11_Conditional_51_For_5_Template_input_change_1_listener() {
      const wd_r26 = \u0275\u0275restoreView(_r25).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.toggleWeekday(wd_r26.value));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const wd_r26 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r0.modalWeekdays.includes(wd_r26.value));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", wd_r26.label, " ");
  }
}
function Schedules_Conditional_11_Conditional_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 78)(1, "span", 111);
    \u0275\u0275text(2, "Days");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 112);
    \u0275\u0275repeaterCreate(4, Schedules_Conditional_11_Conditional_51_For_5_Template, 3, 2, "label", 113, _forTrack2);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r0.weekdayOptions);
  }
}
function Schedules_Conditional_11_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.modalError);
  }
}
function Schedules_Conditional_11_Conditional_54_Template(rf, ctx) {
  if (rf & 1) {
    const _r27 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 115);
    \u0275\u0275listener("click", function Schedules_Conditional_11_Conditional_54_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r27);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.deleteEntry());
    });
    \u0275\u0275text(1, "Delete");
    \u0275\u0275elementEnd();
  }
}
function Schedules_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 75);
    \u0275\u0275listener("click", function Schedules_Conditional_11_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeModal());
    })("keydown.escape", function Schedules_Conditional_11_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeModal());
    });
    \u0275\u0275elementStart(1, "div", 76);
    \u0275\u0275listener("click", function Schedules_Conditional_11_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown.enter", function Schedules_Conditional_11_Template_div_keydown_enter_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 77);
    \u0275\u0275listener("ngSubmit", function Schedules_Conditional_11_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.submitModal());
    });
    \u0275\u0275conditionalCreate(5, Schedules_Conditional_11_Conditional_5_Template, 10, 5);
    \u0275\u0275elementStart(6, "div", 78)(7, "label", 79);
    \u0275\u0275text(8, "Playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "select", 80);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_select_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalPlaylistId, $event) || (ctx_r0.modalPlaylistId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(10, "option", 13);
    \u0275\u0275text(11, "Select a playlist");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(12, Schedules_Conditional_11_For_13_Template, 2, 2, "option", 30, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 81)(15, "div", 78)(16, "label", 82);
    \u0275\u0275text(17, "Start Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "input", 83);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_input_ngModelChange_18_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalStartDate, $event) || (ctx_r0.modalStartDate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 78)(20, "label", 84);
    \u0275\u0275text(21, "Start Time");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "input", 85);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_input_ngModelChange_22_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalStartTime, $event) || (ctx_r0.modalStartTime = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "div", 81)(24, "div", 78)(25, "label", 86);
    \u0275\u0275text(26, "End Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "input", 87);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_input_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalEndDate, $event) || (ctx_r0.modalEndDate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 78)(29, "label", 88);
    \u0275\u0275text(30, "End Time");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "input", 89);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_input_ngModelChange_31_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalEndTime, $event) || (ctx_r0.modalEndTime = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(32, "div", 78)(33, "label", 90);
    \u0275\u0275text(34, "Colour");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "div", 91);
    \u0275\u0275repeaterCreate(36, Schedules_Conditional_11_For_37_Template, 2, 5, "button", 92, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementStart(38, "input", 93);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_input_ngModelChange_38_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalColour, $event) || (ctx_r0.modalColour = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(39, "div", 78)(40, "label", 94);
    \u0275\u0275text(41, "Recurrence");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "select", 95);
    \u0275\u0275twoWayListener("ngModelChange", function Schedules_Conditional_11_Template_select_ngModelChange_42_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.modalRecurrence, $event) || (ctx_r0.modalRecurrence = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(43, "option", 96);
    \u0275\u0275text(44, "None");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "option", 97);
    \u0275\u0275text(46, "Daily");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "option", 98);
    \u0275\u0275text(48, "Weekly");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "option", 99);
    \u0275\u0275text(50, "Specific weekdays");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(51, Schedules_Conditional_11_Conditional_51_Template, 6, 0, "div", 78);
    \u0275\u0275conditionalCreate(52, Schedules_Conditional_11_Conditional_52_Template, 2, 1, "p", 5);
    \u0275\u0275elementStart(53, "div", 100);
    \u0275\u0275conditionalCreate(54, Schedules_Conditional_11_Conditional_54_Template, 2, 0, "button", 101);
    \u0275\u0275elementStart(55, "div", 102)(56, "button", 103);
    \u0275\u0275listener("click", function Schedules_Conditional_11_Template_button_click_56_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeModal());
    });
    \u0275\u0275text(57, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "button", 104);
    \u0275\u0275text(59);
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.editingEntry ? "Edit Schedule Entry" : "Create Schedule Entry");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r0.editingEntry ? 5 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalPlaylistId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.playlists);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalStartDate);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalStartTime);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalEndDate);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalEndTime);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r0.presetColours);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalColour);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.modalRecurrence);
    \u0275\u0275advance(9);
    \u0275\u0275conditional(ctx_r0.modalRecurrence === "weekdays" ? 51 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.modalError ? 52 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.editingEntry ? 54 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r0.submitting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.submitting ? "Saving..." : ctx_r0.editingEntry ? "Update" : "Create", " ");
  }
}
var HOUR_HEIGHT = 60;
var PRESET_COLOURS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1"
];
var Schedules = class _Schedules {
  timeGridRef;
  scheduleService = inject(ScheduleService);
  screenService = inject(ScreenService);
  playlistService = inject(PlaylistService);
  memberService = inject(MemberService);
  organisationService = inject(OrganisationService);
  screenGroupService = inject(ScreenGroupService);
  router = inject(Router);
  orgId = "";
  orgTimeZone = "UTC";
  loading = true;
  loadError = "";
  screens = [];
  screenGroups = [];
  playlists = [];
  entries = [];
  // Target selector: "screen:<id>" or "group:<id>"
  selectedTargetId = "";
  targetOptions = [];
  viewMode = "week";
  currentDate = /* @__PURE__ */ new Date();
  selectedDate = /* @__PURE__ */ new Date();
  hours = Array.from({ length: 24 }, (_, i) => i);
  hourHeight = HOUR_HEIGHT;
  presetColours = PRESET_COLOURS;
  weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  weekdayOptions = [
    { value: "MO", label: "Mon" },
    { value: "TU", label: "Tue" },
    { value: "WE", label: "Wed" },
    { value: "TH", label: "Thu" },
    { value: "FR", label: "Fri" },
    { value: "SA", label: "Sat" },
    { value: "SU", label: "Sun" }
  ];
  // Computed calendar data
  calendarBlocks = [];
  gapBlocks = [];
  monthWeeks = [];
  dayTimeline = [];
  // Slice processing status
  sliceProcessing = false;
  slicePollTimer = null;
  // Modal state
  showModal = false;
  editingEntry = null;
  modalTargetId = "";
  modalTargetGroup = null;
  modalPlaylistId = "";
  modalStartDate = "";
  modalStartTime = "";
  modalEndDate = "";
  modalEndTime = "";
  modalColour = PRESET_COLOURS[0];
  modalRecurrence = "none";
  modalWeekdays = [];
  modalError = "";
  submitting = false;
  // Drag state
  dragState = null;
  resizeState = null;
  // Toast
  toastMessage = "";
  toastType = "error";
  toastTimer = null;
  // Bound handlers for mouse events
  boundMouseMove = this.onMouseMove.bind(this);
  boundMouseUp = this.onMouseUp.bind(this);
  get screenTargets() {
    return this.targetOptions.filter((t) => t.type === "screen");
  }
  get groupTargets() {
    return this.targetOptions.filter((t) => t.type === "group");
  }
  get selectedTargetType() {
    if (!this.selectedTargetId)
      return null;
    return this.selectedTargetId.startsWith("group:") ? "group" : "screen";
  }
  get selectedTargetRawId() {
    return this.selectedTargetId.replace(/^(screen|group):/, "");
  }
  get visibleDays() {
    if (this.viewMode === "day") {
      return [new Date(this.currentDate)];
    }
    const start = this.getWeekStart(this.currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }
  get currentRangeLabel() {
    const opts = { timeZone: this.orgTimeZone };
    if (this.viewMode === "day") {
      return this.currentDate.toLocaleDateString(void 0, __spreadProps(__spreadValues({}, opts), { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    }
    if (this.viewMode === "week") {
      const days = this.visibleDays;
      const first = days[0];
      const last = days[6];
      const fmtStart = first.toLocaleDateString(void 0, __spreadProps(__spreadValues({}, opts), { month: "short", day: "numeric" }));
      const fmtEnd = last.toLocaleDateString(void 0, __spreadProps(__spreadValues({}, opts), { month: "short", day: "numeric", year: "numeric" }));
      return `${fmtStart} - ${fmtEnd}`;
    }
    return this.currentDate.toLocaleDateString(void 0, __spreadProps(__spreadValues({}, opts), { month: "long", year: "numeric" }));
  }
  ngOnInit() {
    this.loadCurrentOrg();
    document.addEventListener("mousemove", this.boundMouseMove);
    document.addEventListener("mouseup", this.boundMouseUp);
  }
  ngOnDestroy() {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    if (this.slicePollTimer)
      clearTimeout(this.slicePollTimer);
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
        } else {
          this.loadError = "You are not a member of any organisation.";
          this.loading = false;
          return;
        }
        this.loadOrgDetails();
        this.loadScreens();
        this.loadScreenGroups();
        this.loadPlaylists();
      },
      error: () => {
        this.loadError = "Failed to load organisation context.";
        this.loading = false;
      }
    });
  }
  loadOrgDetails() {
    this.organisationService.getOne(this.orgId).subscribe({
      next: (org) => {
        this.orgTimeZone = org.timeZone || "UTC";
      },
      error: () => {
      }
    });
  }
  loadScreens() {
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        this.buildTargetOptions();
        if (!this.selectedTargetId && this.targetOptions.length > 0) {
          this.selectedTargetId = this.targetOptions[0].type + ":" + this.targetOptions[0].id;
          this.loadEntries();
        } else if (this.targetOptions.length === 0 && this.screenGroups.length === 0) {
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = "Failed to load screens.";
        this.loading = false;
      }
    });
  }
  loadScreenGroups() {
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.screenGroups = groups;
        this.buildTargetOptions();
        if (!this.selectedTargetId && this.targetOptions.length > 0) {
          this.selectedTargetId = this.targetOptions[0].type + ":" + this.targetOptions[0].id;
          this.loadEntries();
        } else if (this.selectedTargetId) {
        } else if (this.targetOptions.length === 0) {
          this.loading = false;
        }
      },
      error: () => {
      }
    });
  }
  buildTargetOptions() {
    const opts = [];
    for (const screen of this.screens) {
      opts.push({ id: screen.id, name: screen.name, type: "screen" });
    }
    for (const group of this.screenGroups) {
      opts.push({ id: group.id, name: group.name, type: "group", mode: group.mode });
    }
    this.targetOptions = opts;
  }
  loadPlaylists() {
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
      }
    });
  }
  loadEntries() {
    if (!this.selectedTargetId)
      return;
    const range = this.getQueryRange();
    if (this.selectedTargetType === "screen") {
      this.scheduleService.getByScreen(this.orgId, this.selectedTargetRawId, range.from, range.to).subscribe({
        next: (entries) => {
          this.entries = entries;
          this.loading = false;
          this.rebuildCalendar();
        },
        error: () => {
          this.loadError = "Failed to load schedule entries.";
          this.loading = false;
        }
      });
    } else {
      this.scheduleService.getByDateRange(this.orgId, range.from, range.to).subscribe({
        next: (entries) => {
          this.entries = entries.filter((e) => e.groupId === this.selectedTargetRawId);
          this.loading = false;
          this.rebuildCalendar();
        },
        error: () => {
          this.loadError = "Failed to load schedule entries.";
          this.loading = false;
        }
      });
    }
  }
  getQueryRange() {
    if (this.viewMode === "day") {
      const start2 = new Date(this.currentDate);
      start2.setHours(0, 0, 0, 0);
      const end2 = new Date(start2);
      end2.setDate(end2.getDate() + 1);
      return { from: start2.toISOString(), to: end2.toISOString() };
    }
    if (this.viewMode === "week") {
      const start2 = this.getWeekStart(this.currentDate);
      start2.setHours(0, 0, 0, 0);
      const end2 = new Date(start2);
      end2.setDate(end2.getDate() + 7);
      return { from: start2.toISOString(), to: end2.toISOString() };
    }
    const start = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 7);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  rebuildCalendar() {
    if (this.viewMode === "month") {
      this.buildMonthView();
    } else {
      this.buildTimeGridBlocks();
    }
    this.buildDayTimeline();
  }
  buildTimeGridBlocks() {
    const days = this.visibleDays;
    this.calendarBlocks = [];
    this.gapBlocks = [];
    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const dayStart = new Date(days[dayIdx]);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayBlocks = [];
      for (const entry of this.entries) {
        const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
        for (const occ of occurrences) {
          const clippedStart = occ.start < dayStart ? dayStart : occ.start;
          const clippedEnd = occ.end > dayEnd ? dayEnd : occ.end;
          const startMinutes = clippedStart.getHours() * 60 + clippedStart.getMinutes();
          const endMinutes = clippedEnd.getHours() * 60 + clippedEnd.getMinutes();
          const top = startMinutes / 60 * this.hourHeight;
          const height = Math.max((endMinutes - startMinutes) / 60 * this.hourHeight, 20);
          const block = {
            entry,
            top,
            height,
            dayIndex: dayIdx,
            isRecurring: !!entry.rrule,
            occurrenceStart: clippedStart,
            occurrenceEnd: clippedEnd
          };
          dayBlocks.push(block);
          this.calendarBlocks.push(block);
        }
      }
      const sorted = [...dayBlocks].sort((a, b) => a.top - b.top);
      let lastEnd = 0;
      const dayHeight = 24 * this.hourHeight;
      for (const block of sorted) {
        if (block.top > lastEnd + 5) {
          this.gapBlocks.push({ top: lastEnd, height: block.top - lastEnd, dayIndex: dayIdx });
        }
        lastEnd = Math.max(lastEnd, block.top + block.height);
      }
      if (lastEnd < dayHeight - 5) {
        this.gapBlocks.push({ top: lastEnd, height: dayHeight - lastEnd, dayIndex: dayIdx });
      }
    }
  }
  buildMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(firstOfMonth);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    this.monthWeeks = [];
    const current = new Date(start);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(current);
        const dayStart = new Date(cellDate);
        dayStart.setHours(0, 0, 0, 0);
        const blocks = [];
        for (const entry of this.entries) {
          const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
          for (const occ of occurrences) {
            blocks.push({
              entry,
              top: 0,
              height: 0,
              dayIndex: d,
              isRecurring: !!entry.rrule,
              occurrenceStart: occ.start,
              occurrenceEnd: occ.end
            });
          }
        }
        week.push({
          date: cellDate,
          dayNumber: cellDate.getDate(),
          isCurrentMonth: cellDate.getMonth() === month,
          isToday: cellDate.getTime() === today.getTime(),
          blocks
        });
        current.setDate(current.getDate() + 1);
      }
      this.monthWeeks.push(week);
      if (current.getMonth() !== month && current.getDate() > 7)
        break;
    }
  }
  buildDayTimeline() {
    const dayStart = new Date(this.selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const items = [];
    for (const entry of this.entries) {
      const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
      for (const occ of occurrences) {
        const isGroup = !!entry.groupId;
        let targetName = "";
        if (isGroup && entry.group) {
          targetName = entry.group.name;
        } else if (entry.screen) {
          targetName = entry.screen.name;
        }
        items.push({
          playlistName: entry.playlist?.name || "Playlist",
          colour: entry.colour,
          startTime: this.formatTimeInTz(occ.start),
          endTime: this.formatTimeInTz(occ.end),
          isRecurring: !!entry.rrule,
          isGroup,
          targetName
        });
      }
    }
    items.sort((a, b) => a.startTime.localeCompare(b.startTime));
    this.dayTimeline = items;
  }
  getEntryOccurrencesOnDay(entry, dayStart) {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const entryStart = new Date(entry.startTime);
    const entryEnd = new Date(entry.endTime);
    const duration = entryEnd.getTime() - entryStart.getTime();
    if (!entry.rrule) {
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }
    const occurrences = [];
    const rule = this.parseSimpleRrule(entry.rrule);
    if (!rule) {
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }
    if (this.doesDayMatchRrule(dayStart, entryStart, rule)) {
      const occStart = new Date(dayStart);
      occStart.setHours(entryStart.getHours(), entryStart.getMinutes(), entryStart.getSeconds());
      const occEnd = new Date(occStart.getTime() + duration);
      if (occStart >= new Date(entryStart.getFullYear(), entryStart.getMonth(), entryStart.getDate())) {
        occurrences.push({ start: occStart, end: occEnd });
      }
    }
    return occurrences;
  }
  parseSimpleRrule(rrule) {
    const parts = rrule.replace("RRULE:", "").split(";");
    const map = {};
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value)
        map[key] = value;
    }
    if (!map["FREQ"])
      return null;
    return {
      freq: map["FREQ"],
      byday: map["BYDAY"]?.split(",")
    };
  }
  doesDayMatchRrule(day, entryStart, rule) {
    if (rule.freq === "DAILY")
      return true;
    if (rule.freq === "WEEKLY") {
      if (rule.byday && rule.byday.length > 0) {
        const dayMap = { 0: "SU", 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA" };
        return rule.byday.includes(dayMap[day.getDay()]);
      }
      return day.getDay() === entryStart.getDay();
    }
    return false;
  }
  getBlocksForDay(dayIndex) {
    return this.calendarBlocks.filter((b) => b.dayIndex === dayIndex);
  }
  getGapsForDay(dayIndex) {
    return this.gapBlocks.filter((g) => g.dayIndex === dayIndex);
  }
  getEntryLabel(entry) {
    const playlistName = entry.playlist?.name || "Playlist";
    if (entry.groupId && entry.group) {
      return `${playlistName} - ${entry.group.name}`;
    }
    return playlistName;
  }
  // --- Navigation ---
  setView(mode) {
    this.viewMode = mode;
    this.loadEntries();
  }
  navigatePrev() {
    if (this.viewMode === "day") {
      this.currentDate = new Date(this.currentDate.getTime() - 864e5);
    } else if (this.viewMode === "week") {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 864e5);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    }
    this.loadEntries();
  }
  navigateNext() {
    if (this.viewMode === "day") {
      this.currentDate = new Date(this.currentDate.getTime() + 864e5);
    } else if (this.viewMode === "week") {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 864e5);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    }
    this.loadEntries();
  }
  navigateToday() {
    this.currentDate = /* @__PURE__ */ new Date();
    this.selectedDate = /* @__PURE__ */ new Date();
    this.loadEntries();
  }
  onTargetChange() {
    this.loadEntries();
  }
  onMonthDayClick(date) {
    this.currentDate = new Date(date);
    this.selectedDate = new Date(date);
    this.setView("day");
  }
  // --- Time Grid Click (create entry) ---
  onTimeGridClick(event) {
    const target = event.target;
    if (!target.classList.contains("hour-slot"))
      return;
    const dayColumn = target.closest(".day-column");
    if (!dayColumn)
      return;
    const dayIndex = parseInt(dayColumn.getAttribute("data-day-index") || "0", 10);
    const day = this.visibleDays[dayIndex];
    if (!day)
      return;
    const rect = dayColumn.getBoundingClientRect();
    const y = event.clientY - rect.top + dayColumn.scrollTop;
    const hour = Math.floor(y / this.hourHeight);
    const clampedHour = Math.max(0, Math.min(23, hour));
    const startDate = new Date(day);
    startDate.setHours(clampedHour, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(clampedHour + 1);
    this.openCreateModalWithTimes(startDate, endDate);
  }
  // --- Modal ---
  openCreateModal() {
    const now = /* @__PURE__ */ new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    this.openCreateModalWithTimes(start, end);
  }
  openCreateModalWithTimes(start, end) {
    this.editingEntry = null;
    this.modalTargetId = this.selectedTargetId;
    this.updateModalTargetGroup();
    this.modalPlaylistId = this.playlists.length > 0 ? this.playlists[0].id : "";
    this.modalStartDate = this.toDateInputValue(start);
    this.modalStartTime = this.toTimeInputValue(start);
    this.modalEndDate = this.toDateInputValue(end);
    this.modalEndTime = this.toTimeInputValue(end);
    this.modalColour = PRESET_COLOURS[Math.floor(Math.random() * PRESET_COLOURS.length)];
    this.modalRecurrence = "none";
    this.modalWeekdays = [];
    this.modalError = "";
    this.showModal = true;
  }
  openEditModal(entry) {
    this.editingEntry = entry;
    this.modalPlaylistId = entry.playlistId;
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    this.modalStartDate = this.toDateInputValue(start);
    this.modalStartTime = this.toTimeInputValue(start);
    this.modalEndDate = this.toDateInputValue(end);
    this.modalEndTime = this.toTimeInputValue(end);
    this.modalColour = entry.colour;
    if (entry.groupId) {
      this.modalTargetId = "group:" + entry.groupId;
    } else if (entry.screenId) {
      this.modalTargetId = "screen:" + entry.screenId;
    }
    this.updateModalTargetGroup();
    if (!entry.rrule) {
      this.modalRecurrence = "none";
      this.modalWeekdays = [];
    } else {
      const rule = this.parseSimpleRrule(entry.rrule);
      if (rule?.freq === "DAILY") {
        this.modalRecurrence = "daily";
      } else if (rule?.freq === "WEEKLY" && rule.byday && rule.byday.length > 0) {
        this.modalRecurrence = "weekdays";
        this.modalWeekdays = [...rule.byday];
      } else {
        this.modalRecurrence = "weekly";
      }
    }
    this.modalError = "";
    this.showModal = true;
  }
  onModalTargetChange() {
    this.updateModalTargetGroup();
  }
  updateModalTargetGroup() {
    if (this.modalTargetId.startsWith("group:")) {
      const groupId = this.modalTargetId.replace("group:", "");
      this.modalTargetGroup = this.screenGroups.find((g) => g.id === groupId) || null;
    } else {
      this.modalTargetGroup = null;
    }
  }
  closeModal() {
    this.showModal = false;
    this.editingEntry = null;
    this.modalTargetGroup = null;
  }
  toggleWeekday(value) {
    const idx = this.modalWeekdays.indexOf(value);
    if (idx >= 0) {
      this.modalWeekdays.splice(idx, 1);
    } else {
      this.modalWeekdays.push(value);
    }
  }
  submitModal() {
    const startStr = `${this.modalStartDate}T${this.modalStartTime}:00`;
    const endStr = `${this.modalEndDate}T${this.modalEndTime}:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end <= start) {
      this.modalError = "End time must be after start time.";
      return;
    }
    if (!this.modalPlaylistId) {
      this.modalError = "Please select a playlist.";
      return;
    }
    const rrule = this.buildRrule();
    this.submitting = true;
    this.modalError = "";
    if (this.editingEntry) {
      const dto = {
        playlistId: this.modalPlaylistId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || null,
        colour: this.modalColour
      };
      this.scheduleService.update(this.orgId, this.editingEntry.id, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          this.showToast("Schedule entry updated.", "success");
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = "This time slot overlaps with an existing entry.";
            this.showToast("Overlap detected. Entry was not saved.", "error");
          } else {
            this.modalError = err.error?.message || "Failed to update entry.";
          }
        }
      });
    } else {
      if (!this.modalTargetId) {
        this.modalError = "Please select a target screen or group.";
        this.submitting = false;
        return;
      }
      const isGroupTarget = this.modalTargetId.startsWith("group:");
      const targetId = this.modalTargetId.replace(/^(screen|group):/, "");
      const dto = {
        playlistId: this.modalPlaylistId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || void 0,
        colour: this.modalColour
      };
      if (isGroupTarget) {
        dto.groupId = targetId;
      } else {
        dto.screenId = targetId;
      }
      const isSplitGroup = isGroupTarget && this.modalTargetGroup?.mode === "split";
      this.scheduleService.create(this.orgId, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          if (isSplitGroup) {
            this.showToast("Schedule entry created. Slicing content for video wall...", "success");
            this.startSlicePolling();
          } else {
            this.showToast("Schedule entry created.", "success");
          }
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = "This time slot overlaps with an existing entry.";
            this.showToast("Overlap detected. Entry was not saved.", "error");
          } else {
            this.modalError = err.error?.message || "Failed to create entry.";
          }
        }
      });
    }
  }
  startSlicePolling() {
    this.sliceProcessing = true;
    if (this.slicePollTimer)
      clearTimeout(this.slicePollTimer);
    this.slicePollTimer = setTimeout(() => {
      this.sliceProcessing = false;
      this.loadEntries();
    }, 8e3);
  }
  deleteEntry() {
    if (!this.editingEntry)
      return;
    this.submitting = true;
    this.scheduleService.delete(this.orgId, this.editingEntry.id).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadEntries();
        this.showToast("Schedule entry deleted.", "success");
      },
      error: (err) => {
        this.submitting = false;
        this.modalError = err.error?.message || "Failed to delete entry.";
      }
    });
  }
  buildRrule() {
    if (this.modalRecurrence === "none")
      return void 0;
    if (this.modalRecurrence === "daily")
      return "FREQ=DAILY";
    if (this.modalRecurrence === "weekly")
      return "FREQ=WEEKLY";
    if (this.modalRecurrence === "weekdays" && this.modalWeekdays.length > 0) {
      return `FREQ=WEEKLY;BYDAY=${this.modalWeekdays.join(",")}`;
    }
    return void 0;
  }
  // --- Drag & Drop ---
  onBlockMouseDown(event, block) {
    if (event.target.classList.contains("resize-handle"))
      return;
    event.preventDefault();
    event.stopPropagation();
    this.dragState = {
      entryId: block.entry.id,
      startY: event.clientY,
      originalTop: block.top,
      block
    };
  }
  onResizeMouseDown(event, block, edge) {
    event.preventDefault();
    event.stopPropagation();
    this.resizeState = {
      entryId: block.entry.id,
      edge,
      startY: event.clientY,
      block,
      originalTop: block.top,
      originalHeight: block.height
    };
  }
  onBlockClick(event, block) {
    if (this.dragState || this.resizeState)
      return;
    event.stopPropagation();
    this.selectedDate = new Date(block.occurrenceStart);
    this.buildDayTimeline();
    this.openEditModal(block.entry);
  }
  onMouseMove(event) {
    if (this.dragState) {
      const dy = event.clientY - this.dragState.startY;
      const newTop = Math.max(0, this.dragState.originalTop + dy);
      this.dragState.block.top = newTop;
    }
    if (this.resizeState) {
      const dy = event.clientY - this.resizeState.startY;
      if (this.resizeState.edge === "bottom") {
        const newHeight = Math.max(20, this.resizeState.originalHeight + dy);
        this.resizeState.block.height = newHeight;
      } else {
        const newTop = Math.max(0, this.resizeState.originalTop + dy);
        const newHeight = this.resizeState.originalHeight - (newTop - this.resizeState.originalTop);
        if (newHeight >= 20) {
          this.resizeState.block.top = newTop;
          this.resizeState.block.height = newHeight;
        }
      }
    }
  }
  onMouseUp() {
    if (this.dragState) {
      const block = this.dragState.block;
      const moved = Math.abs(block.top - this.dragState.originalTop);
      if (moved > 5) {
        this.commitDragOrResize(block);
      }
      this.dragState = null;
    }
    if (this.resizeState) {
      const block = this.resizeState.block;
      const changed = Math.abs(block.height - this.resizeState.originalHeight) > 5 || Math.abs(block.top - this.resizeState.originalTop) > 5;
      if (changed) {
        this.commitDragOrResize(block);
      }
      this.resizeState = null;
    }
  }
  commitDragOrResize(block) {
    const dayDate = this.visibleDays[block.dayIndex];
    if (!dayDate)
      return;
    const startMinutes = block.top / this.hourHeight * 60;
    const endMinutes = (block.top + block.height) / this.hourHeight * 60;
    const newStart = new Date(dayDate);
    newStart.setHours(0, 0, 0, 0);
    newStart.setMinutes(startMinutes);
    const newEnd = new Date(dayDate);
    newEnd.setHours(0, 0, 0, 0);
    newEnd.setMinutes(endMinutes);
    const dto = {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString()
    };
    this.scheduleService.update(this.orgId, block.entry.id, dto).subscribe({
      next: () => {
        this.loadEntries();
        this.showToast("Entry moved.", "success");
      },
      error: (err) => {
        if (err.status === 409) {
          this.showToast("Overlap detected. Move was reverted.", "error");
        } else {
          this.showToast("Failed to move entry.", "error");
        }
        this.loadEntries();
      }
    });
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
  // --- Formatting helpers ---
  formatHour(hour) {
    return `${hour.toString().padStart(2, "0")}:00`;
  }
  formatDayHeader(day) {
    return day.toLocaleDateString(void 0, {
      timeZone: this.orgTimeZone,
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
  formatBlockTime(date) {
    return date.toLocaleTimeString(void 0, {
      timeZone: this.orgTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  formatTimeInTz(date) {
    return date.toLocaleTimeString(void 0, {
      timeZone: this.orgTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  formatSidePanelDate(date) {
    return date.toLocaleDateString(void 0, {
      timeZone: this.orgTimeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  isDayToday(day) {
    const today = /* @__PURE__ */ new Date();
    return day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() === today.getDate();
  }
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  toDateInputValue(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  toTimeInputValue(date) {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function Schedules_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Schedules)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Schedules, selectors: [["app-schedules"]], viewQuery: function Schedules_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.timeGridRef = _t.first);
    }
  }, decls: 12, vars: 5, consts: [["timeGrid", ""], [1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "error"], [1, "loading-text"], [1, "toast", 3, "toast-error", "toast-success"], ["role", "dialog", "tabindex", "-1", 1, "modal-overlay"], [1, "toolbar"], [1, "target-selector"], ["for", "targetSelect"], ["id", "targetSelect", "name", "targetSelect", 3, "ngModelChange", "ngModel"], ["value", "", "disabled", ""], ["label", "Screens"], ["label", "Screen Groups"], [1, "view-buttons"], [1, "toggle-btn", 3, "click"], [1, "nav-buttons"], [1, "btn", "btn-secondary", "btn-sm", 3, "click"], [1, "current-range"], [1, "btn", "btn-primary", 3, "click"], [1, "slice-status"], [1, "calendar-layout"], [1, "calendar-container"], [1, "month-grid"], [1, "time-grid"], [1, "side-panel"], [1, "empty-text"], [1, "timeline-item"], [3, "value"], [1, "slice-spinner"], [1, "month-header-row"], [1, "month-header-cell"], [1, "month-week-row"], ["role", "button", "tabindex", "0", 1, "month-day-cell", 3, "other-month", "today"], ["role", "button", "tabindex", "0", 1, "month-day-cell", 3, "click", "keydown.enter"], [1, "month-day-number"], [1, "month-day-entries"], [1, "month-entry-chip", 3, "background", "title"], [1, "month-entry-chip", 3, "title"], [1, "group-badge-sm"], [1, "repeat-icon"], [1, "time-grid-header"], [1, "time-gutter-header"], [1, "day-column-header", 3, "today"], ["role", "grid", "tabindex", "0", 1, "time-grid-body", 3, "click", "keydown.enter"], [1, "time-gutter"], [1, "time-label", 3, "height"], [1, "day-columns"], [1, "day-column"], [1, "day-column-header"], [1, "day-name"], [1, "time-label"], [1, "hour-slot", 3, "height"], [1, "gap-indicator", 3, "top", "height"], ["role", "button", "tabindex", "0", 1, "schedule-block", 3, "top", "height", "background", "dragging"], [1, "hour-slot"], [1, "gap-indicator"], [1, "gap-label"], ["role", "button", "tabindex", "0", 1, "schedule-block", 3, "mousedown", "click", "keydown.enter"], ["role", "separator", "tabindex", "0", "aria-label", "Resize top", "aria-valuenow", "0", 1, "resize-handle", "resize-handle-top", 3, "mousedown", "keydown.enter"], [1, "block-content"], [1, "group-badge"], [1, "block-title"], [1, "block-time"], ["role", "separator", "tabindex", "0", "aria-label", "Resize bottom", "aria-valuenow", "0", 1, "resize-handle", "resize-handle-bottom", 3, "mousedown", "keydown.enter"], [1, "timeline-colour"], [1, "timeline-info"], [1, "timeline-name"], [1, "group-badge-inline"], [1, "repeat-icon-sm"], [1, "timeline-target"], [1, "timeline-time"], [1, "toast"], ["role", "dialog", "tabindex", "-1", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", "tabindex", "0", 1, "modal", 3, "click", "keydown.enter"], [3, "ngSubmit"], [1, "form-group"], ["for", "modalPlaylist"], ["id", "modalPlaylist", "name", "modalPlaylist", "required", "", 3, "ngModelChange", "ngModel"], [1, "form-row"], ["for", "modalStartDate"], ["id", "modalStartDate", "type", "date", "name", "modalStartDate", "required", "", 3, "ngModelChange", "ngModel"], ["for", "modalStartTime"], ["id", "modalStartTime", "type", "time", "name", "modalStartTime", "required", "", 3, "ngModelChange", "ngModel"], ["for", "modalEndDate"], ["id", "modalEndDate", "type", "date", "name", "modalEndDate", "required", "", 3, "ngModelChange", "ngModel"], ["for", "modalEndTime"], ["id", "modalEndTime", "type", "time", "name", "modalEndTime", "required", "", 3, "ngModelChange", "ngModel"], ["for", "modalColourCustom"], [1, "colour-picker"], ["type", "button", 1, "colour-swatch", 3, "background", "selected"], ["id", "modalColourCustom", "type", "color", "name", "modalColourCustom", 1, "colour-input", 3, "ngModelChange", "ngModel"], ["for", "modalRecurrence"], ["id", "modalRecurrence", "name", "modalRecurrence", 3, "ngModelChange", "ngModel"], ["value", "none"], ["value", "daily"], ["value", "weekly"], ["value", "weekdays"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-danger"], [1, "form-actions-right"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], ["for", "modalTarget"], ["id", "modalTarget", "name", "modalTarget", "required", "", 3, "ngModelChange", "ngModel"], [1, "info-box"], [1, "info-box", "info-box-warn"], [1, "info-label"], ["type", "button", 1, "colour-swatch", 3, "click"], ["id", "weekdayLabel", 1, "form-label-text"], [1, "weekday-checkboxes"], [1, "weekday-checkbox"], ["type", "checkbox", 3, "change", "checked"], ["type", "button", 1, "btn", "btn-danger", 3, "click"]], template: function Schedules_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 1)(1, "header", 2)(2, "div", 3)(3, "button", 4);
      \u0275\u0275listener("click", function Schedules_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Schedules");
      \u0275\u0275elementEnd()()();
      \u0275\u0275conditionalCreate(7, Schedules_Conditional_7_Template, 2, 1, "p", 5);
      \u0275\u0275conditionalCreate(8, Schedules_Conditional_8_Template, 2, 0, "p", 6);
      \u0275\u0275conditionalCreate(9, Schedules_Conditional_9_Template, 37, 15);
      \u0275\u0275conditionalCreate(10, Schedules_Conditional_10_Template, 2, 5, "div", 7);
      \u0275\u0275conditionalCreate(11, Schedules_Conditional_11_Template, 60, 14, "div", 8);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(ctx.loadError ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.loadError ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toastMessage ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showModal ? 11 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-bottom: 1rem;\n  flex-wrap: wrap;\n}\n.target-selector[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.target-selector[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.target-selector[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n}\n.view-buttons[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.25rem;\n}\n.toggle-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  transition: all 0.15s;\n}\n.toggle-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.toggle-btn.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n  border-color: var(--color-accent);\n}\n.nav-buttons[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.current-range[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  min-width: 10rem;\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-sm[_ngcontent-%COMP%] {\n  padding: 0.325rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.slice-status[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.625rem 1rem;\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border));\n  border-radius: 0.375rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.slice-spinner[_ngcontent-%COMP%] {\n  width: 0.875rem;\n  height: 0.875rem;\n  border: 2px solid var(--color-border);\n  border-top-color: var(--color-accent);\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.calendar-layout[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n}\n.calendar-container[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.time-grid[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.time-grid-header[_ngcontent-%COMP%] {\n  display: flex;\n  border-bottom: 1px solid var(--color-border);\n}\n.time-gutter-header[_ngcontent-%COMP%] {\n  width: 3.5rem;\n  flex-shrink: 0;\n}\n.day-column-header[_ngcontent-%COMP%] {\n  flex: 1;\n  text-align: center;\n  padding: 0.5rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  border-left: 1px solid var(--color-border);\n}\n.day-column-header.today[_ngcontent-%COMP%] {\n  color: var(--color-accent);\n  font-weight: 600;\n}\n.time-grid-body[_ngcontent-%COMP%] {\n  display: flex;\n  max-height: calc(100vh - 14rem);\n  overflow-y: auto;\n  position: relative;\n}\n.time-gutter[_ngcontent-%COMP%] {\n  width: 3.5rem;\n  flex-shrink: 0;\n}\n.time-label[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  text-align: right;\n  padding-right: 0.5rem;\n  box-sizing: border-box;\n  position: relative;\n  top: -0.5em;\n}\n.day-columns[_ngcontent-%COMP%] {\n  display: flex;\n  flex: 1;\n}\n.day-column[_ngcontent-%COMP%] {\n  flex: 1;\n  position: relative;\n  border-left: 1px solid var(--color-border);\n}\n.hour-slot[_ngcontent-%COMP%] {\n  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);\n  box-sizing: border-box;\n}\n.schedule-block[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 2px;\n  right: 2px;\n  border-radius: 0.25rem;\n  cursor: grab;\n  z-index: 2;\n  overflow: hidden;\n  min-height: 1.25rem;\n  box-shadow: 0 1px 3px var(--color-shadow);\n  transition: box-shadow 0.15s;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.schedule-block[_ngcontent-%COMP%]:hover {\n  box-shadow: 0 2px 8px var(--color-shadow);\n  z-index: 3;\n}\n.schedule-block.dragging[_ngcontent-%COMP%] {\n  opacity: 0.7;\n  cursor: grabbing;\n  z-index: 10;\n}\n.block-content[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.375rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  height: 100%;\n  box-sizing: border-box;\n}\n.block-title[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: #fff;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.block-time[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: rgba(255, 255, 255, 0.85);\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.repeat-icon[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: rgba(255, 255, 255, 0.9);\n  margin-right: 0.125rem;\n}\n.repeat-icon-sm[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n}\n.group-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  font-size: 0.5625rem;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.03em;\n  background: rgba(255, 255, 255, 0.25);\n  color: #fff;\n  padding: 0.0625rem 0.25rem;\n  border-radius: 0.1875rem;\n  width: fit-content;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.group-badge-sm[_ngcontent-%COMP%] {\n  display: inline-block;\n  font-size: 0.5rem;\n  font-weight: 700;\n  background: rgba(255, 255, 255, 0.3);\n  color: #fff;\n  padding: 0 0.1875rem;\n  border-radius: 0.125rem;\n  margin-right: 0.125rem;\n  line-height: 1.2;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.group-badge-inline[_ngcontent-%COMP%] {\n  display: inline-block;\n  font-size: 0.5625rem;\n  font-weight: 700;\n  background: var(--color-accent);\n  color: #fff;\n  padding: 0 0.1875rem;\n  border-radius: 0.125rem;\n  margin-right: 0.25rem;\n  line-height: 1.3;\n}\n.resize-handle[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 0;\n  right: 0;\n  height: 6px;\n  cursor: ns-resize;\n  z-index: 5;\n}\n.resize-handle-top[_ngcontent-%COMP%] {\n  top: 0;\n}\n.resize-handle-bottom[_ngcontent-%COMP%] {\n  bottom: 0;\n}\n.gap-indicator[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 2px;\n  right: 2px;\n  background: rgba(251, 191, 36, 0.08);\n  border: 1px dashed rgba(251, 191, 36, 0.25);\n  border-radius: 0.25rem;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n}\n.gap-label[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: rgba(251, 191, 36, 0.6);\n  font-style: italic;\n}\n.month-grid[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.month-header-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n  border-bottom: 1px solid var(--color-border);\n}\n.month-header-cell[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n  text-align: center;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.month-week-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n}\n.month-day-cell[_ngcontent-%COMP%] {\n  min-height: 5rem;\n  padding: 0.25rem;\n  border-bottom: 1px solid var(--color-border);\n  border-right: 1px solid var(--color-border);\n  cursor: pointer;\n  transition: background 0.15s;\n}\n.month-day-cell[_ngcontent-%COMP%]:nth-child(7n) {\n  border-right: none;\n}\n.month-day-cell[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n}\n.month-day-cell.other-month[_ngcontent-%COMP%] {\n  opacity: 0.4;\n}\n.month-day-cell.today[_ngcontent-%COMP%]   .month-day-number[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n  border-radius: 9999px;\n  width: 1.5rem;\n  height: 1.5rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.month-day-number[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  display: inline-block;\n  margin-bottom: 0.125rem;\n}\n.month-day-entries[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n}\n.month-entry-chip[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: #fff;\n  padding: 0.0625rem 0.25rem;\n  border-radius: 0.125rem;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.side-panel[_ngcontent-%COMP%] {\n  width: 16rem;\n  flex-shrink: 0;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1rem;\n  max-height: calc(100vh - 14rem);\n  overflow-y: auto;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.side-panel[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 0.75rem;\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n.timeline-item[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  padding: 0.5rem 0;\n  border-bottom: 1px solid var(--color-border);\n}\n.timeline-item[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.timeline-colour[_ngcontent-%COMP%] {\n  width: 0.25rem;\n  border-radius: 0.125rem;\n  flex-shrink: 0;\n}\n.timeline-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  min-width: 0;\n}\n.timeline-name[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.timeline-target[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.timeline-time[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 28rem;\n  max-width: 36rem;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n}\n.form-row[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.form-label-text[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-top: 1.25rem;\n}\n.form-actions-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-left: auto;\n}\n.info-box[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary));\n  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border));\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n  margin-bottom: 1rem;\n}\n.info-box[_ngcontent-%COMP%]   .info-label[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--color-text-primary);\n}\n.info-box-warn[_ngcontent-%COMP%] {\n  background: color-mix(in srgb, #f59e0b 8%, var(--color-bg-primary));\n  border-color: color-mix(in srgb, #f59e0b 25%, var(--color-border));\n}\n.colour-picker[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.375rem;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.colour-swatch[_ngcontent-%COMP%] {\n  width: 1.5rem;\n  height: 1.5rem;\n  border-radius: 0.25rem;\n  border: 2px solid transparent;\n  cursor: pointer;\n  transition: border-color 0.15s;\n}\n.colour-swatch[_ngcontent-%COMP%]:hover {\n  border-color: var(--color-text-muted);\n}\n.colour-swatch.selected[_ngcontent-%COMP%] {\n  border-color: #fff;\n  box-shadow: 0 0 0 1px var(--color-accent);\n}\n.colour-input[_ngcontent-%COMP%] {\n  width: 2rem !important;\n  height: 1.5rem;\n  padding: 0 !important;\n  border: 1px solid var(--color-border) !important;\n  border-radius: 0.25rem;\n  cursor: pointer;\n  background: transparent !important;\n}\n.weekday-checkboxes[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  flex-wrap: wrap;\n}\n.weekday-checkbox[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n  cursor: pointer;\n}\n.weekday-checkbox[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: auto;\n  accent-color: var(--color-accent);\n}\n.toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: _ngcontent-%COMP%_toast-in 0.3s ease;\n  box-shadow: 0 4px 16px var(--color-shadow);\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n@keyframes _ngcontent-%COMP%_toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=schedules.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Schedules, [{
    type: Component,
    args: [{ selector: "app-schedules", standalone: true, imports: [FormsModule], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Schedules</h1>
        </div>
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading...</p>
      }

      @if (!loading && !loadError) {
        <!-- Target Selector -->
        <div class="toolbar">
          <div class="target-selector">
            <label for="targetSelect">Target:</label>
            <select
              id="targetSelect"
              [(ngModel)]="selectedTargetId"
              (ngModelChange)="onTargetChange()"
              name="targetSelect"
            >
              @if (targetOptions.length === 0) {
                <option value="" disabled>No screens or groups</option>
              }
              @if (screenTargets.length > 0) {
                <optgroup label="Screens">
                  @for (opt of screenTargets; track opt.id) {
                    <option [value]="'screen:' + opt.id">&#9633; {{ opt.name }}</option>
                  }
                </optgroup>
              }
              @if (groupTargets.length > 0) {
                <optgroup label="Screen Groups">
                  @for (opt of groupTargets; track opt.id) {
                    <option [value]="'group:' + opt.id">&#9638; {{ opt.name }} ({{ opt.mode }})</option>
                  }
                </optgroup>
              }
            </select>
          </div>

          <div class="view-buttons">
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'day'"
              (click)="setView('day')"
            >Day</button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'week'"
              (click)="setView('week')"
            >Week</button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'month'"
              (click)="setView('month')"
            >Month</button>
          </div>

          <div class="nav-buttons">
            <button class="btn btn-secondary btn-sm" (click)="navigatePrev()">&#8592;</button>
            <button class="btn btn-secondary btn-sm" (click)="navigateToday()">Today</button>
            <button class="btn btn-secondary btn-sm" (click)="navigateNext()">&#8594;</button>
            <span class="current-range">{{ currentRangeLabel }}</span>
          </div>

          <button class="btn btn-primary" (click)="openCreateModal()">+ Schedule</button>
        </div>

        @if (sliceProcessing) {
          <div class="slice-status">
            <span class="slice-spinner"></span>
            Processing slices... Content is being prepared for the video wall.
          </div>
        }

        <div class="calendar-layout">
          <!-- Calendar Grid -->
          <div class="calendar-container">
            @if (viewMode === 'month') {
              <!-- Month View -->
              <div class="month-grid">
                <div class="month-header-row">
                  @for (dayName of weekdayNames; track dayName) {
                    <div class="month-header-cell">{{ dayName }}</div>
                  }
                </div>
                @for (week of monthWeeks; track $index) {
                  <div class="month-week-row">
                    @for (day of week; track $index) {
                      <div
                        class="month-day-cell"
                        [class.other-month]="!day.isCurrentMonth"
                        [class.today]="day.isToday"
                        (click)="onMonthDayClick(day.date)"
                        role="button"
                        tabindex="0"
                        (keydown.enter)="onMonthDayClick(day.date)"
                      >
                        <span class="month-day-number">{{ day.dayNumber }}</span>
                        <div class="month-day-entries">
                          @for (block of day.blocks; track block.entry.id) {
                            <div
                              class="month-entry-chip"
                              [style.background]="block.entry.colour"
                              [title]="getEntryLabel(block.entry)"
                            >
                              @if (block.entry.groupId) {
                                <span class="group-badge-sm">G</span>
                              }
                              @if (block.isRecurring) {
                                <span class="repeat-icon">&#8634;</span>
                              }
                              {{ getEntryLabel(block.entry) }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <!-- Day / Week View -->
              <div class="time-grid" #timeGrid>
                <div class="time-grid-header">
                  <div class="time-gutter-header"></div>
                  @for (day of visibleDays; track $index) {
                    <div class="day-column-header" [class.today]="isDayToday(day)">
                      <span class="day-name">{{ formatDayHeader(day) }}</span>
                    </div>
                  }
                </div>
                <div class="time-grid-body" (click)="onTimeGridClick($event)" (keydown.enter)="$event.preventDefault()" role="grid" tabindex="0">
                  <div class="time-gutter">
                    @for (hour of hours; track hour) {
                      <div class="time-label" [style.height.px]="hourHeight">
                        {{ formatHour(hour) }}
                      </div>
                    }
                  </div>
                  <div class="day-columns">
                    @for (day of visibleDays; track $index; let dayIdx = $index) {
                      <div class="day-column" [attr.data-day-index]="dayIdx">
                        @for (hour of hours; track hour) {
                          <div class="hour-slot" [style.height.px]="hourHeight"></div>
                        }
                        <!-- Gap indicators -->
                        @for (gap of getGapsForDay(dayIdx); track $index) {
                          <div
                            class="gap-indicator"
                            [style.top.px]="gap.top"
                            [style.height.px]="gap.height"
                          >
                            <span class="gap-label">Fallback playlist</span>
                          </div>
                        }
                        <!-- Schedule blocks -->
                        @for (block of getBlocksForDay(dayIdx); track block.entry.id) {
                          <div
                            class="schedule-block"
                            [style.top.px]="block.top"
                            [style.height.px]="block.height"
                            [style.background]="block.entry.colour"
                            [class.dragging]="dragState?.entryId === block.entry.id"
                            (mousedown)="onBlockMouseDown($event, block)"
                            (click)="onBlockClick($event, block)"
                            (keydown.enter)="openEditModal(block.entry)"
                            role="button"
                            tabindex="0"
                          >
                            <div
                              class="resize-handle resize-handle-top"
                              (mousedown)="onResizeMouseDown($event, block, 'top')"
                              (keydown.enter)="$event.preventDefault()"
                              role="separator"
                              tabindex="0"
                              aria-label="Resize top"
                              aria-valuenow="0"
                            ></div>
                            <div class="block-content">
                              @if (block.entry.groupId) {
                                <span class="group-badge">Group</span>
                              }
                              @if (block.isRecurring) {
                                <span class="repeat-icon">&#8634;</span>
                              }
                              <span class="block-title">{{ getEntryLabel(block.entry) }}</span>
                              <span class="block-time">
                                {{ formatBlockTime(block.occurrenceStart) }} - {{ formatBlockTime(block.occurrenceEnd) }}
                              </span>
                            </div>
                            <div
                              class="resize-handle resize-handle-bottom"
                              (mousedown)="onResizeMouseDown($event, block, 'bottom')"
                              (keydown.enter)="$event.preventDefault()"
                              role="separator"
                              tabindex="0"
                              aria-label="Resize bottom"
                              aria-valuenow="0"
                            ></div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Side Panel -->
          <div class="side-panel">
            <h3>{{ formatSidePanelDate(selectedDate) }}</h3>
            @if (dayTimeline.length === 0) {
              <p class="empty-text">No schedule entries for this day.</p>
            }
            @for (item of dayTimeline; track $index) {
              <div class="timeline-item">
                <div class="timeline-colour" [style.background]="item.colour"></div>
                <div class="timeline-info">
                  <span class="timeline-name">
                    @if (item.isGroup) {
                      <span class="group-badge-inline">G</span>
                    }
                    {{ item.playlistName }}
                    @if (item.isRecurring) {
                      <span class="repeat-icon-sm">&#8634;</span>
                    }
                  </span>
                  <span class="timeline-target">{{ item.targetName }}</span>
                  <span class="timeline-time">{{ item.startTime }} - {{ item.endTime }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toastMessage) {
        <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'">
          {{ toastMessage }}
        </div>
      }

      <!-- Create / Edit Modal -->
      @if (showModal) {
        <div
          class="modal-overlay"
          (click)="closeModal()"
          role="dialog"
          tabindex="-1"
          (keydown.escape)="closeModal()"
        >
          <div class="modal" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" role="document" tabindex="0">
            <h2>{{ editingEntry ? 'Edit Schedule Entry' : 'Create Schedule Entry' }}</h2>
            <form (ngSubmit)="submitModal()">
              <!-- Target Selector in Modal -->
              @if (!editingEntry) {
                <div class="form-group">
                  <label for="modalTarget">Target</label>
                  <select
                    id="modalTarget"
                    [(ngModel)]="modalTargetId"
                    (ngModelChange)="onModalTargetChange()"
                    name="modalTarget"
                    required
                  >
                    <option value="" disabled>Select a screen or group</option>
                    @if (screenTargets.length > 0) {
                      <optgroup label="Screens">
                        @for (opt of screenTargets; track opt.id) {
                          <option [value]="'screen:' + opt.id">&#9633; {{ opt.name }}</option>
                        }
                      </optgroup>
                    }
                    @if (groupTargets.length > 0) {
                      <optgroup label="Screen Groups">
                        @for (opt of groupTargets; track opt.id) {
                          <option [value]="'group:' + opt.id">&#9638; {{ opt.name }} ({{ opt.mode }})</option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>

                <!-- Group mode info -->
                @if (modalTargetGroup) {
                  <div class="info-box">
                    <span class="info-label">Mode:</span> {{ modalTargetGroup.mode === 'mirror' ? 'Mirror' : 'Split' }}
                    ({{ modalTargetGroup.mode === 'mirror' ? 'all screens show the same content' : modalTargetGroup.gridColumns + 'x' + modalTargetGroup.gridRows + ' grid' }})
                  </div>
                }

                <!-- Split mode notice -->
                @if (modalTargetGroup?.mode === 'split') {
                  <div class="info-box info-box-warn">
                    Content will be pre-sliced for each screen in the video wall. This may take a moment to process after saving.
                  </div>
                }
              }

              <div class="form-group">
                <label for="modalPlaylist">Playlist</label>
                <select
                  id="modalPlaylist"
                  [(ngModel)]="modalPlaylistId"
                  name="modalPlaylist"
                  required
                >
                  <option value="" disabled>Select a playlist</option>
                  @for (p of playlists; track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="modalStartDate">Start Date</label>
                  <input
                    id="modalStartDate"
                    type="date"
                    [(ngModel)]="modalStartDate"
                    name="modalStartDate"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="modalStartTime">Start Time</label>
                  <input
                    id="modalStartTime"
                    type="time"
                    [(ngModel)]="modalStartTime"
                    name="modalStartTime"
                    required
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="modalEndDate">End Date</label>
                  <input
                    id="modalEndDate"
                    type="date"
                    [(ngModel)]="modalEndDate"
                    name="modalEndDate"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="modalEndTime">End Time</label>
                  <input
                    id="modalEndTime"
                    type="time"
                    [(ngModel)]="modalEndTime"
                    name="modalEndTime"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="modalColourCustom">Colour</label>
                <div class="colour-picker">
                  @for (c of presetColours; track c) {
                    <button
                      type="button"
                      class="colour-swatch"
                      [style.background]="c"
                      [class.selected]="modalColour === c"
                      (click)="modalColour = c"
                      [attr.aria-label]="'Select colour ' + c"
                    >&nbsp;</button>
                  }
                  <input
                    id="modalColourCustom"
                    type="color"
                    [(ngModel)]="modalColour"
                    name="modalColourCustom"
                    class="colour-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="modalRecurrence">Recurrence</label>
                <select
                  id="modalRecurrence"
                  [(ngModel)]="modalRecurrence"
                  name="modalRecurrence"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekdays">Specific weekdays</option>
                </select>
              </div>

              @if (modalRecurrence === 'weekdays') {
                <div class="form-group">
                  <span id="weekdayLabel" class="form-label-text">Days</span>
                  <div class="weekday-checkboxes">
                    @for (wd of weekdayOptions; track wd.value) {
                      <label class="weekday-checkbox">
                        <input
                          type="checkbox"
                          [checked]="modalWeekdays.includes(wd.value)"
                          (change)="toggleWeekday(wd.value)"
                        />
                        {{ wd.label }}
                      </label>
                    }
                  </div>
                </div>
              }

              @if (modalError) {
                <p class="error">{{ modalError }}</p>
              }
              <div class="form-actions">
                @if (editingEntry) {
                  <button type="button" class="btn btn-danger" (click)="deleteEntry()">Delete</button>
                }
                <div class="form-actions-right">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                  <button type="submit" class="btn btn-primary" [disabled]="submitting">
                    {{ submitting ? 'Saving...' : (editingEntry ? 'Update' : 'Create') }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;72a3e7345c51ebc8d476a10a6fed1ba79b6dac5133994d6b32e972beccb11187;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/schedules/schedules.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.toolbar {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-bottom: 1rem;\n  flex-wrap: wrap;\n}\n.target-selector {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.target-selector label {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.target-selector select,\n.form-group select {\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n}\n.view-buttons {\n  display: flex;\n  gap: 0.25rem;\n}\n.toggle-btn {\n  padding: 0.375rem 0.75rem;\n  border-radius: 0.375rem;\n  border: 1px solid var(--color-border);\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  transition: all 0.15s;\n}\n.toggle-btn:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.toggle-btn.active {\n  background: var(--color-accent);\n  color: #fff;\n  border-color: var(--color-accent);\n}\n.nav-buttons {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.current-range {\n  font-size: 0.875rem;\n  font-weight: 500;\n  min-width: 10rem;\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-sm {\n  padding: 0.325rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.slice-status {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.625rem 1rem;\n  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));\n  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border));\n  border-radius: 0.375rem;\n  margin-bottom: 1rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.slice-spinner {\n  width: 0.875rem;\n  height: 0.875rem;\n  border: 2px solid var(--color-border);\n  border-top-color: var(--color-accent);\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.calendar-layout {\n  display: flex;\n  gap: 1rem;\n}\n.calendar-container {\n  flex: 1;\n  min-width: 0;\n}\n.time-grid {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.time-grid-header {\n  display: flex;\n  border-bottom: 1px solid var(--color-border);\n}\n.time-gutter-header {\n  width: 3.5rem;\n  flex-shrink: 0;\n}\n.day-column-header {\n  flex: 1;\n  text-align: center;\n  padding: 0.5rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  border-left: 1px solid var(--color-border);\n}\n.day-column-header.today {\n  color: var(--color-accent);\n  font-weight: 600;\n}\n.time-grid-body {\n  display: flex;\n  max-height: calc(100vh - 14rem);\n  overflow-y: auto;\n  position: relative;\n}\n.time-gutter {\n  width: 3.5rem;\n  flex-shrink: 0;\n}\n.time-label {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  text-align: right;\n  padding-right: 0.5rem;\n  box-sizing: border-box;\n  position: relative;\n  top: -0.5em;\n}\n.day-columns {\n  display: flex;\n  flex: 1;\n}\n.day-column {\n  flex: 1;\n  position: relative;\n  border-left: 1px solid var(--color-border);\n}\n.hour-slot {\n  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);\n  box-sizing: border-box;\n}\n.schedule-block {\n  position: absolute;\n  left: 2px;\n  right: 2px;\n  border-radius: 0.25rem;\n  cursor: grab;\n  z-index: 2;\n  overflow: hidden;\n  min-height: 1.25rem;\n  box-shadow: 0 1px 3px var(--color-shadow);\n  transition: box-shadow 0.15s;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.schedule-block:hover {\n  box-shadow: 0 2px 8px var(--color-shadow);\n  z-index: 3;\n}\n.schedule-block.dragging {\n  opacity: 0.7;\n  cursor: grabbing;\n  z-index: 10;\n}\n.block-content {\n  padding: 0.25rem 0.375rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  height: 100%;\n  box-sizing: border-box;\n}\n.block-title {\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: #fff;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.block-time {\n  font-size: 0.625rem;\n  color: rgba(255, 255, 255, 0.85);\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.repeat-icon {\n  font-size: 0.75rem;\n  color: rgba(255, 255, 255, 0.9);\n  margin-right: 0.125rem;\n}\n.repeat-icon-sm {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n}\n.group-badge {\n  display: inline-block;\n  font-size: 0.5625rem;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.03em;\n  background: rgba(255, 255, 255, 0.25);\n  color: #fff;\n  padding: 0.0625rem 0.25rem;\n  border-radius: 0.1875rem;\n  width: fit-content;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.group-badge-sm {\n  display: inline-block;\n  font-size: 0.5rem;\n  font-weight: 700;\n  background: rgba(255, 255, 255, 0.3);\n  color: #fff;\n  padding: 0 0.1875rem;\n  border-radius: 0.125rem;\n  margin-right: 0.125rem;\n  line-height: 1.2;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.group-badge-inline {\n  display: inline-block;\n  font-size: 0.5625rem;\n  font-weight: 700;\n  background: var(--color-accent);\n  color: #fff;\n  padding: 0 0.1875rem;\n  border-radius: 0.125rem;\n  margin-right: 0.25rem;\n  line-height: 1.3;\n}\n.resize-handle {\n  position: absolute;\n  left: 0;\n  right: 0;\n  height: 6px;\n  cursor: ns-resize;\n  z-index: 5;\n}\n.resize-handle-top {\n  top: 0;\n}\n.resize-handle-bottom {\n  bottom: 0;\n}\n.gap-indicator {\n  position: absolute;\n  left: 2px;\n  right: 2px;\n  background: rgba(251, 191, 36, 0.08);\n  border: 1px dashed rgba(251, 191, 36, 0.25);\n  border-radius: 0.25rem;\n  z-index: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: none;\n}\n.gap-label {\n  font-size: 0.625rem;\n  color: rgba(251, 191, 36, 0.6);\n  font-style: italic;\n}\n.month-grid {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.month-header-row {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n  border-bottom: 1px solid var(--color-border);\n}\n.month-header-cell {\n  padding: 0.5rem;\n  text-align: center;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.month-week-row {\n  display: grid;\n  grid-template-columns: repeat(7, 1fr);\n}\n.month-day-cell {\n  min-height: 5rem;\n  padding: 0.25rem;\n  border-bottom: 1px solid var(--color-border);\n  border-right: 1px solid var(--color-border);\n  cursor: pointer;\n  transition: background 0.15s;\n}\n.month-day-cell:nth-child(7n) {\n  border-right: none;\n}\n.month-day-cell:hover {\n  background: var(--color-bg-tertiary);\n}\n.month-day-cell.other-month {\n  opacity: 0.4;\n}\n.month-day-cell.today .month-day-number {\n  background: var(--color-accent);\n  color: #fff;\n  border-radius: 9999px;\n  width: 1.5rem;\n  height: 1.5rem;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.month-day-number {\n  font-size: 0.75rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  display: inline-block;\n  margin-bottom: 0.125rem;\n}\n.month-day-entries {\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n}\n.month-entry-chip {\n  font-size: 0.625rem;\n  color: #fff;\n  padding: 0.0625rem 0.25rem;\n  border-radius: 0.125rem;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);\n}\n.side-panel {\n  width: 16rem;\n  flex-shrink: 0;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1rem;\n  max-height: calc(100vh - 14rem);\n  overflow-y: auto;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.side-panel h3 {\n  margin: 0 0 0.75rem;\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n.timeline-item {\n  display: flex;\n  gap: 0.5rem;\n  padding: 0.5rem 0;\n  border-bottom: 1px solid var(--color-border);\n}\n.timeline-item:last-child {\n  border-bottom: none;\n}\n.timeline-colour {\n  width: 0.25rem;\n  border-radius: 0.125rem;\n  flex-shrink: 0;\n}\n.timeline-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n  min-width: 0;\n}\n.timeline-name {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.timeline-target {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.timeline-time {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 28rem;\n  max-width: 36rem;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-row {\n  display: flex;\n  gap: 0.75rem;\n}\n.form-row .form-group {\n  flex: 1;\n}\n.form-label-text {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-actions {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-top: 1.25rem;\n}\n.form-actions-right {\n  display: flex;\n  gap: 0.75rem;\n  margin-left: auto;\n}\n.info-box {\n  padding: 0.5rem 0.75rem;\n  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary));\n  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border));\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n  margin-bottom: 1rem;\n}\n.info-box .info-label {\n  font-weight: 600;\n  color: var(--color-text-primary);\n}\n.info-box-warn {\n  background: color-mix(in srgb, #f59e0b 8%, var(--color-bg-primary));\n  border-color: color-mix(in srgb, #f59e0b 25%, var(--color-border));\n}\n.colour-picker {\n  display: flex;\n  gap: 0.375rem;\n  flex-wrap: wrap;\n  align-items: center;\n}\n.colour-swatch {\n  width: 1.5rem;\n  height: 1.5rem;\n  border-radius: 0.25rem;\n  border: 2px solid transparent;\n  cursor: pointer;\n  transition: border-color 0.15s;\n}\n.colour-swatch:hover {\n  border-color: var(--color-text-muted);\n}\n.colour-swatch.selected {\n  border-color: #fff;\n  box-shadow: 0 0 0 1px var(--color-accent);\n}\n.colour-input {\n  width: 2rem !important;\n  height: 1.5rem;\n  padding: 0 !important;\n  border: 1px solid var(--color-border) !important;\n  border-radius: 0.25rem;\n  cursor: pointer;\n  background: transparent !important;\n}\n.weekday-checkboxes {\n  display: flex;\n  gap: 0.75rem;\n  flex-wrap: wrap;\n}\n.weekday-checkbox {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-primary);\n  cursor: pointer;\n}\n.weekday-checkbox input[type=checkbox] {\n  width: auto;\n  accent-color: var(--color-accent);\n}\n.toast {\n  position: fixed;\n  bottom: 2rem;\n  right: 2rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  z-index: 2000;\n  animation: toast-in 0.3s ease;\n  box-shadow: 0 4px 16px var(--color-shadow);\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n  border: 1px solid #b91c1c;\n}\n.toast-success {\n  background: #166534;\n  color: #bbf7d0;\n  border: 1px solid #22c55e;\n}\n@keyframes toast-in {\n  from {\n    opacity: 0;\n    transform: translateY(1rem);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=schedules.css.map */\n"] }]
  }], null, { timeGridRef: [{
    type: ViewChild,
    args: ["timeGrid", { static: false }]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Schedules, { className: "Schedules", filePath: "src/app/schedules/schedules.ts", lineNumber: 1144 });
})();
export {
  Schedules
};
//# sourceMappingURL=chunk-Z3MH7YOF.js.map
