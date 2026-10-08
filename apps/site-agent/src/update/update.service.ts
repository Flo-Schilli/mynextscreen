import { Logger } from '@nestjs/common';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The sentinel the host's systemd path unit watches for. */
export function updateSentinelPath(stateDir: string): string {
  return join(stateDir, 'update-requested');
}

/**
 * Turns an "update yourself" command into a sentinel file for the host.
 *
 * The agent runs in a hardened container — `DropCapability=ALL`, no Podman
 * socket — so it cannot pull a new image or restart its own service. What it
 * can do is write into its state directory, which is bind-mounted on the host.
 * A systemd `path` unit on the host watches that file and runs
 * `podman auto-update`, which pulls the rolling image tag and restarts the
 * container with healthcheck-gated rollback.
 *
 * Writing is atomic (temp + rename) so the path unit never fires on a
 * half-written file, and idempotent: a second request before the host has acted
 * just overwrites the same file.
 */
export class UpdateService {
  private readonly logger = new Logger(UpdateService.name);

  constructor(
    private readonly sentinelPath: string,
    private readonly agentVersion: string,
  ) {}

  async requestUpdate(commandId: string): Promise<void> {
    const body = `${JSON.stringify({
      commandId,
      fromVersion: this.agentVersion,
      requestedAt: new Date().toISOString(),
    })}\n`;
    const tmpPath = `${this.sentinelPath}.tmp`;
    try {
      await writeFile(tmpPath, body, { mode: 0o644 });
      await rename(tmpPath, this.sentinelPath);
      this.logger.log(
        `Update requested (command ${commandId}); wrote sentinel for the host updater`,
      );
    } catch (error) {
      this.logger.error(
        `Could not write the update sentinel: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
