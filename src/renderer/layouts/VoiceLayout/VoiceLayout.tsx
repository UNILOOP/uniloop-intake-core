'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useSurveyForm } from '../../../context/SurveyFormContext';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';
import type { BlockData } from '../../../types';
import type {
  VoiceLayoutProps,
  VoiceCustomData,
  VoiceCommand,
  InputMode,
  VoiceLayoutMode,
} from './types';
import { classifyQuestion, matchVoiceToOption, hasBlockOptions } from './QuestionClassifier';
import { resolveBlockDefinition } from '../../../blocks';
import { useVoiceValidation } from './hooks/useVoiceValidation';
import { useVoiceSession, type VoiceSessionHandlers } from './hooks/useVoiceSession';
import { VoiceOrb } from './components/VoiceOrb';
import { OrbScreen } from './components/OrbScreen';
import { InputScreen } from './components/InputScreen';
import type { AIHandlerContext, AIHandlerResponse } from '../ChatLayout/types';

// Read-only block types (content only, no input required)
const READ_ONLY_BLOCK_TYPES = [
  'markdown',
  'html',
  'heading',
  'divider',
  'spacer',
  'image',
];

// Helper to check if a block is read-only
const isReadOnlyBlock = (block: BlockData): boolean => {
  return (
    READ_ONLY_BLOCK_TYPES.includes(block.type) ||
    (!block.fieldName && !block.name)
  );
};

// Helper to get display content from read-only blocks
const getReadOnlyContent = (block: BlockData): string => {
  if (block.type === 'markdown') {
    return block.text || block.content || '';
  }
  if (block.type === 'html') {
    const htmlContent = block.html || block.content || '';
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent || '[HTML Content]';
  }
  if (block.type === 'heading') {
    return block.text || block.label || '';
  }
  if (block.type === 'image') {
    return block.alt || block.label || '[Image]';
  }
  return block.label || block.text || '[Content Block]';
};

/**
 * Default AI handler that simply returns the block label without any API call.
 * This makes VoiceLayout work out of the box without requiring a backend.
 * For conversational AI rephrasing, provide a custom aiHandler via customData.
 */
const defaultAIHandler = async (context: AIHandlerContext): Promise<AIHandlerResponse> => {
  // Just return the block's label/name as-is - no API call needed
  const questionText = context.block.label || context.block.name || 'Please answer this question';

  // For option-based blocks, optionally list the options
  const options = getBlockOptions(context.block);
  if (options.length > 0 && options.length <= 5) {
    const optionsList = options.map(o => o.label).join(', ');
    return {
      conversationalQuestion: `${questionText} Options: ${optionsList}`,
    };
  }

  return {
    conversationalQuestion: questionText,
  };
};

/**
 * Helper to extract options from block
 */
function getBlockOptions(block: BlockData): Array<{ label: string; value: any }> {
  if (block.options && Array.isArray(block.options)) {
    return block.options.map((opt: any) => ({
      label: opt.label || String(opt.value || opt),
      value: opt.value ?? opt,
    }));
  }
  if (block.items && Array.isArray(block.items)) {
    return (block.items as any[]).map((item) => ({
      label: item.label || String(item.value || item),
      value: item.value ?? item,
    }));
  }
  if (block.labels && Array.isArray(block.labels)) {
    const values = block.values || block.labels;
    return block.labels.map((label, i) => ({
      label: String(label),
      value: values?.[i] ?? label,
    }));
  }
  return [];
}

/**
 * VoiceLayout Component
 *
 * A full-screen immersive voice survey experience with two distinct modes:
 * - AI Speaking Mode (OrbScreen): Full-screen orb with animated text
 * - User Input Mode (InputScreen): Block renderer for user responses
 */
export const VoiceLayout: React.FC<VoiceLayoutProps> = ({
  welcomeMessage: propWelcomeMessage,
  completionMessage: propCompletionMessage,
  autoListen: propAutoListen,
  containerClassName,
  orbStyle: propOrbStyle,
}) => {
  const {
    currentPage,
    currentBlockIndex,
    values,
    setValue,
    errors,
    goToNextBlock,
    goToPreviousBlock,
    isSubmitting,
    isValid,
    isLastPage,
    theme,
    surveyData,
    customData,
    blockOverrides,
    getVisibleBlocks,
    getTotalVisibleSteps,
    getCurrentStepPosition,
  } = useSurveyForm();

  // Voice configuration from customData
  // VoiceCustomData already includes all options (orbStyle, aiHandler, typingDelay, handlers, etc.)
  const voiceCustomData = customData as VoiceCustomData | undefined;

  // Resolve props with customData fallbacks
  const welcomeMessage =
    propWelcomeMessage ||
    voiceCustomData?.welcomeMessage ||
    "Hi! I'm here to help you complete this survey. Let's get started.";
  const completionMessage =
    propCompletionMessage ||
    voiceCustomData?.completionMessage ||
    'Thank you for completing the survey!';
  const autoListen = propAutoListen ?? voiceCustomData?.autoListen ?? true;
  // Note: silenceTimeout and maxListenTime are passed through customData to useVoiceSession
  const orbStyle = propOrbStyle ?? voiceCustomData?.orbStyle ?? 'breathe';
  const aiHandler = voiceCustomData?.aiHandler || defaultAIHandler;
  const typingDelay = voiceCustomData?.typingDelay ?? 300;

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<VoiceLayoutMode>('welcome');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentInputMode, setCurrentInputMode] = useState<InputMode>('hybrid');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingValidation, setPendingValidation] = useState<{
    values: string[];
    labels: string[];
  } | null>(null);

  // Refs
  const askedBlocksRef = useRef<Set<string>>(new Set());
  const lastQuestionRef = useRef<string>('');
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  // Track if we're navigating backwards (to skip AI speaking on back navigation)
  const isNavigatingBackRef = useRef<boolean>(false);
  // Store questions for each block to restore when going back
  const blockQuestionsRef = useRef<Map<string, string>>(new Map());

  // Track original value when navigating back (to detect if user changed it)
  const originalValueOnBackRef = useRef<{ blockId: string; value: unknown } | null>(null);
  // Track conversation history checkpoint for each block (index where block's conversation starts)
  const conversationCheckpointsRef = useRef<Map<string, number>>(new Map());
  // Track the submitted value for each block (to detect navigation target changes)
  const submittedValuesRef = useRef<Map<string, unknown>>(new Map());
  // Track visited blocks in order (to know which blocks to clear when going back)
  const visitedBlocksOrderRef = useRef<string[]>([]);
  // Track if we should skip AI speaking on next block (for forward nav with unchanged value)
  const skipNextAISpeakingRef = useRef<boolean>(false);

  // Refs for voice session functions (to break circular dependency)
  const speakRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve());
  const stopListeningRef = useRef<() => void>(() => {});
  const switchToVisualRef = useRef<() => void>(() => {});
  const handleBackRef = useRef<() => void>(() => {});

  // Voice validation hook for AI-powered answer matching
  // Pass custom validation handler from customData if provided
  const { validateAnswer, resetMultiSelectState } = useVoiceValidation({
    validationHandler: voiceCustomData?.validationHandler,
  });

  // Get current block info
  const surveyMode = detectSurveyMode(surveyData.rootNode);
  const pages = getSurveyPages(surveyData.rootNode, surveyMode);
  const currentPageBlocks = currentPage < pages.length ? pages[currentPage] : [];
  const visibleBlocks = getVisibleBlocks(currentPageBlocks);
  const currentBlock = visibleBlocks[currentBlockIndex] as BlockData | undefined;

  // Progress
  const totalQuestions = getTotalVisibleSteps?.() ?? pages.reduce(
    (acc, page) => acc + getVisibleBlocks(page).length,
    0
  );
  const currentQuestionIndex = getCurrentStepPosition?.() ?? 0;

  // Get block definition to check for disableAudioInput
  const currentBlockDefinition = currentBlock ? resolveBlockDefinition(currentBlock.type, blockOverrides) : undefined;

  // Check if audio input should be disabled (check both block instance and definition)
  const shouldDisableAudioInput =
    currentBlock?.disableAudioInput === true ||
    currentBlockDefinition?.disableAudioInput === true;

  // Check if this is the final step (will trigger submit)
  // This follows the same logic as RenderPageSurveyLayout
  const hasExplicitNavigation = (currentBlock?.nextBlockId && currentBlock.nextBlockId !== 'submit')
    || (currentBlock?.navigationRules && currentBlock.navigationRules.length > 0);
  const isFinalStep =
    currentBlock?.isEndBlock === true ||
    (isLastPage && currentBlockIndex === visibleBlocks.length - 1 && !hasExplicitNavigation);

  /**
   * Handle voice command
   */
  const handleVoiceCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command.type) {
        case 'navigate':
          if (command.payload?.direction === 'back') {
            // Use handleBackRef to go back without AI speaking
            handleBackRef.current();
          }
          break;
        case 'repeat':
          if (lastQuestionRef.current) {
            speakRef.current(lastQuestionRef.current);
            setLayoutMode('ai_speaking');
          }
          break;
        case 'skip':
          if (currentBlock && !currentBlock.required) {
            goToNextBlock();
            setLayoutMode('ai_speaking');
          }
          break;
        case 'stop':
          switchToVisualRef.current();
          setLayoutMode('user_input');
          break;
        default:
          break;
      }

      if (voiceCustomData?.onVoiceCommand) {
        voiceCustomData.onVoiceCommand(command);
      }
    },
    [currentBlock, goToNextBlock, voiceCustomData]
  );

  /**
   * Helper to check if value changed from original (when navigating back)
   */
  const didValueChange = useCallback((blockId: string, newValue: unknown): boolean => {
    const original = originalValueOnBackRef.current;
    if (!original || original.blockId !== blockId) {
      return true; // Not coming from back navigation, treat as changed
    }
    // Deep comparison for objects/arrays
    return JSON.stringify(original.value) !== JSON.stringify(newValue);
  }, []);

  /**
   * Helper to clear subsequent blocks' data when value changes after back navigation
   */
  const clearSubsequentBlocksData = useCallback((currentBlockId: string) => {
    const visitedOrder = visitedBlocksOrderRef.current;
    const currentIndex = visitedOrder.indexOf(currentBlockId);

    if (currentIndex === -1) return;

    // Get blocks that come after the current one
    const subsequentBlocks = visitedOrder.slice(currentIndex + 1);

    // Clear their data
    subsequentBlocks.forEach(blockId => {
      // Clear from submittedValuesRef
      submittedValuesRef.current.delete(blockId);

      // Clear conversation checkpoint
      conversationCheckpointsRef.current.delete(blockId);

      // Clear stored question
      blockQuestionsRef.current.delete(blockId);

      // Clear from askedBlocks so they can be asked again
      askedBlocksRef.current.delete(blockId);
    });

    // Truncate visitedBlocksOrder to current block
    visitedBlocksOrderRef.current = visitedOrder.slice(0, currentIndex + 1);

    // Clear form values for subsequent blocks
    // We need to find the fieldNames for these blocks and clear them
    subsequentBlocks.forEach(blockId => {
      // The blockId might be uuid or fieldName, try to clear the value
      setValue(blockId, undefined);
    });
  }, [setValue]);

  /**
   * Helper to proceed to next step or submit
   * Follows the same pattern as RenderPageSurveyLayout
   */
  const proceedToNextOrSubmit = useCallback(
    (fieldName: string, value: unknown) => {
      // Stop any ongoing listening to clear isListening and interimTranscript
      stopListeningRef.current();

      // Track the submitted value for this block
      const blockId = currentBlock?.uuid || currentBlock?.fieldName || fieldName;
      submittedValuesRef.current.set(blockId, value);

      // Clear original value ref since we're proceeding
      originalValueOnBackRef.current = null;

      if (!isFinalStep) {
        // Not final step - show AI speaking for next question
        setLayoutMode('ai_speaking');
      }

      // Let goToNextBlock handle submission on final step to avoid race condition
      // goToNextBlock will call submit() internally when it's the final step
      goToNextBlock({ [fieldName]: value });
    },
    [isFinalStep, goToNextBlock, currentBlock]
  );

  /**
   * Handle transcript from voice input
   */
  const handleTranscript = useCallback(
    async (transcript: string, isFinal: boolean) => {
      if (!currentBlock || !isFinal) {
        if (voiceCustomData?.onTranscript) {
          voiceCustomData.onTranscript(transcript, isFinal);
        }
        return;
      }

      const fieldName = currentBlock.fieldName || currentBlock.name || '';
      const blockType = currentBlock.type.toLowerCase();
      const blockId = currentBlock.uuid || fieldName;

      // If coming from back navigation, clear subsequent blocks' data
      // (voice input always provides new value, so we always need to handle this)
      if (originalValueOnBackRef.current?.blockId === blockId) {
        clearSubsequentBlocksData(blockId);
        originalValueOnBackRef.current = null;
      }

      // Get block definition to check for skipAIValidation
      const blockDefinition = resolveBlockDefinition(currentBlock.type, blockOverrides);

      // Check if AI validation should be skipped (check both block instance and definition)
      const shouldSkipAIValidation =
        currentBlock.skipAIValidation === true ||
        blockDefinition?.skipAIValidation === true;

      // If skipAIValidation is true, just use the transcript as-is
      if (shouldSkipAIValidation) {
        conversationHistoryRef.current.push({ role: 'user', content: transcript });
        setValue(fieldName, transcript);
        stopListeningRef.current();

        setTimeout(() => {
          proceedToNextOrSubmit(fieldName, transcript);
        }, 300);
        return;
      }

      // Check if this block has a schema for structured data extraction
      // Schema can be on the block instance OR on the block definition
      const blockSchema = currentBlock.outputSchema || currentBlock.inputSchema;
      const definitionSchema = blockDefinition?.outputSchema || blockDefinition?.inputSchema;
      const hasSchema = blockSchema || definitionSchema;

      // Merge schema from definition into block for validation API
      const blockWithSchema = {
        ...currentBlock,
        outputSchema: currentBlock.outputSchema || blockDefinition?.outputSchema,
        inputSchema: currentBlock.inputSchema || blockDefinition?.inputSchema,
      };

      // Check if this is an option-based block
      const optionBasedBlocks = ['radio', 'select', 'checkbox', 'selectablebox', 'multiselect', 'dropdown'];
      const isOptionBlock = optionBasedBlocks.includes(blockType) && hasBlockOptions(currentBlock);

      // Use schema-based validation for ALL blocks that have a schema (not just option-based)
      // This allows custom blocks like BMI calculator to use AI to extract structured data
      if (hasSchema && !isOptionBlock) {
        stopListeningRef.current();
        setLayoutMode('processing');

        try {
          // Get conversation history for this question (from checkpoint onwards)
          // This allows the LLM to have full context when user provides partial info
          const checkpoint = conversationCheckpointsRef.current.get(blockId) ?? 0;
          const questionConversationHistory = conversationHistoryRef.current.slice(checkpoint);

          const result = await validateAnswer(
            transcript,
            blockWithSchema,
            false,
            [],
            questionConversationHistory
          );

          // Check if this is a navigate back action
          if (result.suggestedAction === 'navigate_back') {
            // User wants to go back - trigger handleBack
            handleBackRef.current();
            return;
          }

          if (result.isValid && result.extractedData !== undefined && result.extractedData !== null) {
            // Successfully extracted structured data
            // Note: We check !== undefined/null to allow falsy values like 0, false, ""
            conversationHistoryRef.current.push({ role: 'user', content: transcript });
            setValue(fieldName, result.extractedData);

            setTimeout(() => {
              proceedToNextOrSubmit(fieldName, result.extractedData);
            }, 300);
            return;
          }

          if (!result.isValid || result.suggestedAction === 'reask') {
            // Couldn't extract complete data, ask for clarification
            // Add the user's partial response to conversation history so context is preserved
            conversationHistoryRef.current.push({ role: 'user', content: transcript });

            // If we have partial data, update the form value so UI shows what was captured
            // This provides immediate feedback to the user about what was understood
            if (result.partialData !== undefined && result.partialData !== null) {
              setValue(fieldName, result.partialData);
            }

            const reaskMessage = result.confirmationMessage ||
              "I couldn't understand your response. Could you please provide the information more clearly?";
            setCurrentQuestion(reaskMessage);
            conversationHistoryRef.current.push({ role: 'assistant', content: reaskMessage });
            setLayoutMode('ai_speaking');
            await speakRef.current(reaskMessage);
            return;
          }
        } catch (error) {
          console.error('Schema validation error:', error);
          const errorMessage = "I had trouble understanding. Could you please repeat that?";
          setCurrentQuestion(errorMessage);
          setLayoutMode('ai_speaking');
          await speakRef.current(errorMessage);
          return;
        }
      }

      if (isOptionBlock) {
        // Stop listening while we validate
        stopListeningRef.current();
        setLayoutMode('processing');

        try {
          // Merge visual selections (from form value) with voice pending selections
          // This enables hybrid input where user can select visually AND speak
          const currentFormValue = values[fieldName];
          const visualSelections = Array.isArray(currentFormValue) ? currentFormValue : [];
          const voicePendingSelections = pendingValidation?.values || [];
          const allPreviousSelections = [...new Set([...visualSelections, ...voicePendingSelections])];

          // Get conversation history for this question (from checkpoint onwards)
          const checkpoint = conversationCheckpointsRef.current.get(blockId) ?? 0;
          const questionConversationHistory = conversationHistoryRef.current.slice(checkpoint);

          // Use AI to validate the answer
          const result = await validateAnswer(
            transcript,
            currentBlock,
            awaitingConfirmation,
            allPreviousSelections,
            questionConversationHistory
          );

          // Check if this is a navigate back action
          if (result.suggestedAction === 'navigate_back') {
            // User wants to go back - trigger handleBack
            handleBackRef.current();
            return;
          }

          if (result.suggestedAction === 'submit' && result.isValid) {
            // Valid answer - submit it
            const isMulti = currentBlock.multiSelect === true || blockType === 'checkbox';
            const finalValue = isMulti ? result.matchedValues : result.matchedValues[0];

            // Build a confirmation message
            const selectedLabels = result.matchedOptions.map(o => o.label).join(', ');
            conversationHistoryRef.current.push({ role: 'user', content: selectedLabels });

            setValue(fieldName, finalValue);
            setAwaitingConfirmation(false);
            setPendingValidation(null);
            resetMultiSelectState();

            setTimeout(() => {
              proceedToNextOrSubmit(fieldName, finalValue);
            }, 300);
            return;
          }

          if (result.suggestedAction === 'confirm' && result.needsConfirmation) {
            // Need confirmation - speak the confirmation message
            // Check if this is a remove action or add action
            const isRemoveAction = result.action === 'remove';

            // Get labels for all previous selections (visual + voice)
            const blockOptions = getBlockOptions(currentBlock);
            const allPreviousLabels = allPreviousSelections.map(v => {
              const opt = blockOptions.find(o => o.value === v);
              return opt ? opt.label : String(v);
            });

            let newPendingValues: { values: string[]; labels: string[] };

            if (isRemoveAction) {
              // Remove the matched values from all previous selections (visual + voice)
              const valuesToRemove = new Set(result.matchedValues);
              const labelsToRemove = new Set(result.matchedOptions.map(o => o.label));
              newPendingValues = {
                values: allPreviousSelections.filter(v => !valuesToRemove.has(v)),
                labels: allPreviousLabels.filter(l => !labelsToRemove.has(l)),
              };
            } else {
              // Add - merge with all previous selections (visual + voice), using Set to avoid duplicates
              newPendingValues = {
                values: [...new Set([...allPreviousSelections, ...result.matchedValues])],
                labels: [...new Set([...allPreviousLabels, ...result.matchedOptions.map(o => o.label)])],
              };
            }

            setPendingValidation(newPendingValues);
            setAwaitingConfirmation(true);

            // Update the form value so block renderer shows selections
            const isMulti = currentBlock.multiSelect === true || blockType === 'checkbox';
            if (isMulti) {
              setValue(fieldName, newPendingValues.values);
            }

            // Build confirmation message based on action
            const changedItems = result.matchedOptions.map(o => o.label).join(', ');
            let confirmMessage: string;

            if (result.confirmationMessage) {
              confirmMessage = result.confirmationMessage;
            } else if (isRemoveAction) {
              if (newPendingValues.values.length === 0) {
                confirmMessage = `Removed ${changedItems}. You have no options selected. Which option would you like to choose?`;
              } else {
                confirmMessage = `Removed ${changedItems}. You now have ${newPendingValues.labels.join(', ')} selected. Would you like to make more changes, or say "done" to continue?`;
              }
            } else {
              confirmMessage = newPendingValues.values.length > result.matchedValues.length
                ? `Added ${changedItems}. You now have ${newPendingValues.labels.join(', ')} selected. Would you like to add more, or say "done" to continue?`
                : `You selected ${changedItems}. Would you like to add more, or say "done" to continue?`;
            }

            setCurrentQuestion(confirmMessage);
            conversationHistoryRef.current.push({ role: 'assistant', content: confirmMessage });
            setLayoutMode('ai_speaking');
            await speakRef.current(confirmMessage);
            return;
          }

          if (result.suggestedAction === 'add_more') {
            // User wants to add more to multi-select
            // Keep the existing pending values (result.matchedValues contains the previous selections)
            const newPendingValues = {
              values: [...new Set([...result.matchedValues])],
              labels: [...new Set([...result.matchedOptions.map(o => o.label)])],
            };
            setPendingValidation(newPendingValues);
            // Set to false so next voice input is treated as new option selection, not confirmation
            setAwaitingConfirmation(false);

            // Update the form value so block renderer shows already selected options
            setValue(fieldName, newPendingValues.values);

            const addMoreMessage = result.confirmationMessage ||
              `Which additional option would you like to add? Or say "done" to continue.`;
            setCurrentQuestion(addMoreMessage);
            conversationHistoryRef.current.push({ role: 'assistant', content: addMoreMessage });
            setLayoutMode('ai_speaking');
            await speakRef.current(addMoreMessage);
            return;
          }

          // Handle "done" / "finished" / "that's all" when user has pending selections
          if (result.suggestedAction === 'finish_multiselect' && pendingValidation && pendingValidation.values.length > 0) {
            // User is done selecting - submit the pending values
            const isMulti = currentBlock.multiSelect === true || blockType === 'checkbox';
            const finalValue = isMulti ? pendingValidation.values : pendingValidation.values[0];

            conversationHistoryRef.current.push({ role: 'user', content: pendingValidation.labels.join(', ') });
            setValue(fieldName, finalValue);
            setAwaitingConfirmation(false);
            setPendingValidation(null);
            resetMultiSelectState();

            setTimeout(() => {
              proceedToNextOrSubmit(fieldName, finalValue);
            }, 300);
            return;
          }

          if (result.suggestedAction === 'reask' || !result.isValid) {
            // Invalid answer - reask
            // Add the user's response to conversation history so context is preserved
            conversationHistoryRef.current.push({ role: 'user', content: transcript });
            const reaskMessage = result.invalidReason ||
              "I couldn't match your answer to any option. Please try again or select an option from the list.";
            setCurrentQuestion(reaskMessage);
            conversationHistoryRef.current.push({ role: 'assistant', content: reaskMessage });
            setLayoutMode('ai_speaking');
            await speakRef.current(reaskMessage);
            return;
          }
        } catch (error) {
          console.error('Voice validation error:', error);
          // Fallback to basic matching
          const match = matchVoiceToOption(transcript, currentBlock);
          if (match.matched) {
            conversationHistoryRef.current.push({ role: 'user', content: transcript });
            setValue(fieldName, match.value);
            setTimeout(() => {
              proceedToNextOrSubmit(fieldName, match.value);
            }, 300);
            return;
          }
          // If fallback also fails, show error
          const errorMessage = "I'm having trouble understanding. Please try again or select an option directly.";
          setCurrentQuestion(errorMessage);
          setLayoutMode('ai_speaking');
          await speakRef.current(errorMessage);
          return;
        }
      }

      // Use transcript as value for text blocks
      conversationHistoryRef.current.push({ role: 'user', content: transcript });
      setValue(fieldName, transcript);
      stopListeningRef.current();

      setTimeout(() => {
        proceedToNextOrSubmit(fieldName, transcript);
      }, 300);
    },
    [currentBlock, setValue, voiceCustomData, validateAnswer, awaitingConfirmation, pendingValidation, resetMultiSelectState, proceedToNextOrSubmit, clearSubsequentBlocksData, blockOverrides]
  );

  // Prepare session handlers from customData (including TTS/STT/MediaCapture)
  const sessionHandlers: VoiceSessionHandlers | undefined = (
    voiceCustomData?.sessionInitHandler ||
    voiceCustomData?.sessionEndHandler ||
    voiceCustomData?.ttsHandler ||
    voiceCustomData?.sttSessionFactory ||
    voiceCustomData?.mediaCaptureFactory
  ) ? {
    sessionInitHandler: voiceCustomData?.sessionInitHandler,
    sessionEndHandler: voiceCustomData?.sessionEndHandler,
    ttsHandler: voiceCustomData?.ttsHandler,
    sttSessionFactory: voiceCustomData?.sttSessionFactory,
    mediaCaptureFactory: voiceCustomData?.mediaCaptureFactory,
    language: voiceCustomData?.language,
    ttsVoice: voiceCustomData?.ttsVoice,
  } : undefined;

  // Voice session hook
  const {
    voiceState,
    sessionState,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    preconnectSTT,
    initSession,
    endSession,
    switchToVisual,
    switchToVoice,
    isListening,
    isSpeaking,
    volume,
  } = useVoiceSession(
    voiceCustomData?.sessionConfig || {},
    handleTranscript,
    handleVoiceCommand,
    voiceCustomData?.onStateChange,
    sessionHandlers
  );

  // Update refs with voice session functions
  useEffect(() => {
    speakRef.current = speak;
    stopListeningRef.current = stopListening;
    switchToVisualRef.current = switchToVisual;
  }, [speak, stopListening, switchToVisual]);

  /**
   * Ask the current question with AI rephrasing
   */
  const askQuestion = useCallback(
    async (block: BlockData) => {
      const blockId = block.uuid || block.fieldName || `block-${Date.now()}`;

      // Skip if already asked
      if (askedBlocksRef.current.has(blockId)) {
        return;
      }
      askedBlocksRef.current.add(blockId);

      // Save conversation checkpoint BEFORE adding this block's conversation
      // This allows us to truncate back to this point when user navigates back
      conversationCheckpointsRef.current.set(blockId, conversationHistoryRef.current.length);

      // Track visited blocks order for cleanup when navigating back
      const existingIndex = visitedBlocksOrderRef.current.indexOf(blockId);
      if (existingIndex === -1) {
        visitedBlocksOrderRef.current.push(blockId);
      }

      // Handle read-only blocks
      if (isReadOnlyBlock(block)) {
        const content = getReadOnlyContent(block);
        if (content && content !== '[Content Block]') {
          setCurrentQuestion(content);
          await speak(content);
        }

        setTimeout(() => {
          goToNextBlock();
        }, 500);
        return;
      }

      // Classify the question
      const classification = classifyQuestion(block);
      setCurrentInputMode(classification.inputMode);

      // Show loading state
      setCurrentQuestion('');
      setLayoutMode('ai_speaking');

      // Pre-connect STT WebSocket while AI is speaking
      // This ensures the connection is ready when user needs to speak
      preconnectSTT().catch(() => {
        // Non-fatal - connection will be established when user starts speaking
      });

      try {
        // Wait briefly for typing effect
        await new Promise((resolve) => setTimeout(resolve, typingDelay));

        // Get AI rephrased question
        const chatMessages = conversationHistoryRef.current.map((m) => ({
          id: `msg-${Math.random()}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(),
        }));

        const response = await aiHandler({
          block,
          previousResponses: values,
          conversationHistory: chatMessages,
          currentQuestionIndex,
          totalQuestions,
        });

        const questionText = response.conversationalQuestion;
        lastQuestionRef.current = questionText;
        setCurrentQuestion(questionText);

        // Store the question for this block (for back navigation)
        blockQuestionsRef.current.set(blockId, questionText);

        // Add to conversation history
        conversationHistoryRef.current.push({ role: 'assistant', content: questionText });

        // Speak the question using TTS handler (which returns streaming URL for fast playback)
        await speak(questionText);

        // Transition to input mode after speaking completes
        // The speaking state change will trigger this
      } catch (error) {
        console.error('Error generating question:', error);
        const fallbackQuestion = block.label || block.name || 'Please answer this question';
        lastQuestionRef.current = fallbackQuestion;
        setCurrentQuestion(fallbackQuestion);
      }
    },
    [
      aiHandler,
      speak,
      preconnectSTT,
      values,
      currentQuestionIndex,
      totalQuestions,
      typingDelay,
      goToNextBlock,
    ]
  );

  /**
   * Handle visual input submit
   */
  const handleVisualSubmit = useCallback(
    (value: unknown) => {
      if (!currentBlock) return;

      // Stop any ongoing listening to clear isListening and interimTranscript
      stopListeningRef.current();

      const fieldName = currentBlock.fieldName || currentBlock.name || '';
      const blockId = currentBlock.uuid || fieldName;

      // Check if this is from back navigation and value hasn't changed
      const valueChanged = didValueChange(blockId, value);

      if (!valueChanged) {
        // Value unchanged - skip AI validation and conversation update
        // Just proceed to next block with existing value
        originalValueOnBackRef.current = null;

        if (!isFinalStep) {
          // Skip AI speaking on next block since nothing changed
          skipNextAISpeakingRef.current = true;
        }

        // Let goToNextBlock handle submission on final step to avoid race condition
        goToNextBlock({ [fieldName]: value });
        return;
      }

      // Value changed - clear subsequent blocks' data and re-add AI question to conversation
      const isFromBackNavigation = originalValueOnBackRef.current?.blockId === blockId;
      if (isFromBackNavigation) {
        clearSubsequentBlocksData(blockId);

        // Re-add the AI question to conversation history (it was removed during back navigation truncation)
        const storedQuestion = blockQuestionsRef.current.get(blockId);
        if (storedQuestion) {
          conversationHistoryRef.current.push({ role: 'assistant', content: storedQuestion });
        }
      }

      // Format display value for conversation history
      // For option-based blocks, use labels instead of raw values (which might be random IDs)
      // For objects, format as readable key-value pairs so AI can understand the data
      let displayValue: string;
      const blockOptions = getBlockOptions(currentBlock);

      if (blockOptions.length > 0) {
        // This is an option-based block - map values to labels
        if (Array.isArray(value)) {
          // Multi-select: map each value to its label
          const labels = value.map(v => {
            const option = blockOptions.find(opt => opt.value === v);
            return option ? option.label : String(v);
          });
          displayValue = labels.join(', ');
        } else {
          // Single select: find the label for this value
          const option = blockOptions.find(opt => opt.value === value);
          displayValue = option ? option.label : String(value);
        }
      } else if (Array.isArray(value)) {
        // Non-option block with array value
        displayValue = value.map(v =>
          typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
        ).join(', ');
      } else if (typeof value === 'object' && value !== null) {
        // Object value (e.g., multi-field schema like { firstName, lastName })
        // Format as readable key-value pairs for AI context
        const entries = Object.entries(value as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([key, v]) => `${key}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        displayValue = entries.length > 0 ? entries.join(', ') : JSON.stringify(value);
      } else {
        displayValue = String(value);
      }

      conversationHistoryRef.current.push({ role: 'user', content: displayValue });

      setValue(fieldName, value);

      // Track the submitted value
      submittedValuesRef.current.set(blockId, value);

      // Clear original value ref
      originalValueOnBackRef.current = null;

      if (!isFinalStep) {
        // Not the final step - show AI speaking for next question
        setLayoutMode('ai_speaking');
      }

      // Let goToNextBlock handle submission on final step to avoid race condition
      // goToNextBlock will call submit() internally when it's the final step
      goToNextBlock({ [fieldName]: value });
    },
    [currentBlock, setValue, goToNextBlock, isFinalStep, didValueChange, clearSubsequentBlocksData]
  );

  /**
   * Handle visual input change
   */
  const handleVisualChange = useCallback(
    (value: unknown) => {
      if (!currentBlock) return;
      const fieldName = currentBlock.fieldName || currentBlock.name || '';
      setValue(fieldName, value);
    },
    [currentBlock, setValue]
  );

  /**
   * Handle voice input toggle from InputScreen
   */
  const handleVoiceInputToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      switchToVoice();
      startListening();
    }
  }, [isListening, stopListening, switchToVoice, startListening]);

  /**
   * Handle back navigation
   * Goes directly to user_input mode without AI speaking
   */
  const handleBack = useCallback(() => {
    // Stop any ongoing listening to clear isListening and interimTranscript
    stopListening();
    // Set flag to skip AI speaking when block changes
    isNavigatingBackRef.current = true;
    // Go to previous block
    goToPreviousBlock();
  }, [goToPreviousBlock, stopListening]);

  // Update handleBackRef for use in handleTranscript
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  /**
   * Start the survey (user interaction required for TTS)
   */
  const handleStart = useCallback(async () => {
    await initSession(voiceCustomData?.sessionConfig);

    // Speak welcome message
    setCurrentQuestion(welcomeMessage);
    setLayoutMode('ai_speaking');
    conversationHistoryRef.current.push({ role: 'assistant', content: welcomeMessage });

    await speak(welcomeMessage);

    // Ask first question
    if (currentBlock) {
      askedBlocksRef.current.clear();
      askQuestion(currentBlock);
    }
  }, [initSession, voiceCustomData?.sessionConfig, welcomeMessage, speak, currentBlock, askQuestion]);

  /**
   * Handle skip speaking
   */
  const handleSkipSpeaking = useCallback(() => {
    stopSpeaking();
    setLayoutMode('user_input');
  }, [stopSpeaking]);

  // Initialize session on mount (but don't speak yet)
  useEffect(() => {
    initSession(voiceCustomData?.sessionConfig);

    return () => {
      endSession();
    };
  }, []);

  // Track speaking state for transitions
  const hasStartedSpeakingRef = useRef(false);
  const hasTransitionedRef = useRef(false);
  const hasStartedListeningRef = useRef(false);

  // Track when speaking starts
  useEffect(() => {
    if (isSpeaking && layoutMode === 'ai_speaking') {
      hasStartedSpeakingRef.current = true;
      hasStartedListeningRef.current = false;
    }
  }, [isSpeaking, layoutMode]);

  // Reset transition flags when question changes
  useEffect(() => {
    hasTransitionedRef.current = false;
    hasStartedSpeakingRef.current = false;
    hasStartedListeningRef.current = false;
  }, [currentQuestion]);

  // Transition to input mode when speaking finishes
  useEffect(() => {
    // Only transition if:
    // 1. We're in AI speaking mode
    // 2. Speaking has started AND now finished (isSpeaking went from true to false)
    // 3. We have a question and block
    // 4. We haven't already transitioned for this question
    if (
      layoutMode === 'ai_speaking' &&
      !isSpeaking &&
      hasStartedSpeakingRef.current &&
      currentQuestion &&
      currentBlock &&
      !hasTransitionedRef.current
    ) {
      hasTransitionedRef.current = true;

      // Transition to input mode - use single state update
      setLayoutMode('user_input');

      // Start listening after a brief delay to ensure UI has rendered
      // The WebSocket should already be connected from preconnect
      if (autoListen && currentInputMode !== 'visual' && !hasStartedListeningRef.current) {
        hasStartedListeningRef.current = true;
        // Use setTimeout to batch separately from the layoutMode state update
        setTimeout(() => {
          startListening().catch((err) => {
            console.warn('Auto-listen failed:', err);
          });
        }, 50);
      }
    }
  }, [isSpeaking, layoutMode, currentQuestion, currentBlock, autoListen, currentInputMode, startListening]);

  // Ask question when block changes
  useEffect(() => {
    // Don't run if submitting (survey is complete)
    if (isSubmitting) return;

    if (currentBlock && layoutMode !== 'welcome' && layoutMode !== 'complete' && sessionState.isInitialized) {
      // Check if we're navigating back
      if (isNavigatingBackRef.current) {
        // Reset the flag
        isNavigatingBackRef.current = false;

        // Get block identifiers
        const blockId = currentBlock.uuid || currentBlock.fieldName || '';
        const fieldName = currentBlock.fieldName || currentBlock.name || '';

        // Store the original value so we can detect if user changes it
        const currentValue = values[fieldName];
        originalValueOnBackRef.current = { blockId, value: currentValue };

        // Truncate conversation to this block's checkpoint (remove conversation from this block onwards)
        const checkpoint = conversationCheckpointsRef.current.get(blockId);
        if (checkpoint !== undefined) {
          conversationHistoryRef.current = conversationHistoryRef.current.slice(0, checkpoint);
        }

        // Get the stored question for this block (if available)
        const storedQuestion = blockQuestionsRef.current.get(blockId);

        if (storedQuestion) {
          // Restore the question and go directly to input mode
          setCurrentQuestion(storedQuestion);
          lastQuestionRef.current = storedQuestion;
        } else {
          // Fallback to block label if no stored question
          setCurrentQuestion(currentBlock.label || currentBlock.name || '');
        }

        // Classify the question for input mode
        const classification = classifyQuestion(currentBlock);
        setCurrentInputMode(classification.inputMode);

        // Go directly to user input mode (skip AI speaking)
        setLayoutMode('user_input');
        return;
      }

      // Check if we should skip AI speaking (forward nav with unchanged value)
      if (skipNextAISpeakingRef.current) {
        // Reset the flag
        skipNextAISpeakingRef.current = false;

        // Get block identifiers
        const blockId = currentBlock.uuid || currentBlock.fieldName || '';
        const fieldName = currentBlock.fieldName || currentBlock.name || '';

        // Store the original value so we can detect if user changes it
        const currentValue = values[fieldName];
        originalValueOnBackRef.current = { blockId, value: currentValue };

        // Get the stored question for this block (if available)
        const storedQuestion = blockQuestionsRef.current.get(blockId);

        if (storedQuestion) {
          // Restore the question and go directly to input mode
          setCurrentQuestion(storedQuestion);
          lastQuestionRef.current = storedQuestion;
        } else {
          // Fallback to block label if no stored question
          setCurrentQuestion(currentBlock.label || currentBlock.name || '');
        }

        // Classify the question for input mode
        const classification = classifyQuestion(currentBlock);
        setCurrentInputMode(classification.inputMode);

        // Go directly to user input mode (skip AI speaking)
        setLayoutMode('user_input');
        return;
      }

      // Normal forward navigation - ask the question with AI
      setLayoutMode('ai_speaking');
      askQuestion(currentBlock);
    }
  }, [currentBlock?.uuid, currentBlock?.fieldName, sessionState.isInitialized, isSubmitting]);

  // Handle completion
  useEffect(() => {
    if (isSubmitting && layoutMode !== 'complete') {
      setLayoutMode('complete');
      setCurrentQuestion(completionMessage);
      conversationHistoryRef.current.push({ role: 'assistant', content: completionMessage });
      speak(completionMessage);
      endSession();
    }
  }, [isSubmitting, layoutMode, completionMessage, speak, endSession]);

  // Welcome Screen
  if (layoutMode === 'welcome') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'fixed inset-0 flex flex-col items-center justify-center',
          'bg-gradient-to-b from-white via-gray-50 to-gray-100',
          containerClassName
        )}
      >
        {/* Subtle animated background */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-100/30 blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-100/20 blur-3xl"
            animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center px-6"
        >
          <VoiceOrb
            state="idle"
            theme={theme}
            style={orbStyle}
            size="xl"
            onClick={handleStart}
            className="mx-auto mb-8 cursor-pointer"
          />

          <h1 className="text-2xl md:text-3xl font-light text-gray-800 mb-4">
            Voice Survey
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md">
            {welcomeMessage}
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className={cn(
              'px-8 py-4 rounded-full font-medium text-lg',
              'bg-blue-500 text-white hover:bg-blue-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'transition-colors duration-200'
            )}
          >
            Start Survey
          </motion.button>

          <p className="mt-6 text-sm text-gray-400">
            Tap the orb or button to begin
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // Completion Screen
  if (layoutMode === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'fixed inset-0 flex flex-col items-center justify-center',
          'bg-gradient-to-b from-white via-gray-50 to-gray-100',
          containerClassName
        )}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center"
          >
            <svg
              className="w-12 h-12 text-green-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-light text-gray-800 mb-4">
            Survey Complete
          </h1>

          <p className="text-lg text-gray-600 max-w-md">
            {completionMessage}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // Main survey flow
  return (
    <div className={cn('fixed inset-0', containerClassName)}>
      <AnimatePresence mode="wait">
        {layoutMode === 'ai_speaking' && (
          <OrbScreen
            key="orb-screen"
            questionText={currentQuestion}
            isSpeaking={isSpeaking}
            voiceState={voiceState.state}
            onSkip={handleSkipSpeaking}
            currentStep={currentQuestionIndex}
            totalSteps={totalQuestions}
            theme={theme}
            orbStyle={orbStyle}
            volume={volume}
            isLoading={!isSpeaking}
          />
        )}

        {layoutMode === 'user_input' && currentBlock && (
          <InputScreen
            key="input-screen"
            block={currentBlock}
            questionText={currentQuestion}
            value={values[currentBlock.fieldName || currentBlock.name || '']}
            onChange={handleVisualChange}
            onSubmit={handleVisualSubmit}
            onVoiceInput={shouldDisableAudioInput ? undefined : handleVoiceInputToggle}
            onBack={currentQuestionIndex > 0 ? handleBack : undefined}
            currentStep={currentQuestionIndex}
            totalSteps={totalQuestions}
            theme={theme}
            disabled={isSubmitting}
            error={errors[currentBlock.fieldName || currentBlock.name || '']}
            isListening={isListening}
            interimTranscript={sessionState.lastInterimTranscript}
            isValid={isValid}
          />
        )}

        {layoutMode === 'processing' && (
          <motion.div
            key="processing-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-white via-gray-50 to-gray-100"
          >
            <VoiceOrb
              state="processing"
              theme={theme}
              style={orbStyle}
              size="xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

VoiceLayout.displayName = 'VoiceLayout';
