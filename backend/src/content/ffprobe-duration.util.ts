import { spawn } from 'child_process';

/**
 * Spawns ffprobe to extract the duration of a media file in seconds (rounded).
 *
 * @param filePath  Absolute path to the media file
 * @param ffprobePath  Path to the ffprobe binary (defaults to 'ffprobe')
 * @returns Duration in whole seconds (rounded to nearest integer)
 */
export function ffprobeDuration(
  filePath: string,
  ffprobePath = 'ffprobe',
): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      filePath,
    ];

    const proc = spawn(ffprobePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout!.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr!.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`));
        return;
      }

      const parsed = parseFloat(stdout.trim());
      if (isNaN(parsed)) {
        reject(
          new Error(
            `ffprobe returned unparseable duration: "${stdout.trim()}"`,
          ),
        );
        return;
      }

      resolve(Math.round(parsed));
    });
  });
}
