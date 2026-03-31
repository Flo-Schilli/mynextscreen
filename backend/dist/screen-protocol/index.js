"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenEventType = exports.ScreenEvent = exports.ScreenState = exports.SCREEN_PROTOCOL_ADAPTER = exports.ScreenProtocolModule = void 0;
var screen_protocol_module_1 = require("./screen-protocol.module");
Object.defineProperty(exports, "ScreenProtocolModule", { enumerable: true, get: function () { return screen_protocol_module_1.ScreenProtocolModule; } });
Object.defineProperty(exports, "SCREEN_PROTOCOL_ADAPTER", { enumerable: true, get: function () { return screen_protocol_module_1.SCREEN_PROTOCOL_ADAPTER; } });
var screen_state_model_1 = require("./screen-state.model");
Object.defineProperty(exports, "ScreenState", { enumerable: true, get: function () { return screen_state_model_1.ScreenState; } });
var screen_event_model_1 = require("./screen-event.model");
Object.defineProperty(exports, "ScreenEvent", { enumerable: true, get: function () { return screen_event_model_1.ScreenEvent; } });
var screen_event_type_enum_1 = require("./screen-event-type.enum");
Object.defineProperty(exports, "ScreenEventType", { enumerable: true, get: function () { return screen_event_type_enum_1.ScreenEventType; } });
//# sourceMappingURL=index.js.map