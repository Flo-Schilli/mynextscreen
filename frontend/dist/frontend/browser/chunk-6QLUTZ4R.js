import {
  HttpClient,
  HttpHeaders,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/settings/users/member.service.ts
var MemberService = class _MemberService {
  http = inject(HttpClient);
  getMyMemberships() {
    return this.http.get("/api/me/memberships");
  }
  listMembers(orgId) {
    return this.http.get(`/api/organisations/${orgId}/members`, {
      headers: this.orgHeader(orgId)
    });
  }
  addMember(orgId, dto) {
    return this.http.post(`/api/organisations/${orgId}/members`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  updateRole(orgId, userId, dto) {
    return this.http.patch(`/api/organisations/${orgId}/members/${userId}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  removeMember(orgId, userId) {
    return this.http.delete(`/api/organisations/${orgId}/members/${userId}`, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function MemberService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MemberService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MemberService, factory: _MemberService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MemberService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  MemberService
};
//# sourceMappingURL=chunk-6QLUTZ4R.js.map
