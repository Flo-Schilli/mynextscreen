"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenAuth = exports.IS_SCREEN_AUTH_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_SCREEN_AUTH_KEY = 'isScreenAuth';
const ScreenAuth = () => (0, common_1.SetMetadata)(exports.IS_SCREEN_AUTH_KEY, true);
exports.ScreenAuth = ScreenAuth;
//# sourceMappingURL=screen-auth.decorator.js.map