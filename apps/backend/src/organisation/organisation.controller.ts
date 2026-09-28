import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrganisationService } from './organisation.service';
import { MembershipService } from '../user/membership.service';
import { CreateOrganisationDto, UpdateOrganisationDto } from './dto';
import { AddMemberDto, UpdateMemberRoleDto } from '../user/dto';
import type { Organisation } from '../db/schema';
import { toMemberResponse, type MemberResponse } from '../user/member-response';

@Controller('organisations')
@UseGuards(SuperAdminGuard)
export class OrganisationController {
  constructor(
    private readonly organisationService: OrganisationService,
    private readonly membershipService: MembershipService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateOrganisationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Organisation> {
    return this.organisationService.create(dto, req.user);
  }

  @Get()
  findAll(): Promise<Organisation[]> {
    return this.organisationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Organisation> {
    return this.organisationService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
  ): Promise<Organisation> {
    return this.organisationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.organisationService.remove(id);
  }

  // ── Super-admin member management (bypasses OrgAdmin role check) ──

  // All three go through toMemberResponse, like the org-admin routes: the raw
  // membership rows carry the joined user record, i.e. passwordHash and any
  // live reset / verification / email-change token.

  @Get(':id/members')
  async listMembers(@Param('id', ParseUUIDPipe) id: string): Promise<MemberResponse[]> {
    const members = await this.membershipService.listMembers(id);
    return members.map(toMemberResponse);
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<MemberResponse> {
    return toMemberResponse(await this.membershipService.addMember(id, dto.email, dto.role));
  }

  @Patch(':id/members/:userId')
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponse> {
    return toMemberResponse(await this.membershipService.updateRole(id, userId, dto.role));
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.membershipService.removeMember(id, userId);
  }
}
