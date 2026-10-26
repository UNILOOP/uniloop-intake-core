import type { BlockData, NodeData } from '../types';
import { getDefaultFieldQuestion } from './blockFields';

/** One place a field name is saved: a block's own field, or one of its mapped output keys */
export interface FieldNameUse {
  block: BlockData;
  /** The output key when the name is a mapped field; undefined for the block's own field */
  outputKey?: string;
}

/** A field name saved by more than one place in a form */
export interface DuplicateFieldName {
  fieldName: string;
  /** Every place that saves the name, in form order */
  uses: FieldNameUse[];
}

type FormInput = { rootNode: NodeData } | NodeData | BlockData[] | null | undefined;

/** Thrown by assertUniqueFieldNames when a form saves a field name in more than one place */
export class DuplicateFieldNameError extends Error {
  duplicates: DuplicateFieldName[];

  constructor(duplicates: DuplicateFieldName[]) {
    const list = duplicates
      .map(({ fieldName, uses }) => {
        const questions = uses.map((use) => `"${describeFieldNameUse(use)}"`).join(', ');
        return `"${fieldName}" (${questions})`;
      })
      .join('; ');
    super(`Field names must be unique in a form, or answers overwrite each other. Used more than once: ${list}`);
    this.name = 'DuplicateFieldNameError';
    this.duplicates = duplicates;
  }
}

/**
 * Get the question a use of a field name answers, for messages: the block's label, or its
 * output key's question. Each mapped key reads its own mapping, so two keys that share a
 * name show their own questions.
 */
export function describeFieldNameUse(use: FieldNameUse): string {
  const { block, outputKey } = use;
  if (outputKey === undefined) return block.label || block.name || block.type;
  return block.outputFields?.[outputKey]?.question?.trim() || getDefaultFieldQuestion(block, outputKey);
}

/**
 * Get every field name a form saves, with each place that saves it. Walks sets and child
 * nodes; a conditional block counts once, under its own field name or else its child's.
 * A block's mapped output keys count too, including one that repeats the block's own
 * field name or another of its keys. A/B test variants replace their block, so they
 * aren't counted.
 */
export function getFieldNameUses(form: FormInput): Map<string, FieldNameUse[]> {
  const uses = new Map<string, FieldNameUse[]>();
  const add = (fieldName: unknown, use: FieldNameUse) => {
    const name = typeof fieldName === 'string' ? fieldName.trim() : '';
    if (!name) return;
    const list = uses.get(name);
    if (list) list.push(use);
    else uses.set(name, [use]);
  };

  const visit = (item: BlockData | NodeData | string | null | undefined) => {
    if (!item || typeof item === 'string') return;

    if (item.type === 'conditional') {
      add(item.fieldName || item.childBlock?.fieldName, { block: item as BlockData });
    } else {
      add(item.fieldName, { block: item as BlockData });
    }

    const outputFields = (item as BlockData).outputFields;
    if (outputFields && typeof outputFields === 'object') {
      for (const [key, mapping] of Object.entries(outputFields)) {
        add(mapping?.fieldName, { block: item as BlockData, outputKey: key });
      }
    }

    if (Array.isArray(item.items)) item.items.forEach(visit);
    if (Array.isArray(item.nodes)) item.nodes.forEach(visit);
  };

  if (Array.isArray(form)) form.forEach(visit);
  else if (form) visit('rootNode' in form && form.rootNode ? form.rootNode : (form as NodeData));
  return uses;
}

/**
 * Find the field names a form saves in more than one place, in the order they first appear.
 * Takes the form's data (`{ rootNode }`), its root node, or its blocks.
 */
export function findDuplicateFieldNames(form: FormInput): DuplicateFieldName[] {
  const duplicates: DuplicateFieldName[] = [];
  for (const [fieldName, uses] of getFieldNameUses(form)) {
    if (uses.length > 1) duplicates.push({ fieldName, uses });
  }
  return duplicates;
}

/**
 * Throw a DuplicateFieldNameError when a form saves a field name in more than one place.
 * Call it before saving a form. Don't call it while a form is being filled: forms saved
 * before this check may already repeat a name.
 */
export function assertUniqueFieldNames(form: FormInput): void {
  const duplicates = findDuplicateFieldNames(form);
  if (duplicates.length > 0) throw new DuplicateFieldNameError(duplicates);
}
