import type { BlockData, NavigationRule, ValidationRule } from '../types';
import { getBlockFieldNames } from '../utils/blockFields';
import { findDuplicateFieldNames } from '../utils/duplicateFieldNames';
import { collectSurvey } from './collect';
import { blockTitle, type Definitions } from './describe';
import type { MergeIssue, SurveySnapshot } from './types';
import { isEqual } from './utils';

/** What a provider lock fixes on a block, whatever its definition's lockAccess says. */
export const LOCKED_IDENTITY_KEYS = ['type', 'fieldName', 'outputFields', 'abTest', 'locked'];

const isExit = (target: unknown) => !target || target === 'submit' || target === 'end';

/**
 * Problems in a merged survey: errors that must be fixed before it is saved, and
 * warnings about rules that now point at blocks or fields the form no longer has.
 */
export function validateMergedSurvey(
  merged: SurveySnapshot,
  options: { incoming?: SurveySnapshot; definitions?: Definitions } = {}
): MergeIssue[] {
  const issues: MergeIssue[] = [];
  const definitions = options.definitions ?? {};
  if (!merged?.rootNode || typeof merged.rootNode !== 'object') {
    issues.push({ level: 'error', code: 'no-root', message: 'The merged form has no root node.' });
    return issues;
  }
  const collected = collectSurvey(merged.rootNode);
  const blocks = collected.blocks.filter((location) => !location.isPage);
  if (blocks.length === 0) issues.push({ level: 'error', code: 'empty', message: 'The merged form has no blocks.' });

  for (const duplicate of findDuplicateFieldNames(merged.rootNode)) {
    issues.push({
      level: 'error',
      code: 'duplicate-field',
      message: `Field name "${duplicate.fieldName}" is saved by ${duplicate.uses.length} blocks.`,
      blockKey: duplicate.uses[0]?.block.uuid,
    });
  }

  const targets = new Set<string>();
  const fieldNames = new Set<string>();
  for (const location of collected.blocks) {
    if (location.block.uuid) targets.add(location.block.uuid);
    for (const name of getBlockFieldNames(location.block)) {
      targets.add(name);
      if (!location.isPage) fieldNames.add(name);
    }
  }

  for (const location of collected.blocks) {
    const block: BlockData = location.block;
    const title = blockTitle(block, definitions);
    const rules: NavigationRule[] = Array.isArray(block.navigationRules) ? block.navigationRules : [];
    for (const rule of rules) {
      if (!isExit(rule?.target) && !targets.has(String(rule.target))) {
        issues.push({ level: 'warning', code: 'dangling-target', message: `"${title}" has a path to a block that is no longer in the form.`, blockKey: location.key });
      }
    }
    if (typeof block.nextBlockId === 'string' && !isExit(block.nextBlockId) && !targets.has(block.nextBlockId)) {
      issues.push({ level: 'warning', code: 'dangling-next', message: `"${title}" continues to a block that is no longer in the form.`, blockKey: location.key });
    }
    const validationRules: ValidationRule[] = Array.isArray(block.validationRules) ? block.validationRules : [];
    for (const rule of validationRules) {
      const references = [rule?.field, ...(Array.isArray(rule?.dependencies) ? rule.dependencies : [])].filter(
        (reference): reference is string => typeof reference === 'string' && reference.length > 0
      );
      for (const reference of references) {
        if (!fieldNames.has(reference)) {
          issues.push({ level: 'warning', code: 'dangling-validation', message: `A validation rule on "${title}" uses the field "${reference}", which is not in the form.`, blockKey: location.key });
        }
      }
    }
  }

  if (options.incoming?.rootNode) {
    const mergedByUuid = new Map(collected.blocks.filter((location) => location.block.uuid).map((location) => [location.block.uuid as string, location.block]));
    for (const location of collectSurvey(options.incoming.rootNode).blocks) {
      const block = location.block;
      if (block.locked !== true || !block.uuid) continue;
      const title = blockTitle(block, definitions);
      const counterpart = mergedByUuid.get(block.uuid);
      if (!counterpart) {
        issues.push({ level: 'error', code: 'locked-missing', message: `Provider-locked block "${title}" is missing from the merged form.`, blockKey: location.key });
        continue;
      }
      const changed = LOCKED_IDENTITY_KEYS.find((key) => !isEqual(counterpart[key], block[key]));
      if (changed) {
        issues.push({ level: 'error', code: 'locked-changed', message: `Provider-locked block "${title}" must keep its incoming ${changed}.`, blockKey: location.key });
      }
    }
  }

  return issues;
}
