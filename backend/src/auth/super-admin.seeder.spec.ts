import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { PasswordService } from './password.service';
import { SuperAdminSeeder } from './super-admin.seeder';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, def?: string) => values[key] ?? def,
  } as unknown as ConfigService;
}

describe('SuperAdminSeeder', () => {
  let db: DrizzleDB;
  let passwords: PasswordService;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    passwords = new PasswordService();
  });

  it('seeds a new super-admin without a password when no initial password is set', async () => {
    const seeder = new SuperAdminSeeder(
      db,
      makeConfig({ SUPER_ADMIN_EMAILS: 'boss@example.com' }),
      passwords,
    );
    await seeder.onApplicationBootstrap();

    const [user] = await db.select().from(users).where(eq(users.email, 'boss@example.com'));
    expect(user).toBeDefined();
    expect(user.isSuperAdmin).toBe(true);
    expect(user.passwordHash).toBeNull();
  });

  it('seeds a super-admin with a hashed initial password', async () => {
    const seeder = new SuperAdminSeeder(
      db,
      makeConfig({
        SUPER_ADMIN_EMAILS: 'boss@example.com',
        SUPER_ADMIN_INITIAL_PASSWORD: 'initial-pass',
      }),
      passwords,
    );
    await seeder.onApplicationBootstrap();

    const [user] = await db.select().from(users).where(eq(users.email, 'boss@example.com'));
    expect(user.passwordHash).toBeTruthy();
    await expect(passwords.verify(user.passwordHash, 'initial-pass')).resolves.toBe(true);
  });

  it('promotes an existing non-super-admin user', async () => {
    await db.insert(users).values({ email: 'existing@example.com', isSuperAdmin: false });
    const seeder = new SuperAdminSeeder(
      db,
      makeConfig({ SUPER_ADMIN_EMAILS: 'existing@example.com' }),
      passwords,
    );
    await seeder.onApplicationBootstrap();

    const [user] = await db.select().from(users).where(eq(users.email, 'existing@example.com'));
    expect(user.isSuperAdmin).toBe(true);
  });

  it('is idempotent across repeated boots', async () => {
    const seeder = new SuperAdminSeeder(
      db,
      makeConfig({ SUPER_ADMIN_EMAILS: 'boss@example.com, boss@example.com' }),
      passwords,
    );
    await seeder.onApplicationBootstrap();
    await seeder.onApplicationBootstrap();

    const all = await db.select().from(users).where(eq(users.email, 'boss@example.com'));
    expect(all).toHaveLength(1);
  });

  it('does nothing when SUPER_ADMIN_EMAILS is empty', async () => {
    const seeder = new SuperAdminSeeder(db, makeConfig({ SUPER_ADMIN_EMAILS: '' }), passwords);
    await seeder.onApplicationBootstrap();
    const all = await db.select().from(users);
    expect(all).toHaveLength(0);
  });
});
