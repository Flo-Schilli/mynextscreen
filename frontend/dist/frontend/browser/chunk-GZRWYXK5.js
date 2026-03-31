import {
  Component,
  Injectable,
  Input,
  computed,
  inject,
  input,
  setClassMetadata,
  signal,
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
  ɵɵdomProperty,
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate1
} from "./chunk-F2IK7UH5.js";

// src/app/shared/selection/selection.service.ts
var SelectionService = class _SelectionService {
  _selectedIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_selectedIds" }] : (
    /* istanbul ignore next */
    []
  ));
  _lastClickedId = signal(null, ...ngDevMode ? [{ debugName: "_lastClickedId" }] : (
    /* istanbul ignore next */
    []
  ));
  lastClickedId = this._lastClickedId.asReadonly();
  selectedIds = this._selectedIds.asReadonly();
  count = computed(() => this._selectedIds().size, ...ngDevMode ? [{ debugName: "count" }] : (
    /* istanbul ignore next */
    []
  ));
  hasSelection = computed(() => this._selectedIds().size > 0, ...ngDevMode ? [{ debugName: "hasSelection" }] : (
    /* istanbul ignore next */
    []
  ));
  toggle(id) {
    this._selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    this._lastClickedId.set(id);
  }
  selectRange(ids, fromId, toId) {
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1)
      return;
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    this._selectedIds.update((current) => {
      const next = new Set(current);
      for (let i = start; i <= end; i++) {
        next.add(ids[i]);
      }
      return next;
    });
  }
  selectAll(ids) {
    this._selectedIds.set(new Set(ids));
  }
  clearAll() {
    this._selectedIds.set(/* @__PURE__ */ new Set());
  }
  isSelected(id) {
    return computed(() => this._selectedIds().has(id));
  }
  static \u0275fac = function SelectionService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SelectionService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SelectionService, factory: _SelectionService.\u0275fac });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SelectionService, [{
    type: Injectable
  }], null, null);
})();

// src/app/shared/selection/selection-checkbox.ts
var SelectionCheckboxComponent = class _SelectionCheckboxComponent {
  itemId = input.required(...ngDevMode ? [{ debugName: "itemId" }] : (
    /* istanbul ignore next */
    []
  ));
  itemIndex = input.required(...ngDevMode ? [{ debugName: "itemIndex" }] : (
    /* istanbul ignore next */
    []
  ));
  orderedIds = input.required(...ngDevMode ? [{ debugName: "orderedIds" }] : (
    /* istanbul ignore next */
    []
  ));
  selectionService = inject(SelectionService);
  checked = computed(() => this.selectionService.selectedIds().has(this.itemId()), ...ngDevMode ? [{ debugName: "checked" }] : (
    /* istanbul ignore next */
    []
  ));
  onClick(event) {
    event.preventDefault();
    if (event.shiftKey) {
      const lastId = this.selectionService.lastClickedId();
      if (lastId !== null) {
        this.selectionService.selectRange(this.orderedIds(), lastId, this.itemId());
        return;
      }
    }
    this.selectionService.toggle(this.itemId());
  }
  static \u0275fac = function SelectionCheckboxComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SelectionCheckboxComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SelectionCheckboxComponent, selectors: [["app-selection-checkbox"]], inputs: { itemId: [1, "itemId"], itemIndex: [1, "itemIndex"], orderedIds: [1, "orderedIds"] }, decls: 1, vars: 2, consts: [["type", "checkbox", 1, "selection-checkbox", 3, "click", "checked"]], template: function SelectionCheckboxComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "input", 0);
      \u0275\u0275domListener("click", function SelectionCheckboxComponent_Template_input_click_0_listener($event) {
        return ctx.onClick($event);
      });
      \u0275\u0275domElementEnd();
    }
    if (rf & 2) {
      \u0275\u0275domProperty("checked", ctx.checked());
      \u0275\u0275attribute("aria-label", "Select item " + ctx.itemId());
    }
  }, styles: ["\n.selection-checkbox[_ngcontent-%COMP%] {\n  width: 1rem;\n  height: 1rem;\n  cursor: pointer;\n  accent-color: var(--color-accent);\n  border-radius: 0.25rem;\n}\n.selection-checkbox[_ngcontent-%COMP%]:focus-visible {\n  outline: 2px solid var(--color-accent);\n  outline-offset: 2px;\n}\n/*# sourceMappingURL=selection-checkbox.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SelectionCheckboxComponent, [{
    type: Component,
    args: [{ selector: "app-selection-checkbox", standalone: true, template: `
    <input
      type="checkbox"
      class="selection-checkbox"
      [checked]="checked()"
      [attr.aria-label]="'Select item ' + itemId()"
      (click)="onClick($event)"
    />
  `, styles: ["/* angular:styles/component:css;2f13f48fe37e51860f249d5b5bc8c282b676080fdd7c8f11bc00dbe0834a6600;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/shared/selection/selection-checkbox.ts */\n.selection-checkbox {\n  width: 1rem;\n  height: 1rem;\n  cursor: pointer;\n  accent-color: var(--color-accent);\n  border-radius: 0.25rem;\n}\n.selection-checkbox:focus-visible {\n  outline: 2px solid var(--color-accent);\n  outline-offset: 2px;\n}\n/*# sourceMappingURL=selection-checkbox.css.map */\n"] }]
  }], null, { itemId: [{ type: Input, args: [{ isSignal: true, alias: "itemId", required: true }] }], itemIndex: [{ type: Input, args: [{ isSignal: true, alias: "itemIndex", required: true }] }], orderedIds: [{ type: Input, args: [{ isSignal: true, alias: "orderedIds", required: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SelectionCheckboxComponent, { className: "SelectionCheckboxComponent", filePath: "src/app/shared/selection/selection-checkbox.ts", lineNumber: 31 });
})();

// src/app/shared/selection/select-all-checkbox.ts
var SelectAllCheckboxComponent = class _SelectAllCheckboxComponent {
  allIds = input.required(...ngDevMode ? [{ debugName: "allIds" }] : (
    /* istanbul ignore next */
    []
  ));
  selectionService = inject(SelectionService);
  allSelected = computed(() => {
    const ids = this.allIds();
    if (ids.length === 0)
      return false;
    const selected = this.selectionService.selectedIds();
    return ids.every((id) => selected.has(id));
  }, ...ngDevMode ? [{ debugName: "allSelected" }] : (
    /* istanbul ignore next */
    []
  ));
  indeterminate = computed(() => {
    const ids = this.allIds();
    if (ids.length === 0)
      return false;
    const selected = this.selectionService.selectedIds();
    const count = ids.filter((id) => selected.has(id)).length;
    return count > 0 && count < ids.length;
  }, ...ngDevMode ? [{ debugName: "indeterminate" }] : (
    /* istanbul ignore next */
    []
  ));
  onClick(event) {
    event.preventDefault();
    if (this.allSelected()) {
      this.selectionService.clearAll();
    } else {
      this.selectionService.selectAll(this.allIds());
    }
  }
  static \u0275fac = function SelectAllCheckboxComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SelectAllCheckboxComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SelectAllCheckboxComponent, selectors: [["app-select-all-checkbox"]], inputs: { allIds: [1, "allIds"] }, decls: 1, vars: 2, consts: [["type", "checkbox", "aria-label", "Select all items", 1, "selection-checkbox", 3, "click", "checked", "indeterminate"]], template: function SelectAllCheckboxComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "input", 0);
      \u0275\u0275domListener("click", function SelectAllCheckboxComponent_Template_input_click_0_listener($event) {
        return ctx.onClick($event);
      });
      \u0275\u0275domElementEnd();
    }
    if (rf & 2) {
      \u0275\u0275domProperty("checked", ctx.allSelected())("indeterminate", ctx.indeterminate());
    }
  }, styles: ["\n.selection-checkbox[_ngcontent-%COMP%] {\n  width: 1rem;\n  height: 1rem;\n  cursor: pointer;\n  accent-color: var(--color-accent);\n  border-radius: 0.25rem;\n}\n.selection-checkbox[_ngcontent-%COMP%]:focus-visible {\n  outline: 2px solid var(--color-accent);\n  outline-offset: 2px;\n}\n/*# sourceMappingURL=select-all-checkbox.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SelectAllCheckboxComponent, [{
    type: Component,
    args: [{ selector: "app-select-all-checkbox", standalone: true, template: `
    <input
      type="checkbox"
      class="selection-checkbox"
      [checked]="allSelected()"
      [indeterminate]="indeterminate()"
      aria-label="Select all items"
      (click)="onClick($event)"
    />
  `, styles: ["/* angular:styles/component:css;2f13f48fe37e51860f249d5b5bc8c282b676080fdd7c8f11bc00dbe0834a6600;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/shared/selection/select-all-checkbox.ts */\n.selection-checkbox {\n  width: 1rem;\n  height: 1rem;\n  cursor: pointer;\n  accent-color: var(--color-accent);\n  border-radius: 0.25rem;\n}\n.selection-checkbox:focus-visible {\n  outline: 2px solid var(--color-accent);\n  outline-offset: 2px;\n}\n/*# sourceMappingURL=select-all-checkbox.css.map */\n"] }]
  }], null, { allIds: [{ type: Input, args: [{ isSignal: true, alias: "allIds", required: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SelectAllCheckboxComponent, { className: "SelectAllCheckboxComponent", filePath: "src/app/shared/selection/select-all-checkbox.ts", lineNumber: 32 });
})();

// src/app/shared/selection/bulk-action-toolbar.ts
var _forTrack0 = ($index, $item) => $item.label;
function BulkActionToolbarComponent_Conditional_0_For_7_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElement(0, "span", 6);
  }
}
function BulkActionToolbarComponent_Conditional_0_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 5);
    \u0275\u0275domListener("click", function BulkActionToolbarComponent_Conditional_0_For_7_Template_button_click_0_listener() {
      const action_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.executeAction(action_r4));
    });
    \u0275\u0275conditionalCreate(1, BulkActionToolbarComponent_Conditional_0_For_7_Conditional_1_Template, 1, 0, "span", 6);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const action_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("btn-danger", action_r4.variant === "danger")("btn-default", action_r4.variant === "default");
    \u0275\u0275domProperty("disabled", ctx_r1.loading() || (action_r4.disabled == null ? null : action_r4.disabled()));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.loading() ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", action_r4.label, " ");
  }
}
function BulkActionToolbarComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 0)(1, "span", 1);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "button", 2);
    \u0275\u0275domListener("click", function BulkActionToolbarComponent_Conditional_0_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectionService.clearAll());
    });
    \u0275\u0275text(4, " Clear selection ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 3);
    \u0275\u0275repeaterCreate(6, BulkActionToolbarComponent_Conditional_0_For_7_Template, 3, 7, "button", 4, _forTrack0);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectionService.count(), " item(s) selected ");
    \u0275\u0275advance();
    \u0275\u0275domProperty("disabled", ctx_r1.loading());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.actions());
  }
}
var BulkActionToolbarComponent = class _BulkActionToolbarComponent {
  actions = input.required(...ngDevMode ? [{ debugName: "actions" }] : (
    /* istanbul ignore next */
    []
  ));
  selectionService = inject(SelectionService);
  loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : (
    /* istanbul ignore next */
    []
  ));
  async executeAction(action) {
    this.loading.set(true);
    try {
      await action.handler();
      this.selectionService.clearAll();
    } catch {
    } finally {
      this.loading.set(false);
    }
  }
  static \u0275fac = function BulkActionToolbarComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BulkActionToolbarComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _BulkActionToolbarComponent, selectors: [["app-bulk-action-toolbar"]], inputs: { actions: [1, "actions"] }, decls: 1, vars: 1, consts: [["role", "toolbar", "aria-label", "Bulk actions", 1, "bulk-toolbar"], [1, "selection-count"], ["aria-label", "Clear selection", 1, "clear-btn", 3, "click", "disabled"], [1, "toolbar-actions"], [1, "btn", 3, "btn-danger", "btn-default", "disabled"], [1, "btn", 3, "click", "disabled"], ["aria-hidden", "true", 1, "spinner"]], template: function BulkActionToolbarComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275conditionalCreate(0, BulkActionToolbarComponent_Conditional_0_Template, 8, 2, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.selectionService.hasSelection() ? 0 : -1);
    }
  }, styles: ["\n.bulk-toolbar[_ngcontent-%COMP%] {\n  position: sticky;\n  bottom: 0;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-secondary);\n  border-top: 1px solid var(--color-border);\n  border-radius: 0.5rem 0.5rem 0 0;\n  box-shadow: 0 -2px 8px var(--color-shadow);\n  z-index: 10;\n  animation: _ngcontent-%COMP%_slideUp 0.2s ease-out;\n}\n@keyframes _ngcontent-%COMP%_slideUp {\n  from {\n    transform: translateY(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.selection-count[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n  white-space: nowrap;\n}\n.clear-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--color-accent);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  white-space: nowrap;\n}\n.clear-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.clear-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.toolbar-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-left: auto;\n}\n.btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-default[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-default[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger[_ngcontent-%COMP%] {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.spinner[_ngcontent-%COMP%] {\n  display: inline-block;\n  width: 0.875rem;\n  height: 0.875rem;\n  border: 2px solid currentColor;\n  border-right-color: transparent;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.6s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=bulk-action-toolbar.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BulkActionToolbarComponent, [{
    type: Component,
    args: [{ selector: "app-bulk-action-toolbar", standalone: true, template: `
    @if (selectionService.hasSelection()) {
      <div class="bulk-toolbar" role="toolbar" aria-label="Bulk actions">
        <span class="selection-count">
          {{ selectionService.count() }} item(s) selected
        </span>
        <button
          class="clear-btn"
          (click)="selectionService.clearAll()"
          [disabled]="loading()"
          aria-label="Clear selection"
        >
          Clear selection
        </button>
        <div class="toolbar-actions">
          @for (action of actions(); track action.label) {
            <button
              class="btn"
              [class.btn-danger]="action.variant === 'danger'"
              [class.btn-default]="action.variant === 'default'"
              [disabled]="loading() || action.disabled?.()"
              (click)="executeAction(action)"
            >
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
              }
              {{ action.label }}
            </button>
          }
        </div>
      </div>
    }
  `, styles: ["/* angular:styles/component:css;cd6618bec0fd21a938ecdf28e11d4ad3e38c26f103a82c6f9b0532c6e475dfca;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/shared/selection/bulk-action-toolbar.ts */\n.bulk-toolbar {\n  position: sticky;\n  bottom: 0;\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  background: var(--color-bg-secondary);\n  border-top: 1px solid var(--color-border);\n  border-radius: 0.5rem 0.5rem 0 0;\n  box-shadow: 0 -2px 8px var(--color-shadow);\n  z-index: 10;\n  animation: slideUp 0.2s ease-out;\n}\n@keyframes slideUp {\n  from {\n    transform: translateY(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.selection-count {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--color-text-primary);\n  white-space: nowrap;\n}\n.clear-btn {\n  background: none;\n  border: none;\n  color: var(--color-accent);\n  cursor: pointer;\n  font-size: 0.8125rem;\n  padding: 0.25rem 0.5rem;\n  border-radius: 0.25rem;\n  white-space: nowrap;\n}\n.clear-btn:hover:not(:disabled) {\n  text-decoration: underline;\n}\n.clear-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.toolbar-actions {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-left: auto;\n}\n.btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  border: none;\n  cursor: pointer;\n  font-size: 0.875rem;\n  font-weight: 500;\n  transition: background-color 0.15s;\n}\n.btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.btn-default {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.btn-default:hover:not(:disabled) {\n  background: var(--color-border);\n}\n.btn-danger {\n  background: #991b1b;\n  color: #fecaca;\n}\n.btn-danger:hover:not(:disabled) {\n  background: #b91c1c;\n}\n.spinner {\n  display: inline-block;\n  width: 0.875rem;\n  height: 0.875rem;\n  border: 2px solid currentColor;\n  border-right-color: transparent;\n  border-radius: 50%;\n  animation: spin 0.6s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=bulk-action-toolbar.css.map */\n"] }]
  }], null, { actions: [{ type: Input, args: [{ isSignal: true, alias: "actions", required: true }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(BulkActionToolbarComponent, { className: "BulkActionToolbarComponent", filePath: "src/app/shared/selection/bulk-action-toolbar.ts", lineNumber: 168 });
})();

export {
  SelectionService,
  SelectionCheckboxComponent,
  SelectAllCheckboxComponent,
  BulkActionToolbarComponent
};
//# sourceMappingURL=chunk-GZRWYXK5.js.map
