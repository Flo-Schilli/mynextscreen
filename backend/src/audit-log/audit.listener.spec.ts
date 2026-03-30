import { Test, TestingModule } from '@nestjs/testing';
import { AuditListener } from './audit.listener';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-action.enum';
import {
  AuditContentEvent,
  AuditPlaylistEvent,
  AuditScheduleEvent,
  AuditScreenEvent,
  AuditUserEvent,
  AuditOrganisationEvent,
} from './audit.events';

describe('AuditListener', () => {
  let listener: AuditListener;
  let auditLogService: { record: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const resourceId = '770e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    auditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditListener,
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    listener = module.get<AuditListener>(AuditListener);
  });

  // ── Content Events ─────────────────────────────────────────────────────

  it('should map content.uploaded to ContentUpload audit entry', () => {
    const event = new AuditContentEvent(resourceId, orgId, userId, {
      filename: 'poster.jpg',
    });

    listener.handleContentUploaded(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ContentUpload,
      resourceType: 'content',
      resourceId,
      organisationId: orgId,
      userId,
      details: { filename: 'poster.jpg' },
      organisation: null,
    });
  });

  it('should map content.deleted to ContentDelete audit entry', () => {
    const event = new AuditContentEvent(resourceId, orgId, userId, {
      filename: 'old.mp4',
    });

    listener.handleContentDeleted(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ContentDelete,
      resourceType: 'content',
      resourceId,
      organisationId: orgId,
      userId,
      details: { filename: 'old.mp4' },
      organisation: null,
    });
  });

  it('should map content.reuploaded to ContentReupload audit entry', () => {
    const event = new AuditContentEvent(resourceId, orgId, userId, {
      filename: 'updated.jpg',
    });

    listener.handleContentReuploaded(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ContentReupload,
      resourceType: 'content',
      resourceId,
      organisationId: orgId,
      userId,
      details: { filename: 'updated.jpg' },
      organisation: null,
    });
  });

  // ── Playlist Events ────────────────────────────────────────────────────

  it('should map playlist.created to PlaylistCreate audit entry', () => {
    const event = new AuditPlaylistEvent(resourceId, orgId, userId, {
      name: 'My Playlist',
    });

    listener.handlePlaylistCreated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.PlaylistCreate,
      resourceType: 'playlist',
      resourceId,
      organisationId: orgId,
      userId,
      details: { name: 'My Playlist' },
      organisation: null,
    });
  });

  it('should map playlist.updated to PlaylistUpdate audit entry', () => {
    const event = new AuditPlaylistEvent(resourceId, orgId, userId, {
      name: 'Renamed',
    });

    listener.handlePlaylistUpdated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.PlaylistUpdate,
      resourceType: 'playlist',
      resourceId,
      organisationId: orgId,
      userId,
      details: { name: 'Renamed' },
      organisation: null,
    });
  });

  it('should map playlist.deleted to PlaylistDelete audit entry', () => {
    const event = new AuditPlaylistEvent(resourceId, orgId, userId, {
      name: 'Old Playlist',
    });

    listener.handlePlaylistDeleted(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.PlaylistDelete,
      resourceType: 'playlist',
      resourceId,
      organisationId: orgId,
      userId,
      details: { name: 'Old Playlist' },
      organisation: null,
    });
  });

  // ── Schedule Events ────────────────────────────────────────────────────

  it('should map schedule.created to ScheduleCreate audit entry', () => {
    const event = new AuditScheduleEvent(resourceId, orgId, userId, {
      screenId: 'screen-1',
    });

    listener.handleScheduleCreated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScheduleCreate,
      resourceType: 'schedule',
      resourceId,
      organisationId: orgId,
      userId,
      details: { screenId: 'screen-1' },
      organisation: null,
    });
  });

  it('should map schedule.updated to ScheduleUpdate audit entry', () => {
    const event = new AuditScheduleEvent(resourceId, orgId, userId, null);

    listener.handleScheduleUpdated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScheduleUpdate,
      resourceType: 'schedule',
      resourceId,
      organisationId: orgId,
      userId,
      details: null,
      organisation: null,
    });
  });

  it('should map schedule.deleted to ScheduleDelete audit entry', () => {
    const event = new AuditScheduleEvent(resourceId, orgId, userId, {
      screenId: 'screen-1',
    });

    listener.handleScheduleDeleted(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScheduleDelete,
      resourceType: 'schedule',
      resourceId,
      organisationId: orgId,
      userId,
      details: { screenId: 'screen-1' },
      organisation: null,
    });
  });

  // ── Screen Events ──────────────────────────────────────────────────────

  it('should map screen.registered to ScreenRegister audit entry', () => {
    const event = new AuditScreenEvent(resourceId, orgId, userId, {
      name: 'Lobby',
    });

    listener.handleScreenRegistered(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScreenRegister,
      resourceType: 'screen',
      resourceId,
      organisationId: orgId,
      userId,
      details: { name: 'Lobby' },
      organisation: null,
    });
  });

  it('should map screen.updated to ScreenUpdate audit entry', () => {
    const event = new AuditScreenEvent(resourceId, orgId, userId, null);

    listener.handleScreenUpdated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScreenUpdate,
      resourceType: 'screen',
      resourceId,
      organisationId: orgId,
      userId,
      details: null,
      organisation: null,
    });
  });

  it('should map screen.key_regenerated to ScreenKeyRegenerated audit entry', () => {
    const event = new AuditScreenEvent(resourceId, orgId, userId, null);

    listener.handleScreenKeyRegenerated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScreenKeyRegenerated,
      resourceType: 'screen',
      resourceId,
      organisationId: orgId,
      userId,
      details: null,
      organisation: null,
    });
  });

  it('should map screen.online to ScreenOnline audit entry with null userId', () => {
    const event = new AuditScreenEvent(resourceId, orgId, null, null);

    listener.handleScreenOnline(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScreenOnline,
      resourceType: 'screen',
      resourceId,
      organisationId: orgId,
      userId: null,
      details: null,
      organisation: null,
    });
  });

  it('should map screen.offline to ScreenOffline audit entry with null userId', () => {
    const event = new AuditScreenEvent(resourceId, orgId, null, null);

    listener.handleScreenOffline(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.ScreenOffline,
      resourceType: 'screen',
      resourceId,
      organisationId: orgId,
      userId: null,
      details: null,
      organisation: null,
    });
  });

  // ── User Events ────────────────────────────────────────────────────────

  it('should map user.invited to UserInvited audit entry', () => {
    const targetUserId = '880e8400-e29b-41d4-a716-446655440000';
    const event = new AuditUserEvent(targetUserId, orgId, userId, {
      email: 'new@example.com',
      role: 'editor',
    });

    listener.handleUserInvited(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.UserInvited,
      resourceType: 'user',
      resourceId: targetUserId,
      organisationId: orgId,
      userId,
      details: { email: 'new@example.com', role: 'editor' },
      organisation: null,
    });
  });

  it('should map user.role_changed to UserRoleChanged audit entry', () => {
    const targetUserId = '880e8400-e29b-41d4-a716-446655440000';
    const event = new AuditUserEvent(targetUserId, orgId, userId, {
      oldRole: 'viewer',
      newRole: 'editor',
    });

    listener.handleUserRoleChanged(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.UserRoleChanged,
      resourceType: 'user',
      resourceId: targetUserId,
      organisationId: orgId,
      userId,
      details: { oldRole: 'viewer', newRole: 'editor' },
      organisation: null,
    });
  });

  it('should map user.removed to UserRemoved audit entry', () => {
    const targetUserId = '880e8400-e29b-41d4-a716-446655440000';
    const event = new AuditUserEvent(targetUserId, orgId, userId, null);

    listener.handleUserRemoved(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.UserRemoved,
      resourceType: 'user',
      resourceId: targetUserId,
      organisationId: orgId,
      userId,
      details: null,
      organisation: null,
    });
  });

  // ── Organisation Events ────────────────────────────────────────────────

  it('should map organisation.created to OrganisationCreated audit entry with null orgId', () => {
    const event = new AuditOrganisationEvent(orgId, userId, {
      name: 'New Org',
    });

    listener.handleOrganisationCreated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.OrganisationCreated,
      resourceType: 'organisation',
      resourceId: orgId,
      organisationId: null,
      userId,
      details: { name: 'New Org' },
      organisation: null,
    });
  });

  it('should map organisation.updated to OrganisationUpdated audit entry', () => {
    const event = new AuditOrganisationEvent(orgId, userId, null);

    listener.handleOrganisationUpdated(event);

    expect(auditLogService.record).toHaveBeenCalledWith({
      action: AuditAction.OrganisationUpdated,
      resourceType: 'organisation',
      resourceId: orgId,
      organisationId: orgId,
      userId,
      details: null,
      organisation: null,
    });
  });

  // ── Error Handling ─────────────────────────────────────────────────────

  it('should not throw when record() rejects (fire-and-forget)', () => {
    auditLogService.record.mockRejectedValue(new Error('DB down'));

    const event = new AuditContentEvent(resourceId, orgId, userId, null);

    // Should not throw
    expect(() => listener.handleContentUploaded(event)).not.toThrow();
  });
});
