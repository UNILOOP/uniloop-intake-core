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

/** The step settings every layout reads whatever the block; see applyStepSettings */
const STEP_FIELDS: readonly string[] = ['autoContinueOnSelect', 'showContinueButton'];

/** Fields that belong to the old block's type, so a replacement never takes them over. An A/B test's variants are copies of the old block. */
const TYPE_FIELDS: readonly string[] = ['type', 'isCustom', 'abTest'];

/** The result of replacing a block */
export interface BlockReplacement {
  /** The replacement block's data */
  data: BlockData;
  /** Settings of the old block that the new block doesn't have, or has in another shape, so they're left out */
  droppedFields: string[];
}

type ValueKind = 'string' | 'number' | 'boolean' | 'array' | 'object';

function kindOf(value: unknown): ValueKind | undefined {
  if (Array.isArray(value)) return 'array';
  const kind = typeof value;
  return value !== null && (kind === 'string' || kind === 'number' || kind === 'boolean' || kind === 'object')
    ? kind
    : undefined;
}

/**
 * Check whether a value can stand in for a value shaped like `sample`, the new block's default:
 * the same kind of value, list items that fit the default's first item, and objects with every
 * key the default object has. Extra keys are fine. An empty value, and a value with no default
 * to compare against, fit.
 */
function fitsDefault(value: unknown, sample: unknown): boolean {
  if (value === null || value === undefined || sample === null || sample === undefined) return true;

  const kind = kindOf(value);
  if (kind !== kindOf(sample)) return false;

  if (Array.isArray(sample)) {
    return sample.length === 0 || (value as unknown[]).every((item) => fitsDefault(item, sample[0]));
  }
  if (kind === 'object') {
    const object = value as Record<string, unknown>;
    return Object.entries(sample as Record<string, unknown>).every(
      ([key, part]) => key in object && fitsDefault(object[key], part)
    );
  }
  return true;
}

/** A value that holds nothing, so leaving it out loses nothing */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return kindOf(value) === 'object' && Object.keys(value as object).length === 0;
}

/**
 * Keep only the preselected answers the replacement's options have. Several answers
 * are a list, or a comma-separated string as the selectable box saves them.
 */
function clearUnmatchedDefault(replacement: BlockData, multiple: boolean): void {
  const { defaultValue, options } = replacement;
  if (isEmpty(defaultValue) || !Array.isArray(options)) return;

  const values = new Set(options.map((option) => option?.value));
  if (Array.isArray(defaultValue)) {
    replacement.defaultValue = defaultValue.filter((value) => values.has(value));
  } else if (typeof defaultValue === 'string' && multiple) {
    replacement.defaultValue = defaultValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => values.has(value))
      .join(',');
  } else if (typeof defaultValue === 'string' && !values.has(defaultValue)) {
    replacement.defaultValue = '';
  }
}

/**
 * Set the step settings. Moving on at every change only suits a block answered with one
 * pick, so autoContinueOnSelect carries over only to a block with options; a text field
 * would move on at the first keystroke. A block that draws its own button sets
 * showContinueButton in its defaults, and that stands. Otherwise a hidden Next button
 * carries over only to a block that moves on by itself, so no step is left without a way on.
 */
function applyStepSettings(
  source: BlockData,
  defaults: BlockData,
  replacement: BlockData,
  droppedFields: string[]
): void {
  const autoContinue = source.autoContinueOnSelect;
  if (autoContinue != null) {
    if ('autoContinueOnSelect' in defaults) {
      if (autoContinue !== defaults.autoContinueOnSelect) droppedFields.push('autoContinueOnSelect');
    } else if (Array.isArray(replacement.options)) {
      replacement.autoContinueOnSelect = autoContinue;
    } else if (autoContinue) {
      droppedFields.push('autoContinueOnSelect');
    }
  }

  const showButton = source.showContinueButton;
  if (showButton == null) return;
  if ('showContinueButton' in defaults) {
    if (showButton !== defaults.showContinueButton) droppedFields.push('showContinueButton');
  } else if (showButton || replacement.autoContinueOnSelect) {
    replacement.showContinueButton = showButton;
  } else {
    droppedFields.push('showContinueButton');
  }
}

function getDefaultData(definition: BlockDefinition): BlockData {
  return definition.generateDefaultData
    ? definition.generateDefaultData()
    : { ...definition.defaultData };
}

/** The setting that picks a block's answer shape (e.g. multiSelect), if its output follows one */
function shapeFieldOf(definition: BlockDefinition): string | undefined {
  const schema = definition.outputSchema;
  return schema && 'oneOf' in schema ? schema.discriminator?.propertyName : undefined;
}

function resolveOutput(schema: OutputSchema | undefined, blockData?: BlockData): ResolvedOutputSchema | undefined {
  if (!schema) return undefined;
  const resolved = resolveUnionSchema(schema, blockData);
  return resolved && !('oneOf' in resolved) ? resolved : undefined;
}

/**
 * Check whether answers shaped like `next` can stand in for answers shaped like `current`:
 * the same scalar type, the same array item type, or for objects every property of
 * `current` with the same type. An object without declared properties, whose keys
 * come from the block's configuration, only matches another such object.
 */
function outputFits(current: ResolvedOutputSchema, next: ResolvedOutputSchema): boolean {
  if (current.type === 'array' && next.type === 'array') {
    return current.items.type === next.items.type;
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
 * field name, rules and links, its step settings where the new block can use them (see
 * applyStepSettings), and every other setting the new block also has, when the value fits
 * the shape of the new block's default for it (so options carry over whole, extra keys
 * included). Settings the new block has but the old block doesn't, or has empty, start from
 * the new block's defaults. The old block's other settings are dropped, and listed unless
 * they're empty or the switch that picked the old block's answer shape. Its A/B test is
 * dropped too, unlisted, because its variants are copies of the old block.
 * @param block The block to replace
 * @param type The new block type, one of getReplacementBlockTypes(block, blocks)
 * @param blocks The available block definitions, keyed by type
 * @param keptFields More fields to keep whatever the new block, such as the builder's global custom fields
 * @returns The replacement and the dropped settings, or undefined when the type can't replace the block
 */
export function replaceBlock(
  block: BlockData,
  type: string,
  blocks: Record<string, BlockDefinition>,
  keptFields: readonly string[] = []
): BlockReplacement | undefined {
  const current = blocks[block.type];
  const next = blocks[type];
  if (!current || !next || type === block.type) return undefined;

  const data = getFittingDefaultData(next, resolveOutput(current.outputSchema, block));
  if (!data) return undefined;

  const replacement: BlockData = { ...data, type };
  const droppedFields: string[] = [];
  const kept = [...KEPT_FIELDS, ...keptFields];
  const oldShapeField = shapeFieldOf(current);
  // A preselected option means nothing to a block without options
  const optionsGone = Array.isArray(block.options) && !Array.isArray(data.options);
  // A copy, so the replacement shares no options, rules or other objects with the old block
  const source: BlockData = JSON.parse(JSON.stringify(block));
  for (const [field, value] of Object.entries(source)) {
    if (value === undefined || TYPE_FIELDS.includes(field) || STEP_FIELDS.includes(field)) continue;

    if (kept.includes(field)) {
      replacement[field] = value;
    } else if (value === null) {
      // An unset value leaves the new block's default in place
    } else if (field in data && fitsDefault(value, data[field]) && !(field === 'defaultValue' && optionsGone)) {
      replacement[field] = value;
    } else if (field !== oldShapeField && !isEmpty(value)) {
      droppedFields.push(field);
    }
  }
  // A setting that picks the answer (e.g. multiSelect) stays as getFittingDefaultData set it
  const newShapeField = shapeFieldOf(next);
  if (newShapeField) {
    replacement[newShapeField] = data[newShapeField];
  }
  applyStepSettings(source, data, replacement, droppedFields);
  clearUnmatchedDefault(replacement, resolveOutput(next.outputSchema, replacement)?.type === 'array');

  return { data: replacement, droppedFields };
}
