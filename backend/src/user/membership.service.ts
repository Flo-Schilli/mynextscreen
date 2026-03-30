import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserOrganisationMembership } from './user-organisation-membership.entity';
import { OrganisationRole } from './organisation-role.enum';
import { randomUUID } from 'node:crypto';
import {
  AUDIT_USER_INVITED,
  AUDIT_USER_ROLE_CHANGED,
  AUDIT_USER_REMOVED,
  AuditUserEvent,
} from '../audit-log/audit.events';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganisationMembership)
    private readonly membershipRepository: Repository<UserOrganisationMembership>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listMembers(
    organisationId: string,
  ): Promise<UserOrganisationMembership[]> {
    return this.membershipRepository.find({
      where: { organisationId },
      relations: ['user'],
    });
  }

  async addMember(
    organisationId: string,
    email: string,
    role: OrganisationRole,
  ): Promise<UserOrganisationMembership> {
    // Find or create user by email
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Create placeholder user with a generated ID
      user = this.userRepository.create({
        id: randomUUID(),
        email,
        name: null,
      });
      user = await this.userRepository.save(user);
    }

    // Check if membership already exists
    const existing = await this.membershipRepository.findOne({
      where: { userId: user.id, organisationId },
    });
    if (existing) {
      throw new ConflictException(
        'User is already a member of this organisation',
      );
    }

    const membership = this.membershipRepository.create({
      userId: user.id,
      organisationId,
      role,
    });
    const saved = await this.membershipRepository.save(membership);
    saved.user = user;
    this.eventEmitter.emit(
      AUDIT_USER_INVITED,
      new AuditUserEvent(user.id, organisationId, null, { email, role }),
    );
    return saved;
  }

  async updateRole(
    organisationId: string,
    userId: string,
    role: OrganisationRole,
  ): Promise<UserOrganisationMembership> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organisationId },
      relations: ['user'],
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If demoting from OrgAdmin, ensure they are not the last one
    if (
      membership.role === OrganisationRole.OrgAdmin &&
      role !== OrganisationRole.OrgAdmin
    ) {
      await this.ensureNotLastAdmin(organisationId);
    }

    const oldRole = membership.role;
    membership.role = role;
    const saved = await this.membershipRepository.save(membership);
    this.eventEmitter.emit(
      AUDIT_USER_ROLE_CHANGED,
      new AuditUserEvent(userId, organisationId, null, {
        oldRole,
        newRole: role,
      }),
    );
    return saved;
  }

  async removeMember(organisationId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organisationId },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot remove the last Org Admin
    if (membership.role === OrganisationRole.OrgAdmin) {
      await this.ensureNotLastAdmin(organisationId);
    }

    await this.membershipRepository.remove(membership);
    this.eventEmitter.emit(
      AUDIT_USER_REMOVED,
      new AuditUserEvent(userId, organisationId, null, null),
    );
  }

  private async ensureNotLastAdmin(organisationId: string): Promise<void> {
    const adminCount = await this.membershipRepository.count({
      where: { organisationId, role: OrganisationRole.OrgAdmin },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot remove or demote the last Org Admin of this organisation',
      );
    }
  }
}
