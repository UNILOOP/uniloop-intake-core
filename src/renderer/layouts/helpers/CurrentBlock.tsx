import React, { useRef, useEffect } from 'react';
import { useSurveyForm } from '../../../context/SurveyFormContext';
import { BlockRenderer } from '../../renderers/BlockRenderer';
import { getBlockFieldErrors } from '../../../utils/blockFields';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';

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
 * proper wiring for value changes, errors, and theme.
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
  const {
    currentPage,
    currentBlockIndex,
    values,
    setValue,
    errors,
    theme,
    surveyData,
    goToNextBlock,
  } = useSurveyForm();

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Get the current page blocks
  const surveyMode = detectSurveyMode(surveyData.rootNode);
  const pages = getSurveyPages(surveyData.rootNode, surveyMode);
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

  if (Wrapper) {
    return (
      <Wrapper>
        <div className={className}>{blockRenderer}</div>
      </Wrapper>
    );
  }

  return <div className={className}>{blockRenderer}</div>;
};
