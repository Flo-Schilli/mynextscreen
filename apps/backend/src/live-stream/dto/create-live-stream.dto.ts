import { IsNotEmpty, IsOptional, IsString, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { IsSafeOutboundUrl } from '../../common/outbound-url.validators';
import { LIVE_STREAM_SCHEMES } from '../live-stream-schemes';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';

export class CreateLiveStreamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @MaxLength(2048)
  @IsSafeOutboundUrl(
    { schemes: LIVE_STREAM_SCHEMES },
    {
      message:
        'sourceUrl must be a valid http, https, rtmp, rtsp or rtp URL that does not point at a private or local address',
    },
  )
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
