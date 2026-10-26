import { Test, TestingModule } from '@nestjs/testing';
import { AuditNameResolver } from './audit-name-resolver.service';
import { AuditAction } from './audit-action.enum';
import { OrganisationRole } from '../user/organisation-role.enum';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  scheduleEntries,
  screens,
  userOrganisationMemberships,
  users,
  type AuditEntry,
  type Organisation,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const MISSING_ID = '990e8400-e29b-41d4-a716-446655440000';

describe('AuditNameResolver', () => {
  let resolver: AuditNameResolver;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditNameResolver, { provide: DRIZZLE, useValue: db }],
    }).compile();
    resolver = module.get(AuditNameResolver);
  });

  async function seedOrg(name: string): Promise<Organisation> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org;
  }

  async function seedScreen(organisationId: string, name: string): Promise<string> {
    const [screen] = await db
      .insert(screens)
      .values({ organisationId, name, resolution: '1920x1080', location: 'Hall', apiKeyHash: 'x' })
      .returning();
    return screen.id;
  }

  async function seedPlaylist(organisationId: string, name: string): Promise<string> {
    const [playlist] = await db.insert(playlists).values({ organisationId, name }).returning();
    return playlist.id;
  }

  function entry(values: Partial<AuditEntry>): AuditEntry {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: null,
      organisationId: null,
      action: AuditAction.ScheduleCreate,
      resourceType: 'schedule',
      resourceId: null,
      details: null,
      ...values,
    };
  }

  it('names the actor by name, falling back to the email address', async () => {
    const [named] = await db
      .insert(users)
      .values({ email: 'jane@example.com', name: 'Jane Doe' })
      .returning();
    const [unnamed] = await db.insert(users).values({ email: 'bob@example.com' }).returning();

    const names = await resolver.resolve([
      entry({ userId: named.id }),
      entry({ userId: unnamed.id }),
    ]);

    expect(names).toEqual({ [named.id]: 'Jane Doe', [unnamed.id]: 'bob@example.com' });
  });

  it('names the resource by its type', async () => {
    const org = await seedOrg('Venue');
    const screenId = await seedScreen(org.id, 'Foyer Left');
    const playlistId = await seedPlaylist(org.id, 'Metal');

    const names = await resolver.resolve([
      entry({ resourceType: 'screen', resourceId: screenId }),
      entry({ resourceType: 'playlist', resourceId: playlistId }),
      entry({ resourceType: 'organisation', resourceId: org.id }),
    ]);

    expect(names).toEqual({ [screenId]: 'Foyer Left', [playlistId]: 'Metal', [org.id]: 'Venue' });
  });

  it('names a schedule entry after its playlist when it has no name of its own', async () => {
    const org = await seedOrg('Venue');
    const playlistId = await seedPlaylist(org.id, 'Doors Open');
    const screenId = await seedScreen(org.id, 'Foyer');
    const [schedule] = await db
      .insert(scheduleEntries)
      .values({
        organisationId: org.id,
        screenId,
        playlistId,
        startTime: new Date('2026-10-25T18:00:00Z'),
        endTime: new Date('2026-10-25T20:00:00Z'),
      })
      .returning();

    const names = await resolver.resolve([
      entry({ resourceType: 'schedule', resourceId: schedule.id }),
    ]);

    expect(names[schedule.id]).toBe('Doors Open');
  });

  it('names the ids inside the details, including id lists', async () => {
    const org = await seedOrg('Venue');
    const screenId = await seedScreen(org.id, 'Foyer');
    const playlistA = await seedPlaylist(org.id, 'A');
    const playlistB = await seedPlaylist(org.id, 'B');

    const names = await resolver.resolve([
      entry({
        details: { screenId, groupId: null, playlistIds: [playlistA, playlistB], count: 3 },
      }),
    ]);

    expect(names).toEqual({ [screenId]: 'Foyer', [playlistA]: 'A', [playlistB]: 'B' });
  });

  it('names the old and new ids of a recorded change', async () => {
    const org = await seedOrg('Venue');
    const before = await seedPlaylist(org.id, 'Doors Open');
    const after = await seedPlaylist(org.id, 'Show');
    const screenA = await seedScreen(org.id, 'Foyer');
    const screenB = await seedScreen(org.id, 'Bar');

    const names = await resolver.resolve([
      entry({
        details: {
          changes: {
            playlistId: { from: before, to: after },
            screenIds: { from: [screenA], to: [screenA, screenB] },
            name: { from: before, to: 'not an id field' },
          },
        },
      }),
    ]);

    expect(names).toEqual({
      [before]: 'Doors Open',
      [after]: 'Show',
      [screenA]: 'Foyer',
      [screenB]: 'Bar',
    });
  });

  it("only names records of the given organisation (an org admin's view)", async () => {
    const own = await seedOrg('Own');
    const other = await seedOrg('Other');
    const ownScreen = await seedScreen(own.id, 'Ours');
    const otherScreen = await seedScreen(other.id, 'Theirs');

    const names = await resolver.resolve(
      [entry({ details: { screenId: ownScreen } }), entry({ details: { screenId: otherScreen } })],
      own.id,
    );

    expect(names).toEqual({ [ownScreen]: 'Ours' });
  });

  it("names other users only while they belong to the organisation (an org admin's view)", async () => {
    const own = await seedOrg('Own');
    const other = await seedOrg('Other');
    const [actor] = await db.insert(users).values({ email: 'left@example.com' }).returning();
    const [member] = await db.insert(users).values({ email: 'member@example.com' }).returning();
    const [stranger] = await db.insert(users).values({ email: 'stranger@example.com' }).returning();
    await db.insert(userOrganisationMemberships).values([
      { userId: member.id, organisationId: own.id, role: OrganisationRole.Viewer },
      { userId: stranger.id, organisationId: other.id, role: OrganisationRole.Viewer },
    ]);

    const names = await resolver.resolve(
      [
        // The actor of an own entry is named even after leaving the organisation.
        entry({ userId: actor.id }),
        entry({ resourceType: 'user', resourceId: member.id }),
        entry({ resourceType: 'user', resourceId: stranger.id }),
        entry({ details: { userId: stranger.id } }),
      ],
      own.id,
    );

    expect(names).toEqual({ [actor.id]: 'left@example.com', [member.id]: 'member@example.com' });
  });

  it('matches ids written in upper case', async () => {
    const org = await seedOrg('Venue');
    const screenId = await seedScreen(org.id, 'Foyer');

    const names = await resolver.resolve([
      entry({ details: { screenId: screenId.toUpperCase() } }),
    ]);

    expect(names).toEqual({ [screenId]: 'Foyer' });
  });

  it('leaves out ids that no longer exist or are not ids at all', async () => {
    const names = await resolver.resolve([
      entry({ resourceType: 'screen', resourceId: MISSING_ID }),
      entry({ resourceType: 'screen', resourceId: 'not-a-uuid' }),
      entry({ details: { screenId: 'also-not-a-uuid' } }),
    ]);

    expect(names).toEqual({});
  });

  it('returns nothing for an empty page without querying', async () => {
    await expect(resolver.resolve([])).resolves.toEqual({});
  });
});
