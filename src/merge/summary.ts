import type { DiffSummary, SurveyDiff } from './types';

export function summarizeDiff(diff: Pick<SurveyDiff, 'blocks' | 'hunks'>): DiffSummary {
  const summary: DiffSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    moved: 0,
    unchanged: 0,
    conflicts: 0,
    locked: 0,
    hunks: diff.hunks.length,
    byCategory: {},
  };
  for (const entry of diff.blocks) summary[entry.status] += 1;
  for (const hunk of diff.hunks) {
    if (hunk.conflict) summary.conflicts += 1;
    if (hunk.locked) summary.locked += 1;
    summary.byCategory[hunk.category] = (summary.byCategory[hunk.category] ?? 0) + 1;
  }
  return summary;
}

const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;

/** One line for badges: "3 blocks changed, 1 added, 2 removed, 1 conflict" */
export function describeSummary(summary: DiffSummary): string {
  const parts: string[] = [];
  if (summary.changed) parts.push(`${count(summary.changed, 'block')} changed`);
  if (summary.added) parts.push(`${summary.added} added`);
  if (summary.removed) parts.push(`${summary.removed} removed`);
  if (summary.moved) parts.push(`${summary.moved} moved`);
  const blockHunks = summary.byCategory.block ?? 0;
  const other = summary.hunks - blockHunks;
  if (parts.length === 0 && other > 0) parts.push(count(other, 'change'));
  if (summary.conflicts) parts.push(count(summary.conflicts, 'conflict'));
  return parts.length ? parts.join(', ') : 'No changes';
}
