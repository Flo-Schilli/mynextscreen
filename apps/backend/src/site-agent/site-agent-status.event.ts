export const SITE_AGENT_STATUS_CHANGED = 'site-agent.status-changed';

/**
 * Emitted on the online↔offline edge of a site agent, so the dashboard can show
 * the venue connection going away. Not emitted on every heartbeat.
 */
export class SiteAgentStatusChangedEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly name: string,
    public readonly isOnline: boolean,
  ) {}
}
