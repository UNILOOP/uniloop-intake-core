import type { BlockData, NavigationRule, ValidationRule } from '../types';
import { ROOT_KEY } from './collect';
import { resolveDecision } from './decisions';
import { keyRules, navRuleKey, NEXT_KEYS, OPTION_KEYS, validationRuleKey } from './fields';
import { sideOrders } from './order';
import type { BlockDiffEntry, ContainerEntry, MergeDecisions, MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from './types';
import { mergeSections } from './sections';
import { clone } from './utils';

type Decide = (hunk: MergeHunk) => MergeSide;

function setOrDelete(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) delete target[key];
  else target[key] = clone(value);
}

/**
 * Rules of a block after its rule hunks: one side's list when every hunk agrees,
 * otherwise the current list with each incoming decision applied to it.
 */
function mergeRules<T>(
  current: T[] | undefined,
  incoming: T[] | undefined,
  hunks: MergeHunk[],
  decide: Decide,
  keyOf: (rule: T) => string
): T[] | undefined {
  if (hunks.length === 0) return current;
  const sides = new Set(hunks.map(decide));
  if (sides.size === 1) return sides.has('incoming') ? clone(incoming) : current;
  const result = keyRules(current, keyOf);
  const incomingKeyed = keyRules(incoming, keyOf);
  for (const hunk of hunks) {
    if (decide(hunk) !== 'incoming') continue;
    const ruleKey = hunk.meta?.ruleKey;
    if (!ruleKey) continue;
    const index = result.findIndex((item) => item.key === ruleKey);
    if (hunk.meta?.change === 'removed') {
      if (index >= 0) result.splice(index, 1);
      continue;
    }
    const incomingItem = incomingKeyed.find((item) => item.key === ruleKey);
    if (!incomingItem) continue;
    const replacement = { key: ruleKey, rule: clone(incomingItem.rule) };
    if (index >= 0) {
      result[index] = replacement;
      continue;
    }
    const incomingIndex = incomingKeyed.indexOf(incomingItem);
    let placed = false;
    for (let cursor = incomingIndex - 1; cursor >= 0; cursor -= 1) {
      const at = result.findIndex((item) => item.key === incomingKeyed[cursor].key);
      if (at >= 0) {
        result.splice(at + 1, 0, replacement);
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (incomingIndex <= 0) result.unshift(replacement);
      else result.push(replacement);
    }
  }
  return result.map((item) => item.rule);
}

/** A matched block with its field hunks applied; pages come back without their items. */
function mergeBlock(entry: BlockDiffEntry, decide: Decide): BlockData {
  const current = entry.current!;
  const incoming = entry.incoming!;
  const merged: BlockData = clone(current);
  if (entry.isPage) delete merged.items;
  const navHunks: MergeHunk[] = [];
  const validationHunks: MergeHunk[] = [];
  for (const hunk of entry.hunks) {
    const meta = hunk.meta;
    if (!meta) continue;
    if (meta.kind === 'navRule') {
      navHunks.push(hunk);
      continue;
    }
    if (meta.kind === 'validationRule') {
      validationHunks.push(hunk);
      continue;
    }
    if (decide(hunk) !== 'incoming') continue;
    if (meta.kind === 'key' && meta.key) {
      setOrDelete(merged, meta.key, incoming[meta.key]);
    } else if (meta.kind === 'options') {
      for (const key of OPTION_KEYS) {
        if (entry.isPage && key === 'items') continue;
        setOrDelete(merged, key, incoming[key]);
      }
    } else if (meta.kind === 'next') {
      for (const key of NEXT_KEYS) setOrDelete(merged, key, incoming[key]);
    }
  }
  if (navHunks.length) {
    setOrDelete(
      merged,
      'navigationRules',
      mergeRules<NavigationRule>(current.navigationRules, incoming.navigationRules, navHunks, decide, navRuleKey)
    );
  }
  if (validationHunks.length) {
    setOrDelete(
      merged,
      'validationRules',
      mergeRules<ValidationRule>(current.validationRules, incoming.validationRules, validationHunks, decide, validationRuleKey)
    );
  }
  return merged;
}

/** The survey that results from the diff and the decisions taken on its hunks. */
export function applyMergeDecisions(diff: SurveyDiff, decisions: MergeDecisions = {}): SurveySnapshot {
  const decide: Decide = (hunk) => resolveDecision(hunk, decisions);
  const sectionMerge = mergeSections(diff, decide);
  const entries = diff.blocks;
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const hunkById = new Map(diff.hunks.map((hunk) => [hunk.id, hunk]));

  const sectionPathExists = (containerKey: string): boolean => {
    let cursor: string | undefined = containerKey;
    const seen = new Set<string>();
    while (cursor && cursor !== ROOT_KEY && !seen.has(cursor)) {
      seen.add(cursor);
      const container: ContainerEntry | undefined = diff.containers[cursor];
      if (container?.kind === 'section' && !sectionMerge.sections.has(cursor)) return false;
      cursor = container?.parentKey;
    }
    return true;
  };

  const presentKeys: string[] = [];
  const mergedBlocks = new Map<string, BlockData>();
  for (const entry of entries) {
    if (entry.status === 'added') {
      const hunk = hunkById.get(`${entry.key}:add`);
      if (hunk && decide(hunk) === 'incoming' && sectionPathExists(entry.containerKey)) {
        const block = clone(entry.incoming!);
        if (entry.isPage) delete block.items;
        mergedBlocks.set(entry.key, block);
        presentKeys.push(entry.key);
      }
      continue;
    }
    if (entry.status === 'removed') {
      const hunk = hunkById.get(`${entry.key}:remove`);
      if (!hunk || decide(hunk) === 'current') {
        const block = clone(entry.current!);
        if (entry.isPage) delete block.items;
        mergedBlocks.set(entry.key, block);
        presentKeys.push(entry.key);
      }
      continue;
    }
    mergedBlocks.set(entry.key, mergeBlock(entry, decide));
    presentKeys.push(entry.key);
  }
  const present = new Set(presentKeys);
  const currentSections = new Set(sectionMerge.sections.keys());

  // Where a block ends up: its chosen container, or the nearest one above it that still exists
  const resolveContainer = (key: string): string => {
    let cursor = key;
    const seen = new Set<string>();
    while (cursor !== ROOT_KEY && !seen.has(cursor)) {
      seen.add(cursor);
      const info = diff.containers[cursor];
      if (!info) return ROOT_KEY;
      if (info.kind === 'page' && present.has(cursor)) return cursor;
      if (info.kind === 'section' && currentSections.has(cursor)) return cursor;
      cursor = info.parentKey ?? ROOT_KEY;
    }
    return ROOT_KEY;
  };
  const containerOf = new Map<string, string>();
  for (const key of presentKeys) {
    const entry = byKey.get(key)!;
    let target = entry.containerKey;
    const placement = hunkById.get(`${key}:placement`);
    if (placement && decide(placement) === 'incoming' && entry.incomingContainerKey && sectionPathExists(entry.incomingContainerKey))
      target = entry.incomingContainerKey;
    containerOf.set(key, resolveContainer(target));
  }

  const { currentOrder, incomingOrder } = sideOrders(entries);
  const members = new Map<string, string[]>();
  for (const key of presentKeys) {
    const containerKey = containerOf.get(key)!;
    const group = members.get(containerKey) ?? [];
    group.push(key);
    members.set(containerKey, group);
  }

  const orderFor = (containerKey: string): string[] => {
    const group = members.get(containerKey) ?? [];
    if (group.length === 0) return [];
    const orderHunk = hunkById.get(`${containerKey}:order`);
    const useIncoming = orderHunk ? decide(orderHunk) === 'incoming' : false;
    const reference = (useIncoming ? incomingOrder : currentOrder).get(containerKey) ?? [];
    const result = reference.filter((key) => group.includes(key));
    for (const key of group) {
      if (result.includes(key)) continue;
      const entry = byKey.get(key)!;
      const fromCurrent = !!entry.current && entry.containerKey === containerKey && !useIncoming;
      const fromIncoming = !!entry.incoming && entry.incomingContainerKey === containerKey;
      const side: 'current' | 'incoming' = fromCurrent ? 'current' : fromIncoming ? 'incoming' : entry.current ? 'current' : 'incoming';
      const nativeContainer = side === 'current' ? entry.containerKey : (entry.incomingContainerKey ?? entry.containerKey);
      const nativeOrder = (side === 'current' ? currentOrder : incomingOrder).get(nativeContainer) ?? [];
      const nativeIndex = nativeOrder.indexOf(key);
      let placed = false;
      for (let cursor = nativeIndex - 1; cursor >= 0; cursor -= 1) {
        const at = result.indexOf(nativeOrder[cursor]);
        if (at >= 0) {
          result.splice(at + 1, 0, key);
          placed = true;
          break;
        }
      }
      if (!placed) {
        if (nativeIndex <= 0) result.unshift(key);
        else result.push(key);
      }
    }
    return result;
  };

  const buildItems = (containerKey: string): BlockData[] =>
    orderFor(containerKey).map((key) => {
      const block = mergedBlocks.get(key)!;
      return byKey.get(key)!.isPage ? { ...block, items: buildItems(key) } : block;
    });

  const rootNode = sectionMerge.rebuild(clone(diff.current.rootNode), buildItems);
  const result: SurveySnapshot = { ...clone(diff.current), rootNode };

  for (const hunk of diff.hunks) {
    if (hunk.kind !== 'survey-field' || decide(hunk) !== 'incoming') continue;
    const key = hunk.meta?.key ?? hunk.path;
    if (!key) continue;
    if (key.startsWith('$.')) setOrDelete(result, key.slice(2), diff.incoming[key.slice(2)]);
    else setOrDelete(rootNode as Record<string, unknown>, key, diff.incoming.rootNode?.[key]);
  }

  const localizations = clone(diff.current.localizations ?? {});
  for (const hunk of diff.hunks) {
    if (hunk.kind !== 'localization' || decide(hunk) !== 'incoming' || !hunk.path) continue;
    const language = hunk.path;
    const map = diff.incoming.localizations?.[language];
    if (map === undefined) delete localizations[language];
    else localizations[language] = clone(map);
  }
  if (Object.keys(localizations).length || diff.current.localizations) result.localizations = localizations;

  const themeHunk = hunkById.get('theme');
  if (themeHunk && decide(themeHunk) === 'incoming') setOrDelete(result, 'theme', diff.incoming.theme);

  return result;
}
