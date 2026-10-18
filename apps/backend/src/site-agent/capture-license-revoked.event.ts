/** Emitted after a dashboard revoke, so live streams on the agent can be stopped. */
export const CAPTURE_LICENSE_REVOKED = 'capture-plugin.license-revoked';

export class CaptureLicenseRevokedEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly userId: string,
  ) {}
}
