import type {
  BlockData,
  BlockDefinition,
  OutputSchema,
  OutputSchemaObject,
  OutputSchemaOption,
} from '../types';

/**
 * Utility functions for working with block output schemas
 */

/**
 * Get all field keys that a block outputs
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns Array of field keys that this block outputs
 */
export function getOutputKeys(blockDefinition: BlockDefinition, blockData?: any): string[] {
  const schema = blockDefinition.outputSchema;

  if (!schema) {
    return [];
  }

  // Handle union types
  if ('oneOf' in schema) {
    const resolvedSchema = resolveUnionSchema(schema, blockData);
    if (resolvedSchema && 'type' in resolvedSchema && resolvedSchema.type === 'object') {
      return Object.keys(resolvedSchema.properties);
    }
    return [];
  }

  // Handle regular types
  if ('type' in schema) {
    switch (schema.type) {
      case 'object':
        // Return all property keys for object types
        return Object.keys(schema.properties);

      case 'array':
      case 'string':
      case 'number':
      case 'boolean':
      case 'date':
        // Scalar and array types return a single value under the fieldName
        return [];

      default:
        return [];
    }
  }

  return [];
}

/**
 * Resolve a union schema to a specific schema based on block configuration
 * @param schema The union schema
 * @param blockData The block configuration data
 * @returns The resolved schema or undefined
 */
export function resolveUnionSchema(
  schema: OutputSchema,
  blockData?: any
): OutputSchema | undefined {
  if (!('oneOf' in schema)) {
    return schema;
  }

  // If no discriminator or block data, return first schema as default
  if (!schema.discriminator || !blockData) {
    return schema.oneOf[0];
  }

  // Get the discriminator value from block data
  const discriminatorValue = String(blockData[schema.discriminator.propertyName]);
  const schemaIndex = schema.discriminator.mapping[discriminatorValue];

  // Return the schema at the mapped index, or first schema as fallback
  return schema.oneOf[schemaIndex] ?? schema.oneOf[0];
}

/**
 * Get the object schema a block outputs, resolving union types
 * @returns The object schema, or undefined when the block doesn't output an object
 */
function getObjectOutputSchema(
  blockDefinition: BlockDefinition,
  blockData?: BlockData
): OutputSchemaObject | undefined {
  const schema = blockDefinition.outputSchema;
  if (!schema) return undefined;

  const resolved = 'oneOf' in schema ? resolveUnionSchema(schema, blockData) : schema;
  return resolved && 'type' in resolved && resolved.type === 'object' ? resolved : undefined;
}

/**
 * Get the output keys that rules can test, leaving out properties marked `excludeFromRules`
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns Array of keys to offer as `fieldName.<key>` in rule editors
 */
export function getRuleOutputKeys(
  blockDefinition: BlockDefinition,
  blockData?: BlockData
): string[] {
  const schema = getObjectOutputSchema(blockDefinition, blockData);
  if (!schema) return [];

  return Object.entries(schema.properties)
    .filter(([, property]) => !property.excludeFromRules)
    .map(([key]) => key);
}

/**
 * Get the fixed options an output property lists, for rule value dropdowns
 * @param blockDefinition The block definition
 * @param blockData Block configuration data (for resolving union types)
 * @param key The property key
 * @returns The property's options, or an empty array when it lists none
 */
export function getOutputPropertyOptions(
  blockDefinition: BlockDefinition,
  blockData: BlockData,
  key: string
): OutputSchemaOption[] {
  return getObjectOutputSchema(blockDefinition, blockData)?.properties[key]?.options ?? [];
}

/**
 * Get the output schema for a block
 * @param blockDefinition The block definition
 * @returns The output schema or undefined
 */
export function getOutputSchema(blockDefinition: BlockDefinition): OutputSchema | undefined {
  return blockDefinition.outputSchema;
}

/**
 * Check if a block outputs an object with nested fields
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns true if the block outputs an object
 */
export function isObjectOutput(blockDefinition: BlockDefinition, blockData?: any): boolean {
  const schema = blockDefinition.outputSchema;
  if (!schema) return false;

  if ('oneOf' in schema) {
    const resolved = resolveUnionSchema(schema, blockData);
    return resolved ? 'type' in resolved && resolved.type === 'object' : false;
  }

  return 'type' in schema && schema.type === 'object';
}

/**
 * Check if a block outputs an array
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns true if the block outputs an array
 */
export function isArrayOutput(blockDefinition: BlockDefinition, blockData?: any): boolean {
  const schema = blockDefinition.outputSchema;
  if (!schema) return false;

  if ('oneOf' in schema) {
    const resolved = resolveUnionSchema(schema, blockData);
    return resolved ? 'type' in resolved && resolved.type === 'array' : false;
  }

  return 'type' in schema && schema.type === 'array';
}

/**
 * Check if a block outputs a scalar value (string, number, boolean, date)
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns true if the block outputs a scalar value
 */
export function isScalarOutput(blockDefinition: BlockDefinition, blockData?: any): boolean {
  const schema = blockDefinition.outputSchema;
  if (!schema) return false;

  if ('oneOf' in schema) {
    const resolved = resolveUnionSchema(schema, blockData);
    return resolved ? 'type' in resolved && ['string', 'number', 'boolean', 'date'].includes(resolved.type) : false;
  }

  return 'type' in schema && ['string', 'number', 'boolean', 'date'].includes(schema.type);
}

/**
 * Get a human-readable description of what a block outputs
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns Description string
 */
export function getOutputDescription(blockDefinition: BlockDefinition, blockData?: any): string {
  const schema = blockDefinition.outputSchema;

  if (!schema) {
    return 'Unknown output type';
  }

  // Handle union types
  if ('oneOf' in schema) {
    const descriptions = schema.oneOf.map((s) => {
      if ('type' in s) {
        switch (s.type) {
          case 'string': return 'text value';
          case 'number': return 'numeric value';
          case 'boolean': return 'true/false value';
          case 'date': return 'date value';
          case 'array': return `array of ${s.items.type} values`;
          case 'object': return `object with fields: ${Object.keys(s.properties).join(', ')}`;
        }
      }
      return 'value';
    });

    if (schema.discriminator && blockData) {
      const resolved = resolveUnionSchema(schema, blockData);
      if (resolved && 'type' in resolved) {
        return getSchemaDescription(resolved);
      }
    }

    return `One of: ${descriptions.join(' OR ')}`;
  }

  // Handle regular types
  if ('type' in schema) {
    return getSchemaDescription(schema);
  }

  return 'Unknown output type';
}

function getSchemaDescription(schema: Exclude<OutputSchema, { oneOf: any }>): string {
  switch (schema.type) {
    case 'string':
      return 'Text value';
    case 'number':
      return 'Numeric value';
    case 'boolean':
      return 'True/false value';
    case 'date':
      return 'Date value';
    case 'array':
      return `Array of ${schema.items.type} values`;
    case 'object':
      const keys = Object.keys(schema.properties);
      return `Object with fields: ${keys.join(', ')}`;
    default:
      return 'Unknown output type';
  }
}

/**
 * Validate that a value matches the expected output schema
 * @param value The value to validate
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns Error message if invalid, null if valid
 */
export function validateOutput(value: any, blockDefinition: BlockDefinition, blockData?: any): string | null {
  const schema = blockDefinition.outputSchema;

  if (!schema) {
    return null; // No schema to validate against
  }

  // Handle union types
  if ('oneOf' in schema) {
    const resolved = resolveUnionSchema(schema, blockData);
    if (!resolved || !('type' in resolved)) {
      return 'Could not resolve union type';
    }
    return validateAgainstSchema(value, resolved);
  }

  // Handle regular types
  if ('type' in schema) {
    return validateAgainstSchema(value, schema);
  }

  return null;
}

function validateAgainstSchema(value: any, schema: Exclude<OutputSchema, { oneOf: any }>): string | null {
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string' && value !== null && value !== undefined) {
        return `Expected string value, got ${typeof value}`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' && value !== null && value !== undefined) {
        return `Expected number value, got ${typeof value}`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== null && value !== undefined) {
        return `Expected boolean value, got ${typeof value}`;
      }
      break;

    case 'array':
      if (!Array.isArray(value) && value !== null && value !== undefined) {
        return `Expected array value, got ${typeof value}`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `Expected object value, got ${typeof value}`;
      }
      // Optionally validate required fields
      for (const [key, field] of Object.entries(schema.properties)) {
        if (!field.optional && !(key in value)) {
          return `Missing required field: ${key}`;
        }
      }
      break;
  }

  return null;
}

/**
 * Get TypeScript type string representation of the output
 * Useful for generating type definitions or documentation
 * @param blockDefinition The block definition
 * @param blockData Optional block configuration data (for resolving union types)
 * @returns TypeScript type string
 */
export function getTypeScriptType(blockDefinition: BlockDefinition, blockData?: any): string {
  const schema = blockDefinition.outputSchema;

  if (!schema) {
    return 'any';
  }

  // Handle union types
  if ('oneOf' in schema) {
    if (schema.discriminator && blockData) {
      const resolved = resolveUnionSchema(schema, blockData);
      if (resolved && 'type' in resolved) {
        return schemaToTypeString(resolved);
      }
    }
    // Return union type
    const types = schema.oneOf
      .filter(s => 'type' in s)
      .map(s => schemaToTypeString(s as Exclude<OutputSchema, { oneOf: any }>));
    return types.join(' | ');
  }

  // Handle regular types
  if ('type' in schema) {
    return schemaToTypeString(schema);
  }

  return 'any';
}

function schemaToTypeString(schema: Exclude<OutputSchema, { oneOf: any }>): string {
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date | string';
    case 'array':
      return `${schema.items.type}[]`;
    case 'object':
      const fields = Object.entries(schema.properties)
        .map(([key, field]) => {
          const optional = field.optional ? '?' : '';
          return `${key}${optional}: ${field.type}`;
        })
        .join('; ');
      return `{ ${fields} }`;
    default:
      return 'any';
  }
}

/**
 * Example usage for accessing nested fields in conditional logic or calculated fields
 *
 * For an Auth block that outputs:
 * {
 *   name: string,
 *   email: string,
 *   token: string,
 *   isAuthenticated: boolean
 * }
 *
 * You can reference fields like:
 * - authResults.name
 * - authResults.email
 * - authResults.isAuthenticated
 */
export function getFieldAccessPath(blockFieldName: string, nestedKey?: string): string {
  if (!nestedKey) {
    return blockFieldName;
  }
  return `${blockFieldName}.${nestedKey}`;
}
