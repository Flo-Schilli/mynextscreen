import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
} from 'class-validator';

export class BulkUntagContentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags!: string[];
}
