import { validate } from 'class-validator';
import { ScheduleEntry } from './schedule-entry.entity';

function createEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  const entry = new ScheduleEntry();
  entry.organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  entry.screenId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  entry.playlistId = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  entry.startTime = new Date('2026-04-01T09:00:00Z');
  entry.endTime = new Date('2026-04-01T10:00:00Z');
  entry.rrule = null;
  entry.colour = '#FF5733';
  Object.assign(entry, overrides);
  return entry;
}

describe('ScheduleEntry entity validation', () => {
  it('should pass validation with valid data', async () => {
    const entry = createEntry();
    const errors = await validate(entry);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with an rrule', async () => {
    const entry = createEntry({ rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' });
    const errors = await validate(entry);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when organisationId is empty', async () => {
    const entry = createEntry({ organisationId: '' });
    const errors = await validate(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should pass validation when screenId is null (group-targeted schedule)', async () => {
    const entry = createEntry({ screenId: null });
    const errors = await validate(entry);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when playlistId is empty', async () => {
    const entry = createEntry({ playlistId: '' });
    const errors = await validate(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'playlistId')).toBe(true);
  });

  it('should fail validation when colour is not a valid hex', async () => {
    const entry = createEntry({ colour: 'red' });
    const errors = await validate(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'colour')).toBe(true);
  });

  it('should fail validation when colour is empty', async () => {
    const entry = createEntry({ colour: '' });
    const errors = await validate(entry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'colour')).toBe(true);
  });

  it('should pass validation with lowercase hex colour', async () => {
    const entry = createEntry({ colour: '#ff5733' });
    const errors = await validate(entry);
    expect(errors).toHaveLength(0);
  });
});
