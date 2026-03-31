import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  Component,
  HttpClient,
  Injectable,
  Router,
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
  ɵɵdefineInjectable,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-F2IK7UH5.js";

// src/app/settings/user/notification-preferences.service.ts
var NotificationPreferencesService = class _NotificationPreferencesService {
  http = inject(HttpClient);
  getPreferences() {
    return this.http.get("/api/me/notification-preferences");
  }
  updatePreferences(prefs) {
    return this.http.patch("/api/me/notification-preferences", prefs);
  }
  getOrgNotificationConfig(orgId) {
    return this.http.get(`/api/organisations/${orgId}/notification-config`);
  }
  static \u0275fac = function NotificationPreferencesService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NotificationPreferencesService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _NotificationPreferencesService, factory: _NotificationPreferencesService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NotificationPreferencesService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/settings/user/user-settings.ts
function UserSettings_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "p", 7);
    \u0275\u0275text(1, "Loading preferences...");
    \u0275\u0275domElementEnd();
  }
}
function UserSettings_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "p", 8);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.loadError);
  }
}
function UserSettings_Conditional_14_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 17);
    \u0275\u0275text(1, "Configure email in Organisation Settings");
    \u0275\u0275domElementEnd();
  }
}
function UserSettings_Conditional_14_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 17);
    \u0275\u0275text(1, "Configure ntfy in Organisation Settings");
    \u0275\u0275domElementEnd();
  }
}
function UserSettings_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 9)(1, "div", 11)(2, "div", 12)(3, "span", 13);
    \u0275\u0275text(4, "In-app");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 14);
    \u0275\u0275text(6, "Receive notifications in the dashboard");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "button", 15);
    \u0275\u0275domListener("click", function UserSettings_Conditional_14_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggle("inAppEnabled"));
    });
    \u0275\u0275domElement(8, "span", 16);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(9, "div", 11)(10, "div", 12)(11, "span", 13);
    \u0275\u0275text(12, "Email");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(13, "span", 14);
    \u0275\u0275text(14, "Receive notifications by email");
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(15, UserSettings_Conditional_14_Conditional_15_Template, 2, 0, "span", 17);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(16, "button", 18);
    \u0275\u0275domListener("click", function UserSettings_Conditional_14_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggle("emailEnabled"));
    });
    \u0275\u0275domElement(17, "span", 16);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(18, "div", 11)(19, "div", 12)(20, "span", 13);
    \u0275\u0275text(21, "ntfy");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(22, "span", 14);
    \u0275\u0275text(23, "Receive notifications via ntfy");
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(24, UserSettings_Conditional_14_Conditional_24_Template, 2, 0, "span", 17);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(25, "button", 19);
    \u0275\u0275domListener("click", function UserSettings_Conditional_14_Template_button_click_25_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggle("ntfyEnabled"));
    });
    \u0275\u0275domElement(26, "span", 16);
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275classProp("active", ctx_r0.preferences.inAppEnabled);
    \u0275\u0275attribute("aria-checked", ctx_r0.preferences.inAppEnabled);
    \u0275\u0275advance(8);
    \u0275\u0275conditional(!ctx_r0.orgSmtpConfigured ? 15 : -1);
    \u0275\u0275advance();
    \u0275\u0275classProp("active", ctx_r0.preferences.emailEnabled);
    \u0275\u0275attribute("aria-checked", ctx_r0.preferences.emailEnabled);
    \u0275\u0275advance(8);
    \u0275\u0275conditional(!ctx_r0.orgNtfyConfigured ? 24 : -1);
    \u0275\u0275advance();
    \u0275\u0275classProp("active", ctx_r0.preferences.ntfyEnabled);
    \u0275\u0275attribute("aria-checked", ctx_r0.preferences.ntfyEnabled);
  }
}
function UserSettings_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 20);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("toast-error", ctx_r0.toastType === "error")("toast-success", ctx_r0.toastType === "success");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.toastMessage, " ");
  }
}
var UserSettings = class _UserSettings {
  prefsService = inject(NotificationPreferencesService);
  orgState = inject(OrganisationStateService);
  router = inject(Router);
  preferences = null;
  loading = true;
  loadError = "";
  orgSmtpConfigured = false;
  orgNtfyConfigured = false;
  toastMessage = "";
  toastType = "success";
  toastTimer = null;
  debounceTimer = null;
  ngOnInit() {
    this.loadPreferences();
    this.loadOrgConfig();
  }
  ngOnDestroy() {
    if (this.toastTimer)
      clearTimeout(this.toastTimer);
    if (this.debounceTimer)
      clearTimeout(this.debounceTimer);
  }
  loadPreferences() {
    this.loading = true;
    this.loadError = "";
    this.prefsService.getPreferences().subscribe({
      next: (prefs) => {
        this.preferences = prefs;
        this.loading = false;
      },
      error: () => {
        this.loadError = "Failed to load notification preferences.";
        this.loading = false;
      }
    });
  }
  loadOrgConfig() {
    const orgId = this.orgState.selectedOrgId();
    if (!orgId)
      return;
    this.prefsService.getOrgNotificationConfig(orgId).subscribe({
      next: (config) => {
        this.orgSmtpConfigured = !!config.smtpHost;
        this.orgNtfyConfigured = !!config.ntfyUrl;
      },
      error: () => {
        this.orgSmtpConfigured = false;
        this.orgNtfyConfigured = false;
      }
    });
  }
  toggle(field) {
    if (!this.preferences)
      return;
    this.preferences = __spreadProps(__spreadValues({}, this.preferences), { [field]: !this.preferences[field] });
    this.debounceSave();
  }
  debounceSave() {
    if (this.debounceTimer)
      clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.savePreferences();
    }, 300);
  }
  savePreferences() {
    if (!this.preferences)
      return;
    const { inAppEnabled, emailEnabled, ntfyEnabled } = this.preferences;
    this.prefsService.updatePreferences({ inAppEnabled, emailEnabled, ntfyEnabled }).subscribe({
      next: (updated) => {
        this.preferences = updated;
        this.showToast("Preferences saved.", "success");
      },
      error: () => {
        this.showToast("Failed to save preferences.", "error");
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
    this.router.navigate(["/"]);
  }
  static \u0275fac = function UserSettings_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _UserSettings)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _UserSettings, selectors: [["app-user-settings"]], decls: 16, vars: 4, consts: [[1, "page"], [1, "page-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "section"], [1, "section-title"], [1, "section-desc"], [1, "loading-text"], [1, "error"], [1, "toggle-list"], [1, "toast", 3, "toast-error", "toast-success"], [1, "toggle-row"], [1, "toggle-info"], [1, "toggle-label"], [1, "toggle-desc"], ["role", "switch", "aria-label", "Toggle in-app notifications", 1, "toggle-switch", 3, "click"], [1, "toggle-knob"], [1, "toggle-note"], ["role", "switch", "aria-label", "Toggle email notifications", 1, "toggle-switch", 3, "click"], ["role", "switch", "aria-label", "Toggle ntfy notifications", 1, "toggle-switch", 3, "click"], [1, "toast"]], template: function UserSettings_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "button", 3);
      \u0275\u0275domListener("click", function UserSettings_Template_button_click_3_listener() {
        return ctx.goBack();
      });
      \u0275\u0275text(4, "\u2190 Back");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(5, "h1");
      \u0275\u0275text(6, "User Settings");
      \u0275\u0275domElementEnd()()();
      \u0275\u0275domElementStart(7, "section", 4)(8, "h2", 5);
      \u0275\u0275text(9, "Notification Channels");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(10, "p", 6);
      \u0275\u0275text(11, "Choose how you receive notifications for this organisation.");
      \u0275\u0275domElementEnd();
      \u0275\u0275conditionalCreate(12, UserSettings_Conditional_12_Template, 2, 0, "p", 7);
      \u0275\u0275conditionalCreate(13, UserSettings_Conditional_13_Template, 2, 1, "p", 8);
      \u0275\u0275conditionalCreate(14, UserSettings_Conditional_14_Template, 27, 11, "div", 9);
      \u0275\u0275conditionalCreate(15, UserSettings_Conditional_15_Template, 2, 5, "div", 10);
      \u0275\u0275domElementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(12);
      \u0275\u0275conditional(ctx.loading ? 12 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loadError ? 13 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(!ctx.loading && !ctx.loadError && ctx.preferences ? 14 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.toastMessage ? 15 : -1);
    }
  }, styles: ["\n.page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.section[_ngcontent-%COMP%] {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.section-title[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0 0 0.25rem;\n}\n.section-desc[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 1.25rem;\n}\n.toggle-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n.toggle-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem 0;\n  border-top: 1px solid var(--color-border);\n}\n.toggle-row[_ngcontent-%COMP%]:first-child {\n  border-top: none;\n  padding-top: 0;\n}\n.toggle-row[_ngcontent-%COMP%]:last-child {\n  padding-bottom: 0;\n}\n.toggle-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.toggle-label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n}\n.toggle-desc[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.toggle-note[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  font-style: italic;\n  margin-top: 0.125rem;\n}\n.toggle-switch[_ngcontent-%COMP%] {\n  position: relative;\n  width: 44px;\n  height: 24px;\n  border-radius: 12px;\n  border: none;\n  background: var(--color-bg-tertiary);\n  cursor: pointer;\n  transition: background 0.2s;\n  flex-shrink: 0;\n  padding: 0;\n}\n.toggle-switch.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n}\n.toggle-knob[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 20px;\n  height: 20px;\n  border-radius: 50%;\n  background: #fff;\n  transition: transform 0.2s;\n}\n.toggle-switch.active[_ngcontent-%COMP%]   .toggle-knob[_ngcontent-%COMP%] {\n  transform: translateX(20px);\n}\n.toast[_ngcontent-%COMP%] {\n  margin-top: 1rem;\n  padding: 0.625rem 1rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n}\n.toast-success[_ngcontent-%COMP%] {\n  background: #065f46;\n  color: #d1fae5;\n}\n.toast-error[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.error[_ngcontent-%COMP%] {\n  color: #ef4444;\n  font-size: 0.875rem;\n}\n.loading-text[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=user-settings.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UserSettings, [{
    type: Component,
    args: [{ selector: "app-user-settings", standalone: true, template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>User Settings</h1>
        </div>
      </header>

      <section class="section">
        <h2 class="section-title">Notification Channels</h2>
        <p class="section-desc">Choose how you receive notifications for this organisation.</p>

        @if (loading) {
          <p class="loading-text">Loading preferences...</p>
        }

        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (!loading && !loadError && preferences) {
          <div class="toggle-list">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">In-app</span>
                <span class="toggle-desc">Receive notifications in the dashboard</span>
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.inAppEnabled"
                (click)="toggle('inAppEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.inAppEnabled"
                aria-label="Toggle in-app notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Email</span>
                <span class="toggle-desc">Receive notifications by email</span>
                @if (!orgSmtpConfigured) {
                  <span class="toggle-note">Configure email in Organisation Settings</span>
                }
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.emailEnabled"
                (click)="toggle('emailEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.emailEnabled"
                aria-label="Toggle email notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">ntfy</span>
                <span class="toggle-desc">Receive notifications via ntfy</span>
                @if (!orgNtfyConfigured) {
                  <span class="toggle-note">Configure ntfy in Organisation Settings</span>
                }
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.ntfyEnabled"
                (click)="toggle('ntfyEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.ntfyEnabled"
                aria-label="Toggle ntfy notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>
        }

        @if (toastMessage) {
          <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'">
            {{ toastMessage }}
          </div>
        }
      </section>
    </div>
  `, styles: ["/* angular:styles/component:css;371ff50a0a95ab11b0594902fc7f9db7a8f5f948cf52aee17ac03c4abd37fc4b;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/settings/user/user-settings.ts */\n.page {\n  min-height: 100vh;\n  background: var(--color-bg-primary);\n  color: var(--color-text-primary);\n  padding: 2rem;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.header-left h1 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0;\n}\n.back-btn {\n  background: none;\n  border: none;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  font-size: 0.875rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n}\n.back-btn:hover {\n  color: var(--color-text-primary);\n  background: var(--color-bg-secondary);\n}\n.section {\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  max-width: 40rem;\n  box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);\n}\n.section-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0 0 0.25rem;\n}\n.section-desc {\n  font-size: 0.875rem;\n  color: var(--color-text-secondary);\n  margin: 0 0 1.25rem;\n}\n.toggle-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n}\n.toggle-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem 0;\n  border-top: 1px solid var(--color-border);\n}\n.toggle-row:first-child {\n  border-top: none;\n  padding-top: 0;\n}\n.toggle-row:last-child {\n  padding-bottom: 0;\n}\n.toggle-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.125rem;\n}\n.toggle-label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n}\n.toggle-desc {\n  font-size: 0.8125rem;\n  color: var(--color-text-secondary);\n}\n.toggle-note {\n  font-size: 0.75rem;\n  color: var(--color-text-muted);\n  font-style: italic;\n  margin-top: 0.125rem;\n}\n.toggle-switch {\n  position: relative;\n  width: 44px;\n  height: 24px;\n  border-radius: 12px;\n  border: none;\n  background: var(--color-bg-tertiary);\n  cursor: pointer;\n  transition: background 0.2s;\n  flex-shrink: 0;\n  padding: 0;\n}\n.toggle-switch.active {\n  background: var(--color-accent);\n}\n.toggle-knob {\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 20px;\n  height: 20px;\n  border-radius: 50%;\n  background: #fff;\n  transition: transform 0.2s;\n}\n.toggle-switch.active .toggle-knob {\n  transform: translateX(20px);\n}\n.toast {\n  margin-top: 1rem;\n  padding: 0.625rem 1rem;\n  border-radius: 0.375rem;\n  font-size: 0.8125rem;\n}\n.toast-success {\n  background: #065f46;\n  color: #d1fae5;\n}\n.toast-error {\n  background: #991b1b;\n  color: #fecaca;\n}\n.error {\n  color: #ef4444;\n  font-size: 0.875rem;\n}\n.loading-text {\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n/*# sourceMappingURL=user-settings.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(UserSettings, { className: "UserSettings", filePath: "src/app/settings/user/user-settings.ts", lineNumber: 252 });
})();
export {
  UserSettings
};
//# sourceMappingURL=chunk-VXAF6FLB.js.map
