import type { BlockData } from '../types';
import { collectSurvey, ROOT_KEY, type BlockLocation } from './collect';
import { blockTitle, keyLabel } from './describe';
import { categorizeKey, defaultFor, diffBlockFields, originOf } from './fields';
import { containerAliases, matchBlocks } from './match';
import { sideOrders } from './order';
import { diffSections } from './sections';
import { summarizeDiff } from './summary';
import type {
  BlockDiffEntry,
  ChangeOrigin,
  ContainerEntry,
  DiffOptions,
  MergeHunk,
  SurveyDiff,
  SurveySnapshot,
} from './types';
import { isEqual } from './utils';

const SURVEY_KEYS_SKIPPED = new Set(['items', 'nodes', 'uuid']);

/**
 * Order keys the way both sides agree on: the current order first, with keys only the
 * incoming side has placed after their nearest incoming neighbour that is present.
 */
export function unionOrder(currentKeys: string[], incomingKeys: string[]): string[] {
  const result = [...currentKeys];
  incomingKeys.forEach((key, index) => {
    if (result.includes(key)) return;
    let anchor: string | undefined;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (result.includes(incomingKeys[cursor])) {
        anchor = incomingKeys[cursor];
        break;
      }
    }
    if (anchor) result.splice(result.indexOf(anchor) + 1, 0, key);
    else if (index === 0) result.unshift(key);
    else result.push(key);
  });
  return result;
}

const locationsIn = (locations: BlockLocation[], isPage: boolean): BlockData[] =>
  locations.filter((location) => location.isPage === isPage).map((location) => location.block);

/**
 * Compare two surveys block by block. With a base (the version both started from) every
 * difference is attributed to one side or marked as a conflict; without one the diff is
 * two-way and every difference keeps the current side unless the user takes the incoming one.
 */
export function diffSurveys(current: SurveySnapshot, incoming: SurveySnapshot, options: DiffOptions = {}): SurveyDiff {
  const base = options.base ?? undefined;
  const definitions = options.definitions ?? {};
  const collectedCurrent = collectSurvey(current.rootNode);
  const collectedIncoming = collectSurvey(incoming.rootNode);
  const collectedBase = base ? collectSurvey(base.rootNode) : undefined;
  const matches = matchBlocks(collectedCurrent.blocks, collectedIncoming.blocks, collectedBase?.blocks);
  const incomingAlias = containerAliases(matches, 'incoming', collectedIncoming.containers, collectedCurrent.containers);
  const baseAlias = collectedBase ? containerAliases(matches, 'base', collectedBase.containers, collectedCurrent.containers) : undefined;
  const aliasIncoming = (key: string) => incomingAlias.get(key) ?? key;
  const aliasBase = (key: string) => baseAlias?.get(key) ?? key;

  const containers: Record<string, ContainerEntry> = {};
  for (const container of collectedCurrent.containers.values()) containers[container.key] = { ...container };
  for (const container of collectedIncoming.containers.values()) {
    const key = aliasIncoming(container.key);
    if (!containers[key]) {
      containers[key] = {
        key,
        kind: container.kind,
        name: container.name,
        parentKey: container.parentKey ? aliasIncoming(container.parentKey) : undefined,
      };
    }
  }

  const fieldContext = {
    definitions,
    currentBlocks: locationsIn(collectedCurrent.blocks, false),
    incomingBlocks: locationsIn(collectedIncoming.blocks, false),
    currentPages: locationsIn(collectedCurrent.blocks, true),
    incomingPages: locationsIn(collectedIncoming.blocks, true),
  };

  const entries: BlockDiffEntry[] = [];
  for (const match of matches) {
    const sample = (match.current ?? match.incoming)!;
    const isPage = sample.isPage;
    const key = match.key;
    const containerKey = match.current ? match.current.containerKey : aliasIncoming(match.incoming!.containerKey);
    const incomingContainerKey = match.incoming ? aliasIncoming(match.incoming.containerKey) : undefined;
    const entry: BlockDiffEntry = {
      key,
      currentUuid: match.current?.block.uuid,
      incomingUuid: match.incoming?.block.uuid,
      isPage,
      type: (match.incoming ?? match.current)!.block.type,
      fieldName: (match.incoming ?? match.current)!.block.fieldName,
      title: blockTitle(match.current?.block ?? match.incoming?.block, definitions),
      status: 'unchanged',
      matchedBy: match.matchedBy,
      locked: false,
      origin: 'unknown',
      containerKey,
      incomingContainerKey,
      currentIndex: match.current?.index,
      incomingIndex: match.incoming?.index,
      current: match.current?.block,
      incoming: match.incoming?.block,
      base: match.base?.block,
      hunks: [],
    };

    if (match.current && match.incoming) {
      entry.locked = match.incoming.block.locked === true;
      entry.hunks = diffBlockFields(match, key, { ...fieldContext, hasBase: !!match.base });
      if (incomingContainerKey && incomingContainerKey !== containerKey) {
        const baseContainer = match.base ? aliasBase(match.base.containerKey) : undefined;
        const origin = originOf(containerKey, incomingContainerKey, baseContainer, !!match.base);
        entry.hunks.push({
          id: `${key}:placement`,
          kind: 'placement',
          category: 'placement',
          blockKey: key,
          path: 'placement',
          label: `Moved to ${containers[incomingContainerKey]?.name ?? 'another page'}`,
          detail: `${containers[containerKey]?.name ?? 'Form'} → ${containers[incomingContainerKey]?.name ?? 'Form'}`,
          current: containerKey,
          incoming: incomingContainerKey,
          base: baseContainer,
          origin,
          conflict: origin === 'both',
          locked: false,
          defaultDecision: defaultFor(origin, false),
        });
      }
      entry.status = entry.hunks.length === 0 ? 'unchanged' : entry.hunks.every((hunk) => hunk.kind === 'placement') ? 'moved' : 'changed';
    } else if (match.incoming) {
      entry.status = 'added';
      entry.locked = match.incoming.block.locked === true;
      const origin: ChangeOrigin = !base ? 'unknown' : match.base ? 'current' : 'incoming';
      entry.origin = origin;
      entry.hunks = [
        {
          id: `${key}:add`,
          kind: isPage ? 'page-added' : 'block-added',
          category: 'block',
          blockKey: key,
          label: origin === 'current' ? (isPage ? 'Page you removed' : 'Block you removed') : isPage ? 'New page' : 'New block',
          detail: entry.title,
          incoming: match.incoming.block,
          base: match.base?.block,
          origin,
          conflict: false,
          locked: entry.locked,
          defaultDecision: defaultFor(origin, entry.locked),
        },
      ];
    } else if (match.current) {
      entry.status = 'removed';
      entry.locked = match.current.block.locked === true;
      let origin: ChangeOrigin = !base ? 'unknown' : match.base ? 'incoming' : 'current';
      const editedSinceBase = !!match.base && !isEqual(match.current.block, match.base.block);
      if (origin === 'incoming' && editedSinceBase) origin = 'both';
      entry.origin = origin;
      const locked = entry.locked && origin !== 'current' && origin !== 'both';
      entry.hunks = [
        {
          id: `${key}:remove`,
          kind: isPage ? 'page-removed' : 'block-removed',
          category: 'block',
          blockKey: key,
          label: origin === 'current' ? (isPage ? 'Page you added' : 'Block you added') : isPage ? 'Page removed upstream' : 'Block removed upstream',
          detail: entry.title,
          current: match.current.block,
          base: match.base?.block,
          origin,
          conflict: origin === 'both',
          locked,
          defaultDecision: locked ? 'incoming' : origin === 'incoming' ? 'incoming' : 'current',
        },
      ];
    }
    entries.push(entry);
  }

  const hunks: MergeHunk[] = [...entries.flatMap((entry) => entry.hunks), ...diffSections(current, incoming, base)];

  const { currentOrder, incomingOrder } = sideOrders(entries);

  for (const [containerKey, currentKeys] of currentOrder) {
    const incomingKeys = incomingOrder.get(containerKey) ?? [];
    const shared = new Set(currentKeys.filter((key) => incomingKeys.includes(key)));
    const currentSequence = currentKeys.filter((key) => shared.has(key));
    const incomingSequence = incomingKeys.filter((key) => shared.has(key));
    if (isEqual(currentSequence, incomingSequence)) continue;
    let baseSequence: string[] | undefined;
    if (collectedBase) {
      const inBase = entries
        .filter((entry) => shared.has(entry.key) && entry.base)
        .map((entry) => ({ key: entry.key, location: matches.find((match) => match.key === entry.key)?.base }))
        .filter((item) => item.location && aliasBase(item.location.containerKey) === containerKey)
        .sort((a, b) => (a.location!.index ?? 0) - (b.location!.index ?? 0))
        .map((item) => item.key);
      baseSequence = inBase;
    }
    const sameKeys = (sequence: string[]) => sequence.filter((key) => baseSequence?.includes(key));
    const origin = baseSequence
      ? originOf(sameKeys(currentSequence), sameKeys(incomingSequence), baseSequence, true)
      : 'unknown';
    hunks.push({
      id: `${containerKey}:order`,
      kind: 'order',
      category: 'order',
      blockKey: containerKey,
      path: 'order',
      label: `Block order in ${containers[containerKey]?.name ?? 'the form'}`,
      detail: 'The blocks are in a different order',
      current: currentSequence,
      incoming: incomingSequence,
      base: baseSequence,
      origin,
      conflict: origin === 'both',
      locked: false,
      defaultDecision: defaultFor(origin, false),
    });
  }

  const hasBase = !!base;
  const rootKeys = new Set([...Object.keys(current.rootNode ?? {}), ...Object.keys(incoming.rootNode ?? {})]);
  for (const key of rootKeys) {
    if (SURVEY_KEYS_SKIPPED.has(key)) continue;
    const currentValue = current.rootNode?.[key];
    const incomingValue = incoming.rootNode?.[key];
    if (isEqual(currentValue, incomingValue)) continue;
    const origin = originOf(currentValue, incomingValue, base?.rootNode?.[key], hasBase);
    hunks.push({
      id: `survey:${key}`,
      kind: 'survey-field',
      category: categorizeKey(key, incomingValue ?? currentValue) === 'text' ? 'text' : 'survey',
      path: key,
      label: `Form ${keyLabel(key).toLowerCase()}`,
      current: currentValue,
      incoming: incomingValue,
      base: base?.rootNode?.[key],
      origin,
      conflict: origin === 'both',
      locked: false,
      defaultDecision: defaultFor(origin, false),
      meta: { kind: 'key', key },
    });
  }

  // Translations: one decision per language, since keys change by the hundred together
  const languages = new Set([...Object.keys(current.localizations ?? {}), ...Object.keys(incoming.localizations ?? {})]);
  for (const language of languages) {
    const currentMap = current.localizations?.[language];
    const incomingMap = incoming.localizations?.[language];
    if (isEqual(currentMap, incomingMap)) continue;
    const baseMap = base?.localizations?.[language];
    const origin = originOf(currentMap, incomingMap, baseMap, hasBase);
    const currentKeys = Object.keys(currentMap ?? {});
    const incomingKeys = Object.keys(incomingMap ?? {});
    const added = incomingKeys.filter((key) => !(key in (currentMap ?? {}))).length;
    const removed = currentKeys.filter((key) => !(key in (incomingMap ?? {}))).length;
    const changed = incomingKeys.filter((key) => key in (currentMap ?? {}) && !isEqual(currentMap?.[key], incomingMap?.[key])).length;
    const parts = [added ? `${added} added` : '', changed ? `${changed} changed` : '', removed ? `${removed} removed` : ''].filter(Boolean);
    hunks.push({
      id: `localization:${language}`,
      kind: 'localization',
      category: 'localization',
      path: language,
      label: !currentMap ? `New language: ${language}` : !incomingMap ? `Language removed: ${language}` : `Translations: ${language}`,
      detail: parts.length ? `${parts.join(', ')} · ${incomingKeys.length} keys incoming, ${currentKeys.length} in yours` : undefined,
      current: currentMap,
      incoming: incomingMap,
      base: baseMap,
      origin,
      conflict: origin === 'both',
      locked: false,
      defaultDecision: defaultFor(origin, false),
    });
  }

  if (!isEqual(current.theme, incoming.theme)) {
    const origin = originOf(current.theme, incoming.theme, base?.theme, hasBase);
    hunks.push({
      id: 'theme',
      kind: 'theme',
      category: 'theme',
      path: 'theme',
      label: 'Theme',
      detail: `${current.theme?.name ?? 'none'} → ${incoming.theme?.name ?? 'none'}`,
      current: current.theme,
      incoming: incoming.theme,
      base: base?.theme,
      origin,
      conflict: origin === 'both',
      locked: false,
      defaultDecision: options.themeDefault === 'current' ? 'current' : defaultFor(origin, false),
    });
  }

  for (const key of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    if (key === 'rootNode' || key === 'localizations' || key === 'theme') continue;
    if (isEqual(current[key], incoming[key])) continue;
    const origin = originOf(current[key], incoming[key], base?.[key], hasBase);
    hunks.push({
      id: `survey:$.${key}`,
      kind: 'survey-field',
      category: 'survey',
      path: `$.${key}`,
      label: `Survey ${keyLabel(key).toLowerCase()}`,
      current: current[key],
      incoming: incoming[key],
      base: base?.[key],
      origin,
      conflict: origin === 'both',
      locked: false,
      defaultDecision: defaultFor(origin, false),
      meta: { kind: 'key', key: `$.${key}` },
    });
  }

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const ordered: BlockDiffEntry[] = [];
  const placed = new Set<string>();
  // Each entry shows once, in its current container; a moved block stays where it is now
  const placeContainer = (containerKey: string) => {
    const incomingKeys = (incomingOrder.get(containerKey) ?? []).filter((key) => byKey.get(key)?.containerKey === containerKey);
    const keys = unionOrder(currentOrder.get(containerKey) ?? [], incomingKeys);
    for (const key of keys) {
      const entry = byKey.get(key);
      if (!entry || placed.has(key)) continue;
      placed.add(key);
      ordered.push(entry);
      if (entry.isPage) {
        const start = ordered.length;
        placeContainer(key);
        entry.childKeys = ordered.slice(start).filter((child) => child.containerKey === key).map((child) => child.key);
      }
    }
    for (const container of Object.values(containers)) {
      if (container.kind === 'section' && container.parentKey === containerKey) placeContainer(container.key);
    }
  };
  placeContainer(ROOT_KEY);
  for (const entry of entries) {
    if (placed.has(entry.key)) continue;
    placed.add(entry.key);
    ordered.push(entry);
  }

  const diff: SurveyDiff = {
    mode: base ? 'three-way' : 'two-way',
    current,
    incoming,
    base,
    blocks: ordered,
    containers,
    hunks,
    summary: { added: 0, removed: 0, changed: 0, moved: 0, unchanged: 0, conflicts: 0, locked: 0, hunks: 0, byCategory: {} },
  };
  diff.summary = summarizeDiff(diff);
  return diff;
}
