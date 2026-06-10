import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  users,
  userOrganisationMemberships,
  type User,
  type UserOrganisationMembership,
} from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';
import {
  AUDIT_USER_INVITED,
  AUDIT_USER_ROLE_CHANGED,
  AUDIT_USER_REMOVED,
  AuditUserEvent,
} from '../audit-log/audit.events';

type MembershipWithUser = UserOrganisationMembership & { user: User };

@Injectable()
export class MembershipService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listMembers(organisationId: string): Promise<MembershipWithUser[]> {
    return this.db.query.userOrganisationMemberships.findMany({
      where: eq(userOrganisationMemberships.organisationId, organisationId),
      with: { user: true },
    });
  }

  async addMember(
    organisationId: string,
    email: string,
    role: OrganisationRole,
  ): Promise<MembershipWithUser> {
    // Find or create user by email
    let [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      // Create placeholder user with a generated ID
      [user] = await this.db
        .insert(users)
        .values({ id: randomUUID(), email, name: null })
        .returning();
    }

    // Check if membership already exists
    const [existing] = await this.db
      .select()
      .from(userOrganisationMemberships)
      .where(
        and(
          eq(userOrganisationMemberships.userId, user.id),
          eq(userOrganisationMemberships.organisationId, organisationId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new ConflictException('User is already a member of this organisation');
    }

    const [saved] = await this.db
      .insert(userOrganisationMemberships)
      .values({ userId: user.id, organisationId, role })
      .returning();
    this.eventEmitter.emit(
      AUDIT_USER_INVITED,
      new AuditUserEvent(user.id, organisationId, null, { email, role }),
    );
    return { ...saved, user };
  }

  async updateRole(
    organisationId: string,
    userId: string,
    role: OrganisationRole,
  ): Promise<MembershipWithUser> {
    const membership = await this.db.query.userOrganisationMemberships.findFirst({
      where: and(
        eq(userOrganisationMemberships.userId, userId),
        eq(userOrganisationMemberships.organisationId, organisationId),
      ),
      with: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If demoting from OrgAdmin, ensure they are not the last one
    if (membership.role === OrganisationRole.OrgAdmin && role !== OrganisationRole.OrgAdmin) {
      await this.ensureNotLastAdmin(organisationId);
    }

    const oldRole = membership.role;
    const [saved] = await this.db
      .update(userOrganisationMemberships)
      .set({ role })
      .where(eq(userOrganisationMemberships.id, membership.id))
      .returning();
    this.eventEmitter.emit(
      AUDIT_USER_ROLE_CHANGED,
      new AuditUserEvent(userId, organisationId, null, {
        oldRole,
        newRole: role,
      }),
    );
    return { ...saved, user: membership.user };
  }

  async removeMember(organisationId: string, userId: string): Promise<void> {
    const [membership] = await this.db
      .select()
      .from(userOrganisationMemberships)
      .where(
        and(
          eq(userOrganisationMemberships.userId, userId),
          eq(userOrganisationMemberships.organisationId, organisationId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot remove the last Org Admin
    if (membership.role === OrganisationRole.OrgAdmin) {
      await this.ensureNotLastAdmin(organisationId);
    }

    await this.db
      .delete(userOrganisationMemberships)
      .where(eq(userOrganisationMemberships.id, membership.id));
    this.eventEmitter.emit(
      AUDIT_USER_REMOVED,
      new AuditUserEvent(userId, organisationId, null, null),
    );
  }

  private async ensureNotLastAdmin(organisationId: string): Promise<void> {
    const adminCount = await this.db.$count(
      userOrganisationMemberships,
      and(
        eq(userOrganisationMemberships.organisationId, organisationId),
        eq(userOrganisationMemberships.role, OrganisationRole.OrgAdmin),
      ),
    );
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot remove or demote the last Org Admin of this organisation',
      );
    }
  }
}
