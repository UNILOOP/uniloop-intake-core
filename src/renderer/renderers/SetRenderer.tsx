import React from 'react';
import { BlockRenderer } from './BlockRenderer';
import type { BlockRendererProps } from '../../types';
import { useSurveyForm } from '../../context/SurveyFormContext';
import { ValidationSummary } from '../../components/ui/ValidationSummary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { ThemeDefinition, themes } from '../../themes';

/**
 * Renderer for "set" block type
 * Sets are containers for other blocks and can also contain conditional logic
 */
export const SetRenderer: React.FC<BlockRendererProps> = ({
  block,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  theme = null,
  customComponents,
}) => {
  const {
    getVisibleBlocks,
    evaluateCondition,
  } = useSurveyForm();

  const themeConfig = theme ?? themes.default;

  // Get the visible child items
  const items = block.items || [];
  const visibleItems = getVisibleBlocks(items);

  // If the set has no children, don't render anything
  if (visibleItems.length === 0) {
    return null;
  }

  // Get field names in this set for validation summary
  const fieldNames = visibleItems
    .filter(child => child.fieldName)
    .map(child => child.fieldName as string);

  return (
    <Card className={cn("w-full min-w-0 border bg-card", block.className)}>
      {(block.label || block.description) && (
        <CardHeader>
          {block.label && (
            <CardTitle className={themeConfig.field.label}>{block.label}</CardTitle>
          )}
          {block.description && (
            <CardDescription className={themeConfig.field.description}>
              {block.description}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className="space-y-4 p-4">
        {/* Show validation summary if there are field-specific errors */}
        {fieldNames.length > 0 && (
          <ValidationSummary fieldNames={fieldNames} />
        )}

        {/* Render each visible child block */}
        <div className="set-items space-y-4">
          {visibleItems.map((childBlock, index) => {
            // Check if this block has a visibility condition
            const isChildVisible = childBlock.visibleIf
              ? evaluateCondition(childBlock.visibleIf)
              : true;

            // Skip if not visible
            if (!isChildVisible) return null;

            return (
              <BlockRenderer
                key={childBlock.uuid || `${block.uuid}-child-${index}`}
                block={childBlock}
                value={childBlock.fieldName ? value?.[childBlock.fieldName] : undefined}
                onChange={(newValue) => {
                  if (childBlock.fieldName && onChange) {
                    // Create a new object with the updated field
                    const newValues = { ...(value || {}) };
                    newValues[childBlock.fieldName] = newValue;
                    onChange(newValues);
                  }
                }}
                onBlur={onBlur}
                error={childBlock.fieldName && error ? error[childBlock.fieldName as any] : undefined}
                disabled={disabled}
                theme={theme ?? undefined}
                customComponents={customComponents}
                isVisible={isChildVisible}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
