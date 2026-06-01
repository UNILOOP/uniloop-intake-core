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
} from './blocks';

// Field name helpers (value-block field name support)
export { generateFieldName, sanitizeFieldName } from './blocks/utils/GenFieldName';
export { FieldNameField, useFieldName, resolveFieldConfig } from './builder/common/FieldNameField';

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
  BlockData,
  BlockRendererProps,
  ContentBlockItemProps,
  OutputSchema,
  OutputSchemaScalar,
  OutputSchemaArray,
  OutputSchemaObject,
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
