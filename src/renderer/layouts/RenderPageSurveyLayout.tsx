// RenderPageSurveyLayout (MedVi look-alike)
import React, { useEffect, useRef, useState, Fragment } from 'react';
import { useSurveyForm } from '../../context/SurveyFormContext';
import { BlockRenderer } from '../renderers/BlockRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSurveyPages, detectSurveyMode } from '../../utils/surveyUtils';
import { AnalyticsTrackedLayout } from './AnalyticsTrackedLayout';

interface RenderPageSurveyLayoutProps {
  progressBar?:
    | boolean
    | {
        type?: 'bar' | 'dots' | 'numbers' | 'percentage';
        showPercentage?: boolean;
        showStepInfo?: boolean;
        showStepTitles?: boolean;
        showStepNumbers?: boolean;
        position?: 'top' | 'bottom';
        color?: string;
        backgroundColor?: string;
        height?: number | string;
        animation?: boolean;
      };
  navigationButtons?: {
    showPrevious?: boolean;
    showNext?: boolean;
    showSubmit?: boolean;
    previousText?: string;
    nextText?: string;
    submitText?: string;
    position?: 'bottom' | 'split';
    align?: 'left' | 'center' | 'right';
    style?: 'default' | 'outlined' | 'text';
  };
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  enableDebug?: boolean;
  showNavigationHistory?: boolean;
  logo?: any;
}

const Star = ({ className }: { className: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clipPath="url(#clip0_39_803)">
      <path
        d="M11.4847 10.1132L12.9447 14.6079L8.00267 11.0159L11.4847 10.1132ZM16 5.20658H9.89L8.00333 -0.607422L6.11 5.20791L0 5.19991L4.948 8.79791L3.05467 14.6072L8.00267 11.0159L11.058 8.79791L16 5.20658Z"
        fill="#00B67A"
      />
    </g>
    <defs>
      <clipPath id="clip0_39_803">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const MotionFragment = motion.create(Fragment);

export const RenderPageSurveyLayout: React.FC<RenderPageSurveyLayoutProps> = ({
  progressBar = true,
  navigationButtons = {
    showPrevious: true,
    showNext: true,
    showSubmit: true,
    previousText: 'Previous',
    nextText: 'Continue',
    submitText: 'Complete Survey',
    position: 'bottom',
    align: 'center',
    style: 'default',
  },
  autoScroll = true,
  autoFocus = true,
  showSummary = false,
  submitText = 'Complete Survey',
  enableDebug = false,
  showNavigationHistory = false,
  logo = null,
}) => {
  const {
    currentPage,
    currentBlockIndex,
    totalPages,
    values,
    setValue,
    errors,
    goToNextBlock,
    goToPreviousBlock,
    isLastPage,
    isValid,
    theme,
    surveyData,
    navigationHistory,
    canGoBack,
    getActualProgress,
    getVisibleBlocks,
    analytics,
  } = useSurveyForm();

  // Theme-driven styling (fallbacks keep MedVi defaults)
  const themeColors = (theme as any)?.colors || {};
  const themeButton = (theme as any)?.button || {};
  const themeProgress = (theme as any)?.progress || {};
  const themeContainer = (theme as any)?.containerLayout || '';
  const themeBackground = (theme as any)?.background || '';

  // Colors
  const bgColor = themeColors.background || '#FAFAFA';
  const textColor = themeColors.text || '#1C1C1C';
  const progressTrackBg = themeColors.background || '#FFFFFF';
  const btnBg = themeButton.primary || '#1C1C1C';
  const btnHoverBg = themeColors.text || '#1C1C1C';
  const gradientStart = themeColors.secondary || '#DC9EA8';
  const gradientEnd = themeColors.primary || '#948EC4';

  const containerRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Detect survey mode and get the current page blocks from the surveyData in context
  const surveyMode = detectSurveyMode(surveyData.rootNode);
  const pages = getSurveyPages(surveyData.rootNode, surveyMode);
  const currentPageBlocks =
    currentPage < pages.length ? pages[currentPage] : [];
  const visibleCurrentPageBlocks = getVisibleBlocks(currentPageBlocks);

  const progress = getActualProgress();

  // MedVi-style "ready" animation gating
  const [isReady, setIsReady] = useState(false);
  const contentKey = `page-${currentPage}-block-${currentBlockIndex}`;

  useEffect(() => {
    setIsReady(false);
    const raf = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(raf);
  }, [contentKey]);

  // Auto-focus first input when step changes
  useEffect(() => {
    if (autoFocus && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 200);
    }
  }, [currentPage, currentBlockIndex, autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // goToNextBlock validates the current block before it navigates, and it
    // submits itself on an end block or the final step, so the Continue button
    // can never skip validation either.
    goToNextBlock();
  };

  const handlePrevious = () => {
    if (canGoBack) goToPreviousBlock();
  };

  const currentBlock = currentPageBlocks[currentBlockIndex];
  const blockDisclaimer = currentBlock?.disclaimer;

  const continueText = navigationButtons?.nextText || 'Continue';
  const completeText = navigationButtons?.submitText || submitText;

  const hasExplicitNavigation = (currentBlock?.nextBlockId && currentBlock.nextBlockId !== 'submit')
    || (currentBlock?.navigationRules && currentBlock.navigationRules.length > 0);
  const isFinalStep = currentBlock?.isEndBlock ||
    (isLastPage && currentBlockIndex === currentPageBlocks.length - 1 && !hasExplicitNavigation);

  const showNextButton =
    navigationButtons?.showNext !== false &&
    currentPageBlocks[currentBlockIndex]?.showContinueButton !== false;

  // Debug info (only shown when enableDebug is true)
  const debugInfo = enableDebug
    ? {
        currentPage,
        currentBlockIndex,
        totalPages,
        progressPercentage: Math.round(progress),
        navigationHistoryLength: navigationHistory.length,
        canGoBack,
        visibleBlocksInCurrentPage: visibleCurrentPageBlocks.length,
      }
    : null;

  const renderLogo = () => {
    if (!logo) return null;

    // Support both logo() and logo(className)
    if (typeof logo === 'function') {
      try {
        return logo('h-8 sm:h-9 w-auto');
      } catch {
        return logo();
      }
    }

    // If they pass a ReactNode
    return logo;
  };

  const layoutContent = (
    <div
      ref={containerRef}
      className={cn(
        'medvi-layout relative flex flex-col w-full py-2 sm:py-8 px-6 sm:px-8',
        themeContainer || 'max-w-4xl mx-auto',
        themeBackground,
      )}
      style={{ minHeight: '70svh', color: textColor, backgroundColor: bgColor }}
    >
      {/* Debug Panel */}
      {enableDebug && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs mb-4">
          <details className="cursor-pointer">
            <summary className="font-medium text-yellow-800">
              Debug Info
            </summary>
            <pre className="mt-2 text-yellow-700 whitespace-pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Header */}
      <header
        className="flex flex-col gap-3 sm:gap-2"
        style={{ color: textColor }}
      >
        {/* Logo & Rating */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center">{renderLogo()}</div>
        </div>

        {/* Back Button & Progress Bar */}
        <div className="flex items-center w-full gap-2.5 sm:gap-4 h-[40px] sm:h-[56px]">
          {/* Back */}
          <button
            type="button"
            onClick={canGoBack ? handlePrevious : undefined}
            disabled={!canGoBack}
            className={cn(
              'flex items-center transition-opacity mt-1 duration-200 cursor-pointer focus:outline-none',
              canGoBack
                ? 'hover:opacity-80'
                : 'hidden opacity-0 pointer-events-none',
            )}
          >
            <ChevronLeft className="size-6 mb-1" />
          </button>

          {/* Progress */}
          {progressBar !== false && (
            <div className="w-full mx-auto">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{
                  backgroundColor: progressTrackBg,
                  boxShadow: '0 4px 15.7px 0 rgba(28, 28, 28, 0.05)',
                }}
              >
                <motion.div
                  className={cn('h-full rounded-full', themeProgress.bar)}
                  style={
                    !themeProgress.bar
                      ? {
                          background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`,
                        }
                      : undefined
                  }
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 py-4 sm:py-7 w-full h-full mx-auto">
        {isReady && (
          <AnimatePresence mode="wait">
            <MotionFragment
              key={contentKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="space-y-4">
                {currentPageBlocks[currentBlockIndex] && (
                  <BlockRenderer
                    block={currentPageBlocks[currentBlockIndex]}
                    value={(() => {
                      const fieldName =
                        currentPageBlocks[currentBlockIndex].fieldName;
                      return fieldName
                        ? values[fieldName as string]
                        : undefined;
                    })()}
                    onChange={(value) => {
                      const blk = currentPageBlocks[currentBlockIndex];
                      const field = blk.fieldName;
                      if (field) setValue(field, value);

                      if (blk.autoContinueOnSelect) {
                        goToNextBlock(field ? { [field]: value } : undefined);
                      }
                    }}
                    error={
                      currentPageBlocks[currentBlockIndex].fieldName
                        ? errors[
                            currentPageBlocks[currentBlockIndex]
                              .fieldName as string
                          ]
                        : undefined
                    }
                    ref={firstInputRef}
                    theme={theme}
                  />
                )}
              </div>
            </MotionFragment>
          </AnimatePresence>
        )}
      </main>

      {/* Footer (MedVi CTA) */}
      <footer className="py-16 px-4">
        {blockDisclaimer && (
          <p
            className="text-xs leading-relaxed max-w-md mx-auto text-center mb-6"
            style={{ color: `${textColor}99` }}
          >
            {blockDisclaimer}
          </p>
        )}

        <form onSubmit={handleSubmit} className="w-full">
          {showNextButton && (
            <button
              type="submit"
              disabled={!isValid}
              className={cn(
                'flex items-center gap-2.5',
                themeButton.primary ||
                  'w-full max-w-lg mx-auto justify-center rounded-full px-8 py-4 sm:px-10 sm:py-5 text-white font-semibold text-sm sm:text-base transition-all duration-200 focus:outline-none',
                !isValid
                  ? 'opacity-60 cursor-not-allowed'
                  : 'active:scale-[0.98] cursor-pointer',
              )}
              style={
                !themeButton.primary
                  ? {
                      backgroundColor: btnBg,
                      flexGrow: 1,
                      boxShadow:
                        'inset 0 5px 8.8px rgba(255, 255, 255, 0.25), inset 0 -8px 9.9px rgba(0, 0, 0, 0.25)',
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (isValid && !themeButton.primary) {
                  e.currentTarget.style.backgroundColor = `${btnHoverBg}CC`;
                }
              }}
              onMouseLeave={(e) => {
                if (isValid && !themeButton.primary) {
                  e.currentTarget.style.backgroundColor = btnBg;
                }
              }}
            >
              {isFinalStep ? completeText : continueText}

              {/* MedVi arrow icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M16.175 13H5q-.425 0-.712-.288T4 12t.288-.712T5 11h11.175l-4.9-4.9q-.3-.3-.288-.7t.313-.7q.3-.275.7-.288t.7.288l6.6 6.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-6.6 6.6q-.275.275-.687.275T11.3 19.3q-.3-.3-.3-.712t.3-.713z"
                />
              </svg>
            </button>
          )}
        </form>
      </footer>

      {/* (Optional) you can add MedVi bottom spacing / background elements here */}
    </div>
  );

  if (analytics) {
    return (
      <AnalyticsTrackedLayout analytics={analytics}>
        {layoutContent}
      </AnalyticsTrackedLayout>
    );
  }

  return layoutContent;
};
