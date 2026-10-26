import type { SelectOption } from '../../ui';
import type { BackupImportPlan, BackupMapping, BackupPlanEntry } from './site-agent-backup.service';

/** The value of the "skip this entry" option in a mapping select. */
export const SKIP = '';

/** A plan sorted into what the operator has to look at. */
export interface GroupedPlan {
  /** Entries restored as they are: their screen exists and is free or this agent's. */
  restore: BackupPlanEntry[];
  /** Entries whose screen belongs to another agent; left alone. */
  otherAgent: BackupPlanEntry[];
  /** Entries whose screen no longer exists; the operator maps or skips them. */
  unknown: BackupPlanEntry[];
}

export function groupPlan(plan: BackupImportPlan): GroupedPlan {
  return {
    restore: plan.entries.filter((entry) => entry.status === 'fill' || entry.status === 'create'),
    otherAgent: plan.entries.filter((entry) => entry.status === 'other_agent'),
    unknown: plan.entries.filter((entry) => entry.status === 'not_found'),
  };
}

/** How an entry is named: as the backup knew it, else as the screen is called now, else by id. */
export function entryLabel(entry: BackupPlanEntry): string {
  return entry.backupName ?? entry.screenName ?? entry.screenId.slice(0, 8);
}

export interface TargetOptionTexts {
  skip: string;
  ownedBy: (agentName: string) => string;
  alreadyChosen: string;
}

/**
 * The choices for one unknown entry: skip, or any screen it may go to. Screens
 * of another agent and screens already chosen for another entry stay in the
 * list — so the operator sees why they cannot be picked — but are disabled.
 */
export function targetOptions(
  plan: BackupImportPlan,
  selection: Readonly<Record<string, string>>,
  forEntry: string,
  texts: TargetOptionTexts,
): SelectOption[] {
  const chosenElsewhere = new Set(
    Object.entries(selection)
      .filter(([from, to]) => from !== forEntry && to !== SKIP)
      .map(([, to]) => to),
  );
  return [
    { value: SKIP, label: texts.skip },
    ...plan.targets.map((target): SelectOption => {
      if (!target.selectable) {
        return {
          value: target.screenId,
          label: target.name,
          disabled: true,
          hint: texts.ownedBy(target.ownerAgentName ?? '?'),
        };
      }
      if (chosenElsewhere.has(target.screenId)) {
        return {
          value: target.screenId,
          label: target.name,
          disabled: true,
          hint: texts.alreadyChosen,
        };
      }
      return { value: target.screenId, label: target.name };
    }),
  ];
}

/** The mappings to send: every unknown entry the operator pointed at a screen. */
export function mappingsOf(selection: Readonly<Record<string, string>>): BackupMapping[] {
  return Object.entries(selection)
    .filter(([, to]) => to !== SKIP)
    .map(([from, to]) => ({ from, to }));
}

/** The name of the screen an entry is mapped onto, for the overwrite warning. */
export function targetName(plan: BackupImportPlan, screenId: string): string {
  return plan.targets.find((target) => target.screenId === screenId)?.name ?? screenId;
}
