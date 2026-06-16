/**
 * Drizzle schema — single source of truth for persistence (replaces the former
 * TypeORM entities). Mirrors the previous SQLite schema 1:1 so service behaviour
 * is unchanged.
 *
 * Conventions (locked):
 * - Column keys are camelCase; physical names are snake_case via `casing: 'snake_case'`
 *   (set in `drizzle.config.ts` AND the runtime `drizzle()` client). A config/runtime
 *   mismatch silently breaks queries.
 * - Enums are `text().$type<EnumT>()` importing the existing `*.enum.ts` unions —
 *   already validated by class-validator at the API boundary; no rigid `pgEnum`.
 * - Storage byte counters are `bigint({ mode: 'number' })` — services do `Number()`
 *   arithmetic; `mode: 'bigint'` would break it (≈9 PB ceiling is safe).
 * - `tags` / `details` are `jsonb` (Drizzle (de)serialises automatically).
 * - `updatedAt` uses `.$onUpdate(() => new Date())` — Drizzle does NOT auto-bump.
 * - `users.id` is a generated `uuid` (internal email+password auth; Hanko retired).
 *
 * Each table exports its `$inferSelect` (row) and `$inferInsert` (new-row) types,
 * which replace the entity classes as the canonical row types across services.
 */
import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { AuditAction } from '../audit-log/audit-action.enum';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { LiveStreamProtocol } from '../live-stream/live-stream-protocol.enum';
import { LiveStreamStatus } from '../live-stream/live-stream-status.enum';
import { TranscodingPreset } from '../live-stream/transcoding-preset.enum';
import { NotificationEventType } from '../notification/notification-event-type.enum';
import { TransitionType } from '../playlist/transition-type.enum';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { SliceStatus } from '../slice-content/slice-status.enum';
import { OrganisationRole } from '../user/organisation-role.enum';

// ── Local literal-union types ────────────────────────────────────────────────

/** Lifecycle of a 6-digit screen pairing. */
export type ScreenPairingStatus = 'pending' | 'claimed' | 'consumed';

/** Priority of a schedule entry; "high" wins when entries overlap. */
export type SchedulePriority = 'normal' | 'high';

// ── Shared column builders ───────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ── organisations ────────────────────────────────────────────────────────────

export const organisations = pgTable('organisations', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text().notNull().unique(),
  timeZone: text().notNull(),
  storageOriginalLimitBytes: bigint({ mode: 'number' }).notNull().default(0),
  storageTranscodedLimitBytes: bigint({ mode: 'number' }).notNull().default(0),
  storageOriginalUsedBytes: bigint({ mode: 'number' }).notNull().default(0),
  storageTranscodedUsedBytes: bigint({ mode: 'number' }).notNull().default(0),
  // Self-referential through playlists (set null on playlist delete). Forward ref
  // resolved lazily; AnyPgColumn breaks the circular type inference.
  defaultPlaylistId: uuid().references((): AnyPgColumn => playlists.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});

// ── users (internal email+password auth; uuid PK) ────────────────────────────

export const users = pgTable('users', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text().notNull().unique(),
  name: text(),
  // Nullable: an invitee provisioned by a super-admin/org-admin has no password
  // until they activate via the set-password link. Login MUST reject null hashes.
  passwordHash: text(),
  passwordResetToken: text(),
  passwordResetTokenExpiresAt: timestamp({ withTimezone: true }),
  // Self-signup gating: a freshly registered user starts unverified and CANNOT log
  // in until they click the emailed verification link. Existing rows are backfilled
  // to `true` in the migration so invited/active users are never locked out.
  emailVerified: boolean().notNull().default(false),
  emailVerificationToken: text(),
  emailVerificationTokenExpiresAt: timestamp({ withTimezone: true }),
  // Email-change flow: the requested address is parked in `pendingEmail` until the
  // user confirms via the token mailed to that new address (mirrors the reset shape).
  pendingEmail: text(),
  emailChangeToken: text(),
  emailChangeTokenExpiresAt: timestamp({ withTimezone: true }),
  // System-level super-admin (carried in the access JWT). Replaces the former
  // env-based SUPER_ADMIN_USER_IDS list, which is impossible with generated UUIDs.
  isSuperAdmin: boolean().notNull().default(false),
  // Gravatar opt-out. When true (default), the profile exposes a Gravatar avatar
  // URL derived from the email hash. When false, no hash is ever sent to a third
  // party and the UI falls back to the local placeholder avatar.
  gravatarEnabled: boolean().notNull().default(true),
  ...timestamps,
});

// ── user ↔ organisation memberships ──────────────────────────────────────────

export const userOrganisationMemberships = pgTable(
  'user_organisation_memberships',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organisationId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    role: text().$type<OrganisationRole>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('UQ_user_organisation').on(t.userId, t.organisationId)],
);

// ── screen groups ─────────────────────────────────────────────────────────────

export const screenGroups = pgTable('screen_groups', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  mode: text().$type<ScreenGroupMode>().notNull().default(ScreenGroupMode.Mirror),
  gridColumns: integer(),
  gridRows: integer(),
  color: text().notNull().default('#6d6cf6'),
  icon: text().notNull().default('Groups'),
  ...timestamps,
});

// ── screens ────────────────────────────────────────────────────────────────────

export const screens = pgTable(
  'screens',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organisationId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    resolution: text().notNull(),
    location: text().notNull(),
    apiKeyHash: text().notNull(),
    lastHeartbeat: timestamp({ withTimezone: true }),
    isOnline: boolean().notNull().default(false),
    groupId: uuid().references(() => screenGroups.id, { onDelete: 'set null' }),
    gridRow: integer(),
    gridColumn: integer(),
    // Player UI toggles (pushed to the screen via screen state). Default on so
    // existing screens keep the current behaviour until an admin opts out.
    showUnmuteButton: boolean().notNull().default(true),
    showDisconnectButton: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index('IDX_screens_api_key_hash').on(t.apiKeyHash)],
);

// ── screen pairings (6-digit device-flow) ─────────────────────────────────────

export const screenPairings = pgTable(
  'screen_pairings',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // 6-digit numeric code displayed on the player, typed by the admin.
    code: text().notNull(),
    // SHA-256 hex of the high-entropy poll token the player keeps.
    pairingSecretHash: text().notNull(),
    // Set on claim; the org the screen was created in.
    organisationId: uuid().references(() => organisations.id, { onDelete: 'cascade' }),
    // Set on claim; FK to the created screen.
    screenId: uuid().references(() => screens.id, { onDelete: 'cascade' }),
    // Plaintext API key — transient: delivered to the player once, then nulled.
    apiKey: text(),
    // pending → claimed → consumed.
    status: text().$type<ScreenPairingStatus>().notNull().default('pending'),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('IDX_screen_pairings_code').on(t.code)],
);

// ── content library ──────────────────────────────────────────────────────────

export const contents = pgTable('contents', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  description: text(),
  tags: jsonb().$type<string[]>().notNull().default([]),
  type: text().$type<ContentType>().notNull(),
  originalFilename: text().notNull(),
  originalMimeType: text().notNull(),
  originalSizeBytes: bigint({ mode: 'number' }).notNull(),
  transcodedSizeBytes: bigint({ mode: 'number' }),
  // Size of the precomputed thumbnail (small WebP). null = no thumbnail generated
  // yet; its bytes are folded into the org's transcoded storage usage.
  thumbnailSizeBytes: bigint({ mode: 'number' }),
  durationSeconds: integer(),
  transcodingStatus: text().$type<TranscodingStatus>().notNull().default(TranscodingStatus.Pending),
  transcodingError: text(),
  ...timestamps,
});

// ── playlists & items ──────────────────────────────────────────────────────────

export const playlists = pgTable('playlists', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  color: text().notNull().default('#6d6cf6'),
  ...timestamps,
});

export const playlistItems = pgTable('playlist_items', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playlistId: uuid()
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  contentId: uuid()
    .notNull()
    .references(() => contents.id, { onDelete: 'cascade' }),
  position: integer().notNull(),
  durationSeconds: integer().notNull(),
  transition: text().$type<TransitionType>().notNull().default(TransitionType.Fade),
  transitionDurationMs: integer().notNull().default(500),
});

// ── schedule entries ───────────────────────────────────────────────────────────

export const scheduleEntries = pgTable('schedule_entries', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  screenId: uuid().references(() => screens.id, { onDelete: 'cascade' }),
  groupId: uuid().references(() => screenGroups.id, { onDelete: 'cascade' }),
  playlistId: uuid()
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  name: text(),
  priority: text().$type<SchedulePriority>().notNull().default('normal'),
  startTime: timestamp({ withTimezone: true }).notNull(),
  endTime: timestamp({ withTimezone: true }).notNull(),
  rrule: text(),
  colour: text().notNull().default('#6d6cf6'),
  ...timestamps,
});

// ── live streams ─────────────────────────────────────────────────────────────

export const liveStreams = pgTable('live_streams', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  sourceUrl: text().notNull(),
  protocol: text().$type<LiveStreamProtocol>().notNull().default(LiveStreamProtocol.Rtmp),
  status: text().$type<LiveStreamStatus>().notNull().default(LiveStreamStatus.Idle),
  transcodingPreset: text()
    .$type<TranscodingPreset>()
    .notNull()
    .default(TranscodingPreset.High1080p),
  audioEnabled: boolean().notNull().default(true),
  ...timestamps,
});

export const liveStreamActivations = pgTable(
  'live_stream_activations',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    streamId: uuid()
      .notNull()
      .references(() => liveStreams.id, { onDelete: 'cascade' }),
    screenId: uuid().notNull(),
    activatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('UQ_live_stream_activation_screen').on(t.screenId)],
);

// ── notifications ──────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  eventType: text().$type<NotificationEventType>().notNull(),
  title: text().notNull(),
  message: text().notNull(),
  read: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Per-organisation alert rules — which events should trigger a notification.
 * Persisted as a single jsonb object on the notification config row.
 */
export interface AlertRules {
  /** Alert after a display is unreachable for 5 minutes. */
  offline: boolean;
  /** Notify when an offline display comes back online. */
  recovered: boolean;
  /** Alert when uploaded media fails to process. */
  transcodeFail: boolean;
  /** Warn when usage passes 90% of the allocation. */
  storage: boolean;
  /** A digest of uptime and activity every Monday. */
  weekly: boolean;
}

export const DEFAULT_ALERT_RULES: AlertRules = {
  offline: true,
  recovered: true,
  transcodeFail: true,
  storage: false,
  weekly: false,
};

export const organisationNotificationConfigs = pgTable(
  'organisation_notification_configs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organisationId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    smtpHost: text(),
    smtpPort: integer(),
    smtpUser: text(),
    // TODO: Production deployments should use column-level encryption or a secrets manager.
    smtpPassword: text(),
    smtpFrom: text(),
    smtpSecure: boolean().notNull().default(false),
    ntfyUrl: text(),
    ntfyTopic: text(),
    ntfyToken: text(),
    // Per-org alert rules: which events trigger a notification across channels.
    // Stored as one jsonb object so the toggle set evolves without a migration
    // per flag. Dispatch logic reads these flags when emitting alerts.
    alertRules: jsonb().$type<AlertRules>().notNull().default(DEFAULT_ALERT_RULES),
  },
  (t) => [uniqueIndex('UQ_org_notification_config_org').on(t.organisationId)],
);

// User-global notification channel preferences: one row per user, applied
// across every organisation they belong to. Whether email/ntfy actually deliver
// still depends on each org having SMTP/ntfy configured (see notification hub).
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inAppEnabled: boolean().notNull().default(true),
    emailEnabled: boolean().notNull().default(false),
    ntfyEnabled: boolean().notNull().default(false),
  },
  (t) => [uniqueIndex('UQ_user_notification_pref_user').on(t.userId)],
);

// ── audit log ────────────────────────────────────────────────────────────────

export const auditEntries = pgTable('audit_entries', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  timestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
  userId: text(),
  organisationId: uuid().references(() => organisations.id, {
    onDelete: 'cascade',
  }),
  action: text().$type<AuditAction>().notNull(),
  resourceType: text().notNull(),
  resourceId: text(),
  details: jsonb().$type<Record<string, unknown>>(),
});

// ── sliced renditions (video-wall slicing) ───────────────────────────────────

export const slicedRenditions = pgTable('sliced_renditions', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organisationId: uuid()
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  groupId: uuid()
    .notNull()
    .references(() => screenGroups.id, { onDelete: 'cascade' }),
  screenId: uuid()
    .notNull()
    .references(() => screens.id, { onDelete: 'cascade' }),
  contentItemId: uuid()
    .notNull()
    .references(() => contents.id, { onDelete: 'cascade' }),
  filePath: text().notNull(),
  sourceHash: text().notNull(),
  ...timestamps,
});

// ── metric snapshots (dashboard mini-graph 24h history) ──────────────────────

/**
 * Periodic per-organisation KPI snapshots powering the dashboard sparklines.
 * A scheduler writes one row per org every few minutes; the dashboard reads the
 * last 24h, hourly-bucketed, to render the "Screens online / Content / Playlists
 * / Alerts" trend lines. Rows older than the retention window are pruned.
 */
export const orgMetricSnapshots = pgTable(
  'org_metric_snapshots',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organisationId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    capturedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    screensOnline: integer().notNull().default(0),
    contentCount: integer().notNull().default(0),
    playlistCount: integer().notNull().default(0),
    openAlerts: integer().notNull().default(0),
  },
  (t) => [index('IDX_org_metric_snapshots_org_time').on(t.organisationId, t.capturedAt)],
);

/**
 * Instance-wide host load snapshots (CPU + RAM percent) powering the super-admin
 * system-load chart. Not org-scoped. Same capture/retention lifecycle as
 * {@link orgMetricSnapshots}.
 */
export const systemMetricSnapshots = pgTable(
  'system_metric_snapshots',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    capturedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    cpuPercent: integer().notNull(),
    ramPercent: integer().notNull(),
  },
  (t) => [index('IDX_system_metric_snapshots_time').on(t.capturedAt)],
);

// ── relations (for db.query.*.findMany({ with: … }) eager loads) ─────────────

export const organisationsRelations = relations(organisations, ({ one }) => ({
  defaultPlaylist: one(playlists, {
    fields: [organisations.defaultPlaylistId],
    references: [playlists.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(userOrganisationMemberships),
}));

export const userOrganisationMembershipsRelations = relations(
  userOrganisationMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [userOrganisationMemberships.userId],
      references: [users.id],
    }),
    organisation: one(organisations, {
      fields: [userOrganisationMemberships.organisationId],
      references: [organisations.id],
    }),
  }),
);

export const screenGroupsRelations = relations(screenGroups, ({ many }) => ({
  screens: many(screens),
}));

export const screensRelations = relations(screens, ({ one }) => ({
  group: one(screenGroups, {
    fields: [screens.groupId],
    references: [screenGroups.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
  items: many(playlistItems),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),
  content: one(contents, {
    fields: [playlistItems.contentId],
    references: [contents.id],
  }),
}));

export const scheduleEntriesRelations = relations(scheduleEntries, ({ one }) => ({
  screen: one(screens, {
    fields: [scheduleEntries.screenId],
    references: [screens.id],
  }),
  group: one(screenGroups, {
    fields: [scheduleEntries.groupId],
    references: [screenGroups.id],
  }),
  playlist: one(playlists, {
    fields: [scheduleEntries.playlistId],
    references: [playlists.id],
  }),
}));

export const liveStreamActivationsRelations = relations(liveStreamActivations, ({ one }) => ({
  stream: one(liveStreams, {
    fields: [liveStreamActivations.streamId],
    references: [liveStreams.id],
  }),
}));

// ── Row / insert types (replace the former entity classes) ───────────────────

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserOrganisationMembership = typeof userOrganisationMemberships.$inferSelect;
export type NewUserOrganisationMembership = typeof userOrganisationMemberships.$inferInsert;

export type ScreenGroup = typeof screenGroups.$inferSelect;
export type NewScreenGroup = typeof screenGroups.$inferInsert;

export type Screen = typeof screens.$inferSelect;
export type NewScreen = typeof screens.$inferInsert;

export type ScreenPairing = typeof screenPairings.$inferSelect;
export type NewScreenPairing = typeof screenPairings.$inferInsert;

export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export type PlaylistItem = typeof playlistItems.$inferSelect;
export type NewPlaylistItem = typeof playlistItems.$inferInsert;

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type NewScheduleEntry = typeof scheduleEntries.$inferInsert;

export type LiveStream = typeof liveStreams.$inferSelect;
export type NewLiveStream = typeof liveStreams.$inferInsert;

export type LiveStreamActivation = typeof liveStreamActivations.$inferSelect;
export type NewLiveStreamActivation = typeof liveStreamActivations.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type OrganisationNotificationConfig = typeof organisationNotificationConfigs.$inferSelect;
export type NewOrganisationNotificationConfig = typeof organisationNotificationConfigs.$inferInsert;

export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;

export type AuditEntry = typeof auditEntries.$inferSelect;
export type NewAuditEntry = typeof auditEntries.$inferInsert;

export type SlicedRendition = typeof slicedRenditions.$inferSelect;
export type NewSlicedRendition = typeof slicedRenditions.$inferInsert;

/**
 * Durable status of a split-group pre-transcoding (slicing) run, keyed by
 * (groupId, playlistId). One row per pair — re-enqueues are last-write-wins. The
 * frontend reads this for a reload-safe view of "is this wall's content ready?"
 * and overlays live SSE `slice.*` events on top. Progress % is derived from
 * `completedItems / totalItems` (no redundant column).
 */
export const sliceJobs = pgTable(
  'slice_jobs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organisationId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    groupId: uuid()
      .notNull()
      .references(() => screenGroups.id, { onDelete: 'cascade' }),
    playlistId: uuid()
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    status: text().$type<SliceStatus>().notNull().default(SliceStatus.Queued),
    // Total slice operations to perform = playlist items × screens in the group.
    totalItems: integer().notNull().default(0),
    completedItems: integer().notNull().default(0),
    error: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex('UQ_slice_jobs_group_playlist').on(t.groupId, t.playlistId)],
);

export type SliceJob = typeof sliceJobs.$inferSelect;
export type NewSliceJob = typeof sliceJobs.$inferInsert;

export type OrgMetricSnapshot = typeof orgMetricSnapshots.$inferSelect;
export type NewOrgMetricSnapshot = typeof orgMetricSnapshots.$inferInsert;

export type SystemMetricSnapshot = typeof systemMetricSnapshots.$inferSelect;
export type NewSystemMetricSnapshot = typeof systemMetricSnapshots.$inferInsert;
