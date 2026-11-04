import type { BlockLocation } from './collect';
import { ROOT_KEY, pageName } from './collect';

export interface BlockMatch {
  key: string;
  current?: BlockLocation;
  incoming?: BlockLocation;
  base?: BlockLocation;
  matchedBy?: 'uuid' | 'fieldName' | 'name';
}

const byUuid = (list: BlockLocation[]): Map<string, BlockLocation> => {
  const map = new Map<string, BlockLocation>();
  for (const location of list) {
    const uuid = location.block.uuid;
    if (uuid && !map.has(uuid)) map.set(uuid, location);
  }
  return map;
};

const byFieldName = (list: BlockLocation[]): Map<string, BlockLocation> => {
  const map = new Map<string, BlockLocation>();
  for (const location of list) {
    const fieldName = location.block.fieldName;
    if (!location.isPage && fieldName && !map.has(fieldName)) map.set(fieldName, location);
  }
  return map;
};

const byPageName = (list: BlockLocation[]): Map<string, BlockLocation> => {
  const map = new Map<string, BlockLocation>();
  for (const location of list) {
    if (!location.isPage) continue;
    const name = pageName(location.block);
    if (!map.has(name)) map.set(name, location);
  }
  return map;
};

/**
 * Pair the blocks of two surveys: by uuid first, then by field name for blocks and by
 * name for pages. Whatever stays unpaired is an addition or a removal. The base, when
 * given, is looked up the same way for each pair.
 */
export function matchBlocks(
  current: BlockLocation[],
  incoming: BlockLocation[],
  base?: BlockLocation[] | null
): BlockMatch[] {
  const matches: BlockMatch[] = [];
  const usedCurrent = new Set<BlockLocation>();
  const usedIncoming = new Set<BlockLocation>();
  const currentByUuid = byUuid(current);
  const currentByField = byFieldName(current);
  const currentByName = byPageName(current);

  for (const location of incoming) {
    const uuid = location.block.uuid;
    const candidate = uuid ? currentByUuid.get(uuid) : undefined;
    if (candidate && !usedCurrent.has(candidate) && candidate.isPage === location.isPage) {
      usedCurrent.add(candidate);
      usedIncoming.add(location);
      matches.push({ key: candidate.key, current: candidate, incoming: location, matchedBy: 'uuid' });
    }
  }

  for (const location of incoming) {
    if (usedIncoming.has(location)) continue;
    const candidate = location.isPage
      ? currentByName.get(pageName(location.block))
      : location.block.fieldName
        ? currentByField.get(location.block.fieldName)
        : undefined;
    if (candidate && !usedCurrent.has(candidate)) {
      usedCurrent.add(candidate);
      usedIncoming.add(location);
      matches.push({
        key: candidate.key,
        current: candidate,
        incoming: location,
        matchedBy: location.isPage ? 'name' : 'fieldName',
      });
    }
  }

  for (const location of current) {
    if (!usedCurrent.has(location)) matches.push({ key: location.key, current: location });
  }
  for (const location of incoming) {
    if (!usedIncoming.has(location)) matches.push({ key: location.key, incoming: location });
  }

  if (base && base.length > 0) {
    const baseByUuid = byUuid(base);
    const baseByField = byFieldName(base);
    const baseByName = byPageName(base);
    const usedBase = new Set<BlockLocation>();
    const take = (candidate: BlockLocation | undefined, isPage: boolean): BlockLocation | undefined => {
      if (!candidate || usedBase.has(candidate) || candidate.isPage !== isPage) return undefined;
      usedBase.add(candidate);
      return candidate;
    };
    for (const match of matches) {
      const sample = match.current ?? match.incoming;
      if (!sample) continue;
      const uuids = [match.current?.block.uuid, match.incoming?.block.uuid].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      let found: BlockLocation | undefined;
      for (const uuid of uuids) {
        found = take(baseByUuid.get(uuid), sample.isPage);
        if (found) break;
      }
      if (!found) {
        found = sample.isPage
          ? take(baseByName.get(pageName(sample.block)), true)
          : take(sample.block.fieldName ? baseByField.get(sample.block.fieldName) : undefined, false);
      }
      if (found) match.base = found;
    }
  }

  return matches;
}

/**
 * Map every container key of one side to the key the diff uses for it: the current
 * side's key for a matched page, the root for the root, a section by uuid or position.
 */
export function containerAliases(
  matches: BlockMatch[],
  side: 'incoming' | 'base',
  sideContainers: Map<string, { key: string; kind: string; parentKey?: string }>,
  currentContainers: Map<string, { key: string; kind: string; parentKey?: string }>
): Map<string, string> {
  const aliases = new Map<string, string>([[ROOT_KEY, ROOT_KEY]]);
  for (const match of matches) {
    const location = match[side];
    if (location?.isPage) aliases.set(location.key, match.key);
  }
  const sectionsOf = (containers: Map<string, { key: string; kind: string; parentKey?: string }>, parent: string) =>
    [...containers.values()].filter((container) => container.kind === 'section' && container.parentKey === parent);
  const walk = (sideParent: string, currentParent: string) => {
    const sideSections = sectionsOf(sideContainers, sideParent);
    const currentSections = sectionsOf(currentContainers, currentParent);
    sideSections.forEach((section) => {
      const target = currentSections.find((candidate) => candidate.key === section.key);
      const alias = target ? target.key : section.key;
      aliases.set(section.key, alias);
      walk(section.key, alias);
    });
  };
  walk(ROOT_KEY, ROOT_KEY);
  return aliases;
}
