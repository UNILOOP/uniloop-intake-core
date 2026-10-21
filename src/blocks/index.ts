import React from "react";
import type { JSX } from "react";
import type { BlockData, BlockDefinition, BlockOverrides, BlockRendererProps } from "../types";
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
import {
  BlockOverrideBoundary,
  RenderWith,
  clearBlockOverrideFailures,
  hasBlockOverrideFailed,
} from "../renderer/renderers/BlockOverrideBoundary";

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
  clearBlockOverrideFailures(block.type);
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

// Pinned definitions per override object, then per system type. A re-registered
// block is a new object, so a stale pair is never served.
const pinnedOverrideCache = new WeakMap<
  BlockDefinition,
  Map<string, { system: BlockDefinition | undefined; pinned: BlockDefinition }>
>();
const warnedOverrides = new Set<string>();
// The system block's behaviour behind a failed override's renderers, per pinned definition.
const failedOverrideCache = new WeakMap<BlockDefinition, BlockDefinition>();

function withOverrideFallback<P>(
  systemType: string,
  overrideType: string,
  render: (props: P) => JSX.Element | null,
  fallback: ((props: P) => JSX.Element | null) | undefined
): (props: P) => JSX.Element {
  return (props: P) =>
    React.createElement(
      BlockOverrideBoundary,
      {
        key: overrideType,
        systemType,
        overrideType,
        fallback: fallback ? React.createElement(RenderWith<P>, { render: fallback, props }) : null,
      },
      React.createElement(RenderWith<P>, { render, props })
    );
}

/**
 * Returns the block registered as `overrideType` (in `blocks`, then the
 * registry) when it can render in place of `system`. Otherwise logs a warning
 * once per pair and returns undefined: when it isn't registered, or when it has
 * no `renderBlock` but the system block has one.
 */
export function findBlockOverride(
  type: string,
  overrideType: string,
  system: BlockDefinition | undefined,
  blocks?: Record<string, BlockDefinition>
): BlockDefinition | undefined {
  let override: BlockDefinition | undefined;
  if (blocks && Object.prototype.hasOwnProperty.call(blocks, overrideType)) override = blocks[overrideType];
  else if (Object.prototype.hasOwnProperty.call(blockRegistry, overrideType)) override = getBlockDefinition(overrideType);

  let problem: string | undefined;
  if (!override) problem = "isn't registered";
  else if (system?.renderBlock && !override.renderBlock) problem = "has no renderBlock";
  if (!problem) return override;

  const key = `${type}->${overrideType}`;
  if (!warnedOverrides.has(key)) {
    warnedOverrides.add(key);
    console.warn(`[blockOverrides] "${overrideType}" ${problem}, so "${type}" blocks use the system block.`);
  }
  return undefined;
}

/**
 * Returns `override` standing in for the system block `type`: the override's
 * builder, renderer, validation and schemas, with `type` and the default data's
 * `type` set to the system type, so forms keep saving the system type. The
 * override's `isCustom` flag is dropped, so the builder lists it with the
 * standard blocks. If the override throws while rendering, the system block's
 * renderer of the same name is shown instead, or nothing where the system block
 * has none (chat inputs then look the block up again and use their built-in input).
 */
export function pinBlockOverride(
  type: string,
  system: BlockDefinition | undefined,
  override: BlockDefinition
): BlockDefinition {
  let pairs = pinnedOverrideCache.get(override);
  const cached = pairs?.get(type);
  if (cached && cached.system === system) return cached.pinned;

  const pinDefaults = (data: BlockData): BlockData => {
    const { isCustom: _isCustom, ...rest } = data;
    const pinnedData: BlockData = { ...rest, type };
    if (system?.defaultData?.isCustom !== undefined) {
      pinnedData.isCustom = system.defaultData.isCustom;
    }
    return pinnedData;
  };

  const pinned: BlockDefinition = {
    ...override,
    type,
    defaultData: pinDefaults(override.defaultData),
  };
  if (override.generateDefaultData) {
    const generate = override.generateDefaultData.bind(override);
    pinned.generateDefaultData = () => pinDefaults(generate());
  }
  if (override.renderBlock) {
    pinned.renderBlock = withOverrideFallback(
      type,
      override.type,
      override.renderBlock.bind(override),
      system?.renderBlock?.bind(system)
    );
  }
  if (override.chatRenderer) {
    pinned.chatRenderer = withOverrideFallback(
      type,
      override.type,
      override.chatRenderer.bind(override),
      system?.chatRenderer?.bind(system)
    );
  }

  if (!pairs) {
    pairs = new Map();
    pinnedOverrideCache.set(override, pairs);
  }
  pairs.set(type, { system, pinned });
  return pinned;
}

/**
 * Looks up the definition for a block type, using the block mapped to it in
 * `overrides` when that block is registered. An unregistered override, or one
 * without a `renderBlock` where the system block has one, logs a warning once
 * and the system block is used. Once an override has thrown while rendering,
 * the system block's validation and schemas apply as well.
 */
export function resolveBlockDefinition(
  type: string,
  overrides?: BlockOverrides
): BlockDefinition | undefined {
  const overrideType = overrides?.[type];
  if (typeof overrideType !== "string" || !overrideType || overrideType === type) {
    return getBlockDefinition(type);
  }

  const system = getBlockDefinition(type);
  const override = findBlockOverride(type, overrideType, system);
  if (!override) return system;

  const pinned = pinBlockOverride(type, system, override);
  if (!system || !hasBlockOverrideFailed(type, overrideType)) return pinned;

  // The override has thrown, so its boundaries show the system block. Validate
  // and describe the answer as the system block does too. A renderer the system
  // block also has stays the boundary's, so the block on screen isn't remounted;
  // one it lacks is dropped, so chat falls back to its built-in input.
  let fallback = failedOverrideCache.get(pinned);
  if (!fallback) {
    fallback = {
      ...system,
      renderBlock: system.renderBlock && (pinned.renderBlock ?? system.renderBlock),
      chatRenderer: system.chatRenderer && (pinned.chatRenderer ?? system.chatRenderer),
    };
    failedOverrideCache.set(pinned, fallback);
  }
  return fallback;
}