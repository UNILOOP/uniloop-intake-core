import type { BlockData, NavigationRule, ValidationRule } from '../types';
import { isBlockPathLocked } from '../utils/blockLock';
import type { BlockMatch } from './match';
import type { ChangeCategory, ChangeOrigin, HunkMeta, MergeHunk, MergeSide } from './types';
import {
  describeNavRule,
  describeNext,
  describeOptions,
  describeValidationRule,
  keyLabel,
  optionsChangeText,
  type Definitions,
} from './describe';
import { isEqual, showValue, stableStringify } from './utils';

export const IDENTITY_KEYS = ['type', 'fieldName', 'outputFields'];
export const NEXT_KEYS = ['nextBlockId', 'isEndBlock', 'isEndBlockManual'];
export const OPTION_KEYS = ['options', 'labels', 'values', 'choices', 'rows', 'columns', 'items'];
export const VISIBILITY_KEYS = ['visibleIf', 'visibility', 'showIf', 'hideIf', 'conditionalLogic', 'conditions'];
export const VALIDATION_KEYS = [
  'required',
  'min',
  'max',
  'minLength',
  'maxLength',
  'pattern',
  'minValue',
  'maxValue',
  'minDate',
  'maxDate',
  'minSelections',
  'maxSelections',
  'accept',
  'maxSize',
  'allowedTypes',
  'step',
];
const TEXTY =
  /label|text|title|description|placeholder|question|help|message|caption|heading|subtitle|content|html|markdown|hint|name|prompt|button|legend|summary|note|tooltip/i;
const NOT_TEXT = new Set(['className', 'iconName', 'fieldName', 'pageLayout', 'layout', 'variant', 'inputType', 'format', 'bind', 'bindKey', 'source', 'icon']);

export function categorizeKey(key: string, sample: unknown): ChangeCategory {
  if (IDENTITY_KEYS.includes(key)) return 'identity';
  if (key === 'navigationRules' || NEXT_KEYS.includes(key)) return 'navigation';
  if (key === 'validationRules' || VALIDATION_KEYS.includes(key)) return 'validation';
  if (VISIBILITY_KEYS.includes(key)) return 'visibility';
  if (key === 'abTest') return 'abTest';
  if (key === 'locked') return 'lock';
  if (OPTION_KEYS.includes(key)) return 'options';
  if (typeof sample === 'string' && TEXTY.test(key) && !NOT_TEXT.has(key)) return 'text';
  return 'settings';
}

/** Who changed a value, given what both sides started from. */
export function originOf(current: unknown, incoming: unknown, base: unknown, hasBase: boolean): ChangeOrigin {
  if (!hasBase) return 'unknown';
  const currentChanged = !isEqual(current, base);
  const incomingChanged = !isEqual(incoming, base);
  if (currentChanged && incomingChanged) return 'both';
  if (incomingChanged) return 'incoming';
  if (currentChanged) return 'current';
  return 'unknown';
}

/** Incoming when the lock forces it or only the incoming side changed; otherwise the current side stays. */
export function defaultFor(origin: ChangeOrigin, locked: boolean): MergeSide {
  if (locked) return 'incoming';
  return origin === 'incoming' ? 'incoming' : 'current';
}

export interface FieldContext {
  definitions: Definitions;
  hasBase: boolean;
  currentBlocks: BlockData[];
  incomingBlocks: BlockData[];
  currentPages: BlockData[];
  incomingPages: BlockData[];
  forceIncoming?: ChangeCategory[];
}

export const navRuleKey = (rule: NavigationRule): string =>
  rule.isDefault || !rule.condition ? 'default' : String(rule.condition).trim();

export const validationRuleKey = (rule: ValidationRule): string =>
  rule.id || `${rule.field ?? ''}|${rule.operator}|${stableStringify(rule.value)}`;

interface RulePair<T> {
  key: string;
  current?: T;
  incoming?: T;
  base?: T;
}

/** Pair rules of both sides by identity, numbering repeats so each one pairs once. */
/** Rules with their identity key, numbering repeats so each one pairs once. */
export function keyRules<T>(list: T[] | undefined, keyOf: (rule: T) => string): Array<{ key: string; rule: T }> {
  const counts = new Map<string, number>();
  return (Array.isArray(list) ? list : []).map((rule) => {
    const base = keyOf(rule);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return { key: seen ? `${base}#${seen}` : base, rule };
  });
}

export function pairRules<T>(current: T[], incoming: T[], base: T[] | undefined, keyOf: (rule: T) => string): RulePair<T>[] {
  const currentKeyed = keyRules(current, keyOf);
  const incomingKeyed = keyRules(incoming, keyOf);
  const baseKeyed = keyRules(base ?? [], keyOf);
  const pairs: RulePair<T>[] = [];
  const seen = new Set<string>();
  for (const item of currentKeyed) {
    seen.add(item.key);
    pairs.push({
      key: item.key,
      current: item.rule,
      incoming: incomingKeyed.find((candidate) => candidate.key === item.key)?.rule,
      base: baseKeyed.find((candidate) => candidate.key === item.key)?.rule,
    });
  }
  for (const item of incomingKeyed) {
    if (seen.has(item.key)) continue;
    pairs.push({ key: item.key, incoming: item.rule, base: baseKeyed.find((candidate) => candidate.key === item.key)?.rule });
  }
  return pairs;
}

const asRules = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Field-level hunks between the two sides of a matched block or page. */
export function diffBlockFields(match: BlockMatch, entryKey: string, context: FieldContext): MergeHunk[] {
  const current = match.current!.block;
  const incoming = match.incoming!.block;
  const base = match.base?.block;
  const isPage = match.current!.isPage;
  const definition = context.definitions[incoming.type] ?? context.definitions[current.type];
  const lockedPath = (path: string) => incoming.locked === true && isBlockPathLocked(incoming, definition, path);
  const kind = isPage ? 'page-field' : 'block-field';
  const hunks: MergeHunk[] = [];

  const push = (
    partial: Pick<MergeHunk, 'id' | 'category' | 'path' | 'label' | 'detail' | 'current' | 'incoming' | 'base' | 'meta'>,
    lockPaths: string[]
  ) => {
    const origin = originOf(partial.current, partial.incoming, partial.base, context.hasBase && (base !== undefined));
    const locked = lockPaths.some(lockedPath);
    const forced = !locked && (context.forceIncoming?.includes(partial.category) ?? false);
    hunks.push({
      kind,
      blockKey: entryKey,
      origin,
      conflict: origin === 'both' && !forced,
      locked,
      forced,
      defaultDecision: forced ? 'current' : defaultFor(origin, locked),
      ...partial,
    });
  };

  const keys = new Set<string>([...Object.keys(current), ...Object.keys(incoming), ...(base ? Object.keys(base) : [])]);
  keys.delete('uuid');
  if (isPage) keys.delete('items');

  const optionKeys = OPTION_KEYS.filter((key) => keys.has(key) && !(isPage && key === 'items'));
  if (optionKeys.some((key) => !isEqual(current[key], incoming[key]))) {
    const pick = (block: BlockData | undefined) =>
      block ? Object.fromEntries(optionKeys.map((key) => [key, block[key]])) : undefined;
    push(
      {
        id: `${entryKey}:options`,
        category: 'options',
        path: 'options',
        label: 'Options',
        detail: optionsChangeText(describeOptions(current, incoming)),
        current: pick(current),
        incoming: pick(incoming),
        base: pick(base),
        meta: { kind: 'options' },
      },
      optionKeys
    );
  }
  for (const key of optionKeys) keys.delete(key);

  if (NEXT_KEYS.some((key) => keys.has(key))) {
    const pick = (block: BlockData | undefined) =>
      block ? Object.fromEntries(NEXT_KEYS.filter((key) => block[key] !== undefined).map((key) => [key, block[key]])) : undefined;
    if (!isEqual(pick(current), pick(incoming))) {
      push(
        {
          id: `${entryKey}:next`,
          category: 'navigation',
          path: 'next',
          label: 'Next step',
          detail: `${describeNext(current, context.currentBlocks, context.currentPages, context.definitions)} → ${describeNext(incoming, context.incomingBlocks, context.incomingPages, context.definitions)}`,
          current: pick(current),
          incoming: pick(incoming),
          base: pick(base),
          meta: {
            kind: 'next',
            currentText: describeNext(current, context.currentBlocks, context.currentPages, context.definitions),
            incomingText: describeNext(incoming, context.incomingBlocks, context.incomingPages, context.definitions),
          },
        },
        NEXT_KEYS
      );
    }
    for (const key of NEXT_KEYS) keys.delete(key);
  }

  if (keys.has('navigationRules')) {
    const pairs = pairRules(
      asRules<NavigationRule>(current.navigationRules),
      asRules<NavigationRule>(incoming.navigationRules),
      base ? asRules<NavigationRule>(base.navigationRules) : undefined,
      navRuleKey
    );
    for (const pair of pairs) {
      if (pair.current && pair.incoming && isEqual(pair.current, pair.incoming)) continue;
      const change: HunkMeta['change'] = pair.current && pair.incoming ? 'changed' : pair.incoming ? 'added' : 'removed';
      const currentText = pair.current ? describeNavRule(pair.current, context.currentBlocks, context.currentPages, context.definitions) : '';
      const incomingText = pair.incoming ? describeNavRule(pair.incoming, context.incomingBlocks, context.incomingPages, context.definitions) : '';
      push(
        {
          id: `${entryKey}:nav:${pair.key}`,
          category: 'navigation',
          path: 'navigationRules',
          label: change === 'added' ? 'New path' : change === 'removed' ? 'Path removed' : 'Path changed',
          detail: change === 'changed' ? `${currentText} → now ${incomingText}` : change === 'added' ? incomingText : currentText,
          current: pair.current,
          incoming: pair.incoming,
          base: pair.base,
          meta: { kind: 'navRule', ruleKey: pair.key, change, currentRule: pair.current, incomingRule: pair.incoming, currentText: currentText || undefined, incomingText: incomingText || undefined },
        },
        ['navigationRules']
      );
    }
    keys.delete('navigationRules');
  }

  if (keys.has('validationRules')) {
    const pairs = pairRules(
      asRules<ValidationRule>(current.validationRules),
      asRules<ValidationRule>(incoming.validationRules),
      base ? asRules<ValidationRule>(base.validationRules) : undefined,
      validationRuleKey
    );
    for (const pair of pairs) {
      if (pair.current && pair.incoming && isEqual(pair.current, pair.incoming)) continue;
      const change: HunkMeta['change'] = pair.current && pair.incoming ? 'changed' : pair.incoming ? 'added' : 'removed';
      const text = describeValidationRule((pair.incoming ?? pair.current)!);
      push(
        {
          id: `${entryKey}:validation:${pair.key}`,
          category: 'validation',
          path: 'validationRules',
          label: change === 'added' ? 'New validation rule' : change === 'removed' ? 'Validation rule removed' : 'Validation rule changed',
          detail: text,
          current: pair.current,
          incoming: pair.incoming,
          base: pair.base,
          meta: {
            kind: 'validationRule',
            ruleKey: pair.key,
            change,
            currentRule: pair.current,
            incomingRule: pair.incoming,
            currentText: pair.current ? describeValidationRule(pair.current) : undefined,
            incomingText: pair.incoming ? describeValidationRule(pair.incoming) : undefined,
          },
        },
        ['validationRules']
      );
    }
    keys.delete('validationRules');
  }

  for (const key of keys) {
    if (isEqual(current[key], incoming[key])) continue;
    const category = categorizeKey(key, incoming[key] ?? current[key]);
    push(
      {
        id: `${entryKey}:key:${key}`,
        category,
        path: key,
        label: keyLabel(key),
        detail: category === 'text' ? undefined : `${showValue(current[key])} → ${showValue(incoming[key])}`,
        current: current[key],
        incoming: incoming[key],
        base: base ? base[key] : undefined,
        meta: { kind: 'key', key },
      },
      [key]
    );
  }

  return hunks;
}
