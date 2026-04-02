import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  Matches,
  MaxLength,
} from 'class-validator';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';

export class CreateLiveStreamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @Matches(/^(https?|rtmp|rtsp|rtp):\/\/.+/, {
    message: 'sourceUrl must be a valid URL (http, https, rtmp, rtsp, or rtp)',
  })
  sourceUrl!: string;

  @IsEnum(LiveStreamProtocol)
  protocol!: LiveStreamProtocol;

  @IsOptional()
  @IsEnum(TranscodingPreset)
  transcodingPreset?: TranscodingPreset;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;
}
