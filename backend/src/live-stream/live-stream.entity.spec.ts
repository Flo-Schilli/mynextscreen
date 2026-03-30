import { validate } from 'class-validator';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';

function createLiveStream(overrides: Partial<LiveStream> = {}): LiveStream {
  const stream = new LiveStream();
  stream.organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  stream.name = 'Test Stream';
  stream.sourceUrl = 'rtmp://example.com/live/stream-key';
  stream.protocol = LiveStreamProtocol.Rtmp;
  stream.status = LiveStreamStatus.Idle;
  Object.assign(stream, overrides);
  return stream;
}

describe('LiveStream entity validation', () => {
  it('should pass validation with valid data', async () => {
    const stream = createLiveStream();
    const errors = await validate(stream);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is empty', async () => {
    const stream = createLiveStream({ name: '' });
    const errors = await validate(stream);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when sourceUrl is empty', async () => {
    const stream = createLiveStream({ sourceUrl: '' });
    const errors = await validate(stream);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'sourceUrl')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const stream = createLiveStream({ organisationId: '' });
    const errors = await validate(stream);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should accept rtmp protocol', async () => {
    const stream = createLiveStream({ protocol: LiveStreamProtocol.Rtmp });
    const errors = await validate(stream);
    expect(errors).toHaveLength(0);
  });

  it('should accept rtp protocol', async () => {
    const stream = createLiveStream({ protocol: LiveStreamProtocol.Rtp });
    const errors = await validate(stream);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with invalid protocol', async () => {
    const stream = createLiveStream({
      protocol: 'invalid' as LiveStreamProtocol,
    });
    const errors = await validate(stream);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'protocol')).toBe(true);
  });

  it('should accept all valid status values', async () => {
    for (const status of Object.values(LiveStreamStatus)) {
      const stream = createLiveStream({ status });
      const errors = await validate(stream);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation with invalid status', async () => {
    const stream = createLiveStream({ status: 'unknown' as LiveStreamStatus });
    const errors = await validate(stream);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('should have correct default field values when instantiated', () => {
    const stream = new LiveStream();
    expect(stream.id).toBeUndefined();
    expect(stream.createdAt).toBeUndefined();
    expect(stream.updatedAt).toBeUndefined();
  });
});
