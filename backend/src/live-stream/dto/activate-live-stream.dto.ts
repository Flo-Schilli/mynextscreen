import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class ActivateLiveStreamDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetScreenIds?: string[];

  @IsOptional()
  @IsUUID('4')
  targetGroupId?: string;
}
