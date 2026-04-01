# Bug: Deleting a group schedule does not notify screens — stale content persists

## Summary

When a schedule entry assigned to a screen group is deleted, no `GROUP_SCHEDULE_CHANGED` event is emitted. Screens in the group are never notified and continue displaying the now-deleted schedule's content until the next boundary timer fires or they reconnect.

## Steps to Reproduce

1. Create a screen group with two screens
2. Assign a schedule to the screen group with a playlist
3. Both screens connect via SSE and start displaying the playlist
4. Delete the schedule entry via `DELETE /schedules/{id}`
5. Observe: both screens continue showing the deleted schedule's playlist indefinitely

## Expected Behavior

After deletion, both screens should receive an SSE event, re-evaluate their current playlist, and switch to the fallback/default playlist (or show nothing if no fallback is configured).

## Root Cause

In `backend/src/schedule/schedule.service.ts:167-178`, the `delete` method only emits `SCHEDULE_ENTRY_CHANGED` when `entry.screenId` is set:

```typescript
async delete(id: string, organisationId: string): Promise<void> {
    const entry = await this.findOneOrFail(id, organisationId);
    const screenId = entry.screenId;
    await this.scheduleEntryRepository.remove(entry);
    if (screenId) {
      this.emitScheduleChanged(screenId, organisationId);
    }
    // BUG: no emitGroupScheduleChanged when entry.groupId is set
}
```

For group schedule entries, `entry.screenId` is `null` and `entry.groupId` is set. The `if (screenId)` check fails, so no event is emitted. Compare with `create` (line 96-101) and `update` (line 149-154), which both correctly call `emitGroupScheduleChanged` when `groupId` is present.

The `delete` method also does not include `entry.groupId` in the audit event payload (line 176), so the audit log loses the group association on deletion.

## User Stories

### BUG-005-001: Emit GROUP_SCHEDULE_CHANGED on group schedule deletion

**Description:** As a screen in a group, I want to be notified when the group's schedule is deleted so that I stop showing stale content.

**Acceptance Criteria:**
- [ ] `ScheduleService.delete()` calls `emitGroupScheduleChanged(entry.groupId, organisationId, entry.playlistId)` when `entry.groupId` is set
- [ ] `ScheduleBoundaryService` reschedules boundaries for all screens in the group after deletion
- [ ] `ScreenProtocolService` fans out SSE events to all screens in the group after deletion
- [ ] Screens switch to fallback/default playlist after the group schedule is deleted
- [ ] The audit event payload includes `groupId` alongside `screenId`
- [ ] Existing tests pass, new tests cover group schedule deletion notification
- [ ] `npm run lint` and `npm run test` pass
