import type { BlockData, BlockDefinition, NodeData, ValidationRule } from '../types';
import { getObjectOutputSchema } from './outputSchema';
import { getSurveyPages } from './surveyUtils';

/**
 * Utility functions for blocks that save output keys under their own field names
 * (`BlockData.outputFields`)
 */

/** One output key of a block, saved under its own field name */
export interface MappedField {
  /** The output schema key */
  key: string;
  fieldName: string;
  question?: string;
}

/** A block found by one of its field names */
export interface BlockFieldMatch {
  block: BlockData;
  /** The output key when the name is a mapped field; undefined for the block's own field */
  outputKey?: string;
}

/**
 * Get the output keys a block saves under their own field names, in mapping order.
 * Leaves out empty names, the block's own field name, and repeats of an earlier key's name.
 * A block without a field name saves no answer, so it has none.
 */
export function getMappedFields(block?: BlockData | null): MappedField[] {
  const outputFields = block?.outputFields;
  if (!block?.fieldName || !outputFields || typeof outputFields !== 'object') return [];

  const seen = new Set<string>(block.fieldName ? [block.fieldName] : []);
  const mapped: MappedField[] = [];
  for (const [key, mapping] of Object.entries(outputFields)) {
    const fieldName = typeof mapping?.fieldName === 'string' ? mapping.fieldName.trim() : '';
    if (!fieldName || seen.has(fieldName)) continue;
    seen.add(fieldName);
    mapped.push({ key, fieldName, question: mapping.question?.trim() || undefined });
  }
  return mapped;
}

/**
 * Get every field name a block saves: its own first, then its mapped keys
 */
export function getBlockFieldNames(block?: BlockData | null): string[] {
  if (!block) return [];
  const names = block.fieldName ? [block.fieldName] : [];
  for (const { fieldName } of getMappedFields(block)) names.push(fieldName);
  return names;
}

/** Save mapped answer metadata alongside the form for server-side rule editors. */
export function withMappedFieldMetadata(
  node: NodeData | null,
  definitions: Record<string, BlockDefinition>
): NodeData | null {
  if (!node) return node;
  const result = { ...node };
  const block = node as BlockData;
  const definition = definitions[block.type];
  // A locked block keeps its saved answer contract even if its definition changes.
  if (definition && block.outputFields && !block.locked) {
    const properties = getObjectOutputSchema(definition, block)?.properties ?? {};
    result.outputFields = Object.fromEntries(Object.entries(block.outputFields).map(([key, mapping]) => {
      const property = properties[key];
      const { type: _type, options: _options, excludeFromRules: _excluded, ...identity } = mapping;
      return [key, {
        ...identity,
        question: mapping.question?.trim() || getDefaultFieldQuestion(block, key, definition),
        ...(property ? {
          type: property.type,
          ...(property.options?.length ? { options: property.options.map(option => ({ ...option })) } : {}),
          ...(property.excludeFromRules ? { excludeFromRules: true } : {}),
        } : {}),
      }];
    }));
  }
  for (const key of ['items', 'nodes', 'children', 'pages', 'blocks', 'elements', 'panels']) {
    if (Array.isArray(node[key])) {
      result[key] = node[key].map(child => child && typeof child === 'object'
        ? withMappedFieldMetadata(child, definitions) : child);
    }
  }
  return result;
}

/**
 * Get the values a block's answer saves under its mapped field names.
 * A missing or non-object answer gives undefined for each, so clearing the block clears its keys.
 */
export function expandBlockValue(block: BlockData | null | undefined, value: unknown): Record<string, unknown> {
  const answer =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  const expanded: Record<string, unknown> = {};
  for (const { key, fieldName } of getMappedFields(block)) {
    expanded[fieldName] = answer?.[key];
  }
  return expanded;
}

/**
 * Fill in the mapped field names of each block whose answer is in `values`, from that answer.
 * Saved or prefilled answers arrive without their mapped keys.
 */
export function expandSavedValues(
  blocks: BlockData[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const expanded = { ...values };
  for (const block of blocks) {
    if (!block?.fieldName || !(block.fieldName in values)) continue;
    Object.assign(expanded, expandBlockValue(block, values[block.fieldName]));
  }
  return expanded;
}

/**
 * Find the block that saves a field name. A block's own field name wins over another
 * block's mapped key with the same name.
 */
export function findBlockForField(
  blocks: BlockData[] | null | undefined,
  name: string
): BlockFieldMatch | null {
  if (!blocks || !name) return null;

  const own = blocks.find((block) => block?.fieldName === name);
  if (own) return { block: own };

  for (const block of blocks) {
    const mapped = getMappedFields(block).find((field) => field.fieldName === name);
    if (mapped) return { block, outputKey: mapped.key };
  }
  return null;
}

/**
 * Get the question a field name answers. The block's own field uses the block's label;
 * a mapped key uses its question, else the output property's description, else the
 * block's label and the key.
 */
export function getFieldQuestion(
  block: BlockData,
  name: string,
  blockDefinition?: BlockDefinition
): string {
  const mapped = getMappedFields(block).find((field) => field.fieldName === name);
  if (!mapped) return block.label || block.name || '';
  return mapped.question || getDefaultFieldQuestion(block, mapped.key, blockDefinition);
}

/**
 * Get the question a field name answers anywhere in a form, from the field name alone.
 * Takes the form's data (`{ rootNode }`), its root node, or its blocks. Pass the block
 * definitions (custom ones included) so a mapped key without its own question can use
 * its output property's description.
 * @returns The question, or undefined when no block in the form saves the name
 */
export function resolveFieldQuestion(
  form: { rootNode: NodeData } | NodeData | BlockData[] | null | undefined,
  fieldName: string,
  blockDefinitions?: Record<string, BlockDefinition>
): string | undefined {
  if (!form) return undefined;
  const blocks = Array.isArray(form)
    ? form
    : getSurveyPages('rootNode' in form && form.rootNode ? form.rootNode : (form as NodeData)).flat();
  const match = findBlockForField(blocks, fieldName);
  if (!match) return undefined;
  return getFieldQuestion(match.block, fieldName, blockDefinitions?.[match.block.type]);
}

/**
 * Get the question an output key answers when its mapping sets none: the output property's
 * description, else the block's label and the key
 */
export function getDefaultFieldQuestion(
  block: BlockData,
  key: string,
  blockDefinition?: BlockDefinition
): string {
  const description = blockDefinition
    ? getObjectOutputSchema(blockDefinition, block)?.properties[key]?.description
    : undefined;
  if (description) return description;

  const blockQuestion = block.label || block.name || '';
  return blockQuestion ? `${blockQuestion} (${key})` : key;
}

/**
 * Get the block's validation rules that report under a field name. A rule whose `field`
 * is one of the block's mapped names reports under that name; every other rule reports
 * under the block's own field, as before.
 */
export function getFieldValidationRules(block: BlockData, name: string): ValidationRule[] {
  const rules: ValidationRule[] = Array.isArray(block.validationRules) ? block.validationRules : [];
  const mappedNames = new Set(getMappedFields(block).map((field) => field.fieldName));
  if (mappedNames.has(name)) return rules.filter((rule) => rule.field === name);
  if (name !== block.fieldName) return [];
  return rules.filter((rule) => !rule.field || !mappedNames.has(rule.field));
}

/**
 * Get the errors of a block's mapped field names, keyed by output key.
 * @returns The errors, or undefined when no mapped key has one
 */
export function getBlockFieldErrors(
  block: BlockData | null | undefined,
  errors: Record<string, string | undefined> | null | undefined
): Record<string, string> | undefined {
  if (!errors) return undefined;
  let fieldErrors: Record<string, string> | undefined;
  for (const { key, fieldName } of getMappedFields(block)) {
    const error = errors[fieldName];
    if (error) {
      if (!fieldErrors) fieldErrors = {};
      fieldErrors[key] = error;
    }
  }
  return fieldErrors;
}
