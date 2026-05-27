import React, { useEffect, useCallback, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useSurveyForm } from '../../../context/SurveyFormContext';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';
import { getBlockDefinition } from '../../../blocks';
import type { BlockData, BlockDefinition } from '../../../types';
import type {
  ChatLayoutProps,
  AIHandler,
  ChatCustomData,
  BlockSchema,
  BlockFunction,
} from './types';
import { ChatContainer } from './ChatContainer';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatMultiFieldInput } from './ChatMultiFieldInput';
import { UnreadIndicator } from './UnreadIndicator';
import { useChatMessages } from './hooks/useChatMessages';
import { useAutoScroll } from './hooks/useAutoScroll';
import {
  defaultAIHandler,
  formatResponseForDisplay,
  generateMessageId,
} from './utils/defaultAIHandler';
import { ProgressIndicator } from '../helpers';

// Block types that are read-only (display content only, no input required)
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
    // Strip HTML tags for chat display, or return a placeholder
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

// Extended block definition with inputSchema and chatRenderer support
type ExtendedBlockDefinition = BlockDefinition & {
  inputSchema?: BlockSchema;
  blockFunctions?: BlockFunction[];
  chatRenderer?: BlockDefinition['chatRenderer'];
};

// Multi-field state for blocks with inputSchema
interface MultiFieldState {
  isActive: boolean;
  fields: string[];
  currentFieldIndex: number;
  collectedValues: Record<string, any>;
  blockDefinition: ExtendedBlockDefinition | null;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  progressBar = { type: 'bar', position: 'top' },
  welcomeMessage: propWelcomeMessage,
  showTimestamps = false,
  inputPlaceholder = 'Type your answer...',
  autoScrollToBottom = true,
  chatContainerClassName,
}) => {
  const {
    currentPage,
    currentBlockIndex,
    values,
    setValue,
    errors,
    goToNextBlock,
    isSubmitting,
    theme,
    surveyData,
    customData,
    getVisibleBlocks,
    getTotalVisibleSteps,
    getCurrentStepPosition,
  } = useSurveyForm();

  // Get chat configuration from customData
  const chatCustomData = customData as ChatCustomData | undefined;
  const aiHandler: AIHandler = chatCustomData?.aiHandler || defaultAIHandler;
  const welcomeMessage =
    propWelcomeMessage ||
    chatCustomData?.welcomeMessage ||
    "Hi! I'm here to help you complete this survey. Let's get started!";
  const typingDelay = chatCustomData?.typingDelay ?? 500;

  // Chat state
  const { messages, addMessage, updateMessage } = useChatMessages();
  const {
    containerRef,
    inputRef,
    scrollToBottom,
    inputHeight,
    unreadCount,
    clearUnread,
    onUserMessage,
  } = useAutoScroll(autoScrollToBottom, messages);

  // Track which blocks we've already asked about
  const askedBlocksRef = useRef<Set<string>>(new Set());
  const welcomeAddedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questionReady, setQuestionReady] = useState(false);

  // Multi-field state for blocks with inputSchema
  const [multiFieldState, setMultiFieldState] = useState<MultiFieldState>({
    isActive: false,
    fields: [],
    currentFieldIndex: 0,
    collectedValues: {},
    blockDefinition: null,
  });

  // Get current block info
  const surveyMode = detectSurveyMode(surveyData.rootNode);
  const pages = getSurveyPages(surveyData.rootNode, surveyMode);
  const currentPageBlocks =
    currentPage < pages.length ? pages[currentPage] : [];
  const visibleBlocks = getVisibleBlocks(currentPageBlocks);
  const currentBlock = visibleBlocks[currentBlockIndex] as
    | BlockData
    | undefined;

  // Calculate total questions for context
  const totalQuestions =
    getTotalVisibleSteps?.() ??
    pages.reduce((acc, page) => acc + getVisibleBlocks(page).length, 0);
  const currentQuestionIndex = getCurrentStepPosition?.() ?? 0;

  // Add welcome message on mount (only once)
  useEffect(() => {
    if (!welcomeAddedRef.current && messages.length === 0) {
      welcomeAddedRef.current = true;
      addMessage({
        role: 'assistant',
        content: welcomeMessage,
      });
    }
  }, []);

  // Check if a block has inputSchema (multi-field block)
  const getBlockInputSchema = useCallback(
    (
      block: BlockData
    ): {
      inputSchema?: BlockSchema;
      blockFunctions?: BlockFunction[];
      definition?: ExtendedBlockDefinition;
    } => {
      const definition = getBlockDefinition(block.type) as
        | ExtendedBlockDefinition
        | undefined;
      return {
        inputSchema: definition?.inputSchema,
        blockFunctions: definition?.blockFunctions,
        definition,
      };
    },
    []
  );

  // Generate AI question for a specific field in multi-field mode
  const generateFieldQuestion = useCallback(
    async (
      block: BlockData,
      fieldName: string,
      fieldSchema: { type: string; description?: string },
      collectedValues: Record<string, any>,
      remainingFields: string[]
    ) => {
      const blockId = `${block.uuid || block.fieldName}-${fieldName}`;

      setIsAILoading(true);
      setQuestionReady(false);
      const loadingId = addMessage({
        role: 'assistant',
        content: '',
        blockId,
        blockType: block.type,
        isLoading: true,
      });

      try {
        await new Promise((resolve) => setTimeout(resolve, typingDelay));

        const response = await aiHandler({
          block,
          previousResponses: values,
          conversationHistory: messages,
          currentQuestionIndex,
          totalQuestions,
          currentField: fieldName,
          collectedFields: collectedValues,
          remainingFields,
          inputSchema: multiFieldState.blockDefinition?.inputSchema,
        });

        updateMessage(loadingId, {
          content: response.conversationalQuestion,
          isLoading: false,
          originalQuestion: fieldSchema.description || fieldName,
        });
      } catch (error) {
        console.error('Error generating field question:', error);
        updateMessage(loadingId, {
          content: `What is your ${fieldName}?`,
          isLoading: false,
        });
      } finally {
        setIsAILoading(false);
        // Small delay before accepting input to ensure message is rendered
        setTimeout(() => setQuestionReady(true), 200);
        // Don't auto-scroll on AI response - let user choose to scroll down
      }
    },
    [
      aiHandler,
      values,
      messages,
      currentQuestionIndex,
      totalQuestions,
      typingDelay,
      addMessage,
      updateMessage,
      multiFieldState.blockDefinition,
    ]
  );

  // Generate AI question for current block
  const generateQuestion = useCallback(
    async (block: BlockData) => {
      const blockId = block.uuid || block.fieldName || generateMessageId();

      // Skip if we've already asked this block
      if (askedBlocksRef.current.has(blockId)) {
        return;
      }
      askedBlocksRef.current.add(blockId);

      // Handle read-only blocks (markdown, html, etc.) - display content and auto-advance
      if (isReadOnlyBlock(block)) {
        const content = getReadOnlyContent(block);

        // Only add message if there's meaningful content
        if (content && content !== '[Content Block]') {
          addMessage({
            role: 'assistant',
            content,
            blockId,
            blockType: block.type,
          });
          // Don't auto-scroll on AI messages
        }

        // Auto-advance to next block after a short delay
        await new Promise((resolve) => setTimeout(resolve, typingDelay / 2));
        goToNextBlock();
        return;
      }

      // Check if this block has a chatRenderer - if so, skip inputSchema handling
      // and let ChatInput render the custom chatRenderer
      const { inputSchema, definition } = getBlockInputSchema(block);
      const hasChatRenderer = definition?.chatRenderer != null;

      // Only use multi-field mode if block has inputSchema AND no chatRenderer
      if (
        !hasChatRenderer &&
        inputSchema?.properties &&
        Object.keys(inputSchema.properties).length > 0
      ) {
        // This is a multi-field block - enter multi-field mode
        const fields = Object.keys(inputSchema.properties);
        setMultiFieldState({
          isActive: true,
          fields,
          currentFieldIndex: 0,
          collectedValues: {},
          blockDefinition: definition || null,
        });

        // Generate question for the first field
        const firstField = fields[0];
        const firstFieldSchema = inputSchema.properties[firstField];
        await generateFieldQuestion(
          block,
          firstField,
          firstFieldSchema,
          {},
          fields.slice(1)
        );
        return;
      }

      // Standard single-field block
      setIsAILoading(true);
      setQuestionReady(false);
      const loadingId = addMessage({
        role: 'assistant',
        content: '',
        blockId,
        blockType: block.type,
        isLoading: true,
      });

      try {
        await new Promise((resolve) => setTimeout(resolve, typingDelay));

        const response = await aiHandler({
          block,
          previousResponses: values,
          conversationHistory: messages,
          currentQuestionIndex,
          totalQuestions,
        });

        updateMessage(loadingId, {
          content: response.conversationalQuestion,
          isLoading: false,
          originalQuestion: block.label,
        });

        if (response.additionalContext) {
          addMessage({
            role: 'assistant',
            content: response.additionalContext,
            blockId,
          });
        }
      } catch (error) {
        console.error('Error generating AI question:', error);
        updateMessage(loadingId, {
          content: block.label || block.name || 'Please answer this question:',
          isLoading: false,
          originalQuestion: block.label,
        });
      } finally {
        setIsAILoading(false);
        // Small delay before accepting input to ensure message is rendered
        setTimeout(() => setQuestionReady(true), 200);
        // Don't auto-scroll on AI response - let user choose to scroll down
      }
    },
    [
      aiHandler,
      values,
      messages,
      currentQuestionIndex,
      totalQuestions,
      typingDelay,
      addMessage,
      updateMessage,
      getBlockInputSchema,
      generateFieldQuestion,
      goToNextBlock,
    ]
  );

  // Watch for block changes and generate questions
  useEffect(() => {
    if (currentBlock && !isComplete && !multiFieldState.isActive) {
      generateQuestion(currentBlock);
    }
  }, [
    currentBlock?.uuid,
    currentBlock?.fieldName,
    isComplete,
    multiFieldState.isActive,
    generateQuestion,
  ]);

  // Reset processing flag and question ready when block changes
  useEffect(() => {
    isProcessingRef.current = false;
    setQuestionReady(false);
  }, [currentBlock?.uuid, currentBlock?.fieldName]);

  // Watch for submission state to show completion message
  // This allows goToNextBlock to handle all navigation/submission logic
  useEffect(() => {
    if (isSubmitting && !isComplete) {
      setIsComplete(true);
      addMessage({
        role: 'assistant',
        content:
          'Thank you for completing the survey! Your responses have been recorded.',
      });
    }
  }, [isSubmitting, isComplete, addMessage]);

  // Handle user response for multi-field blocks
  const handleMultiFieldResponse = useCallback(
    (value: any) => {
      if (!currentBlock || !multiFieldState.isActive) return;

      const currentField =
        multiFieldState.fields[multiFieldState.currentFieldIndex];

      // Add user response message
      addMessage({
        role: 'user',
        content: String(value),
        blockId: `${
          currentBlock.uuid || currentBlock.fieldName
        }-${currentField}`,
        blockType: currentBlock.type,
      });

      // Update collected values
      const newCollectedValues = {
        ...multiFieldState.collectedValues,
        [currentField]: value,
      };

      const nextFieldIndex = multiFieldState.currentFieldIndex + 1;

      if (nextFieldIndex >= multiFieldState.fields.length) {
        // All fields collected - call blockFunctions and finalize
        const finalValue = { ...newCollectedValues };

        // Call blockFunctions if available
        if (multiFieldState.blockDefinition?.blockFunctions) {
          for (const blockFunc of multiFieldState.blockDefinition
            .blockFunctions) {
            try {
              const params = Object.keys(blockFunc.parameters);
              const args = params.map((p) => newCollectedValues[p]);
              const result = blockFunc.callfunction(...args);

              // Add computed result to final value
              // Assuming the function name gives us a hint about what to store
              const resultKey = blockFunc.name
                .replace(/\s+/g, '_')
                .toLowerCase();
              if (resultKey.includes('bmi')) {
                finalValue.bmi = result;
              } else {
                finalValue[resultKey] = result;
              }
            } catch (error) {
              console.error(
                `Error calling block function ${blockFunc.name}:`,
                error
              );
            }
          }
        }

        // Set the final value for the block
        const fieldName = currentBlock.fieldName || currentBlock.name || '';
        setValue(fieldName, finalValue);

        // Add confirmation message
        addMessage({
          role: 'assistant',
          content: `Got it! I've recorded all your information.`,
        });

        // Reset multi-field state
        setMultiFieldState({
          isActive: false,
          fields: [],
          currentFieldIndex: 0,
          collectedValues: {},
          blockDefinition: null,
        });

        // Let goToNextBlock handle navigation and submission
        // It evaluates navigation rules and submits when appropriate
        goToNextBlock({ [fieldName]: finalValue });
      } else {
        // Move to next field
        setMultiFieldState((prev) => ({
          ...prev,
          currentFieldIndex: nextFieldIndex,
          collectedValues: newCollectedValues,
        }));

        // Generate question for the next field
        const nextField = multiFieldState.fields[nextFieldIndex];
        const inputSchema = multiFieldState.blockDefinition?.inputSchema;
        const nextFieldSchema = inputSchema?.properties?.[nextField] || {
          type: 'string',
        };
        const remainingFields = multiFieldState.fields.slice(
          nextFieldIndex + 1
        );

        generateFieldQuestion(
          currentBlock,
          nextField,
          nextFieldSchema,
          newCollectedValues,
          remainingFields
        );
      }

      // Trigger auto-scroll since this is a user message
      onUserMessage();
    },
    [
      currentBlock,
      multiFieldState,
      addMessage,
      setValue,
      onUserMessage,
      goToNextBlock,
      scrollToBottom,
      generateFieldQuestion,
    ]
  );

  // Handle user response for standard blocks
  const handleResponse = useCallback(
    (value: any) => {
      if (!currentBlock) return;

      if (multiFieldState.isActive) {
        // This shouldn't happen, but just in case
        return;
      }

      const fieldName = currentBlock.fieldName || currentBlock.name || '';
      setValue(fieldName, value);
    },
    [currentBlock, setValue, multiFieldState.isActive]
  );

  // Handle submit/next for standard blocks
  const handleSubmit = useCallback(
    (submittedValue?: any) => {
      if (!currentBlock) return;

      if (multiFieldState.isActive) {
        // This shouldn't happen for standard submit
        return;
      }

      // Don't accept submissions until question is ready
      if (!questionReady) {
        console.log('Question not ready yet, ignoring submit');
        return;
      }

      // Prevent duplicate processing
      if (isProcessingRef.current) {
        console.log('Already processing, ignoring duplicate submit');
        return;
      }
      isProcessingRef.current = true;

      const fieldName = currentBlock.fieldName || currentBlock.name || '';
      // Use the passed value if provided, otherwise read from state
      const value =
        submittedValue !== undefined ? submittedValue : values[fieldName];

      // Validate we have a value
      if (value === undefined || value === null || value === '') {
        isProcessingRef.current = false;
        return;
      }

      // Also update the state with the value to ensure consistency
      if (submittedValue !== undefined) {
        setValue(fieldName, submittedValue);
      }

      // Add user response message
      addMessage({
        role: 'user',
        content: formatResponseForDisplay(value, currentBlock),
        blockId: currentBlock.uuid || fieldName,
        blockType: currentBlock.type,
        userResponse: {
          value,
          displayValue: formatResponseForDisplay(value, currentBlock),
        },
      });

      // Trigger auto-scroll since this is a user message
      onUserMessage();

      // Let goToNextBlock handle navigation and submission
      // It evaluates navigation rules and submits when appropriate
      goToNextBlock({ [currentBlock.fieldName]: value });

      // Reset processing flag after navigation completes
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    },
    [
      currentBlock,
      values,
      setValue,
      addMessage,
      goToNextBlock,
      onUserMessage,
      multiFieldState.isActive,
      questionReady,
    ]
  );

  // Progress bar configuration
  const progressBarConfig =
    typeof progressBar === 'object'
      ? progressBar
      : progressBar
      ? { type: 'bar' as const }
      : null;

  return (
    <div
      className={cn(
        'relative flex flex-col h-full max-w-3xl flex-1 mx-auto',
        theme?.background
      )}
    >
      {/* Progress bar at top - sticky position for mobile compatibility */}
      {progressBarConfig && progressBarConfig.position !== 'bottom' && (
        <div className="sticky top-0 px-4 pt-4 pb-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shrink-0 z-10">
          <ProgressIndicator
            type={progressBarConfig.type}
            showPercentage={progressBarConfig.showPercentage}
            showStepInfo={progressBarConfig.showStepInfo}
            height={progressBarConfig.height}
            color={progressBarConfig.color}
            backgroundColor={progressBarConfig.backgroundColor}
          />
        </div>
      )}

      {/* Chat messages area - scrollable, takes remaining space */}
      <ChatContainer
        ref={containerRef}
        theme={theme}
        className={cn(
          'flex-1 min-h-0 overflow-auto px-4',
          chatContainerClassName
        )}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              showTimestamp={showTimestamps}
              theme={theme}
            />
          ))}
        </AnimatePresence>

        {/* Spacer to ensure content doesn't get hidden behind input */}
        {!isComplete && currentBlock && !isAILoading && questionReady && (
          <div style={{ height: inputHeight || 80 }} />
        )}
      </ChatContainer>

      {/* Unread messages indicator - positioned above input */}
      {/* Only delay showing if input is about to appear (isAILoading false but questionReady false) */}
      {(isComplete || questionReady || isAILoading) && (
        <UnreadIndicator
          count={unreadCount}
          onClick={clearUnread}
          theme={theme}
          inputHeight={inputHeight || 80}
        />
      )}

      {/* Input area - sticky at bottom for mobile keyboard compatibility */}
      {!isComplete && currentBlock && !isAILoading && questionReady && (
        <div
          ref={inputRef}
          className="sticky left-0 right-0 bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-4 w-full shrink-0 z-20"
        >
          {multiFieldState.isActive ? (
            <ChatMultiFieldInput
              fieldName={
                multiFieldState.fields[multiFieldState.currentFieldIndex]
              }
              fieldSchema={
                multiFieldState.blockDefinition?.inputSchema?.properties?.[
                  multiFieldState.fields[multiFieldState.currentFieldIndex]
                ]
              }
              onSubmit={handleMultiFieldResponse}
              theme={theme}
              disabled={isSubmitting}
              placeholder={inputPlaceholder}
            />
          ) : (
            <ChatInput
              block={currentBlock}
              value={values[currentBlock.fieldName || currentBlock.name || '']}
              onChange={handleResponse}
              onSubmit={handleSubmit}
              theme={theme}
              disabled={isSubmitting}
              placeholder={inputPlaceholder}
              error={errors[currentBlock.fieldName || currentBlock.name || '']}
            />
          )}
        </div>
      )}

      {/* Progress bar at bottom */}
      {progressBarConfig && progressBarConfig.position === 'bottom' && (
        <div className="px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
          <ProgressIndicator
            type={progressBarConfig.type}
            showPercentage={progressBarConfig.showPercentage}
            showStepInfo={progressBarConfig.showStepInfo}
            height={progressBarConfig.height}
            color={progressBarConfig.color}
            backgroundColor={progressBarConfig.backgroundColor}
          />
        </div>
      )}
    </div>
  );
};
