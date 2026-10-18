import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLiveStreamDto } from './create-live-stream.dto';
import { UpdateLiveStreamDto } from './update-live-stream.dto';

const AGENT_ID = '770e8400-e29b-41d4-a716-446655440000';

async function failedProperties(payload: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateLiveStreamDto, payload));
  return errors.map((e) => e.property).sort();
}

describe('CreateLiveStreamDto source type matrix', () => {
  const ndi = { name: 'Cam', sourceType: 'ndi', agentId: AGENT_ID, cameraHost: '192.168.1.50' };

  it('accepts a minimal NDI stream without sourceUrl and protocol', async () => {
    expect(await failedProperties(ndi)).toEqual([]);
  });

  it('accepts all optional NDI fields', async () => {
    expect(
      await failedProperties({
        ...ndi,
        ndiSourceName: 'CAM (Stage)',
        qualityPreset: '1080p30',
        encoderPref: 'hardware',
      }),
    ).toEqual([]);
  });

  it('requires agentId and cameraHost for NDI', async () => {
    expect(await failedProperties({ name: 'Cam', sourceType: 'ndi' })).toEqual([
      'agentId',
      'cameraHost',
    ]);
  });

  it.each([
    ['agentId', 'not-a-uuid'],
    ['cameraHost', 'camera.local'],
    ['ndiSourceName', 'bad\nname'],
    ['ndiSourceName', 'x'.repeat(201)],
    ['qualityPreset', '4k'],
    ['encoderPref', 'gpu'],
  ])('rejects invalid %s', async (property, value) => {
    expect(await failedProperties({ ...ndi, [property]: value })).toEqual([property]);
  });

  it.each(['127.0.0.1', '0.0.0.0', '169.254.10.1', '224.0.0.1', '::1', '::', 'fe80::1', 'ff02::1'])(
    'rejects unusable cameraHost %s',
    async (cameraHost) => {
      expect(await failedProperties({ ...ndi, cameraHost })).toEqual(['cameraHost']);
    },
  );

  it('applies the same cameraHost rule on update', async () => {
    const errors = await validate(
      plainToInstance(UpdateLiveStreamDto, { cameraHost: '127.0.0.1' }),
    );
    expect(errors.map((e) => e.property)).toEqual(['cameraHost']);
  });

  it('does not validate sourceUrl for NDI', async () => {
    expect(await failedProperties({ ...ndi, sourceUrl: 'http://127.0.0.1/x' })).toEqual([]);
  });

  it('keeps requiring sourceUrl and protocol for pull streams', async () => {
    expect(await failedProperties({ name: 'Cam' })).toEqual(['protocol', 'sourceUrl']);
    expect(await failedProperties({ name: 'Cam', sourceType: 'pull' })).toEqual([
      'protocol',
      'sourceUrl',
    ]);
  });

  it('accepts a valid pull stream without NDI fields', async () => {
    expect(
      await failedProperties({
        name: 'Cam',
        sourceUrl: 'rtmp://example.com/live/key',
        protocol: 'rtmp',
      }),
    ).toEqual([]);
  });

  it('does not validate agentId or cameraHost for pull streams', async () => {
    expect(
      await failedProperties({
        name: 'Cam',
        sourceUrl: 'rtmp://example.com/live/key',
        protocol: 'rtmp',
        agentId: 'x',
        cameraHost: 'y',
      }),
    ).toEqual([]);
  });

  it('rejects an unknown source type', async () => {
    expect(await failedProperties({ ...ndi, sourceType: 'srt' })).toContain('sourceType');
  });
});

describe('UpdateLiveStreamDto NDI fields', () => {
  async function failed(payload: Record<string, unknown>): Promise<string[]> {
    const errors = await validate(plainToInstance(UpdateLiveStreamDto, payload));
    return errors.map((e) => e.property);
  }

  it('accepts an empty and a preset-only update', async () => {
    expect(await failed({})).toEqual([]);
    expect(await failed({ qualityPreset: 'preview', encoderPref: 'software' })).toEqual([]);
  });

  it.each([
    ['agentId', 'nope'],
    ['cameraHost', 'cam'],
    ['ndiSourceName', 'a\tb'],
    ['qualityPreset', 'x'],
    ['encoderPref', 'x'],
    ['sourceType', 'x'],
  ])('rejects invalid %s', async (property, value) => {
    expect(await failed({ [property]: value })).toEqual([property]);
  });
});

describe('PTZ fields on create and update', () => {
  const ndi = { name: 'Cam', sourceType: 'ndi', agentId: AGENT_ID, cameraHost: '192.168.1.50' };

  it('accepts PTZ settings', async () => {
    expect(
      await failedProperties({ ...ndi, ptzEnabled: true, ptzProtocol: 'visca_tcp', ptzPort: 5678 }),
    ).toEqual([]);
  });

  it.each([
    ['ptzEnabled', 'yes'],
    ['ptzProtocol', 'onvif'],
    ['ptzPort', 0],
    ['ptzPort', 65536],
    ['ptzPort', 80.5],
  ])('rejects invalid %s=%s on create', async (property, value) => {
    expect(await failedProperties({ ...ndi, [property]: value })).toEqual([property]);
  });

  it('validates the same fields on update', async () => {
    const errors = await validate(
      plainToInstance(UpdateLiveStreamDto, { ptzEnabled: 1, ptzProtocol: 'x', ptzPort: 70000 }),
    );

    expect(errors.map((e) => e.property).sort()).toEqual(['ptzEnabled', 'ptzPort', 'ptzProtocol']);
  });
});
