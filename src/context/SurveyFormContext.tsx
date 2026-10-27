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
import { getSurveyPages, getSurveyPageIds, evaluateLogic, detectSurveyMode } from "../utils/surveyUtils";
import type { BlockOverrides, SurveyMode } from "../types";
import { validationRuleToFunction } from "../builder/common/validation-rules-types";
import {
  evaluateCondition,
  isBlockVisible,
  executeCalculation,
  getNextPageIndex as calculateNextPageIndex,
  getNextPageFromNavigationRules,
  getNextStepFromNavigationRules
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
}

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
  const pages = getSurveyPages(surveyData.rootNode, surveyMode);
  const pageIds = getSurveyPageIds(surveyData.rootNode, surveyMode);
  const totalPages = Math.max(1, pages.length);

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

  // Helper function to check if a block should be skipped when navigating back
  const shouldSkipBlockOnBack = useCallback((pageUuid: string, blockUuid?: string): boolean => {
    const pageIndex = getPageIndexByUuid(pageUuid);
    if (pageIndex < 0 || pageIndex >= pages.length) return false;

    if (!blockUuid) return false;

    const pageBlocks = pages[pageIndex] || [];
    const block = pageBlocks.find(b => b.uuid === blockUuid);

    // A block the host skips going forward is stepped over going back too
    if (isBlockSkippedByExternal(block)) return true;

    if (!block || block.type !== 'auth') return false;

    // Check if this is an auth block with skipIfLoggedIn enabled
    const skipIfLoggedIn = (block as any).skipIfLoggedIn;
    if (!skipIfLoggedIn) return false;

    // Check if user is actually logged in (avoiding localStorage in example)
    // const storageKey = (block as any).tokenStorageKey || 'authToken';
    // const existingToken = localStorage.getItem(storageKey);
    // return !!existingToken;

    return false; // Simplified for this example
  }, [pages, getPageIndexByUuid, isBlockSkippedByExternal]);

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
    const blockUuid = getBlockUuidByIndex(pageIndex, blockIndex);

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
          lastEntry.blockUuid === blockUuid) {
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
  }, [getPageUuidByIndex, getBlockUuidByIndex]);

  // Get visible blocks for current state
  const getVisibleBlocks = useCallback((blocks: BlockData[]): BlockData[] => {
    return blocks.filter(block => {
      if (!block.visibleIf) return true;
      return isBlockVisible(block, { ...externalRuleContext, ...values, ...computedValues });
    });
  }, [externalRuleContext, values, computedValues]);

  // Find the longest path from start to submit/end using memoized DP (O(n))
  // Each block is computed once and cached — no exponential backtracking
  const getLongestPathLength = useCallback((): number => {
    const allBlocks = pages.flat();
    if (allBlocks.length === 0) return 0;

    const blockByUuid = new Map(allBlocks.map(b => [b.uuid, b]));
    const memo = new Map<string, number>();
    const inStack = new Set<string>(); // cycle detection

    const dfs = (block: BlockData): number => {
      if (!block.uuid) return 1;
      if (memo.has(block.uuid)) return memo.get(block.uuid)!;
      if (inStack.has(block.uuid)) return 0; // cycle — stop

      if (block.isEndBlock || block.nextBlockId === 'submit') {
        memo.set(block.uuid, 1);
        return 1;
      }

      inStack.add(block.uuid);
      const idx = allBlocks.findIndex(b => b.uuid === block.uuid);
      let maxChild = 0;

      // Collect all possible successors
      const nextUuids = new Set<string>();

      if (block.nextBlockId && block.nextBlockId !== 'submit') {
        nextUuids.add(block.nextBlockId);
      }

      if (block.navigationRules) {
        for (const rule of block.navigationRules) {
          if (rule.target && rule.target !== 'submit') {
            nextUuids.add(rule.target);
          }
        }
      }

      if (!block.nextBlockId && idx >= 0 && idx < allBlocks.length - 1) {
        const seqNext = allBlocks[idx + 1];
        if (seqNext.uuid) nextUuids.add(seqNext.uuid);
      }

      for (const uuid of nextUuids) {
        const nextBlock = blockByUuid.get(uuid);
        if (nextBlock) {
          maxChild = Math.max(maxChild, dfs(nextBlock));
        }
      }

      inStack.delete(block.uuid);
      const result = 1 + maxChild;
      memo.set(block.uuid, result);
      return result;
    };

    return dfs(allBlocks[0]);
  }, [pages]);

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

  const getNextPageIndex = useCallback((): number | null => {
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
        { ...externalRuleContext, ...values, ...computedValues },
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
      { ...externalRuleContext, ...values, ...computedValues }
    );
    if (navIndex !== null) {
      return navIndex === -1 ? null : navIndex;
    }

    return currentPage + 1 < totalPages ? currentPage + 1 : null;
  }, [currentPage, pages, totalPages, externalRuleContext, values, computedValues]);

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
  
  // Use block-level validation for steppers, page-level for others
  const isValid = isCurrentBlockValid;

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
    const currentBlock = pageBlocks[currentBlockIndex];

    // The block's mapped output keys come from its answer, so navigation rules on
    // them see this answer too
    const answer = fValue ? { ...values, ...fValue }[currentBlock?.fieldName ?? ''] : undefined;
    const update = fValue ? { ...fValue, ...expandBlockValue(currentBlock, answer) } : undefined;
    const mergedValues = update ? { ...values, ...update } : values;

    if (update) {
      setValues(prev => ({ ...prev, ...update }));
    }

    // Validate the current fields against the values being submitted before any
    // navigation or submission. Auto-continue calls this synchronously right after
    // the selection, so the `values` render snapshot may not include the new
    // answer yet; `mergedValues` always does.
    const fieldNames = getBlockFieldNames(currentBlock);
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

    if (currentBlock?.isEndBlock) {
      submit(mergedValues);
      return;
    }

    const target = getNextStepFromNavigationRules(
      currentBlock,
      pages,
      pageIds,
      { ...externalRuleContext, ...mergedValues, ...computedValues }
    );

    if (target === 'submit') {
      submit(mergedValues);
      return;
    }

    if (target) {
      addToNavigationHistory(target.pageIndex, target.blockIndex, 'forward');
      setCurrentPage(target.pageIndex);
      setCurrentBlockIndex(target.blockIndex);
      
      if (onPageChange) {
        onPageChange(target.pageIndex, totalPages);
      }
      return;
    }

    if (currentBlockIndex < pageBlocks.length - 1) {
      const newBlockIndex = currentBlockIndex + 1;
      addToNavigationHistory(currentPage, newBlockIndex, 'forward');
      setCurrentBlockIndex(newBlockIndex);
      return;
    }

    const nextIndex = getNextPageIndex();
    if (nextIndex === null) {
      // Pass the merged values to submit to avoid race conditions
      submit(mergedValues);
    } else {
      addToNavigationHistory(nextIndex, 0, 'forward');
      goToPage(nextIndex);
    }
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

  // Submit function
  const submit = async (overrideValues?: Record<string, any>) => {
    setIsSubmitting(true);

    updateComputedValues();

    const hasErrors = false;
    const allFields = pages.flat()
      .filter(block => block.fieldName)
      .map(block => block.fieldName as string);

    // Use override values if provided, otherwise use state values
    const finalValues = overrideValues || values;

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
    if (isBlockSkippedByExternal(arrivalBlock)) {
      if (enableDebug) console.log('[SurveyFormContext] Skipping block filled from external values:', arrivalBlock?.uuid);
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
      }}
    >
      {children}
    </SurveyFormContext.Provider>
  );
};

// Hook to use the survey form context
export const useSurveyForm = () => useContext(SurveyFormContext);
