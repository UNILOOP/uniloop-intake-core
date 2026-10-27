import type { BlockData } from '../types';
import { expandBlockValue, findBlockForField } from '../utils/blockFields';
import { hasExternalValue, isSameValue, type ExternalBinding, type ExternalSyncAdapter, type ExternalValues } from './index';

/** A binding with the block that declared it */
export interface BlockBinding {
  binding: ExternalBinding;
  block: BlockData;
}

const asObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Calls into host code without letting it break the form */
export function callAdapter<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (error) {
    console.error(`[SurveyForm] external sync ${label} failed:`, error);
    return fallback;
  }
}

/** Every binding declared by the given blocks */
export function collectBindings(blocks: BlockData[], sync: ExternalSyncAdapter | undefined): BlockBinding[] {
  if (!sync) return [];
  const result: BlockBinding[] = [];
  for (const block of blocks) {
    const bindings = callAdapter('getBindings', () => sync.getBindings(block), [] as ExternalBinding[]);
    for (const binding of bindings || []) {
      if (binding?.internalKey && binding?.externalKey) result.push({ binding, block });
    }
  }
  return result;
}

/** Reads a saved key: a flat key first, then `fieldName.<key>` inside the block's answer */
export function readInternalValue(values: Record<string, any>, key: string): any {
  if (key in values) return values[key];
  const dot = key.indexOf('.');
  if (dot === -1) return undefined;
  return asObject(values[key.slice(0, dot)])[key.slice(dot + 1)];
}

/**
 * Saves a value under an internal key, keeping the owning block's answer and its
 * mapped keys in step: a block field expands to its mapped keys, and a mapped key
 * or `fieldName.<key>` is written into the block's object answer too.
 */
export function writeInternalValue(
  values: Record<string, any>,
  key: string,
  value: any,
  blocks: BlockData[]
): Record<string, any> {
  const match = findBlockForField(blocks, key);
  if (match && !match.outputKey) {
    return { ...values, [key]: value, ...expandBlockValue(match.block, value) };
  }

  let block: BlockData | undefined = match?.block;
  let outputKey = match?.outputKey;
  if (!block) {
    const dot = key.indexOf('.');
    const parent = dot === -1 ? undefined : blocks.find(item => item?.fieldName === key.slice(0, dot));
    if (!parent) return { ...values, [key]: value };
    block = parent;
    outputKey = key.slice(dot + 1);
  }

  const fieldName = block.fieldName as string;
  const answer = { ...asObject(values[fieldName]), [outputKey as string]: value };
  const next = { ...values, [fieldName]: answer, ...expandBlockValue(block, answer) };
  // A `fieldName.<key>` that isn't a mapped key lives only inside the answer
  if (match) next[key] = value;
  return next;
}

/**
 * Applies external values to internal ones. With `changes`, only bindings on
 * changed external keys are applied; without, empty internal keys are filled.
 * Returns the same object when nothing changed.
 */
export function applyExternalToInternal(
  values: Record<string, any>,
  externalValues: ExternalValues,
  changes: ExternalValues | null,
  bindings: BlockBinding[],
  sync: ExternalSyncAdapter,
  blocks: BlockData[],
  written?: Map<string, unknown>
): Record<string, any> {
  let next = values;
  for (const { binding, block } of bindings) {
    if (binding.direction === 'toExternal') continue;
    if (!(binding.externalKey in (changes ?? externalValues))) continue;
    const raw = externalValues[binding.externalKey];
    const current = readInternalValue(next, binding.internalKey);
    if (!changes && (!hasExternalValue(raw) || hasExternalValue(current))) continue;
    const value = sync.toInternal
      ? callAdapter('toInternal', () => sync.toInternal!(raw, binding, block), raw)
      : raw;
    if (isSameValue(current, value)) continue;
    next = writeInternalValue(next, binding.internalKey, value, blocks);
    written?.set(binding.internalKey, value);
  }
  return next;
}
