import type { BlockData, BlockDefinition, NavigationRule, ValidationRule } from '../types';
import { OPERATORS, standardRuleToEnhanced } from '../builder/common/navigation-rules-types';
import { getHumanReadableCondition } from '../builder/flowv3/utils/conditionLabel';
import { findBlockForField } from '../utils/blockFields';
import { pageName } from './collect';
import { isEqual, isPlainObject, showValue, stripHtml, truncate } from './utils';

export type Definitions = Record<string, BlockDefinition>;

/** A short name for a block: its question text, then its field name, then its type. */
export function blockTitle(block: BlockData | null | undefined, definitions: Definitions = {}): string {
  if (!block) return 'Block';
  if (block.type === 'set') return pageName(block);
  for (const candidate of [block.label, block.name, block.title, block.question, block.text, block.html, block.markdown]) {
    if (typeof candidate === 'string') {
      const text = stripHtml(candidate);
      if (text) return truncate(text, 80);
    }
  }
  if (typeof block.fieldName === 'string' && block.fieldName) return block.fieldName;
  return definitions[block.type]?.name || block.type;
}

export interface OptionItem {
  value: string;
  label: string;
}

/** The selectable options of a block, whether it stores `options` objects or parallel `labels`/`values`. */
export function optionList(block: BlockData | null | undefined): OptionItem[] {
  if (!block) return [];
  const objects = Array.isArray(block.options) ? block.options : Array.isArray(block.choices) ? block.choices : null;
  if (objects) {
    return objects.map((option: unknown, index: number) => {
      if (isPlainObject(option)) {
        const value = option.value ?? option.id ?? index;
        const label = option.label ?? option.text ?? option.name ?? option.value ?? '';
        return { value: String(value), label: stripHtml(String(label)) };
      }
      return { value: String(option), label: String(option) };
    });
  }
  if (Array.isArray(block.labels) || Array.isArray(block.values)) {
    const labels = Array.isArray(block.labels) ? block.labels : [];
    const values = Array.isArray(block.values) ? block.values : [];
    const length = Math.max(labels.length, values.length);
    return Array.from({ length }, (_, index) => ({
      value: String(values[index] ?? labels[index] ?? index),
      label: String(labels[index] ?? values[index] ?? ''),
    }));
  }
  return [];
}

export interface OptionsChange {
  added: OptionItem[];
  removed: OptionItem[];
  renamed: Array<{ value: string; from: string; to: string }>;
  reordered: boolean;
}

/** What changed between two option lists, matching options by value. */
export function describeOptions(current: BlockData | null | undefined, incoming: BlockData | null | undefined): OptionsChange {
  const before = optionList(current);
  const after = optionList(incoming);
  const beforeByValue = new Map(before.map((option) => [option.value, option]));
  const afterByValue = new Map(after.map((option) => [option.value, option]));
  const added = after.filter((option) => !beforeByValue.has(option.value));
  const removed = before.filter((option) => !afterByValue.has(option.value));
  const renamed = after
    .filter((option) => beforeByValue.has(option.value) && beforeByValue.get(option.value)!.label !== option.label)
    .map((option) => ({ value: option.value, from: beforeByValue.get(option.value)!.label, to: option.label }));
  const kept = before.filter((option) => afterByValue.has(option.value)).map((option) => option.value);
  const keptAfter = after.filter((option) => beforeByValue.has(option.value)).map((option) => option.value);
  return { added, removed, renamed, reordered: !isEqual(kept, keptAfter) };
}

export function optionsChangeText(change: OptionsChange): string {
  const parts: string[] = [];
  if (change.added.length) parts.push(`Added: ${change.added.map((option) => option.label || option.value).join(', ')}`);
  if (change.removed.length) parts.push(`Removed: ${change.removed.map((option) => option.label || option.value).join(', ')}`);
  if (change.renamed.length) parts.push(`Renamed: ${change.renamed.map((item) => `${item.from} → ${item.to}`).join(', ')}`);
  if (change.reordered) parts.push('Reordered');
  return parts.join(' · ') || 'Option settings changed';
}

export function targetTitle(target: string | undefined, blocks: BlockData[], pages: BlockData[], definitions: Definitions = {}): string {
  if (!target || target === 'submit' || target === 'end') return 'Submit';
  const block = blocks.find((candidate) => candidate.uuid === target) ?? blocks.find((candidate) => candidate.fieldName === target);
  if (block) return blockTitle(block, definitions);
  const page = pages.find((candidate) => candidate.uuid === target);
  if (page) return pageName(page);
  return target;
}

/**
 * A condition as a person would say it: the question's text instead of its field
 * name, the operator in words, and option labels for values. Falls back to the
 * library's rendering, then to the raw condition.
 */
export function describeCondition(condition: string, blocks: BlockData[], definitions: Definitions = {}): string {
  if (!condition) return '';
  try {
    const enhanced = standardRuleToEnhanced(condition);
    if (!enhanced.field) return getHumanReadableCondition(condition, blocks, definitions);
    const match = findBlockForField(blocks, enhanced.field);
    const question = match ? truncate(blockTitle(match.block, definitions), 40) : enhanced.field;
    const operator = OPERATORS.find((candidate) => candidate.value === enhanced.operator)?.label ?? enhanced.operator ?? '';
    let value = enhanced.value;
    if (match && value !== undefined && value !== null && value !== '') {
      const option = optionList(match.block).find((candidate) => candidate.value === String(value));
      if (option?.label) value = option.label;
    }
    const valueText = value === undefined || value === null || value === '' ? '' : ` ${String(value)}`;
    return `${question}: ${operator}${valueText}`.trim();
  } catch {
    return getHumanReadableCondition(condition, blocks, definitions);
  }
}

export function describeNavRule(rule: NavigationRule, blocks: BlockData[], pages: BlockData[], definitions: Definitions = {}): string {
  const when = rule.isDefault || !rule.condition ? 'Otherwise' : `When ${describeCondition(rule.condition, blocks, definitions)}`;
  return `${when} → ${targetTitle(rule.target, blocks, pages, definitions)}`;
}

export function describeNext(block: BlockData | null | undefined, blocks: BlockData[], pages: BlockData[], definitions: Definitions = {}): string {
  if (!block) return '—';
  if (block.isEndBlock) return 'Submit';
  if (block.nextBlockId) return targetTitle(block.nextBlockId, blocks, pages, definitions);
  return 'Next block';
}

export function describeValidationRule(rule: ValidationRule): string {
  const subject = rule.field ? `${rule.field} ` : '';
  const value = rule.value !== undefined ? ` ${showValue(rule.value)}` : '';
  return `${subject}${rule.operator}${value}: ${rule.message ?? ''}`.trim();
}

/** A camelCase key as words: showContinueButton → Show continue button */
export function keyLabel(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
