import { IsOptional, IsString, IsNotEmpty, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { IsSafeOutboundUrl } from '../../common/outbound-url.validators';
import { LIVE_STREAM_SCHEMES } from '../live-stream-schemes';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';

export class UpdateLiveStreamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @MaxLength(2048)
  @IsSafeOutboundUrl(
    { schemes: LIVE_STREAM_SCHEMES },
    {
      message:
        'sourceUrl must be a valid http, https, rtmp, rtsp or rtp URL that does not point at a private or local address',
    },
  )
  sourceUrl?: string;

  @IsOptional()
  @IsEnum(LiveStreamProtocol)
  protocol?: LiveStreamProtocol;

  @IsOptional()
  @IsEnum(TranscodingPreset)
  transcodingPreset?: TranscodingPreset;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;
}
