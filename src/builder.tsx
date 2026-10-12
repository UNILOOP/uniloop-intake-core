/**
 * Builder entry point - Import from here for form editing/building capabilities
 * This is the "heavy" part of the package containing the visual builder
 *
 * @example
 * import { SurveyBuilder, StandardBlocks, StandardNodes } from '@/packages/survey-form-package/src/builder';
 */

// Main builder component
export { SurveyBuilder } from './builder/survey/SurveyBuilder';
export type { SurveyBuilderHandle } from './builder/survey/SurveyBuilder';

// Builder context and hooks
export {
  SurveyBuilderProvider,
  useSurveyBuilder,
  ActionTypes
} from './context/SurveyBuilderContext';

// Standard blocks for the builder
export {
  StandardBlocks,
  blockRegistry,
  getBlockDefinition,
  getAllBlockDefinitions,
  registerBlock,
  unregisterBlock,
  clearBlockCache,
  // Individual blocks
  TextInputBlock,
  TextareaBlock,
  AuthBlock,
  RadioBlock,
  CheckboxBlock,
  SelectBlock,
  BMICalculatorBlock,
  CalculatedFieldBlock,
  ConditionalBlock,
  DatePickerBlock,
  FileUploadBlock,
  HtmlBlock,
  MarkdownBlock,
  MatrixBlock,
  RangeBlock,
  ScriptBlock,
  SelectableBoxQuestionBlock,
  YesNoAnswerBlock,
  AgreementBlock
} from './blocks';

// Standard nodes for the builder
export { StandardNodes, SectionNodeDefinition } from './builder/nodes';

// Node utilities (used by builder)
export {
  findNodeById,
  getAllNodes,
  getParentNode,
  getAllParentNodes,
  ensureNodeUuids,
  getLeafNodePaths,
  cloneNode,
  linkNodes,
} from './utils/nodeUtils';

// Global custom fields components (builder-only)
export { GlobalCustomFields } from './builder/common/GlobalCustomFields';
export { ReferenceQuestionKeyField } from './examples/ReferenceQuestionKeyField';
export { SimpleCustomField } from './examples/SimpleCustomField';

// Re-export types needed for building
export type {
  NodeDefinition,
  BlockDefinition,
  NodeData,
  BlockData,
  GlobalCustomField,
  SurveyMode,
  EditorMode,
  ContentBlockItemProps,
} from './types';
