import React from 'react';
import { useSurveyForm } from '../../../context/SurveyFormContext';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';

interface NavigationButtonsProps {
  /**
   * Custom class name for the container
   */
  className?: string;
  /**
   * Show previous button
   */
  showPrevious?: boolean;
  /**
   * Show next/submit button
   */
  showNext?: boolean;
  /**
   * Text for previous button
   */
  previousText?: string;
  /**
   * Text for next button
   */
  nextText?: string;
  /**
   * Text for submit button
   */
  submitText?: string;
  /**
   * Button alignment
   */
  align?: 'left' | 'center' | 'right' | 'space-between';
  /**
   * Button style variant
   */
  variant?: 'default' | 'custom';
  /**
   * Custom render function for previous button
   */
  renderPreviousButton?: (props: {
    onClick: () => void;
    disabled: boolean;
    text: string;
  }) => React.ReactNode;
  /**
   * Custom render function for next/submit button
   */
  renderNextButton?: (props: {
    onClick: (e: React.FormEvent) => void;
    disabled: boolean;
    text: string;
    isSubmit: boolean;
  }) => React.ReactNode;
  /**
   * Callback when navigation occurs
   */
  onNavigate?: (direction: 'previous' | 'next' | 'submit') => void;
}

/**
 * NavigationButtons Component
 *
 * Automatically renders navigation buttons with proper submit/next logic.
 * Handles form submission, validation, and navigation automatically.
 *
 * This eliminates the need to:
 * - Manually handle form submission
 * - Check if it's the last page for submit vs next
 * - Manage button disabled states
 * - Wire up navigation functions
 *
 * @example
 * ```tsx
 * // Simple usage
 * <NavigationButtons />
 *
 * // With custom styling
 * <NavigationButtons
 *   className="my-navigation"
 *   previousText="Go Back"
 *   nextText="Continue"
 *   submitText="Finish"
 * />
 *
 * // With custom render
 * <NavigationButtons
 *   renderNextButton={({ onClick, disabled, text, isSubmit }) => (
 *     <button onClick={onClick} disabled={disabled} className="custom-btn">
 *       {text}
 *     </button>
 *   )}
 * />
 * ```
 */
export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  className,
  showPrevious = true,
  showNext = true,
  previousText = 'Previous',
  nextText = 'Next',
  submitText = 'Submit',
  align = 'space-between',
  variant = 'default',
  renderPreviousButton,
  renderNextButton,
  onNavigate,
}) => {
  const {
    currentPage,
    currentBlockIndex,
    goToNextBlock,
    goToPreviousBlock,
    isLastPage,
    submit,
    isValid,
    canGoBack,
    surveyData,
    pages: contextPages,
    isPageStep,
    currentPageNode,
    currentStepBlocks,
  } = useSurveyForm();

  // Get the current page blocks to check for showContinueButton
  const pages = contextPages ?? getSurveyPages(surveyData.rootNode, detectSurveyMode(surveyData.rootNode));
  const currentPageBlocks = currentPage < pages.length ? pages[currentPage] : [];
  // A page's own settings decide its buttons
  const currentBlock = isPageStep ? currentPageNode : currentPageBlocks[currentBlockIndex];

  // Check if we should show the next button based on block configuration
  const shouldShowNext = showNext && currentBlock?.showContinueButton !== false;

  // Determine if we're on the final step
  const hasExplicitNavigation = (currentBlock?.nextBlockId && currentBlock.nextBlockId !== 'submit')
    || (currentBlock?.navigationRules && currentBlock.navigationRules.length > 0);
  const isFinalStep = currentBlock?.isEndBlock ||
    (isPageStep && (currentStepBlocks ?? []).some(block => block.isEndBlock)) ||
    (isLastPage && (isPageStep || currentBlockIndex === currentPageBlocks.length - 1) && !hasExplicitNavigation);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // A page checks all of its answers on the way out, also when it submits
    if (isFinalStep && !isPageStep) {
      submit();
      onNavigate?.('submit');
    } else {
      goToNextBlock();
      onNavigate?.('next');
    }
  };

  // Handle previous navigation
  const handlePrevious = () => {
    goToPreviousBlock();
    onNavigate?.('previous');
  };

  // Determine button text
  const nextButtonText = isFinalStep ? submitText : nextText;

  // Alignment classes
  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
  }[align];

  // Default button styles
  const defaultPreviousButtonClass =
    'px-6 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const defaultNextButtonClass = (disabled: boolean) =>
    `px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center space-x-2 ${
      disabled
        ? 'bg-gray-300 cursor-not-allowed'
        : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
    }`;

  return (
    <form onSubmit={handleSubmit} className={className}>
        {/* Previous Button */}
        {showPrevious && canGoBack && (
          <>
            {renderPreviousButton ? (
              renderPreviousButton({
                onClick: handlePrevious,
                disabled: !canGoBack,
                text: previousText,
              })
            ) : variant === 'default' ? (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={!canGoBack}
                className={defaultPreviousButtonClass}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>{previousText}</span>
              </button>
            ) : (
              <button type="button" onClick={handlePrevious} disabled={!canGoBack}>
                {previousText}
              </button>
            )}
          </>
        )}

        {/* Spacer for alignment */}
        {align === 'space-between' && <div className="flex-1" />}

        {/* Next/Submit Button */}
        {shouldShowNext && (
          <>
            {renderNextButton ? (
              renderNextButton({
                onClick: handleSubmit,
                disabled: !isValid,
                text: nextButtonText,
                isSubmit: isFinalStep,
              })
            ) : variant === 'default' ? (
              <button
                type="submit"
                disabled={!isValid}
                className={defaultNextButtonClass(!isValid)}
              >
                <span>{nextButtonText}</span>
                {!isFinalStep && (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <button type="submit" disabled={!isValid}>
                {nextButtonText}
              </button>
            )}
          </>
        )}
    </form>
  );
};
