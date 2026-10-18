import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsIP,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsSafeOutboundUrl } from '../../common/outbound-url.validators';
import { LIVE_STREAM_SCHEMES } from '../live-stream-schemes';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { LiveStreamSourceType } from '../live-stream-source-type.enum';
import { NdiEncoderPref } from '../ndi-encoder-pref.enum';
import { NdiQualityPreset } from '../ndi-quality-preset.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';
import { IsRoutableCameraHost } from './camera-host.validator';
import { NO_CONTROL_CHARS } from './ndi-stream-fields';

export class UpdateLiveStreamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  /** Cannot change after creation; accepted only so a mismatch is rejected clearly. */
  @IsOptional()
  @IsEnum(LiveStreamSourceType)
  sourceType?: LiveStreamSourceType;

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

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsIP()
  @IsRoutableCameraHost()
  cameraHost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(NO_CONTROL_CHARS, { message: 'ndiSourceName must not contain control characters' })
  ndiSourceName?: string;

  @IsOptional()
  @IsEnum(NdiQualityPreset)
  qualityPreset?: NdiQualityPreset;

  @IsOptional()
  @IsEnum(NdiEncoderPref)
  encoderPref?: NdiEncoderPref;
}
