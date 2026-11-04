import React, { useRef, useEffect } from 'react';
import { SurveyFormContext, useSurveyForm } from '../../../context/SurveyFormContext';
import { BlockRenderer } from '../../renderers/BlockRenderer';
import { getBlockFieldErrors } from '../../../utils/blockFields';
import { getSurveyPages, detectSurveyMode } from '../../../utils/surveyUtils';
import { getPageLayoutDefinition } from '../pageLayouts';
import type { BlockData, PageLayoutProps } from '../../../types';

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
  /**
   * Places the blocks of every page that has no page layout of its own, so a form
   * layout can style all its pages once. Pages are stacked without either.
   */
  renderPage?: React.ComponentType<PageLayoutProps>;
}

/**
 * CurrentBlock Component
 *
 * Automatically renders the current block in the survey with all the
 * proper wiring for value changes, errors, and theme. On a page it renders
 * every visible block of the page, and the page's Continue moves on. A page
 * is drawn by its own page layout, else by `renderPage`, else stacked.
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
  wrapper: Wrapper,
  renderPage,
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
      <PageStep
        page={context.currentPageNode ?? { type: 'set', items: currentPageBlocks }}
        blocks={currentPageBlocks}
        visibleBlocks={currentStepBlocks ?? []}
        inputRef={firstInputRef}
        onValueChange={onValueChange}
        renderPage={renderPage}
      />
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

const warnedPageLayouts = new Set<string>();

// A different layout calls different hooks, so each layout component gets its own key and starts fresh
const layoutKeys = new WeakMap<object, number>();
let nextLayoutKey = 0;
const layoutKey = (Layout: object) => {
  if (!layoutKeys.has(Layout)) layoutKeys.set(Layout, ++nextLayoutKey);
  return layoutKeys.get(Layout);
};

/**
 * A page step: picks the page layout (the page's own, else `renderPage`, else
 * stacked) and gives it the helpers that draw blocks.
 */
const PageStep: React.FC<{
  page: BlockData;
  blocks: BlockData[];
  visibleBlocks: BlockData[];
  inputRef: React.Ref<HTMLInputElement>;
  onValueChange?: (fieldName: string, value: any) => void;
  renderPage?: React.ComponentType<PageLayoutProps>;
}> = ({ page, blocks, visibleBlocks, inputRef, onValueChange, renderPage }) => {
  const { isPreview } = useSurveyForm();

  const layoutName = page.pageLayout;
  const definition = layoutName ? getPageLayoutDefinition(layoutName) : undefined;
  if (layoutName && !definition && !warnedPageLayouts.has(layoutName)) {
    warnedPageLayouts.add(layoutName);
    console.warn(`Page layout "${layoutName}" isn't registered, so the page "${page.name ?? page.uuid}" falls back.`);
  }
  const Layout = definition?.component ?? renderPage;

  // The first visible block takes the focus, wherever the layout puts it
  const drawBlock = (block: BlockData) => (
    <PageBlock
      key={block.uuid ?? block.fieldName ?? blocks.indexOf(block)}
      block={block}
      blockIndex={blocks.indexOf(block)}
      inputRef={block === visibleBlocks[0] ? inputRef : undefined}
      onValueChange={onValueChange}
    />
  );

  if (!Layout) return <>{visibleBlocks.map(drawBlock)}</>;

  return (
    <LaidOutPage
      key={layoutKey(Layout)}
      Layout={Layout}
      page={page}
      blocks={blocks}
      visibleBlocks={visibleBlocks}
      drawBlock={drawBlock}
      isPreview={!!isPreview}
    />
  );
};

/**
 * Calls a function layout during this render, so every block it draws is known
 * once it returns and the blocks it never drew can be reported. Helpers called
 * later, from a child component's own render, draw the visible block they're
 * asked for without that bookkeeping. A memo, forwardRef or lazy layout renders
 * as an element instead, without the report.
 */
const LaidOutPage: React.FC<{
  Layout: React.ComponentType<PageLayoutProps>;
  page: BlockData;
  blocks: BlockData[];
  visibleBlocks: BlockData[];
  drawBlock: (block: BlockData) => React.ReactNode;
  isPreview: boolean;
}> = ({ Layout, page, blocks, visibleBlocks, drawBlock, isPreview }) => {
  const drawn = new Set<BlockData>();
  let inLayoutRender = true;

  const find = (ref: number | string) =>
    typeof ref === 'number'
      ? blocks[ref]
      // Two blocks can save one field and take turns showing: pick the visible one not drawn yet
      : blocks.find(item => item.fieldName === ref && visibleBlocks.includes(item) && !drawn.has(item));

  const renderBlock = (ref: number | string) => {
    const block = find(ref);
    if (!block || !visibleBlocks.includes(block)) return null;
    if (inLayoutRender) {
      if (drawn.has(block)) return null;
      drawn.add(block);
    }
    return drawBlock(block);
  };
  const renderBlocks = () => {
    const rest = visibleBlocks.filter(block => !drawn.has(block));
    if (inLayoutRender) {
      for (const block of rest) drawn.add(block);
    }
    return rest.map(drawBlock);
  };

  const props: PageLayoutProps = { page, blocks, renderBlock, renderBlocks };
  const isPlainFunction = typeof Layout === 'function' && !(Layout as any).prototype?.isReactComponent;
  const content = isPlainFunction ? (Layout as React.FC<PageLayoutProps>)(props) : <Layout {...props} />;
  inLayoutRender = false;

  const undrawnNames = isPlainFunction
    ? visibleBlocks.filter(block => !drawn.has(block)).map(block => block.fieldName ?? block.name ?? block.uuid).join(', ')
    : '';
  useEffect(() => {
    if (undrawnNames) console.warn(`The page layout never draws these visible blocks: ${undrawnNames}`);
  }, [undrawnNames]);

  return (
    <>
      {isPreview && undrawnNames && (
        <div role="alert" className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
          This page layout doesn't draw: {undrawnNames}
        </div>
      )}
      {content}
    </>
  );
};
