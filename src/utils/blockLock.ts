import type { BlockData, BlockDefinition, NodeData } from '../types';

// A locked block never changes type or identity, whatever its lockAccess says.
// Its A/B test is fixed too: each variant holds a full copy of the block, and at
// runtime a variant's settings replace the block's own, locked ones included.
const ALWAYS_LOCKED = ['type', 'uuid', 'abTest'];

// The settings that decide a block's next step, apart from its navigation rules.
const NEXT_STEP_PATHS = ['nextBlockId', 'isEndBlock', 'isEndBlockManual'];

export const isBlockLocked = (block: BlockData | NodeData | null | undefined): boolean =>
  block?.locked === true;

// 'options[].value' and 'options[2].value' both become ['options', '[]', 'value'].
const toSegments = (path: string): string[] =>
  path.replace(/\[\d*\]/g, '.[]').split('.').filter(Boolean);

// Two paths overlap when one is a prefix of the other: a change to `options`
// touches `options[].value`, and so does a change to `options[].value.en`.
const overlaps = (a: string[], b: string[]): boolean => {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Paths where `next` differs from `prev`, with array indices as '[]'. An array
// whose length changed is reported as a change to the array itself.
const collectChanges = (prev: unknown, next: unknown, path: string[], changes: string[][]) => {
  if (Object.is(prev, next)) return;
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) {
      changes.push(path);
      return;
    }
    for (let index = 0; index < prev.length; index++) {
      collectChanges(prev[index], next[index], [...path, '[]'], changes);
    }
    return;
  }
  if (isPlainObject(prev) && isPlainObject(next)) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const key of keys) {
      collectChanges(prev[key], next[key], [...path, key], changes);
    }
    return;
  }
  changes.push(path);
};

const lockedPaths = (definition: BlockDefinition | undefined): string[][] | null => {
  const locked = definition?.lockAccess?.locked;
  return locked ? [...locked, ...ALWAYS_LOCKED].map(toSegments) : null;
};

/**
 * Whether a setting of `block` is fixed by its lock. `path` uses the same form
 * as `lockAccess.locked`: `'fieldName'`, `'options[].value'`, or `'options'`
 * for adding, removing or reordering options.
 */
export function isBlockPathLocked(
  block: BlockData,
  definition: BlockDefinition | undefined,
  path: string
): boolean {
  if (!isBlockLocked(block)) return false;
  const locked = lockedPaths(definition);
  if (!locked) return true;
  const target = toSegments(path);
  return locked.some((lockedPath) => overlaps(target, lockedPath));
}

/**
 * Whether the lock fixes where one of the block's links leads: a navigation
 * rule's target when `isRule`, otherwise its next step.
 */
export function isBlockLinkLocked(
  block: BlockData | undefined,
  definition: BlockDefinition | undefined,
  isRule: boolean
): boolean {
  if (!block) return false;
  return isRule
    ? isBlockPathLocked(block, definition, 'navigationRules')
    : NEXT_STEP_PATHS.some((path) => isBlockPathLocked(block, definition, path));
}

/**
 * Whether the builder may replace `prev` with `next`. An unlocked block can
 * change freely. A locked block can only change where its definition's
 * `lockAccess` leaves a setting editable, and the lock flag itself can always
 * be switched.
 */
export function isBlockUpdateAllowed(
  prev: BlockData,
  next: BlockData,
  definition: BlockDefinition | undefined
): boolean {
  if (!isBlockLocked(prev)) return true;
  const changes: string[][] = [];
  collectChanges({ ...prev, locked: undefined }, { ...next, locked: undefined }, [], changes);
  if (changes.length === 0) return true;
  const locked = lockedPaths(definition);
  if (!locked) return false;
  return changes.every((change) => !locked.some((lockedPath) => overlaps(change, lockedPath)));
}

/** Whether a page or section holds a locked block, so removing it would delete one. */
export function containsLockedBlock(node: BlockData | NodeData | null | undefined): boolean {
  if (!node) return false;
  if (isBlockLocked(node)) return true;
  if (node.items?.some((item: BlockData) => containsLockedBlock(item))) return true;
  return (node.nodes || []).some(
    (child: NodeData | string) => typeof child !== 'string' && containsLockedBlock(child)
  );
}
