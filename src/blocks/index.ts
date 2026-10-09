import React from "react";
import type { BlockDefinition, BlockRendererProps } from "../types";
import { AgreementBlock } from "./AgreementBlock";
import { TextInputBlock } from "./TextInputBlock";
import { TextareaBlock } from "./TextareaBlock";
import { AuthBlock } from "./AuthBlock";
import { RadioBlock } from "./RadioBlock";
import { CheckboxBlock } from "./CheckboxBlock";
import { SelectBlock } from "./SelectBlock";
import { BMICalculatorBlock } from "./BMICalculatorBlock";
import { CalculatedFieldBlock } from "./CalculatedFieldBlock";
// import { CheckoutBlock } from "./CheckoutBlock";
import { ConditionalBlock } from "./ConditionalBlock";
import { DatePickerBlock } from "./DatePickerBlock";
import { FileUploadBlock } from "./FileUploadBlock";
import { HtmlBlock } from "./HtmlBlock";
import { MarkdownBlock } from "./MarkdownBlock";
import { MatrixBlock } from "./MatrixBlock";
import { RangeBlock } from "./RangeBlock";
import { ScriptBlock } from "./ScriptBlock";
import { SelectableBoxQuestionBlock } from "./SelectableBoxQuestionBlock";
import { YesNoAnswerBlock } from "./YesNoAnswerBlock";
// import { PatientBlock } from "./PatientBlock";
import { BlockMountGuard } from "../hooks/useBlockOperation";

// Registry of all block definitions
export const blockRegistry: Record<string, BlockDefinition> = {
  // patientAuth: PatientBlock,
  agreement: AgreementBlock,
  textfield: TextInputBlock,
  textarea: TextareaBlock,
  auth: AuthBlock,
  radio: RadioBlock,
  checkbox: CheckboxBlock,
  select: SelectBlock,
  bmiCalculator: BMICalculatorBlock,
  calculated: CalculatedFieldBlock,
  // checkout: CheckoutBlock,
  conditional: ConditionalBlock,
  datepicker: DatePickerBlock,
  fileupload: FileUploadBlock,
  html: HtmlBlock,
  markdown: MarkdownBlock,
  matrix: MatrixBlock,
  range: RangeBlock,
  script: ScriptBlock,
  selectablebox: SelectableBoxQuestionBlock,
  yesNoAnswer: YesNoAnswerBlock,
};

// Export all standard block definitions - ALL NOW UNIFIED
export const StandardBlocks: BlockDefinition[] = [
  // Basic input blocks
  // PatientBlock,
  AgreementBlock,
  SelectableBoxQuestionBlock,
  YesNoAnswerBlock,
  TextInputBlock,
  TextareaBlock,
  SelectBlock,
  RadioBlock,
  CheckboxBlock,

  // Advanced input blocks
  RangeBlock,
  DatePickerBlock,
  FileUploadBlock,
  MatrixBlock,
  
  // Content blocks
  MarkdownBlock,
  HtmlBlock,

  // Logic blocks
  AuthBlock,
  ScriptBlock,

  // Advanced calculation and conditional blocks
  BMICalculatorBlock,
  CalculatedFieldBlock,
  ConditionalBlock,
  // CheckoutBlock,
];

// Export individual blocks for direct import
export { 
  // PatientBlock,
  AgreementBlock,
  TextInputBlock, 
  TextareaBlock, 
  AuthBlock,
  RadioBlock,
  CheckboxBlock,
  SelectBlock,
  BMICalculatorBlock,
  CalculatedFieldBlock,
  // CheckoutBlock,
  ConditionalBlock,
  DatePickerBlock,
  FileUploadBlock,
  HtmlBlock,
  MarkdownBlock,
  MatrixBlock,
  RangeBlock,
  ScriptBlock,
  SelectableBoxQuestionBlock,
  YesNoAnswerBlock
};

// Cache for wrapped block definitions to avoid recreating on every call
const wrappedBlockCache = new Map<string, BlockDefinition>();

/**
 * Helper function to get a block definition by type.
 * Automatically wraps the block's renderBlock with BlockMountGuard
 * to handle rapid unmount/remount cycles and provide operation deduplication.
 */
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  const baseDefinition = blockRegistry[type];
  if (!baseDefinition) return undefined;

  // Check cache first
  if (wrappedBlockCache.has(type)) {
    return wrappedBlockCache.get(type);
  }

  // If the block doesn't have a renderBlock method, return as-is
  if (!baseDefinition.renderBlock) {
    return baseDefinition;
  }

  // Create wrapped definition with BlockMountGuard
  const wrappedDefinition: BlockDefinition = {
    ...baseDefinition,
    renderBlock: (props: BlockRendererProps) => {
      const blockId = props.block.uuid || props.block.fieldName || `${type}_${props.block.label || 'unnamed'}`;

      return React.createElement(
        BlockMountGuard,
        { blockId },
        baseDefinition.renderBlock!(props)
      );
    },
  };

  // Cache the wrapped definition
  wrappedBlockCache.set(type, wrappedDefinition);

  return wrappedDefinition;
}

// Helper function to get all block definitions
export function getAllBlockDefinitions(): BlockDefinition[] {
  return Object.values(blockRegistry);
}

// Helper function to register a custom block
export function registerBlock(block: BlockDefinition): void {
  blockRegistry[block.type] = block;
  // Clear cache for this type so it gets re-wrapped on next getBlockDefinition call
  wrappedBlockCache.delete(block.type);
}

// Helper function to unregister a block
export function unregisterBlock(type: string): void {
  delete blockRegistry[type];
  wrappedBlockCache.delete(type);
}

// Clear all cached wrapped definitions (useful for testing)
export function clearBlockCache(): void {
  wrappedBlockCache.clear();
}