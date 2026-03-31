import {
  HttpClient,
  HttpHeaders,
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/playlists/playlist.service.ts
var PlaylistService = class _PlaylistService {
  http = inject(HttpClient);
  getAll(orgId) {
    return this.http.get("/api/playlists", {
      headers: this.orgHeader(orgId)
    });
  }
  getOne(orgId, id) {
    return this.http.get(`/api/playlists/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  create(orgId, dto) {
    return this.http.post("/api/playlists", dto, {
      headers: this.orgHeader(orgId)
    });
  }
  update(orgId, id, dto) {
    return this.http.patch(`/api/playlists/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  delete(orgId, id) {
    return this.http.delete(`/api/playlists/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  addItem(orgId, playlistId, dto) {
    return this.http.post(`/api/playlists/${playlistId}/items`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  updateItem(orgId, playlistId, itemId, dto) {
    return this.http.patch(`/api/playlists/${playlistId}/items/${itemId}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  removeItem(orgId, playlistId, itemId) {
    return this.http.delete(`/api/playlists/${playlistId}/items/${itemId}`, {
      headers: this.orgHeader(orgId)
    });
  }
  reorderItems(orgId, playlistId, dto) {
    return this.http.put(`/api/playlists/${playlistId}/items/reorder`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  getDuration(orgId, playlistId) {
    return this.http.get(`/api/playlists/${playlistId}/duration`, {
      headers: this.orgHeader(orgId)
    });
  }
  setAsDefault(orgId, playlistId) {
    return this.http.patch(`/api/organisations/${orgId}/default-playlist`, { playlistId }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkDelete(orgId, ids) {
    return this.http.post("/api/playlists/bulk-delete", { ids }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkAssignScreen(orgId, ids, screenId) {
    return this.http.post("/api/playlists/bulk-assign-screen", { ids, screenId }, {
      headers: this.orgHeader(orgId)
    });
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function PlaylistService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PlaylistService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _PlaylistService, factory: _PlaylistService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PlaylistService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  PlaylistService
};
//# sourceMappingURL=chunk-UDVTV4ED.js.map
