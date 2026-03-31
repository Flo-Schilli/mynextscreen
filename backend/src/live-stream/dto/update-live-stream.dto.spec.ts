import { validate } from 'class-validator';
import { UpdateLiveStreamDto } from './update-live-stream.dto';
import { TranscodingPreset } from '../transcoding-preset.enum';

function createDto(
  overrides: Partial<UpdateLiveStreamDto> = {},
): UpdateLiveStreamDto {
  const dto = new UpdateLiveStreamDto();
  Object.assign(dto, overrides);
  return dto;
}

describe('UpdateLiveStreamDto', () => {
  it('should pass validation with no fields set', async () => {
    const dto = createDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept a valid transcodingPreset', async () => {
    for (const preset of Object.values(TranscodingPreset)) {
      const dto = createDto({ transcodingPreset: preset });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should reject an invalid transcodingPreset', async () => {
    const dto = createDto({
      transcodingPreset: 'ultra_4k' as TranscodingPreset,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'transcodingPreset')).toBe(true);
  });

  it('should accept audioEnabled as true', async () => {
    const dto = createDto({ audioEnabled: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept audioEnabled as false', async () => {
    const dto = createDto({ audioEnabled: false });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject audioEnabled with a non-boolean value', async () => {
    const dto = createDto({ audioEnabled: 'yes' as unknown as boolean });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'audioEnabled')).toBe(true);
  });
});
