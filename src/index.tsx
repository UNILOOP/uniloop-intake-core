/**
 * Survey Form Package - Main Entry Point (Renderer)
 *
 * This is the lightweight entry point for rendering surveys.
 * For builder functionality, import from './builder' instead.
 *
 * @example Rendering a survey:
 * import SurveyForm, { useSurveyForm, themes } from '@/packages/survey-form-package/src';
 *
 * @example Building/editing a survey:
 * import { SurveyBuilder, StandardBlocks, StandardNodes } from '@/packages/survey-form-package/src/builder';
 */

// Main survey form component
import { SurveyForm } from './renderer/SurveyForm';
export { SurveyForm };
export default SurveyForm;

// Survey form context and hooks
export { SurveyFormProvider, useSurveyForm } from './context/SurveyFormContext';

// External values: keys kept outside the form that rules and blocks can use
export { createExternalStore, useExternalStore, hasExternalValue } from './external';
export type {
  ExternalField,
  ExternalStore,
  ExternalValues,
  ExternalBinding,
  ExternalSyncAdapter,
  ExternalSyncContext,
  ExternalConfig,
  ExternalChangeSource,
  ExternalListener,
} from './external';

// UI components for rendering
export { DebugInfo } from './components/ui/DebugInfo';
export { ValidationSummary } from './components/ui/ValidationSummary';

// Themes
export {
  themes,
  defaultTheme,
  minimalTheme,
  colorfulTheme,
  modernTheme,
  corporateTheme,
  darkTheme,
  himsTheme,
} from './themes';

// Color utilities
export { applyDynamicColors } from './utils/colorUtils';

// Font loader utilities
export {
  loadFonts,
  unloadFonts,
  useFontLoader,
  getFontCSSProperties,
  getFontFamilyWithFallback,
  normalizeFontFamily
} from './utils/fontLoader';

// Survey utility functions
export {
  evaluateLogic,
  getSurveyPages,
  getSurveyPageIds,
  getLocalized,
  getThemeClass,
  formatFieldName,
  detectSurveyMode
} from './utils/surveyUtils';

// Conditional utilities
export {
  evaluateCondition,
  evaluateSimpleCondition,
  isBlockVisible,
  executeCalculation,
  calculateBMI
} from './utils/conditionalUtils';

// Block adapter utilities
export {
  blockTypeMap,
  validateBlock,
  isContentBlock,
  isInputBlock,
  supportsConditionalRendering,
  supportsBranchingLogic
} from './utils/blockAdapter';

// Block operation utilities (for async mount operations)
export {
  useBlockOperation,
  BlockMountGuard,
  clearAllBlockOperations
} from './hooks/useBlockOperation';

// Layout system
export {
  layoutRegistry,
  getLayoutDefinition,
  getAllLayoutDefinitions,
  registerLayout,
  unregisterLayout,
  getLayoutComponent,
  RenderPageSurveyLayout,
  CurrentBlock,
  NavigationButtons,
  ProgressIndicator,
  createLayout
} from './renderer/layouts';

// Layout types
export type {
  ChatMessageType,
  AIHandler,
  AIHandlerContext,
  AIHandlerResponse,
  ChatLayoutProps,
  ChatCustomData,
  ChatRendererProps,
  VoiceLayoutProps,
  VoiceCustomData,
  VoiceState,
  VoiceMessageType,
  VoiceCommand,
  VoiceCommandType,
  InputMode,
  QuestionClassification,
  VoiceSessionConfig,
} from './renderer/layouts';

// Block registry (needed for renderer to find block renderers)
export {
  blockRegistry,
  getBlockDefinition,
  getAllBlockDefinitions,
  registerBlock,
  unregisterBlock,
  resolveBlockDefinition,
} from './blocks';

// Answer views (saved answers shown read-only, e.g. for clinicians)
export {
  SurveyAnswerRenderer,
  AnswerItem,
  OptionChips,
  toOptionChoices,
  AnswerGrid,
  AnswerText,
  BooleanAnswer,
  NotProvided,
  RawAnswer,
  isEmptyAnswer,
  collectAnswerBlocks,
  pickAnswerBlocks,
} from './renderer/answers';
export type {
  SurveyAnswerRendererProps,
  AnswerItemProps,
  OptionChipsProps,
  OptionChoice,
  AnswerGridProps,
  AnswerForm,
} from './renderer/answers';

// Field name helpers (value-block field name support)
export { generateFieldName, sanitizeFieldName } from './blocks/utils/GenFieldName';
export { FieldNameField, useFieldName, resolveFieldConfig } from './builder/common/FieldNameField';
export {
  getMappedFields,
  getBlockFieldNames,
  expandBlockValue,
  expandSavedValues,
  findBlockForField,
  getFieldQuestion,
  resolveFieldQuestion,
  getDefaultFieldQuestion,
  getFieldValidationRules,
  getBlockFieldErrors,
} from './utils/blockFields';
export type { MappedField, BlockFieldMatch } from './utils/blockFields';
export {
  findDuplicateFieldNames,
  assertUniqueFieldNames,
  getFieldNameUses,
  describeFieldNameUse,
  DuplicateFieldNameError,
} from './utils/duplicateFieldNames';
export type { FieldNameUse, DuplicateFieldName } from './utils/duplicateFieldNames';

// Block lock state for a custom block's settings form
export { useBlockLock } from './context/BlockLockContext';

// --------------------------------------------------------------------------
// Types - Export specific types needed for rendering (not export *)
// --------------------------------------------------------------------------
export type {
  // Core types
  UUID,
  SurveyMode,
  EditorMode,
  NavigationRule,
  ValidationRule,

  // Block types
  BlockDefinition,
  FieldNameConfig,
  BlockLockAccess,
  BlockData,
  BlockRendererProps,
  AnswerViewProps,
  ContentBlockItemProps,
  OutputSchema,
  OutputSchemaScalar,
  OutputSchemaArray,
  OutputSchemaObject,
  OutputSchemaOption,
  OutputFieldMapping,
  OutputSchemaUnion,

  // Node types
  NodeDefinition,
  NodeData,

  // Theme types
  ThemeDefinition,
  SurveyTheme,

  // Layout types
  LayoutDefinition,
  LayoutProps,

  // Localization types
  LocalizationMap,

  // Global custom fields
  GlobalCustomField,

  // Survey form types
  SurveyFormRendererProps,
  SurveyFormContextProps,
  BlockOverrides,
  ProgressBarOptions,
  NavigationButtonsOptions,
  PageRendererProps,

  // Conditions and calculations
  ConditionOperator,
  ConditionRule,
  BranchingLogic,
  CalculationRule,
  CurrentValues,
  EvaluationResult,

  // Mobile and AB testing
  MobileNavigationConfig,
  SwipeDirection,
  ABTestVariant,
  ABTestConfig,
} from './types';
