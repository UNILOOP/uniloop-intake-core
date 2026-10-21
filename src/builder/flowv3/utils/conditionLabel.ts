import { standardRuleToEnhanced, OPERATORS } from "../../common/navigation-rules-types";
import { BlockData, BlockDefinition } from "../../../types";
import { findBlockForField } from "../../../utils/blockFields";
import { getOutputPropertyOptions } from "../../../utils/outputSchema";

/**
 * Transforms a raw condition string (e.g., 'bmi < "25"') into a human-readable sentence.
 * Example: "bmi Less than 25"
 * Example with options: "Medical Conditions Includes Heart disease"
 */
export function getHumanReadableCondition(
  condition: string,
  blocks: BlockData[] = [],
  definitions: Record<string, BlockDefinition> = {}
): string {
  if (!condition) return "";

  // Use the enhanced parser to break down the condition
  const enhanced = standardRuleToEnhanced(condition);
  
  if (!enhanced.field && !enhanced.operator) {
    return condition; // Fallback to raw if parsing fails
  }

  const { field, operator, value } = enhanced;
  
  // Find the human-readable label for the operator
  const opDef = OPERATORS.find(op => op.value === operator);
  const operatorLabel = opDef ? opDef.label : operator;

  // Find the options to resolve labels from: the block's own, or for a key the block
  // saves under its own field name, the options its output schema lists for that key
  const match = findBlockForField(blocks, field);
  const definition = match ? definitions[match.block.type] : undefined;
  const options: Array<{ label?: string; value?: unknown; id?: unknown }> | undefined = match?.outputKey
    ? definition ? getOutputPropertyOptions(definition, match.block, match.outputKey) : undefined
    : match?.block.options;

  // Format and resolve the value
  let valueDisplay: string | any = value;

  const resolveOptionLabel = (val: any) => {
      if (!Array.isArray(options)) return val;
      
      // Clean string values (remove quotes) for comparison
      const cleanVal = typeof val === 'string' ? val.replace(/^['"]|['"]$/g, '') : val;
      
      const option = options.find((opt: any) => opt.value === cleanVal || opt.id === cleanVal);
      return option ? `"${option.label}"` : val; // Quote the label for clarity
  };

  if (Array.isArray(value)) {
      // Resolve each item in the array
      valueDisplay = value.map(resolveOptionLabel).join(', ');
  } else {
      // Resolve single value
      valueDisplay = resolveOptionLabel(value);
      
      // If no resolution happened, just clean up the quotes for display
      if (valueDisplay === value && typeof value === 'string') {
          valueDisplay = value.replace(/^['"]|['"]$/g, '');
      } else if (typeof value === 'object' && value !== null && valueDisplay === value) {
          valueDisplay = JSON.stringify(value);
      }
  }

  // Special handling for empty/not empty
  if (operator === 'isEmpty') {
      return `${field} is empty`;
  }
  if (operator === 'isNotEmpty') {
      return `${field} is not empty`;
  }

  return `${field} ${operatorLabel} ${valueDisplay}`;
}
