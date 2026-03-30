import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';

export class UpdateLiveStreamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'sourceUrl must be a valid URL' })
  sourceUrl?: string;

  @IsOptional()
  @IsEnum(LiveStreamProtocol)
  protocol?: LiveStreamProtocol;
}
