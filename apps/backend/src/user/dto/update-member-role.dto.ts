import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrganisationRole } from '../organisation-role.enum';

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsEnum(OrganisationRole)
  role!: OrganisationRole;
}
