import type { SiteAgent } from '../db/schema';

/** What the dashboard needs to flag an agent that runs older software than the server. */
export interface AgentUpdateInfo {
  /** The server's own release, which is what every agent should run. Null on a dev build. */
  latestAgentVersion: string | null;
  updateAvailable: boolean;
}

type ReleaseVersion = readonly [number, number, number];

const RELEASE = /^v?(\d+)\.(\d+)\.(\d+)$/;

/**
 * A plain `major.minor.patch` release, or null. Pre-releases and dev builds
 * (`0.0.0-dev`) are deliberately not comparable: a hint built on them would
 * either nag a developer or miss nothing worth saying.
 */
export function parseReleaseVersion(version: string | null | undefined): ReleaseVersion | null {
  const match = RELEASE.exec(version?.trim() ?? '');
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True only when both are releases and the agent's is strictly older. */
export function isAgentOutdated(
  agentVersion: string | null,
  latestVersion: string | null,
): boolean {
  const agent = parseReleaseVersion(agentVersion);
  const latest = parseReleaseVersion(latestVersion);
  if (!agent || !latest) {
    return false;
  }
  for (let i = 0; i < 3; i++) {
    if (agent[i] !== latest[i]) {
      return agent[i] < latest[i];
    }
  }
  return false;
}

/**
 * The version agents are measured against: the server's own.
 *
 * Server and agent are released together from the root `package.json`, so an
 * agent behind the server has an update waiting and one ahead of it does not
 * exist in a supported setup. No registry or GitHub call is needed for that.
 */
export function latestAgentVersion(serverVersion = process.env.APP_VERSION): string | null {
  return parseReleaseVersion(serverVersion) ? (serverVersion as string).trim() : null;
}

export function withUpdateInfo<T extends SiteAgent>(
  agent: T,
  latest: string | null = latestAgentVersion(),
): T & AgentUpdateInfo {
  return {
    ...agent,
    latestAgentVersion: latest,
    updateAvailable: isAgentOutdated(agent.agentVersion, latest),
  };
}
