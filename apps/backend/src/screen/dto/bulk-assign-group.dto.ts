import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID, ValidateIf } from 'class-validator';

export class BulkAssignGroupDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ValidateIf((o) => o.groupId !== null)
  @IsUUID('4')
  groupId!: string | null;
}
