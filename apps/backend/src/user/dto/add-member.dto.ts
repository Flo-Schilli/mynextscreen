import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrganisationRole } from '../organisation-role.enum';

export class AddMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsEnum(OrganisationRole)
  role!: OrganisationRole;
}
