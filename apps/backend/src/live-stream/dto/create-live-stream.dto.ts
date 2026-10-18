import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsIP,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsSafeOutboundUrl } from '../../common/outbound-url.validators';
import { LIVE_STREAM_SCHEMES } from '../live-stream-schemes';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { LiveStreamSourceType } from '../live-stream-source-type.enum';
import { NdiEncoderPref } from '../ndi-encoder-pref.enum';
import { NdiQualityPreset } from '../ndi-quality-preset.enum';
import { PtzProtocol } from '../ptz-protocol.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';
import { IsRoutableCameraHost } from './camera-host.validator';
import { NO_CONTROL_CHARS, ValidateIfNdi, ValidateIfPull } from './ndi-stream-fields';

export class CreateLiveStreamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(LiveStreamSourceType)
  sourceType?: LiveStreamSourceType;

  /** Pull streams only; an NDI stream has a camera instead of a URL. */
  @ValidateIfPull()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsSafeOutboundUrl(
    { schemes: LIVE_STREAM_SCHEMES },
    {
      message:
        'sourceUrl must be a valid http, https, rtmp, rtsp or rtp URL that does not point at a private or local address',
    },
  )
  sourceUrl?: string;

  /** Required for pull streams, ignored for NDI. */
  @ValidateIfPull()
  @IsEnum(LiveStreamProtocol)
  protocol?: LiveStreamProtocol;

  @IsOptional()
  @IsEnum(TranscodingPreset)
  transcodingPreset?: TranscodingPreset;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  /** NDI only: the site agent that sits next to the camera. */
  @ValidateIfNdi()
  @IsUUID()
  agentId?: string;

  /** NDI only: the camera's address, handed to NDI discovery as an extra IP. */
  @ValidateIfNdi()
  @IsIP()
  @IsRoutableCameraHost()
  cameraHost?: string;

  /** NDI only: exact source name; empty means the first source on the host. */
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

  /** NDI only: whether the camera can be steered over VISCA. */
  @IsOptional()
  @IsBoolean()
  ptzEnabled?: boolean;

  @IsOptional()
  @IsEnum(PtzProtocol)
  ptzProtocol?: PtzProtocol;

  /** Absent means the protocol's default port. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  ptzPort?: number;
}
