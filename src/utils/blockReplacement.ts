import type {
  BlockData,
  BlockDefinition,
  OutputSchema,
  OutputSchemaArray,
  OutputSchemaObject,
  OutputSchemaScalar,
} from '../types';
import { resolveUnionSchema } from './outputSchema';

/**
 * Utility functions for replacing a block with a block of another type
 */

type ResolvedOutputSchema = OutputSchemaScalar | OutputSchemaArray | OutputSchemaObject;

/**
 * Fields a replacement keeps from the block it replaces. They tie the block into
 * its form: its id, where its answer is stored, and the rules and links that read
 * or follow it.
 */
const KEPT_FIELDS: readonly string[] = [
  'uuid',
  'fieldName',
  'navigationRules',
  'validationRules',
  'visibleIf',
  'isEndBlock',
  'isEndBlockManual',
  'nextBlockId',
];

/** Question text a replacement keeps when the new block has the same field */
const KEPT_TEXT_FIELDS = ['label', 'description'] as const;

function getDefaultData(definition: BlockDefinition): BlockData {
  return definition.generateDefaultData
    ? definition.generateDefaultData()
    : { ...definition.defaultData };
}

function resolveOutput(schema: OutputSchema | undefined, blockData?: BlockData): ResolvedOutputSchema | undefined {
  if (!schema) return undefined;
  const resolved = resolveUnionSchema(schema, blockData);
  return resolved && !('oneOf' in resolved) ? resolved : undefined;
}

/**
 * Check whether answers shaped like `next` can stand in for answers shaped like `current`:
 * the same scalar type, the same array item type and format, or for objects every property
 * of `current` with the same type. An object without declared properties, whose keys
 * come from the block's configuration, only matches another such object.
 */
function outputFits(current: ResolvedOutputSchema, next: ResolvedOutputSchema): boolean {
  if (current.type === 'array' && next.type === 'array') {
    return current.items.type === next.items.type && current.items.format === next.items.format;
  }

  if (current.type === 'object' && next.type === 'object') {
    const currentProperties = Object.entries(current.properties);
    if (currentProperties.length === 0) {
      return Object.keys(next.properties).length === 0;
    }
    return currentProperties.every(([key, property]) => next.properties[key]?.type === property.type);
  }

  return current.type === next.type;
}

/**
 * Get a block type's default data, configured so its answer fits `output`
 * @param definition The new block's definition
 * @param output The resolved output schema of the block being replaced
 * @returns The configured default data, or undefined when the block can't produce that output
 */
function getFittingDefaultData(
  definition: BlockDefinition,
  output: ResolvedOutputSchema | undefined
): BlockData | undefined {
  const data = getDefaultData(definition);
  const schema = definition.outputSchema;

  // A block that declares no output only matches another that declares none
  if (!schema || !output) {
    return !schema && !output ? data : undefined;
  }

  const resolved = resolveOutput(schema, data);
  if (resolved && outputFits(output, resolved)) {
    return data;
  }

  // A union whose output follows a configuration field (e.g. multiSelect) is set to the fitting option
  if (!('oneOf' in schema) || !schema.discriminator) {
    return undefined;
  }

  const { propertyName, mapping } = schema.discriminator;
  const fitting = Object.entries(mapping).find(([, index]) => {
    const member = schema.oneOf[index];
    return member !== undefined && outputFits(output, member);
  });
  if (!fitting) {
    return undefined;
  }

  return { ...data, [propertyName]: parseMappingKey(fitting[0], data[propertyName]) };
}

/** Turn a discriminator mapping key, the configuration value as a string (see resolveUnionSchema), back into a value */
function parseMappingKey(key: string, defaultValue: unknown): unknown {
  if (key === 'true' || key === 'false') return key === 'true';
  return typeof defaultValue === 'number' ? Number(key) : key;
}

/**
 * Get the block types that can replace a block: those whose answer has the same shape,
 * so rules and anything else that reads the block's field name keep working
 * @param block The block to replace
 * @param blocks The available block definitions, keyed by type
 * @returns The block types, excluding the block's own type
 */
export function getReplacementBlockTypes(
  block: BlockData,
  blocks: Record<string, BlockDefinition>
): string[] {
  const current = blocks[block.type];
  if (!current) return [];

  const output = resolveOutput(current.outputSchema, block);
  return Object.entries(blocks)
    .filter(([type, definition]) => type !== block.type && getFittingDefaultData(definition, output) !== undefined)
    .map(([type]) => type);
}

/**
 * Replace a block with a block of another type. The replacement keeps the block's id,
 * field name, rules and links, and its label and description when the new block has
 * those fields. Everything else comes from the new block's defaults, so an A/B test,
 * whose variants are copies of the old block, is dropped.
 * @param block The block to replace
 * @param type The new block type, one of getReplacementBlockTypes(block, blocks)
 * @param blocks The available block definitions, keyed by type
 * @returns The replacement block data, or undefined when the type can't replace the block
 */
export function replaceBlock(
  block: BlockData,
  type: string,
  blocks: Record<string, BlockDefinition>
): BlockData | undefined {
  const current = blocks[block.type];
  const next = blocks[type];
  if (!current || !next || type === block.type) return undefined;

  const data = getFittingDefaultData(next, resolveOutput(current.outputSchema, block));
  if (!data) return undefined;

  const replacement: BlockData = { ...data, type };
  for (const field of KEPT_FIELDS) {
    if (block[field] !== undefined) {
      replacement[field] = block[field];
    }
  }
  for (const field of KEPT_TEXT_FIELDS) {
    if (field in data && block[field] !== undefined) {
      replacement[field] = block[field];
    }
  }

  return replacement;
}
