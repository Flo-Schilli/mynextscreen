"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const user_organisation_membership_entity_1 = require("./user-organisation-membership.entity");
const organisation_role_enum_1 = require("./organisation-role.enum");
const node_crypto_1 = require("node:crypto");
const audit_events_1 = require("../audit-log/audit.events");
let MembershipService = class MembershipService {
    userRepository;
    membershipRepository;
    eventEmitter;
    constructor(userRepository, membershipRepository, eventEmitter) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.eventEmitter = eventEmitter;
    }
    async listMembers(organisationId) {
        return this.membershipRepository.find({
            where: { organisationId },
            relations: ['user'],
        });
    }
    async addMember(organisationId, email, role) {
        let user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            user = this.userRepository.create({
                id: (0, node_crypto_1.randomUUID)(),
                email,
                name: null,
            });
            user = await this.userRepository.save(user);
        }
        const existing = await this.membershipRepository.findOne({
            where: { userId: user.id, organisationId },
        });
        if (existing) {
            throw new common_1.ConflictException('User is already a member of this organisation');
        }
        const membership = this.membershipRepository.create({
            userId: user.id,
            organisationId,
            role,
        });
        const saved = await this.membershipRepository.save(membership);
        saved.user = user;
        this.eventEmitter.emit(audit_events_1.AUDIT_USER_INVITED, new audit_events_1.AuditUserEvent(user.id, organisationId, null, { email, role }));
        return saved;
    }
    async updateRole(organisationId, userId, role) {
        const membership = await this.membershipRepository.findOne({
            where: { userId, organisationId },
            relations: ['user'],
        });
        if (!membership) {
            throw new common_1.NotFoundException('Membership not found');
        }
        if (membership.role === organisation_role_enum_1.OrganisationRole.OrgAdmin &&
            role !== organisation_role_enum_1.OrganisationRole.OrgAdmin) {
            await this.ensureNotLastAdmin(organisationId);
        }
        const oldRole = membership.role;
        membership.role = role;
        const saved = await this.membershipRepository.save(membership);
        this.eventEmitter.emit(audit_events_1.AUDIT_USER_ROLE_CHANGED, new audit_events_1.AuditUserEvent(userId, organisationId, null, {
            oldRole,
            newRole: role,
        }));
        return saved;
    }
    async removeMember(organisationId, userId) {
        const membership = await this.membershipRepository.findOne({
            where: { userId, organisationId },
        });
        if (!membership) {
            throw new common_1.NotFoundException('Membership not found');
        }
        if (membership.role === organisation_role_enum_1.OrganisationRole.OrgAdmin) {
            await this.ensureNotLastAdmin(organisationId);
        }
        await this.membershipRepository.remove(membership);
        this.eventEmitter.emit(audit_events_1.AUDIT_USER_REMOVED, new audit_events_1.AuditUserEvent(userId, organisationId, null, null));
    }
    async ensureNotLastAdmin(organisationId) {
        const adminCount = await this.membershipRepository.count({
            where: { organisationId, role: organisation_role_enum_1.OrganisationRole.OrgAdmin },
        });
        if (adminCount <= 1) {
            throw new common_1.BadRequestException('Cannot remove or demote the last Org Admin of this organisation');
        }
    }
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_organisation_membership_entity_1.UserOrganisationMembership)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], MembershipService);
//# sourceMappingURL=membership.service.js.map