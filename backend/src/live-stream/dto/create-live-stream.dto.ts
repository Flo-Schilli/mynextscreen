import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';

export class CreateLiveStreamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsUrl({}, { message: 'sourceUrl must be a valid URL' })
  sourceUrl!: string;

  @IsEnum(LiveStreamProtocol)
  protocol!: LiveStreamProtocol;
}
