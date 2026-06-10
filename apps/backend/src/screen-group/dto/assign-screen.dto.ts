import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignScreenDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  gridRow?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gridColumn?: number;
}
