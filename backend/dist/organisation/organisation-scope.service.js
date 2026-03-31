"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganisationScopedService = void 0;
const common_1 = require("@nestjs/common");
class OrganisationScopedService {
    repository;
    entityName;
    constructor(repository, entityName) {
        this.repository = repository;
        this.entityName = entityName;
    }
    async findAll(organisationId) {
        return this.repository.find({
            where: { organisationId },
        });
    }
    async findOne(organisationId, id) {
        const entity = await this.repository.findOne({
            where: { organisationId, id },
        });
        if (!entity) {
            throw new common_1.NotFoundException(`${this.entityName} with id "${id}" not found in organisation "${organisationId}"`);
        }
        return entity;
    }
    async create(organisationId, data) {
        const entity = this.repository.create({
            ...data,
            organisationId,
        });
        return this.repository.save(entity);
    }
    async update(organisationId, id, data) {
        const entity = await this.findOne(organisationId, id);
        Object.assign(entity, data);
        return this.repository.save(entity);
    }
    async remove(organisationId, id) {
        const entity = await this.findOne(organisationId, id);
        await this.repository.remove(entity);
    }
}
exports.OrganisationScopedService = OrganisationScopedService;
//# sourceMappingURL=organisation-scope.service.js.map