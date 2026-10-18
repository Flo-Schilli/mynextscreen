import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AgentReportDto } from './agent-report.dto';

const STREAM_ID = '660e8400-e29b-41d4-a716-446655440000';

async function errorsFor(payload: unknown): Promise<number> {
  return (await validate(plainToInstance(AgentReportDto, payload))).length;
}

describe('AgentReportDto ndiStreams', () => {
  const valid = {
    streamId: STREAM_ID,
    state: 'streaming',
    sourceName: 'CAM',
    encoder: 'libx264',
    fps: 29.97,
    framesDropped: 0,
    uploadLagMs: 120,
    error: null,
  };

  it('accepts ndiStreams together with an empty screens array', async () => {
    expect(await errorsFor({ screens: [], ndiStreams: [valid] })).toBe(0);
  });

  it('still accepts a report without ndiStreams', async () => {
    expect(await errorsFor({ screens: [] })).toBe(0);
  });

  it('accepts a minimal entry', async () => {
    expect(
      await errorsFor({
        screens: [],
        ndiStreams: [{ streamId: STREAM_ID, state: 'connecting', framesDropped: 0 }],
      }),
    ).toBe(0);
  });

  it.each([
    [{ ...valid, streamId: 'x' }],
    [{ ...valid, state: 'paused' }],
    [{ ...valid, framesDropped: -1 }],
    [{ ...valid, fps: 5000 }],
    [{ ...valid, error: 'e'.repeat(501) }],
  ])('rejects an invalid entry %#', async (entry) => {
    expect(await errorsFor({ screens: [], ndiStreams: [entry] })).toBeGreaterThan(0);
  });

  it('rejects more than 50 entries', async () => {
    expect(await errorsFor({ screens: [], ndiStreams: Array(51).fill(valid) })).toBeGreaterThan(0);
  });
});
