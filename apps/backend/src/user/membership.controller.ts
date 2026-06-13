import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth';
import { OrganisationRole } from './organisation-role.enum';
import { MembershipService } from './membership.service';
import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import { toMemberResponse, type MemberResponse } from './member-response';

@Controller('organisations/:orgId/members')
@Roles(OrganisationRole.OrgAdmin)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  async listMembers(@Param('orgId') orgId: string): Promise<MemberResponse[]> {
    const members = await this.membershipService.listMembers(orgId);
    return members.map(toMemberResponse);
  }

  @Post()
  async addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MemberResponse> {
    return toMemberResponse(
      await this.membershipService.addMember(orgId, dto.email, dto.role, req.user.userId),
    );
  }

  @Patch(':userId')
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MemberResponse> {
    return toMemberResponse(
      await this.membershipService.updateRole(orgId, userId, dto.role, req.user.userId),
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.membershipService.removeMember(orgId, userId, req.user.userId);
  }
}
