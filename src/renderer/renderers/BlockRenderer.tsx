import React, { forwardRef, useMemo } from 'react';
import type { BlockRendererProps } from '../../types';
import { getBlockDefinition } from '../../blocks';
import { validateBlock } from '../../utils/blockAdapter';
import { useSurveyForm } from '../../context/SurveyFormContext';
import { getBlockDataForRendering } from '../../utils/abTestUtils';
import { ABTestIndicator } from '../../components/ui/ABTestIndicator';
import { localizeBlockForRendering } from '../../utils/surveyUtils';

/**
 * A component that renders different types of blocks based on their type
 */
export const BlockRenderer = forwardRef<HTMLElement, BlockRendererProps>((props, _ref) => {
  const { block, value, onChange, onBlur, error, disabled, customComponents, theme = null, isVisible } = props;
  const { analytics, enableDebug, abTestPreviewMode, language, surveyData } = useSurveyForm();

  // Apply A/B testing variant selection if enabled
  const blockToRender = useMemo(() => {
    const selectedBlock = getBlockDataForRendering(block, analytics?.sessionId, enableDebug, abTestPreviewMode);

    return localizeBlockForRendering(selectedBlock, language, surveyData.localizations);
  }, [block, analytics?.sessionId, enableDebug, abTestPreviewMode, language, surveyData.localizations]);

  // If the block has a visibility condition and is explicitly not visible, don't render it
  if (isVisible === false) {
    return null;
  }

  // Common props for all renderers
  const validationError = validateBlock(blockToRender);

  // Update props to use the selected variant
  const updatedProps = {
    ...props,
    block: blockToRender,
  };

  // Render A/B test indicator if debug mode is enabled and A/B testing is active
  const abTestIndicator = enableDebug && blockToRender.abTest?.enabled ? (
    <ABTestIndicator block={blockToRender} />
  ) : null;

  // If there's a custom component for this block type, use it
  if (customComponents && customComponents[blockToRender.type]) {
    const CustomComponent = customComponents[blockToRender.type] as React.FC<BlockRendererProps>;
    return (
      <>
        {abTestIndicator}
        <CustomComponent {...updatedProps} />
      </>
    );
  }

  // Check if we have a unified block definition with renderBlock method
  const blockDefinition = getBlockDefinition(blockToRender.type);
  if (blockDefinition?.renderBlock) {
    return (
      <>
        {abTestIndicator}
        {blockDefinition.renderBlock(updatedProps)}
      </>
    );
  }

});

BlockRenderer.displayName = 'BlockRenderer';
