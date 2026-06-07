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
import { Organisation } from './organisation.entity';
import { UserOrganisationMembership } from '../user/user-organisation-membership.entity';

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

  // ── Super-admin member management (bypasses OrgAdmin role check) ──

  @Get(':id/members')
  listMembers(@Param('id', ParseUUIDPipe) id: string): Promise<UserOrganisationMembership[]> {
    return this.membershipService.listMembers(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<UserOrganisationMembership> {
    return this.membershipService.addMember(id, dto.email, dto.role);
  }

  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<UserOrganisationMembership> {
    return this.membershipService.updateRole(id, userId, dto.role);
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
