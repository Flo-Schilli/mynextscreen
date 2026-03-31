import {
  HttpClient,
  HttpHeaders,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/screens/screen.service.ts
var ScreenService = class _ScreenService {
  http = inject(HttpClient);
  getAll(orgId) {
    return this.http.get("/api/screens", {
      headers: this.orgHeader(orgId)
    });
  }
  getOne(orgId, id) {
    return this.http.get(`/api/screens/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  create(orgId, dto) {
    return this.http.post("/api/screens", dto, {
      headers: this.orgHeader(orgId)
    });
  }
  update(orgId, id, dto) {
    return this.http.patch(`/api/screens/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  regenerateApiKey(orgId, id) {
    return this.http.post(`/api/screens/${id}/regenerate-key`, {}, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkDelete(orgId, ids) {
    return this.http.post("/api/screens/bulk-delete", { ids }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkAssignGroup(orgId, ids, groupId) {
    return this.http.post("/api/screens/bulk-assign-group", { ids, groupId }, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function ScreenService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScreenService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ScreenService, factory: _ScreenService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScreenService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ScreenService
};
//# sourceMappingURL=chunk-DASS7FWB.js.map
