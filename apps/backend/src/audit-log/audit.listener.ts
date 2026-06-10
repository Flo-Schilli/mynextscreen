import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-action.enum';
import {
  AUDIT_CONTENT_UPLOADED,
  AUDIT_CONTENT_DELETED,
  AUDIT_CONTENT_REUPLOADED,
  AUDIT_CONTENT_BULK_DELETED,
  AUDIT_CONTENT_BULK_TAGGED,
  AUDIT_CONTENT_BULK_UNTAGGED,
  AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
  AuditContentEvent,
  AUDIT_PLAYLIST_CREATED,
  AUDIT_PLAYLIST_UPDATED,
  AUDIT_PLAYLIST_DELETED,
  AUDIT_PLAYLIST_BULK_DELETED,
  AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED,
  AuditPlaylistEvent,
  AUDIT_SCHEDULE_CREATED,
  AUDIT_SCHEDULE_UPDATED,
  AUDIT_SCHEDULE_DELETED,
  AuditScheduleEvent,
  AUDIT_SCREEN_REGISTERED,
  AUDIT_SCREEN_UPDATED,
  AUDIT_SCREEN_KEY_REGENERATED,
  AUDIT_SCREEN_ONLINE,
  AUDIT_SCREEN_OFFLINE,
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
  AuditScreenEvent,
  AUDIT_USER_INVITED,
  AUDIT_USER_ROLE_CHANGED,
  AUDIT_USER_REMOVED,
  AuditUserEvent,
  AUDIT_ORGANISATION_CREATED,
  AUDIT_ORGANISATION_UPDATED,
  AuditOrganisationEvent,
  AUDIT_GROUP_CREATED,
  AUDIT_GROUP_UPDATED,
  AUDIT_GROUP_DELETED,
  AUDIT_GROUP_SCREEN_ADDED,
  AUDIT_GROUP_SCREEN_REMOVED,
  AUDIT_GROUP_MODE_CHANGED,
  AuditGroupEvent,
  AUDIT_LIVE_STREAM_CREATED,
  AUDIT_LIVE_STREAM_UPDATED,
  AUDIT_LIVE_STREAM_DELETED,
  AUDIT_LIVE_STREAM_ACTIVATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_FAILED,
  AuditLiveStreamEvent,
} from './audit.events';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  // ── Content ──────────────────────────────────────────────────────────────

  @OnEvent(AUDIT_CONTENT_UPLOADED, { async: true })
  handleContentUploaded(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentUpload,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_DELETED, { async: true })
  handleContentDeleted(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentDelete,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_REUPLOADED, { async: true })
  handleContentReuploaded(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentReupload,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_BULK_DELETED, { async: true })
  handleContentBulkDeleted(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentBulkDeleted,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_BULK_TAGGED, { async: true })
  handleContentBulkTagged(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentBulkTagged,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_BULK_UNTAGGED, { async: true })
  handleContentBulkUntagged(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentBulkUntagged,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST, { async: true })
  handleContentBulkAddedToPlaylist(event: AuditContentEvent): void {
    this.record(
      AuditAction.ContentBulkAddedToPlaylist,
      'content',
      event.contentId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Playlist ─────────────────────────────────────────────────────────────

  @OnEvent(AUDIT_PLAYLIST_CREATED, { async: true })
  handlePlaylistCreated(event: AuditPlaylistEvent): void {
    this.record(
      AuditAction.PlaylistCreate,
      'playlist',
      event.playlistId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_PLAYLIST_UPDATED, { async: true })
  handlePlaylistUpdated(event: AuditPlaylistEvent): void {
    this.record(
      AuditAction.PlaylistUpdate,
      'playlist',
      event.playlistId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_PLAYLIST_DELETED, { async: true })
  handlePlaylistDeleted(event: AuditPlaylistEvent): void {
    this.record(
      AuditAction.PlaylistDelete,
      'playlist',
      event.playlistId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_PLAYLIST_BULK_DELETED, { async: true })
  handlePlaylistBulkDeleted(event: AuditPlaylistEvent): void {
    this.record(
      AuditAction.PlaylistBulkDeleted,
      'playlist',
      event.playlistId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED, { async: true })
  handlePlaylistBulkScreenAssigned(event: AuditPlaylistEvent): void {
    this.record(
      AuditAction.PlaylistBulkScreenAssigned,
      'playlist',
      event.playlistId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Schedule ─────────────────────────────────────────────────────────────

  @OnEvent(AUDIT_SCHEDULE_CREATED, { async: true })
  handleScheduleCreated(event: AuditScheduleEvent): void {
    this.record(
      AuditAction.ScheduleCreate,
      'schedule',
      event.scheduleEntryId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCHEDULE_UPDATED, { async: true })
  handleScheduleUpdated(event: AuditScheduleEvent): void {
    this.record(
      AuditAction.ScheduleUpdate,
      'schedule',
      event.scheduleEntryId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCHEDULE_DELETED, { async: true })
  handleScheduleDeleted(event: AuditScheduleEvent): void {
    this.record(
      AuditAction.ScheduleDelete,
      'schedule',
      event.scheduleEntryId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Screen ───────────────────────────────────────────────────────────────

  @OnEvent(AUDIT_SCREEN_REGISTERED, { async: true })
  handleScreenRegistered(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenRegister,
      'screen',
      event.screenId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_UPDATED, { async: true })
  handleScreenUpdated(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenUpdate,
      'screen',
      event.screenId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_KEY_REGENERATED, { async: true })
  handleScreenKeyRegenerated(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenKeyRegenerated,
      'screen',
      event.screenId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_ONLINE, { async: true })
  handleScreenOnline(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenOnline,
      'screen',
      event.screenId,
      event.organisationId,
      null,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_OFFLINE, { async: true })
  handleScreenOffline(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenOffline,
      'screen',
      event.screenId,
      event.organisationId,
      null,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_BULK_DELETED, { async: true })
  handleScreenBulkDeleted(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenBulkDeleted,
      'screen',
      event.screenId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_SCREEN_BULK_GROUP_ASSIGNED, { async: true })
  handleScreenBulkGroupAssigned(event: AuditScreenEvent): void {
    this.record(
      AuditAction.ScreenBulkGroupAssigned,
      'screen',
      event.screenId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── User / Membership ──────────────────────────────────────────────────

  @OnEvent(AUDIT_USER_INVITED, { async: true })
  handleUserInvited(event: AuditUserEvent): void {
    this.record(
      AuditAction.UserInvited,
      'user',
      event.targetUserId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_USER_ROLE_CHANGED, { async: true })
  handleUserRoleChanged(event: AuditUserEvent): void {
    this.record(
      AuditAction.UserRoleChanged,
      'user',
      event.targetUserId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_USER_REMOVED, { async: true })
  handleUserRemoved(event: AuditUserEvent): void {
    this.record(
      AuditAction.UserRemoved,
      'user',
      event.targetUserId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Organisation ─────────────────────────────────────────────────────────

  @OnEvent(AUDIT_ORGANISATION_CREATED, { async: true })
  handleOrganisationCreated(event: AuditOrganisationEvent): void {
    this.record(
      AuditAction.OrganisationCreated,
      'organisation',
      event.organisationId,
      null,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_ORGANISATION_UPDATED, { async: true })
  handleOrganisationUpdated(event: AuditOrganisationEvent): void {
    this.record(
      AuditAction.OrganisationUpdated,
      'organisation',
      event.organisationId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Screen Group ─────────────────────────────────────────────────────────

  @OnEvent(AUDIT_GROUP_CREATED, { async: true })
  handleGroupCreated(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupCreated,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_GROUP_UPDATED, { async: true })
  handleGroupUpdated(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupUpdated,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_GROUP_DELETED, { async: true })
  handleGroupDeleted(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupDeleted,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_GROUP_SCREEN_ADDED, { async: true })
  handleGroupScreenAdded(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupScreenAdded,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_GROUP_SCREEN_REMOVED, { async: true })
  handleGroupScreenRemoved(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupScreenRemoved,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_GROUP_MODE_CHANGED, { async: true })
  handleGroupModeChanged(event: AuditGroupEvent): void {
    this.record(
      AuditAction.GroupModeChanged,
      'screen-group',
      event.groupId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Live Stream ──────────────────────────────────────────────────────────

  @OnEvent(AUDIT_LIVE_STREAM_CREATED, { async: true })
  handleLiveStreamCreated(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamCreated,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_LIVE_STREAM_UPDATED, { async: true })
  handleLiveStreamUpdated(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamUpdated,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_LIVE_STREAM_DELETED, { async: true })
  handleLiveStreamDeleted(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamDeleted,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_LIVE_STREAM_ACTIVATED, { async: true })
  handleLiveStreamActivated(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamActivated,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_LIVE_STREAM_DEACTIVATED, { async: true })
  handleLiveStreamDeactivated(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamDeactivated,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  @OnEvent(AUDIT_LIVE_STREAM_FAILED, { async: true })
  handleLiveStreamFailed(event: AuditLiveStreamEvent): void {
    this.record(
      AuditAction.LiveStreamFailed,
      'live-stream',
      event.streamId,
      event.organisationId,
      event.userId,
      event.details,
    );
  }

  // ── Helper ───────────────────────────────────────────────────────────────

  private record(
    action: AuditAction,
    resourceType: string,
    resourceId: string | null,
    organisationId: string | null,
    userId: string | null,
    details: Record<string, unknown> | null,
  ): void {
    this.auditLogService
      .record({
        action,
        resourceType,
        resourceId,
        organisationId,
        userId,
        details,
      })
      .catch((err) => {
        this.logger.error(`Failed to record audit entry for ${action}: ${err.message}`, err.stack);
      });
  }
}
