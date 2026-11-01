import React, { useRef, useEffect } from 'react';
import { SurveyFormContext, useSurveyForm } from '../../../context/SurveyFormContext';
import { BlockRenderer } from '../../renderers/BlockRenderer';
import { getBlockFieldErrors } from '../../../utils/blockFields';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';
import type { BlockData } from '../../../types';

interface CurrentBlockProps {
  /**
   * Custom class name for the container
   */
  className?: string;
  /**
   * Whether to auto-focus the input when the block changes
   */
  autoFocus?: boolean;
  /**
   * Callback when the block value changes
   */
  onValueChange?: (fieldName: string, value: any) => void;
  /**
   * Custom wrapper component for the block
   */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * CurrentBlock Component
 *
 * Automatically renders the current block in the survey with all the
 * proper wiring for value changes, errors, and theme. On a page it renders
 * every visible block of the page, and the page's Continue moves on.
 *
 * This eliminates the need to manually:
 * - Get the current page blocks
 * - Access the current block by index
 * - Wire up onChange handlers
 * - Pass errors and theme
 *
 * @example
 * ```tsx
 * <CurrentBlock className="my-custom-styles" />
 * ```
 */
export const CurrentBlock: React.FC<CurrentBlockProps> = ({
  className,
  autoFocus = false,
  onValueChange,
  wrapper: Wrapper
}) => {
  const context = useSurveyForm();
  const {
    currentPage,
    currentBlockIndex,
    values,
    setValue,
    errors,
    theme,
    surveyData,
    goToNextBlock,
    isPageStep,
    currentStepBlocks,
  } = context;

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Get the current page blocks (from the form when it provides them)
  const pages = context.pages ?? getSurveyPages(surveyData.rootNode, detectSurveyMode(surveyData.rootNode));
  const currentPageBlocks = currentPage < pages.length ? pages[currentPage] : [];
  const currentBlock = currentPageBlocks[currentBlockIndex];

  // Auto-focus first input when block changes
  useEffect(() => {
    if (autoFocus && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 200);
    }
  }, [currentPage, currentBlockIndex, autoFocus]);

  const wrap = (content: React.ReactNode) => (
    Wrapper
      ? <Wrapper><div className={className}>{content}</div></Wrapper>
      : <div className={className}>{content}</div>
  );

  if (isPageStep) {
    return wrap(
      (currentStepBlocks ?? []).map((block, index) => (
        <PageBlock
          key={block.uuid ?? block.fieldName ?? index}
          block={block}
          blockIndex={currentPageBlocks.indexOf(block)}
          inputRef={index === 0 ? firstInputRef : undefined}
          onValueChange={onValueChange}
        />
      ))
    );
  }

  if (!currentBlock) {
    return null;
  }

  const handleChange = (value: any) => {
    const field = currentBlock.fieldName;
    if (field) {
      setValue(field, value);
      onValueChange?.(field, value);
    }

    // Auto-continue if configured on the block
    if (currentBlock.autoContinueOnSelect) {
      goToNextBlock(field ? { [field]: value } : undefined);
    }
  };

  const blockRenderer = (
    <BlockRenderer
      block={currentBlock}
      value={currentBlock.fieldName ? values[currentBlock.fieldName] : undefined}
      onChange={handleChange}
      error={currentBlock.fieldName ? errors[currentBlock.fieldName] : undefined}
      fieldErrors={getBlockFieldErrors(currentBlock, errors)}
      ref={firstInputRef}
      theme={theme}
    />
  );

  return wrap(blockRenderer);
};

/**
 * One block on a page. Its own continue (auto-continue, or a block that moves on
 * by itself) only saves the answer: the page's Continue moves on.
 */
const PageBlock: React.FC<{
  block: BlockData;
  blockIndex: number;
  inputRef?: React.Ref<HTMLInputElement>;
  onValueChange?: (fieldName: string, value: any) => void;
}> = ({ block, blockIndex, inputRef, onValueChange }) => {
  const context = useSurveyForm();
  const { values, setValue, errors, theme } = context;
  const field = block.fieldName;

  const blockContext = {
    ...context,
    currentBlockIndex: blockIndex,
    goToNextBlock: (fValue?: Record<string, any>) => {
      for (const [name, value] of Object.entries(fValue ?? {})) setValue(name, value);
    },
  };

  const handleChange = (value: any) => {
    if (!field) return;
    setValue(field, value);
    onValueChange?.(field, value);
  };

  return (
    <SurveyFormContext.Provider value={blockContext}>
      <BlockRenderer
        block={block}
        value={field ? values[field] : undefined}
        onChange={handleChange}
        error={field ? errors[field] : undefined}
        fieldErrors={getBlockFieldErrors(block, errors)}
        ref={inputRef}
        theme={theme}
      />
    </SurveyFormContext.Provider>
  );
};
