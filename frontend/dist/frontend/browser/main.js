import {
  DashboardSseService
} from "./chunk-RS5BXU3T.js";
import {
  AuthService,
  Yo,
  environment
} from "./chunk-3W6OO4XR.js";
import {
  OrganisationStateService
} from "./chunk-PHEIM2OP.js";
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  HostListener,
  HttpClient,
  Injectable,
  NavigationStart,
  Output,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Subject,
  ViewChild,
  __spreadProps,
  __spreadValues,
  bootstrapApplication,
  computed,
  debounceTime,
  distinctUntilChanged,
  effect,
  filter,
  finalize,
  inject,
  of,
  output,
  provideBrowserGlobalErrorListeners,
  provideHttpClient,
  provideRouter,
  provideZoneChangeDetection,
  setClassMetadata,
  signal,
  switchMap,
  withInterceptors,
  withNavigationErrorHandler,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵarrowFunction,
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
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵqueryRefresh,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵresolveWindow,
  ɵɵrestoreView,
  ɵɵsanitizeHtml,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate2,
  ɵɵviewQuery
} from "./chunk-F2IK7UH5.js";

// node_modules/zone.js/fesm2015/zone.js
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues2 = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps2 = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var global = globalThis;
function __symbol__(name) {
  const symbolPrefix = global["__Zone_symbol_prefix"] || "__zone_symbol__";
  return symbolPrefix + name;
}
function initZone() {
  const performance = global["performance"];
  function mark(name) {
    performance && performance["mark"] && performance["mark"](name);
  }
  function performanceMeasure(name, label) {
    performance && performance["measure"] && performance["measure"](name, label);
  }
  mark("Zone");
  const _ZoneImpl = class _ZoneImpl2 {
    constructor(parent, zoneSpec) {
      __publicField(this, "_parent");
      __publicField(this, "_name");
      __publicField(this, "_properties");
      __publicField(this, "_zoneDelegate");
      this._parent = parent;
      this._name = zoneSpec ? zoneSpec.name || "unnamed" : "<root>";
      this._properties = zoneSpec && zoneSpec.properties || {};
      this._zoneDelegate = new _ZoneDelegate(this, this._parent && this._parent._zoneDelegate, zoneSpec);
    }
    static assertZonePatched() {
      if (global["Promise"] !== patches["ZoneAwarePromise"]) {
        throw new Error("Zone.js has detected that ZoneAwarePromise `(window|global).Promise` has been overwritten.\nMost likely cause is that a Promise polyfill has been loaded after Zone.js (Polyfilling Promise api is not necessary when zone.js is loaded. If you must load one, do so before loading zone.js.)");
      }
    }
    static get root() {
      let zone = _ZoneImpl2.current;
      while (zone.parent) {
        zone = zone.parent;
      }
      return zone;
    }
    static get current() {
      return _currentZoneFrame.zone;
    }
    static get currentTask() {
      return _currentTask;
    }
    static __load_patch(name, fn, ignoreDuplicate = false) {
      if (patches.hasOwnProperty(name)) {
        const checkDuplicate = global[__symbol__("forceDuplicateZoneCheck")] === true;
        if (!ignoreDuplicate && checkDuplicate) {
          throw Error("Already loaded patch: " + name);
        }
      } else if (!global["__Zone_disable_" + name]) {
        const perfName = "Zone:" + name;
        mark(perfName);
        patches[name] = fn(global, _ZoneImpl2, _api);
        performanceMeasure(perfName, perfName);
      }
    }
    get parent() {
      return this._parent;
    }
    get name() {
      return this._name;
    }
    get(key) {
      const zone = this.getZoneWith(key);
      if (zone)
        return zone._properties[key];
    }
    getZoneWith(key) {
      let current = this;
      while (current) {
        if (current._properties.hasOwnProperty(key)) {
          return current;
        }
        current = current._parent;
      }
      return null;
    }
    fork(zoneSpec) {
      if (!zoneSpec)
        throw new Error("ZoneSpec required!");
      return this._zoneDelegate.fork(this, zoneSpec);
    }
    wrap(callback, source) {
      if (typeof callback !== "function") {
        throw new Error("Expecting function got: " + callback);
      }
      const _callback = this._zoneDelegate.intercept(this, callback, source);
      const zone = this;
      return function() {
        return zone.runGuarded(_callback, this, arguments, source);
      };
    }
    run(callback, applyThis, applyArgs, source) {
      _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
      try {
        return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
      } finally {
        _currentZoneFrame = _currentZoneFrame.parent;
      }
    }
    runGuarded(callback, applyThis = null, applyArgs, source) {
      _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
      try {
        try {
          return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
        } catch (error) {
          if (this._zoneDelegate.handleError(this, error)) {
            throw error;
          }
        }
      } finally {
        _currentZoneFrame = _currentZoneFrame.parent;
      }
    }
    runTask(task, applyThis, applyArgs) {
      if (task.zone != this) {
        throw new Error("A task can only be run in the zone of creation! (Creation: " + (task.zone || NO_ZONE).name + "; Execution: " + this.name + ")");
      }
      const zoneTask = task;
      const { type, data: { isPeriodic = false, isRefreshable = false } = {} } = task;
      if (task.state === notScheduled && (type === eventTask || type === macroTask)) {
        return;
      }
      const reEntryGuard = task.state != running;
      reEntryGuard && zoneTask._transitionTo(running, scheduled);
      const previousTask = _currentTask;
      _currentTask = zoneTask;
      _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
      try {
        if (type == macroTask && task.data && !isPeriodic && !isRefreshable) {
          task.cancelFn = void 0;
        }
        try {
          return this._zoneDelegate.invokeTask(this, zoneTask, applyThis, applyArgs);
        } catch (error) {
          if (this._zoneDelegate.handleError(this, error)) {
            throw error;
          }
        }
      } finally {
        const state = task.state;
        if (state !== notScheduled && state !== unknown) {
          if (type == eventTask || isPeriodic || isRefreshable && state === scheduling) {
            reEntryGuard && zoneTask._transitionTo(scheduled, running, scheduling);
          } else {
            const zoneDelegates = zoneTask._zoneDelegates;
            this._updateTaskCount(zoneTask, -1);
            reEntryGuard && zoneTask._transitionTo(notScheduled, running, notScheduled);
            if (isRefreshable) {
              zoneTask._zoneDelegates = zoneDelegates;
            }
          }
        }
        _currentZoneFrame = _currentZoneFrame.parent;
        _currentTask = previousTask;
      }
    }
    scheduleTask(task) {
      if (task.zone && task.zone !== this) {
        let newZone = this;
        while (newZone) {
          if (newZone === task.zone) {
            throw Error(`can not reschedule task to ${this.name} which is descendants of the original zone ${task.zone.name}`);
          }
          newZone = newZone.parent;
        }
      }
      task._transitionTo(scheduling, notScheduled);
      const zoneDelegates = [];
      task._zoneDelegates = zoneDelegates;
      task._zone = this;
      try {
        task = this._zoneDelegate.scheduleTask(this, task);
      } catch (err) {
        task._transitionTo(unknown, scheduling, notScheduled);
        this._zoneDelegate.handleError(this, err);
        throw err;
      }
      if (task._zoneDelegates === zoneDelegates) {
        this._updateTaskCount(task, 1);
      }
      if (task.state == scheduling) {
        task._transitionTo(scheduled, scheduling);
      }
      return task;
    }
    scheduleMicroTask(source, callback, data, customSchedule) {
      return this.scheduleTask(new ZoneTask(microTask, source, callback, data, customSchedule, void 0));
    }
    scheduleMacroTask(source, callback, data, customSchedule, customCancel) {
      return this.scheduleTask(new ZoneTask(macroTask, source, callback, data, customSchedule, customCancel));
    }
    scheduleEventTask(source, callback, data, customSchedule, customCancel) {
      return this.scheduleTask(new ZoneTask(eventTask, source, callback, data, customSchedule, customCancel));
    }
    cancelTask(task) {
      if (task.zone != this)
        throw new Error("A task can only be cancelled in the zone of creation! (Creation: " + (task.zone || NO_ZONE).name + "; Execution: " + this.name + ")");
      if (task.state !== scheduled && task.state !== running) {
        return;
      }
      task._transitionTo(canceling, scheduled, running);
      try {
        this._zoneDelegate.cancelTask(this, task);
      } catch (err) {
        task._transitionTo(unknown, canceling);
        this._zoneDelegate.handleError(this, err);
        throw err;
      }
      this._updateTaskCount(task, -1);
      task._transitionTo(notScheduled, canceling);
      task.runCount = -1;
      return task;
    }
    _updateTaskCount(task, count) {
      const zoneDelegates = task._zoneDelegates;
      if (count == -1) {
        task._zoneDelegates = null;
      }
      for (let i = 0; i < zoneDelegates.length; i++) {
        zoneDelegates[i]._updateTaskCount(task.type, count);
      }
    }
  };
  __publicField(_ZoneImpl, "__symbol__", __symbol__);
  let ZoneImpl = _ZoneImpl;
  const DELEGATE_ZS = {
    name: "",
    onHasTask: (delegate, _, target, hasTaskState) => delegate.hasTask(target, hasTaskState),
    onScheduleTask: (delegate, _, target, task) => delegate.scheduleTask(target, task),
    onInvokeTask: (delegate, _, target, task, applyThis, applyArgs) => delegate.invokeTask(target, task, applyThis, applyArgs),
    onCancelTask: (delegate, _, target, task) => delegate.cancelTask(target, task)
  };
  class _ZoneDelegate {
    constructor(zone, parentDelegate, zoneSpec) {
      __publicField(this, "_zone");
      __publicField(this, "_taskCounts", {
        "microTask": 0,
        "macroTask": 0,
        "eventTask": 0
      });
      __publicField(this, "_parentDelegate");
      __publicField(this, "_forkDlgt");
      __publicField(this, "_forkZS");
      __publicField(this, "_forkCurrZone");
      __publicField(this, "_interceptDlgt");
      __publicField(this, "_interceptZS");
      __publicField(this, "_interceptCurrZone");
      __publicField(this, "_invokeDlgt");
      __publicField(this, "_invokeZS");
      __publicField(this, "_invokeCurrZone");
      __publicField(this, "_handleErrorDlgt");
      __publicField(this, "_handleErrorZS");
      __publicField(this, "_handleErrorCurrZone");
      __publicField(this, "_scheduleTaskDlgt");
      __publicField(this, "_scheduleTaskZS");
      __publicField(this, "_scheduleTaskCurrZone");
      __publicField(this, "_invokeTaskDlgt");
      __publicField(this, "_invokeTaskZS");
      __publicField(this, "_invokeTaskCurrZone");
      __publicField(this, "_cancelTaskDlgt");
      __publicField(this, "_cancelTaskZS");
      __publicField(this, "_cancelTaskCurrZone");
      __publicField(this, "_hasTaskDlgt");
      __publicField(this, "_hasTaskDlgtOwner");
      __publicField(this, "_hasTaskZS");
      __publicField(this, "_hasTaskCurrZone");
      this._zone = zone;
      this._parentDelegate = parentDelegate;
      this._forkZS = zoneSpec && (zoneSpec && zoneSpec.onFork ? zoneSpec : parentDelegate._forkZS);
      this._forkDlgt = zoneSpec && (zoneSpec.onFork ? parentDelegate : parentDelegate._forkDlgt);
      this._forkCurrZone = zoneSpec && (zoneSpec.onFork ? this._zone : parentDelegate._forkCurrZone);
      this._interceptZS = zoneSpec && (zoneSpec.onIntercept ? zoneSpec : parentDelegate._interceptZS);
      this._interceptDlgt = zoneSpec && (zoneSpec.onIntercept ? parentDelegate : parentDelegate._interceptDlgt);
      this._interceptCurrZone = zoneSpec && (zoneSpec.onIntercept ? this._zone : parentDelegate._interceptCurrZone);
      this._invokeZS = zoneSpec && (zoneSpec.onInvoke ? zoneSpec : parentDelegate._invokeZS);
      this._invokeDlgt = zoneSpec && (zoneSpec.onInvoke ? parentDelegate : parentDelegate._invokeDlgt);
      this._invokeCurrZone = zoneSpec && (zoneSpec.onInvoke ? this._zone : parentDelegate._invokeCurrZone);
      this._handleErrorZS = zoneSpec && (zoneSpec.onHandleError ? zoneSpec : parentDelegate._handleErrorZS);
      this._handleErrorDlgt = zoneSpec && (zoneSpec.onHandleError ? parentDelegate : parentDelegate._handleErrorDlgt);
      this._handleErrorCurrZone = zoneSpec && (zoneSpec.onHandleError ? this._zone : parentDelegate._handleErrorCurrZone);
      this._scheduleTaskZS = zoneSpec && (zoneSpec.onScheduleTask ? zoneSpec : parentDelegate._scheduleTaskZS);
      this._scheduleTaskDlgt = zoneSpec && (zoneSpec.onScheduleTask ? parentDelegate : parentDelegate._scheduleTaskDlgt);
      this._scheduleTaskCurrZone = zoneSpec && (zoneSpec.onScheduleTask ? this._zone : parentDelegate._scheduleTaskCurrZone);
      this._invokeTaskZS = zoneSpec && (zoneSpec.onInvokeTask ? zoneSpec : parentDelegate._invokeTaskZS);
      this._invokeTaskDlgt = zoneSpec && (zoneSpec.onInvokeTask ? parentDelegate : parentDelegate._invokeTaskDlgt);
      this._invokeTaskCurrZone = zoneSpec && (zoneSpec.onInvokeTask ? this._zone : parentDelegate._invokeTaskCurrZone);
      this._cancelTaskZS = zoneSpec && (zoneSpec.onCancelTask ? zoneSpec : parentDelegate._cancelTaskZS);
      this._cancelTaskDlgt = zoneSpec && (zoneSpec.onCancelTask ? parentDelegate : parentDelegate._cancelTaskDlgt);
      this._cancelTaskCurrZone = zoneSpec && (zoneSpec.onCancelTask ? this._zone : parentDelegate._cancelTaskCurrZone);
      this._hasTaskZS = null;
      this._hasTaskDlgt = null;
      this._hasTaskDlgtOwner = null;
      this._hasTaskCurrZone = null;
      const zoneSpecHasTask = zoneSpec && zoneSpec.onHasTask;
      const parentHasTask = parentDelegate && parentDelegate._hasTaskZS;
      if (zoneSpecHasTask || parentHasTask) {
        this._hasTaskZS = zoneSpecHasTask ? zoneSpec : DELEGATE_ZS;
        this._hasTaskDlgt = parentDelegate;
        this._hasTaskDlgtOwner = this;
        this._hasTaskCurrZone = this._zone;
        if (!zoneSpec.onScheduleTask) {
          this._scheduleTaskZS = DELEGATE_ZS;
          this._scheduleTaskDlgt = parentDelegate;
          this._scheduleTaskCurrZone = this._zone;
        }
        if (!zoneSpec.onInvokeTask) {
          this._invokeTaskZS = DELEGATE_ZS;
          this._invokeTaskDlgt = parentDelegate;
          this._invokeTaskCurrZone = this._zone;
        }
        if (!zoneSpec.onCancelTask) {
          this._cancelTaskZS = DELEGATE_ZS;
          this._cancelTaskDlgt = parentDelegate;
          this._cancelTaskCurrZone = this._zone;
        }
      }
    }
    get zone() {
      return this._zone;
    }
    fork(targetZone, zoneSpec) {
      return this._forkZS ? this._forkZS.onFork(this._forkDlgt, this.zone, targetZone, zoneSpec) : new ZoneImpl(targetZone, zoneSpec);
    }
    intercept(targetZone, callback, source) {
      return this._interceptZS ? this._interceptZS.onIntercept(this._interceptDlgt, this._interceptCurrZone, targetZone, callback, source) : callback;
    }
    invoke(targetZone, callback, applyThis, applyArgs, source) {
      return this._invokeZS ? this._invokeZS.onInvoke(this._invokeDlgt, this._invokeCurrZone, targetZone, callback, applyThis, applyArgs, source) : callback.apply(applyThis, applyArgs);
    }
    handleError(targetZone, error) {
      return this._handleErrorZS ? this._handleErrorZS.onHandleError(this._handleErrorDlgt, this._handleErrorCurrZone, targetZone, error) : true;
    }
    scheduleTask(targetZone, task) {
      let returnTask = task;
      if (this._scheduleTaskZS) {
        if (this._hasTaskZS) {
          returnTask._zoneDelegates.push(this._hasTaskDlgtOwner);
        }
        returnTask = this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, this._scheduleTaskCurrZone, targetZone, task);
        if (!returnTask)
          returnTask = task;
      } else {
        if (task.scheduleFn) {
          task.scheduleFn(task);
        } else if (task.type == microTask) {
          scheduleMicroTask(task);
        } else {
          throw new Error("Task is missing scheduleFn.");
        }
      }
      return returnTask;
    }
    invokeTask(targetZone, task, applyThis, applyArgs) {
      return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, targetZone, task, applyThis, applyArgs) : task.callback.apply(applyThis, applyArgs);
    }
    cancelTask(targetZone, task) {
      let value;
      if (this._cancelTaskZS) {
        value = this._cancelTaskZS.onCancelTask(this._cancelTaskDlgt, this._cancelTaskCurrZone, targetZone, task);
      } else {
        if (!task.cancelFn) {
          throw Error("Task is not cancelable");
        }
        value = task.cancelFn(task);
      }
      return value;
    }
    hasTask(targetZone, isEmpty) {
      try {
        this._hasTaskZS && this._hasTaskZS.onHasTask(this._hasTaskDlgt, this._hasTaskCurrZone, targetZone, isEmpty);
      } catch (err) {
        this.handleError(targetZone, err);
      }
    }
    _updateTaskCount(type, count) {
      const counts = this._taskCounts;
      const prev = counts[type];
      const next = counts[type] = prev + count;
      if (next < 0) {
        throw new Error("More tasks executed then were scheduled.");
      }
      if (prev == 0 || next == 0) {
        const isEmpty = {
          microTask: counts["microTask"] > 0,
          macroTask: counts["macroTask"] > 0,
          eventTask: counts["eventTask"] > 0,
          change: type
        };
        this.hasTask(this._zone, isEmpty);
      }
    }
  }
  class ZoneTask {
    constructor(type, source, callback, options, scheduleFn, cancelFn) {
      __publicField(this, "type");
      __publicField(this, "source");
      __publicField(this, "invoke");
      __publicField(this, "callback");
      __publicField(this, "data");
      __publicField(this, "scheduleFn");
      __publicField(this, "cancelFn");
      __publicField(this, "_zone", null);
      __publicField(this, "runCount", 0);
      __publicField(this, "_zoneDelegates", null);
      __publicField(this, "_state", "notScheduled");
      this.type = type;
      this.source = source;
      this.data = options;
      this.scheduleFn = scheduleFn;
      this.cancelFn = cancelFn;
      if (!callback) {
        throw new Error("callback is not defined");
      }
      this.callback = callback;
      const self2 = this;
      if (type === eventTask && options && options.useG) {
        this.invoke = ZoneTask.invokeTask;
      } else {
        this.invoke = function() {
          return ZoneTask.invokeTask.call(global, self2, this, arguments);
        };
      }
    }
    static invokeTask(task, target, args) {
      if (!task) {
        task = this;
      }
      _numberOfNestedTaskFrames++;
      try {
        task.runCount++;
        return task.zone.runTask(task, target, args);
      } finally {
        if (_numberOfNestedTaskFrames == 1) {
          drainMicroTaskQueue();
        }
        _numberOfNestedTaskFrames--;
      }
    }
    get zone() {
      return this._zone;
    }
    get state() {
      return this._state;
    }
    cancelScheduleRequest() {
      this._transitionTo(notScheduled, scheduling);
    }
    _transitionTo(toState, fromState1, fromState2) {
      if (this._state === fromState1 || this._state === fromState2) {
        this._state = toState;
        if (toState == notScheduled) {
          this._zoneDelegates = null;
        }
      } else {
        throw new Error(`${this.type} '${this.source}': can not transition to '${toState}', expecting state '${fromState1}'${fromState2 ? " or '" + fromState2 + "'" : ""}, was '${this._state}'.`);
      }
    }
    toString() {
      if (this.data && typeof this.data.handleId !== "undefined") {
        return this.data.handleId.toString();
      } else {
        return Object.prototype.toString.call(this);
      }
    }
    // add toJSON method to prevent cyclic error when
    // call JSON.stringify(zoneTask)
    toJSON() {
      return {
        type: this.type,
        state: this.state,
        source: this.source,
        zone: this.zone.name,
        runCount: this.runCount
      };
    }
  }
  const symbolSetTimeout = __symbol__("setTimeout");
  const symbolPromise = __symbol__("Promise");
  const symbolThen = __symbol__("then");
  let _microTaskQueue = [];
  let _isDrainingMicrotaskQueue = false;
  let nativeMicroTaskQueuePromise;
  function nativeScheduleMicroTask(func) {
    if (!nativeMicroTaskQueuePromise) {
      if (global[symbolPromise]) {
        nativeMicroTaskQueuePromise = global[symbolPromise].resolve(0);
      }
    }
    if (nativeMicroTaskQueuePromise) {
      let nativeThen = nativeMicroTaskQueuePromise[symbolThen];
      if (!nativeThen) {
        nativeThen = nativeMicroTaskQueuePromise["then"];
      }
      nativeThen.call(nativeMicroTaskQueuePromise, func);
    } else {
      global[symbolSetTimeout](func, 0);
    }
  }
  function scheduleMicroTask(task) {
    if (_numberOfNestedTaskFrames === 0 && _microTaskQueue.length === 0) {
      nativeScheduleMicroTask(drainMicroTaskQueue);
    }
    task && _microTaskQueue.push(task);
  }
  function drainMicroTaskQueue() {
    if (!_isDrainingMicrotaskQueue) {
      _isDrainingMicrotaskQueue = true;
      while (_microTaskQueue.length) {
        const queue = _microTaskQueue;
        _microTaskQueue = [];
        for (let i = 0; i < queue.length; i++) {
          const task = queue[i];
          try {
            task.zone.runTask(task, null, null);
          } catch (error) {
            _api.onUnhandledError(error);
          }
        }
      }
      _api.microtaskDrainDone();
      _isDrainingMicrotaskQueue = false;
    }
  }
  const NO_ZONE = { name: "NO ZONE" };
  const notScheduled = "notScheduled", scheduling = "scheduling", scheduled = "scheduled", running = "running", canceling = "canceling", unknown = "unknown";
  const microTask = "microTask", macroTask = "macroTask", eventTask = "eventTask";
  const patches = {};
  const _api = {
    symbol: __symbol__,
    currentZoneFrame: () => _currentZoneFrame,
    onUnhandledError: noop,
    microtaskDrainDone: noop,
    scheduleMicroTask,
    showUncaughtError: () => !ZoneImpl[__symbol__("ignoreConsoleErrorUncaughtError")],
    patchEventTarget: () => [],
    patchOnProperties: noop,
    patchMethod: () => noop,
    bindArguments: () => [],
    patchThen: () => noop,
    patchMacroTask: () => noop,
    patchEventPrototype: () => noop,
    getGlobalObjects: () => void 0,
    ObjectDefineProperty: () => noop,
    ObjectGetOwnPropertyDescriptor: () => void 0,
    ObjectCreate: () => void 0,
    ArraySlice: () => [],
    patchClass: () => noop,
    wrapWithCurrentZone: () => noop,
    filterProperties: () => [],
    attachOriginToPatched: () => noop,
    _redefineProperty: () => noop,
    patchCallbacks: () => noop,
    nativeScheduleMicroTask
  };
  let _currentZoneFrame = { parent: null, zone: new ZoneImpl(null, null) };
  let _currentTask = null;
  let _numberOfNestedTaskFrames = 0;
  function noop() {
  }
  performanceMeasure("Zone", "Zone");
  return ZoneImpl;
}
function loadZone() {
  var _a;
  const global2 = globalThis;
  const checkDuplicate = global2[__symbol__("forceDuplicateZoneCheck")] === true;
  if (global2["Zone"] && (checkDuplicate || typeof global2["Zone"].__symbol__ !== "function")) {
    throw new Error("Zone already loaded.");
  }
  (_a = global2["Zone"]) != null ? _a : global2["Zone"] = initZone();
  return global2["Zone"];
}
var ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var ObjectDefineProperty = Object.defineProperty;
var ObjectGetPrototypeOf = Object.getPrototypeOf;
var ObjectCreate = Object.create;
var ArraySlice = Array.prototype.slice;
var ADD_EVENT_LISTENER_STR = "addEventListener";
var REMOVE_EVENT_LISTENER_STR = "removeEventListener";
var ZONE_SYMBOL_ADD_EVENT_LISTENER = __symbol__(ADD_EVENT_LISTENER_STR);
var ZONE_SYMBOL_REMOVE_EVENT_LISTENER = __symbol__(REMOVE_EVENT_LISTENER_STR);
var TRUE_STR = "true";
var FALSE_STR = "false";
var ZONE_SYMBOL_PREFIX = __symbol__("");
function wrapWithCurrentZone(callback, source) {
  return Zone.current.wrap(callback, source);
}
function scheduleMacroTaskWithCurrentZone(source, callback, data, customSchedule, customCancel) {
  return Zone.current.scheduleMacroTask(source, callback, data, customSchedule, customCancel);
}
var zoneSymbol = __symbol__;
var isWindowExists = typeof window !== "undefined";
var internalWindow = isWindowExists ? window : void 0;
var _global = isWindowExists && internalWindow || globalThis;
var REMOVE_ATTRIBUTE = "removeAttribute";
function bindArguments(args, source) {
  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === "function") {
      args[i] = wrapWithCurrentZone(args[i], source + "_" + i);
    }
  }
  return args;
}
function patchPrototype(prototype, fnNames) {
  const source = prototype.constructor["name"];
  for (let i = 0; i < fnNames.length; i++) {
    const name = fnNames[i];
    const delegate = prototype[name];
    if (delegate) {
      const prototypeDesc = ObjectGetOwnPropertyDescriptor(prototype, name);
      if (!isPropertyWritable(prototypeDesc)) {
        continue;
      }
      prototype[name] = ((delegate2) => {
        const patched = function() {
          return delegate2.apply(this, bindArguments(arguments, source + "." + name));
        };
        attachOriginToPatched(patched, delegate2);
        return patched;
      })(delegate);
    }
  }
}
function isPropertyWritable(propertyDesc) {
  if (!propertyDesc) {
    return true;
  }
  if (propertyDesc.writable === false) {
    return false;
  }
  return !(typeof propertyDesc.get === "function" && typeof propertyDesc.set === "undefined");
}
var isWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
var isNode = !("nw" in _global) && typeof _global.process !== "undefined" && _global.process.toString() === "[object process]";
var isBrowser = !isNode && !isWebWorker && !!(isWindowExists && internalWindow["HTMLElement"]);
var isMix = typeof _global.process !== "undefined" && _global.process.toString() === "[object process]" && !isWebWorker && !!(isWindowExists && internalWindow["HTMLElement"]);
var zoneSymbolEventNames = {};
var enableBeforeunloadSymbol = zoneSymbol("enable_beforeunload");
var wrapFn = function(event) {
  event = event || _global.event;
  if (!event) {
    return;
  }
  let eventNameSymbol = zoneSymbolEventNames[event.type];
  if (!eventNameSymbol) {
    eventNameSymbol = zoneSymbolEventNames[event.type] = zoneSymbol("ON_PROPERTY" + event.type);
  }
  const target = this || event.target || _global;
  const listener = target[eventNameSymbol];
  let result;
  if (isBrowser && target === internalWindow && event.type === "error") {
    const errorEvent = event;
    result = listener && listener.call(this, errorEvent.message, errorEvent.filename, errorEvent.lineno, errorEvent.colno, errorEvent.error);
    if (result === true) {
      event.preventDefault();
    }
  } else {
    result = listener && listener.apply(this, arguments);
    if (
      // https://github.com/angular/angular/issues/47579
      // https://www.w3.org/TR/2011/WD-html5-20110525/history.html#beforeunloadevent
      // This is the only specific case we should check for. The spec defines that the
      // `returnValue` attribute represents the message to show the user. When the event
      // is created, this attribute must be set to the empty string.
      event.type === "beforeunload" && // To prevent any breaking changes resulting from this change, given that
      // it was already causing a significant number of failures in G3, we have hidden
      // that behavior behind a global configuration flag. Consumers can enable this
      // flag explicitly if they want the `beforeunload` event to be handled as defined
      // in the specification.
      _global[enableBeforeunloadSymbol] && // The IDL event definition is `attribute DOMString returnValue`, so we check whether
      // `typeof result` is a string.
      typeof result === "string"
    ) {
      event.returnValue = result;
    } else if (result != void 0 && !result) {
      event.preventDefault();
    }
  }
  return result;
};
function patchProperty(obj, prop, prototype) {
  let desc = ObjectGetOwnPropertyDescriptor(obj, prop);
  if (!desc && prototype) {
    const prototypeDesc = ObjectGetOwnPropertyDescriptor(prototype, prop);
    if (prototypeDesc) {
      desc = { enumerable: true, configurable: true };
    }
  }
  if (!desc || !desc.configurable) {
    return;
  }
  const onPropPatchedSymbol = zoneSymbol("on" + prop + "patched");
  if (obj.hasOwnProperty(onPropPatchedSymbol) && obj[onPropPatchedSymbol]) {
    return;
  }
  delete desc.writable;
  delete desc.value;
  const originalDescGet = desc.get;
  const originalDescSet = desc.set;
  const eventName = prop.slice(2);
  let eventNameSymbol = zoneSymbolEventNames[eventName];
  if (!eventNameSymbol) {
    eventNameSymbol = zoneSymbolEventNames[eventName] = zoneSymbol("ON_PROPERTY" + eventName);
  }
  desc.set = function(newValue) {
    let target = this;
    if (!target && obj === _global) {
      target = _global;
    }
    if (!target) {
      return;
    }
    const previousValue = target[eventNameSymbol];
    if (typeof previousValue === "function") {
      target.removeEventListener(eventName, wrapFn);
    }
    originalDescSet == null ? void 0 : originalDescSet.call(target, null);
    target[eventNameSymbol] = newValue;
    if (typeof newValue === "function") {
      target.addEventListener(eventName, wrapFn, false);
    }
  };
  desc.get = function() {
    let target = this;
    if (!target && obj === _global) {
      target = _global;
    }
    if (!target) {
      return null;
    }
    const listener = target[eventNameSymbol];
    if (listener) {
      return listener;
    } else if (originalDescGet) {
      let value = originalDescGet.call(this);
      if (value) {
        desc.set.call(this, value);
        if (typeof target[REMOVE_ATTRIBUTE] === "function") {
          target.removeAttribute(prop);
        }
        return value;
      }
    }
    return null;
  };
  ObjectDefineProperty(obj, prop, desc);
  obj[onPropPatchedSymbol] = true;
}
function patchOnProperties(obj, properties, prototype) {
  if (properties) {
    for (let i = 0; i < properties.length; i++) {
      patchProperty(obj, "on" + properties[i], prototype);
    }
  } else {
    const onProperties = [];
    for (const prop in obj) {
      if (prop.slice(0, 2) == "on") {
        onProperties.push(prop);
      }
    }
    for (let j = 0; j < onProperties.length; j++) {
      patchProperty(obj, onProperties[j], prototype);
    }
  }
}
var originalInstanceKey = zoneSymbol("originalInstance");
function patchClass(className) {
  const OriginalClass = _global[className];
  if (!OriginalClass)
    return;
  _global[zoneSymbol(className)] = OriginalClass;
  _global[className] = function() {
    const a = bindArguments(arguments, className);
    switch (a.length) {
      case 0:
        this[originalInstanceKey] = new OriginalClass();
        break;
      case 1:
        this[originalInstanceKey] = new OriginalClass(a[0]);
        break;
      case 2:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1]);
        break;
      case 3:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2]);
        break;
      case 4:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2], a[3]);
        break;
      default:
        throw new Error("Arg list too long.");
    }
  };
  attachOriginToPatched(_global[className], OriginalClass);
  const instance = new OriginalClass(function() {
  });
  let prop;
  for (prop in instance) {
    if (className === "XMLHttpRequest" && prop === "responseBlob")
      continue;
    (function(prop2) {
      if (typeof instance[prop2] === "function") {
        _global[className].prototype[prop2] = function() {
          return this[originalInstanceKey][prop2].apply(this[originalInstanceKey], arguments);
        };
      } else {
        ObjectDefineProperty(_global[className].prototype, prop2, {
          set: function(fn) {
            if (typeof fn === "function") {
              this[originalInstanceKey][prop2] = wrapWithCurrentZone(fn, className + "." + prop2);
              attachOriginToPatched(this[originalInstanceKey][prop2], fn);
            } else {
              this[originalInstanceKey][prop2] = fn;
            }
          },
          get: function() {
            return this[originalInstanceKey][prop2];
          }
        });
      }
    })(prop);
  }
  for (prop in OriginalClass) {
    if (prop !== "prototype" && OriginalClass.hasOwnProperty(prop)) {
      _global[className][prop] = OriginalClass[prop];
    }
  }
}
function copySymbolProperties(src, dest) {
  if (typeof Object.getOwnPropertySymbols !== "function") {
    return;
  }
  const symbols = Object.getOwnPropertySymbols(src);
  symbols.forEach((symbol) => {
    const desc = Object.getOwnPropertyDescriptor(src, symbol);
    Object.defineProperty(dest, symbol, {
      get: function() {
        return src[symbol];
      },
      set: function(value) {
        if (desc && (!desc.writable || typeof desc.set !== "function")) {
          return;
        }
        src[symbol] = value;
      },
      enumerable: desc ? desc.enumerable : true,
      configurable: desc ? desc.configurable : true
    });
  });
}
var shouldCopySymbolProperties = false;
function patchMethod(target, name, patchFn) {
  let proto = target;
  while (proto && !proto.hasOwnProperty(name)) {
    proto = ObjectGetPrototypeOf(proto);
  }
  if (!proto && target[name]) {
    proto = target;
  }
  const delegateName = zoneSymbol(name);
  let delegate = null;
  if (proto && (!(delegate = proto[delegateName]) || !proto.hasOwnProperty(delegateName))) {
    delegate = proto[delegateName] = proto[name];
    const desc = proto && ObjectGetOwnPropertyDescriptor(proto, name);
    if (isPropertyWritable(desc)) {
      const patchDelegate = patchFn(delegate, delegateName, name);
      proto[name] = function() {
        return patchDelegate(this, arguments);
      };
      attachOriginToPatched(proto[name], delegate);
      if (shouldCopySymbolProperties) {
        copySymbolProperties(delegate, proto[name]);
      }
    }
  }
  return delegate;
}
function patchMacroTask(obj, funcName, metaCreator) {
  let setNative = null;
  function scheduleTask(task) {
    const data = task.data;
    data.args[data.cbIdx] = function() {
      task.invoke.apply(this, arguments);
    };
    setNative.apply(data.target, data.args);
    return task;
  }
  setNative = patchMethod(obj, funcName, (delegate) => function(self2, args) {
    const meta = metaCreator(self2, args);
    if (meta.cbIdx >= 0 && typeof args[meta.cbIdx] === "function") {
      return scheduleMacroTaskWithCurrentZone(meta.name, args[meta.cbIdx], meta, scheduleTask);
    } else {
      return delegate.apply(self2, args);
    }
  });
}
function attachOriginToPatched(patched, original) {
  patched[zoneSymbol("OriginalDelegate")] = original;
}
function isFunction(value) {
  return typeof value === "function";
}
function isNumber(value) {
  return typeof value === "number";
}
var OPTIMIZED_ZONE_EVENT_TASK_DATA = {
  useG: true
};
var zoneSymbolEventNames2 = {};
var globalSources = {};
var EVENT_NAME_SYMBOL_REGX = new RegExp("^" + ZONE_SYMBOL_PREFIX + "(\\w+)(true|false)$");
var IMMEDIATE_PROPAGATION_SYMBOL = zoneSymbol("propagationStopped");
function prepareEventNames(eventName, eventNameToString) {
  const falseEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + FALSE_STR;
  const trueEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + TRUE_STR;
  const symbol = ZONE_SYMBOL_PREFIX + falseEventName;
  const symbolCapture = ZONE_SYMBOL_PREFIX + trueEventName;
  zoneSymbolEventNames2[eventName] = {};
  zoneSymbolEventNames2[eventName][FALSE_STR] = symbol;
  zoneSymbolEventNames2[eventName][TRUE_STR] = symbolCapture;
}
function patchEventTarget(_global2, api, apis, patchOptions) {
  const ADD_EVENT_LISTENER = patchOptions && patchOptions.add || ADD_EVENT_LISTENER_STR;
  const REMOVE_EVENT_LISTENER = patchOptions && patchOptions.rm || REMOVE_EVENT_LISTENER_STR;
  const LISTENERS_EVENT_LISTENER = patchOptions && patchOptions.listeners || "eventListeners";
  const REMOVE_ALL_LISTENERS_EVENT_LISTENER = patchOptions && patchOptions.rmAll || "removeAllListeners";
  const zoneSymbolAddEventListener = zoneSymbol(ADD_EVENT_LISTENER);
  const ADD_EVENT_LISTENER_SOURCE = "." + ADD_EVENT_LISTENER + ":";
  const PREPEND_EVENT_LISTENER = "prependListener";
  const PREPEND_EVENT_LISTENER_SOURCE = "." + PREPEND_EVENT_LISTENER + ":";
  const invokeTask = function(task, target, event) {
    if (task.isRemoved) {
      return;
    }
    const delegate = task.callback;
    if (typeof delegate === "object" && delegate.handleEvent) {
      task.callback = (event2) => delegate.handleEvent(event2);
      task.originalDelegate = delegate;
    }
    let error;
    try {
      task.invoke(task, target, [event]);
    } catch (err) {
      error = err;
    }
    const options = task.options;
    if (options && typeof options === "object" && options.once) {
      const delegate2 = task.originalDelegate ? task.originalDelegate : task.callback;
      target[REMOVE_EVENT_LISTENER].call(target, event.type, delegate2, options);
    }
    return error;
  };
  function globalCallback(context, event, isCapture) {
    event = event || _global2.event;
    if (!event) {
      return;
    }
    const target = context || event.target || _global2;
    const tasks = target[zoneSymbolEventNames2[event.type][isCapture ? TRUE_STR : FALSE_STR]];
    if (tasks) {
      const errors = [];
      if (tasks.length === 1) {
        const err = invokeTask(tasks[0], target, event);
        err && errors.push(err);
      } else {
        const copyTasks = tasks.slice();
        for (let i = 0; i < copyTasks.length; i++) {
          if (event && event[IMMEDIATE_PROPAGATION_SYMBOL] === true) {
            break;
          }
          const err = invokeTask(copyTasks[i], target, event);
          err && errors.push(err);
        }
      }
      if (errors.length === 1) {
        throw errors[0];
      } else {
        for (let i = 0; i < errors.length; i++) {
          const err = errors[i];
          api.nativeScheduleMicroTask(() => {
            throw err;
          });
        }
      }
    }
  }
  const globalZoneAwareCallback = function(event) {
    return globalCallback(this, event, false);
  };
  const globalZoneAwareCaptureCallback = function(event) {
    return globalCallback(this, event, true);
  };
  function patchEventTargetMethods(obj, patchOptions2) {
    if (!obj) {
      return false;
    }
    let useGlobalCallback = true;
    if (patchOptions2 && patchOptions2.useG !== void 0) {
      useGlobalCallback = patchOptions2.useG;
    }
    const validateHandler = patchOptions2 && patchOptions2.vh;
    let checkDuplicate = true;
    if (patchOptions2 && patchOptions2.chkDup !== void 0) {
      checkDuplicate = patchOptions2.chkDup;
    }
    let returnTarget = false;
    if (patchOptions2 && patchOptions2.rt !== void 0) {
      returnTarget = patchOptions2.rt;
    }
    let proto = obj;
    while (proto && !proto.hasOwnProperty(ADD_EVENT_LISTENER)) {
      proto = ObjectGetPrototypeOf(proto);
    }
    if (!proto && obj[ADD_EVENT_LISTENER]) {
      proto = obj;
    }
    if (!proto) {
      return false;
    }
    if (proto[zoneSymbolAddEventListener]) {
      return false;
    }
    const eventNameToString = patchOptions2 && patchOptions2.eventNameToString;
    const taskData = {};
    const nativeAddEventListener = proto[zoneSymbolAddEventListener] = proto[ADD_EVENT_LISTENER];
    const nativeRemoveEventListener = proto[zoneSymbol(REMOVE_EVENT_LISTENER)] = proto[REMOVE_EVENT_LISTENER];
    const nativeListeners = proto[zoneSymbol(LISTENERS_EVENT_LISTENER)] = proto[LISTENERS_EVENT_LISTENER];
    const nativeRemoveAllListeners = proto[zoneSymbol(REMOVE_ALL_LISTENERS_EVENT_LISTENER)] = proto[REMOVE_ALL_LISTENERS_EVENT_LISTENER];
    let nativePrependEventListener;
    if (patchOptions2 && patchOptions2.prepend) {
      nativePrependEventListener = proto[zoneSymbol(patchOptions2.prepend)] = proto[patchOptions2.prepend];
    }
    function buildEventListenerOptions(options, passive) {
      if (!passive) {
        return options;
      }
      if (typeof options === "boolean") {
        return { capture: options, passive: true };
      }
      if (!options) {
        return { passive: true };
      }
      if (typeof options === "object" && options.passive !== false) {
        return __spreadProps2(__spreadValues2({}, options), { passive: true });
      }
      return options;
    }
    const customScheduleGlobal = function(task) {
      if (taskData.isExisting) {
        return;
      }
      return nativeAddEventListener.call(taskData.target, taskData.eventName, taskData.capture ? globalZoneAwareCaptureCallback : globalZoneAwareCallback, taskData.options);
    };
    const customCancelGlobal = function(task) {
      if (!task.isRemoved) {
        const symbolEventNames = zoneSymbolEventNames2[task.eventName];
        let symbolEventName;
        if (symbolEventNames) {
          symbolEventName = symbolEventNames[task.capture ? TRUE_STR : FALSE_STR];
        }
        const existingTasks = symbolEventName && task.target[symbolEventName];
        if (existingTasks) {
          for (let i = 0; i < existingTasks.length; i++) {
            const existingTask = existingTasks[i];
            if (existingTask === task) {
              existingTasks.splice(i, 1);
              task.isRemoved = true;
              if (task.removeAbortListener) {
                task.removeAbortListener();
                task.removeAbortListener = null;
              }
              if (existingTasks.length === 0) {
                task.allRemoved = true;
                task.target[symbolEventName] = null;
              }
              break;
            }
          }
        }
      }
      if (!task.allRemoved) {
        return;
      }
      return nativeRemoveEventListener.call(task.target, task.eventName, task.capture ? globalZoneAwareCaptureCallback : globalZoneAwareCallback, task.options);
    };
    const customScheduleNonGlobal = function(task) {
      return nativeAddEventListener.call(taskData.target, taskData.eventName, task.invoke, taskData.options);
    };
    const customSchedulePrepend = function(task) {
      return nativePrependEventListener.call(taskData.target, taskData.eventName, task.invoke, taskData.options);
    };
    const customCancelNonGlobal = function(task) {
      return nativeRemoveEventListener.call(task.target, task.eventName, task.invoke, task.options);
    };
    const customSchedule = useGlobalCallback ? customScheduleGlobal : customScheduleNonGlobal;
    const customCancel = useGlobalCallback ? customCancelGlobal : customCancelNonGlobal;
    const compareTaskCallbackVsDelegate = function(task, delegate) {
      const typeOfDelegate = typeof delegate;
      return typeOfDelegate === "function" && task.callback === delegate || typeOfDelegate === "object" && task.originalDelegate === delegate;
    };
    const compare = (patchOptions2 == null ? void 0 : patchOptions2.diff) || compareTaskCallbackVsDelegate;
    const unpatchedEvents = Zone[zoneSymbol("UNPATCHED_EVENTS")];
    const passiveEvents = _global2[zoneSymbol("PASSIVE_EVENTS")];
    function copyEventListenerOptions(options) {
      if (typeof options === "object" && options !== null) {
        const newOptions = __spreadValues2({}, options);
        if (options.signal) {
          newOptions.signal = options.signal;
        }
        return newOptions;
      }
      return options;
    }
    const makeAddListener = function(nativeListener, addSource, customScheduleFn, customCancelFn, returnTarget2 = false, prepend = false) {
      return function() {
        const target = this || _global2;
        let eventName = arguments[0];
        if (patchOptions2 && patchOptions2.transferEventName) {
          eventName = patchOptions2.transferEventName(eventName);
        }
        let delegate = arguments[1];
        if (!delegate) {
          return nativeListener.apply(this, arguments);
        }
        if (isNode && eventName === "uncaughtException") {
          return nativeListener.apply(this, arguments);
        }
        let isEventListenerObject = false;
        if (typeof delegate !== "function") {
          if (!delegate.handleEvent) {
            return nativeListener.apply(this, arguments);
          }
          isEventListenerObject = true;
        }
        if (validateHandler && !validateHandler(nativeListener, delegate, target, arguments)) {
          return;
        }
        const passive = !!passiveEvents && passiveEvents.indexOf(eventName) !== -1;
        const options = copyEventListenerOptions(buildEventListenerOptions(arguments[2], passive));
        const signal2 = options == null ? void 0 : options.signal;
        if (signal2 == null ? void 0 : signal2.aborted) {
          return;
        }
        if (unpatchedEvents) {
          for (let i = 0; i < unpatchedEvents.length; i++) {
            if (eventName === unpatchedEvents[i]) {
              if (passive) {
                return nativeListener.call(target, eventName, delegate, options);
              } else {
                return nativeListener.apply(this, arguments);
              }
            }
          }
        }
        const capture = !options ? false : typeof options === "boolean" ? true : options.capture;
        const once = options && typeof options === "object" ? options.once : false;
        const zone = Zone.current;
        let symbolEventNames = zoneSymbolEventNames2[eventName];
        if (!symbolEventNames) {
          prepareEventNames(eventName, eventNameToString);
          symbolEventNames = zoneSymbolEventNames2[eventName];
        }
        const symbolEventName = symbolEventNames[capture ? TRUE_STR : FALSE_STR];
        let existingTasks = target[symbolEventName];
        let isExisting = false;
        if (existingTasks) {
          isExisting = true;
          if (checkDuplicate) {
            for (let i = 0; i < existingTasks.length; i++) {
              if (compare(existingTasks[i], delegate)) {
                return;
              }
            }
          }
        } else {
          existingTasks = target[symbolEventName] = [];
        }
        let source;
        const constructorName = target.constructor["name"];
        const targetSource = globalSources[constructorName];
        if (targetSource) {
          source = targetSource[eventName];
        }
        if (!source) {
          source = constructorName + addSource + (eventNameToString ? eventNameToString(eventName) : eventName);
        }
        taskData.options = options;
        if (once) {
          taskData.options.once = false;
        }
        taskData.target = target;
        taskData.capture = capture;
        taskData.eventName = eventName;
        taskData.isExisting = isExisting;
        const data = useGlobalCallback ? OPTIMIZED_ZONE_EVENT_TASK_DATA : void 0;
        if (data) {
          data.taskData = taskData;
        }
        if (signal2) {
          taskData.options.signal = void 0;
        }
        const task = zone.scheduleEventTask(source, delegate, data, customScheduleFn, customCancelFn);
        if (signal2) {
          taskData.options.signal = signal2;
          const onAbort = () => task.zone.cancelTask(task);
          nativeListener.call(signal2, "abort", onAbort, { once: true });
          task.removeAbortListener = () => signal2.removeEventListener("abort", onAbort);
        }
        taskData.target = null;
        if (data) {
          data.taskData = null;
        }
        if (once) {
          taskData.options.once = true;
        }
        if (typeof task.options !== "boolean") {
          task.options = options;
        }
        task.target = target;
        task.capture = capture;
        task.eventName = eventName;
        if (isEventListenerObject) {
          task.originalDelegate = delegate;
        }
        if (!prepend) {
          existingTasks.push(task);
        } else {
          existingTasks.unshift(task);
        }
        if (returnTarget2) {
          return target;
        }
      };
    };
    proto[ADD_EVENT_LISTENER] = makeAddListener(nativeAddEventListener, ADD_EVENT_LISTENER_SOURCE, customSchedule, customCancel, returnTarget);
    if (nativePrependEventListener) {
      proto[PREPEND_EVENT_LISTENER] = makeAddListener(nativePrependEventListener, PREPEND_EVENT_LISTENER_SOURCE, customSchedulePrepend, customCancel, returnTarget, true);
    }
    proto[REMOVE_EVENT_LISTENER] = function() {
      const target = this || _global2;
      let eventName = arguments[0];
      if (patchOptions2 && patchOptions2.transferEventName) {
        eventName = patchOptions2.transferEventName(eventName);
      }
      const options = arguments[2];
      const capture = !options ? false : typeof options === "boolean" ? true : options.capture;
      const delegate = arguments[1];
      if (!delegate) {
        return nativeRemoveEventListener.apply(this, arguments);
      }
      if (validateHandler && !validateHandler(nativeRemoveEventListener, delegate, target, arguments)) {
        return;
      }
      const symbolEventNames = zoneSymbolEventNames2[eventName];
      let symbolEventName;
      if (symbolEventNames) {
        symbolEventName = symbolEventNames[capture ? TRUE_STR : FALSE_STR];
      }
      const existingTasks = symbolEventName && target[symbolEventName];
      if (existingTasks) {
        for (let i = 0; i < existingTasks.length; i++) {
          const existingTask = existingTasks[i];
          if (compare(existingTask, delegate)) {
            existingTasks.splice(i, 1);
            existingTask.isRemoved = true;
            if (existingTasks.length === 0) {
              existingTask.allRemoved = true;
              target[symbolEventName] = null;
              if (!capture && typeof eventName === "string") {
                const onPropertySymbol = ZONE_SYMBOL_PREFIX + "ON_PROPERTY" + eventName;
                target[onPropertySymbol] = null;
              }
            }
            existingTask.zone.cancelTask(existingTask);
            if (returnTarget) {
              return target;
            }
            return;
          }
        }
      }
      return nativeRemoveEventListener.apply(this, arguments);
    };
    proto[LISTENERS_EVENT_LISTENER] = function() {
      const target = this || _global2;
      let eventName = arguments[0];
      if (patchOptions2 && patchOptions2.transferEventName) {
        eventName = patchOptions2.transferEventName(eventName);
      }
      const listeners = [];
      const tasks = findEventTasks(target, eventNameToString ? eventNameToString(eventName) : eventName);
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        let delegate = task.originalDelegate ? task.originalDelegate : task.callback;
        listeners.push(delegate);
      }
      return listeners;
    };
    proto[REMOVE_ALL_LISTENERS_EVENT_LISTENER] = function() {
      const target = this || _global2;
      let eventName = arguments[0];
      if (!eventName) {
        const keys = Object.keys(target);
        for (let i = 0; i < keys.length; i++) {
          const prop = keys[i];
          const match = EVENT_NAME_SYMBOL_REGX.exec(prop);
          let evtName = match && match[1];
          if (evtName && evtName !== "removeListener") {
            this[REMOVE_ALL_LISTENERS_EVENT_LISTENER].call(this, evtName);
          }
        }
        this[REMOVE_ALL_LISTENERS_EVENT_LISTENER].call(this, "removeListener");
      } else {
        if (patchOptions2 && patchOptions2.transferEventName) {
          eventName = patchOptions2.transferEventName(eventName);
        }
        const symbolEventNames = zoneSymbolEventNames2[eventName];
        if (symbolEventNames) {
          const symbolEventName = symbolEventNames[FALSE_STR];
          const symbolCaptureEventName = symbolEventNames[TRUE_STR];
          const tasks = target[symbolEventName];
          const captureTasks = target[symbolCaptureEventName];
          if (tasks) {
            const removeTasks = tasks.slice();
            for (let i = 0; i < removeTasks.length; i++) {
              const task = removeTasks[i];
              let delegate = task.originalDelegate ? task.originalDelegate : task.callback;
              this[REMOVE_EVENT_LISTENER].call(this, eventName, delegate, task.options);
            }
          }
          if (captureTasks) {
            const removeTasks = captureTasks.slice();
            for (let i = 0; i < removeTasks.length; i++) {
              const task = removeTasks[i];
              let delegate = task.originalDelegate ? task.originalDelegate : task.callback;
              this[REMOVE_EVENT_LISTENER].call(this, eventName, delegate, task.options);
            }
          }
        }
      }
      if (returnTarget) {
        return this;
      }
    };
    attachOriginToPatched(proto[ADD_EVENT_LISTENER], nativeAddEventListener);
    attachOriginToPatched(proto[REMOVE_EVENT_LISTENER], nativeRemoveEventListener);
    if (nativeRemoveAllListeners) {
      attachOriginToPatched(proto[REMOVE_ALL_LISTENERS_EVENT_LISTENER], nativeRemoveAllListeners);
    }
    if (nativeListeners) {
      attachOriginToPatched(proto[LISTENERS_EVENT_LISTENER], nativeListeners);
    }
    return true;
  }
  let results = [];
  for (let i = 0; i < apis.length; i++) {
    results[i] = patchEventTargetMethods(apis[i], patchOptions);
  }
  return results;
}
function findEventTasks(target, eventName) {
  if (!eventName) {
    const foundTasks = [];
    for (let prop in target) {
      const match = EVENT_NAME_SYMBOL_REGX.exec(prop);
      let evtName = match && match[1];
      if (evtName && (!eventName || evtName === eventName)) {
        const tasks = target[prop];
        if (tasks) {
          for (let i = 0; i < tasks.length; i++) {
            foundTasks.push(tasks[i]);
          }
        }
      }
    }
    return foundTasks;
  }
  let symbolEventName = zoneSymbolEventNames2[eventName];
  if (!symbolEventName) {
    prepareEventNames(eventName);
    symbolEventName = zoneSymbolEventNames2[eventName];
  }
  const captureFalseTasks = target[symbolEventName[FALSE_STR]];
  const captureTrueTasks = target[symbolEventName[TRUE_STR]];
  if (!captureFalseTasks) {
    return captureTrueTasks ? captureTrueTasks.slice() : [];
  } else {
    return captureTrueTasks ? captureFalseTasks.concat(captureTrueTasks) : captureFalseTasks.slice();
  }
}
function patchEventPrototype(global2, api) {
  const Event = global2["Event"];
  if (Event && Event.prototype) {
    api.patchMethod(Event.prototype, "stopImmediatePropagation", (delegate) => function(self2, args) {
      self2[IMMEDIATE_PROPAGATION_SYMBOL] = true;
      delegate && delegate.apply(self2, args);
    });
  }
}
function patchQueueMicrotask(global2, api) {
  api.patchMethod(global2, "queueMicrotask", (delegate) => {
    return function(self2, args) {
      Zone.current.scheduleMicroTask("queueMicrotask", args[0]);
    };
  });
}
var taskSymbol = zoneSymbol("zoneTask");
function patchTimer(window2, setName, cancelName, nameSuffix) {
  let setNative = null;
  let clearNative = null;
  setName += nameSuffix;
  cancelName += nameSuffix;
  const tasksByHandleId = {};
  function scheduleTask(task) {
    const data = task.data;
    data.args[0] = function() {
      return task.invoke.apply(this, arguments);
    };
    const handleOrId = setNative.apply(window2, data.args);
    if (isNumber(handleOrId)) {
      data.handleId = handleOrId;
    } else {
      data.handle = handleOrId;
      data.isRefreshable = isFunction(handleOrId.refresh);
    }
    return task;
  }
  function clearTask(task) {
    const { handle, handleId } = task.data;
    return clearNative.call(window2, handle != null ? handle : handleId);
  }
  setNative = patchMethod(window2, setName, (delegate) => function(self2, args) {
    var _a;
    if (isFunction(args[0])) {
      const options = {
        isRefreshable: false,
        isPeriodic: nameSuffix === "Interval",
        delay: nameSuffix === "Timeout" || nameSuffix === "Interval" ? args[1] || 0 : void 0,
        args
      };
      const callback = args[0];
      args[0] = function timer() {
        try {
          return callback.apply(this, arguments);
        } finally {
          const { handle: handle2, handleId: handleId2, isPeriodic: isPeriodic2, isRefreshable: isRefreshable2 } = options;
          if (!isPeriodic2 && !isRefreshable2) {
            if (handleId2) {
              delete tasksByHandleId[handleId2];
            } else if (handle2) {
              handle2[taskSymbol] = null;
            }
          }
        }
      };
      const task = scheduleMacroTaskWithCurrentZone(setName, args[0], options, scheduleTask, clearTask);
      if (!task) {
        return task;
      }
      const { handleId, handle, isRefreshable, isPeriodic } = task.data;
      if (handleId) {
        tasksByHandleId[handleId] = task;
      } else if (handle) {
        handle[taskSymbol] = task;
        if (isRefreshable && !isPeriodic) {
          const originalRefresh = handle.refresh;
          handle.refresh = function() {
            const { zone, state } = task;
            if (state === "notScheduled") {
              task._state = "scheduled";
              zone._updateTaskCount(task, 1);
            } else if (state === "running") {
              task._state = "scheduling";
            }
            return originalRefresh.call(this);
          };
        }
      }
      return (_a = handle != null ? handle : handleId) != null ? _a : task;
    } else {
      return delegate.apply(window2, args);
    }
  });
  clearNative = patchMethod(window2, cancelName, (delegate) => function(self2, args) {
    const id = args[0];
    let task;
    if (isNumber(id)) {
      task = tasksByHandleId[id];
      delete tasksByHandleId[id];
    } else {
      task = id == null ? void 0 : id[taskSymbol];
      if (task) {
        id[taskSymbol] = null;
      } else {
        task = id;
      }
    }
    if (task == null ? void 0 : task.type) {
      if (task.cancelFn) {
        task.zone.cancelTask(task);
      }
    } else {
      delegate.apply(window2, args);
    }
  });
}
function patchCustomElements(_global2, api) {
  const { isBrowser: isBrowser2, isMix: isMix2 } = api.getGlobalObjects();
  if (!isBrowser2 && !isMix2 || !_global2["customElements"] || !("customElements" in _global2)) {
    return;
  }
  const callbacks = [
    "connectedCallback",
    "disconnectedCallback",
    "adoptedCallback",
    "attributeChangedCallback",
    "formAssociatedCallback",
    "formDisabledCallback",
    "formResetCallback",
    "formStateRestoreCallback"
  ];
  api.patchCallbacks(api, _global2.customElements, "customElements", "define", callbacks);
}
function eventTargetPatch(_global2, api) {
  if (Zone[api.symbol("patchEventTarget")]) {
    return;
  }
  const { eventNames, zoneSymbolEventNames: zoneSymbolEventNames3, TRUE_STR: TRUE_STR2, FALSE_STR: FALSE_STR2, ZONE_SYMBOL_PREFIX: ZONE_SYMBOL_PREFIX2 } = api.getGlobalObjects();
  for (let i = 0; i < eventNames.length; i++) {
    const eventName = eventNames[i];
    const falseEventName = eventName + FALSE_STR2;
    const trueEventName = eventName + TRUE_STR2;
    const symbol = ZONE_SYMBOL_PREFIX2 + falseEventName;
    const symbolCapture = ZONE_SYMBOL_PREFIX2 + trueEventName;
    zoneSymbolEventNames3[eventName] = {};
    zoneSymbolEventNames3[eventName][FALSE_STR2] = symbol;
    zoneSymbolEventNames3[eventName][TRUE_STR2] = symbolCapture;
  }
  const EVENT_TARGET = _global2["EventTarget"];
  if (!EVENT_TARGET || !EVENT_TARGET.prototype) {
    return;
  }
  api.patchEventTarget(_global2, api, [EVENT_TARGET && EVENT_TARGET.prototype]);
  return true;
}
function patchEvent(global2, api) {
  api.patchEventPrototype(global2, api);
}
function filterProperties(target, onProperties, ignoreProperties) {
  if (!ignoreProperties || ignoreProperties.length === 0) {
    return onProperties;
  }
  const tip = ignoreProperties.filter((ip) => ip.target === target);
  if (tip.length === 0) {
    return onProperties;
  }
  const targetIgnoreProperties = tip[0].ignoreProperties;
  return onProperties.filter((op) => targetIgnoreProperties.indexOf(op) === -1);
}
function patchFilteredProperties(target, onProperties, ignoreProperties, prototype) {
  if (!target) {
    return;
  }
  const filteredProperties = filterProperties(target, onProperties, ignoreProperties);
  patchOnProperties(target, filteredProperties, prototype);
}
function getOnEventNames(target) {
  return Object.getOwnPropertyNames(target).filter((name) => name.startsWith("on") && name.length > 2).map((name) => name.substring(2));
}
function propertyDescriptorPatch(api, _global2) {
  if (isNode && !isMix) {
    return;
  }
  if (Zone[api.symbol("patchEvents")]) {
    return;
  }
  const ignoreProperties = _global2["__Zone_ignore_on_properties"];
  let patchTargets = [];
  if (isBrowser) {
    const internalWindow2 = window;
    patchTargets = patchTargets.concat([
      "Document",
      "SVGElement",
      "Element",
      "HTMLElement",
      "HTMLBodyElement",
      "HTMLMediaElement",
      "HTMLFrameSetElement",
      "HTMLFrameElement",
      "HTMLIFrameElement",
      "HTMLMarqueeElement",
      "Worker"
    ]);
    patchFilteredProperties(internalWindow2, getOnEventNames(internalWindow2), ignoreProperties, ObjectGetPrototypeOf(internalWindow2));
  }
  patchTargets = patchTargets.concat([
    "XMLHttpRequest",
    "XMLHttpRequestEventTarget",
    "IDBIndex",
    "IDBRequest",
    "IDBOpenDBRequest",
    "IDBDatabase",
    "IDBTransaction",
    "IDBCursor",
    "WebSocket"
  ]);
  for (let i = 0; i < patchTargets.length; i++) {
    const target = _global2[patchTargets[i]];
    (target == null ? void 0 : target.prototype) && patchFilteredProperties(target.prototype, getOnEventNames(target.prototype), ignoreProperties);
  }
}
function patchBrowser(Zone3) {
  Zone3.__load_patch("timers", (global2) => {
    const set = "set";
    const clear = "clear";
    patchTimer(global2, set, clear, "Timeout");
    patchTimer(global2, set, clear, "Interval");
    patchTimer(global2, set, clear, "Immediate");
  });
  Zone3.__load_patch("requestAnimationFrame", (global2) => {
    patchTimer(global2, "request", "cancel", "AnimationFrame");
    patchTimer(global2, "mozRequest", "mozCancel", "AnimationFrame");
    patchTimer(global2, "webkitRequest", "webkitCancel", "AnimationFrame");
  });
  Zone3.__load_patch("blocking", (global2, Zone4) => {
    const blockingMethods = ["alert", "prompt", "confirm"];
    for (let i = 0; i < blockingMethods.length; i++) {
      const name = blockingMethods[i];
      patchMethod(global2, name, (delegate, symbol, name2) => {
        return function(s, args) {
          return Zone4.current.run(delegate, global2, args, name2);
        };
      });
    }
  });
  Zone3.__load_patch("EventTarget", (global2, Zone4, api) => {
    patchEvent(global2, api);
    eventTargetPatch(global2, api);
    const XMLHttpRequestEventTarget = global2["XMLHttpRequestEventTarget"];
    if (XMLHttpRequestEventTarget && XMLHttpRequestEventTarget.prototype) {
      api.patchEventTarget(global2, api, [XMLHttpRequestEventTarget.prototype]);
    }
  });
  Zone3.__load_patch("MutationObserver", (global2, Zone4, api) => {
    patchClass("MutationObserver");
    patchClass("WebKitMutationObserver");
  });
  Zone3.__load_patch("IntersectionObserver", (global2, Zone4, api) => {
    patchClass("IntersectionObserver");
  });
  Zone3.__load_patch("FileReader", (global2, Zone4, api) => {
    patchClass("FileReader");
  });
  Zone3.__load_patch("on_property", (global2, Zone4, api) => {
    propertyDescriptorPatch(api, global2);
  });
  Zone3.__load_patch("customElements", (global2, Zone4, api) => {
    patchCustomElements(global2, api);
  });
  Zone3.__load_patch("XHR", (global2, Zone4) => {
    patchXHR(global2);
    const XHR_TASK = zoneSymbol("xhrTask");
    const XHR_SYNC = zoneSymbol("xhrSync");
    const XHR_LISTENER = zoneSymbol("xhrListener");
    const XHR_SCHEDULED = zoneSymbol("xhrScheduled");
    const XHR_URL = zoneSymbol("xhrURL");
    const XHR_ERROR_BEFORE_SCHEDULED = zoneSymbol("xhrErrorBeforeScheduled");
    function patchXHR(window2) {
      const XMLHttpRequest = window2["XMLHttpRequest"];
      if (!XMLHttpRequest) {
        return;
      }
      const XMLHttpRequestPrototype = XMLHttpRequest.prototype;
      function findPendingTask(target) {
        return target[XHR_TASK];
      }
      let oriAddListener = XMLHttpRequestPrototype[ZONE_SYMBOL_ADD_EVENT_LISTENER];
      let oriRemoveListener = XMLHttpRequestPrototype[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
      if (!oriAddListener) {
        const XMLHttpRequestEventTarget = window2["XMLHttpRequestEventTarget"];
        if (XMLHttpRequestEventTarget) {
          const XMLHttpRequestEventTargetPrototype = XMLHttpRequestEventTarget.prototype;
          oriAddListener = XMLHttpRequestEventTargetPrototype[ZONE_SYMBOL_ADD_EVENT_LISTENER];
          oriRemoveListener = XMLHttpRequestEventTargetPrototype[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
        }
      }
      const READY_STATE_CHANGE = "readystatechange";
      const SCHEDULED = "scheduled";
      function scheduleTask(task) {
        const data = task.data;
        const target = data.target;
        target[XHR_SCHEDULED] = false;
        target[XHR_ERROR_BEFORE_SCHEDULED] = false;
        const listener = target[XHR_LISTENER];
        if (!oriAddListener) {
          oriAddListener = target[ZONE_SYMBOL_ADD_EVENT_LISTENER];
          oriRemoveListener = target[ZONE_SYMBOL_REMOVE_EVENT_LISTENER];
        }
        if (listener) {
          oriRemoveListener.call(target, READY_STATE_CHANGE, listener);
        }
        const newListener = target[XHR_LISTENER] = () => {
          if (target.readyState === target.DONE) {
            if (!data.aborted && target[XHR_SCHEDULED] && task.state === SCHEDULED) {
              const loadTasks = target[Zone4.__symbol__("loadfalse")];
              if (target.status !== 0 && loadTasks && loadTasks.length > 0) {
                const oriInvoke = task.invoke;
                task.invoke = function() {
                  const loadTasks2 = target[Zone4.__symbol__("loadfalse")];
                  for (let i = 0; i < loadTasks2.length; i++) {
                    if (loadTasks2[i] === task) {
                      loadTasks2.splice(i, 1);
                    }
                  }
                  if (!data.aborted && task.state === SCHEDULED) {
                    oriInvoke.call(task);
                  }
                };
                loadTasks.push(task);
              } else {
                task.invoke();
              }
            } else if (!data.aborted && target[XHR_SCHEDULED] === false) {
              target[XHR_ERROR_BEFORE_SCHEDULED] = true;
            }
          }
        };
        oriAddListener.call(target, READY_STATE_CHANGE, newListener);
        const storedTask = target[XHR_TASK];
        if (!storedTask) {
          target[XHR_TASK] = task;
        }
        sendNative.apply(target, data.args);
        target[XHR_SCHEDULED] = true;
        return task;
      }
      function placeholderCallback() {
      }
      function clearTask(task) {
        const data = task.data;
        data.aborted = true;
        return abortNative.apply(data.target, data.args);
      }
      const openNative = patchMethod(XMLHttpRequestPrototype, "open", () => function(self2, args) {
        self2[XHR_SYNC] = args[2] == false;
        self2[XHR_URL] = args[1];
        return openNative.apply(self2, args);
      });
      const XMLHTTPREQUEST_SOURCE = "XMLHttpRequest.send";
      const fetchTaskAborting = zoneSymbol("fetchTaskAborting");
      const fetchTaskScheduling = zoneSymbol("fetchTaskScheduling");
      const sendNative = patchMethod(XMLHttpRequestPrototype, "send", () => function(self2, args) {
        if (Zone4.current[fetchTaskScheduling] === true) {
          return sendNative.apply(self2, args);
        }
        if (self2[XHR_SYNC]) {
          return sendNative.apply(self2, args);
        } else {
          const options = {
            target: self2,
            url: self2[XHR_URL],
            isPeriodic: false,
            args,
            aborted: false
          };
          const task = scheduleMacroTaskWithCurrentZone(XMLHTTPREQUEST_SOURCE, placeholderCallback, options, scheduleTask, clearTask);
          if (self2 && self2[XHR_ERROR_BEFORE_SCHEDULED] === true && !options.aborted && task.state === SCHEDULED) {
            task.invoke();
          }
        }
      });
      const abortNative = patchMethod(XMLHttpRequestPrototype, "abort", () => function(self2, args) {
        const task = findPendingTask(self2);
        if (task && typeof task.type == "string") {
          if (task.cancelFn == null || task.data && task.data.aborted) {
            return;
          }
          task.zone.cancelTask(task);
        } else if (Zone4.current[fetchTaskAborting] === true) {
          return abortNative.apply(self2, args);
        }
      });
    }
  });
  Zone3.__load_patch("geolocation", (global2) => {
    if (global2["navigator"] && global2["navigator"].geolocation) {
      patchPrototype(global2["navigator"].geolocation, ["getCurrentPosition", "watchPosition"]);
    }
  });
  Zone3.__load_patch("PromiseRejectionEvent", (global2, Zone4) => {
    function findPromiseRejectionHandler(evtName) {
      return function(e) {
        const eventTasks = findEventTasks(global2, evtName);
        eventTasks.forEach((eventTask) => {
          const PromiseRejectionEvent = global2["PromiseRejectionEvent"];
          if (PromiseRejectionEvent) {
            const evt = new PromiseRejectionEvent(evtName, {
              promise: e.promise,
              reason: e.rejection
            });
            eventTask.invoke(evt);
          }
        });
      };
    }
    if (global2["PromiseRejectionEvent"]) {
      Zone4[zoneSymbol("unhandledPromiseRejectionHandler")] = findPromiseRejectionHandler("unhandledrejection");
      Zone4[zoneSymbol("rejectionHandledHandler")] = findPromiseRejectionHandler("rejectionhandled");
    }
  });
  Zone3.__load_patch("queueMicrotask", (global2, Zone4, api) => {
    patchQueueMicrotask(global2, api);
  });
}
function patchPromise(Zone3) {
  Zone3.__load_patch("ZoneAwarePromise", (global2, Zone4, api) => {
    const ObjectGetOwnPropertyDescriptor2 = Object.getOwnPropertyDescriptor;
    const ObjectDefineProperty2 = Object.defineProperty;
    function readableObjectToString(obj) {
      if (obj && obj.toString === Object.prototype.toString) {
        const className = obj.constructor && obj.constructor.name;
        return (className ? className : "") + ": " + JSON.stringify(obj);
      }
      return obj ? obj.toString() : Object.prototype.toString.call(obj);
    }
    const __symbol__2 = api.symbol;
    const _uncaughtPromiseErrors = [];
    const isDisableWrappingUncaughtPromiseRejection = global2[__symbol__2("DISABLE_WRAPPING_UNCAUGHT_PROMISE_REJECTION")] !== false;
    const symbolPromise = __symbol__2("Promise");
    const symbolThen = __symbol__2("then");
    const creationTrace = "__creationTrace__";
    api.onUnhandledError = (e) => {
      if (api.showUncaughtError()) {
        const rejection = e && e.rejection;
        if (rejection) {
          console.error("Unhandled Promise rejection:", rejection instanceof Error ? rejection.message : rejection, "; Zone:", e.zone.name, "; Task:", e.task && e.task.source, "; Value:", rejection, rejection instanceof Error ? rejection.stack : void 0);
        } else {
          console.error(e);
        }
      }
    };
    api.microtaskDrainDone = () => {
      while (_uncaughtPromiseErrors.length) {
        const uncaughtPromiseError = _uncaughtPromiseErrors.shift();
        try {
          uncaughtPromiseError.zone.runGuarded(() => {
            if (uncaughtPromiseError.throwOriginal) {
              throw uncaughtPromiseError.rejection;
            }
            throw uncaughtPromiseError;
          });
        } catch (error) {
          handleUnhandledRejection(error);
        }
      }
    };
    const UNHANDLED_PROMISE_REJECTION_HANDLER_SYMBOL = __symbol__2("unhandledPromiseRejectionHandler");
    function handleUnhandledRejection(e) {
      api.onUnhandledError(e);
      try {
        const handler = Zone4[UNHANDLED_PROMISE_REJECTION_HANDLER_SYMBOL];
        if (typeof handler === "function") {
          handler.call(this, e);
        }
      } catch (err) {
      }
    }
    function isThenable(value) {
      return value && typeof value.then === "function";
    }
    function forwardResolution(value) {
      return value;
    }
    function forwardRejection(rejection) {
      return ZoneAwarePromise.reject(rejection);
    }
    const symbolState = __symbol__2("state");
    const symbolValue = __symbol__2("value");
    const symbolFinally = __symbol__2("finally");
    const symbolParentPromiseValue = __symbol__2("parentPromiseValue");
    const symbolParentPromiseState = __symbol__2("parentPromiseState");
    const source = "Promise.then";
    const UNRESOLVED = null;
    const RESOLVED = true;
    const REJECTED = false;
    const REJECTED_NO_CATCH = 0;
    function makeResolver(promise, state) {
      return (v) => {
        try {
          resolvePromise(promise, state, v);
        } catch (err) {
          resolvePromise(promise, false, err);
        }
      };
    }
    const once = function() {
      let wasCalled = false;
      return function wrapper(wrappedFunction) {
        return function() {
          if (wasCalled) {
            return;
          }
          wasCalled = true;
          wrappedFunction.apply(null, arguments);
        };
      };
    };
    const TYPE_ERROR = "Promise resolved with itself";
    const CURRENT_TASK_TRACE_SYMBOL = __symbol__2("currentTaskTrace");
    function resolvePromise(promise, state, value) {
      const onceWrapper = once();
      if (promise === value) {
        throw new TypeError(TYPE_ERROR);
      }
      if (promise[symbolState] === UNRESOLVED) {
        let then = null;
        try {
          if (typeof value === "object" || typeof value === "function") {
            then = value && value.then;
          }
        } catch (err) {
          onceWrapper(() => {
            resolvePromise(promise, false, err);
          })();
          return promise;
        }
        if (state !== REJECTED && value instanceof ZoneAwarePromise && value.hasOwnProperty(symbolState) && value.hasOwnProperty(symbolValue) && value[symbolState] !== UNRESOLVED) {
          clearRejectedNoCatch(value);
          resolvePromise(promise, value[symbolState], value[symbolValue]);
        } else if (state !== REJECTED && typeof then === "function") {
          try {
            then.call(value, onceWrapper(makeResolver(promise, state)), onceWrapper(makeResolver(promise, false)));
          } catch (err) {
            onceWrapper(() => {
              resolvePromise(promise, false, err);
            })();
          }
        } else {
          promise[symbolState] = state;
          const queue = promise[symbolValue];
          promise[symbolValue] = value;
          if (promise[symbolFinally] === symbolFinally) {
            if (state === RESOLVED) {
              promise[symbolState] = promise[symbolParentPromiseState];
              promise[symbolValue] = promise[symbolParentPromiseValue];
            }
          }
          if (state === REJECTED && value instanceof Error) {
            const trace = Zone4.currentTask && Zone4.currentTask.data && Zone4.currentTask.data[creationTrace];
            if (trace) {
              ObjectDefineProperty2(value, CURRENT_TASK_TRACE_SYMBOL, {
                configurable: true,
                enumerable: false,
                writable: true,
                value: trace
              });
            }
          }
          for (let i = 0; i < queue.length; ) {
            scheduleResolveOrReject(promise, queue[i++], queue[i++], queue[i++], queue[i++]);
          }
          if (queue.length == 0 && state == REJECTED) {
            promise[symbolState] = REJECTED_NO_CATCH;
            let uncaughtPromiseError = value;
            try {
              throw new Error("Uncaught (in promise): " + readableObjectToString(value) + (value && value.stack ? "\n" + value.stack : ""));
            } catch (err) {
              uncaughtPromiseError = err;
            }
            if (isDisableWrappingUncaughtPromiseRejection) {
              uncaughtPromiseError.throwOriginal = true;
            }
            uncaughtPromiseError.rejection = value;
            uncaughtPromiseError.promise = promise;
            uncaughtPromiseError.zone = Zone4.current;
            uncaughtPromiseError.task = Zone4.currentTask;
            _uncaughtPromiseErrors.push(uncaughtPromiseError);
            api.scheduleMicroTask();
          }
        }
      }
      return promise;
    }
    const REJECTION_HANDLED_HANDLER = __symbol__2("rejectionHandledHandler");
    function clearRejectedNoCatch(promise) {
      if (promise[symbolState] === REJECTED_NO_CATCH) {
        try {
          const handler = Zone4[REJECTION_HANDLED_HANDLER];
          if (handler && typeof handler === "function") {
            handler.call(this, { rejection: promise[symbolValue], promise });
          }
        } catch (err) {
        }
        promise[symbolState] = REJECTED;
        for (let i = 0; i < _uncaughtPromiseErrors.length; i++) {
          if (promise === _uncaughtPromiseErrors[i].promise) {
            _uncaughtPromiseErrors.splice(i, 1);
          }
        }
      }
    }
    function scheduleResolveOrReject(promise, zone, chainPromise, onFulfilled, onRejected) {
      clearRejectedNoCatch(promise);
      const promiseState = promise[symbolState];
      const delegate = promiseState ? typeof onFulfilled === "function" ? onFulfilled : forwardResolution : typeof onRejected === "function" ? onRejected : forwardRejection;
      zone.scheduleMicroTask(source, () => {
        try {
          const parentPromiseValue = promise[symbolValue];
          const isFinallyPromise = !!chainPromise && symbolFinally === chainPromise[symbolFinally];
          if (isFinallyPromise) {
            chainPromise[symbolParentPromiseValue] = parentPromiseValue;
            chainPromise[symbolParentPromiseState] = promiseState;
          }
          const value = zone.run(delegate, void 0, isFinallyPromise && delegate !== forwardRejection && delegate !== forwardResolution ? [] : [parentPromiseValue]);
          resolvePromise(chainPromise, true, value);
        } catch (error) {
          resolvePromise(chainPromise, false, error);
        }
      }, chainPromise);
    }
    const ZONE_AWARE_PROMISE_TO_STRING = "function ZoneAwarePromise() { [native code] }";
    const noop = function() {
    };
    const AggregateError = global2.AggregateError;
    class ZoneAwarePromise {
      static toString() {
        return ZONE_AWARE_PROMISE_TO_STRING;
      }
      static resolve(value) {
        if (value instanceof ZoneAwarePromise) {
          return value;
        }
        return resolvePromise(new this(null), RESOLVED, value);
      }
      static reject(error) {
        return resolvePromise(new this(null), REJECTED, error);
      }
      static withResolvers() {
        const result = {};
        result.promise = new ZoneAwarePromise((res, rej) => {
          result.resolve = res;
          result.reject = rej;
        });
        return result;
      }
      static any(values) {
        if (!values || typeof values[Symbol.iterator] !== "function") {
          return Promise.reject(new AggregateError([], "All promises were rejected"));
        }
        const promises = [];
        let count = 0;
        try {
          for (let v of values) {
            count++;
            promises.push(ZoneAwarePromise.resolve(v));
          }
        } catch (err) {
          return Promise.reject(new AggregateError([], "All promises were rejected"));
        }
        if (count === 0) {
          return Promise.reject(new AggregateError([], "All promises were rejected"));
        }
        let finished = false;
        const errors = [];
        return new ZoneAwarePromise((resolve, reject) => {
          for (let i = 0; i < promises.length; i++) {
            promises[i].then((v) => {
              if (finished) {
                return;
              }
              finished = true;
              resolve(v);
            }, (err) => {
              errors.push(err);
              count--;
              if (count === 0) {
                finished = true;
                reject(new AggregateError(errors, "All promises were rejected"));
              }
            });
          }
        });
      }
      static race(values) {
        let resolve;
        let reject;
        let promise = new this((res, rej) => {
          resolve = res;
          reject = rej;
        });
        function onResolve(value) {
          resolve(value);
        }
        function onReject(error) {
          reject(error);
        }
        for (let value of values) {
          if (!isThenable(value)) {
            value = this.resolve(value);
          }
          value.then(onResolve, onReject);
        }
        return promise;
      }
      static all(values) {
        return ZoneAwarePromise.allWithCallback(values);
      }
      static allSettled(values) {
        const P = this && this.prototype instanceof ZoneAwarePromise ? this : ZoneAwarePromise;
        return P.allWithCallback(values, {
          thenCallback: (value) => ({ status: "fulfilled", value }),
          errorCallback: (err) => ({ status: "rejected", reason: err })
        });
      }
      static allWithCallback(values, callback) {
        let resolve;
        let reject;
        let promise = new this((res, rej) => {
          resolve = res;
          reject = rej;
        });
        let unresolvedCount = 2;
        let valueIndex = 0;
        const resolvedValues = [];
        for (let value of values) {
          if (!isThenable(value)) {
            value = this.resolve(value);
          }
          const curValueIndex = valueIndex;
          try {
            value.then((value2) => {
              resolvedValues[curValueIndex] = callback ? callback.thenCallback(value2) : value2;
              unresolvedCount--;
              if (unresolvedCount === 0) {
                resolve(resolvedValues);
              }
            }, (err) => {
              if (!callback) {
                reject(err);
              } else {
                resolvedValues[curValueIndex] = callback.errorCallback(err);
                unresolvedCount--;
                if (unresolvedCount === 0) {
                  resolve(resolvedValues);
                }
              }
            });
          } catch (thenErr) {
            reject(thenErr);
          }
          unresolvedCount++;
          valueIndex++;
        }
        unresolvedCount -= 2;
        if (unresolvedCount === 0) {
          resolve(resolvedValues);
        }
        return promise;
      }
      constructor(executor) {
        const promise = this;
        if (!(promise instanceof ZoneAwarePromise)) {
          throw new Error("Must be an instanceof Promise.");
        }
        promise[symbolState] = UNRESOLVED;
        promise[symbolValue] = [];
        try {
          const onceWrapper = once();
          executor && executor(onceWrapper(makeResolver(promise, RESOLVED)), onceWrapper(makeResolver(promise, REJECTED)));
        } catch (error) {
          resolvePromise(promise, false, error);
        }
      }
      get [Symbol.toStringTag]() {
        return "Promise";
      }
      get [Symbol.species]() {
        return ZoneAwarePromise;
      }
      then(onFulfilled, onRejected) {
        var _a;
        let C = (_a = this.constructor) == null ? void 0 : _a[Symbol.species];
        if (!C || typeof C !== "function") {
          C = this.constructor || ZoneAwarePromise;
        }
        const chainPromise = new C(noop);
        const zone = Zone4.current;
        if (this[symbolState] == UNRESOLVED) {
          this[symbolValue].push(zone, chainPromise, onFulfilled, onRejected);
        } else {
          scheduleResolveOrReject(this, zone, chainPromise, onFulfilled, onRejected);
        }
        return chainPromise;
      }
      catch(onRejected) {
        return this.then(null, onRejected);
      }
      finally(onFinally) {
        var _a;
        let C = (_a = this.constructor) == null ? void 0 : _a[Symbol.species];
        if (!C || typeof C !== "function") {
          C = ZoneAwarePromise;
        }
        const chainPromise = new C(noop);
        chainPromise[symbolFinally] = symbolFinally;
        const zone = Zone4.current;
        if (this[symbolState] == UNRESOLVED) {
          this[symbolValue].push(zone, chainPromise, onFinally, onFinally);
        } else {
          scheduleResolveOrReject(this, zone, chainPromise, onFinally, onFinally);
        }
        return chainPromise;
      }
    }
    ZoneAwarePromise["resolve"] = ZoneAwarePromise.resolve;
    ZoneAwarePromise["reject"] = ZoneAwarePromise.reject;
    ZoneAwarePromise["race"] = ZoneAwarePromise.race;
    ZoneAwarePromise["all"] = ZoneAwarePromise.all;
    const NativePromise = global2[symbolPromise] = global2["Promise"];
    global2["Promise"] = ZoneAwarePromise;
    const symbolThenPatched = __symbol__2("thenPatched");
    function patchThen(Ctor) {
      const proto = Ctor.prototype;
      const prop = ObjectGetOwnPropertyDescriptor2(proto, "then");
      if (prop && (prop.writable === false || !prop.configurable)) {
        return;
      }
      const originalThen = proto.then;
      proto[symbolThen] = originalThen;
      Ctor.prototype.then = function(onResolve, onReject) {
        const wrapped = new ZoneAwarePromise((resolve, reject) => {
          originalThen.call(this, resolve, reject);
        });
        return wrapped.then(onResolve, onReject);
      };
      Ctor[symbolThenPatched] = true;
    }
    api.patchThen = patchThen;
    function zoneify(fn) {
      return function(self2, args) {
        let resultPromise = fn.apply(self2, args);
        if (resultPromise instanceof ZoneAwarePromise) {
          return resultPromise;
        }
        let ctor = resultPromise.constructor;
        if (!ctor[symbolThenPatched]) {
          patchThen(ctor);
        }
        return resultPromise;
      };
    }
    if (NativePromise) {
      patchThen(NativePromise);
      const nativeTry = NativePromise["try"];
      if (nativeTry && typeof nativeTry === "function") {
        ZoneAwarePromise["try"] = nativeTry;
      }
      patchMethod(global2, "fetch", (delegate) => zoneify(delegate));
    }
    Promise[Zone4.__symbol__("uncaughtPromiseErrors")] = _uncaughtPromiseErrors;
    return ZoneAwarePromise;
  });
}
function patchToString(Zone3) {
  Zone3.__load_patch("toString", (global2) => {
    const originalFunctionToString = Function.prototype.toString;
    const ORIGINAL_DELEGATE_SYMBOL = zoneSymbol("OriginalDelegate");
    const PROMISE_SYMBOL = zoneSymbol("Promise");
    const ERROR_SYMBOL = zoneSymbol("Error");
    const newFunctionToString = function toString() {
      if (typeof this === "function") {
        const originalDelegate = this[ORIGINAL_DELEGATE_SYMBOL];
        if (originalDelegate) {
          if (typeof originalDelegate === "function") {
            return originalFunctionToString.call(originalDelegate);
          } else {
            return Object.prototype.toString.call(originalDelegate);
          }
        }
        if (this === Promise) {
          const nativePromise = global2[PROMISE_SYMBOL];
          if (nativePromise) {
            return originalFunctionToString.call(nativePromise);
          }
        }
        if (this === Error) {
          const nativeError = global2[ERROR_SYMBOL];
          if (nativeError) {
            return originalFunctionToString.call(nativeError);
          }
        }
      }
      return originalFunctionToString.call(this);
    };
    newFunctionToString[ORIGINAL_DELEGATE_SYMBOL] = originalFunctionToString;
    Function.prototype.toString = newFunctionToString;
    const originalObjectToString = Object.prototype.toString;
    const PROMISE_OBJECT_TO_STRING = "[object Promise]";
    Object.prototype.toString = function() {
      if (typeof Promise === "function" && this instanceof Promise) {
        return PROMISE_OBJECT_TO_STRING;
      }
      return originalObjectToString.call(this);
    };
  });
}
function patchCallbacks(api, target, targetName, method, callbacks) {
  const symbol = Zone.__symbol__(method);
  if (target[symbol]) {
    return;
  }
  const nativeDelegate = target[symbol] = target[method];
  target[method] = function(name, opts, options) {
    if (opts && opts.prototype) {
      callbacks.forEach(function(callback) {
        const source = `${targetName}.${method}::` + callback;
        const prototype = opts.prototype;
        try {
          if (prototype.hasOwnProperty(callback)) {
            const descriptor = api.ObjectGetOwnPropertyDescriptor(prototype, callback);
            if (descriptor && descriptor.value) {
              descriptor.value = api.wrapWithCurrentZone(descriptor.value, source);
              api._redefineProperty(opts.prototype, callback, descriptor);
            } else if (prototype[callback]) {
              prototype[callback] = api.wrapWithCurrentZone(prototype[callback], source);
            }
          } else if (prototype[callback]) {
            prototype[callback] = api.wrapWithCurrentZone(prototype[callback], source);
          }
        } catch (e) {
        }
      });
    }
    return nativeDelegate.call(target, name, opts, options);
  };
  api.attachOriginToPatched(target[method], nativeDelegate);
}
function patchUtil(Zone3) {
  Zone3.__load_patch("util", (global2, Zone4, api) => {
    const eventNames = getOnEventNames(global2);
    api.patchOnProperties = patchOnProperties;
    api.patchMethod = patchMethod;
    api.bindArguments = bindArguments;
    api.patchMacroTask = patchMacroTask;
    const SYMBOL_BLACK_LISTED_EVENTS = Zone4.__symbol__("BLACK_LISTED_EVENTS");
    const SYMBOL_UNPATCHED_EVENTS = Zone4.__symbol__("UNPATCHED_EVENTS");
    if (global2[SYMBOL_UNPATCHED_EVENTS]) {
      global2[SYMBOL_BLACK_LISTED_EVENTS] = global2[SYMBOL_UNPATCHED_EVENTS];
    }
    if (global2[SYMBOL_BLACK_LISTED_EVENTS]) {
      Zone4[SYMBOL_BLACK_LISTED_EVENTS] = Zone4[SYMBOL_UNPATCHED_EVENTS] = global2[SYMBOL_BLACK_LISTED_EVENTS];
    }
    api.patchEventPrototype = patchEventPrototype;
    api.patchEventTarget = patchEventTarget;
    api.ObjectDefineProperty = ObjectDefineProperty;
    api.ObjectGetOwnPropertyDescriptor = ObjectGetOwnPropertyDescriptor;
    api.ObjectCreate = ObjectCreate;
    api.ArraySlice = ArraySlice;
    api.patchClass = patchClass;
    api.wrapWithCurrentZone = wrapWithCurrentZone;
    api.filterProperties = filterProperties;
    api.attachOriginToPatched = attachOriginToPatched;
    api._redefineProperty = Object.defineProperty;
    api.patchCallbacks = patchCallbacks;
    api.getGlobalObjects = () => ({
      globalSources,
      zoneSymbolEventNames: zoneSymbolEventNames2,
      eventNames,
      isBrowser,
      isMix,
      isNode,
      TRUE_STR,
      FALSE_STR,
      ZONE_SYMBOL_PREFIX,
      ADD_EVENT_LISTENER_STR,
      REMOVE_EVENT_LISTENER_STR
    });
  });
}
function patchCommon(Zone3) {
  patchPromise(Zone3);
  patchToString(Zone3);
  patchUtil(Zone3);
}
var Zone2 = loadZone();
patchCommon(Zone2);
patchBrowser(Zone2);

// src/app/login/login.ts
var Login = class _Login {
  router = inject(Router);
  authService = inject(AuthService);
  hankoApiUrl = environment.hankoApiUrl;
  subscription;
  ngOnInit() {
    Yo(this.hankoApiUrl).catch((error) => console.error("Failed to register Hanko elements:", error));
    this.subscription = this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.router.navigate(["/"]);
      }
    });
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  static \u0275fac = function Login_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Login)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Login, selectors: [["app-login"]], decls: 5, vars: 0, consts: [[1, "login-container"], [1, "login-card"], [1, "login-title"]], template: function Login_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "h1", 2);
      \u0275\u0275text(3, "Signage Server");
      \u0275\u0275domElementEnd();
      \u0275\u0275domElement(4, "hanko-auth");
      \u0275\u0275domElementEnd()();
    }
  }, styles: ["\n.login-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background-color: var(--color-bg-primary);\n}\n.login-card[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 420px;\n  padding: 2.5rem;\n  background-color: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.75rem;\n  box-shadow: 0 25px 50px -12px var(--color-shadow);\n}\n.login-title[_ngcontent-%COMP%] {\n  margin: 0 0 1.5rem;\n  font-size: 1.5rem;\n  font-weight: 700;\n  text-align: center;\n  color: var(--color-text-primary);\n}\n/*# sourceMappingURL=login.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Login, [{
    type: Component,
    args: [{ selector: "app-login", schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '<div class="login-container">\n  <div class="login-card">\n    <h1 class="login-title">Signage Server</h1>\n    <hanko-auth></hanko-auth>\n  </div>\n</div>\n', styles: ["/* src/app/login/login.css */\n.login-container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background-color: var(--color-bg-primary);\n}\n.login-card {\n  width: 100%;\n  max-width: 420px;\n  padding: 2.5rem;\n  background-color: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 0.75rem;\n  box-shadow: 0 25px 50px -12px var(--color-shadow);\n}\n.login-title {\n  margin: 0 0 1.5rem;\n  font-size: 1.5rem;\n  font-weight: 700;\n  text-align: center;\n  color: var(--color-text-primary);\n}\n/*# sourceMappingURL=login.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Login, { className: "Login", filePath: "src/app/login/login.ts", lineNumber: 20 });
})();

// src/app/auth/auth.guard.ts
var authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const valid = await authService.isValid();
  if (!valid) {
    return router.createUrlTree(["/login"]);
  }
  return true;
};

// src/app/shell/theme.service.ts
var STORAGE_KEY = "signage_theme";
var ThemeService = class _ThemeService {
  isDark = signal(true, ...ngDevMode ? [{ debugName: "isDark" }] : (
    /* istanbul ignore next */
    []
  ));
  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light") {
      this.isDark.set(false);
      document.documentElement.classList.add("light");
    }
  }
  toggle() {
    const dark = !this.isDark();
    this.isDark.set(dark);
    if (dark) {
      document.documentElement.classList.remove("light");
      localStorage.setItem(STORAGE_KEY, "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem(STORAGE_KEY, "light");
    }
  }
  static \u0275fac = function ThemeService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ThemeService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ThemeService, factory: _ThemeService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ThemeService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], () => [], null);
})();

// src/app/notifications/notification.service.ts
var NotificationService = class _NotificationService {
  http = inject(HttpClient);
  socketService = inject(DashboardSseService);
  socketSub = null;
  unreadCount = signal(0, ...ngDevMode ? [{ debugName: "unreadCount" }] : (
    /* istanbul ignore next */
    []
  ));
  notifications = signal([], ...ngDevMode ? [{ debugName: "notifications" }] : (
    /* istanbul ignore next */
    []
  ));
  loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : (
    /* istanbul ignore next */
    []
  ));
  /** Fetch unread count from the API and subscribe to real-time updates. */
  init() {
    this.fetchUnreadCount();
    this.subscribeToSocket();
  }
  fetchUnreadCount() {
    this.http.get("/api/notifications/unread-count").subscribe({
      next: (res) => this.unreadCount.set(res.count)
    });
  }
  fetchNotifications() {
    this.loading.set(true);
    this.http.get("/api/notifications").subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
  markAsRead(id) {
    this.http.patch(`/api/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => n.id === id ? __spreadProps(__spreadValues({}, n), { read: true }) : n));
        this.unreadCount.update((c) => Math.max(0, c - 1));
      }
    });
  }
  markAllAsRead() {
    this.http.patch("/api/notifications/read-all", {}).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => __spreadProps(__spreadValues({}, n), { read: true })));
        this.unreadCount.set(0);
      }
    });
  }
  subscribeToSocket() {
    this.socketSub?.unsubscribe();
    this.socketSub = this.socketService.notificationNew$.subscribe((event) => {
      const notification = event.data;
      this.notifications.update((list) => [notification, ...list].slice(0, 50));
      this.unreadCount.update((c) => c + 1);
    });
  }
  ngOnDestroy() {
    this.socketSub?.unsubscribe();
  }
  static \u0275fac = function NotificationService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NotificationService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _NotificationService, factory: _NotificationService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NotificationService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/notifications/notification-dropdown.ts
var arrowFn0 = (ctx, view) => (n) => !n.read;
var _forTrack0 = ($index, $item) => $item.id;
function NotificationDropdown_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 6);
    \u0275\u0275domListener("click", function NotificationDropdown_Conditional_4_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onMarkAllRead());
    });
    \u0275\u0275text(1, "Mark all as read");
    \u0275\u0275domElementEnd();
  }
}
function NotificationDropdown_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 5);
    \u0275\u0275text(1, "Loading...");
    \u0275\u0275domElementEnd();
  }
}
function NotificationDropdown_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 5);
    \u0275\u0275text(1, "No notifications yet");
    \u0275\u0275domElementEnd();
  }
}
function NotificationDropdown_Conditional_8_For_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 8);
    \u0275\u0275domListener("click", function NotificationDropdown_Conditional_8_For_1_Template_button_click_0_listener() {
      const notification_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onClickNotification(notification_r4));
    });
    \u0275\u0275domElement(1, "span", 9);
    \u0275\u0275domElementStart(2, "div", 10)(3, "span", 11);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 12);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "span", 13);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const notification_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("unread", !notification_r4.read);
    \u0275\u0275advance();
    \u0275\u0275domProperty("innerHTML", ctx_r1.getEventIcon(notification_r4.eventType), \u0275\u0275sanitizeHtml);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(notification_r4.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.truncate(notification_r4.message, 80));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.relativeTime(notification_r4.createdAt));
  }
}
function NotificationDropdown_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, NotificationDropdown_Conditional_8_For_1_Template, 9, 6, "button", 7, _forTrack0);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275repeater(ctx_r1.notificationService.notifications());
  }
}
var NotificationDropdown = class _NotificationDropdown {
  notificationService = inject(NotificationService);
  router = inject(Router);
  closed = output();
  ngOnInit() {
    this.notificationService.fetchNotifications();
  }
  onMarkAllRead() {
    this.notificationService.markAllAsRead();
  }
  onClickNotification(notification) {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    const route = this.getNavigationRoute(notification);
    if (route) {
      this.router.navigate(route);
      this.closed.emit();
    }
  }
  truncate(text, maxLen) {
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  }
  relativeTime(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1e3);
    if (diffSec < 60)
      return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
      return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
      return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }
  getEventIcon(eventType) {
    switch (eventType) {
      case "screen.offline":
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#ef4444" stroke-width="1.5"/><path d="M6 6l4 4M10 6l-4 4" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/></svg>';
      case "screen.online":
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#22c55e" stroke-width="1.5"/><path d="M5.5 8l2 2 3-4" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      case "transcoding.complete":
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#3b82f6" stroke-width="1.5"/><path d="M5.5 8l2 2 3-4" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      case "transcoding.failed":
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#f59e0b" stroke-width="1.5"/><path d="M8 5v3M8 10v1" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>';
      default:
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/></svg>';
    }
  }
  getNavigationRoute(notification) {
    if (!notification.resourceId)
      return null;
    switch (notification.eventType) {
      case "screen.offline":
      case "screen.online":
        return ["/screens"];
      case "transcoding.complete":
      case "transcoding.failed":
        return ["/content"];
      default:
        return null;
    }
  }
  static \u0275fac = function NotificationDropdown_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NotificationDropdown)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _NotificationDropdown, selectors: [["app-notification-dropdown"]], outputs: { closed: "closed" }, decls: 9, vars: 3, consts: [[1, "dropdown"], [1, "dropdown-header"], [1, "dropdown-title"], [1, "mark-all-btn"], [1, "dropdown-list"], [1, "empty-state"], [1, "mark-all-btn", 3, "click"], [1, "notification-row", 3, "unread"], [1, "notification-row", 3, "click"], [1, "event-icon", 3, "innerHTML"], [1, "notification-body"], [1, "notification-title"], [1, "notification-message"], [1, "notification-time"]], template: function NotificationDropdown_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "span", 2);
      \u0275\u0275text(3, "Notifications");
      \u0275\u0275domElementEnd();
      \u0275\u0275conditionalCreate(4, NotificationDropdown_Conditional_4_Template, 2, 0, "button", 3);
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(5, "div", 4);
      \u0275\u0275conditionalCreate(6, NotificationDropdown_Conditional_6_Template, 2, 0, "div", 5)(7, NotificationDropdown_Conditional_7_Template, 2, 0, "div", 5)(8, NotificationDropdown_Conditional_8_Template, 2, 0);
      \u0275\u0275domElementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.notificationService.notifications().some(\u0275\u0275arrowFunction(2, arrowFn0, ctx)) ? 4 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.notificationService.loading() ? 6 : ctx.notificationService.notifications().length === 0 ? 7 : 8);
    }
  }, styles: ["\n.dropdown[_ngcontent-%COMP%] {\n  position: absolute;\n  top: calc(100% + 4px);\n  right: 0;\n  width: 380px;\n  max-height: 480px;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px var(--color-shadow);\n  display: flex;\n  flex-direction: column;\n  z-index: 100;\n  overflow: hidden;\n}\n.dropdown-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.dropdown-title[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n}\n.mark-all-btn[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-accent);\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0.25rem 0.5rem;\n  border-radius: 4px;\n}\n.mark-all-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n}\n.dropdown-list[_ngcontent-%COMP%] {\n  overflow-y: auto;\n  flex: 1;\n}\n.notification-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  width: 100%;\n  text-align: left;\n  background: transparent;\n  border: none;\n  border-bottom: 1px solid var(--color-border);\n  cursor: pointer;\n  transition: background 0.15s;\n  color: var(--color-text-secondary);\n}\n.notification-row[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.notification-row[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n}\n.notification-row.unread[_ngcontent-%COMP%] {\n  background: rgba(59, 130, 246, 0.08);\n  color: var(--color-text-primary);\n}\n.notification-row.unread[_ngcontent-%COMP%]:hover {\n  background: rgba(59, 130, 246, 0.14);\n}\n.event-icon[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.notification-body[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n.notification-title[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.notification-message[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.notification-time[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  white-space: nowrap;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.empty-state[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 2rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n@media (max-width: 480px) {\n  .dropdown[_ngcontent-%COMP%] {\n    width: calc(100vw - 1rem);\n    right: -0.5rem;\n  }\n}\n/*# sourceMappingURL=notification-dropdown.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NotificationDropdown, [{
    type: Component,
    args: [{ selector: "app-notification-dropdown", template: `
    <div class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        @if (notificationService.notifications().some(n => !n.read)) {
          <button class="mark-all-btn" (click)="onMarkAllRead()">Mark all as read</button>
        }
      </div>

      <div class="dropdown-list">
        @if (notificationService.loading()) {
          <div class="empty-state">Loading...</div>
        } @else if (notificationService.notifications().length === 0) {
          <div class="empty-state">No notifications yet</div>
        } @else {
          @for (notification of notificationService.notifications(); track notification.id) {
            <button
              class="notification-row"
              [class.unread]="!notification.read"
              (click)="onClickNotification(notification)"
            >
              <span class="event-icon" [innerHTML]="getEventIcon(notification.eventType)"></span>
              <div class="notification-body">
                <span class="notification-title">{{ notification.title }}</span>
                <span class="notification-message">{{ truncate(notification.message, 80) }}</span>
              </div>
              <span class="notification-time">{{ relativeTime(notification.createdAt) }}</span>
            </button>
          }
        }
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;d6fce3ab9df1d2879fc4695d218bf70b76375aec7d65bd2bb6576ca4d6f6ded7;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/notifications/notification-dropdown.ts */\n.dropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  right: 0;\n  width: 380px;\n  max-height: 480px;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px var(--color-shadow);\n  display: flex;\n  flex-direction: column;\n  z-index: 100;\n  overflow: hidden;\n}\n.dropdown-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.75rem 1rem;\n  border-bottom: 1px solid var(--color-border);\n}\n.dropdown-title {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-primary);\n}\n.mark-all-btn {\n  font-size: 0.75rem;\n  color: var(--color-accent);\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 0.25rem 0.5rem;\n  border-radius: 4px;\n}\n.mark-all-btn:hover {\n  background: var(--color-bg-tertiary);\n}\n.dropdown-list {\n  overflow-y: auto;\n  flex: 1;\n}\n.notification-row {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.75rem;\n  padding: 0.75rem 1rem;\n  width: 100%;\n  text-align: left;\n  background: transparent;\n  border: none;\n  border-bottom: 1px solid var(--color-border);\n  cursor: pointer;\n  transition: background 0.15s;\n  color: var(--color-text-secondary);\n}\n.notification-row:last-child {\n  border-bottom: none;\n}\n.notification-row:hover {\n  background: var(--color-bg-tertiary);\n}\n.notification-row.unread {\n  background: rgba(59, 130, 246, 0.08);\n  color: var(--color-text-primary);\n}\n.notification-row.unread:hover {\n  background: rgba(59, 130, 246, 0.14);\n}\n.event-icon {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.notification-body {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n.notification-title {\n  font-size: 0.8125rem;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.notification-message {\n  font-size: 0.75rem;\n  color: var(--color-text-secondary);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.notification-time {\n  font-size: 0.6875rem;\n  color: var(--color-text-muted);\n  white-space: nowrap;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.empty-state {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 2rem;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n@media (max-width: 480px) {\n  .dropdown {\n    width: calc(100vw - 1rem);\n    right: -0.5rem;\n  }\n}\n/*# sourceMappingURL=notification-dropdown.css.map */\n"] }]
  }], null, { closed: [{ type: Output, args: ["closed"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(NotificationDropdown, { className: "NotificationDropdown", filePath: "src/app/notifications/notification-dropdown.ts", lineNumber: 183 });
})();

// src/app/notifications/notification-bell.ts
function NotificationBell_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 4);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.badgeText());
  }
}
function NotificationBell_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-notification-dropdown", 5);
    \u0275\u0275listener("closed", function NotificationBell_Conditional_5_Template_app_notification_dropdown_closed_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.dropdownOpen.set(false));
    });
    \u0275\u0275elementEnd();
  }
}
var NotificationBell = class _NotificationBell {
  notificationService = inject(NotificationService);
  elementRef = inject(ElementRef);
  dropdownOpen = signal(false, ...ngDevMode ? [{ debugName: "dropdownOpen" }] : (
    /* istanbul ignore next */
    []
  ));
  badgeText = computed(() => {
    const count = this.notificationService.unreadCount();
    return count > 99 ? "99+" : String(count);
  }, ...ngDevMode ? [{ debugName: "badgeText" }] : (
    /* istanbul ignore next */
    []
  ));
  ngOnInit() {
    this.notificationService.init();
  }
  ngOnDestroy() {
    this.notificationService.ngOnDestroy();
  }
  toggleDropdown() {
    this.dropdownOpen.update((v) => !v);
  }
  onDocumentClick(event) {
    if (this.dropdownOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }
  static \u0275fac = function NotificationBell_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _NotificationBell)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _NotificationBell, selectors: [["app-notification-bell"]], hostBindings: function NotificationBell_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function NotificationBell_click_HostBindingHandler($event) {
        return ctx.onDocumentClick($event);
      }, \u0275\u0275resolveDocument);
    }
  }, decls: 6, vars: 2, consts: [[1, "bell-wrapper"], ["aria-label", "Notifications", 1, "topbar-btn", "notification-btn", 3, "click"], ["width", "20", "height", "20", "viewBox", "0 0 20 20", "fill", "none"], ["d", "M10 2a5 5 0 00-5 5v3l-1.5 2h13L15 10V7a5 5 0 00-5-5zM8.5 17a1.5 1.5 0 003 0", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round"], [1, "badge"], [3, "closed"]], template: function NotificationBell_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "button", 1);
      \u0275\u0275listener("click", function NotificationBell_Template_button_click_1_listener() {
        return ctx.toggleDropdown();
      });
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(2, "svg", 2);
      \u0275\u0275element(3, "path", 3);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(4, NotificationBell_Conditional_4_Template, 2, 1, "span", 4);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(5, NotificationBell_Conditional_5_Template, 1, 0, "app-notification-dropdown");
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.notificationService.unreadCount() > 0 ? 4 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.dropdownOpen() ? 5 : -1);
    }
  }, dependencies: [NotificationDropdown], styles: ["\n.bell-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n}\n.topbar-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.topbar-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.notification-btn[_ngcontent-%COMP%] {\n  position: relative;\n}\n.badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  min-width: 16px;\n  height: 16px;\n  background: var(--color-accent);\n  color: #fff;\n  font-size: 0.625rem;\n  font-weight: 600;\n  border-radius: 999px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0 3px;\n}\n/*# sourceMappingURL=notification-bell.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NotificationBell, [{
    type: Component,
    args: [{ selector: "app-notification-bell", imports: [NotificationDropdown], template: `
    <div class="bell-wrapper">
      <button
        class="topbar-btn notification-btn"
        aria-label="Notifications"
        (click)="toggleDropdown()"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2a5 5 0 00-5 5v3l-1.5 2h13L15 10V7a5 5 0 00-5-5zM8.5 17a1.5 1.5 0 003 0"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        @if (notificationService.unreadCount() > 0) {
          <span class="badge">{{ badgeText() }}</span>
        }
      </button>

      @if (dropdownOpen()) {
        <app-notification-dropdown (closed)="dropdownOpen.set(false)" />
      }
    </div>
  `, styles: ["/* angular:styles/component:css;286ba72afd76213bb0150ed22e15bfac78b17587b0bcf713bab007286e9a7071;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/notifications/notification-bell.ts */\n.bell-wrapper {\n  position: relative;\n}\n.topbar-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.topbar-btn:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.notification-btn {\n  position: relative;\n}\n.badge {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  min-width: 16px;\n  height: 16px;\n  background: var(--color-accent);\n  color: #fff;\n  font-size: 0.625rem;\n  font-weight: 600;\n  border-radius: 999px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0 3px;\n}\n/*# sourceMappingURL=notification-bell.css.map */\n"] }]
  }], null, { onDocumentClick: [{
    type: HostListener,
    args: ["document:click", ["$event"]]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(NotificationBell, { className: "NotificationBell", filePath: "src/app/notifications/notification-bell.ts", lineNumber: 87 });
})();

// src/app/search/search.service.ts
var SearchService = class _SearchService {
  http = inject(HttpClient);
  search(query) {
    return this.http.get("/api/search", {
      params: { q: query }
    });
  }
  static \u0275fac = function SearchService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SearchService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SearchService, factory: _SearchService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SearchService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/app/search/global-search.ts
var _c0 = ["searchInput"];
var _forTrack02 = ($index, $item) => $item.key;
var _forTrack1 = ($index, $item) => $item.id;
function GlobalSearch_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(0, "svg", 6);
    \u0275\u0275domElement(1, "circle", 10)(2, "path", 11);
    \u0275\u0275domElementEnd();
  }
}
function GlobalSearch_Conditional_10_Conditional_1_For_1_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 16);
    \u0275\u0275domListener("mousedown", function GlobalSearch_Conditional_10_Conditional_1_For_1_For_4_Template_button_mousedown_0_listener() {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r2.navigateTo(item_r2));
    })("mouseenter", function GlobalSearch_Conditional_10_Conditional_1_For_1_For_4_Template_button_mouseenter_0_listener() {
      const $index_r4 = \u0275\u0275restoreView(_r1).$index;
      const section_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.activeIndex.set(ctx_r2.flatIndex(section_r5.key, $index_r4)));
    });
    \u0275\u0275domElementStart(1, "span", 17);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const item_r2 = ctx.$implicit;
    const $index_r4 = ctx.$index;
    const section_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("active", ctx_r2.activeIndex() === ctx_r2.flatIndex(section_r5.key, $index_r4));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.label);
  }
}
function GlobalSearch_Conditional_10_Conditional_1_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 13)(1, "div", 14);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275repeaterCreate(3, GlobalSearch_Conditional_10_Conditional_1_For_1_For_4_Template, 3, 3, "button", 15, _forTrack1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const section_r5 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(section_r5.heading);
    \u0275\u0275advance();
    \u0275\u0275repeater(section_r5.items);
  }
}
function GlobalSearch_Conditional_10_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, GlobalSearch_Conditional_10_Conditional_1_For_1_Template, 5, 1, "div", 13, _forTrack02);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275repeater(ctx_r2.sections());
  }
}
function GlobalSearch_Conditional_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 12);
    \u0275\u0275text(1, "No results found");
    \u0275\u0275domElementEnd();
  }
}
function GlobalSearch_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 9);
    \u0275\u0275conditionalCreate(1, GlobalSearch_Conditional_10_Conditional_1_Template, 2, 0)(2, GlobalSearch_Conditional_10_Conditional_2_Template, 2, 0, "div", 12);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.hasResults() ? 1 : 2);
  }
}
var GlobalSearch = class _GlobalSearch {
  searchService = inject(SearchService);
  router = inject(Router);
  searchInputRef;
  query = signal("", ...ngDevMode ? [{ debugName: "query" }] : (
    /* istanbul ignore next */
    []
  ));
  loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : (
    /* istanbul ignore next */
    []
  ));
  focused = signal(false, ...ngDevMode ? [{ debugName: "focused" }] : (
    /* istanbul ignore next */
    []
  ));
  results = signal(null, ...ngDevMode ? [{ debugName: "results" }] : (
    /* istanbul ignore next */
    []
  ));
  activeIndex = signal(-1, ...ngDevMode ? [{ debugName: "activeIndex" }] : (
    /* istanbul ignore next */
    []
  ));
  static SECTION_ORDER = [
    { key: "screens", heading: "Screens" },
    { key: "content", heading: "Content" },
    { key: "playlists", heading: "Playlists" },
    { key: "schedules", heading: "Schedules" }
  ];
  sections = computed(() => {
    const res = this.results();
    if (!res)
      return [];
    return _GlobalSearch.SECTION_ORDER.filter((s) => res[s.key].length > 0).map((s) => __spreadProps(__spreadValues({}, s), { items: res[s.key] }));
  }, ...ngDevMode ? [{ debugName: "sections" }] : (
    /* istanbul ignore next */
    []
  ));
  hasResults = computed(() => this.sections().length > 0, ...ngDevMode ? [{ debugName: "hasResults" }] : (
    /* istanbul ignore next */
    []
  ));
  dropdownOpen = computed(() => this.results() !== null && this.focused(), ...ngDevMode ? [{ debugName: "dropdownOpen" }] : (
    /* istanbul ignore next */
    []
  ));
  flatItems = computed(() => this.sections().flatMap((s) => s.items), ...ngDevMode ? [{ debugName: "flatItems" }] : (
    /* istanbul ignore next */
    []
  ));
  searchSubject = new Subject();
  subscription;
  routeSub;
  keydownHandler = this.onGlobalKeydown.bind(this);
  clickOutsideHandler = this.onClickOutside.bind(this);
  ngOnInit() {
    this.subscription = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), switchMap((q) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        this.results.set(null);
        this.loading.set(false);
        return of(null);
      }
      this.loading.set(true);
      return this.searchService.search(trimmed).pipe(finalize(() => this.loading.set(false)));
    })).subscribe((res) => {
      if (res) {
        this.results.set(res);
        this.activeIndex.set(-1);
      }
    });
    this.routeSub = this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => this.closeDropdown());
    document.addEventListener("keydown", this.keydownHandler);
    document.addEventListener("mousedown", this.clickOutsideHandler);
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.routeSub?.unsubscribe();
    document.removeEventListener("keydown", this.keydownHandler);
    document.removeEventListener("mousedown", this.clickOutsideHandler);
  }
  onInput(event) {
    const value = event.target.value;
    this.query.set(value);
    this.searchSubject.next(value);
  }
  onEscape() {
    this.query.set("");
    this.results.set(null);
    this.loading.set(false);
    this.activeIndex.set(-1);
    this.searchInputRef.nativeElement.value = "";
    this.searchInputRef.nativeElement.blur();
  }
  onArrowDown(event) {
    event.preventDefault();
    const items = this.flatItems();
    if (items.length === 0)
      return;
    const next = this.activeIndex() + 1;
    this.activeIndex.set(next >= items.length ? 0 : next);
  }
  onArrowUp(event) {
    event.preventDefault();
    const items = this.flatItems();
    if (items.length === 0)
      return;
    const prev = this.activeIndex() - 1;
    this.activeIndex.set(prev < 0 ? items.length - 1 : prev);
  }
  onEnter(event) {
    const items = this.flatItems();
    const idx = this.activeIndex();
    if (idx >= 0 && idx < items.length) {
      event.preventDefault();
      this.navigateTo(items[idx]);
    }
  }
  navigateTo(item) {
    this.closeDropdown();
    this.router.navigateByUrl(item.url);
  }
  flatIndex(sectionKey, itemIndex) {
    const secs = this.sections();
    let offset = 0;
    for (const sec of secs) {
      if (sec.key === sectionKey)
        return offset + itemIndex;
      offset += sec.items.length;
    }
    return -1;
  }
  closeDropdown() {
    this.query.set("");
    this.results.set(null);
    this.loading.set(false);
    this.activeIndex.set(-1);
    this.searchInputRef.nativeElement.value = "";
    this.searchInputRef.nativeElement.blur();
  }
  onClickOutside(event) {
    const el = this.searchInputRef.nativeElement.closest(".search-wrapper");
    if (el && !el.contains(event.target)) {
      this.focused.set(false);
    }
  }
  onGlobalKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
      event.preventDefault();
      this.searchInputRef.nativeElement.focus();
      return;
    }
    if (event.key === "/") {
      const target = event.target;
      const tag = target.tagName.toLowerCase();
      const isTextInput = tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
      if (!isTextInput) {
        event.preventDefault();
        this.searchInputRef.nativeElement.focus();
      }
    }
  }
  static \u0275fac = function GlobalSearch_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _GlobalSearch)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _GlobalSearch, selectors: [["app-global-search"]], viewQuery: function GlobalSearch_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 7);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.searchInputRef = _t.first);
    }
  }, decls: 11, vars: 7, consts: [["searchInput", ""], [1, "search-wrapper"], [1, "search-box"], ["width", "16", "height", "16", "viewBox", "0 0 16 16", "fill", "none", 1, "search-icon"], ["cx", "7", "cy", "7", "r", "5", "stroke", "currentColor", "stroke-width", "1.5"], ["d", "M11 11l3 3", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round"], ["width", "16", "height", "16", "viewBox", "0 0 16 16", "fill", "none", 1, "spinner"], ["type", "text", "placeholder", "Search\u2026", 1, "search-input", 3, "input", "focus", "keydown.escape", "keydown.arrowDown", "keydown.arrowUp", "keydown.enter", "value"], [1, "shortcut-hint"], [1, "dropdown"], ["cx", "8", "cy", "8", "r", "6", "stroke", "currentColor", "stroke-width", "2", "opacity", "0.25"], ["d", "M14 8a6 6 0 00-6-6", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round"], [1, "empty-state"], [1, "dropdown-section"], [1, "section-heading"], [1, "result-item", 3, "active"], [1, "result-item", 3, "mousedown", "mouseenter"], [1, "result-label"]], template: function GlobalSearch_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275domElementStart(0, "div", 1)(1, "div", 2);
      \u0275\u0275namespaceSVG();
      \u0275\u0275domElementStart(2, "svg", 3);
      \u0275\u0275domElement(3, "circle", 4)(4, "path", 5);
      \u0275\u0275domElementEnd();
      \u0275\u0275conditionalCreate(5, GlobalSearch_Conditional_5_Template, 3, 0, ":svg:svg", 6);
      \u0275\u0275namespaceHTML();
      \u0275\u0275domElementStart(6, "input", 7, 0);
      \u0275\u0275domListener("input", function GlobalSearch_Template_input_input_6_listener($event) {
        return ctx.onInput($event);
      })("focus", function GlobalSearch_Template_input_focus_6_listener() {
        return ctx.focused.set(true);
      })("keydown.escape", function GlobalSearch_Template_input_keydown_escape_6_listener() {
        return ctx.onEscape();
      })("keydown.arrowDown", function GlobalSearch_Template_input_keydown_arrowDown_6_listener($event) {
        return ctx.onArrowDown($event);
      })("keydown.arrowUp", function GlobalSearch_Template_input_keydown_arrowUp_6_listener($event) {
        return ctx.onArrowUp($event);
      })("keydown.enter", function GlobalSearch_Template_input_keydown_enter_6_listener($event) {
        return ctx.onEnter($event);
      });
      \u0275\u0275domElementEnd();
      \u0275\u0275domElementStart(8, "kbd", 8);
      \u0275\u0275text(9, "Ctrl+K");
      \u0275\u0275domElementEnd()();
      \u0275\u0275conditionalCreate(10, GlobalSearch_Conditional_10_Template, 3, 1, "div", 9);
      \u0275\u0275domElementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275classProp("focused", ctx.focused());
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.loading() ? 5 : -1);
      \u0275\u0275advance();
      \u0275\u0275domProperty("value", ctx.query());
      \u0275\u0275advance(2);
      \u0275\u0275classProp("hidden", ctx.focused());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.dropdownOpen() ? 10 : -1);
    }
  }, styles: ["\n[_nghost-%COMP%] {\n  display: block;\n}\n.search-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n}\n.search-box[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 6px;\n  padding: 0.375rem 0.75rem;\n  position: relative;\n  transition: border-color 0.15s;\n}\n.search-box.focused[_ngcontent-%COMP%] {\n  border-color: var(--color-accent);\n}\n.search-icon[_ngcontent-%COMP%] {\n  color: var(--color-text-muted);\n  flex-shrink: 0;\n}\n.spinner[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 0.75rem;\n  color: var(--color-accent);\n  flex-shrink: 0;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.search-input[_ngcontent-%COMP%] {\n  background: transparent;\n  border: none;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  width: 160px;\n  outline: none;\n}\n.search-input[_ngcontent-%COMP%]::placeholder {\n  color: var(--color-text-muted);\n}\n.shortcut-hint[_ngcontent-%COMP%] {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 4px;\n  padding: 1px 5px;\n  white-space: nowrap;\n  pointer-events: none;\n  line-height: 1.4;\n}\n.shortcut-hint.hidden[_ngcontent-%COMP%] {\n  display: none;\n}\n.dropdown[_ngcontent-%COMP%] {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  right: 0;\n  min-width: 280px;\n  max-height: 400px;\n  overflow-y: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px var(--color-shadow);\n  z-index: 100;\n  padding: 0.25rem 0;\n}\n.dropdown-section[_ngcontent-%COMP%] {\n  padding: 0.25rem 0;\n}\n.dropdown-section[_ngcontent-%COMP%]    + .dropdown-section[_ngcontent-%COMP%] {\n  border-top: 1px solid var(--color-border);\n}\n.section-heading[_ngcontent-%COMP%] {\n  font-size: 0.6875rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-muted);\n  padding: 0.375rem 0.75rem 0.25rem;\n}\n.result-item[_ngcontent-%COMP%] {\n  display: block;\n  width: 100%;\n  text-align: left;\n  padding: 0.5rem 0.75rem;\n  border: none;\n  background: transparent;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  line-height: 1.4;\n}\n.result-item[_ngcontent-%COMP%]:hover, \n.result-item.active[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n}\n.result-label[_ngcontent-%COMP%] {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.empty-state[_ngcontent-%COMP%] {\n  padding: 1rem 0.75rem;\n  text-align: center;\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n/*# sourceMappingURL=global-search.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(GlobalSearch, [{
    type: Component,
    args: [{ selector: "app-global-search", template: `
    <div class="search-wrapper">
      <div class="search-box" [class.focused]="focused()">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        @if (loading()) {
          <svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" opacity="0.25"/>
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        }
        <input
          #searchInput
          type="text"
          class="search-input"
          placeholder="Search\u2026"
          [value]="query()"
          (input)="onInput($event)"
          (focus)="focused.set(true)"
          (keydown.escape)="onEscape()"
          (keydown.arrowDown)="onArrowDown($event)"
          (keydown.arrowUp)="onArrowUp($event)"
          (keydown.enter)="onEnter($event)"
        />
        <kbd class="shortcut-hint" [class.hidden]="focused()">Ctrl+K</kbd>
      </div>

      @if (dropdownOpen()) {
        <div class="dropdown">
          @if (hasResults()) {
            @for (section of sections(); track section.key) {
              <div class="dropdown-section">
                <div class="section-heading">{{ section.heading }}</div>
                @for (item of section.items; track item.id) {
                  <button
                    class="result-item"
                    [class.active]="activeIndex() === flatIndex(section.key, $index)"
                    (mousedown)="navigateTo(item)"
                    (mouseenter)="activeIndex.set(flatIndex(section.key, $index))"
                  >
                    <span class="result-label">{{ item.label }}</span>
                  </button>
                }
              </div>
            }
          } @else {
            <div class="empty-state">No results found</div>
          }
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;7af9cefd3301bdeca1c1965a7b0e6fed096f462477d064082aede32944bfe7aa;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/search/global-search.ts */\n:host {\n  display: block;\n}\n.search-wrapper {\n  position: relative;\n}\n.search-box {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--color-bg-tertiary);\n  border: 1px solid var(--color-border);\n  border-radius: 6px;\n  padding: 0.375rem 0.75rem;\n  position: relative;\n  transition: border-color 0.15s;\n}\n.search-box.focused {\n  border-color: var(--color-accent);\n}\n.search-icon {\n  color: var(--color-text-muted);\n  flex-shrink: 0;\n}\n.spinner {\n  position: absolute;\n  left: 0.75rem;\n  color: var(--color-accent);\n  flex-shrink: 0;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.search-input {\n  background: transparent;\n  border: none;\n  color: var(--color-text-primary);\n  font-size: 0.875rem;\n  width: 160px;\n  outline: none;\n}\n.search-input::placeholder {\n  color: var(--color-text-muted);\n}\n.shortcut-hint {\n  font-size: 0.625rem;\n  color: var(--color-text-muted);\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 4px;\n  padding: 1px 5px;\n  white-space: nowrap;\n  pointer-events: none;\n  line-height: 1.4;\n}\n.shortcut-hint.hidden {\n  display: none;\n}\n.dropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  right: 0;\n  min-width: 280px;\n  max-height: 400px;\n  overflow-y: auto;\n  background: var(--color-bg-secondary);\n  border: 1px solid var(--color-border);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px var(--color-shadow);\n  z-index: 100;\n  padding: 0.25rem 0;\n}\n.dropdown-section {\n  padding: 0.25rem 0;\n}\n.dropdown-section + .dropdown-section {\n  border-top: 1px solid var(--color-border);\n}\n.section-heading {\n  font-size: 0.6875rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--color-text-muted);\n  padding: 0.375rem 0.75rem 0.25rem;\n}\n.result-item {\n  display: block;\n  width: 100%;\n  text-align: left;\n  padding: 0.5rem 0.75rem;\n  border: none;\n  background: transparent;\n  color: var(--color-text-primary);\n  font-size: 0.8125rem;\n  cursor: pointer;\n  line-height: 1.4;\n}\n.result-item:hover,\n.result-item.active {\n  background: var(--color-bg-tertiary);\n}\n.result-label {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.empty-state {\n  padding: 1rem 0.75rem;\n  text-align: center;\n  color: var(--color-text-muted);\n  font-size: 0.8125rem;\n}\n/*# sourceMappingURL=global-search.css.map */\n"] }]
  }], null, { searchInputRef: [{
    type: ViewChild,
    args: ["searchInput", { static: true }]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(GlobalSearch, { className: "GlobalSearch", filePath: "src/app/search/global-search.ts", lineNumber: 211 });
})();

// src/app/shell/layout.ts
var _c02 = (a0) => ({ exact: a0 });
var _forTrack03 = ($index, $item) => $item.route;
var _forTrack12 = ($index, $item) => $item.id;
function Layout_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275listener("click", function Layout_Conditional_0_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.mobileOpen.set(false));
    })("keydown.escape", function Layout_Conditional_0_Template_div_keydown_escape_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.mobileOpen.set(false));
    });
    \u0275\u0275elementEnd();
  }
}
function Layout_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 3);
    \u0275\u0275text(1, "Signage");
    \u0275\u0275elementEnd();
  }
}
function Layout_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275element(0, "path", 6);
  }
}
function Layout_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275element(0, "path", 7);
  }
}
function Layout_For_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(item_r4.label);
  }
}
function Layout_For_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "a", 32);
    \u0275\u0275listener("click", function Layout_For_10_Template_a_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.mobileOpen.set(false));
    });
    \u0275\u0275element(1, "span", 33);
    \u0275\u0275conditionalCreate(2, Layout_For_10_Conditional_2_Template, 2, 1, "span", 14);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("routerLink", item_r4.route)("routerLinkActiveOptions", \u0275\u0275pureFunction1(5, _c02, item_r4.route === "/dashboard"));
    \u0275\u0275attribute("title", ctx_r1.collapsed() ? item_r4.label : null);
    \u0275\u0275advance();
    \u0275\u0275property("innerHTML", item_r4.icon, \u0275\u0275sanitizeHtml);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.collapsed() ? 2 : -1);
  }
}
function Layout_Conditional_11_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1, "Admin");
    \u0275\u0275elementEnd();
  }
}
function Layout_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275element(0, "div", 34);
    \u0275\u0275elementStart(1, "a", 35);
    \u0275\u0275listener("click", function Layout_Conditional_11_Template_a_click_1_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.mobileOpen.set(false));
    });
    \u0275\u0275elementStart(2, "span", 12);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(3, "svg", 5);
    \u0275\u0275element(4, "path", 36);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(5, Layout_Conditional_11_Conditional_5_Template, 2, 0, "span", 14);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275attribute("title", ctx_r1.collapsed() ? "Admin" : null);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(!ctx_r1.collapsed() ? 5 : -1);
  }
}
function Layout_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1, "Logout");
    \u0275\u0275elementEnd();
  }
}
function Layout_For_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 23);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const org_r6 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("value", org_r6.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", org_r6.name, " (", ctx_r1.formatRole(org_r6.role), ")");
  }
}
function Layout_Conditional_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 5);
    \u0275\u0275element(1, "circle", 37)(2, "path", 38);
    \u0275\u0275elementEnd();
  }
}
function Layout_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 5);
    \u0275\u0275element(1, "path", 39);
    \u0275\u0275elementEnd();
  }
}
function Layout_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 29);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(1, "svg", 40);
    \u0275\u0275element(2, "path", 41);
    \u0275\u0275elementEnd()();
  }
}
var SIDEBAR_KEY = "signage_sidebar_collapsed";
var Layout = class _Layout {
  authService = inject(AuthService);
  router = inject(Router);
  socketService = inject(DashboardSseService);
  orgState = inject(OrganisationStateService);
  theme = inject(ThemeService);
  collapsed = signal(localStorage.getItem(SIDEBAR_KEY) === "true", ...ngDevMode ? [{ debugName: "collapsed" }] : (
    /* istanbul ignore next */
    []
  ));
  mobileOpen = signal(false, ...ngDevMode ? [{ debugName: "mobileOpen" }] : (
    /* istanbul ignore next */
    []
  ));
  socketEffect = effect(() => {
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      this.socketService.connect();
    }
  }, ...ngDevMode ? [{ debugName: "socketEffect" }] : (
    /* istanbul ignore next */
    []
  ));
  navItems = [
    {
      label: "Dashboard",
      route: "/dashboard",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>'
    },
    {
      label: "Screens",
      route: "/screens",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 17h6M10 14v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      label: "Screen Groups",
      route: "/screen-groups",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M9 7v2.5a1 1 0 001 1h0a1 1 0 001-1V7M10 10.5V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      label: "Content Library",
      route: "/content",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 13l4-4 3 3 2-2 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      label: "Playlists",
      route: "/playlists",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h10M3 10h7M3 15h5M15 10v7M15 17l4-3.5-4-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      label: "Schedules",
      route: "/schedules",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      label: "Live Streams",
      route: "/live-streams",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 5a7 7 0 000 10M15 5a7 7 0 010 10M3 3a11 11 0 000 14M17 3a11 11 0 010 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      label: "Audit Log",
      route: "/audit-log",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 3h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      label: "Settings",
      route: "/settings/users",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    }
  ];
  ngOnInit() {
    this.orgState.loadOrganisations();
  }
  onResize() {
    if (window.innerWidth > 768) {
      this.mobileOpen.set(false);
    }
  }
  toggleCollapse() {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }
  onOrgChange(event) {
    const value = event.target.value;
    if (value) {
      this.orgState.select(value);
    }
  }
  formatRole(role) {
    switch (role) {
      case "org_admin":
        return "Admin";
      case "editor":
        return "Editor";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  }
  async logout() {
    this.socketService.disconnect();
    await this.authService.logout();
    this.router.navigate(["/login"]);
  }
  static \u0275fac = function Layout_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Layout)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Layout, selectors: [["app-layout"]], hostBindings: function Layout_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("resize", function Layout_resize_HostBindingHandler() {
        return ctx.onResize();
      }, \u0275\u0275resolveWindow);
    }
  }, decls: 41, vars: 21, consts: [["tabindex", "-1", "role", "presentation", 1, "overlay"], [1, "sidebar"], [1, "sidebar-header"], [1, "logo-text"], [1, "collapse-btn", "desktop-only", 3, "click"], ["width", "20", "height", "20", "viewBox", "0 0 20 20", "fill", "none"], ["d", "M7 4l6 6-6 6", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M13 4l-6 6 6 6", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round"], [1, "sidebar-nav"], ["routerLinkActive", "active", 1, "nav-item", 3, "routerLink", "routerLinkActiveOptions"], [1, "sidebar-footer"], [1, "nav-item", 3, "click"], [1, "nav-icon"], ["d", "M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round"], [1, "nav-label"], [1, "main-wrapper"], [1, "topbar"], [1, "topbar-left"], ["aria-label", "Open menu", 1, "hamburger", "mobile-only", 3, "click"], ["width", "24", "height", "24", "viewBox", "0 0 24 24", "fill", "none"], ["d", "M3 6h18M3 12h18M3 18h18", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round"], [1, "org-switcher"], [1, "org-select", 3, "change", "value", "disabled"], [3, "value"], [1, "topbar-right"], [1, "topbar-btn", 3, "click"], [1, "user-avatar"], ["cx", "10", "cy", "8", "r", "3", "stroke", "currentColor", "stroke-width", "1.5"], ["d", "M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round"], ["title", "Super Admin", 1, "admin-badge"], [1, "content"], ["tabindex", "-1", "role", "presentation", 1, "overlay", 3, "click", "keydown.escape"], ["routerLinkActive", "active", 1, "nav-item", 3, "click", "routerLink", "routerLinkActiveOptions"], [1, "nav-icon", 3, "innerHTML"], [1, "nav-divider"], ["routerLink", "/admin/organisations", "routerLinkActive", "active", 1, "nav-item", "admin-nav-item", 3, "click"], ["d", "M10 1l2.5 3.5H17l-1.5 4L18 13h-4l-2 4h-4l-2-4H2l2.5-4.5L3 5h4.5L10 1z", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linejoin", "round"], ["cx", "10", "cy", "10", "r", "4", "stroke", "currentColor", "stroke-width", "1.5"], ["d", "M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round"], ["d", "M17.39 11.39A8 8 0 018.61 2.61 8 8 0 1017.39 11.39z", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round"], ["width", "10", "height", "10", "viewBox", "0 0 10 10", "fill", "none"], ["d", "M5 0.5L6.1 3.5H9.3L6.6 5.3L7.7 8.5L5 6.5L2.3 8.5L3.4 5.3L0.7 3.5H3.9L5 0.5Z", "fill", "currentColor"]], template: function Layout_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275conditionalCreate(0, Layout_Conditional_0_Template, 1, 0, "div", 0);
      \u0275\u0275elementStart(1, "aside", 1)(2, "div", 2);
      \u0275\u0275conditionalCreate(3, Layout_Conditional_3_Template, 2, 0, "span", 3);
      \u0275\u0275elementStart(4, "button", 4);
      \u0275\u0275listener("click", function Layout_Template_button_click_4_listener() {
        return ctx.toggleCollapse();
      });
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(5, "svg", 5);
      \u0275\u0275conditionalCreate(6, Layout_Conditional_6_Template, 1, 0, ":svg:path", 6)(7, Layout_Conditional_7_Template, 1, 0, ":svg:path", 7);
      \u0275\u0275elementEnd()()();
      \u0275\u0275namespaceHTML();
      \u0275\u0275elementStart(8, "nav", 8);
      \u0275\u0275repeaterCreate(9, Layout_For_10_Template, 3, 7, "a", 9, _forTrack03);
      \u0275\u0275conditionalCreate(11, Layout_Conditional_11_Template, 6, 2);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 10)(13, "button", 11);
      \u0275\u0275listener("click", function Layout_Template_button_click_13_listener() {
        return ctx.logout();
      });
      \u0275\u0275elementStart(14, "span", 12);
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(15, "svg", 5);
      \u0275\u0275element(16, "path", 13);
      \u0275\u0275elementEnd()();
      \u0275\u0275conditionalCreate(17, Layout_Conditional_17_Template, 2, 0, "span", 14);
      \u0275\u0275elementEnd()()();
      \u0275\u0275namespaceHTML();
      \u0275\u0275elementStart(18, "div", 15)(19, "header", 16)(20, "div", 17)(21, "button", 18);
      \u0275\u0275listener("click", function Layout_Template_button_click_21_listener() {
        return ctx.mobileOpen.set(true);
      });
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(22, "svg", 19);
      \u0275\u0275element(23, "path", 20);
      \u0275\u0275elementEnd()();
      \u0275\u0275namespaceHTML();
      \u0275\u0275elementStart(24, "div", 21)(25, "select", 22);
      \u0275\u0275listener("change", function Layout_Template_select_change_25_listener($event) {
        return ctx.onOrgChange($event);
      });
      \u0275\u0275repeaterCreate(26, Layout_For_27_Template, 2, 3, "option", 23, _forTrack12);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(28, "div", 24);
      \u0275\u0275element(29, "app-global-search");
      \u0275\u0275elementStart(30, "button", 25);
      \u0275\u0275listener("click", function Layout_Template_button_click_30_listener() {
        return ctx.theme.toggle();
      });
      \u0275\u0275conditionalCreate(31, Layout_Conditional_31_Template, 3, 0, ":svg:svg", 5)(32, Layout_Conditional_32_Template, 2, 0, ":svg:svg", 5);
      \u0275\u0275elementEnd();
      \u0275\u0275element(33, "app-notification-bell");
      \u0275\u0275elementStart(34, "div", 26);
      \u0275\u0275namespaceSVG();
      \u0275\u0275elementStart(35, "svg", 5);
      \u0275\u0275element(36, "circle", 27)(37, "path", 28);
      \u0275\u0275elementEnd();
      \u0275\u0275conditionalCreate(38, Layout_Conditional_38_Template, 3, 0, "span", 29);
      \u0275\u0275elementEnd()()();
      \u0275\u0275namespaceHTML();
      \u0275\u0275elementStart(39, "main", 30);
      \u0275\u0275element(40, "router-outlet");
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.mobileOpen() ? 0 : -1);
      \u0275\u0275advance();
      \u0275\u0275classProp("collapsed", ctx.collapsed())("mobile-open", ctx.mobileOpen());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(!ctx.collapsed() ? 3 : -1);
      \u0275\u0275advance();
      \u0275\u0275attribute("aria-label", ctx.collapsed() ? "Expand sidebar" : "Collapse sidebar");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.collapsed() ? 6 : 7);
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.navItems);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.orgState.isSuperAdmin() ? 11 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275attribute("title", ctx.collapsed() ? "Logout" : null);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(!ctx.collapsed() ? 17 : -1);
      \u0275\u0275advance();
      \u0275\u0275classProp("sidebar-collapsed", ctx.collapsed());
      \u0275\u0275advance(7);
      \u0275\u0275property("value", ctx.orgState.selectedOrgId() ?? "")("disabled", ctx.orgState.organisations().length <= 1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.orgState.organisations());
      \u0275\u0275advance(4);
      \u0275\u0275attribute("aria-label", ctx.theme.isDark() ? "Switch to light mode" : "Switch to dark mode");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.theme.isDark() ? 31 : 32);
      \u0275\u0275advance(3);
      \u0275\u0275classProp("super-admin", ctx.orgState.isSuperAdmin());
      \u0275\u0275attribute("aria-label", ctx.orgState.isSuperAdmin() ? "Super Admin" : "Current user");
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.orgState.isSuperAdmin() ? 38 : -1);
    }
  }, dependencies: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell, GlobalSearch], styles: ["\n[_nghost-%COMP%] {\n  display: flex;\n  min-height: 100vh;\n}\n.overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  z-index: 40;\n}\n.sidebar[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 240px;\n  background: var(--color-bg-sidebar);\n  border-right: 1px solid var(--color-border);\n  display: flex;\n  flex-direction: column;\n  z-index: 50;\n  transition: width 0.2s ease, transform 0.2s ease;\n  overflow: hidden;\n}\n.sidebar.collapsed[_ngcontent-%COMP%] {\n  width: 60px;\n}\n.sidebar-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  height: 56px;\n  border-bottom: 1px solid var(--color-border);\n}\n.logo-text[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-primary);\n  white-space: nowrap;\n}\n.collapse-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 4px;\n  flex-shrink: 0;\n}\n.collapse-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.sidebar-nav[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow-y: auto;\n}\n.nav-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.5rem 0.75rem;\n  border-radius: 6px;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  font-size: 0.875rem;\n  white-space: nowrap;\n  border: none;\n  background: transparent;\n  cursor: pointer;\n  width: 100%;\n  text-align: left;\n  transition: background 0.15s, color 0.15s;\n}\n.nav-item[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.nav-item.active[_ngcontent-%COMP%] {\n  background: var(--color-accent);\n  color: #fff;\n}\n.nav-icon[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  flex-shrink: 0;\n}\n.nav-label[_ngcontent-%COMP%] {\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.nav-divider[_ngcontent-%COMP%] {\n  height: 1px;\n  background: var(--color-border);\n  margin: 0.5rem 0.75rem;\n}\n.admin-nav-item[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.admin-nav-item[_ngcontent-%COMP%]:hover {\n  background: rgba(245, 158, 11, 0.1);\n  color: #fbbf24;\n}\n.admin-nav-item.active[_ngcontent-%COMP%] {\n  background: #f59e0b;\n  color: #fff;\n}\n.sidebar-footer[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n  border-top: 1px solid var(--color-border);\n}\n.main-wrapper[_ngcontent-%COMP%] {\n  flex: 1;\n  margin-left: 240px;\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n  transition: margin-left 0.2s ease;\n}\n.main-wrapper.sidebar-collapsed[_ngcontent-%COMP%] {\n  margin-left: 60px;\n}\n.topbar[_ngcontent-%COMP%] {\n  position: sticky;\n  top: 0;\n  z-index: 30;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  height: 56px;\n  padding: 0 1rem;\n  background: var(--color-bg-secondary);\n  border-bottom: 1px solid var(--color-border);\n  box-shadow: 0 1px 3px var(--color-shadow);\n}\n.topbar-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.topbar-right[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.hamburger[_ngcontent-%COMP%] {\n  display: none;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-primary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.hamburger[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n}\n.org-select[_ngcontent-%COMP%] {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n  border: 1px solid var(--color-border);\n  padding: 0.375rem 0.75rem;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  min-width: 160px;\n  cursor: pointer;\n}\n.org-select[_ngcontent-%COMP%]:focus {\n  outline: 2px solid var(--color-accent);\n  outline-offset: -1px;\n}\n.org-select[_ngcontent-%COMP%]:disabled {\n  opacity: 0.7;\n  cursor: default;\n}\n.topbar-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.topbar-btn[_ngcontent-%COMP%]:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.user-avatar[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  border-radius: 999px;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-secondary);\n  border: 1px solid var(--color-border);\n}\n.user-avatar.super-admin[_ngcontent-%COMP%] {\n  border-color: #f59e0b;\n  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);\n}\n.admin-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: -2px;\n  right: -2px;\n  width: 14px;\n  height: 14px;\n  border-radius: 999px;\n  background: #f59e0b;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 1.5px solid var(--color-bg-secondary);\n}\n.content[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 1.5rem;\n}\n.mobile-only[_ngcontent-%COMP%] {\n  display: none;\n}\n@media (max-width: 1024px) {\n  .sidebar[_ngcontent-%COMP%] {\n    width: 60px;\n  }\n  .sidebar[_ngcontent-%COMP%]   .nav-label[_ngcontent-%COMP%], \n   .sidebar[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .sidebar[_ngcontent-%COMP%]   .sidebar-header[_ngcontent-%COMP%] {\n    justify-content: center;\n  }\n  .desktop-only[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .main-wrapper[_ngcontent-%COMP%] {\n    margin-left: 60px;\n  }\n  .main-wrapper.sidebar-collapsed[_ngcontent-%COMP%] {\n    margin-left: 60px;\n  }\n}\n@media (max-width: 768px) {\n  .sidebar[_ngcontent-%COMP%] {\n    transform: translateX(-100%);\n    width: 240px;\n  }\n  .sidebar[_ngcontent-%COMP%]   .nav-label[_ngcontent-%COMP%], \n   .sidebar[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n    display: inline;\n  }\n  .sidebar.mobile-open[_ngcontent-%COMP%] {\n    transform: translateX(0);\n  }\n  .main-wrapper[_ngcontent-%COMP%], \n   .main-wrapper.sidebar-collapsed[_ngcontent-%COMP%] {\n    margin-left: 0;\n  }\n  .mobile-only[_ngcontent-%COMP%] {\n    display: flex;\n  }\n  app-global-search[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .content[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n}\n/*# sourceMappingURL=layout.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Layout, [{
    type: Component,
    args: [{ selector: "app-layout", imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell, GlobalSearch], template: `
    <!-- Mobile overlay -->
    @if (mobileOpen()) {
      <div
        class="overlay"
        (click)="mobileOpen.set(false)"
        (keydown.escape)="mobileOpen.set(false)"
        tabindex="-1"
        role="presentation"
      ></div>
    }

    <!-- Sidebar -->
    <aside
      class="sidebar"
      [class.collapsed]="collapsed()"
      [class.mobile-open]="mobileOpen()"
    >
      <div class="sidebar-header">
        @if (!collapsed()) {
          <span class="logo-text">Signage</span>
        }
        <button
          class="collapse-btn desktop-only"
          (click)="toggleCollapse()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            @if (collapsed()) {
              <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            } @else {
              <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            }
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            (click)="mobileOpen.set(false)"
            [attr.title]="collapsed() ? item.label : null"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }

        @if (orgState.isSuperAdmin()) {
          <div class="nav-divider"></div>
          <a
            class="nav-item admin-nav-item"
            routerLink="/admin/organisations"
            routerLinkActive="active"
            (click)="mobileOpen.set(false)"
            [attr.title]="collapsed() ? 'Admin' : null"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 1l2.5 3.5H17l-1.5 4L18 13h-4l-2 4h-4l-2-4H2l2.5-4.5L3 5h4.5L10 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </span>
            @if (!collapsed()) {
              <span class="nav-label">Admin</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" (click)="logout()" [attr.title]="collapsed() ? 'Logout' : null">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          @if (!collapsed()) {
            <span class="nav-label">Logout</span>
          }
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-wrapper" [class.sidebar-collapsed]="collapsed()">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="hamburger mobile-only"
            (click)="mobileOpen.set(true)"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Organisation switcher -->
          <div class="org-switcher">
            <select
              class="org-select"
              [value]="orgState.selectedOrgId() ?? ''"
              (change)="onOrgChange($event)"
              [disabled]="orgState.organisations().length <= 1"
            >
              @for (org of orgState.organisations(); track org.id) {
                <option [value]="org.id">{{ org.name }} ({{ formatRole(org.role) }})</option>
              }
            </select>
          </div>
        </div>

        <div class="topbar-right">
          <!-- Global search -->
          <app-global-search />

          <!-- Theme toggle -->
          <button
            class="topbar-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (theme.isDark()) {
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            } @else {
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.39 11.39A8 8 0 018.61 2.61 8 8 0 1017.39 11.39z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            }
          </button>

          <!-- Notification bell -->
          <app-notification-bell />

          <!-- User avatar -->
          <div class="user-avatar" [class.super-admin]="orgState.isSuperAdmin()" [attr.aria-label]="orgState.isSuperAdmin() ? 'Super Admin' : 'Current user'">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            @if (orgState.isSuperAdmin()) {
              <span class="admin-badge" title="Super Admin">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 0.5L6.1 3.5H9.3L6.6 5.3L7.7 8.5L5 6.5L2.3 8.5L3.4 5.3L0.7 3.5H3.9L5 0.5Z" fill="currentColor"/>
                </svg>
              </span>
            }
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `, styles: ["/* angular:styles/component:css;2fc797caf170c9ef94b411f8cd15982617965dbf5816c53c075b920b3cd415af;/home/fschillhammer/GIT/Codeberg/signage-server/frontend/src/app/shell/layout.ts */\n:host {\n  display: flex;\n  min-height: 100vh;\n}\n.overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  z-index: 40;\n}\n.sidebar {\n  position: fixed;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 240px;\n  background: var(--color-bg-sidebar);\n  border-right: 1px solid var(--color-border);\n  display: flex;\n  flex-direction: column;\n  z-index: 50;\n  transition: width 0.2s ease, transform 0.2s ease;\n  overflow: hidden;\n}\n.sidebar.collapsed {\n  width: 60px;\n}\n.sidebar-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 1rem;\n  height: 56px;\n  border-bottom: 1px solid var(--color-border);\n}\n.logo-text {\n  font-size: 1.125rem;\n  font-weight: 700;\n  color: var(--color-text-primary);\n  white-space: nowrap;\n}\n.collapse-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 4px;\n  flex-shrink: 0;\n}\n.collapse-btn:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.sidebar-nav {\n  flex: 1;\n  padding: 0.5rem;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow-y: auto;\n}\n.nav-item {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.5rem 0.75rem;\n  border-radius: 6px;\n  color: var(--color-text-secondary);\n  text-decoration: none;\n  font-size: 0.875rem;\n  white-space: nowrap;\n  border: none;\n  background: transparent;\n  cursor: pointer;\n  width: 100%;\n  text-align: left;\n  transition: background 0.15s, color 0.15s;\n}\n.nav-item:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.nav-item.active {\n  background: var(--color-accent);\n  color: #fff;\n}\n.nav-icon {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  flex-shrink: 0;\n}\n.nav-label {\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.nav-divider {\n  height: 1px;\n  background: var(--color-border);\n  margin: 0.5rem 0.75rem;\n}\n.admin-nav-item {\n  color: #f59e0b;\n}\n.admin-nav-item:hover {\n  background: rgba(245, 158, 11, 0.1);\n  color: #fbbf24;\n}\n.admin-nav-item.active {\n  background: #f59e0b;\n  color: #fff;\n}\n.sidebar-footer {\n  padding: 0.5rem;\n  border-top: 1px solid var(--color-border);\n}\n.main-wrapper {\n  flex: 1;\n  margin-left: 240px;\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n  transition: margin-left 0.2s ease;\n}\n.main-wrapper.sidebar-collapsed {\n  margin-left: 60px;\n}\n.topbar {\n  position: sticky;\n  top: 0;\n  z-index: 30;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  height: 56px;\n  padding: 0 1rem;\n  background: var(--color-bg-secondary);\n  border-bottom: 1px solid var(--color-border);\n  box-shadow: 0 1px 3px var(--color-shadow);\n}\n.topbar-left {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.topbar-right {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.hamburger {\n  display: none;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-primary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.hamburger:hover {\n  background: var(--color-bg-tertiary);\n}\n.org-select {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n  border: 1px solid var(--color-border);\n  padding: 0.375rem 0.75rem;\n  border-radius: 6px;\n  font-size: 0.875rem;\n  min-width: 160px;\n  cursor: pointer;\n}\n.org-select:focus {\n  outline: 2px solid var(--color-accent);\n  outline-offset: -1px;\n}\n.org-select:disabled {\n  opacity: 0.7;\n  cursor: default;\n}\n.topbar-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  border: none;\n  background: transparent;\n  color: var(--color-text-secondary);\n  cursor: pointer;\n  border-radius: 6px;\n}\n.topbar-btn:hover {\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-primary);\n}\n.user-avatar {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  border-radius: 999px;\n  background: var(--color-bg-tertiary);\n  color: var(--color-text-secondary);\n  border: 1px solid var(--color-border);\n}\n.user-avatar.super-admin {\n  border-color: #f59e0b;\n  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);\n}\n.admin-badge {\n  position: absolute;\n  bottom: -2px;\n  right: -2px;\n  width: 14px;\n  height: 14px;\n  border-radius: 999px;\n  background: #f59e0b;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 1.5px solid var(--color-bg-secondary);\n}\n.content {\n  flex: 1;\n  padding: 1.5rem;\n}\n.mobile-only {\n  display: none;\n}\n@media (max-width: 1024px) {\n  .sidebar {\n    width: 60px;\n  }\n  .sidebar .nav-label,\n  .sidebar .logo-text {\n    display: none;\n  }\n  .sidebar .sidebar-header {\n    justify-content: center;\n  }\n  .desktop-only {\n    display: none;\n  }\n  .main-wrapper {\n    margin-left: 60px;\n  }\n  .main-wrapper.sidebar-collapsed {\n    margin-left: 60px;\n  }\n}\n@media (max-width: 768px) {\n  .sidebar {\n    transform: translateX(-100%);\n    width: 240px;\n  }\n  .sidebar .nav-label,\n  .sidebar .logo-text {\n    display: inline;\n  }\n  .sidebar.mobile-open {\n    transform: translateX(0);\n  }\n  .main-wrapper,\n  .main-wrapper.sidebar-collapsed {\n    margin-left: 0;\n  }\n  .mobile-only {\n    display: flex;\n  }\n  app-global-search {\n    display: none;\n  }\n  .content {\n    padding: 1rem;\n  }\n}\n/*# sourceMappingURL=layout.css.map */\n"] }]
  }], null, { onResize: [{
    type: HostListener,
    args: ["window:resize"]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Layout, { className: "Layout", filePath: "src/app/shell/layout.ts", lineNumber: 495 });
})();

// src/app/app.routes.ts
var routes = [
  { path: "login", component: Login },
  {
    path: "",
    canActivate: [authGuard],
    component: Layout,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      { path: "dashboard", loadComponent: () => import("./chunk-NUSPKNFT.js").then((m) => m.Dashboard) },
      {
        path: "admin/organisations",
        loadComponent: () => import("./chunk-VBCK5MTO.js").then((m) => m.Organisations)
      },
      {
        path: "settings/user",
        loadComponent: () => import("./chunk-VXAF6FLB.js").then((m) => m.UserSettings)
      },
      {
        path: "settings/users",
        loadComponent: () => import("./chunk-LYALIVIZ.js").then((m) => m.Users)
      },
      {
        path: "settings/org/notifications",
        loadComponent: () => import("./chunk-72GLO6PV.js").then((m) => m.OrgNotificationConfig)
      },
      {
        path: "screens",
        loadComponent: () => import("./chunk-H2U5XHBG.js").then((m) => m.Screens)
      },
      {
        path: "screen-groups",
        loadComponent: () => import("./chunk-DQWBHSTN.js").then((m) => m.ScreenGroups)
      },
      {
        path: "screen-groups/:id",
        loadComponent: () => import("./chunk-I3OGVRY2.js").then((m) => m.ScreenGroupDetail)
      },
      {
        path: "content",
        loadComponent: () => import("./chunk-HVNBNKXC.js").then((m) => m.ContentLibrary)
      },
      {
        path: "playlists",
        loadComponent: () => import("./chunk-KOZEHRQM.js").then((m) => m.Playlists)
      },
      {
        path: "schedules",
        loadComponent: () => import("./chunk-Z3MH7YOF.js").then((m) => m.Schedules)
      },
      {
        path: "live-streams",
        loadComponent: () => import("./chunk-YTWFT7X4.js").then((m) => m.LiveStreams)
      },
      {
        path: "audit-log",
        loadComponent: () => import("./chunk-QFV7JDTD.js").then((m) => m.AuditLog)
      }
    ]
  },
  { path: "**", redirectTo: "" }
];

// src/app/auth/auth.interceptor.ts
var authInterceptor = (req, next) => {
  if (!req.url.includes("/api")) {
    return next(req);
  }
  const authService = inject(AuthService);
  const orgState = inject(OrganisationStateService);
  const token = authService.getToken();
  const orgId = orgState.selectedOrgId();
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (orgId) {
    headers["X-Organisation-Id"] = orgId;
  }
  if (Object.keys(headers).length > 0) {
    return next(req.clone({ setHeaders: headers }));
  }
  return next(req);
};

// src/app/app.config.ts
var appConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withNavigationErrorHandler((error) => {
      const msg = String(error);
      if (msg.includes("dynamically imported module") || msg.includes("ChunkLoadError")) {
        window.location.reload();
      }
    })),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};

// src/app/app.ts
var App = class _App {
  static \u0275fac = function App_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _App)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _App, selectors: [["app-root"]], decls: 1, vars: 0, template: function App_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(App, [{
    type: Component,
    args: [{ selector: "app-root", imports: [RouterOutlet], template: "<router-outlet />\n" }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(App, { className: "App", filePath: "src/app/app.ts", lineNumber: 10 });
})();

// src/main.ts
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
/*! Bundled license information:

zone.js/fesm2015/zone.js:
  (**
   * @license Angular
   * (c) 2010-2026 Google LLC. https://angular.dev/
   * License: MIT
   *)
*/
//# sourceMappingURL=main.js.map
