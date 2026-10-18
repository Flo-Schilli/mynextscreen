import { Logger, type OnModuleDestroy } from '@nestjs/common';
import type { AgentConfigStore } from '../config/agent-config.store';
import type { PtzCommandMessage } from '../protocol/server-protocol';
import { buildCommand } from './visca-commands';
import type { ViscaTarget, ViscaTransport } from './visca-transport';

/** Without a follow-up command, a moving camera is stopped after this long. */
export const DEAD_MAN_MS = 1500;

/**
 * Turns the server's `ptz` command into VISCA on the camera's own address.
 *
 * The camera's host and port come only from the agent's current config, found
 * by stream id: a command can never point the agent at another host.
 *
 * The dashboard repeats `move`/`zoom` every 500 ms while a button is held and
 * sends `stop` on release. If that release is lost, the dead-man stops the
 * camera anyway once the repeats cease.
 */
export class PtzService implements OnModuleDestroy {
  private readonly logger = new Logger(PtzService.name);
  private readonly deadMen = new Map<string, NodeJS.Timeout>();
  /** Where the camera was last driven, so a stop survives `ptz` leaving the config. */
  private readonly lastTargets = new Map<string, ViscaTarget>();

  constructor(
    private readonly configs: AgentConfigStore,
    private readonly transport: ViscaTransport,
    private readonly deadManMs: number = DEAD_MAN_MS,
  ) {}

  async handle(streamId: string, command: PtzCommandMessage): Promise<void> {
    const target = this.targetFor(streamId);
    if (!target) {
      this.logger.warn(`Ignoring PTZ command for stream ${streamId}: no PTZ camera configured`);
      return;
    }

    let messages: Buffer[];
    try {
      messages = buildCommand(command);
    } catch (error) {
      this.logger.warn(
        `Ignoring invalid PTZ command: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    this.clearDeadMan(streamId);
    if (command.action === 'move' || command.action === 'zoom') {
      this.armDeadMan(streamId, target);
    }
    await this.transport.send(target, messages);
  }

  onModuleDestroy(): void {
    for (const timer of this.deadMen.values()) {
      clearTimeout(timer);
    }
    this.deadMen.clear();
    this.lastTargets.clear();
  }

  /** Closes camera sockets that no stream in the current config refers to any more. */
  syncTargets(): void {
    const targets = (this.configs.current()?.ndiStreams ?? []).flatMap((stream) =>
      stream.ptz
        ? [{ host: stream.cameraHost, port: stream.ptz.port, protocol: stream.ptz.protocol }]
        : [],
    );
    this.transport.retainOnly(targets);
  }

  private targetFor(streamId: string): ViscaTarget | null {
    const stream = this.configs.current()?.ndiStreams?.find((s) => s.streamId === streamId);
    if (!stream?.ptz) {
      return null;
    }
    return { host: stream.cameraHost, port: stream.ptz.port, protocol: stream.ptz.protocol };
  }

  private armDeadMan(streamId: string, target: ViscaTarget): void {
    this.lastTargets.set(streamId, target);
    const timer = setTimeout(() => {
      this.deadMen.delete(streamId);
      this.lastTargets.delete(streamId);
      this.logger.warn(`No PTZ command for ${this.deadManMs} ms, stopping stream ${streamId}`);
      void this.transport.send(target, buildCommand({ action: 'stop' }));
    }, this.deadManMs);
    timer.unref();
    this.deadMen.set(streamId, timer);
  }

  private clearDeadMan(streamId: string): void {
    const timer = this.deadMen.get(streamId);
    if (timer) {
      clearTimeout(timer);
      this.deadMen.delete(streamId);
    }
    this.lastTargets.delete(streamId);
  }
}
