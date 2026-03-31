import {
  HttpClient,
  Injectable,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/shell/organisation-state.service.ts
var STORAGE_KEY = "signage_selected_org_id";
var OrganisationStateService = class _OrganisationStateService {
  http = inject(HttpClient);
  organisations = signal([], ...ngDevMode ? [{ debugName: "organisations" }] : (
    /* istanbul ignore next */
    []
  ));
  selectedOrgId = signal(localStorage.getItem(STORAGE_KEY), ...ngDevMode ? [{ debugName: "selectedOrgId" }] : (
    /* istanbul ignore next */
    []
  ));
  selectedOrg = computed(() => {
    const id = this.selectedOrgId();
    return this.organisations().find((o) => o.id === id) ?? null;
  }, ...ngDevMode ? [{ debugName: "selectedOrg" }] : (
    /* istanbul ignore next */
    []
  ));
  loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : (
    /* istanbul ignore next */
    []
  ));
  isSuperAdmin = signal(false, ...ngDevMode ? [{ debugName: "isSuperAdmin" }] : (
    /* istanbul ignore next */
    []
  ));
  loadOrganisations() {
    this.loading.set(true);
    this.http.get("/api/me/profile").subscribe({
      next: (profile) => this.isSuperAdmin.set(profile.isSuperAdmin),
      error: () => this.isSuperAdmin.set(false)
    });
    this.http.get("/api/me/memberships").subscribe({
      next: (memberships) => {
        const orgs = memberships.map((m) => ({
          id: m.organisation.id,
          name: m.organisation.name,
          timeZone: m.organisation.timeZone,
          role: m.role
        }));
        this.organisations.set(orgs);
        const storedId = this.selectedOrgId();
        const valid = orgs.find((o) => o.id === storedId);
        if (!valid && orgs.length > 0) {
          this.select(orgs[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
  select(orgId) {
    this.selectedOrgId.set(orgId);
    localStorage.setItem(STORAGE_KEY, orgId);
  }
  static \u0275fac = function OrganisationStateService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _OrganisationStateService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _OrganisationStateService, factory: _OrganisationStateService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OrganisationStateService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  OrganisationStateService
};
//# sourceMappingURL=chunk-PHEIM2OP.js.map
