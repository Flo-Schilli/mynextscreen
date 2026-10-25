import { Injectable, Inject } from '@nestjs/common';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  contents,
  eventScheduleRules,
  liveStreams,
  organisations,
  playlists,
  scheduleEntries,
  screenGroups,
  screens,
  siteAgents,
  userOrganisationMemberships,
  users,
  type AuditEntry,
} from '../db/schema';

/** Id → display name for every record an audit page mentions. */
export type AuditNames = Record<string, string>;

type Kind =
  | 'user'
  | 'organisation'
  | 'screen'
  | 'screenGroup'
  | 'content'
  | 'playlist'
  | 'schedule'
  | 'liveStream'
  | 'contentSource'
  | 'eventScheduleRule'
  | 'siteAgent';

/** The organisation a lookup is limited to (none for the super admin) and the page's actors. */
interface Scope {
  organisationId: string | undefined;
  actors: Set<string>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `resourceType` values as the audit listener writes them. */
const KIND_BY_RESOURCE_TYPE: Record<string, Kind> = {
  user: 'user',
  account: 'user',
  organisation: 'organisation',
  screen: 'screen',
  'screen-group': 'screenGroup',
  content: 'content',
  playlist: 'playlist',
  schedule: 'schedule',
  'live-stream': 'liveStream',
  content_source: 'contentSource',
  event_schedule_rule: 'eventScheduleRule',
  site_agent: 'siteAgent',
};

/** Detail keys (without the `Id`/`Ids` suffix and a `previous` prefix) that hold ids. */
const KIND_BY_DETAIL_KEY: Record<string, Kind> = {
  user: 'user',
  organisation: 'organisation',
  screen: 'screen',
  group: 'screenGroup',
  screenGroup: 'screenGroup',
  content: 'content',
  playlist: 'playlist',
  schedule: 'schedule',
  stream: 'liveStream',
  liveStream: 'liveStream',
  source: 'contentSource',
  rule: 'eventScheduleRule',
  agent: 'siteAgent',
};

/** Tables whose rows carry a name column and belong to one organisation. */
const ORG_TABLES: Partial<
  Record<Kind, { table: PgTable; id: PgColumn; name: PgColumn; organisationId: PgColumn }>
> = {
  screen: {
    table: screens,
    id: screens.id,
    name: screens.name,
    organisationId: screens.organisationId,
  },
  screenGroup: {
    table: screenGroups,
    id: screenGroups.id,
    name: screenGroups.name,
    organisationId: screenGroups.organisationId,
  },
  content: {
    table: contents,
    id: contents.id,
    name: contents.title,
    organisationId: contents.organisationId,
  },
  playlist: {
    table: playlists,
    id: playlists.id,
    name: playlists.name,
    organisationId: playlists.organisationId,
  },
  liveStream: {
    table: liveStreams,
    id: liveStreams.id,
    name: liveStreams.name,
    organisationId: liveStreams.organisationId,
  },
  contentSource: {
    table: contentSources,
    id: contentSources.id,
    name: contentSources.name,
    organisationId: contentSources.organisationId,
  },
  eventScheduleRule: {
    table: eventScheduleRules,
    id: eventScheduleRules.id,
    name: eventScheduleRules.name,
    organisationId: eventScheduleRules.organisationId,
  },
  siteAgent: {
    table: siteAgents,
    id: siteAgents.id,
    name: siteAgents.name,
    organisationId: siteAgents.organisationId,
  },
};

function detailKind(key: string): Kind | undefined {
  const match = /^(?:previous)?(.+?)Ids?$/i.exec(key);
  if (!match) return undefined;
  const base = match[1].charAt(0).toLowerCase() + match[1].slice(1);
  return KIND_BY_DETAIL_KEY[base];
}

/**
 * Turns the ids an audit page stores (actor, resource, ids inside `details`) into
 * names at read time, so existing entries read as names too. Ids of records that
 * are gone, or that belong to another organisation, stay unnamed.
 */
@Injectable()
export class AuditNameResolver {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** `organisationId` scopes the lookup to one organisation (an org admin's log). */
  async resolve(entries: AuditEntry[], organisationId?: string): Promise<AuditNames> {
    const wanted = this.collectIds(entries);
    const scope: Scope = {
      organisationId,
      actors: new Set(entries.flatMap((e) => (e.userId ? [e.userId.toLowerCase()] : []))),
    };
    const names: AuditNames = {};
    await Promise.all(
      [...wanted].map(async ([kind, ids]) => {
        for (const [id, name] of await this.lookup(kind, [...ids], scope)) {
          if (name) names[id] = name;
        }
      }),
    );
    return names;
  }

  private collectIds(entries: AuditEntry[]): Map<Kind, Set<string>> {
    const wanted = new Map<Kind, Set<string>>();
    const add = (kind: Kind | undefined, value: unknown): void => {
      if (!kind || typeof value !== 'string' || !UUID.test(value)) return;
      let ids = wanted.get(kind);
      if (!ids) wanted.set(kind, (ids = new Set()));
      // Postgres returns ids in lower case; the names map is keyed by those.
      ids.add(value.toLowerCase());
    };
    for (const entry of entries) {
      add('user', entry.userId);
      add(KIND_BY_RESOURCE_TYPE[entry.resourceType], entry.resourceId);
      for (const [key, value] of Object.entries(entry.details ?? {})) {
        const kind = detailKind(key);
        for (const item of Array.isArray(value) ? value : [value]) add(kind, item);
      }
    }
    return wanted;
  }

  private async lookup(
    kind: Kind,
    ids: string[],
    scope: Scope,
  ): Promise<[string, string | null][]> {
    const { organisationId } = scope;
    if (kind === 'user') {
      const rows = await this.db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, ids));
      const allowed = organisationId ? await this.nameableUsers(ids, scope) : null;
      return rows
        .filter((r) => !allowed || allowed.has(r.id))
        .map((r) => [r.id, r.name || r.email]);
    }
    if (kind === 'organisation') {
      const where = organisationId
        ? and(inArray(organisations.id, ids), eq(organisations.id, organisationId))
        : inArray(organisations.id, ids);
      const rows = await this.db
        .select({ id: organisations.id, name: organisations.name })
        .from(organisations)
        .where(where);
      return rows.map((r) => [r.id, r.name]);
    }
    if (kind === 'schedule') {
      const rows = await this.db
        .select({ id: scheduleEntries.id, name: scheduleEntries.name, playlist: playlists.name })
        .from(scheduleEntries)
        .leftJoin(
          playlists,
          and(
            eq(playlists.id, scheduleEntries.playlistId),
            eq(playlists.organisationId, scheduleEntries.organisationId),
          ),
        )
        .where(
          this.scoped(
            inArray(scheduleEntries.id, ids),
            scheduleEntries.organisationId,
            organisationId,
          ),
        );
      return rows.map((r) => [r.id, r.name || r.playlist]);
    }
    const spec = ORG_TABLES[kind];
    if (!spec) return [];
    const rows = await this.db
      .select({ id: spec.id, name: spec.name })
      .from(spec.table)
      .where(this.scoped(inArray(spec.id, ids), spec.organisationId, organisationId));
    return rows.map((r) => [r.id as string, r.name as string]);
  }

  /**
   * In an org admin's log a user is named when they acted in one of its entries
   * (even after leaving) or are a member now; any other user id in the details
   * could belong to someone in another organisation and stays unnamed.
   */
  private async nameableUsers(ids: string[], scope: Scope): Promise<Set<string>> {
    const members = await this.db
      .select({ userId: userOrganisationMemberships.userId })
      .from(userOrganisationMemberships)
      .where(
        and(
          inArray(userOrganisationMemberships.userId, ids),
          eq(userOrganisationMemberships.organisationId, scope.organisationId as string),
        ),
      );
    return new Set([...scope.actors, ...members.map((m) => m.userId)]);
  }

  private scoped(where: SQL, column: PgColumn, organisationId: string | undefined): SQL {
    return organisationId ? (and(where, eq(column, organisationId)) as SQL) : where;
  }
}
