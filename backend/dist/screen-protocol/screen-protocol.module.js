"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenProtocolModule = exports.SCREEN_PROTOCOL_ADAPTER = void 0;
const common_1 = require("@nestjs/common");
const json_protocol_adapter_1 = require("./json-protocol-adapter");
exports.SCREEN_PROTOCOL_ADAPTER = 'SCREEN_PROTOCOL_ADAPTER';
let ScreenProtocolModule = class ScreenProtocolModule {
};
exports.ScreenProtocolModule = ScreenProtocolModule;
exports.ScreenProtocolModule = ScreenProtocolModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.SCREEN_PROTOCOL_ADAPTER,
                useClass: json_protocol_adapter_1.JsonProtocolAdapter,
            },
        ],
        exports: [exports.SCREEN_PROTOCOL_ADAPTER],
    })
], ScreenProtocolModule);
//# sourceMappingURL=screen-protocol.module.js.map