"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentOrganisation = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentOrganisation = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const organisationId = request.headers?.['x-organisation-id'] ||
        request.query?.organisationId;
    if (!organisationId) {
        throw new common_1.BadRequestException('Missing organisation context. Provide X-Organisation-Id header or organisationId query parameter.');
    }
    return organisationId;
});
//# sourceMappingURL=current-organisation.decorator.js.map