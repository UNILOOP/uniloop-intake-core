import { describe, expect, test } from 'bun:test';
import type { BlockData, BlockDefinition, NodeData } from '../src/types';
import { replaceBlock } from '../src/utils/blockReplacement';
import { assertLockedBlocksPreserved, isBlockRemovalLocked, isBlockUpdateAllowed } from '../src/utils/blockLock';
import {
  findPathGroup,
  getOrderedBlocks,
  isOrderChangeAllowed,
  isPathContinuedAfter,
  lockPathGroup,
  releasePathGroup,
} from '../src/utils/pathGroupLock';

const block = (uuid: string, extra: Partial<BlockData> = {}): BlockData => ({
  type: 'text',
  uuid,
  fieldName: uuid,
  label: uuid,
  ...extra,
});

const form = (...items: BlockData[]): NodeData => ({ type: 'section', uuid: 'root', items });

const byId = (root: NodeData) => new Map(getOrderedBlocks(root).map((item) => [item.uuid, item]));

const sorted = (group: { locked: string[]; orderFixed: string[] }) => ({
  locked: [...group.locked].sort(),
  orderFixed: [...group.orderFixed].sort(),
});

// p runs into a, which branches to b or c; both lead to d, then e
const branching = () =>
  form(
    block('p'),
    block('a', { navigationRules: [{ condition: 'x == 1', target: 'c' }] }),
    block('b', { nextBlockId: 'd' }),
    block('c'),
    block('d'),
    block('e')
  );

describe('findPathGroup', () => {
  test('locks the branches until they join, and fixes the join and the block running into the group', () => {
    expect(sorted(findPathGroup(branching(), 'a'))).toEqual({ locked: ['a', 'b', 'c'], orderFixed: ['d', 'p'] });
  });

  test('a block with no rules or links locks itself and fixes its neighbours', () => {
    const root = form(block('p'), block('a'), block('b'));
    expect(sorted(findPathGroup(root, 'a'))).toEqual({ locked: ['a'], orderFixed: ['b', 'p'] });
  });

  test('when the branches only meet at the end, everything reachable is locked', () => {
    const root = form(
      block('p'),
      block('a', { navigationRules: [{ condition: 'x == 1', target: 'submit' }] }),
      block('b'),
      block('c', { isEndBlock: true })
    );
    expect(sorted(findPathGroup(root, 'a'))).toEqual({ locked: ['a', 'b', 'c'], orderFixed: ['p'] });
  });

  test('a neighbour with its own link is not fixed: it does not run into the group', () => {
    const root = form(block('p', { nextBlockId: 'z' }), block('a'), block('b'), block('z'));
    expect(sorted(findPathGroup(root, 'a'))).toEqual({ locked: ['a'], orderFixed: ['b'] });
  });

  test('a rule that targets a page leads to its first block', () => {
    const root: NodeData = {
      type: 'section',
      uuid: 'root',
      items: [
        {
          type: 'set',
          uuid: 'page-1',
          items: [block('a', { navigationRules: [{ condition: 'x == 1', target: 'page-3', isPage: true }] })],
        },
        { type: 'set', uuid: 'page-2', items: [block('b')] },
        { type: 'set', uuid: 'page-3', items: [block('c'), block('d')] },
      ],
    };
    expect(sorted(findPathGroup(root, 'a'))).toEqual({ locked: ['a', 'b'], orderFixed: ['c'] });
  });

  test('a rule that loops back does not hang the walk', () => {
    const root = form(
      block('a', { navigationRules: [{ condition: 'x == 1', target: 'c' }] }),
      block('b', { navigationRules: [{ condition: 'y == 1', target: 'a' }] }),
      block('c'),
      block('d')
    );
    expect(sorted(findPathGroup(root, 'a'))).toEqual({ locked: ['a', 'b'], orderFixed: ['c'] });
  });
});

describe('lockPathGroup and releasePathGroup', () => {
  test('locks the group, stores the roles, and remembers blocks that were locked already', () => {
    const root = branching();
    (root.items as BlockData[])[2].locked = true;
    const blocks = byId(lockPathGroup(root, 'a'));
    expect(blocks.get('a')).toMatchObject({ locked: true, lockGroup: { id: 'a', role: 'root' } });
    expect(blocks.get('b')).toMatchObject({ locked: true, lockGroup: { id: 'a', role: 'member', wasLocked: true } });
    expect(blocks.get('c')).toMatchObject({ locked: true, lockGroup: { id: 'a', role: 'member' } });
    expect(blocks.get('c')?.lockGroup?.wasLocked).toBeUndefined();
    expect(blocks.get('d')).toMatchObject({ lockGroup: { id: 'a', role: 'orderFixed' } });
    expect(blocks.get('d')?.locked).toBeUndefined();
    expect(blocks.get('e')?.lockGroup).toBeUndefined();
  });

  test('releasing keeps the first block locked, and earlier locks, unless the first block is unlocked too', () => {
    const root = branching();
    (root.items as BlockData[])[2].locked = true;
    const locked = lockPathGroup(root, 'a');

    const released = byId(releasePathGroup(locked, 'a'));
    expect(released.get('a')).toMatchObject({ locked: true });
    expect(released.get('b')).toMatchObject({ locked: true });
    expect(released.get('c')).toMatchObject({ locked: false });
    for (const item of released.values()) expect(item.lockGroup).toBeUndefined();

    expect(byId(releasePathGroup(locked, 'a', true)).get('a')).toMatchObject({ locked: false });
  });

  test("a block in another path keeps that path", () => {
    const root = lockPathGroup(branching(), 'c');
    const blocks = byId(lockPathGroup(root, 'a'));
    expect(blocks.get('c')?.lockGroup).toMatchObject({ id: 'c', role: 'root' });
    expect(blocks.get('b')?.lockGroup).toMatchObject({ id: 'a', role: 'member' });
  });
});

describe('builder checks', () => {
  const locked = () => byId(lockPathGroup(branching(), 'a'));

  test('a block the path locks cannot be unlocked or taken out of the path on its own', () => {
    const member = locked().get('b') as BlockData;
    expect(isBlockUpdateAllowed(member, { ...member, locked: false }, undefined)).toBe(false);
    const { lockGroup: _, ...withoutGroup } = member;
    expect(isBlockUpdateAllowed(member, withoutGroup as BlockData, undefined)).toBe(false);
  });

  test('a block whose place is fixed keeps its wording editable but not its group', () => {
    const fixed = locked().get('d') as BlockData;
    expect(isBlockUpdateAllowed(fixed, { ...fixed, label: 'New wording' }, undefined)).toBe(true);
    expect(isBlockUpdateAllowed(fixed, { ...fixed, lockGroup: undefined }, undefined)).toBe(false);
    expect(isBlockRemovalLocked(fixed)).toBe(true);
    expect(isBlockRemovalLocked(locked().get('e'))).toBe(false);
  });

  test('inserting, moving or removing between neighbours of a path is refused; elsewhere it is allowed', () => {
    const items = lockPathGroup(branching(), 'a').items as BlockData[];
    const extra = block('new');
    expect(isOrderChangeAllowed(items, [...items.slice(0, 2), extra, ...items.slice(2)])).toBe(false);
    expect(isOrderChangeAllowed(items, [...items, extra])).toBe(true);
    expect(isOrderChangeAllowed(items, [items[0], items[2], items[1], ...items.slice(3)])).toBe(false);
    expect(isOrderChangeAllowed(items, items.filter((item) => item.uuid !== 'd'))).toBe(false);
    expect(isOrderChangeAllowed(items, items.filter((item) => item.uuid !== 'e'))).toBe(true);
  });

  test('a JSON import cannot change a path or its order, but other edits pass', () => {
    const before = lockPathGroup(branching(), 'a');
    const items = before.items as BlockData[];
    const edited = { ...before, items: items.map((item) => (item.uuid === 'e' ? { ...item, label: 'Changed' } : item)) };
    expect(() => assertLockedBlocksPreserved(before, edited, {})).not.toThrow();

    const dropped = { ...before, items: items.map((item) => (item.uuid === 'd' ? { ...item, lockGroup: undefined } : item)) };
    expect(() => assertLockedBlocksPreserved(before, dropped, {})).toThrow(/locked path/);

    const reordered = { ...before, items: [items[0], items[1], block('new'), ...items.slice(2)] };
    expect(() => assertLockedBlocksPreserved(before, reordered, {})).toThrow(/locked path/);

    const forged = { ...before, items: items.map((item) => (item.uuid === 'e' ? { ...item, lockGroup: { id: 'a', role: 'orderFixed' as const } } : item)) };
    expect(() => assertLockedBlocksPreserved(before, forged, {})).toThrow(/locked path/);
  });
});

describe('isPathContinuedAfter', () => {
  test('is true when the next block in the form, even on the next page, is on the same path', () => {
    const root = lockPathGroup(
      {
        type: 'section',
        uuid: 'root',
        items: [
          { type: 'set', uuid: 'page-1', items: [block('a', { navigationRules: [{ condition: 'x == 1', target: 'c' }] })] },
          { type: 'set', uuid: 'page-2', items: [block('b', { nextBlockId: 'd' })] },
          { type: 'set', uuid: 'page-3', items: [block('c'), block('d')] },
        ],
      },
      'a'
    );
    expect(isPathContinuedAfter(root, 'a')).toBe(true);
    expect(isPathContinuedAfter(root, 'c')).toBe(true);
    expect(isPathContinuedAfter(root, 'd')).toBe(false);
    expect(isPathContinuedAfter(root, undefined)).toBe(false);
  });
});

describe('replacing a block whose position a path fixes', () => {
  test('the replacement keeps its place in the path, so the builder accepts it', () => {
    const fixed = byId(lockPathGroup(branching(), 'a')).get('d') as BlockData;
    const definition = (type: string) => ({ type, name: type, description: '', icon: null, defaultData: { type, label: '' }, renderItem: () => null }) as unknown as BlockDefinition;
    const replacement = replaceBlock(fixed, 'other', { text: definition('text'), other: definition('other') });
    expect(replacement?.data.lockGroup).toEqual({ id: 'a', role: 'orderFixed' });
    expect(isBlockUpdateAllowed(fixed, replacement?.data as BlockData, undefined)).toBe(true);
  });
});
