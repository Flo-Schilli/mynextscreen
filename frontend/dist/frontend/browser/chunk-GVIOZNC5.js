import {
  AuthService
} from "./chunk-3W6OO4XR.js";
import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  HttpClient,
  HttpEventType,
  HttpHeaders,
  Injectable,
  filter,
  inject,
  map,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-F2IK7UH5.js";

// src/app/content/content.service.ts
var ContentService = class _ContentService {
  http = inject(HttpClient);
  authService = inject(AuthService);
  orgState = inject(OrganisationStateService);
  getAll(orgId, filters) {
    let url = "/api/content";
    const params = [];
    if (filters?.type)
      params.push(`type=${filters.type}`);
    if (filters?.tags)
      params.push(`tags=${filters.tags}`);
    if (params.length)
      url += "?" + params.join("&");
    return this.http.get(url, {
      headers: this.orgHeader(orgId)
    });
  }
  getOne(orgId, id) {
    return this.http.get(`/api/content/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  upload(orgId, file, title, description, tags) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (description)
      formData.append("description", description);
    if (tags.length)
      formData.append("tags", JSON.stringify(tags));
    return this.http.post("/api/content/upload", formData, {
      headers: this.orgHeader(orgId),
      reportProgress: true,
      observe: "events"
    }).pipe(filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response), map((event) => {
      if (event.type === HttpEventType.UploadProgress) {
        return {
          type: "progress",
          progress: event.total ? Math.round(event.loaded / event.total * 100) : 0
        };
      }
      return {
        type: "complete",
        content: event.body
      };
    }));
  }
  updateMetadata(orgId, id, dto) {
    return this.http.patch(`/api/content/${id}`, dto, {
      headers: this.orgHeader(orgId)
    });
  }
  delete(orgId, id) {
    return this.http.delete(`/api/content/${id}`, {
      headers: this.orgHeader(orgId)
    });
  }
  reUpload(orgId, id, file) {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post(`/api/content/${id}/reupload`, formData, {
      headers: this.orgHeader(orgId),
      reportProgress: true,
      observe: "events"
    }).pipe(filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response), map((event) => {
      if (event.type === HttpEventType.UploadProgress) {
        return {
          type: "progress",
          progress: event.total ? Math.round(event.loaded / event.total * 100) : 0
        };
      }
      return {
        type: "complete",
        content: event.body
      };
    }));
  }
  getStorage(orgId) {
    return this.http.get(`/api/organisations/${orgId}/storage`, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkDelete(orgId, ids) {
    return this.http.post("/api/content/bulk-delete", { ids }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkTag(orgId, ids, tags) {
    return this.http.post("/api/content/bulk-tag", { ids, tags }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkUntag(orgId, ids, tags) {
    return this.http.post("/api/content/bulk-untag", { ids, tags }, {
      headers: this.orgHeader(orgId)
    });
  }
  bulkAddToPlaylist(orgId, ids, playlistId) {
    return this.http.post("/api/content/bulk-add-to-playlist", { ids, playlistId }, {
      headers: this.orgHeader(orgId)
    });
  }
  getOriginalUrl(id) {
    return this.buildMediaUrl(`/api/content/${id}/file/original`);
  }
  getTranscodedUrl(id) {
    return this.buildMediaUrl(`/api/content/${id}/file/transcoded`);
  }
  buildMediaUrl(base) {
    const params = new URLSearchParams();
    const token = this.authService.getToken();
    if (token) {
      params.set("token", token);
    }
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      params.set("organisationId", orgId);
    }
    return `${base}?${params.toString()}`;
  }
  orgHeader(orgId) {
    return new HttpHeaders({ "X-Organisation-Id": orgId });
  }
  static \u0275fac = function ContentService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ContentService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ContentService, factory: _ContentService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ContentService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  ContentService
};
//# sourceMappingURL=chunk-GVIOZNC5.js.map
