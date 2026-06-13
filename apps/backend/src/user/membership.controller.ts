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
  ): Promise<MemberResponse> {
    return toMemberResponse(await this.membershipService.addMember(orgId, dto.email, dto.role));
  }

  @Patch(':userId')
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponse> {
    return toMemberResponse(await this.membershipService.updateRole(orgId, userId, dto.role));
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('orgId') orgId: string, @Param('userId') userId: string): Promise<void> {
    return this.membershipService.removeMember(orgId, userId);
  }
}
