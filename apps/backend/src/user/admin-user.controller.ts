import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { removeOrganisationMedia } from '../content/content-storage.util';
import { UserService, type UserWithMembershipsView } from './user.service';

/**
 * Super-admin user administration: a flat overview of every user (with org
 * memberships + roles) and single-user deletion. Guarded by SuperAdminGuard;
 * deleting the last super-admin is refused (lockout protection).
 */
@Controller('admin/users')
@UseGuards(SuperAdminGuard)
export class AdminUserController {
  private readonly mediaBasePath: string;

  constructor(
    private readonly users: UserService,
    private readonly config: ConfigService,
  ) {
    this.mediaBasePath = this.config.get<string>('MEDIA_BASE_PATH', './media');
  }

  @Get()
  listAll(): Promise<UserWithMembershipsView[]> {
    return this.users.listAllWithMemberships();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    // The last-super-admin lockout guard runs atomically inside the delete
    // transaction (row lock + re-count) so concurrent deletes can't race to zero
    // super-admins; it throws ForbiddenException('Cannot delete the last super-admin').
    const orphanedOrgIds = await this.users.deleteUser(id, { guardLastSuperAdmin: true });
    for (const orgId of orphanedOrgIds) {
      await removeOrganisationMedia(this.mediaBasePath, orgId);
    }
  }
}
