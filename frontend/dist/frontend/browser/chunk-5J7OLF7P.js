import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/schedules/schedule.service.ts
var ScheduleService = class _ScheduleService {
  http = inject(HttpClient);
  getByScreen(orgId, screenId, from, to) {
    const params = new HttpParams().set("screenId", screenId).set("from", from).set("to", to);
    return this.http.get("/api/schedules", {
      headers: this.orgHeader(orgId),
      params
    });
  }
  getByDateRange(orgId, from, to) {
    const params = new HttpParams().set("from", from).set("to", to);
    return this.http.get("/api/schedules", {
      headers: this.orgHeader(orgId),
      params
    });
  }
  create(orgId, dto) {
    return this.http.post("/api/schedules", dto, {
      headers: this.orgHeader(orgId)
    });
  }
  update(orgId, id, dto) {
    return this.http.patch(`/api/schedules/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  delete(orgId, id) {
    return this.http.delete(`/api/schedules/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function ScheduleService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ScheduleService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ScheduleService, factory: _ScheduleService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScheduleService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ScheduleService
};
//# sourceMappingURL=chunk-5J7OLF7P.js.map
