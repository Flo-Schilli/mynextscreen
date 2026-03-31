import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NumberValueAccessor
} from "./chunk-GQPSZY6K.js";
import {
  Component,
  HttpClient,
  Injectable,
  Router,
  RouterLink,
  inject,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-F2IK7UH5.js";

// src/app/settings/org/org-notification-config.service.ts
var OrgNotificationConfigService = class _OrgNotificationConfigService {
  http = inject(HttpClient);
  getConfig(orgId) {
    return this.http.get(`/api/organisations/${orgId}/notification-config`);
  }
  updateConfig(orgId, config) {
    return this.http.patch(`/api/organisations/${orgId}/notification-config`, config);
  }
  testEmail(orgId) {
    return this.http.post(`/api/organisations/${orgId}/notification-config/test-email`, {});
  }
  testNtfy(orgId) {
    return this.http.post(`/api/organisations/${orgId}/notification-config/test-ntfy`, {});
  }
  static \u0275fac = function OrgNotificationConfigService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _OrgNotificationConfigService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _OrgNotificationConfigService, factory: _OrgNotificationConfigService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OrgNotificationConfigService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/settings/org/org-notification-config.ts
function OrgNotificationConfig_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 7);
    \u0275\u0275text(1, "Loading configuration...");
    \u0275\u0275elementEnd();
  }
}
function OrgNotificationConfig_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 8);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.loadError);
  }
}
function OrgNotificationConfig_Conditional_14_Conditional_60_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("toast-error", ctx_r0.toastType === "error")("toast-success", ctx_r0.toastType === "success");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.toastMessage, " ");
  }
}
function OrgNotificationConfig_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 9)(1, "h2", 10);
    \u0275\u0275text(2, "SMTP Email Settings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 11);
    \u0275\u0275text(4, "Configure SMTP to enable email notifications for your organisation.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 12)(6, "div", 13)(7, "label", 14);
    \u0275\u0275text(8, "Host");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "input", 15);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpHost, $event) || (ctx_r0.smtpHost = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 13)(11, "label", 16);
    \u0275\u0275text(12, "Port");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpPort, $event) || (ctx_r0.smtpPort = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 13)(15, "label", 18);
    \u0275\u0275text(16, "Username");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpUser, $event) || (ctx_r0.smtpUser = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 13)(19, "label", 20);
    \u0275\u0275text(20, "Password");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 21);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpPassword, $event) || (ctx_r0.smtpPassword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 13)(23, "label", 22);
    \u0275\u0275text(24, "From address");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "input", 23);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpFrom, $event) || (ctx_r0.smtpFrom = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 24)(27, "label", 25)(28, "input", 26);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_28_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.smtpSecure, $event) || (ctx_r0.smtpSecure = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275text(29, " Secure (TLS) ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "span", 27);
    \u0275\u0275text(31, "Uncheck for STARTTLS");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(32, "div", 28)(33, "button", 29);
    \u0275\u0275listener("click", function OrgNotificationConfig_Conditional_14_Template_button_click_33_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.saveSmtp());
    });
    \u0275\u0275text(34);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 30);
    \u0275\u0275listener("click", function OrgNotificationConfig_Conditional_14_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.testEmail());
    });
    \u0275\u0275text(36);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(37, "section", 9)(38, "h2", 10);
    \u0275\u0275text(39, "ntfy Push Notifications");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "p", 11);
    \u0275\u0275text(41, "Configure ntfy to enable push notifications for your organisation.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "div", 12)(43, "div", 13)(44, "label", 31);
    \u0275\u0275text(45, "ntfy URL");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(46, "input", 32);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_46_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.ntfyUrl, $event) || (ctx_r0.ntfyUrl = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(47, "div", 13)(48, "label", 33);
    \u0275\u0275text(49, "Topic");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "input", 34);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_50_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.ntfyTopic, $event) || (ctx_r0.ntfyTopic = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(51, "div", 13)(52, "label", 35);
    \u0275\u0275text(53, "Auth token (optional)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(54, "input", 36);
    \u0275\u0275twoWayListener("ngModelChange", function OrgNotificationConfig_Conditional_14_Template_input_ngModelChange_54_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.ntfyToken, $event) || (ctx_r0.ntfyToken = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(55, "div", 28)(56, "button", 29);
    \u0275\u0275listener("click", function OrgNotificationConfig_Conditional_14_Template_button_click_56_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.saveNtfy());
    });
    \u0275\u0275text(57);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "button", 30);
    \u0275\u0275listener("click", function OrgNotificationConfig_Conditional_14_Template_button_click_58_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.testNtfy());
    });
    \u0275\u0275text(59);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(60, OrgNotificationConfig_Conditional_14_Conditional_60_Template, 2, 5, "div", 37);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpHost);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpPort);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpUser);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpPassword);
    \u0275\u0275property("placeholder", ctx_r0.hasSmtpPassword ? "Saved \u2014 leave blank to keep current" : "Enter password");
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpFrom);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.smtpSecure);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r0.savingSmtp);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.savingSmtp ? "Saving..." : "Save SMTP Settings", " ");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.testingEmail);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.testingEmail ? "Sending..." : "Send test email", " ");
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.ntfyUrl);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.ntfyTopic);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.ntfyToken);
    \u0275\u0275property("placeholder", ctx_r0.hasNtfyToken ? "Saved \u2014 leave blank to keep current" : "Enter token (optional)");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r0.savingNtfy);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.savingNtfy ? "Saving..." : "Save ntfy Settings", " ");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.testingNtfy);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.testingNtfy ? "Sending..." : "Send test notification", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.toastMessage ? 60 : -1);
  }
}
var OrgNotificationConfig = class _OrgNotificationConfig {
  configService = inject(OrgNotificationConfigService);
  orgState = inject(OrganisationStateService);
  router = inject(Router);
  loading = true;
  loadError = "";
  smtpHost = "";
  smtpPort = null;
  smtpUser = "";
  smtpPassword = "";
  smtpFrom = "";
  smtpSecure = false;
  hasSmtpPassword = false;
  ntfyUrl = "";
  ntfyTopic = "";
  ntfyToken = "";
  hasNtfyToken = false;
  savingSmtp = false;
  savingNtfy = false;
  testingEmail = false;
  testingNtfy = false;
  toastMessage = "";
  toastType = "success";
  toastTimer = null;
  ngOnInit() {
    this.loadConfig();
  }
  get orgId() {
    return this.orgState.selectedOrgId();
  }
  loadConfig() {
    const orgId = this.orgId;
    if (!orgId) {
      this.loadError = "No organisation selected.";
      this.loading = false;
      return;
    }
    this.configService.getConfig(orgId).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.loading = false;
      },
      error: () => {
        this.loadError = "Failed to load notification configuration.";
        this.loading = false;
      }
    });
  }
  applyConfig(config) {
    this.smtpHost = config.smtpHost ?? "";
    this.smtpPort = config.smtpPort;
    this.smtpUser = config.smtpUser ?? "";
    this.smtpFrom = config.smtpFrom ?? "";
    this.smtpSecure = config.smtpSecure;
    this.hasSmtpPassword = config.smtpPassword === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    this.smtpPassword = "";
    this.ntfyUrl = config.ntfyUrl ?? "";
    this.ntfyTopic = config.ntfyTopic ?? "";
    this.hasNtfyToken = config.ntfyToken === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    this.ntfyToken = "";
  }
  saveSmtp() {
    const orgId = this.orgId;
    if (!orgId)
      return;
    this.savingSmtp = true;
    const payload = {
      smtpHost: this.smtpHost || null,
      smtpPort: this.smtpPort,
      smtpUser: this.smtpUser || null,
      smtpFrom: this.smtpFrom || null,
      smtpSecure: this.smtpSecure
    };
    if (this.smtpPassword) {
      payload["smtpPassword"] = this.smtpPassword;
    }
    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingSmtp = false;
        this.showToast("SMTP settings saved.", "success");
      },
      error: () => {
        this.savingSmtp = false;
        this.showToast("Failed to save SMTP settings.", "error");
      }
    });
  }
  saveNtfy() {
    const orgId = this.orgId;
    if (!orgId)
      return;
    this.savingNtfy = true;
    const payload = {
      ntfyUrl: this.ntfyUrl || null,
      ntfyTopic: this.ntfyTopic || null
    };
    if (this.ntfyToken) {
      payload["ntfyToken"] = this.ntfyToken;
    }
    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingNtfy = false;
        this.showToast("ntfy settings saved.", "success");
      },
      error: () => {
        this.savingNtfy = false;
        this.showToast("Failed to save ntfy settings.", "error");
      }
    });
  }
  testEmail() {
    const orgId = this.orgId;
    if (!orgId)
      return;
    this.testingEmail = true;
    this.configService.testEmail(orgId).subscribe({
      next: (res) => {
        this.testingEmail = false;
        this.showToast(res.message, "success");
      },
      error: (err) => {
        this.testingEmail = false;
        const msg = err?.error?.message || "Failed to send test email.";
        this.showToast(msg, "error");
      }
    });
  }
  testNtfy() {
    const orgId = this.orgId;
    if (!orgId)
      return;
    this.testingNtfy = true;
    this.configService.testNtfy(orgId).subscribe({
      next: (res) => {
        this.testingNtfy = false;
        this.showToast(res.message, "success");
      },
      error: (err) => {
        this.testingNtfy = false;
        const msg = err?.error?.message || "Failed to send test notification.";
        this.showToast(msg, "error");
      }
    });
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
  goBack() {
    this.router.navigate(["/settings/users"]);
  }
  static \u0275fac = function OrgNotificationConfig_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _OrgNotificationConfig)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _OrgNotificationConfig, selectors: [["app-org-notification-config"]], decls: 15, vars: 3, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "settings-nav"], ["routerLink", "/settings/users", 1, "settings-nav-link"], [1, "settings-nav-link", "active"], [1, "loading-text"], [1, "error"], [1, "section"], [1, "section-title"], [1, "section-desc"], [1, "form-grid"], [1, "form-group"], ["for", "smtpHost"], ["id", "smtpHost", "type", "text", "placeholder", "smtp.example.com", 3, "ngModelChange", "ngModel"], ["for", "smtpPort"], ["id", "smtpPort", "type", "number", "placeholder", "587", 3, "ngModelChange", "ngModel"], ["for", "smtpUser"], ["id", "smtpUser", "type", "text", "placeholder", "user@example.com", 3, "ngModelChange", "ngModel"], ["for", "smtpPassword"], ["id", "smtpPassword", "type", "password", 3, "ngModelChange", "ngModel", "placeholder"], ["for", "smtpFrom"], ["id", "smtpFrom", "type", "text", "placeholder", "noreply@example.com", 3, "ngModelChange", "ngModel"], [1, "form-group", "form-group-checkbox"], ["for", "smtpSecure"], ["id", "smtpSecure", "type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "form-hint"], [1, "btn-row"], [1, "btn", "btn-primary", 3, "click", "disabled"], [1, "btn", "btn-secondary", 3, "click", "disabled"], ["for", "ntfyUrl"], ["id", "ntfyUrl", "type", "text", "placeholder", "https://ntfy.sh", 3, "ngModelChange", "ngModel"], ["for", "ntfyTopic"], ["id", "ntfyTopic", "type", "text", "placeholder", "my-org-notifications", 3, "ngModelChange", "ngModel"], ["for", "ntfyToken"], ["id", "ntfyToken", "type", "password", 3, "ngModelChange", "ngModel", "placeholder"], [1, "toast", 3, "toast-error", "toast-success"], [1, "toast"]], template: function OrgNotificationConfig_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275listener("click", function OrgNotificationConfig_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "h1");
      \u0275\u0275text(6, "Organisation Notification Settings");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(7, "nav", 4)(8, "a", 5);
      \u0275\u0275text(9, "User Management");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "a", 6);
      \u0275\u0275text(11, "Notification Config");
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(12, OrgNotificationConfig_Conditional_12_Template, 2, 0, "p", 7);
      \u0275\u0275conditionalCreate(13, OrgNotificationConfig_Conditional_13_Template, 2, 1, "p", 8);
      \u0275\u0275conditionalCreate(14, OrgNotificationConfig_Conditional_14_Template, 61, 20);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(12);
      \u0275\u0275conditional(ctx.loading ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.loadError ? 14 : -1);
    }
  }, dependencies: [FormsModule, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgModel, RouterLink], styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.settings-nav[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0;\n  margin-bottom: 1.5rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.settings-nav-link[_ngcontent-%COMP%] {\n  padding: 0.625rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  border-bottom: 2px solid transparent;\n  cursor: pointer;\n  transition: color 0.15s, border-color 0.15s;\n}\n.settings-nav-link[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n}\n.settings-nav-link.active[_ngcontent-%COMP%] {\n  color: var(--color-text-primary);\n  border-bottom-color: var(--color-accent);\n  font-weight: 500;\n}\n.section[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  margin-bottom: 1.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.section-title[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0 0 0.25rem;\n}\n.section-desc[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 1.25rem;\n}\n.form-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n@media (max-width: 600px) {\n  .form-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.form-group[_ngcontent-%COMP%]   input[type=text][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   input[type=number][_ngcontent-%COMP%], \n.form-group[_ngcontent-%COMP%]   input[type=password][_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  outline: none;\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-accent);\n}\n.form-group-checkbox[_ngcontent-%COMP%] {\n  justify-content: center;\n}\n.form-group-checkbox[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n}\n.form-group-checkbox[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 1rem;\n  height: 1rem;\n  accent-color: var(--color-accent);\n}\n.form-hint[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.btn-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  border: none;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-primary[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  filter: brightness(1.1);\n}\n.btn-secondary[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n  border: 1px solid var(--color-border);\n}\n.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-bg-primary);\n}\n.toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 1.5rem;\n  right: 1.5rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  z-index: 1000;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #065f46;\n  color: #d1fae5;\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=org-notification-config.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OrgNotificationConfig, [{
    type: Component,
    args: [{ selector: "app-org-notification-config", standalone: true, imports: [FormsModule, RouterLink], template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Organisation Notification Settings</h1>
        </div>
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link" routerLink="/settings/users">User Management</a>
        <a class="settings-nav-link active">Notification Config</a>
      </nav>

      @if (loading) {
        <p class="loading-text">Loading configuration...</p>
      }

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (!loading && !loadError) {
        <section class="section">
          <h2 class="section-title">SMTP Email Settings</h2>
          <p class="section-desc">Configure SMTP to enable email notifications for your organisation.</p>

          <div class="form-grid">
            <div class="form-group">
              <label for="smtpHost">Host</label>
              <input id="smtpHost" type="text" [(ngModel)]="smtpHost" placeholder="smtp.example.com" />
            </div>
            <div class="form-group">
              <label for="smtpPort">Port</label>
              <input id="smtpPort" type="number" [(ngModel)]="smtpPort" placeholder="587" />
            </div>
            <div class="form-group">
              <label for="smtpUser">Username</label>
              <input id="smtpUser" type="text" [(ngModel)]="smtpUser" placeholder="user@example.com" />
            </div>
            <div class="form-group">
              <label for="smtpPassword">Password</label>
              <input
                id="smtpPassword"
                type="password"
                [(ngModel)]="smtpPassword"
                [placeholder]="hasSmtpPassword ? 'Saved \u2014 leave blank to keep current' : 'Enter password'"
              />
            </div>
            <div class="form-group">
              <label for="smtpFrom">From address</label>
              <input id="smtpFrom" type="text" [(ngModel)]="smtpFrom" placeholder="noreply@example.com" />
            </div>
            <div class="form-group form-group-checkbox">
              <label for="smtpSecure">
                <input id="smtpSecure" type="checkbox" [(ngModel)]="smtpSecure" />
                Secure (TLS)
              </label>
              <span class="form-hint">Uncheck for STARTTLS</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" (click)="saveSmtp()" [disabled]="savingSmtp">
              {{ savingSmtp ? 'Saving...' : 'Save SMTP Settings' }}
            </button>
            <button class="btn btn-secondary" (click)="testEmail()" [disabled]="testingEmail">
              {{ testingEmail ? 'Sending...' : 'Send test email' }}
            </button>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">ntfy Push Notifications</h2>
          <p class="section-desc">Configure ntfy to enable push notifications for your organisation.</p>

          <div class="form-grid">
            <div class="form-group">
              <label for="ntfyUrl">ntfy URL</label>
              <input id="ntfyUrl" type="text" [(ngModel)]="ntfyUrl" placeholder="https://ntfy.sh" />
            </div>
            <div class="form-group">
              <label for="ntfyTopic">Topic</label>
              <input id="ntfyTopic" type="text" [(ngModel)]="ntfyTopic" placeholder="my-org-notifications" />
            </div>
            <div class="form-group">
              <label for="ntfyToken">Auth token (optional)</label>
              <input
                id="ntfyToken"
                type="password"
                [(ngModel)]="ntfyToken"
                [placeholder]="hasNtfyToken ? 'Saved \u2014 leave blank to keep current' : 'Enter token (optional)'"
              />
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" (click)="saveNtfy()" [disabled]="savingNtfy">
              {{ savingNtfy ? 'Saving...' : 'Save ntfy Settings' }}
            </button>
            <button class="btn btn-secondary" (click)="testNtfy()" [disabled]="testingNtfy">
              {{ testingNtfy ? 'Sending...' : 'Send test notification' }}
            </button>
          </div>
        </section>

        @if (toastMessage) {
          <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'">
            {{ toastMessage }}
          </div>
        }
      }
    </div>
  `, styles: ["/* angular:styles/component:css;f7604c8d3c5f79cfc1884e28fd7d6d6d93f6ed6a43662028ab3f4c3e9fee9faf;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/settings/org/org-notification-config.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.settings-nav {\n  display: flex;\n  gap: 0;\n  margin-bottom: 1.5rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.settings-nav-link {\n  padding: 0.625rem 1rem;\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  border-bottom: 2px solid transparent;\n  cursor: pointer;\n  transition: color 0.15s, border-color 0.15s;\n}\n.settings-nav-link:hover {\n  color: var(--color-text-primary);\n}\n.settings-nav-link.active {\n  color: var(--color-text-primary);\n  border-bottom-color: var(--color-accent);\n  font-weight: 500;\n}\n.section {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  margin-bottom: 1.5rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.section-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0 0 0.25rem;\n}\n.section-desc {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 1.25rem;\n}\n.form-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}\n@media (max-width: 600px) {\n  .form-grid {\n    grid-template-columns: 1fr;\n  }\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.form-group label {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n}\n.form-group input[type=text],\n.form-group input[type=number],\n.form-group input[type=password] {\n  padding: 0.5rem 0.75rem;\n  border: 1px solid var(--color-border);\n  border-radius: 0.375rem;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  outline: none;\n}\n.form-group input:focus {\n  border-color: var(--color-accent);\n}\n.form-group-checkbox {\n  justify-content: center;\n}\n.form-group-checkbox label {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: var(--color-text-primary);\n}\n.form-group-checkbox input[type=checkbox] {\n  width: 1rem;\n  height: 1rem;\n  accent-color: var(--color-accent);\n}\n.form-hint {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n}\n.btn-row {\n  display: flex;\n  gap: 0.75rem;\n  margin-top: 1.25rem;\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n  cursor: pointer;\n  border: none;\n}\n.btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-primary {\n  background: var(--color-accent);\n  color: #fff;\n}\n.btn-primary:hover:not(:disabled) {\n  filter: brightness(1.1);\n}\n.btn-secondary {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n  border: 1px solid var(--color-border);\n}\n.btn-secondary:hover:not(:disabled) {\n  background: var(--color-bg-primary);\n}\n.toast {\n  position: fixed;\n  bottom: 1.5rem;\n  right: 1.5rem;\n  padding: 0.75rem 1.25rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n  z-index: 1000;\n}\n.toast-success {\n  background: #065f46;\n  color: #d1fae5;\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=org-notification-config.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(OrgNotificationConfig, { className: "OrgNotificationConfig", filePath: "src/app/settings/org/org-notification-config.ts", lineNumber: 325 });
})();
export {
  OrgNotificationConfig
};
//# sourceMappingURL=chunk-72GLO6PV.js.map
