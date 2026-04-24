import type { JSX, ReactNode } from "react";

export type UUID = string;

/**
 * Survey structure mode:
 * - 'paged': Traditional mode with rootNode -> pages (sets) -> blocks
 * - 'pageless': Simplified mode with rootNode -> blocks directly (no pages/sets)
 */
export type SurveyMode = 'pageless' | 'paged';

export type EditorMode = 'full' | 'themeEditor';

export interface NavigationRule {
  condition: string;
  target: UUID | string;
  isPage?: boolean;
}

export interface ValidationRule {
  id?: string;
  field?: string;
  operator: string;
  value?: string | string[] | { type: 'variable' | 'literal'; value: string }[];
  message: string;
  severity?: 'error' | 'warning';
  dependencies?: string[];
  condition?: string;
}

export interface ContentBlockItemProps {
  data: BlockData;
  onUpdate?: (data: BlockData) => void;
  onRemove?: () => void;
}

// Output schema types for blocks
export type OutputSchemaScalar = {
  type: 'string' | 'number' | 'boolean' | 'date';
};

export type OutputSchemaArray = {
  type: 'array';
  items: {
    type: 'string' | 'number' | 'boolean' | 'object';
  };
};

export type OutputSchemaObject = {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    optional?: boolean;
    description?: string;
  }>;
};

// Union type - for blocks that can return different types based on configuration
export type OutputSchemaUnion = {
  oneOf: Array<OutputSchemaScalar | OutputSchemaArray | OutputSchemaObject>;
  // Optional: specify which block configuration field determines the type
  discriminator?: {
    propertyName: string;  // e.g., 'multiSelect'
    mapping: Record<string, number>;  // maps config value (as string) to oneOf index
  };
};

export type OutputSchema = OutputSchemaScalar | OutputSchemaArray | OutputSchemaObject | OutputSchemaUnion;

export interface BlockDefinition {
  type: string;
  name: string;
  description: string;
  icon?: ReactNode;
  defaultData: BlockData;
  generateDefaultData?: () => BlockData;
  // Builder components
  renderItem?: (props: ContentBlockItemProps) => JSX.Element;
  renderFormFields?: (props: ContentBlockItemProps) => JSX.Element;
  renderPreview?: () => JSX.Element;
  // Renderer component - new unified approach
  renderBlock?: (props: BlockRendererProps) => JSX.Element | null;
  /**
   * Chat renderer - custom UI for chat layout
   * When defined, ChatLayout will use this instead of hardcoded input types.
   * The renderer is responsible for the full interaction:
   * - Rendering appropriate UI (inputs, buttons, etc.)
   * - Handling value changes via onChange
   * - Calling onSubmit when the user completes input to advance to next question
   */
  chatRenderer?: (props: ChatRendererProps) => JSX.Element | null;
  // Validation
  validate?: (data: BlockData) => string | null;
  validateValue?: (value: any, data: BlockData) => string | null;
  // Output schema - defines what data structure this block returns
  outputSchema?: OutputSchema;
  inputSchema?: OutputSchema;
  blockFunctions?: BlockFunctionDef[];
  /**
   * Skip AI validation for voice/chat layouts.
   * When true, the block will not use AI to validate/transform voice input.
   * Useful for blocks that handle their own input processing.
   */
  skipAIValidation?: boolean;
  /**
   * Disable audio input for voice layouts.
   * When true, the voice input button will be hidden and only visual input allowed.
   * Useful for blocks that require precise visual input (signatures, file uploads, etc.)
   */
  disableAudioInput?: boolean;
}

export type BlockParameterDef = {
  type: string;           // keep open-ended: "number" | "string" | "boolean" | anything
  optional?: boolean;
  description?: string;
};

export type BlockFunctionDef = {
  name: string;
  parameters?: Record<string, BlockParameterDef>; // any number of params, any names
  callfunction: (...args: any[]) => any;           // any signature, any arity, any return
};


export interface NodeDefinition {
  type: string;
  name: string;
  description: string;
  uuid: UUID;
  icon?: ReactNode;
  defaultData: NodeData;
  renderNode: (props: {
    data: NodeData;
    onUpdate: (data: NodeData) => void;
    onRemove: () => void;
  }) => JSX.Element;
}

export type SurveyTheme =
  | "default"
  | "minimal"
  | "colorful"
  | "modern"
  | "corporate"
  | "dark"
  | "hims"
  | "uniloop"
  | "custom";

export interface ThemeDefinition {
  name: SurveyTheme;
  containerLayout: string;
  header: string;
  title: string;
  description: string;
  background: string;
  card: string;
  field: {
    label: string;
    input: string;
    description: string;
    error: string;
    radio: string;
    checkbox: string;
    select: string;
    textarea: string;
    file: string;
    matrix: string;
    range: string;
    text: string;
    activeText: string;
    placeholder: string;
    boxBorder?: string;

    // Comprehensive SelectableBox styling properties
    selectableBox?: string;                    // Base container styling for the box
    selectableBoxDefault?: string;             // Default/unselected state styling
    selectableBoxSelected?: string;            // Selected state styling
    selectableBoxHover?: string;               // Hover state styling
    selectableBoxFocus?: string;               // Focus state styling
    selectableBoxDisabled?: string;            // Disabled state styling
    selectableBoxContainer?: string;           // Inner container styling
    selectableBoxText?: string;                // Text styling inside the box
    selectableBoxTextSelected?: string;        // Text styling when selected
    selectableBoxIndicator?: string;           // Selection indicator (checkmark) styling
    selectableBoxIndicatorIcon?: string;       // Icon styling within the indicator

    // Agreement block specific styling
    agreementContainer?: string; // Main container for the agreement block
    agreementPanel?: string; // The agreement text display panel
    signatureCanvas?: string; // Signature canvas styling
    signatureColor?: string; // Signature stroke color (hex value)
  };
  container: {
    card: string;
    border: string;
    activeBorder: string;
    activeBg: string;
    header: string;
  };
  progress: {
    bar: string;
    dots: string;
    numbers: string;
    percentage: string;
    label: string;
  };
  button: {
    primary: string;
    secondary: string;
    text: string;
    navigation: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
    error: string;
    success: string;
  };
  fonts?: {
    // CDN URLs for loading custom fonts (e.g., Google Fonts, Adobe Fonts, etc.)
    urls?: string[];
    // Font families
    primary?: string;      // Primary font family (used for body text)
    secondary?: string;    // Secondary font family
    heading?: string;      // Font family for headings
    body?: string;         // Font family for body text
    monospace?: string;    // Font family for monospace text
    // Font weights
    weights?: {
      normal?: number;
      medium?: number;
      semibold?: number;
      bold?: number;
    };
  };
}

export interface GlobalCustomField {
  key: string;
  label: string;
  description?: string;
  component: React.ComponentType<{
    data: BlockData;
    onUpdate: (data: BlockData) => void;
    value?: any;
  }>;
  defaultValue?: any;
  showLabel?: boolean;
}

export interface SurveyBuilderState {
  rootNode: NodeData | null;
  definitions: {
    blocks: Record<string, BlockDefinition>;
    nodes: Record<string, NodeDefinition>;
  };
  localizations: LocalizationMap;
  theme: ThemeDefinition;
  selectedNode: UUID | null;
  displayMode: 'list' | 'graph' | 'flow' | 'lang' | 'theme';
  enableDebug?: boolean;
  globalCustomFields?: GlobalCustomField[];
  customData?: any;
  /**
   * Survey structure mode - determines how the survey data is organized
   * - 'paged': Traditional mode with rootNode -> pages (sets) -> blocks
   * - 'pageless': Simplified mode with rootNode -> blocks directly (no pages)
   */
  mode: SurveyMode;
}

export interface SurveyBuilderAction {
  type: string;
  payload?: any;
}

export interface NavigationHistoryEntry {
  pageUuid: string;
  blockUuid?: string;
  timestamp: number;
  trigger: 'forward' | 'back' | 'jump' | 'initial';
}

export interface SurveyFormRendererProps {
  survey: {
    rootNode: NodeData;
    localizations?: LocalizationMap;
    theme?: ThemeDefinition;
    mode?: SurveyMode;
  };
  /**
   * Survey structure mode - determines how the survey data is organized
   * - 'paged': Traditional mode with rootNode -> pages (sets) -> blocks
   * - 'pageless': Simplified mode with rootNode -> blocks directly (no pages)
   * @default 'pageless'
   */
  mode?: SurveyMode;
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>) => void;
  onPageChange?: (pageIndex: number, totalPages: number) => void;
  onNavigationHistoryChange?: (history: NavigationHistoryEntry[]) => void; // New callback for history changes
  defaultValues?: Record<string, any>;
  initialValues?: Record<string, any>; // For loading saved answers
  startPage?: number; // For resuming from specific page
  initialNavigationHistory?: NavigationHistoryEntry[]; // For restoring navigation history on resume
  language?: string;
  theme?: SurveyTheme;
  themeMode?: 'light' | 'dark' | 'system';
  progressBar?: ProgressBarOptions | boolean;
  navigationButtons?: NavigationButtonsOptions;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  className?: string;
  // New properties for conditional features
  computedFields?: ComputedFieldsConfig;
  customValidators?: Record<string, CustomValidator>;
  debug?: boolean;
  enableDebug?: boolean;
  logo?: any;
  // Custom layout support
  layout?: string | React.FC<LayoutProps>;
  // A/B testing configuration
  abTestPreviewMode?: boolean; // If true, bypasses storage and selects fresh variants each time
  // Analytics configuration
  analytics?: {
    enabled?: boolean;
    sessionId?: string;
    userId?: string;
    surveyId?: string;
    /**
     * Merchant-defined event mapping. Threaded into the internal Meta + GTM
     * providers so their browser pixels honor the same custom event names
     * and field maps the backend resolver applies. Passed as `unknown`
     * shape here — the providers accept `AnalyticsEventMappings` and the
     * host app supplies the concrete type.
     */
    eventMappings?: import('./analytics/types').AnalyticsEventMappings;
    googleAnalytics?: {
      measurementId: string;
      debug?: boolean;
    };
    googleTagManager?: {
      containerId: string;
      auth?: string;
      preview?: string;
      debug?: boolean;
      eventMappings?: import('./analytics/types').AnalyticsEventMappings;
    };
    meta?: {
      pixelId: string;
      accessToken?: string;
      testEventCode?: string;
      debug?: boolean;
      eventMappings?: import('./analytics/types').AnalyticsEventMappings;
    };
    trackEvent?: (event: any) => void;
    trackPageView?: (url: string, title?: string, additionalData?: Record<string, any>) => void;
    trackTiming?: (category: string, variable: string, value: number, label?: string) => void;
    setUserProperties?: (properties: Record<string, any>) => void;
    trackFieldInteractions?: boolean;
    trackValidationErrors?: boolean;
    trackTimings?: boolean;
    customDimensions?: Record<string, any>;
  };
  // Custom data for custom blocks
  customData?: any;
}



export interface ProgressBarOptions {
  type?: "bar" | "dots" | "numbers" | "percentage";
  showPercentage?: boolean;
  showStepInfo?: boolean;
  showStepTitles?: boolean;
  showStepNumbers?: boolean;
  position?: "top" | "bottom";
  color?: string;
  backgroundColor?: string;
  height?: number | string;
  animation?: boolean;
}

export interface NavigationButtonsOptions {
  showPrevious?: boolean;
  showNext?: boolean;
  showSubmit?: boolean;
  previousText?: string;
  nextText?: string;
  submitText?: string;
  position?: "bottom" | "split";
  align?: "left" | "center" | "right";
  style?: "default" | "outlined" | "text";
}

export interface LayoutProps {
  progressBar?: ProgressBarOptions | boolean;
  navigationButtons?: NavigationButtonsOptions;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  enableDebug?: boolean;
  showNavigationHistory?: boolean;
  logo?: any;
}

export interface LayoutDefinition {
  name: string;
  description?: string;
  component: React.FC<LayoutProps>;
}

export interface BlockRendererProps {
  block: BlockData;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  // Fixed: Use React.FC specifically instead of ComponentType
  customComponents?: Record<string, React.FC<BlockRendererProps>>;
  theme?: ThemeDefinition;
  // New props for conditional rendering
  isVisible?: boolean;
  customValidation?: (value: any) => string | null;
}

/**
 * Props passed to chatRenderer for rendering blocks in chat layout
 * The chatRenderer is responsible for handling the entire interaction:
 * - Rendering the UI
 * - Collecting user input
 * - Calling onSubmit when done to advance to next question
 */
export interface ChatRendererProps {
  /** The block data containing configuration */
  block: BlockData;
  /** Current value (may be undefined for first render) */
  value?: any;
  /** Callback to update value without submitting */
  onChange: (value: any) => void;
  /** Callback to submit the value and advance to next question */
  onSubmit: (value: any) => void;
  /** Theme definition for styling */
  theme?: ThemeDefinition;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Validation error message if any */
  error?: string;
  /** Placeholder text for inputs */
  placeholder?: string;
}

export interface PageRendererProps {
  page: Array<BlockData>;
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onBlur?: (field: string) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  customComponents?: Record<string, React.FC<BlockRendererProps>>;
  theme?: SurveyTheme;
}

export interface SurveyFormContextProps {
  values: Record<string, any>;
  setValue: (field: string, value: any) => void;
  errors: Record<string, string>;
  setError: (field: string, error: string | null) => void;
  currentPage: number;
  currentBlockIndex: number;
  totalPages: number;
  goToPage: (pageIndex: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToNextBlock: (fValue? : Record<string, any>) => void;
  goToPreviousBlock: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  submit: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  theme: ThemeDefinition;
  surveyData: {
    rootNode: NodeData;
    localizations?: LocalizationMap;
  };
  // New props for conditional features
  conditionalErrors: Record<string, string>;
  computedValues: Record<string, any>;
  updateComputedValues: () => void;
  evaluateCondition: (condition: string, contextData?: Record<string, any>) => boolean;
  getNextPageIndex: () => number | null;
  getVisibleBlocks: (blocks: BlockData[]) => BlockData[];
  validateField: (fieldName: string, value: any) => string | null;
  enableDebug?: boolean;
  logo?: any;
  abTestPreviewMode?: boolean;
  analytics?: {
    surveyId?: string;
    sessionId?: string;
    userId?: string;
    trackFieldInteractions?: boolean;
    trackValidationErrors?: boolean;
    trackTimings?: boolean;
  };
  customData?: any;
}

// New interfaces for conditional branching and validation

export interface CustomValidator {
  validate: (value: any, formValues: Record<string, any>) => string | null;
  validateAsync?: (value: any, formValues: Record<string, any>) => Promise<string | null>;
  dependencies?: string[]; // List of field names this validator depends on
}

export interface ComputedFieldsConfig {
  [fieldName: string]: {
    formula: string;
    dependencies: string[];
    format?: (value: any) => any;
  };
}

export interface ConditionalBlockProps extends BlockRendererProps {
  condition: string;
  contextData?: Record<string, any>;
}

export interface CalculatedFieldProps extends BlockRendererProps {
  formula: string;
  dependencies: string[];
  format?: (value: any) => any;
}

export type ConditionOperator =
  | '==' | '!=' | '>' | '>=' | '<' | '<='
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'matches'
  | 'empty' | 'notEmpty' | 'isEmpty' | 'isNotEmpty'
  | 'between' | 'notBetween'
  | 'in' | 'notIn' | 'containsAny' | 'containsAll' | 'containsNone';

export interface ConditionRule {
  field: string;
  operator: ConditionOperator;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'date';
}

export interface BranchingLogic {
  condition: string | ConditionRule | ConditionRule[];
  targetPage?: number | 'next' | 'prev' | 'submit';
  targetField?: string;
  message?: string;
}

export interface NavigationRule {
  condition: string;
  target: string;
  isPage?: boolean;
  isDefault?: boolean;
}

export interface CalculationRule {
  formula: string;
  targetField: string;
  dependencies: string[];
  runOn?: 'change' | 'blur' | 'submit' | 'pageChange';
}

export interface CurrentValues {
  [key: string]: string | number | boolean;
}

export interface EvaluationResult {
  matched: boolean;
  target: string | null;
  isPage: boolean | null;
  error?: any;
}

export interface MobileNavigationConfig {
    enableSwipeNavigation?: boolean;
    enableDoubleTapToGoBack?: boolean;
    showMobileBackButton?: boolean;
    preventBrowserBack?: boolean;
    swipeThreshold?: number; // Minimum distance for swipe gesture
}

export interface SwipeDirection {
    direction: 'left' | 'right' | 'up' | 'down' | null;
    distance: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // Relative weight for probability (e.g., 1, 2, 3)
  blockData: BlockData;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  selectedVariantId?: string; // Track which variant was selected for a user session
}


export interface BlockData {
  type: string;
  name?: string;
  label?: string;
  description?: string;
  fieldName?: string;
  placeholder?: string;
  text?: string;
  html?: string;
  items?: Array<BlockData>;
  labels?: Array<string>;
  values?: Array<string | number | boolean>;
  defaultValue?: any;
  className?: string;
  showResults?: boolean;
  navigationRules?: NavigationRule[];
  validationRules?: ValidationRule[];
  visibleIf?: any;
  isEndBlock?: boolean;
  /** Whether isEndBlock was manually set by the user (prevents auto-clearing) */
  isEndBlockManual?: boolean;
  /** If true, automatically continue to the next step when an option is selected */
  autoContinueOnSelect?: boolean;
  /** Whether to show the continue button for this block/page */
  showContinueButton?: boolean;
  /** A/B testing configuration */
  abTest?: ABTestConfig;
  isCustom?: boolean;
  /** Explicitly define the next block to navigate to (overrides sequential flow) */
  nextBlockId?: string;
  /**
   * Skip AI validation for voice/chat layouts.
   * When true, the block will not use AI to validate/transform voice input.
   */
  skipAIValidation?: boolean;
  /**
   * Disable audio input for voice layouts.
   * When true, the voice input button will be hidden and only visual input allowed.
   */
  disableAudioInput?: boolean;
  [key: string]: any;
}

export interface NodeData {
  uuid?: UUID;
  name?: string;
  type: string;
  items?: Array<BlockData>;
  nodes?: Array<NodeData | UUID>;
  navigationLogic?: string;
  entryLogic?: string;
  exitLogic?: string;
  backLogic?: string;
  [key: string]: any;
}

export interface LocalizationMap {
  [key: string]: {
    [key: string]: string;
  };
}