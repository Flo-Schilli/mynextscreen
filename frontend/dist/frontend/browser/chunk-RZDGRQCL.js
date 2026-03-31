import {
  HttpClient,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/admin/organisations/organisation.service.ts
var OrganisationService = class _OrganisationService {
  http = inject(HttpClient);
  baseUrl = "/api/organisations";
  getAll() {
    return this.http.get(this.baseUrl);
  }
  getOne(id) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
  create(dto) {
    return this.http.post(this.baseUrl, dto);
  }
  update(id, dto) {
    return this.http.patch(`${this.baseUrl}/${id}`, dto);
  }
  listMembers(orgId) {
    return this.http.get(`${this.baseUrl}/${orgId}/members`);
  }
  addMember(orgId, dto) {
    return this.http.post(`${this.baseUrl}/${orgId}/members`, dto);
  }
  updateMemberRole(orgId, userId, dto) {
    return this.http.patch(`${this.baseUrl}/${orgId}/members/${userId}`, dto);
  }
  removeMember(orgId, userId) {
    return this.http.delete(`${this.baseUrl}/${orgId}/members/${userId}`);
  }
  static \u0275fac = function OrganisationService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _OrganisationService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _OrganisationService, factory: _OrganisationService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OrganisationService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  OrganisationService
};
//# sourceMappingURL=chunk-RZDGRQCL.js.map
