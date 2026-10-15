import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import type { VisualInputWrapperProps } from '../types';
import { resolveBlockDefinition } from '../../../../blocks';
import { useBlockOverrideFailures } from '../../../renderers/BlockOverrideBoundary';
import { useSurveyForm } from '../../../../context/SurveyFormContext';
import type { BlockRendererProps, ChatRendererProps } from '../../../../types';

/**
 * VisualInputWrapper Component
 *
 * Provides a fallback visual input interface when voice input
 * is not suitable (complex fields, privacy mode, user preference).
 *
 * Uses the existing block renderers for consistent UI.
 */
export const VisualInputWrapper: React.FC<VisualInputWrapperProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
  className,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [showingInput, setShowingInput] = useState(true);

  const { blockOverrides } = useSurveyForm();
  // Look the block up again once an override fails, so the system block's input is used.
  useBlockOverrideFailures();
  const blockDefinition = resolveBlockDefinition(block.type, blockOverrides);

  /**
   * Handle value change
   */
  const handleChange = useCallback(
    (newValue: unknown) => {
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  /**
   * Handle submit
   */
  const handleSubmit = useCallback(
    (submittedValue?: unknown) => {
      const valueToSubmit = submittedValue !== undefined ? submittedValue : localValue;
      onSubmit(valueToSubmit);
    },
    [localValue, onSubmit]
  );

  /**
   * Handle key press for text inputs
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  /**
   * Render block using chatRenderer if available, otherwise custom fallback
   */
  const renderBlockInput = () => {
    // Try to use chatRenderer if available
    if (blockDefinition?.chatRenderer) {
      const chatRendererProps: ChatRendererProps = {
        block,
        value: localValue,
        onChange: handleChange,
        onSubmit: handleSubmit,
        theme,
        disabled,
        error,
        placeholder: block.placeholder,
      };

      return blockDefinition.chatRenderer(chatRendererProps);
    }

    // Try to use standard block renderer
    if (blockDefinition?.renderBlock) {
      const blockRendererProps: BlockRendererProps = {
        block,
        value: localValue,
        onChange: handleChange,
        onBlur: () => {},
        theme,
        disabled,
        error,
      };

      return (
        <div className="space-y-3">
          {blockDefinition.renderBlock(blockRendererProps)}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={disabled}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium',
              'bg-blue-500 text-white hover:bg-blue-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            Continue
          </button>
        </div>
      );
    }

    // Fallback based on block type
    return renderFallbackInput();
  };

  /**
   * Render fallback input based on block type
   */
  const renderFallbackInput = () => {
    const blockType = block.type.toLowerCase();

    // Text input
    if (['textfield', 'text', 'email', 'phone', 'number'].includes(blockType)) {
      return (
        <div className="space-y-3">
          <input
            type={blockType === 'email' ? 'email' : blockType === 'number' ? 'number' : 'text'}
            value={String(localValue || '')}
            onChange={(e) => handleChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={block.placeholder || 'Type your answer...'}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500'
            )}
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={disabled || !localValue}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium',
              'bg-blue-500 text-white hover:bg-blue-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            Continue
          </button>
        </div>
      );
    }

    // Textarea
    if (['textarea'].includes(blockType)) {
      return (
        <div className="space-y-3">
          <textarea
            value={String(localValue || '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={block.placeholder || 'Type your answer...'}
            disabled={disabled}
            rows={4}
            className={cn(
              'w-full px-4 py-3 rounded-lg border resize-none',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500'
            )}
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={disabled || !localValue}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium',
              'bg-blue-500 text-white hover:bg-blue-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            Continue
          </button>
        </div>
      );
    }

    // Radio buttons
    if (['radio'].includes(blockType)) {
      const options = getOptions(block);
      return (
        <div className="space-y-2">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                handleChange(option.value);
                // Auto-submit on radio selection
                setTimeout(() => handleSubmit(option.value), 100);
              }}
              disabled={disabled}
              className={cn(
                'w-full px-4 py-3 rounded-lg border text-left',
                'transition-all duration-200',
                localValue === option.value
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                    localValue === option.value
                      ? 'border-blue-500'
                      : 'border-gray-400'
                  )}
                >
                  {localValue === option.value && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <span className="text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </div>
            </button>
          ))}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      );
    }

    // Checkbox
    if (['checkbox'].includes(blockType)) {
      const options = getOptions(block);
      const selectedValues = Array.isArray(localValue) ? localValue : [];

      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {options.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter((v) => v !== option.value)
                      : [...selectedValues, option.value];
                    handleChange(newValues);
                  }}
                  disabled={disabled}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border text-left',
                    'transition-all duration-200',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center',
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-white">
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={disabled || selectedValues.length === 0}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium',
              'bg-blue-500 text-white hover:bg-blue-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            Continue
          </button>
        </div>
      );
    }

    // Default fallback
    return (
      <div className="space-y-3">
        <input
          type="text"
          value={String(localValue || '')}
          onChange={(e) => handleChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={block.placeholder || 'Type your answer...'}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 rounded-lg border',
            'bg-white dark:bg-gray-800',
            'border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'text-gray-900 dark:text-white placeholder-gray-400',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={disabled}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg font-medium',
            'bg-blue-500 text-white hover:bg-blue-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
        >
          Continue
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {showingInput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn('w-full', className)}
        >
          {renderBlockInput()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Helper to extract options from block data
 */
function getOptions(block: { options?: any[]; items?: any[]; labels?: string[]; values?: any[] }): Array<{ label: string; value: any }> {
  // Options array format
  if (block.options && Array.isArray(block.options)) {
    return block.options.map((opt) => ({
      label: opt.label || String(opt.value || opt),
      value: opt.value ?? opt,
    }));
  }

  // Items array format
  if (block.items && Array.isArray(block.items)) {
    return block.items.map((item) => ({
      label: item.label || String(item.value || item),
      value: item.value ?? item,
    }));
  }

  // Labels/values array format
  if (block.labels && Array.isArray(block.labels)) {
    const values = block.values || block.labels;
    return block.labels.map((label, i) => ({
      label: String(label),
      value: values[i],
    }));
  }

  return [];
}

VisualInputWrapper.displayName = 'VisualInputWrapper';
