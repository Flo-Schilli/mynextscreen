import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AgentReportDto } from './agent-report.dto';

async function errorsFor(payload: unknown): Promise<number> {
  return (await validate(plainToInstance(AgentReportDto, payload))).length;
}

describe('AgentReportDto capturePlugin', () => {
  const hash = (c: string): string => c.repeat(64);
  const valid = {
    state: 'license_required',
    pluginVersion: '0.1.0',
    apiVersion: '1',
    sdkVersion: '6.3.2.0',
    license: {
      licenseSha256: hash('a'),
      ndiLicenseSha256: hash('b'),
      termsSha256: hash('c'),
    },
  };

  it('accepts the full block together with an empty screens array', async () => {
    expect(await errorsFor({ screens: [], capturePlugin: valid })).toBe(0);
  });

  it('accepts a minimal block', async () => {
    expect(await errorsFor({ screens: [], capturePlugin: { state: 'ready' } })).toBe(0);
  });

  it('still accepts a report without the block', async () => {
    expect(await errorsFor({ screens: [] })).toBe(0);
  });

  it('accepts an error block with a known code', async () => {
    expect(
      await errorsFor({
        screens: [],
        capturePlugin: { state: 'incompatible', errorCode: 'unsupported_api_version' },
      }),
    ).toBe(0);
  });

  it('accepts the agent-side internal_error code', async () => {
    expect(
      await errorsFor({
        screens: [],
        capturePlugin: { state: 'error', errorCode: 'internal_error' },
      }),
    ).toBe(0);
  });

  it.each([
    [{ ...valid, state: 'paused' }],
    [{ ...valid, state: undefined }],
    [{ ...valid, pluginVersion: 'v'.repeat(65) }],
    [{ ...valid, apiVersion: '1'.repeat(17) }],
    [{ ...valid, sdkVersion: 'six' }],
    [{ ...valid, sdkVersion: '6.3.2.0.1' }],
    [{ ...valid, errorCode: 'something_else' }],
    [{ ...valid, license: { ...valid.license, licenseSha256: 'abc' } }],
    [{ ...valid, license: { ...valid.license, termsSha256: hash('G') } }],
    [{ ...valid, license: { licenseSha256: hash('a') } }],
    [{ ...valid, license: 'x' }],
  ])('rejects an invalid block %#', async (block) => {
    expect(await errorsFor({ screens: [], capturePlugin: block })).toBeGreaterThan(0);
  });
});
