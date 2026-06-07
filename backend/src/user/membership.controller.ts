import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from './organisation-role.enum';
import { MembershipService } from './membership.service';
import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import { UserOrganisationMembership } from './user-organisation-membership.entity';

@Controller('organisations/:orgId/members')
@Roles(OrganisationRole.OrgAdmin)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  listMembers(@Param('orgId') orgId: string): Promise<UserOrganisationMembership[]> {
    return this.membershipService.listMembers(orgId);
  }

  @Post()
  addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
  ): Promise<UserOrganisationMembership> {
    return this.membershipService.addMember(orgId, dto.email, dto.role);
  }

  @Patch(':userId')
  updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<UserOrganisationMembership> {
    return this.membershipService.updateRole(orgId, userId, dto.role);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('orgId') orgId: string, @Param('userId') userId: string): Promise<void> {
    return this.membershipService.removeMember(orgId, userId);
  }
}
