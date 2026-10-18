import { ValidateIf } from 'class-validator';
import { LiveStreamSourceType } from '../live-stream-source-type.enum';

/** Structural slice of a DTO that the source-type conditions look at. */
interface SourceTyped {
  sourceType?: LiveStreamSourceType;
}

/** True for every create/update payload that is not an NDI stream. */
export const isPullSource = (dto: SourceTyped): boolean =>
  dto.sourceType !== LiveStreamSourceType.Ndi;

export const isNdiSource = (dto: SourceTyped): boolean =>
  dto.sourceType === LiveStreamSourceType.Ndi;

/** Validators below only run for pull streams. */
export const ValidateIfPull = (): PropertyDecorator => ValidateIf(isPullSource);

/** Validators below only run for NDI streams. */
export const ValidateIfNdi = (): PropertyDecorator => ValidateIf(isNdiSource);

/** Printable text only: no control characters (incl. newlines) in names. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
export const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;
