import type { BlockData, LockGroup, NodeData } from '../types';
import { getSurveyPageIds, getSurveyPages } from './surveyUtils';

// Where a path leaves the form: submit, an end block, or the last block.
const EXIT = '__exit__';

/** Whether the block is locked as part of a path group, rather than only having its position fixed. */
export const isPathGroupLocked = (block: BlockData | NodeData | null | undefined): boolean =>
  block?.lockGroup?.role === 'root' || block?.lockGroup?.role === 'member';

/** Blocks in the order the form shows them, as the runtime reads it. */
export function getOrderedBlocks(rootNode: NodeData | null): BlockData[] {
  if (!rootNode) return [];
  return getSurveyPages(rootNode).flat().filter((block) => !!block?.uuid);
}

// Where the runtime can go after each block: its next step (an explicit link,
// else the next block in order) and every navigation rule's target.
function buildSuccessors(rootNode: NodeData, order: BlockData[]): Map<string, Set<string>> {
  const pages = getSurveyPages(rootNode);
  const pageIds = getSurveyPageIds(rootNode);
  const known = new Set(order.map((block) => block.uuid as string));
  const resolve = (target: string | undefined, isPage?: boolean): string | undefined => {
    if (!target) return undefined;
    if (target === 'submit') return EXIT;
    if (isPage) {
      const page = pages[pageIds.indexOf(target)];
      return page?.[0]?.uuid;
    }
    return known.has(target) ? target : undefined;
  };

  const successors = new Map<string, Set<string>>();
  order.forEach((block, index) => {
    const next = new Set<string>();
    if (block.isEndBlock || block.nextBlockId === 'submit') {
      next.add(EXIT);
    } else {
      const step = block.nextBlockId ? resolve(block.nextBlockId) : order[index + 1]?.uuid ?? EXIT;
      if (step) next.add(step);
    }
    for (const rule of block.navigationRules || []) {
      const target = resolve(rule.target, rule.isPage);
      if (target) next.add(target);
    }
    if (next.size === 0) next.add(EXIT);
    successors.set(block.uuid as string, next);
  });
  return successors;
}

// The first block every path from `start` passes through, or EXIT if its paths only meet when the form ends.
function findJoin(start: string, successors: Map<string, Set<string>>): string {
  const reachable = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const uuid = stack.pop() as string;
    if (reachable.has(uuid) || uuid === EXIT) continue;
    reachable.add(uuid);
    for (const next of successors.get(uuid) || []) stack.push(next);
  }

  // Post-dominators: the blocks every path from a block to EXIT passes through.
  const all = new Set([...reachable, EXIT]);
  const postDominators = new Map<string, Set<string>>();
  for (const uuid of reachable) postDominators.set(uuid, new Set(all));
  postDominators.set(EXIT, new Set([EXIT]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const uuid of reachable) {
      let shared: Set<string> | null = null;
      for (const next of successors.get(uuid) || []) {
        const nextSet = postDominators.get(next) as Set<string>;
        shared = shared ? new Set([...shared].filter((item) => nextSet.has(item))) : new Set(nextSet);
      }
      const updated = new Set(shared || [EXIT]);
      updated.add(uuid);
      const current = postDominators.get(uuid) as Set<string>;
      if (updated.size !== current.size) {
        postDominators.set(uuid, updated);
        changed = true;
      }
    }
  }

  // The nearest one is the one that itself has the most post-dominators.
  let join = EXIT;
  let best = -1;
  for (const candidate of postDominators.get(start) || []) {
    if (candidate === start) continue;
    const size = postDominators.get(candidate)?.size ?? 0;
    if (size > best) {
      best = size;
      join = candidate;
    }
  }
  return join;
}

/**
 * The blocks a path group started at `rootUuid` would hold: `locked` are the
 * blocks on its paths before they join again, `orderFixed` are the block where
 * they join and the neighbours that run into or out of the group in list order.
 */
export function findPathGroup(
  rootNode: NodeData | null,
  rootUuid: string
): { locked: string[]; orderFixed: string[] } {
  const order = getOrderedBlocks(rootNode);
  if (!rootNode || !order.some((block) => block.uuid === rootUuid)) return { locked: [], orderFixed: [] };
  const successors = buildSuccessors(rootNode, order);
  const join = findJoin(rootUuid, successors);

  const locked = new Set<string>();
  const stack = [rootUuid];
  while (stack.length > 0) {
    const uuid = stack.pop() as string;
    if (uuid === EXIT || uuid === join || locked.has(uuid)) continue;
    locked.add(uuid);
    for (const next of successors.get(uuid) || []) stack.push(next);
  }

  const orderFixed = new Set<string>();
  if (join !== EXIT) orderFixed.add(join);
  // A block that runs into the next one by list order, with no link of its own.
  const flowsOn = (block: BlockData) => !block.nextBlockId && !block.isEndBlock;
  order.forEach((block, index) => {
    if (!locked.has(block.uuid as string)) return;
    const before = order[index - 1];
    const after = order[index + 1];
    if (before && !locked.has(before.uuid as string) && flowsOn(before)) orderFixed.add(before.uuid as string);
    if (after && !locked.has(after.uuid as string) && flowsOn(block)) orderFixed.add(after.uuid as string);
  });

  return { locked: [...locked], orderFixed: [...orderFixed] };
}

// Applies `change` to every block in the tree, keeping untouched branches as they are.
function mapBlocks(node: NodeData, change: (block: BlockData) => BlockData): NodeData {
  let changed = false;
  const items = node.items?.map((item) => {
    const next = item.type === 'set' && item.items ? (mapBlocks(item as NodeData, change) as BlockData) : change(item);
    if (next !== item) changed = true;
    return next;
  });
  const nodes = node.nodes?.map((child) => {
    if (typeof child === 'string') return child;
    const next = mapBlocks(child, change);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...node, ...(items && { items }), ...(nodes && { nodes }) } : node;
}

/**
 * Locks the path that starts at `rootUuid`: the block itself, the blocks on its
 * paths until they join again, and fixes the position of the join and the
 * neighbours. Blocks that already belong to another group keep that group.
 */
export function lockPathGroup(rootNode: NodeData, rootUuid: string): NodeData {
  const { locked, orderFixed } = findPathGroup(rootNode, rootUuid);
  if (locked.length === 0) return rootNode;
  const lockedSet = new Set(locked);
  const fixedSet = new Set(orderFixed);
  return mapBlocks(rootNode, (block) => {
    const uuid = block.uuid as string;
    if (block.lockGroup && block.lockGroup.id !== rootUuid) return block;
    if (lockedSet.has(uuid)) {
      const lockGroup: LockGroup = {
        id: rootUuid,
        role: uuid === rootUuid ? 'root' : 'member',
        ...(block.locked === true && uuid !== rootUuid && { wasLocked: true }),
      };
      return { ...block, locked: true, lockGroup };
    }
    if (fixedSet.has(uuid)) return { ...block, lockGroup: { id: rootUuid, role: 'orderFixed' } };
    return block;
  });
}

/**
 * Releases the group `groupId`. Its blocks unlock unless they were locked
 * before the group; the first block keeps its own lock unless `unlockRoot`.
 */
export function releasePathGroup(rootNode: NodeData, groupId: string, unlockRoot = false): NodeData {
  return mapBlocks(rootNode, (block) => {
    if (block.lockGroup?.id !== groupId) return block;
    const { lockGroup, ...rest } = block;
    if (lockGroup.role === 'orderFixed') return rest;
    // Unlocking writes `false`: the flow view merges updates, so a missing key would keep the old value.
    const keepLock = lockGroup.role === 'root' ? !unlockRoot : lockGroup.wasLocked === true;
    return { ...rest, locked: keepLock };
  });
}

/** The first block of a group, to name it in the builder. */
export function findPathGroupRoot(rootNode: NodeData | null, groupId: string): BlockData | undefined {
  return getOrderedBlocks(rootNode).find((block) => block.uuid === groupId);
}

/**
 * Whether the block after `uuid` in the form belongs to the same path group,
 * so a block added right after it, such as at the end of its page, would split the path.
 */
export function isPathContinuedAfter(rootNode: NodeData | null, uuid: string | undefined): boolean {
  if (!uuid) return false;
  const order = getOrderedBlocks(rootNode);
  const index = order.findIndex((block) => block.uuid === uuid);
  const group = order[index]?.lockGroup;
  return !!group && order[index + 1]?.lockGroup?.id === group.id;
}

// Every block in a list, with the blocks inside pages in place.
const flattenItems = (items: BlockData[] | undefined): BlockData[] =>
  (items || []).flatMap((item) => (item.type === 'set' ? flattenItems(item.items) : [item]));

// Pairs of neighbouring blocks that belong to the same group.
const groupNeighbours = (blocks: BlockData[]): string[] => {
  const pairs: string[] = [];
  for (let index = 1; index < blocks.length; index++) {
    const before = blocks[index - 1];
    const after = blocks[index];
    if (before.lockGroup && before.lockGroup.id === after.lockGroup?.id) pairs.push(`${before.uuid}>${after.uuid}`);
  }
  return pairs;
};

/**
 * Whether a list may change from `prev` to `next` without separating, reordering
 * or dropping two neighbouring blocks of a path group, which would change the
 * group's path. Covers adding, moving and removing items in one list.
 */
export function isOrderChangeAllowed(prev: BlockData[] | undefined, next: BlockData[] | undefined): boolean {
  const kept = new Set(groupNeighbours(flattenItems(next)));
  return groupNeighbours(flattenItems(prev)).every((pair) => kept.has(pair));
}

/**
 * How `next` departs from the path groups of `previous`: the grouped blocks it
 * drops or regroups, and whether it separates, reorders or splits two
 * neighbouring blocks of a group. Groups only `next` has are not counted.
 */
export function findPathGroupChanges(previous: NodeData | null, next: NodeData | null): { changed: BlockData[]; separated: boolean } {
  const nextBlocks = getOrderedBlocks(next);
  const nextByUuid = new Map(nextBlocks.filter((block) => block.uuid).map((block) => [block.uuid as string, block]));
  const previousBlocks = getOrderedBlocks(previous);
  const changed = previousBlocks.filter(
    (block) => block.lockGroup && JSON.stringify(nextByUuid.get(block.uuid as string)?.lockGroup) !== JSON.stringify(block.lockGroup)
  );
  const kept = new Set(groupNeighbours(nextBlocks));
  return { changed, separated: !groupNeighbours(previousBlocks).every((pair) => kept.has(pair)) };
}

/** Throws if a whole-form import changes any block's path group or separates its neighbours. */
export function assertPathGroupsPreserved(previous: NodeData | null, next: NodeData): void {
  const groupsOf = (root: NodeData | null) => {
    const groups = new Map<string, string>();
    for (const block of getOrderedBlocks(root)) {
      if (block.lockGroup) groups.set(block.uuid as string, JSON.stringify(block.lockGroup));
    }
    return groups;
  };
  const before = groupsOf(previous);
  const after = groupsOf(next);
  const sameGroups = before.size === after.size && [...before].every(([uuid, group]) => after.get(uuid) === group);
  const kept = new Set(groupNeighbours(getOrderedBlocks(next)));
  const sameOrder = groupNeighbours(getOrderedBlocks(previous)).every((pair) => kept.has(pair));
  if (!sameGroups || !sameOrder) {
    throw new Error("This import changes a locked path. Keep each path's blocks, their order and their lock settings unchanged.");
  }
}
