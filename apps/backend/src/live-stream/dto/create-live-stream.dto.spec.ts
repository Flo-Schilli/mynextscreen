import { validate } from 'class-validator';
import { CreateLiveStreamDto } from './create-live-stream.dto';
import { LiveStreamProtocol } from '../live-stream-protocol.enum';
import { TranscodingPreset } from '../transcoding-preset.enum';

function createDto(overrides: Partial<CreateLiveStreamDto> = {}): CreateLiveStreamDto {
  const dto = new CreateLiveStreamDto();
  dto.name = 'Test Stream';
  dto.sourceUrl = 'rtmp://example.com/live/stream-key';
  dto.protocol = LiveStreamProtocol.Rtmp;
  Object.assign(dto, overrides);
  return dto;
}

describe('CreateLiveStreamDto', () => {
  it('should pass validation without optional transcoding fields', async () => {
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

  describe('sourceUrl (SSRF)', () => {
    it.each([
      'http://127.0.0.1:6379/',
      'http://169.254.169.254/latest/meta-data/',
      'rtmp://10.0.0.5/live',
      'rtsp://localhost/stream',
    ])('rejects the internal target %s', async (sourceUrl) => {
      const errors = await validate(createDto({ sourceUrl }));
      expect(errors.map((error) => error.property)).toContain('sourceUrl');
    });

    it.each(['file:///etc/passwd', 'concat:/etc/passwd'])(
      'keeps rejecting the disallowed scheme %s',
      async (sourceUrl) => {
        const errors = await validate(createDto({ sourceUrl }));
        expect(errors.map((error) => error.property)).toContain('sourceUrl');
      },
    );

    it.each(['rtmp://example.com/live/key', 'https://cdn.example.com/stream.m3u8'])(
      'accepts the public source %s',
      async (sourceUrl) => {
        const errors = await validate(createDto({ sourceUrl }));
        expect(errors).toHaveLength(0);
      },
    );
  });
});
