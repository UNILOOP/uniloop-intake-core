import type { BlockDiffEntry, MergeHunk, MergeSide } from '../types';
import type { NodeStatus } from './status';

/** How an entry shows once its add or remove decision is applied, and whether it is in the merged form. */
export function entryStatus(entry: BlockDiffEntry, resolve: (hunk: MergeHunk) => MergeSide): { status: NodeStatus; present: boolean } {
  if (entry.status === 'added') {
    const hunk = entry.hunks.find((candidate) => candidate.id === `${entry.key}:add`);
    const taken = hunk ? resolve(hunk) === 'incoming' : false;
    return taken ? { status: 'added', present: true } : { status: 'declined-add', present: false };
  }
  if (entry.status === 'removed') {
    const hunk = entry.hunks.find((candidate) => candidate.id === `${entry.key}:remove`);
    const removed = hunk ? resolve(hunk) === 'incoming' : false;
    return removed ? { status: 'removed', present: false } : { status: 'kept-removed', present: true };
  }
  return { status: entry.status, present: true };
}
