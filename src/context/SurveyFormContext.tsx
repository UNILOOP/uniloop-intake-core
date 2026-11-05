// Enhanced SurveyFormContext with Fixed Browser Back Navigation
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { NodeData, BlockData } from "../types";
import type {
  SurveyFormContextProps,
  SurveyTheme,
  ComputedFieldsConfig,
  CustomValidator,
  BranchingLogic
} from "../types";
import { getSurveyPages, getSurveyPageIds, evaluateLogic, detectSurveyMode, isPageNode } from "../utils/surveyUtils";
import type { BlockOverrides, SurveyMode } from "../types";
import { validationRuleToFunction } from "../builder/common/validation-rules-types";
import {
  evaluateCondition,
  isBlockVisible,
  executeCalculation,
  getNextPageIndex as calculateNextPageIndex,
  getNextPageFromNavigationRules,
  getNextStepFromNavigationRules,
  findStepPosition
} from "../utils/conditionalUtils";
import { ThemeDefinition, themes } from "../themes";
import { resolveBlockDefinition } from "../blocks";
import { DEFAULT_LANGUAGE_CODE } from "../utils/languages";
import {
  expandBlockValue,
  expandSavedValues,
  findBlockForField,
  getBlockFieldNames,
  getFieldValidationRules,
} from "../utils/blockFields";
import { isSameValue, toRuleContext, type ExternalConfig, type ExternalValues } from "../external";
import {
  applyExternalToInternal,
  callAdapter,
  collectBindings,
  readInternalValue,
} from "../external/sync";

const NO_EXTERNAL_VALUES: ExternalValues = {};
const noopSubscribe = () => () => {};
const getNoExternalValues = () => NO_EXTERNAL_VALUES;

// Navigation history entry - uses UUIDs for stable references across conditional navigation
interface NavigationHistoryEntry {
  pageUuid: string; // UUID of the page (Set node)
  blockUuid?: string; // UUID of the block (optional, for block-level navigation)
  timestamp: number;
  trigger: 'forward' | 'back' | 'jump' | 'initial';
}

// Enhanced context interface
interface EnhancedSurveyFormContextProps extends SurveyFormContextProps {
  navigationHistory: NavigationHistoryEntry[];
  canGoBack: boolean;
  getActualProgress: () => number;
  getTotalVisibleSteps: () => number;
  getCurrentStepPosition: () => number;
  isCurrentPageValid: boolean;
  analytics?: any;
  customData?: any;
  /** Values kept outside the form; empty without `external` */
  externalValues: ExternalValues;
  /** Writes external values (no-op without `external`) */
  setExternalValues: (patch: ExternalValues) => void;
}

// Create context with default values
export const SurveyFormContext = createContext<EnhancedSurveyFormContextProps>({
  values: {},
  setValue: () => {},
  errors: {},
  setError: () => {},
  currentPage: 0,
  currentBlockIndex: 0,
  totalPages: 0,
  goToPage: () => {},
  goToNextPage: () => {},
  goToPreviousPage: () => {},
  goToNextBlock: () => {},
  goToPreviousBlock: () => {},
  isFirstPage: true,
  isLastPage: true,
  isSubmitting: false,
  isValid: true,
  submit: () => {},
  language: DEFAULT_LANGUAGE_CODE,
  setLanguage: () => {},
  theme: themes.default,
  surveyData: { rootNode: { type: "" } },
  conditionalErrors: {},
  computedValues: {},
  updateComputedValues: () => {},
  evaluateCondition: () => false,
  getNextPageIndex: () => null,
  getVisibleBlocks: () => [],
  validateField: () => null,
  enableDebug: false,
  navigationHistory: [],
  canGoBack: false,
  getActualProgress: () => 0,
  getTotalVisibleSteps: () => 0,
  getCurrentStepPosition: () => 0,
  isCurrentPageValid: false,
  analytics: undefined,
  customData: undefined,
  externalValues: NO_EXTERNAL_VALUES,
  setExternalValues: () => {},
});

// Props for the provider
interface SurveyFormProviderProps {
  children: ReactNode;
  surveyData: {
    rootNode: NodeData;
    mode?: SurveyMode;
  };
  defaultValues?: Record<string, any>;
  initialValues?: Record<string, any>; // For loading saved answers
  startPage?: number; // For resuming from specific page
  initialNavigationHistory?: NavigationHistoryEntry[]; // For restoring navigation history on resume
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>) => void;
  onPageChange?: (pageIndex: number, totalPages: number) => void;
  onNavigationHistoryChange?: (history: NavigationHistoryEntry[]) => void; // Callback for history changes
  language?: string;
  theme?: ThemeDefinition;
  computedFields?: ComputedFieldsConfig;
  customValidators?: Record<string, CustomValidator>;
  debug?: boolean;
  enableDebug?: boolean;
  logo?: any;
  abTestPreviewMode?: boolean; // If true, bypasses storage and selects fresh variants each time
  analytics?: any; // Analytics configuration passed from SurveyForm
  customData?: any; // Custom data for custom blocks
  /** System block type to the registered block type that renders in its place. */
  blockOverrides?: BlockOverrides;
  /**
   * Survey structure mode - determines how the survey data is organized
   * - 'paged': Traditional mode with rootNode -> pages (sets) -> blocks
   * - 'pageless': Simplified mode with rootNode -> blocks directly (no pages)
   * If not provided, auto-detects based on survey structure
   */
  mode?: SurveyMode;
  /** Values kept outside the form, and how blocks are bound to them */
  external?: ExternalConfig;
  /**
   * Asks a page's blocks one at a time, as separate steps, instead of together.
   * For layouts that ask one question per turn, like chat and voice.
   */
  flattenPages?: boolean;
}

type StepPosition = { pageIndex: number; blockIndex: number };
/** Where Continue leads from a step, and which rule decided it */
type NextStep =
  | { kind: 'submit' }
  | { kind: 'rule' | 'nextBlock' | 'nextPage'; position: StepPosition };

// Provider component
export const SurveyFormProvider: React.FC<SurveyFormProviderProps> = ({
  children,
  surveyData,
  defaultValues = {},
  initialValues,
  startPage = 0,
  initialNavigationHistory,
  onSubmit,
  onChange,
  onPageChange,
  onNavigationHistoryChange,
  language = DEFAULT_LANGUAGE_CODE,
  theme,
  computedFields = {},
  customValidators = {},
  enableDebug = false,
  debug = false,
  logo = null,
  abTestPreviewMode = false,
  analytics,
  customData,
  blockOverrides,
  mode,
  external,
  flattenPages = false,
}) => {
  // Debug log for resume functionality
  if(debug)
    console.log('[SurveyFormProvider] Props received:', {
      defaultValues,
      initialValues,
      startPage,
      enableDebug,
      hasInitialValues: !!initialValues && Object.keys(initialValues).length > 0
    });

  // Determine survey mode - use explicit mode prop, or from surveyData, or auto-detect
  const surveyMode = mode ?? surveyData.mode ?? detectSurveyMode(surveyData.rootNode);

  // Get all pages from the survey - must be before state initialization
  // In pageless mode, each block becomes its own "page"
  // A root set in a pageless form is a page: one step that shows all of its blocks
  const pagesOptions = { groupPages: !flattenPages };
  const pages = getSurveyPages(surveyData.rootNode, surveyMode, pagesOptions);
  const pageIds = getSurveyPageIds(surveyData.rootNode, surveyMode, pagesOptions);
  const totalPages = Math.max(1, pages.length);
  // The set behind each page step; undefined for a single-block step
  const pageNodes: Array<BlockData | undefined> = pageIds.map(id =>
    surveyMode === 'pageless' && !flattenPages
      ? surveyData.rootNode.items?.find(item => item.uuid === id && isPageNode(item))
      : undefined
  );

  if (debug) {
    console.log('[SurveyFormProvider] Survey mode:', surveyMode);
    console.log('[SurveyFormProvider] Pages:', pages.length, 'Page IDs:', pageIds.length);
  }

  // State for form values and errors
  // Merge defaultValues with initialValues (initialValues takes precedence for loading saved answers)
  // This is calculated only once during initial render inside useState initializer
  const isInitialRender = useRef(true);

  const externalStore = external?.store;
  const externalSyncRef = useRef(external?.sync);
  externalSyncRef.current = external?.sync;
  const externalOnChangeRef = useRef(external?.onChange);
  externalOnChangeRef.current = external?.onChange;

  const [values, setValues] = useState<Record<string, any>>(() => {
    const blocks = pages.flat();
    const saved = expandSavedValues(blocks, { ...defaultValues, ...(initialValues || {}) });
    // Bound keys without an answer start from their external value, so a block
    // filled from outside is already answered when the form first renders
    const initial = externalStore && external?.sync
      ? applyExternalToInternal(saved, externalStore.getSnapshot(), null, collectBindings(blocks, external.sync), external.sync, blocks)
      : saved;
    if(debug) {
      console.log('[SurveyFormProvider] Initial state values:', initial);
      console.log('[SurveyFormProvider] Starting at page:', startPage);
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conditionalErrors, setConditionalErrors] = useState<Record<string, string>>({});
  const [computedValues, setComputedValues] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(() => {
    if(debug)
      console.log('[SurveyFormProvider] Initial currentPage state:', startPage);
    return startPage;
  });
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  // Navigation history state - use provided history or build complete path to startPage
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryEntry[]>(() => {
    // If we have an initial navigation history from resume, check if it's complete
    if (initialNavigationHistory && initialNavigationHistory.length > 0) {
      // Check if the saved history has enough entries for back navigation
      // We need at least 2 entries for canGoBack to be true
      if (initialNavigationHistory.length > 1 || startPage === 0) {
        if(debug)
          console.log('[SurveyFormProvider] Using restored navigation history:', initialNavigationHistory);
        return initialNavigationHistory;
      }
      // If saved history is incomplete (only 1 entry but startPage > 0), rebuild it
      if(debug)
        console.log('[SurveyFormProvider] Saved history incomplete, rebuilding...');
    }

    // Build complete navigation history from page 0 to startPage
    // This ensures users can navigate backward when resuming
    const baseTimestamp = Date.now() - (startPage * 1000); // Stagger timestamps
    const initialHistory: NavigationHistoryEntry[] = [];

    for (let i = 0; i <= startPage; i++) {
      const pageUuid = pageIds[i];
      if (pageUuid) {
        initialHistory.push({
          pageUuid,
          blockUuid: undefined,
          timestamp: baseTimestamp + (i * 1000),
          trigger: i === 0 ? 'initial' : 'forward'
        });
      }
    }

    // If no valid pages found, create a single entry for page 0
    if (initialHistory.length === 0) {
      const fallbackUuid = pageIds[0] || '';
      initialHistory.push({
        pageUuid: fallbackUuid,
        blockUuid: undefined,
        timestamp: Date.now(),
        trigger: 'initial'
      });
    }

    if(debug)
      console.log('[SurveyFormProvider] Built navigation history for resume:', initialHistory);
    return initialHistory;
  });

  // Refs to track state for popstate handler
  const navigationHistoryRef = useRef(navigationHistory);
  const currentPageRef = useRef(currentPage);
  const currentBlockIndexRef = useRef(currentBlockIndex);
  const isHandlingPopStateRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    navigationHistoryRef.current = navigationHistory;
  }, [navigationHistory]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    currentBlockIndexRef.current = currentBlockIndex;
  }, [currentBlockIndex]);

  // Call onNavigationHistoryChange whenever navigation history changes
  useEffect(() => {
    if (onNavigationHistoryChange) {
      onNavigationHistoryChange(navigationHistory);
    }
  }, [navigationHistory, onNavigationHistoryChange]);

  // Call onPageChange when component mounts with startPage
  useEffect(() => {
    if (startPage > 0 && onPageChange) {
      onPageChange(startPage, totalPages);
    }
  }, []); // Only run once on mount

  // Read through a ref, so the effect below still runs only when initialValues changes
  const allBlocksRef = useRef<BlockData[]>([]);
  allBlocksRef.current = pages.flat();

  // External values: read from the host's store, merged under form values for rules
  const externalValues = useSyncExternalStore(
    externalStore ? externalStore.subscribe : noopSubscribe,
    externalStore ? externalStore.getSnapshot : getNoExternalValues,
    externalStore ? externalStore.getSnapshot : getNoExternalValues
  );
  const externalRuleContext = useMemo(() => toRuleContext(externalValues), [externalValues]);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const externalSync = external?.sync;
  const externalBindings = useMemo(
    () => collectBindings(getSurveyPages(surveyData.rootNode, surveyMode).flat(), externalSync),
    [surveyData.rootNode, surveyMode, externalSync]
  );
  const externalBindingsRef = useRef(externalBindings);
  externalBindingsRef.current = externalBindings;
  // Internal keys last written from external values, so they aren't echoed back
  const writtenFromExternalRef = useRef(new Map<string, unknown>());

  const setExternalValues = useCallback((patch: ExternalValues) => {
    externalStore?.setValues(patch, 'form');
  }, [externalStore]);

  // Host listener, plus external -> internal for bound keys whose external value changed
  useEffect(() => {
    if (!externalStore) return;
    return externalStore.subscribe((nextExternal, changes, source) => {
      externalOnChangeRef.current?.(nextExternal, changes, source);
      const sync = externalSyncRef.current;
      if (!sync) return;
      setValues(prev => applyExternalToInternal(
        prev,
        nextExternal,
        changes,
        externalBindingsRef.current,
        sync,
        allBlocksRef.current,
        writtenFromExternalRef.current
      ));
    });
  }, [externalStore]);

  // Internal -> external: bound keys whose answer changed (on mount, only where the external value is empty)
  const syncedValuesRef = useRef<Record<string, any> | null>(null);
  useEffect(() => {
    const previous = syncedValuesRef.current;
    syncedValuesRef.current = values;
    const sync = externalSyncRef.current;
    if (!externalStore || !sync) return;

    const currentExternal = externalStore.getSnapshot();
    // Keys that only hold what external values just wrote aren't written back
    const written = writtenFromExternalRef.current;
    const echoed = new Set(
      [...written].filter(([key, value]) => isSameValue(readInternalValue(values, key), value)).map(([key]) => key)
    );
    written.clear();

    const patch: ExternalValues = {};
    for (const { binding, block } of externalBindingsRef.current) {
      if (binding.direction === 'toInternal' || echoed.has(binding.internalKey)) continue;
      const value = readInternalValue(values, binding.internalKey);
      if (previous ? isSameValue(value, readInternalValue(previous, binding.internalKey)) : value === undefined) continue;
      if (!previous && binding.externalKey in currentExternal && currentExternal[binding.externalKey] !== undefined) continue;

      patch[binding.externalKey] = sync.toExternal
        ? callAdapter('toExternal', () => sync.toExternal!(value, binding, block), value)
        : value;
    }
    if (Object.keys(patch).length > 0) externalStore.setValues(patch, 'form');
  }, [values, externalStore]);

  // Whether the host wants this block passed over (reads refs, so stale closures stay correct)
  const isBlockSkippedByExternal = useCallback((block?: BlockData | null): boolean => {
    const sync = externalSyncRef.current;
    if (!block || !sync?.shouldSkipBlock) return false;
    const bindings = externalBindingsRef.current
      .filter(item => item.block === block || (!!block.uuid && item.block.uuid === block.uuid))
      .map(item => item.binding);
    return callAdapter('shouldSkipBlock', () => !!sync.shouldSkipBlock!(block, {
      values: valuesRef.current,
      externalValues: externalStore?.getSnapshot() ?? NO_EXTERNAL_VALUES,
      bindings,
    }), false);
  }, [externalStore]);
  const navigationDirectionRef = useRef<'forward' | 'back'>('forward');

  // Update values when initialValues changes (for dynamic loading)
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      if(debug)
        console.log('[SurveyFormProvider] Updating values from initialValues:', initialValues);
      setValues(prev => {
        const updated = { ...prev, ...expandSavedValues(allBlocksRef.current, initialValues) };
        if(debug)
          console.log('[SurveyFormProvider] Updated values:', updated);
        return updated;
      });
    }
  }, [initialValues]);

  // Ensure page is set when component mounts with startPage
  // Note: Navigation history is already built in useState initializer above
  useEffect(() => {
    if (startPage > 0) {
      if(debug)
        console.log('[SurveyFormProvider] Setting initial page to:', startPage);
      setCurrentPage(startPage);
      setCurrentBlockIndex(0);
    }
  }, []); // Only run once on mount

  // Helper functions to work with UUIDs
  const getPageUuidByIndex = useCallback((pageIndex: number): string | null => {
    return pageIds[pageIndex] || null;
  }, [pageIds]);

  const getPageIndexByUuid = useCallback((pageUuid: string): number => {
    const index = pageIds.indexOf(pageUuid);
    return index >= 0 ? index : 0;
  }, [pageIds]);

  const getBlockUuidByIndex = useCallback((pageIndex: number, blockIndex: number): string | null => {
    const pageBlocks = pages[pageIndex] || [];
    const block = pageBlocks[blockIndex];
    return block?.uuid || null;
  }, [pages]);

  const getBlockIndexByUuid = useCallback((pageIndex: number, blockUuid: string): number => {
    const pageBlocks = pages[pageIndex] || [];
    const index = pageBlocks.findIndex(block => block.uuid === blockUuid);
    return index >= 0 ? index : 0;
  }, [pages]);

  // Navigation states
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const canGoBack = navigationHistory.length > 1;

  // Debug log for navigation state
  if (debug || enableDebug) {
    console.log('[SurveyFormContext] Navigation state:', {
      currentPage,
      historyLength: navigationHistory.length,
      canGoBack,
      isFirstPage,
      isLastPage,
      history: navigationHistory
    });
  }

  // Rule context for a set of answers (external values under, computed values over)
  const ruleContextFor = (formValues: Record<string, any>) =>
    ({ ...externalRuleContext, ...formValues, ...computedValues });

  // Blocks a step shows: a page's visible blocks, or the step's block if it's visible
  const getStepBlocks = (pageIndex: number, blockIndex: number, formValues: Record<string, any>): BlockData[] => {
    const context = ruleContextFor(formValues);
    if (pageNodes[pageIndex]) {
      return (pages[pageIndex] || []).filter(block => isBlockVisible(block, context));
    }
    const block = (pages[pageIndex] || [])[blockIndex];
    return block && isBlockVisible(block, context) ? [block] : [];
  };

  // A step with nothing visible is passed over (reads the latest answers)
  const isStepHidden = (pageIndex: number, blockIndex: number): boolean => {
    if (!pageNodes[pageIndex] && !(pages[pageIndex] || [])[blockIndex]) return false;
    return getStepBlocks(pageIndex, blockIndex, valuesRef.current).length === 0;
  };

  // Helper function to check if a block should be skipped when navigating back
  const shouldSkipBlockOnBack = useCallback((pageUuid: string, blockUuid?: string): boolean => {
    const pageIndex = getPageIndexByUuid(pageUuid);
    if (pageIndex < 0 || pageIndex >= pages.length) return false;

    // Hidden steps are passed over going forward, so going back too
    if (pageNodes[pageIndex]) return isStepHidden(pageIndex, 0);

    if (!blockUuid) return false;

    const pageBlocks = pages[pageIndex] || [];
    const block = pageBlocks.find(b => b.uuid === blockUuid);

    // A block the host skips going forward is stepped over going back too
    if (isBlockSkippedByExternal(block)) return true;
    if (block && isStepHidden(pageIndex, pageBlocks.indexOf(block))) return true;

    if (!block || block.type !== 'auth') return false;

    // Check if this is an auth block with skipIfLoggedIn enabled
    const skipIfLoggedIn = (block as any).skipIfLoggedIn;
    if (!skipIfLoggedIn) return false;

    // Check if user is actually logged in (avoiding localStorage in example)
    // const storageKey = (block as any).tokenStorageKey || 'authToken';
    // const existingToken = localStorage.getItem(storageKey);
    // return !!existingToken;

    return false; // Simplified for this example
  }, [pages, pageNodes, getPageIndexByUuid, isBlockSkippedByExternal]);

  // Helper function to find the previous non-skippable block
  const findPreviousNonSkippableBlock = useCallback((
    currentNavigationHistory: NavigationHistoryEntry[]
  ): { pageIndex: number; blockIndex: number } | null => {
    // Start from the entry before the current one in navigation history
    let historyIndex = currentNavigationHistory.length - 2; // -1 is current, -2 is previous

    while (historyIndex >= 0) {
      const entry = currentNavigationHistory[historyIndex];
      const { pageUuid, blockUuid } = entry;

      // Check if this block should be skipped
      if (!shouldSkipBlockOnBack(pageUuid, blockUuid)) {
        // Resolve UUIDs to current indices
        const pageIndex = getPageIndexByUuid(pageUuid);
        const blockIndex = blockUuid ? getBlockIndexByUuid(pageIndex, blockUuid) : 0;
        return { pageIndex, blockIndex };
      }

      historyIndex--;
    }

    // Every earlier step was filled from external values: go back to the nearest
    // one so it can be edited, rather than leaving the form
    const previous = currentNavigationHistory[currentNavigationHistory.length - 2];
    const previousPageIndex = previous ? getPageIndexByUuid(previous.pageUuid) : -1;
    const previousBlock = previous?.blockUuid
      ? (pages[previousPageIndex] || []).find(block => block.uuid === previous.blockUuid)
      : undefined;
    if (previous?.blockUuid && isBlockSkippedByExternal(previousBlock)) {
      return { pageIndex: previousPageIndex, blockIndex: getBlockIndexByUuid(previousPageIndex, previous.blockUuid) };
    }

    return null; // No valid previous block found
  }, [shouldSkipBlockOnBack, getPageIndexByUuid, getBlockIndexByUuid, pages, isBlockSkippedByExternal]);

  // Enhanced browser back/forward handling
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent infinite loops
      if (isHandlingPopStateRef.current) {
        return;
      }

      isHandlingPopStateRef.current = true;

      // Get current state references
      const currentNavHistory = navigationHistoryRef.current;
      const hasInternalHistory = currentNavHistory.length > 1;

      if (hasInternalHistory) {
        // Prevent the default browser back action
        event.preventDefault();
        navigationDirectionRef.current = 'back';
        
        // Find the previous valid position
        const target = findPreviousNonSkippableBlock(currentNavHistory);
        
        if (target) {
          // Update navigation history - remove the current entry
          const newHistory = currentNavHistory.slice(0, -1);
          
          setNavigationHistory(newHistory);
          setCurrentPage(target.pageIndex);
          setCurrentBlockIndex(target.blockIndex);

          if (onPageChange) {
            onPageChange(target.pageIndex, totalPages);
          }

          // Replace the current browser history state instead of pushing new one
          const targetPageUuid = getPageUuidByIndex(target.pageIndex);
          const targetBlockUuid = getBlockUuidByIndex(target.pageIndex, target.blockIndex);
          window.history.replaceState(
            {
              surveyPageUuid: targetPageUuid,
              surveyBlockUuid: targetBlockUuid,
              timestamp: Date.now()
            },
            '',
            window.location.href
          );
        } else {
          // No more internal history, allow normal browser behavior
          // This will exit the app or go to previous page in browser
          isHandlingPopStateRef.current = false;
          window.history.back();
          return;
        }
      } else {
        // No internal history, allow normal browser behavior
        isHandlingPopStateRef.current = false;
        return;
      }

      // Reset the flag after a short delay
      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 100);
    };

    // Add initial state to browser history with startPage UUID
    const initialPageUuid = pageIds[startPage] || pageIds[0] || '';
    window.history.replaceState(
      {
        surveyPageUuid: initialPageUuid,
        surveyBlockUuid: undefined,
        timestamp: Date.now()
      },
      '',
      window.location.href
    );
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Empty dependency array since we use refs

  // Add navigation entry to history
  const addToNavigationHistory = useCallback((
    pageIndex: number,
    blockIndex: number,
    trigger: NavigationHistoryEntry['trigger']
  ) => {
    const pageUuid = getPageUuidByIndex(pageIndex);
    // A page is one step, so its entry names no block
    const blockUuid = pageNodes[pageIndex] ? null : getBlockUuidByIndex(pageIndex, blockIndex);

    if (!pageUuid) {
      console.warn('[Navigation] Cannot add to history: invalid page index', pageIndex);
      return;
    }

    const newEntry: NavigationHistoryEntry = {
      pageUuid,
      blockUuid: blockUuid || undefined,
      timestamp: Date.now(),
      trigger
    };

    setNavigationHistory(prev => {
      // Avoid duplicate consecutive entries
      const lastEntry = prev[prev.length - 1];
      if (lastEntry &&
          lastEntry.pageUuid === pageUuid &&
          (lastEntry.blockUuid ?? null) === blockUuid) {
        return prev;
      }

      // Keep max 50 entries to prevent memory issues
      const newHistory = [...prev, newEntry];
      return newHistory.slice(-50);
    });

    // Update browser history only for forward navigation
    if (trigger === 'forward' || trigger === 'jump') {
      window.history.pushState(
        {
          surveyPageUuid: pageUuid,
          surveyBlockUuid: blockUuid,
          timestamp: Date.now()
        },
        '',
        window.location.href
      );
    }
  }, [getPageUuidByIndex, getBlockUuidByIndex, pageNodes]);

  // Get visible blocks for current state
  const getVisibleBlocks = useCallback((blocks: BlockData[]): BlockData[] => {
    const context = { ...externalRuleContext, ...values, ...computedValues };
    return blocks.filter(block => isBlockVisible(block, context));
  }, [externalRuleContext, values, computedValues]);

  // Find the longest path from start to submit/end using memoized DP (O(n))
  // Each step (a block, or a whole page) is computed once and cached — no exponential backtracking
  const getLongestPathLength = useCallback((): number => {
    if (pages.flat().length === 0) return 0;

    const memo = new Map<string, number>();
    const inStack = new Set<string>(); // cycle detection
    const normalize = (position: StepPosition): StepPosition =>
      pageNodes[position.pageIndex] ? { pageIndex: position.pageIndex, blockIndex: 0 } : position;

    const dfs = ({ pageIndex, blockIndex }: StepPosition): number => {
      const key = `${pageIndex}:${blockIndex}`;
      if (memo.has(key)) return memo.get(key)!;
      if (inStack.has(key)) return 0; // cycle — stop

      // A page routes with its own rules; a single block with its own
      const pageNode = pageNodes[pageIndex];
      const node = pageNode ?? (pages[pageIndex] || [])[blockIndex];
      if (!node) return 0;
      if (node.isEndBlock || node.nextBlockId === 'submit') {
        memo.set(key, 1);
        return 1;
      }

      inStack.add(key);
      // Collect all possible successors
      const targets = new Set<string>();
      if (node.nextBlockId) targets.add(node.nextBlockId);
      for (const rule of node.navigationRules || []) {
        if (rule.target && rule.target !== 'submit') targets.add(String(rule.target));
      }
      const successors: StepPosition[] = [];
      for (const target of targets) {
        const position = findStepPosition(pages, pageIds, target);
        if (position) successors.push(normalize(position));
      }
      if (!node.nextBlockId) {
        if (!pageNode && blockIndex < (pages[pageIndex] || []).length - 1) {
          successors.push({ pageIndex, blockIndex: blockIndex + 1 });
        } else if (pageIndex < pages.length - 1) {
          successors.push({ pageIndex: pageIndex + 1, blockIndex: 0 });
        }
      }

      let maxChild = 0;
      for (const successor of successors) {
        maxChild = Math.max(maxChild, dfs(successor));
      }

      inStack.delete(key);
      const result = 1 + maxChild;
      memo.set(key, result);
      return result;
    };

    return dfs({ pageIndex: 0, blockIndex: 0 });
  }, [pages, pageIds, pageNodes]);

  // Total steps = longest possible path through the survey
  const getTotalVisibleSteps = useCallback((): number => {
    return getLongestPathLength();
  }, [getLongestPathLength]);

  // Current step position = how many blocks the user has visited (0-based)
  const getCurrentStepPosition = useCallback((): number => {
    return Math.max(0, navigationHistory.length - 1);
  }, [navigationHistory]);

  // Progress = steps completed / longest path
  const getActualProgress = useCallback((): number => {
    const totalSteps = getTotalVisibleSteps();
    const currentPosition = getCurrentStepPosition();

    if (totalSteps === 0) return 0;

    return Math.min(100, ((currentPosition + 1) / totalSteps) * 100);
  }, [getTotalVisibleSteps, getCurrentStepPosition]);

  // Rest of the existing context logic...
  const updateComputedValues = useCallback(() => {
    if (Object.keys(computedFields).length === 0) return;

    const newComputedValues: Record<string, any> = {};

    Object.entries(computedFields).forEach(([fieldName, config]) => {
      const result = executeCalculation(
        {
          formula: config.formula,
          targetField: fieldName,
          dependencies: config.dependencies
        },
        { ...externalRuleContext, ...values, ...computedValues }
      );

      newComputedValues[fieldName] = config.format ? config.format(result) : result;
    });

    setComputedValues(prev => ({ ...prev, ...newComputedValues }));
  }, [externalRuleContext, values, computedValues, computedFields]);

  useEffect(() => {
    updateComputedValues();
  }, [values, updateComputedValues]);

  const evaluateConditionWithContext = useCallback((condition: string, contextData?: Record<string, any>) => {
    const contextValues = {
      ...externalRuleContext,
      ...values,
      ...computedValues,
      ...(contextData || {})
    };

    return evaluateCondition(condition, contextValues);
  }, [externalRuleContext, values, computedValues]);

  const getNextPageIndexFrom = (
    currentPage: number,
    context: Record<string, any> = { ...externalRuleContext, ...values, ...computedValues }
  ): number | null => {
    const currentPageBlocks = pages[currentPage] || [];
    let branchingLogic: BranchingLogic | undefined;

    if (currentPageBlocks.length > 0) {
      const firstBlock = currentPageBlocks[0];
      if (typeof firstBlock === 'object' && firstBlock.branchingLogic) {
        branchingLogic = firstBlock.branchingLogic;
      }
    }

    if (!branchingLogic) {
      const page = pages[currentPage];
      if (Array.isArray(page) && page.length > 0) {
        const setParent = page[0];
        if (typeof setParent === 'object' && setParent.branchingLogic) {
          branchingLogic = setParent.branchingLogic;
        }
      }
    }

    if (branchingLogic) {
      const nextIndex = calculateNextPageIndex(
        currentPage,
        branchingLogic,
        context,
        totalPages
      );

      if (nextIndex === -1) {
        return null;
      }

      return nextIndex;
    }

    const navIndex = getNextPageFromNavigationRules(
      currentPageBlocks,
      pages,
      pageIds,
      context
    );
    if (navIndex !== null) {
      return navIndex === -1 ? null : navIndex;
    }

    return currentPage + 1 < totalPages ? currentPage + 1 : null;
  };
  const getNextPageIndex = (): number | null => getNextPageIndexFrom(currentPage);

  // Where Continue leads from a step, given a set of answers
  const resolveNextStep = (pageIndex: number, blockIndex: number, formValues: Record<string, any>): NextStep => {
    const context = ruleContextFor(formValues);
    const toStep = (position: StepPosition): StepPosition =>
      pageNodes[position.pageIndex] ? { pageIndex: position.pageIndex, blockIndex: 0 } : position;

    // A page leaves through its own rules; rules on blocks inside it aren't used
    const pageNode = pageNodes[pageIndex];
    if (pageNode) {
      const visible = getStepBlocks(pageIndex, 0, formValues);
      if (pageNode.isEndBlock || visible.some(block => block.isEndBlock)) return { kind: 'submit' };
      const target = getNextStepFromNavigationRules(pageNode, pages, pageIds, context);
      if (target === 'submit') return { kind: 'submit' };
      if (target) return { kind: 'rule', position: toStep(target) };
      return pageIndex + 1 < totalPages
        ? { kind: 'nextPage', position: { pageIndex: pageIndex + 1, blockIndex: 0 } }
        : { kind: 'submit' };
    }

    const pageBlocks = pages[pageIndex] || [];
    const block = pageBlocks[blockIndex];
    if (block?.isEndBlock) return { kind: 'submit' };

    // A hidden block is passed over: its answer-based rules don't apply
    const routing = block && !isBlockVisible(block, context) ? { ...block, navigationRules: undefined } : block;
    const target = routing ? getNextStepFromNavigationRules(routing, pages, pageIds, context) : null;
    if (target === 'submit') return { kind: 'submit' };
    if (target) return { kind: 'rule', position: toStep(target) };

    if (blockIndex < pageBlocks.length - 1) {
      return { kind: 'nextBlock', position: { pageIndex, blockIndex: blockIndex + 1 } };
    }

    const nextIndex = getNextPageIndexFrom(pageIndex, context);
    return nextIndex === null
      ? { kind: 'submit' }
      : { kind: 'nextPage', position: { pageIndex: nextIndex, blockIndex: 0 } };
  };

  const validateField = useCallback((
    fieldName: string,
    value: any,
    formValues?: Record<string, any>
  ): string | null => {
    // Validation context: prefer values supplied by the caller (they may not be
    // committed to state yet, e.g. during auto-continue) over the render snapshot.
    const validationContext = { ...externalRuleContext, ...(formValues ?? values), ...computedValues };

    // First check for block-level validation using validateValue method.
    // Prefer the block currently being answered so a duplicate field name on
    // another page cannot shadow its rules.
    // A field name can also be one of a block's mapped output keys.
    const activeBlock = (pages[currentPage] || [])[currentBlockIndex];
    const allBlocks = pages.flat();
    const block = getBlockFieldNames(activeBlock).includes(fieldName)
      ? activeBlock
      : findBlockForField(allBlocks, fieldName)?.block;
    
    if (block) {
      // validateValue checks the block's whole answer, so it runs for its own field only
      const blockDefinition = block.fieldName === fieldName
        ? resolveBlockDefinition(block.type, blockOverrides)
        : undefined;
      if (blockDefinition?.validateValue) {
        try {
          const blockValidationError = blockDefinition.validateValue(value, block);
          if (blockValidationError) {
            return blockValidationError;
          }
        } catch (error) {
          console.error(`Error in block validation for field ${fieldName}:`, error);
          return `Validation error: ${(error as Error).message}`;
        }
      }

      // Check custom validation rules (a mapped key gets the rules that test it)
      for (const rule of getFieldValidationRules(block, fieldName)) {
        try {
          // Skip if there's a condition and it doesn't evaluate to true
          if (rule.condition) {
            const conditionResult = evaluateConditionWithContext(rule.condition, validationContext);
            if (!conditionResult) {
              continue;
            }
          }

          // Apply the validation rule
          const validationFunction = validationRuleToFunction(rule);
          const validationError = validationFunction(value, validationContext);

          if (validationError && rule.severity !== 'warning') {
            return validationError;
          }
        } catch (error) {
          console.error(`Error in custom validation rule for field ${fieldName}:`, error);
          return `Validation error: ${(error as Error).message}`;
        }
      }
    }

    // Then check custom validators
    const validator = customValidators[fieldName];
    if (validator) {
      try {
        const error = validator.validate(value, validationContext);
        return error;
      } catch (error) {
        console.error(`Error validating field ${fieldName}:`, error);
        return `Validation error: ${(error as Error).message}`;
      }
    }

    return null;
  }, [customValidators, externalRuleContext, values, computedValues, pages, currentPage, currentBlockIndex, evaluateConditionWithContext, blockOverrides]);

  // Calculate if the current page is valid
  const currentPageBlocks = pages[currentPage] || [];
  const visibleCurrentPageBlocks = getVisibleBlocks(currentPageBlocks);
  const currentPageFields = visibleCurrentPageBlocks.flatMap(block => getBlockFieldNames(block));

  // Check if current block is valid (for stepper layout)
  const currentBlock = currentPageBlocks[currentBlockIndex];
  const isCurrentBlockValid = getBlockFieldNames(currentBlock)
    .every(field => !errors[field] && !conditionalErrors[field]);

  // Check if entire current page is valid (for page-by-page layout)
  const isCurrentPageValid = currentPageFields.every(field => !errors[field] && !conditionalErrors[field]);
  
  // Use block-level validation for steppers, page-level for pages
  const isPageStep = !!pageNodes[currentPage];
  const isValid = isPageStep ? isCurrentPageValid : isCurrentBlockValid;
  const currentStepBlocks = getStepBlocks(currentPage, currentBlockIndex, values);

  // Enhanced setValue
  const setValue = (field: string, value: any) => {
    // The block that saves this answer, preferring the one being answered
    const activeBlock = (pages[currentPage] || [])[currentBlockIndex];
    const block = activeBlock?.fieldName === field
      ? activeBlock
      : pages.flat().find(item => item.fieldName === field);
    const fieldNames = block ? getBlockFieldNames(block) : [field];

    setValues(prev => {
      // A block's mapped output keys are saved in the same update as its answer
      const updatedValues = { ...prev, [field]: value, ...expandBlockValue(block, value) };

      const currentPageItem = pages[currentPage];
      if (Array.isArray(currentPageItem) && currentPageItem.length > 0) {
        const setParent = currentPageItem[0];
        if (typeof setParent === 'object' && setParent.exitLogic) {
          try {
            const result = evaluateLogic(setParent.exitLogic, {
              fieldValues: updatedValues,
              getFieldValue: (name) => updatedValues[name] || computedValues[name]
            });
            if (result && typeof result === 'object' && isValid === false) {
              setError(field, result.errorMessage || 'Invalid value');
            } else {
              setError(field, null);
            }
          } catch (error) {
            console.error("Error evaluating exit logic:", error);
          }
        }
      }

      const validationErrors = fieldNames.map(name =>
        [name, validateField(name, updatedValues[name], updatedValues)] as const
      );
      setConditionalErrors(prev => {
        const newErrors = { ...prev };
        for (const [name, validationError] of validationErrors) {
          if (validationError) newErrors[name] = validationError;
          else delete newErrors[name];
        }
        return newErrors;
      });

      return updatedValues;
    });
  };

  // Call onChange after values state is committed, avoiding setState during render
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    onChange?.(values);
  }, [values]);

  const setError = (field: string, error: string | null) => {
    setErrors(prev => {
      if (error === null) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return { ...prev, [field]: error };
    });
  };

  // Enhanced navigation functions
  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      navigationDirectionRef.current = 'forward';
      addToNavigationHistory(pageIndex, 0, 'jump');
      setCurrentPage(pageIndex);
      setCurrentBlockIndex(0);

      if (onPageChange) {
        onPageChange(pageIndex, totalPages);
      }
    }
  };

  const goToNextBlock = (fValue?: Record<string, any>) => {
    navigationDirectionRef.current = 'forward';
    const pageBlocks = pages[currentPage] || [];
    // A page answers all of its blocks at once; otherwise the step is one block
    const answeredBlocks = isPageStep ? pageBlocks : [pageBlocks[currentBlockIndex]];

    // A block's mapped output keys come from its answer, so navigation rules on
    // them see this answer too
    const answers = fValue ? { ...values, ...fValue } : values;
    const update = fValue
      ? answeredBlocks.reduce<Record<string, any>>(
          (acc, block) => block?.fieldName && block.fieldName in fValue
            ? { ...acc, ...expandBlockValue(block, answers[block.fieldName]) }
            : acc,
          { ...fValue }
        )
      : undefined;
    const mergedValues = update ? { ...values, ...update } : values;

    if (update) {
      setValues(prev => ({ ...prev, ...update }));
    }

    // Validate the step's visible fields against the values being submitted before
    // any navigation or submission. Auto-continue calls this synchronously right
    // after the selection, so the `values` render snapshot may not include the new
    // answer yet; `mergedValues` always does. A hidden block isn't checked.
    const fieldNames = getStepBlocks(currentPage, currentBlockIndex, mergedValues)
      .flatMap(block => getBlockFieldNames(block));
    if (fieldNames.length > 0) {
      const validationErrors = fieldNames.map(name =>
        [name, validateField(name, mergedValues[name], mergedValues)] as const
      );

      setConditionalErrors(prev => {
        const newErrors = { ...prev };
        for (const [name, validationError] of validationErrors) {
          if (validationError) newErrors[name] = validationError;
          else delete newErrors[name];
        }
        return newErrors;
      });

      if (validationErrors.some(([, validationError]) => validationError)) {
        return; // Don't proceed if validation fails
      }
    }

    const next = resolveNextStep(currentPage, currentBlockIndex, mergedValues);

    if (next.kind === 'submit') {
      // Pass the merged values to submit to avoid race conditions
      submit(mergedValues);
      return;
    }

    const { pageIndex, blockIndex } = next.position;
    if (next.kind === 'rule') {
      addToNavigationHistory(pageIndex, blockIndex, 'forward');
      setCurrentPage(pageIndex);
      setCurrentBlockIndex(blockIndex);

      if (onPageChange) {
        onPageChange(pageIndex, totalPages);
      }
      return;
    }

    if (next.kind === 'nextBlock') {
      addToNavigationHistory(pageIndex, blockIndex, 'forward');
      setCurrentBlockIndex(blockIndex);
      return;
    }

    addToNavigationHistory(pageIndex, 0, 'forward');
    goToPage(pageIndex);
  };

  // Enhanced goToPreviousBlock that works with browser back button
  const goToPreviousBlock = () => {
    navigationDirectionRef.current = 'back';
    if (navigationHistory.length <= 1) {
      // Allow browser to handle the back navigation (exit app)
      window.history.back();
      return;
    }

    // Find the previous non-skippable block
    const target = findPreviousNonSkippableBlock(navigationHistory);
    
    if (target) {
      // Update navigation history - remove the current entry
      const newHistory = navigationHistory.slice(0, -1);
      
      setNavigationHistory(newHistory);
      setCurrentPage(target.pageIndex);
      setCurrentBlockIndex(target.blockIndex);

      if (onPageChange) {
        onPageChange(target.pageIndex, totalPages);
      }
    } else {
      // No more internal history, exit the app
      window.history.back();
    }
  };

  const goToNextPage = () => {
    goToNextBlock();
  };

  const goToPreviousPage = () => {
    goToPreviousBlock();
  };

  /**
   * Drops answers of blocks the final answers don't lead through: blocks on a
   * branch the patient backed out of, and blocks hidden on the way. Replays the
   * routing from the first step rather than reading the history, which a resume
   * rebuilds as every step up to the start page. Keys no block saves (external or
   * computed values) stay. If the replay doesn't reach submit through the current
   * step, nothing is dropped.
   */
  const keepFinalPathAnswers = (formValues: Record<string, any>): Record<string, any> => {
    const onPath = new Set<BlockData>();
    const seen = new Set<string>();
    let position: StepPosition = { pageIndex: 0, blockIndex: 0 };
    let reachedSubmit = false;
    let passedCurrentStep = false;

    while (!seen.has(`${position.pageIndex}:${position.blockIndex}`)) {
      seen.add(`${position.pageIndex}:${position.blockIndex}`);
      if (position.pageIndex === currentPage && (isPageStep || position.blockIndex === currentBlockIndex)) {
        passedCurrentStep = true;
      }
      for (const block of getStepBlocks(position.pageIndex, position.blockIndex, formValues)) {
        onPath.add(block);
      }
      const next = resolveNextStep(position.pageIndex, position.blockIndex, formValues);
      if (next.kind === 'submit') {
        reachedSubmit = true;
        break;
      }
      position = next.position;
    }

    if (!reachedSubmit || !passedCurrentStep) return formValues;

    const kept = new Set([...onPath].flatMap(block => getBlockFieldNames(block)));
    const dropped = new Set(
      pages.flat()
        .filter(block => !onPath.has(block))
        .flatMap(block => getBlockFieldNames(block))
        .filter(field => !kept.has(field))
    );
    if (dropped.size === 0) return formValues;
    return Object.fromEntries(Object.entries(formValues).filter(([field]) => !dropped.has(field)));
  };

  // Submit function
  const submit = async (overrideValues?: Record<string, any>) => {
    setIsSubmitting(true);

    updateComputedValues();

    const hasErrors = false;
    const allFields = pages.flat()
      .filter(block => block.fieldName)
      .map(block => block.fieldName as string);

    // Use override values if provided, otherwise use state values. Only the
    // answers on the path those values lead through are sent.
    const finalValues = keepFinalPathAnswers(overrideValues || values);

    // const newConditionalErrors: Record<string, string> = {};

    // allFields.forEach(field => {
    //   const value = finalValues[field];
    //   const validationError = validateField(field, value);
    //   if (validationError) {
    //     newConditionalErrors[field] = validationError;
    //     hasErrors = true;
    //   }
    // });

    // setConditionalErrors(newConditionalErrors);

    if (!hasErrors && Object.keys(errors).length === 0) {
      if (onSubmit) {
        try {
          const submissionData = {
            ...finalValues,
            ...computedValues
          };
          await onSubmit(submissionData);
        } catch (error) {
          console.error("Error during form submission:", error);
        }
      }
    }

    setIsSubmitting(false);
  };

  // Moving forward onto a block the host skips continues past it, once per arrival.
  // Checking only on arrival lets the user edit a bound field without being moved on.
  const skipCheckedArrivalRef = useRef<string | null>(null);
  const arrivalBlock = (pages[currentPage] || [])[currentBlockIndex];
  const arrivalKey = `${navigationHistory.length}:${currentPage}:${arrivalBlock?.uuid ?? currentBlockIndex}`;
  // Reads this render's state; the effect below runs it only when the arrival changes
  const handleArrivalRef = useRef<(key: string) => void>(() => {});
  handleArrivalRef.current = (key: string) => {
    if (skipCheckedArrivalRef.current === key) return;
    skipCheckedArrivalRef.current = key;
    if (navigationDirectionRef.current === 'back' || isSubmitting) return;
    if (!isPageStep && isBlockSkippedByExternal(arrivalBlock)) {
      if (enableDebug) console.log('[SurveyFormContext] Skipping block filled from external values:', arrivalBlock?.uuid);
      goToNextBlock();
    } else if (isStepHidden(currentPage, currentBlockIndex)) {
      if (enableDebug) console.log('[SurveyFormContext] Skipping hidden step:', currentPage, currentBlockIndex);
      goToNextBlock();
    }
  };
  useEffect(() => {
    handleArrivalRef.current(arrivalKey);
  }, [arrivalKey]);

  // Merge regular errors with conditional errors for display
  const mergedErrors = { ...errors, ...conditionalErrors };

  return (
    <SurveyFormContext.Provider
      value={{
        values,
        setValue,
        errors: mergedErrors,
        setError,
        currentPage,
        currentBlockIndex,
        totalPages,
        goToPage,
        goToNextPage,
        goToPreviousPage,
        goToNextBlock,
        goToPreviousBlock,
        isFirstPage,
        isLastPage,
        isSubmitting,
        isValid,
        submit,
        language: currentLanguage,
        setLanguage: setCurrentLanguage,
        theme: theme ?? themes.default,
        surveyData,
        conditionalErrors,
        computedValues,
        updateComputedValues,
        evaluateCondition: evaluateConditionWithContext,
        getNextPageIndex,
        getVisibleBlocks,
        validateField,
        enableDebug,
        navigationHistory,
        canGoBack,
        getActualProgress,
        getTotalVisibleSteps,
        getCurrentStepPosition,
        isCurrentPageValid,
        logo,
        abTestPreviewMode,
        analytics,
        customData,
        blockOverrides,
        externalValues,
        setExternalValues,
        pages,
        isPageStep,
        currentPageNode: pageNodes[currentPage],
        currentStepBlocks,
      }}
    >
      {children}
    </SurveyFormContext.Provider>
  );
};

// Hook to use the survey form context
export const useSurveyForm = () => useContext(SurveyFormContext);
