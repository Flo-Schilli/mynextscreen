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
  RouterLink,
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
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/settings/users/users.ts
var _forTrack0 = ($index, $item) => $item.id;
function Users_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 14);
    \u0275\u0275listener("click", function Users_Conditional_7_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openInviteModal());
    });
    \u0275\u0275text(1, " + Invite User ");
    \u0275\u0275elementEnd();
  }
}
function Users_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.loadError);
  }
}
function Users_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 9);
    \u0275\u0275text(1, "Loading members...");
    \u0275\u0275elementEnd();
  }
}
function Users_Conditional_15_For_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td")(6, "select", 15);
    \u0275\u0275listener("ngModelChange", function Users_Conditional_15_For_16_Template_select_ngModelChange_6_listener($event) {
      const member_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.changeRole(member_r4, $event));
    });
    \u0275\u0275elementStart(7, "option", 16);
    \u0275\u0275text(8, "Org Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "option", 17);
    \u0275\u0275text(10, "Editor");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "option", 18);
    \u0275\u0275text(12, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "td");
    \u0275\u0275text(14);
    \u0275\u0275pipe(15, "date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "td")(17, "button", 19);
    \u0275\u0275listener("click", function Users_Conditional_15_For_16_Template_button_click_17_listener() {
      const member_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.confirmRemove(member_r4));
    });
    \u0275\u0275text(18, " Remove ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const member_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(member_r4.user.name || "(no name)");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(member_r4.user.email);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", member_r4.role)("disabled", ctx_r1.updatingUserId === member_r4.userId);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind2(15, 6, member_r4.createdAt, "mediumDate"));
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", ctx_r1.removingUserId === member_r4.userId);
  }
}
function Users_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10)(1, "table")(2, "thead")(3, "tr")(4, "th");
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
    \u0275\u0275repeaterCreate(15, Users_Conditional_15_For_16_Template, 19, 9, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(15);
    \u0275\u0275repeater(ctx_r1.members);
  }
}
function Users_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 11);
    \u0275\u0275text(1, "No members found.");
    \u0275\u0275elementEnd();
  }
}
function Users_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.actionError);
  }
}
function Users_Conditional_18_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.inviteError);
  }
}
function Users_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 20);
    \u0275\u0275listener("click", function Users_Conditional_18_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeInviteModal());
    })("keydown.escape", function Users_Conditional_18_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeInviteModal());
    });
    \u0275\u0275elementStart(1, "div", 21);
    \u0275\u0275listener("click", function Users_Conditional_18_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Users_Conditional_18_Template_div_keydown_1_listener($event) {
      return $event.stopPropagation();
    });
    \u0275\u0275elementStart(2, "h2");
    \u0275\u0275text(3, "Invite User");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 22);
    \u0275\u0275listener("ngSubmit", function Users_Conditional_18_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitInvite());
    });
    \u0275\u0275elementStart(5, "div", 23)(6, "label", 24);
    \u0275\u0275text(7, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function Users_Conditional_18_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.inviteEmail, $event) || (ctx_r1.inviteEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 23)(10, "label", 26);
    \u0275\u0275text(11, "Role");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 27);
    \u0275\u0275twoWayListener("ngModelChange", function Users_Conditional_18_Template_select_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.inviteRole, $event) || (ctx_r1.inviteRole = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(13, "option", 16);
    \u0275\u0275text(14, "Org Admin");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 17);
    \u0275\u0275text(16, "Editor");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "option", 18);
    \u0275\u0275text(18, "Viewer");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(19, Users_Conditional_18_Conditional_19_Template, 2, 1, "p", 8);
    \u0275\u0275elementStart(20, "div", 28)(21, "button", 29);
    \u0275\u0275listener("click", function Users_Conditional_18_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeInviteModal());
    });
    \u0275\u0275text(22, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "button", 30);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.inviteEmail);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.inviteRole);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(ctx_r1.inviteError ? 19 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r1.inviting);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.inviting ? "Inviting..." : "Invite", " ");
  }
}
function Users_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275listener("click", function Users_Conditional_19_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemove());
    })("keydown.escape", function Users_Conditional_19_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemove());
    });
    \u0275\u0275elementStart(1, "div", 21);
    \u0275\u0275listener("click", function Users_Conditional_19_Template_div_click_1_listener($event) {
      return $event.stopPropagation();
    })("keydown", function Users_Conditional_19_Template_div_keydown_1_listener($event) {
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
    \u0275\u0275elementStart(9, "div", 28)(10, "button", 32);
    \u0275\u0275listener("click", function Users_Conditional_19_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelRemove());
    });
    \u0275\u0275text(11, "Cancel");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "button", 33);
    \u0275\u0275listener("click", function Users_Conditional_19_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.executeRemove());
    });
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.removingMember == null ? null : ctx_r1.removingMember.user == null ? null : ctx_r1.removingMember.user.email);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r1.removingUserId !== null);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.removingUserId ? "Removing..." : "Remove", " ");
  }
}
var Users = class _Users {
  memberService = inject(MemberService);
  router = inject(Router);
  orgId = "";
  members = [];
  loading = true;
  loadError = "";
  actionError = "";
  // Invite modal state
  showInviteModal = false;
  inviteEmail = "";
  inviteRole = "viewer";
  inviteError = "";
  inviting = false;
  // Role change state
  updatingUserId = null;
  // Remove confirmation state
  showRemoveConfirm = false;
  removingMember = null;
  removingUserId = null;
  ngOnInit() {
    this.loadCurrentOrg();
  }
  loadCurrentOrg() {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships) => {
        const adminMembership = memberships.find((m) => m.role === "org_admin");
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadMembers();
        } else if (memberships.length > 0) {
          this.loadError = "You do not have Org Admin access to any organisation.";
          this.loading = false;
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
  loadMembers() {
    this.loading = true;
    this.loadError = "";
    this.actionError = "";
    this.memberService.listMembers(this.orgId).subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? "Access denied. Org Admin privileges required." : "Failed to load members.";
        this.loading = false;
      }
    });
  }
  openInviteModal() {
    this.inviteEmail = "";
    this.inviteRole = "viewer";
    this.inviteError = "";
    this.showInviteModal = true;
  }
  closeInviteModal() {
    this.showInviteModal = false;
  }
  submitInvite() {
    if (!this.inviteEmail) {
      this.inviteError = "Email is required.";
      return;
    }
    this.inviting = true;
    this.inviteError = "";
    this.memberService.addMember(this.orgId, { email: this.inviteEmail, role: this.inviteRole }).subscribe({
      next: () => {
        this.inviting = false;
        this.showInviteModal = false;
        this.loadMembers();
      },
      error: (err) => {
        this.inviteError = err.error?.message || "Failed to invite user.";
        this.inviting = false;
      }
    });
  }
  changeRole(member, newRole) {
    if (newRole === member.role)
      return;
    this.updatingUserId = member.userId;
    this.actionError = "";
    this.memberService.updateRole(this.orgId, member.userId, { role: newRole }).subscribe({
      next: (updated) => {
        member.role = updated.role;
        this.updatingUserId = null;
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to update role.";
        this.updatingUserId = null;
      }
    });
  }
  confirmRemove(member) {
    this.removingMember = member;
    this.showRemoveConfirm = true;
  }
  cancelRemove() {
    this.showRemoveConfirm = false;
    this.removingMember = null;
  }
  executeRemove() {
    if (!this.removingMember)
      return;
    this.removingUserId = this.removingMember.userId;
    this.actionError = "";
    this.memberService.removeMember(this.orgId, this.removingMember.userId).subscribe({
      next: () => {
        this.removingUserId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
        this.loadMembers();
      },
      error: (err) => {
        this.actionError = err.error?.message || "Failed to remove member.";
        this.removingUserId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
      }
    });
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  static \u0275fac = function Users_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Users)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Users, selectors: [["app-users"]], decls: 20, vars: 8, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "btn", "btn-primary"], [1, "settings-nav"], [1, "settings-nav-link", "active"], ["routerLink", "/settings/org/notifications", 1, "settings-nav-link"], [1, "error"], [1, "loading-text"], [1, "table-container"], [1, "empty-text"], ["role", "dialog", "aria-modal", "true", "aria-label", "Invite user", "tabindex", "0", 1, "modal-overlay"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm removal", "tabindex", "0", 1, "modal-overlay"], [1, "btn", "btn-primary", 3, "click"], [1, "role-select", 3, "ngModelChange", "ngModel", "disabled"], ["value", "org_admin"], ["value", "editor"], ["value", "viewer"], [1, "btn", "btn-small", "btn-danger", 3, "click", "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Invite user", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], ["role", "document", 1, "modal", 3, "click", "keydown"], [3, "ngSubmit"], [1, "form-group"], ["for", "inviteEmail"], ["id", "inviteEmail", "type", "email", "name", "inviteEmail", "required", "", "placeholder", "user@example.com", 3, "ngModelChange", "ngModel"], ["for", "inviteRole"], ["id", "inviteRole", "name", "inviteRole", "required", "", 3, "ngModelChange", "ngModel"], [1, "form-actions"], ["type", "button", 1, "btn", "btn-secondary", 3, "click"], ["type", "submit", 1, "btn", "btn-primary", 3, "disabled"], ["role", "dialog", "aria-modal", "true", "aria-label", "Confirm removal", "tabindex", "0", 1, "modal-overlay", 3, "click", "keydown.escape"], [1, "btn", "btn-secondary", 3, "click"], [1, "btn", "btn-danger", 3, "click", "disabled"]], template: function Users_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function Users_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "User Management");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(7, Users_Conditional_7_Template, 2, 0, "button", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "nav", 5)(9, "a", 6);
      \u0275\u0275text(10, "User Management");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "a", 7);
      \u0275\u0275text(12, "Notification Config");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(13, Users_Conditional_13_Template, 2, 1, "p", 8);
      \u0275\u0275conditionalCreate(14, Users_Conditional_14_Template, 2, 0, "p", 9);
      \u0275\u0275conditionalCreate(15, Users_Conditional_15_Template, 17, 0, "div", 10);
      \u0275\u0275conditionalCreate(16, Users_Conditional_16_Template, 2, 0, "p", 11);
      \u0275\u0275conditionalCreate(17, Users_Conditional_17_Template, 2, 1, "p", 8);
      \u0275\u0275conditionalCreate(18, Users_Conditional_18_Template, 25, 5, "div", 12);
      \u0275\u0275conditionalCreate(19, Users_Conditional_19_Template, 14, 3, "div", 13);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275conditional(!ctx.loading && ctx.members.length > 0 ? 7 : -1);
      \u0275\u0275advance(6);
      \u0275\u0275conditional(ctx.loadError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && ctx.members.length > 0 ? 15 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && ctx.members.length === 0 && !ctx.loadError ? 16 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.actionError ? 17 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showInviteModal ? 18 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showRemoveConfirm ? 19 : -1);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterLink, DatePipe], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.settings-nav[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0;\n  margin-bottom: 1.5rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.settings-nav-link[_ngcontent-%COMP%] {\n  padding: 0.625rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  border-bottom: 2px solid transparent;\n  cursor: pointer;\n  transition: color 0.15s, border-color 0.15s;\n}\n.settings-nav-link[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n}\n.settings-nav-link.active[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n  border-bottom-color: var(--color-accent);\n  font-weight: 500;\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover {\n  background: var(--color-border);\n}\n.btn-small[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.table-container[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\ntable[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  border-bottom: 2px solid var(--color-border);\n}\nth[_ngcontent-%COMP%] {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\ntd[_ngcontent-%COMP%] {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n}\ntr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n}\n.role-select[_ngcontent-%COMP%] {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n}\n.role-select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.role-select[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 1rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.form-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 32rem;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text[_ngcontent-%COMP%], \n.empty-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=users.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Users, [{
    type: Component,
    args: [{ selector: "app-users", standalone: true, imports: [DatePipe, FormsModule, RouterLink], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>User Management</h1>
        </div>
        @if (!loading && members.length > 0) {
          <button class="btn btn-primary" (click)="openInviteModal()">
            + Invite User
          </button>
        }
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link active">User Management</a>
        <a class="settings-nav-link" routerLink="/settings/org/notifications">Notification Config</a>
      </nav>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading members...</p>
      }

      @if (!loading && members.length > 0) {
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
                      (ngModelChange)="changeRole(member, $event)"
                      [disabled]="updatingUserId === member.userId"
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
                      (click)="confirmRemove(member)"
                      [disabled]="removingUserId === member.userId"
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

      @if (!loading && members.length === 0 && !loadError) {
        <p class="empty-text">No members found.</p>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      @if (showInviteModal) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Invite user"
             tabindex="0" (click)="closeInviteModal()" (keydown.escape)="closeInviteModal()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Invite User</h2>
            <form (ngSubmit)="submitInvite()">
              <div class="form-group">
                <label for="inviteEmail">Email</label>
                <input
                  id="inviteEmail"
                  type="email"
                  [(ngModel)]="inviteEmail"
                  name="inviteEmail"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div class="form-group">
                <label for="inviteRole">Role</label>
                <select id="inviteRole" [(ngModel)]="inviteRole" name="inviteRole" required>
                  <option value="org_admin">Org Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              @if (inviteError) {
                <p class="error">{{ inviteError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeInviteModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="inviting">
                  {{ inviting ? 'Inviting...' : 'Invite' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showRemoveConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm removal"
             tabindex="0" (click)="cancelRemove()" (keydown.escape)="cancelRemove()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Remove Member</h2>
            <p>Are you sure you want to remove <strong>{{ removingMember?.user?.email }}</strong> from this organisation?</p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRemove()">Cancel</button>
              <button class="btn btn-danger" (click)="executeRemove()" [disabled]="removingUserId !== null">
                {{ removingUserId ? 'Removing...' : 'Remove' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;f437a650859b2f5740e7e5e7396be5bea888bc6c402cf92b4e25c96fa120c344;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/settings/users/users.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.settings-nav {\n  display: flex;\n  gap: 0;\n  margin-bottom: 1.5rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.settings-nav-link {\n  padding: 0.625rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  border-bottom: 2px solid transparent;\n  cursor: pointer;\n  transition: color 0.15s, border-color 0.15s;\n}\n.settings-nav-link:hover {\n  color: var(--color-text-primary);\n}\n.settings-nav-link.active {\n  color: var(--color-text-primary);\n  border-bottom-color: var(--color-accent);\n  font-weight: 500;\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  background: var(--color-accent-hover);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-secondary:hover {\n  background: var(--color-border);\n}\n.btn-small {\n  padding: 0.25rem 0.75rem;\n  font-size: 0.8125rem;\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.table-container {\n  overflow-x: auto;\n}\ntable {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--color-bg-secondary);\n  border-radius: 0.5rem;\n  overflow: hidden;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\nthead {\n  background: var(--color-bg-tertiary);\n  border-bottom: 2px solid var(--color-border);\n}\nth {\n  text-align: left;\n  padding: 0.75rem 1rem;\n  font-size: 0.75rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-secondary);\n}\ntd {\n  padding: 0.75rem 1rem;\n  font-size: 0.875rem;\n  border-top: 1px solid var(--color-border);\n}\ntr:hover td {\n  background: var(--color-bg-tertiary);\n}\n.role-select {\n  padding: 0.25rem 0.5rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n}\n.role-select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.role-select:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.form-group {\n  margin-bottom: 1rem;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 0.375rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n}\n.form-group input,\n.form-group select {\n  width: 100%;\n  padding: 0.5rem 0.75rem;\n  background: var(--color-bg-primary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  box-sizing: border-box;\n}\n.form-group input:focus,\n.form-group select:focus {\n  outline: none;\n  border-color: var(--color-accent);\n}\n.form-actions {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.modal {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  min-width: 24rem;\n  max-width: 32rem;\n  box-shadow: 0 8px 24px var(--color-shadow);\n}\n.modal h2 {\n  margin: 0 0 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n}\n.modal p {\n  margin: 0 0 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  line-height: 1.5;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n  margin-top: 0.5rem;\n}\n.loading-text,\n.empty-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=users.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Users, { className: "Users", filePath: "src/app/settings/users/users.ts", lineNumber: 377 });
})();
export {
  Users
};
//# sourceMappingURL=chunk-LYALIVIZ.js.map
