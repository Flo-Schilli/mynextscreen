import { SetMetadata } from '@nestjs/common';

export const IS_AGENT_AUTH_KEY = 'isAgentAuth';

/**
 * Marks a route as authenticated by a site-agent session token.
 *
 * Like {@link ScreenAuth}, this is an access declaration in its own right:
 * `RolesGuard` short-circuits on it, because an agent has no user and no role.
 * Handlers on such routes still have to check that the resource they touch
 * belongs to the agent that called — `req.agentId` is an identity, not an
 * authorisation.
 */
export const AgentAuth = () => SetMetadata(IS_AGENT_AUTH_KEY, true);
