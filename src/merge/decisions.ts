import type { MergeDecisions, MergeHunk, MergeSide, SurveyDiff } from './types';

/** The side a hunk takes: its lock, then the explicit decision, then its default. A forced hunk is incoming only once taken. */
export function resolveDecision(hunk: MergeHunk, decisions: MergeDecisions = {}): MergeSide {
  if (hunk.locked) return 'incoming';
  if (hunk.forced) return decisions[hunk.id] === 'incoming' ? 'incoming' : 'current';
  return decisions[hunk.id] ?? hunk.defaultDecision;
}

/** Every hunk's default, as explicit decisions. */
export function defaultDecisions(diff: Pick<SurveyDiff, 'hunks'>): MergeDecisions {
  return Object.fromEntries(diff.hunks.map((hunk) => [hunk.id, hunk.locked ? 'incoming' : hunk.defaultDecision]));
}

/** Decisions that take `side` for every hunk the filter accepts (locked hunks stay incoming, forced ones can't be kept). */
export function bulkDecisions(diff: Pick<SurveyDiff, 'hunks'>, side: MergeSide, filter: (hunk: MergeHunk) => boolean = () => true): MergeDecisions {
  const decisions: MergeDecisions = {};
  for (const hunk of diff.hunks) {
    if (hunk.locked || (hunk.forced && side === 'current') || !filter(hunk)) continue;
    decisions[hunk.id] = side;
  }
  return decisions;
}

/**
 * The decisions a choice implies: taking or declining a page takes or declines the
 * blocks inside it, and taking a block inside a declined page takes the page too.
 */
export function cascadeDecision(diff: SurveyDiff, hunkId: string, side: MergeSide): MergeDecisions {
  const patch: MergeDecisions = { [hunkId]: side };
  const hunk = diff.hunks.find((candidate) => candidate.id === hunkId);
  if (!hunk) return patch;
  if (hunk.kind === 'section-added' || hunk.kind === 'section-removed') {
    const key = hunk.meta!.sectionKey!;
    const within = (containerKey: string): boolean => {
      let cursor: string | undefined = containerKey;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === key) return true;
        seen.add(cursor);
        cursor = diff.containers[cursor]?.parentKey;
      }
      return false;
    };
    const suffix = hunk.kind === 'section-added' ? ':add' : ':remove';
    for (const child of diff.hunks) {
      const sectionKey = child.meta?.sectionKey;
      if (sectionKey && sectionKey !== key && within(sectionKey) && child.id.endsWith(suffix)) patch[child.id] = side;
      const block = diff.blocks.find((entry) => entry.key === child.blockKey);
      if (block && within(block.containerKey) && child.id.endsWith(suffix) && !child.locked) patch[child.id] = side;
    }
  }
  // Choosing a child also keeps the section chain needed to contain it.
  if (
    ((hunk.kind === 'block-added' || hunk.kind === 'page-added' || hunk.kind === 'section-added') && side === 'incoming') ||
    ((hunk.kind === 'block-removed' || hunk.kind === 'page-removed' || hunk.kind === 'section-removed') && side === 'current')
  ) {
    const block = diff.blocks.find((entry) => entry.key === hunk.blockKey);
    let cursor = hunk.meta?.sectionKey ? diff.containers[hunk.meta.sectionKey]?.parentKey : block?.containerKey;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const parent = diff.hunks.find(
        (candidate) => candidate.meta?.sectionKey === cursor && (candidate.kind === 'section-added' || candidate.kind === 'section-removed')
      );
      if (parent) patch[parent.id] = side;
      cursor = diff.containers[cursor]?.parentKey;
    }
  }
  if (!hunk.blockKey) return patch;
  const entry = diff.blocks.find((candidate) => candidate.key === hunk.blockKey);
  if (!entry) return patch;

  if (hunk.kind === 'page-added' || hunk.kind === 'page-removed') {
    const suffix = hunk.kind === 'page-added' ? ':add' : ':remove';
    for (const childKey of entry.childKeys ?? []) {
      const child = diff.hunks.find((candidate) => candidate.id === `${childKey}${suffix}`);
      if (child && !child.locked) patch[child.id] = side;
    }
    return patch;
  }

  if (hunk.kind === 'block-added' && side === 'incoming') {
    const page = diff.hunks.find((candidate) => candidate.id === `${entry.containerKey}:add`);
    if (page) patch[page.id] = 'incoming';
  }
  if (hunk.kind === 'block-removed' && side === 'current') {
    const page = diff.hunks.find((candidate) => candidate.id === `${entry.containerKey}:remove`);
    if (page) patch[page.id] = 'current';
  }
  return patch;
}

/** Conflicts the user has not decided on explicitly. */
export function unresolvedConflicts(diff: Pick<SurveyDiff, 'hunks'>, decisions: MergeDecisions = {}): MergeHunk[] {
  return diff.hunks.filter((hunk) => hunk.conflict && !hunk.locked && decisions[hunk.id] === undefined);
}

/** Forced hunks the user has not taken yet; the merge can't be applied while any remain. */
export function pendingForced(diff: Pick<SurveyDiff, 'hunks'>, decisions: MergeDecisions = {}): MergeHunk[] {
  return diff.hunks.filter((hunk) => hunk.forced && decisions[hunk.id] !== 'incoming');
}
