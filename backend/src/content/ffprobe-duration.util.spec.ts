import { ffprobeDuration } from './ffprobe-duration.util';

const mockStdoutOn = jest.fn();
const mockStderrOn = jest.fn();
const mockOn = jest.fn();
const mockSpawn = jest.fn();

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

function setupProc(exitCode: number, stdout: string, stderr = ''): void {
  mockSpawn.mockImplementation(() => {
    const proc = {
      stdout: { on: mockStdoutOn },
      stderr: { on: mockStderrOn },
      on: mockOn,
    };

    setTimeout(() => {
      const stdoutCb = mockStdoutOn.mock.calls.find((c: unknown[]) => c[0] === 'data');
      if (stdoutCb && stdout) {
        stdoutCb[1](Buffer.from(stdout));
      }

      const stderrCb = mockStderrOn.mock.calls.find((c: unknown[]) => c[0] === 'data');
      if (stderrCb && stderr) {
        stderrCb[1](Buffer.from(stderr));
      }

      const closeCb = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'close');
      if (closeCb) {
        closeCb[1](exitCode);
      }
    }, 5);

    return proc;
  });
}

describe('ffprobeDuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return rounded duration in seconds', async () => {
    setupProc(0, '58.123456\n');

    const result = await ffprobeDuration('/tmp/video.mp4', 'ffprobe');

    expect(result).toBe(58);
    expect(mockSpawn).toHaveBeenCalledWith(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', '/tmp/video.mp4'],
      expect.any(Object),
    );
  });

  it('should round 0.5 up', async () => {
    setupProc(0, '30.5\n');
    const result = await ffprobeDuration('/tmp/video.mp4');
    expect(result).toBe(31);
  });

  it('should round 30.4 down', async () => {
    setupProc(0, '30.4\n');
    const result = await ffprobeDuration('/tmp/video.mp4');
    expect(result).toBe(30);
  });

  it('should reject on non-zero exit code', async () => {
    setupProc(1, '', 'No such file');

    await expect(ffprobeDuration('/tmp/missing.mp4')).rejects.toThrow(
      'ffprobe exited with code 1: No such file',
    );
  });

  it('should reject on unparseable output', async () => {
    setupProc(0, 'N/A\n');

    await expect(ffprobeDuration('/tmp/video.mp4')).rejects.toThrow(
      'ffprobe returned unparseable duration: "N/A"',
    );
  });

  it('should reject on spawn error', async () => {
    mockSpawn.mockImplementation(() => {
      const proc = {
        stdout: { on: mockStdoutOn },
        stderr: { on: mockStderrOn },
        on: mockOn,
      };

      setTimeout(() => {
        const errorCb = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'error');
        if (errorCb) {
          errorCb[1](new Error('ENOENT'));
        }
      }, 5);

      return proc;
    });

    await expect(ffprobeDuration('/tmp/video.mp4', '/bad/ffprobe')).rejects.toThrow(
      'Failed to spawn ffprobe: ENOENT',
    );
  });

  it('should use custom ffprobe path', async () => {
    setupProc(0, '10.0\n');

    await ffprobeDuration('/tmp/video.mp4', '/usr/local/bin/ffprobe');

    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/ffprobe',
      expect.any(Array),
      expect.any(Object),
    );
  });
});
