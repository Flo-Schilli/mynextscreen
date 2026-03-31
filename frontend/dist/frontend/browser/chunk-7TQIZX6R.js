import {
  HttpClient,
  HttpHeaders,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/screen-groups/screen-group.service.ts
var ScreenGroupService = class _ScreenGroupService {
  http = inject(HttpClient);
  getAll(orgId) {
    return this.http.get("/api/screen-groups", {
      headers: this.orgHeader(orgId)
    });
  }
  getOne(orgId, id) {
    return this.http.get(`/api/screen-groups/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  create(orgId, dto) {
    return this.http.post("/api/screen-groups", dto, {
      headers: this.orgHeader(orgId)
    });
  }
  update(orgId, id, dto) {
    return this.http.patch(`/api/screen-groups/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  delete(orgId, id) {
    return this.http.delete(`/api/screen-groups/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  assignScreen(orgId, groupId, screenId, dto) {
    return this.http.put(`/api/screen-groups/${groupId}/screens/${screenId}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  removeScreen(orgId, groupId, screenId) {
    return this.http.delete(`/api/screen-groups/${groupId}/screens/${screenId}`, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function ScreenGroupService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScreenGroupService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ScreenGroupService, factory: _ScreenGroupService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScreenGroupService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ScreenGroupService
};
//# sourceMappingURL=chunk-7TQIZX6R.js.map
