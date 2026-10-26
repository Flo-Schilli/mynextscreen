import { detailItems, displayValue } from './audit-log-details';

const SCREEN = '7277e822-0381-4a8a-85da-d1e81eb53e64';
const PLAYLIST = 'b0da4a84-d0d6-451d-b07d-b2402797cf4d';
const GONE = '68e3c234-bc9d-4638-b5e2-355e7a789fb2';
const names = { [SCREEN]: 'Foyer Left', [PLAYLIST]: 'Metal' };
const labels = { gone: 'deleted', changed: 'changed', yes: 'yes', no: 'no' };

describe('audit log details', () => {
  describe('displayValue', () => {
    it('shows the name for a known id', () => {
      expect(displayValue(SCREEN, names, 'deleted')).toBe('Foyer Left');
    });

    it('finds the name for an id written in upper case', () => {
      expect(displayValue(SCREEN.toUpperCase(), names, 'deleted')).toBe('Foyer Left');
    });

    it('marks an id it cannot name as gone, keeping a short id', () => {
      expect(displayValue(GONE, names, 'deleted')).toBe('68e3c234 (deleted)');
    });

    it('joins lists and names the ids in them', () => {
      expect(displayValue([SCREEN, PLAYLIST], names, 'deleted')).toBe('Foyer Left, Metal');
      expect(displayValue(['name', 'location'], names, 'deleted')).toBe('name, location');
    });

    it('keeps plain values as they are', () => {
      expect(displayValue('standby', names, 'deleted')).toBe('standby');
      expect(displayValue(80, names, 'deleted')).toBe('80');
      expect(displayValue(true, names, 'deleted')).toBe('true');
    });
  });

  describe('detailItems', () => {
    it('drops empty values and names the rest', () => {
      expect(
        detailItems(
          { screenId: SCREEN, groupId: null, playlistId: PLAYLIST, fields: [] },
          names,
          labels,
        ),
      ).toEqual([
        { key: 'screenId', value: 'Foyer Left' },
        { key: 'playlistId', value: 'Metal' },
      ]);
    });

    it('shows each recorded change as old → new', () => {
      expect(
        detailItems(
          {
            name: 'Lobby',
            changes: {
              name: { from: 'Foyer', to: 'Lobby' },
              playlistId: { from: PLAYLIST, to: GONE },
            },
          },
          names,
          labels,
        ),
      ).toEqual([
        { key: 'name', value: 'Lobby' },
        { key: 'name', value: 'Foyer → Lobby', isChange: true },
        { key: 'playlistId', value: 'Metal → 68e3c234 (deleted)', isChange: true },
      ]);
    });

    it('formats empty values, booleans, sizes and id lists in a change', () => {
      const items = detailItems(
        {
          changes: {
            location: { from: null, to: 'Hall' },
            enabled: { from: true, to: false },
            storageOriginalLimitBytes: { from: 5368709120, to: 10737418240 },
            screenIds: { from: [SCREEN], to: [] },
          },
        },
        names,
        labels,
      );

      expect(items).toEqual([
        { key: 'location', value: '– → Hall', isChange: true },
        { key: 'enabled', value: 'yes → no', isChange: true },
        { key: 'storageOriginalLimitBytes', value: '5.0 GB → 10.0 GB', isChange: true },
        { key: 'screenIds', value: 'Foyer Left → –', isChange: true },
      ]);
    });

    it('shows a change recorded without values as changed', () => {
      expect(detailItems({ changes: { devmodePassphrase: {} } }, names, labels)).toEqual([
        { key: 'devmodePassphrase', value: 'changed', isChange: true },
      ]);
    });

    it('formats a changed point in time as a local date', () => {
      const [item] = detailItems(
        { changes: { startTime: { from: '2026-10-26T18:00:00.000Z', to: null } } },
        names,
        labels,
      );

      expect(item.value).not.toContain('T18:00');
      expect(item.value).toMatch(/2026|26/);
      expect(item.value.endsWith(' → –')).toBe(true);
    });

    it("leaves out the id of the entry's own resource", () => {
      expect(
        detailItems(
          { streamId: SCREEN.toUpperCase(), streamName: 'Cam', playlistId: PLAYLIST },
          names,
          labels,
          SCREEN,
        ),
      ).toEqual([
        { key: 'streamName', value: 'Cam' },
        { key: 'playlistId', value: 'Metal' },
      ]);
    });

    it('returns nothing for missing details', () => {
      expect(detailItems(null, names, labels)).toEqual([]);
    });
  });
});
