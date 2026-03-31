import {
  OrganisationService
} from "./chunk-RZDGRQCL.js";
import {
  DefaultValueAccessor,
  FormsModule,
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
  CommonModule,
  Component,
  DatePipe,
  NgForOf,
  Router,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
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
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/admin/organisations/timezones.ts
var IANA_TIME_ZONES = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Algiers",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Tunis",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Edmonton",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Manaus",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/St_Johns",
  "America/Toronto",
  "America/Vancouver",
  "America/Winnipeg",
  "Asia/Almaty",
  "Asia/Baghdad",
  "Asia/Bangkok",
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Istanbul",
  "Asia/Jakarta",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Atlantic/Reykjavik",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Darwin",
  "Australia/Hobart",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Kiev",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Honolulu",
  "Pacific/Noumea",
  "Pacific/Tongatapu",
  "UTC"
];

// src/app/admin/organisations/organisations.ts
var _forTrack0 = ($index, $item) => $item.id;
function Organisations_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 8);
    \u0275\u0275listener("click", function Organisations_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openCreateForm());
    });
    \u0275\u0275text(1, " + New Organisation ");
    \u0275\u0275elementEnd();
  }
}
function Organisations_Conditional_8_option_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 26);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tz_r4 = ctx.$implicit;
    \u0275\u0275property("value", tz_r4);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tz_r4);
  }
}
function Organisations_Conditional_8_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.formError);
  }
}
function Organisations_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 5)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "form", 9);
    \u0275\u0275listener("ngSubmit", function Organisations_Conditional_8_Template_form_ngSubmit_3_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitForm());
    });
    \u0275\u0275elementStart(4, "div", 10)(5, "label", 11);
    \u0275\u0275text(6, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "input", 12);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_8_Template_input_ngModelChange_7_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.formData.name, $event) || (ctx_r1.formData.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 10)(9, "label", 13);
    \u0275\u0275text(10, "Time Zone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "select", 14);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_8_Template_select_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.formData.timeZone, $event) || (ctx_r1.formData.timeZone = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(12, "option", 15);
    \u0275\u0275text(13, "Select a time zone");
    \u0275\u0275elementEnd();
    \u0275\u0275template(14, Organisations_Conditional_8_option_14_Template, 2, 2, "option", 16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 17)(16, "div", 10)(17, "label", 18);
    \u0275\u0275text(18, "Original Storage Limit (MB)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_8_Template_input_ngModelChange_19_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.storageOriginalMB, $event) || (ctx_r1.storageOriginalMB = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "div", 10)(21, "label", 20);
    \u0275\u0275text(22, "Transcoded Storage Limit (MB)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "input", 21);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_8_Template_input_ngModelChange_23_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.storageTranscodedMB, $event) || (ctx_r1.storageTranscodedMB = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(24, "div", 22)(25, "button", 23);
    \u0275\u0275listener("click", function Organisations_Conditional_8_Template_button_click_25_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelForm());
    });
    \u0275\u0275text(26, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "button", 24);
    \u0275\u0275text(28);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(29, Organisations_Conditional_8_Conditional_29_Template, 2, 1, "p", 25);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.editingId ? "Edit Organisation" : "Create Organisation");
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.formData.name);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.formData.timeZone);
    \u0275\u0275advance(3);
    \u0275\u0275property("ngForOf", ctx_r1.timeZones);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.storageOriginalMB);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.storageTranscodedMB);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.submitting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.editingId ? "Save Changes" : "Create", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.formError ? 29 : -1);
  }
}
function Organisations_Conditional_9_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 33);
    \u0275\u0275text(1, "Loading members...");
    \u0275\u0275elementEnd();
  }
}
function Organisations_Conditional_9_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.membersError);
  }
}
function Organisations_Conditional_9_Conditional_21_For_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td")(6, "select", 36);
    \u0275\u0275listener("ngModelChange", function Organisations_Conditional_9_Conditional_21_For_16_Template_select_ngModelChange_6_listener($event) {
      const member_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.changeMemberRole(member_r7, $event));
    });
    \u0275\u0275elementStart(7, "option", 37);
    \u0275\u0275text(8, "Org Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "option", 38);
    \u0275\u0275text(10, "Editor");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "option", 39);
    \u0275\u0275text(12, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "td");
    \u0275\u0275text(14);
    \u0275\u0275pipe(15, "date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "td")(17, "button", 40);
    \u0275\u0275listener("click", function Organisations_Conditional_9_Conditional_21_For_16_Template_button_click_17_listener() {
      const member_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.confirmRemoveMember(member_r7));
    });
    \u0275\u0275text(18, " Remove ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const member_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(member_r7.user.name || "(no name)");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(member_r7.user.email);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", member_r7.role)("disabled", ctx_r1.updatingMemberId === member_r7.userId);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(15, 6, member_r7.createdAt, "mediumDate"));
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", ctx_r1.removingMemberId === member_r7.userId);
  }
}
function Organisations_Conditional_9_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Role");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Joined");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "tbody");
    \u0275\u0275repeaterCreate(15, Organisations_Conditional_9_Conditional_21_For_16_Template, 19, 9, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(15);
    \u0275\u0275repeater(ctx_r1.members);
  }
}
function Organisations_Conditional_9_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 35);
    \u0275\u0275text(1, "No members yet. Add one above.");
    \u0275\u0275elementEnd();
  }
}
function Organisations_Conditional_9_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.memberActionError);
  }
}
function Organisations_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27)(1, "button", 3);
    \u0275\u0275listener("click", function Organisations_Conditional_9_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.deselectOrg());
    });
    \u0275\u0275text(2, "\u2190 All Organisations");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 28);
    \u0275\u0275listener("click", function Organisations_Conditional_9_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openEditForm(ctx_r1.selectedOrg));
    });
    \u0275\u0275text(6, "Edit");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 29)(8, "span", 30);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 30);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 30);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 31)(15, "h3");
    \u0275\u0275text(16, "Members");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "button", 32);
    \u0275\u0275listener("click", function Organisations_Conditional_9_Template_button_click_17_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openAddMemberModal());
    });
    \u0275\u0275text(18, "+ Add Member");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(19, Organisations_Conditional_9_Conditional_19_Template, 2, 0, "p", 33);
    \u0275\u0275conditionalCreate(20, Organisations_Conditional_9_Conditional_20_Template, 2, 1, "p", 25);
    \u0275\u0275conditionalCreate(21, Organisations_Conditional_9_Conditional_21_Template, 17, 0, "div", 34);
    \u0275\u0275conditionalCreate(22, Organisations_Conditional_9_Conditional_22_Template, 2, 0, "p", 35);
    \u0275\u0275conditionalCreate(23, Organisations_Conditional_9_Conditional_23_Template, 2, 1, "p", 25);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.selectedOrg.name);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.selectedOrg.timeZone);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Original: ", ctx_r1.formatBytes(ctx_r1.selectedOrg.storageOriginalUsedBytes), " / ", ctx_r1.formatBytes(ctx_r1.selectedOrg.storageOriginalLimitBytes));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Transcoded: ", ctx_r1.formatBytes(ctx_r1.selectedOrg.storageTranscodedUsedBytes), " / ", ctx_r1.formatBytes(ctx_r1.selectedOrg.storageTranscodedLimitBytes));
    \u0275\u0275advance(6);
    \u0275\u0275conditional(ctx_r1.membersLoading ? 19 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.membersError ? 20 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.membersLoading && ctx_r1.members.length > 0 ? 21 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.membersLoading && ctx_r1.members.length === 0 && !ctx_r1.membersError ? 22 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.memberActionError ? 23 : -1);
  }
}
function Organisations_Conditional_10_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError);
  }
}
function Organisations_Conditional_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 33);
    \u0275\u0275text(1, "Loading organisations...");
    \u0275\u0275elementEnd();
  }
}
function Organisations_Conditional_10_Conditional_2_For_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr", 42);
    \u0275\u0275listener("click", function Organisations_Conditional_10_Conditional_2_For_18_Template_tr_click_0_listener() {
      const org_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectOrg(org_r9));
    });
    \u0275\u0275elementStart(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td");
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "date");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const org_r9 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(org_r9.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(org_r9.timeZone);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.memberCounts[org_r9.id] ?? "...");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatBytes(org_r9.storageOriginalLimitBytes));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatBytes(org_r9.storageTranscodedLimitBytes));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(13, 6, org_r9.createdAt, "mediumDate"));
  }
}
function Organisations_Conditional_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "table")(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Time Zone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Members");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Original Limit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Transcoded Limit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Created");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "tbody");
    \u0275\u0275repeaterCreate(17, Organisations_Conditional_10_Conditional_2_For_18_Template, 14, 9, "tr", 41, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(17);
    \u0275\u0275repeater(ctx_r1.organisations);
  }
}
function Organisations_Conditional_10_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 35);
    \u0275\u0275text(1, "No organisations yet. Create your first one.");
    \u0275\u0275elementEnd();
  }
}
function Organisations_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, Organisations_Conditional_10_Conditional_0_Template, 2, 1, "p", 25);
    \u0275\u0275conditionalCreate(1, Organisations_Conditional_10_Conditional_1_Template, 2, 0, "p", 33);
    \u0275\u0275conditionalCreate(2, Organisations_Conditional_10_Conditional_2_Template, 19, 0, "div", 34);
    \u0275\u0275conditionalCreate(3, Organisations_Conditional_10_Conditional_3_Template, 2, 0, "p", 35);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r1.loadError ? 0 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.loading ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.loading && ctx_r1.organisations.length > 0 ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.loading && ctx_r1.organisations.length === 0 && !ctx_r1.loadError ? 3 : -1);
  }
}
function Organisations_Conditional_11_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.addMemberError);
  }
}
function Organisations_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 43);
    \u0275\u0275listener("click", function Organisations_Conditional_11_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddMemberModal());
    })("keydown.escape", function Organisations_Conditional_11_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddMemberModal());
    });
    \u0275\u0275elementStart(1, "div", 44);
    \u0275\u0275listener("click", function Organisations_Conditional_11_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Organisations_Conditional_11_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Add Member");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 9);
    \u0275\u0275listener("ngSubmit", function Organisations_Conditional_11_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitAddMember());
    });
    \u0275\u0275elementStart(5, "div", 10)(6, "label", 45);
    \u0275\u0275text(7, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 46);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_11_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.addMemberEmail, $event) || (ctx_r1.addMemberEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 10)(10, "label", 47);
    \u0275\u0275text(11, "Role");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 48);
    \u0275\u0275twoWayListener("ngModelChange", function Organisations_Conditional_11_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.addMemberRole, $event) || (ctx_r1.addMemberRole = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 37);
    \u0275\u0275text(14, "Org Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 38);
    \u0275\u0275text(16, "Editor");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "option", 39);
    \u0275\u0275text(18, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(19, Organisations_Conditional_11_Conditional_19_Template, 2, 1, "p", 25);
    \u0275\u0275elementStart(20, "div", 22)(21, "button", 23);
    \u0275\u0275listener("click", function Organisations_Conditional_11_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeAddMemberModal());
    });
    \u0275\u0275text(22, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "button", 24);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.addMemberEmail);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.addMemberRole);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(ctx_r1.addMemberError ? 19 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.addingMember);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.addingMember ? "Adding..." : "Add Member", " ");
  }
}
function Organisations_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275listener("click", function Organisations_Conditional_12_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemoveMember());
    })("keydown.escape", function Organisations_Conditional_12_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemoveMember());
    });
    \u0275\u0275elementStart(1, "div", 44);
    \u0275\u0275listener("click", function Organisations_Conditional_12_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Organisations_Conditional_12_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Remove Member");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p");
    \u0275\u0275text(5, "Are you sure you want to remove ");
    \u0275\u0275elementStart(6, "strong");
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " from this organisation?");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 22)(10, "button", 50);
    \u0275\u0275listener("click", function Organisations_Conditional_12_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemoveMember());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 51);
    \u0275\u0275listener("click", function Organisations_Conditional_12_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeRemoveMember());
    });
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.removingMember == null ? null : ctx_r1.removingMember.user == null ? null : ctx_r1.removingMember.user.email);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r1.removingMemberId !== null);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.removingMemberId ? "Removing..." : "Remove", " ");
  }
}
var Organisations = class _Organisations {
  orgService = inject(OrganisationService);
  router = inject(Router);
  // Org list state
  organisations = [];
  memberCounts = {};
  loading = true;
  loadError = "";
  // Org form state
  showForm = false;
  editingId = null;
  submitting = false;
  formError = "";
  timeZones = IANA_TIME_ZONES;
  formData = { name: "", timeZone: "" };
  storageOriginalMB = 0;
  storageTranscodedMB = 0;
  // Selected org + members state
  selectedOrg = null;
  members = [];
  membersLoading = false;
  membersError = "";
  memberActionError = "";
  // Add member modal state
  showAddMemberModal = false;
  addMemberEmail = "";
  addMemberRole = "viewer";
  addMemberError = "";
  addingMember = false;
  // Role change state
  updatingMemberId = null;
  // Remove member state
  showRemoveConfirm = false;
  removingMember = null;
  removingMemberId = null;
  ngOnInit() {
    this.loadOrganisations();
  }
  // ── Org list ──
  loadOrganisations() {
    this.loading = true;
    this.loadError = "";
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.organisations = orgs;
        this.loading = false;
        for (const org of orgs) {
          this.orgService.listMembers(org.id).subscribe({
            next: (members) => this.memberCounts[org.id] = members.length,
            error: () => this.memberCounts[org.id] = 0
          });
        }
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied. Super-admin privileges required." : "Failed to load organisations.";
        this.loading = false;
      }
    });
  }
  selectOrg(org) {
    this.selectedOrg = org;
    this.loadMembers();
  }
  deselectOrg() {
    this.selectedOrg = null;
    this.members = [];
    this.membersError = "";
    this.memberActionError = "";
  }
  // ── Org form ──
  openCreateForm() {
    this.editingId = null;
    this.formData = { name: "", timeZone: "" };
    this.storageOriginalMB = 0;
    this.storageTranscodedMB = 0;
    this.formError = "";
    this.showForm = true;
  }
  openEditForm(org) {
    this.editingId = org.id;
    this.formData = { name: org.name, timeZone: org.timeZone };
    this.storageOriginalMB = Math.round(org.storageOriginalLimitBytes / (1024 * 1024));
    this.storageTranscodedMB = Math.round(org.storageTranscodedLimitBytes / (1024 * 1024));
    this.formError = "";
    this.showForm = true;
  }
  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.formError = "";
  }
  submitForm() {
    if (!this.formData.name || !this.formData.timeZone) {
      this.formError = "Name and time zone are required.";
      return;
    }
    this.submitting = true;
    this.formError = "";
    const payload = {
      name: this.formData.name,
      timeZone: this.formData.timeZone,
      storageOriginalLimitBytes: this.storageOriginalMB * 1024 * 1024,
      storageTranscodedLimitBytes: this.storageTranscodedMB * 1024 * 1024
    };
    const request$ = this.editingId ? this.orgService.update(this.editingId, payload) : this.orgService.create(payload);
    request$.subscribe({
      next: (saved) => {
        this.showForm = false;
        this.submitting = false;
        if (this.editingId && this.selectedOrg) {
          this.selectedOrg = saved;
        }
        this.editingId = null;
        this.loadOrganisations();
      },
      error: (err) => {
        this.formError = err.error?.message || "An error occurred. Please try again.";
        this.submitting = false;
      }
    });
  }
  // ── Members ──
  loadMembers() {
    if (!this.selectedOrg)
      return;
    this.membersLoading = true;
    this.membersError = "";
    this.memberActionError = "";
    this.orgService.listMembers(this.selectedOrg.id).subscribe({
      next: (members) => {
        this.members = members;
        this.membersLoading = false;
      },
      error: () => {
        this.membersError = "Failed to load members.";
        this.membersLoading = false;
      }
    });
  }
  openAddMemberModal() {
    this.addMemberEmail = "";
    this.addMemberRole = "viewer";
    this.addMemberError = "";
    this.showAddMemberModal = true;
  }
  closeAddMemberModal() {
    this.showAddMemberModal = false;
  }
  submitAddMember() {
    if (!this.addMemberEmail || !this.selectedOrg) {
      this.addMemberError = "Email is required.";
      return;
    }
    this.addingMember = true;
    this.addMemberError = "";
    this.orgService.addMember(this.selectedOrg.id, {
      email: this.addMemberEmail,
      role: this.addMemberRole
    }).subscribe({
      next: () => {
        this.addingMember = false;
        this.showAddMemberModal = false;
        this.loadMembers();
      },
      error: (err) => {
        this.addMemberError = err.error?.message || "Failed to add member.";
        this.addingMember = false;
      }
    });
  }
  changeMemberRole(member, newRole) {
    if (newRole === member.role || !this.selectedOrg)
      return;
    this.updatingMemberId = member.userId;
    this.memberActionError = "";
    this.orgService.updateMemberRole(this.selectedOrg.id, member.userId, { role: newRole }).subscribe({
      next: (updated) => {
        member.role = updated.role;
        this.updatingMemberId = null;
      },
      error: (err) => {
        this.memberActionError = err.error?.message || "Failed to update role.";
        this.updatingMemberId = null;
      }
    });
  }
  confirmRemoveMember(member) {
    this.removingMember = member;
    this.showRemoveConfirm = true;
  }
  cancelRemoveMember() {
    this.showRemoveConfirm = false;
    this.removingMember = null;
  }
  executeRemoveMember() {
    if (!this.removingMember || !this.selectedOrg)
      return;
    this.removingMemberId = this.removingMember.userId;
    this.memberActionError = "";
    this.orgService.removeMember(this.selectedOrg.id, this.removingMember.userId).subscribe({
      next: () => {
        this.removingMemberId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
        this.loadMembers();
      },
      error: (err) => {
        this.memberActionError = err.error?.message || "Failed to remove member.";
        this.removingMemberId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
      }
    });
  }
  // ── Helpers ──
  formatBytes(bytes) {
    if (bytes === 0)
      return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function Organisations_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Organisations)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Organisations, selectors: [["app-organisations"]], decls: 13, vars: 6, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "form-card"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add member", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm removal", "tabindex", "0", 1, "modal-overlay"], [1, "btn", "btn-primary", 3, "click"], [3, "ngSubmit"], [1, "form-group"], ["for", "name"], ["id", "name", "type", "text", "name", "name", "required", "", "placeholder", "Organisation name", 3, "ngModelChange", "ngModel"], ["for", "timeZone"], ["id", "timeZone", "name", "timeZone", "required", "", 3, "ngModelChange", "ngModel"], ["value", "", "disabled", ""], [3, "value", 4, "ngFor", "ngForOf"], [1, "form-row"], ["for", "storageOriginal"], ["id", "storageOriginal", "type", "number", "name", "storageOriginal", "required", "", "min", "0", 3, "ngModelChange", "ngModel"], ["for", "storageTranscoded"], ["id", "storageTranscoded", "type", "number", "name", "storageTranscoded", "required", "", "min", "0", 3, "ngModelChange", "ngModel"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], [1, "error"], [3, "value"], [1, "detail-header"], [1, "btn", "btn-small", 3, "click"], [1, "org-info"], [1, "info-tag"], [1, "section-header"], [1, "btn", "btn-primary", "btn-small", 3, "click"], [1, "loading-text"], [1, "table-container"], [1, "empty-text"], [1, "role-select", 3, "ngModelChange", "ngModel", "disabled"], ["value", "org_admin"], ["value", "editor"], ["value", "viewer"], [1, "btn", "btn-small", "btn-danger", 3, "click", "disabled"], [1, "clickable-row"], [1, "clickable-row", 3, "click"], ["role", "dialog", "aria-modal", "true", "aria-label", "Add member", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], ["for", "memberEmail"], ["id", "memberEmail", "type", "email", "name", "memberEmail", "required", "", "placeholder", "user@example.com", 3, "ngModelChange", "ngModel"], ["for", "memberRole"], ["id", "memberRole", "name", "memberRole", "required", "", 3, "ngModelChange", "ngModel"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm removal", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "btn", "btn-secondary", 3, "click"], [1, "btn", "btn-danger", 3, "click", "disabled"]], template: function Organisations_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function Organisations_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Organisations");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, Organisations_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(8, Organisations_Conditional_8_Template, 30, 9, "div", 5);
      \u0275\u0275conditionalCreate(9, Organisations_Conditional_9_Template, 24, 11);
      \u0275\u0275conditionalCreate(10, Organisations_Conditional_10_Template, 4, 4);
      \u0275\u0275conditionalCreate(11, Organisations_Conditional_11_Template, 25, 5, "div", 6);
      \u0275\u0275conditionalCreate(12, Organisations_Conditional_12_Template, 14, 3, "div", 7);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.showForm && !ctx.selectedOrg ? 7 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showForm ? 8 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.selectedOrg && !ctx.showForm ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.selectedOrg && !ctx.showForm ? 10 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAddMemberModal ? 11 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showRemoveConfirm ? 12 : -1);
    }
  }, dependencies: [CommonModule, NgForOf, FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, MinValidator, NgModel, NgForm, DatePipe], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.detail-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-bottom: 1rem;\n}\n.detail-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin: 0;\n}\n.org-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n.info-tag[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  padding: 0.25rem 0.75rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.section-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.section-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover {\n  background: var(--color-border);\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.form-card[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  margin-bottom: 2rem;\n  max-width: 40rem;\n}\n.form-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.table-container[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  border-bottom: 2px solid var(--color-border);\n}\nth[_ngcontent-%COMP%] {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\ntd[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n}\ntr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n}\n.clickable-row[_ngcontent-%COMP%] {\n  cursor: pointer;\n}\n.role-select[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n}\n.role-select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.role-select[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 32rem;\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%], \n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=organisations.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Organisations, [{
    type: Component,
    args: [{ selector: "app-organisations", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Organisations</h1>
        </div>
        @if (!showForm && !selectedOrg) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + New Organisation
          </button>
        }
      </header>

      <!-- \u2500\u2500 Create / Edit Form \u2500\u2500 -->
      @if (showForm) {
        <div class="form-card">
          <h2>{{ editingId ? 'Edit Organisation' : 'Create Organisation' }}</h2>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label for="name">Name</label>
              <input
                id="name"
                type="text"
                [(ngModel)]="formData.name"
                name="name"
                required
                placeholder="Organisation name"
              />
            </div>

            <div class="form-group">
              <label for="timeZone">Time Zone</label>
              <select id="timeZone" [(ngModel)]="formData.timeZone" name="timeZone" required>
                <option value="" disabled>Select a time zone</option>
                <option *ngFor="let tz of timeZones" [value]="tz">{{ tz }}</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="storageOriginal">Original Storage Limit (MB)</label>
                <input
                  id="storageOriginal"
                  type="number"
                  [(ngModel)]="storageOriginalMB"
                  name="storageOriginal"
                  required
                  min="0"
                />
              </div>
              <div class="form-group">
                <label for="storageTranscoded">Transcoded Storage Limit (MB)</label>
                <input
                  id="storageTranscoded"
                  type="number"
                  [(ngModel)]="storageTranscodedMB"
                  name="storageTranscoded"
                  required
                  min="0"
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting">
                {{ editingId ? 'Save Changes' : 'Create' }}
              </button>
            </div>
          </form>
          @if (formError) {
            <p class="error">{{ formError }}</p>
          }
        </div>
      }

      <!-- \u2500\u2500 Organisation Detail + Members \u2500\u2500 -->
      @if (selectedOrg && !showForm) {
        <div class="detail-header">
          <button class="back-btn" (click)="deselectOrg()">&#8592; All Organisations</button>
          <h2>{{ selectedOrg.name }}</h2>
          <button class="btn btn-small" (click)="openEditForm(selectedOrg)">Edit</button>
        </div>

        <div class="org-info">
          <span class="info-tag">{{ selectedOrg.timeZone }}</span>
          <span class="info-tag">Original: {{ formatBytes(selectedOrg.storageOriginalUsedBytes) }} / {{ formatBytes(selectedOrg.storageOriginalLimitBytes) }}</span>
          <span class="info-tag">Transcoded: {{ formatBytes(selectedOrg.storageTranscodedUsedBytes) }} / {{ formatBytes(selectedOrg.storageTranscodedLimitBytes) }}</span>
        </div>

        <!-- Members section -->
        <div class="section-header">
          <h3>Members</h3>
          <button class="btn btn-primary btn-small" (click)="openAddMemberModal()">+ Add Member</button>
        </div>

        @if (membersLoading) {
          <p class="loading-text">Loading members...</p>
        }

        @if (membersError) {
          <p class="error">{{ membersError }}</p>
        }

        @if (!membersLoading && members.length > 0) {
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members; track member.id) {
                  <tr>
                    <td>{{ member.user.name || '(no name)' }}</td>
                    <td>{{ member.user.email }}</td>
                    <td>
                      <select
                        class="role-select"
                        [ngModel]="member.role"
                        (ngModelChange)="changeMemberRole(member, $event)"
                        [disabled]="updatingMemberId === member.userId"
                      >
                        <option value="org_admin">Org Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td>{{ member.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <button
                        class="btn btn-small btn-danger"
                        (click)="confirmRemoveMember(member)"
                        [disabled]="removingMemberId === member.userId"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!membersLoading && members.length === 0 && !membersError) {
          <p class="empty-text">No members yet. Add one above.</p>
        }

        @if (memberActionError) {
          <p class="error">{{ memberActionError }}</p>
        }
      }

      <!-- \u2500\u2500 Organisations List \u2500\u2500 -->
      @if (!selectedOrg && !showForm) {
        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (loading) {
          <p class="loading-text">Loading organisations...</p>
        }

        @if (!loading && organisations.length > 0) {
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Time Zone</th>
                  <th>Members</th>
                  <th>Original Limit</th>
                  <th>Transcoded Limit</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (org of organisations; track org.id) {
                  <tr class="clickable-row" (click)="selectOrg(org)">
                    <td>{{ org.name }}</td>
                    <td>{{ org.timeZone }}</td>
                    <td>{{ memberCounts[org.id] ?? '...' }}</td>
                    <td>{{ formatBytes(org.storageOriginalLimitBytes) }}</td>
                    <td>{{ formatBytes(org.storageTranscodedLimitBytes) }}</td>
                    <td>{{ org.createdAt | date:'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!loading && organisations.length === 0 && !loadError) {
          <p class="empty-text">No organisations yet. Create your first one.</p>
        }
      }

      <!-- \u2500\u2500 Add Member Modal \u2500\u2500 -->
      @if (showAddMemberModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add member"
             tabindex="0" (click)="closeAddMemberModal()" (keydown.escape)="closeAddMemberModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add Member</h2>
            <form (ngSubmit)="submitAddMember()">
              <div class="form-group">
                <label for="memberEmail">Email</label>
                <input
                  id="memberEmail"
                  type="email"
                  [(ngModel)]="addMemberEmail"
                  name="memberEmail"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div class="form-group">
                <label for="memberRole">Role</label>
                <select id="memberRole" [(ngModel)]="addMemberRole" name="memberRole" required>
                  <option value="org_admin">Org Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              @if (addMemberError) {
                <p class="error">{{ addMemberError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeAddMemberModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="addingMember">
                  {{ addingMember ? 'Adding...' : 'Add Member' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- \u2500\u2500 Remove Member Confirm Modal \u2500\u2500 -->
      @if (showRemoveConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm removal"
             tabindex="0" (click)="cancelRemoveMember()" (keydown.escape)="cancelRemoveMember()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Remove Member</h2>
            <p>Are you sure you want to remove <strong>{{ removingMember?.user?.email }}</strong> from this organisation?</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRemoveMember()">Cancel</button>
              <button class="btn btn-danger" (click)="executeRemoveMember()" [disabled]="removingMemberId !== null">
                {{ removingMemberId ? 'Removing...' : 'Remove' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;49c3a559ebe7c3e6ec754247a6b6ab8753c0c5837c83c5248a9b05746e011e52;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/admin/organisations/organisations.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.detail-header {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-bottom: 1rem;\n}\n.detail-header h2 {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin: 0;\n}\n.org-info {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n.info-tag {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  padding: 0.25rem 0.75rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1rem;\n}\n.section-header h3 {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover {\n  background: var(--color-border);\n}\n.btn-small {\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.form-card {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  margin-bottom: 2rem;\n  max-width: 40rem;\n}\n.form-card h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-row {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.table-container {\n  overflow-x: auto;\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead {\n  background: var(--color-bg-tertiary);\n  border-bottom: 2px solid var(--color-border);\n}\nth {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\ntd {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n}\ntr:hover td {\n  background: var(--color-bg-tertiary);\n}\n.clickable-row {\n  cursor: pointer;\n}\n.role-select {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n}\n.role-select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.role-select:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 32rem;\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text,\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=organisations.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Organisations, { className: "Organisations", filePath: "src/app/admin/organisations/organisations.ts", lineNumber: 545 });
})();
export {
  Organisations
};
//# sourceMappingURL=chunk-VBCK5MTO.js.map
