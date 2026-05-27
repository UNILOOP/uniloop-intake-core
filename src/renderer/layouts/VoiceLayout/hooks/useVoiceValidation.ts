import { useState, useCallback, useRef } from 'react';
import type { BlockData } from '../../../../types';
import type {
  VoiceValidationOption,
  VoiceValidationResponse,
  VoiceValidationRequest,
  VoiceValidationHandler,
  MultiSelectVoiceState,
} from '../types';

interface UseVoiceValidationOptions {
  onConfirmationNeeded?: (message: string) => void;
  onValidationComplete?: (values: string[], labels: string[]) => void;
  onReaskNeeded?: (reason: string) => void;
  /**
   * Custom validation handler. If provided, this will be used instead of the API call.
   * If neither this nor apiEndpoint is provided, basic local matching will be used.
   */
  validationHandler?: VoiceValidationHandler;
  /**
   * @deprecated Use validationHandler instead. This will only be used if validationHandler is not provided.
   */
  apiEndpoint?: string;
}

interface UseVoiceValidationReturn {
  validateAnswer: (
    transcript: string,
    block: BlockData,
    isConfirmation?: boolean,
    previousSelections?: string[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => Promise<VoiceValidationResponse>;
  multiSelectState: MultiSelectVoiceState;
  resetMultiSelectState: () => void;
  addToSelection: (value: string, label: string) => void;
  removeFromSelection: (value: string) => void;
  confirmSelection: () => void;
  isValidating: boolean;
}

/**
 * Extract options from a block
 */
function extractOptionsFromBlock(block: BlockData): VoiceValidationOption[] {
  const options: VoiceValidationOption[] = [];

  if (block.options && Array.isArray(block.options)) {
    for (const opt of block.options) {
      if (typeof opt === 'object' && opt !== null) {
        options.push({
          id: opt.id,
          label: opt.label || String(opt.value || opt),
          value: String(opt.value ?? opt.label ?? opt),
        });
      } else if (typeof opt === 'string') {
        options.push({ label: opt, value: opt });
      }
    }
  } else if (block.items && Array.isArray(block.items)) {
    for (const item of block.items as any[]) {
      if (typeof item === 'object' && item !== null) {
        options.push({
          id: item.id,
          label: item.label || String(item.value || item),
          value: String(item.value ?? item.label ?? item),
        });
      } else if (typeof item === 'string') {
        options.push({ label: item, value: item });
      }
    }
  } else if (block.labels && Array.isArray(block.labels)) {
    const values = block.values as string[] | undefined;
    block.labels.forEach((label, i) => {
      options.push({
        label: String(label),
        value: values?.[i] ?? String(label),
      });
    });
  }

  return options;
}

/**
 * Check if a block is multi-select
 */
function isMultiSelectBlock(block: BlockData): boolean {
  return (
    block.type === 'checkbox' ||
    block.multiSelect === true ||
    block.type === 'multiselect'
  );
}

/**
 * Local validation fallback using simple string matching.
 * Used when no custom validation handler or API endpoint is provided.
 */
function localValidation(request: VoiceValidationRequest): VoiceValidationResponse {
  const { transcript, options, multiSelect, previousSelections = [] } = request;
  const normalizedTranscript = transcript.toLowerCase().trim();

  // Check for "done" / "finished" / "that's all" patterns for multi-select
  const donePatterns = /^(done|finished|that'?s?\s*(all|it)|no\s*more|i'?m\s*done|nothing\s*else|submit)$/i;
  if (multiSelect && previousSelections.length > 0 && donePatterns.test(normalizedTranscript)) {
    const matchedOptions = options.filter(opt => previousSelections.includes(opt.value));
    return {
      success: true,
      isValid: true,
      matchedOptions,
      matchedValues: previousSelections,
      confidence: 'high',
      needsConfirmation: false,
      suggestedAction: 'finish_multiselect',
    };
  }

  // Try exact match first
  const exactMatch = options.find(
    opt => opt.label.toLowerCase() === normalizedTranscript ||
           opt.value.toLowerCase() === normalizedTranscript
  );

  if (exactMatch) {
    const matchedValues = multiSelect
      ? [...new Set([...previousSelections, exactMatch.value])]
      : [exactMatch.value];
    const matchedOptions = options.filter(opt => matchedValues.includes(opt.value));

    return {
      success: true,
      isValid: true,
      matchedOptions,
      matchedValues,
      confidence: 'high',
      needsConfirmation: multiSelect,
      confirmationMessage: multiSelect
        ? `You selected ${exactMatch.label}. Would you like to add more or say "done" to continue?`
        : undefined,
      suggestedAction: multiSelect ? 'confirm' : 'submit',
    };
  }

  // Try partial/fuzzy match
  const partialMatch = options.find(
    opt => normalizedTranscript.includes(opt.label.toLowerCase()) ||
           opt.label.toLowerCase().includes(normalizedTranscript)
  );

  if (partialMatch) {
    const matchedValues = multiSelect
      ? [...new Set([...previousSelections, partialMatch.value])]
      : [partialMatch.value];
    const matchedOptions = options.filter(opt => matchedValues.includes(opt.value));

    return {
      success: true,
      isValid: true,
      matchedOptions,
      matchedValues,
      confidence: 'medium',
      needsConfirmation: true,
      confirmationMessage: `Did you mean "${partialMatch.label}"? ${multiSelect ? 'Say yes, or add more options, or "done" to continue.' : 'Say yes to confirm.'}`,
      suggestedAction: 'confirm',
    };
  }

  // Try number-based selection (e.g., "option 1", "the first one", "number 2")
  const numberMatch = normalizedTranscript.match(/(?:option\s*)?(\d+)|(?:the\s*)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)/i);
  if (numberMatch) {
    const numberWords: Record<string, number> = {
      'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3,
      'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5,
    };
    const index = numberMatch[1]
      ? parseInt(numberMatch[1], 10) - 1
      : numberWords[numberMatch[2]?.toLowerCase() || ''] - 1;

    if (index >= 0 && index < options.length) {
      const matchedOption = options[index];
      const matchedValues = multiSelect
        ? [...new Set([...previousSelections, matchedOption.value])]
        : [matchedOption.value];
      const matchedOptions = options.filter(opt => matchedValues.includes(opt.value));

      return {
        success: true,
        isValid: true,
        matchedOptions,
        matchedValues,
        confidence: 'medium',
        needsConfirmation: true,
        confirmationMessage: `You selected "${matchedOption.label}". ${multiSelect ? 'Would you like to add more or say "done" to continue?' : 'Is that correct?'}`,
        suggestedAction: 'confirm',
      };
    }
  }

  // No match found
  const optionsList = options.slice(0, 5).map(o => o.label).join(', ');
  return {
    success: true,
    isValid: false,
    matchedOptions: [],
    matchedValues: [],
    confidence: 'low',
    needsConfirmation: false,
    invalidReason: `I couldn't match "${transcript}" to any option. Available options include: ${optionsList}${options.length > 5 ? '...' : ''}`,
    suggestedAction: 'reask',
  };
}

/**
 * Hook for validating voice answers.
 * Uses custom validation handler if provided, otherwise falls back to local matching.
 */
export function useVoiceValidation(
  options: UseVoiceValidationOptions = {}
): UseVoiceValidationReturn {
  const {
    onConfirmationNeeded,
    onValidationComplete,
    onReaskNeeded,
    validationHandler,
    apiEndpoint,
  } = options;

  const [isValidating, setIsValidating] = useState(false);
  const [multiSelectState, setMultiSelectState] = useState<MultiSelectVoiceState>({
    isActive: false,
    selectedValues: [],
    selectedLabels: [],
    awaitingConfirmation: false,
    awaitingMoreSelections: false,
  });

  // Track options for current block
  const currentOptionsRef = useRef<VoiceValidationOption[]>([]);

  const resetMultiSelectState = useCallback(() => {
    setMultiSelectState({
      isActive: false,
      selectedValues: [],
      selectedLabels: [],
      awaitingConfirmation: false,
      awaitingMoreSelections: false,
    });
  }, []);

  const addToSelection = useCallback((value: string, label: string) => {
    setMultiSelectState((prev) => {
      if (prev.selectedValues.includes(value)) {
        return prev;
      }
      return {
        ...prev,
        selectedValues: [...prev.selectedValues, value],
        selectedLabels: [...prev.selectedLabels, label],
      };
    });
  }, []);

  const removeFromSelection = useCallback((value: string) => {
    setMultiSelectState((prev) => {
      const index = prev.selectedValues.indexOf(value);
      if (index === -1) return prev;
      return {
        ...prev,
        selectedValues: prev.selectedValues.filter((_, i) => i !== index),
        selectedLabels: prev.selectedLabels.filter((_, i) => i !== index),
      };
    });
  }, []);

  const confirmSelection = useCallback(() => {
    setMultiSelectState((prev) => ({
      ...prev,
      awaitingConfirmation: false,
      awaitingMoreSelections: false,
    }));
    if (onValidationComplete) {
      onValidationComplete(multiSelectState.selectedValues, multiSelectState.selectedLabels);
    }
  }, [multiSelectState.selectedValues, multiSelectState.selectedLabels, onValidationComplete]);

  const validateAnswer = useCallback(
    async (
      transcript: string,
      block: BlockData,
      isConfirmation: boolean = false,
      previousSelections?: string[],
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<VoiceValidationResponse> => {
      setIsValidating(true);

      try {
        const blockOptions = extractOptionsFromBlock(block);
        currentOptionsRef.current = blockOptions;

        const multiSelect = isMultiSelectBlock(block);

        // Use passed previousSelections or fall back to internal state
        const selections = previousSelections ?? multiSelectState.selectedValues;

        // If this is multi-select and we're awaiting confirmation, handle that
        if (multiSelect && (multiSelectState.awaitingConfirmation || (selections.length > 0 && isConfirmation))) {
          isConfirmation = true;
        }

        const requestBody: VoiceValidationRequest = {
          transcript,
          options: blockOptions,
          multiSelect,
          questionLabel: block.label || block.name,
          blockType: block.type,
          previousSelections: selections,
          isConfirmation,
          conversationHistory,
        };

        // Determine which validation method to use
        let result: VoiceValidationResponse;

        if (validationHandler) {
          // Use custom validation handler (includes schema if needed)
          result = await validationHandler({
            ...requestBody,
            // Pass schema info for custom handlers that need it
            outputSchema: block.outputSchema,
            inputSchema: block.inputSchema,
          } as VoiceValidationRequest & { outputSchema?: unknown; inputSchema?: unknown });
        } else if (apiEndpoint) {
          // Use deprecated API endpoint (for backwards compatibility)
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...requestBody,
              outputSchema: block.outputSchema,
              inputSchema: block.inputSchema,
            }),
          });

          if (!response.ok) {
            throw new Error('Validation request failed');
          }

          result = await response.json();
        } else {
          // Use local validation fallback (no external dependencies)
          result = localValidation(requestBody);
        }

        // Handle different suggested actions
        if (result.suggestedAction === 'submit' && result.isValid) {
          // Single select or final submission
          if (multiSelect) {
            // For multi-select, merge with existing selections (use passed previousSelections)
            const allValues = [...new Set([...selections, ...result.matchedValues])];
            const existingLabels = currentOptionsRef.current
              .filter(opt => selections.includes(opt.value))
              .map(opt => opt.label);
            const allLabels = [...new Set([...existingLabels, ...result.matchedOptions.map(o => o.label)])];

            setMultiSelectState({
              isActive: false,
              selectedValues: allValues,
              selectedLabels: allLabels,
              awaitingConfirmation: false,
              awaitingMoreSelections: false,
            });

            if (onValidationComplete) {
              onValidationComplete(allValues, allLabels);
            }
          }
          return result;
        }

        if (result.suggestedAction === 'confirm' && result.needsConfirmation) {
          // Need to confirm selection
          if (multiSelect) {
            // Merge selections - use passed previousSelections (from VoiceLayout's pendingValidation)
            // NOT the hook's internal multiSelectState.selectedValues
            const allValues = [...new Set([...selections, ...result.matchedValues])];
            const existingLabels = currentOptionsRef.current
              .filter(opt => selections.includes(opt.value))
              .map(opt => opt.label);
            const allLabels = [...new Set([...existingLabels, ...result.matchedOptions.map(o => o.label)])];

            setMultiSelectState({
              isActive: true,
              selectedValues: allValues,
              selectedLabels: allLabels,
              awaitingConfirmation: true,
              awaitingMoreSelections: false,
            });
          } else {
            setMultiSelectState(prev => ({
              ...prev,
              awaitingConfirmation: true,
            }));
          }

          if (onConfirmationNeeded && result.confirmationMessage) {
            onConfirmationNeeded(result.confirmationMessage);
          }
          return result;
        }

        if (result.suggestedAction === 'add_more') {
          // User wants to add more selections
          setMultiSelectState((prev) => ({
            ...prev,
            isActive: true,
            awaitingConfirmation: false,
            awaitingMoreSelections: true,
          }));

          if (onConfirmationNeeded && result.confirmationMessage) {
            onConfirmationNeeded(result.confirmationMessage);
          }
          return result;
        }

        if (result.suggestedAction === 'reask' || !result.isValid) {
          // Invalid answer, need to reask
          if (onReaskNeeded && result.invalidReason) {
            onReaskNeeded(result.invalidReason);
          }
          return result;
        }

        return result;
      } catch (error) {
        console.error('Voice validation error:', error);
        return {
          success: false,
          isValid: false,
          matchedOptions: [],
          matchedValues: [],
          confidence: 'low',
          needsConfirmation: false,
          invalidReason: 'Failed to validate your answer. Please try again.',
          suggestedAction: 'reask',
        };
      } finally {
        setIsValidating(false);
      }
    },
    [validationHandler, apiEndpoint, multiSelectState, onConfirmationNeeded, onValidationComplete, onReaskNeeded]
  );

  return {
    validateAnswer,
    multiSelectState,
    resetMultiSelectState,
    addToSelection,
    removeFromSelection,
    confirmSelection,
    isValidating,
  };
}
