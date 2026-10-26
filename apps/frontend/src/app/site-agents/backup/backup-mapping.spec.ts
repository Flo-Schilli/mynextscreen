import { describe, expect, it } from 'vitest';
import {
  SKIP,
  entryLabel,
  groupPlan,
  mappingsOf,
  targetName,
  targetOptions,
} from './backup-mapping';
import type { BackupImportPlan, BackupPlanEntry } from './site-agent-backup.service';

function entry(
  screenId: string,
  status: BackupPlanEntry['status'],
  extra: Partial<BackupPlanEntry> = {},
): BackupPlanEntry {
  return { screenId, backupName: null, status, screenName: null, ownerAgentName: null, ...extra };
}

const PLAN: BackupImportPlan = {
  sourceAgentId: 'agent-old',
  entries: [
    entry('bar', 'fill', { screenName: 'Bar' }),
    entry('stage', 'create', { screenName: 'Stage' }),
    entry('hall', 'other_agent', { screenName: 'Hall', ownerAgentName: 'South' }),
    entry('gone-1', 'not_found', { backupName: 'Foyer left' }),
    entry('gone-2', 'not_found', { backupName: 'Foyer right' }),
  ],
  targets: [
    { screenId: 'new-left', name: 'Foyer left (new)', selectable: true, ownerAgentName: null },
    { screenId: 'new-right', name: 'Foyer right (new)', selectable: true, ownerAgentName: null },
    { screenId: 'balcony', name: 'Balcony', selectable: false, ownerAgentName: 'South' },
  ],
};

const TEXTS = {
  skip: 'Skip',
  ownedBy: (agent: string) => `belongs to ${agent}`,
  alreadyChosen: 'already chosen',
};

describe('backup mapping', () => {
  it('sorts a plan into restored, other-agent and unknown entries', () => {
    const grouped = groupPlan(PLAN);

    expect(grouped.restore.map((e) => e.screenId)).toEqual(['bar', 'stage']);
    expect(grouped.otherAgent.map((e) => e.screenId)).toEqual(['hall']);
    expect(grouped.unknown.map((e) => e.screenId)).toEqual(['gone-1', 'gone-2']);
  });

  it('names an entry as the backup knew it, then as it is called now, then by id', () => {
    expect(entryLabel(entry('x', 'not_found', { backupName: 'Foyer', screenName: 'Now' }))).toBe(
      'Foyer',
    );
    expect(entryLabel(entry('x', 'fill', { screenName: 'Now' }))).toBe('Now');
    expect(entryLabel(entry('0123456789abcdef', 'not_found'))).toBe('01234567');
  });

  it("offers skip first, free screens, and other agents' screens disabled with the reason", () => {
    const options = targetOptions(PLAN, {}, 'gone-1', TEXTS);

    expect(options).toEqual([
      { value: SKIP, label: 'Skip' },
      { value: 'new-left', label: 'Foyer left (new)' },
      { value: 'new-right', label: 'Foyer right (new)' },
      { value: 'balcony', label: 'Balcony', disabled: true, hint: 'belongs to South' },
    ]);
  });

  it('disables a screen already chosen for another entry, but not for the entry that chose it', () => {
    const selection = { 'gone-1': 'new-left', 'gone-2': SKIP };

    const forOther = targetOptions(PLAN, selection, 'gone-2', TEXTS);
    const forChooser = targetOptions(PLAN, selection, 'gone-1', TEXTS);

    expect(forOther.find((o) => o.value === 'new-left')).toMatchObject({
      disabled: true,
      hint: 'already chosen',
    });
    expect(forChooser.find((o) => o.value === 'new-left')?.disabled).toBeUndefined();
  });

  it('turns the selection into mappings, leaving skipped entries out', () => {
    expect(mappingsOf({ 'gone-1': 'new-left', 'gone-2': SKIP })).toEqual([
      { from: 'gone-1', to: 'new-left' },
    ]);
  });

  it('names a target screen for the warning, falling back to its id', () => {
    expect(targetName(PLAN, 'new-right')).toBe('Foyer right (new)');
    expect(targetName(PLAN, 'unknown')).toBe('unknown');
  });
});
