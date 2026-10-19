import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Upload, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type {
  BlockData,
  ThemeDefinition,
  BlockDefinition,
} from '../../../types';
import { resolveBlockDefinition } from '../../../blocks';
import { useBlockOverrideFailures } from '../../renderers/BlockOverrideBoundary';
import { useSurveyForm } from '../../../context/SurveyFormContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Slider } from '../../../components/ui/slider';
import { DatePickerPopover } from '../../../components/ui/datepicker-popover';
import { ChatOptionButtons } from './ChatOptionButtons';
import { SchemaBasedInput } from './SchemaBasedInput';
import { FileUploadInput } from '../../../components/FileUploadInput';

interface ChatInputProps {
  block: BlockData;
  value?: any;
  onChange: (value: any) => void;
  onSubmit: (value?: any) => void;
  theme?: ThemeDefinition;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}

// Block types that use option buttons
const OPTION_BLOCK_TYPES = ['radio', 'checkbox', 'select', 'selectablebox'];

// Block types that use text input
const TEXT_BLOCK_TYPES = [
  'textfield',
  'text',
  'email',
  'phone',
  'number',
  'url',
];

// Block types that use textarea
const TEXTAREA_BLOCK_TYPES = ['textarea', 'longtext'];

export const ChatInput: React.FC<ChatInputProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  placeholder = 'Type your answer...',
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value ?? '');

  // Get block definition to check for chatRenderer
  const { blockOverrides } = useSurveyForm();
  // Look the block up again once an override fails, so the system block's input is used.
  useBlockOverrideFailures();
  const blockDefinition = resolveBlockDefinition(block.type, blockOverrides);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      } else if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [block.uuid]);

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (localValue || value) {
        onSubmit(localValue || value);
      }
    }
  };

  const handleSubmitClick = () => {
    if (localValue || value) {
      onSubmit(localValue || value);
    }
  };

  const blockType = block.type;

  // PRIORITY 1: Check if block has a custom chatRenderer
  if (blockDefinition?.chatRenderer) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {blockDefinition.chatRenderer({
          block,
          value,
          onChange,
          onSubmit,
          theme,
          disabled,
          error,
          placeholder,
        })}
      </motion.div>
    );
  }

  // PRIORITY 2: Check if block type is known (existing hardcoded UI)
  const isKnownBlockType =
    OPTION_BLOCK_TYPES.includes(blockType) ||
    TEXT_BLOCK_TYPES.includes(blockType) ||
    TEXTAREA_BLOCK_TYPES.includes(blockType) ||
    ['datepicker', 'date', 'range', 'slider', 'fileupload', 'file'].includes(
      blockType,
    );

  // PRIORITY 3: For unknown blocks, check for inputSchema or outputSchema
  if (!isKnownBlockType) {
    const inputSchema = blockDefinition?.inputSchema;
    const outputSchema = blockDefinition?.outputSchema;

    if (inputSchema || outputSchema) {
      // Use schema-based input for unknown blocks with schemas
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <SchemaBasedInput
            block={block}
            schema={outputSchema || inputSchema}
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            theme={theme}
            disabled={disabled}
            error={error}
            placeholder={placeholder}
          />
        </motion.div>
      );
    }

    // No chatRenderer, not a known block type, and no schema - show error
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg"
      >
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Unknown block type: {blockType}</span>
        </div>
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          This block type does not have a chatRenderer defined and no
          inputSchema or outputSchema is available. Please add a chatRenderer to
          the block definition or define an inputSchema/outputSchema.
        </p>
      </motion.div>
    );
  }

  // Render option buttons for radio/checkbox/select
  if (OPTION_BLOCK_TYPES.includes(blockType)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <ChatOptionButtons
          block={block}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          theme={theme}
          disabled={disabled}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </motion.div>
    );
  }

  // Render date picker
  if (blockType === 'datepicker' || blockType === 'date') {
    const selectedDate = value ? new Date(value) : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 w-full"
      >
        <DatePickerPopover
          value={selectedDate}
          onChange={(date) => {
            const isoValue = date.toISOString();
            onChange(isoValue);
            setTimeout(() => onSubmit(isoValue), 150);
          }}
          placeholder="Pick a date"
          disabled={disabled}
          error={!!error}
          side="top"
          showMonthSelect
          showYearSelect
          triggerClassName="h-12"
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </motion.div>
    );
  }

  // Render range/slider
  if (blockType === 'range' || blockType === 'slider') {
    const min = block.min ?? 0;
    const max = block.max ?? 100;
    const step = block.step ?? 1;
    const currentValue = value ?? min;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 w-full"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{min}</span>
          <Slider
            value={[currentValue]}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onValueChange={(vals) => onChange(vals[0])}
            className="flex-1"
          />
          <span className="text-sm text-gray-500">{max}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">{currentValue}</span>
          <Button
            type="button"
            onClick={() => onSubmit(currentValue)}
            disabled={disabled}
            className="rounded-full px-6"
            style={
              theme?.colors?.primary
                ? { backgroundColor: theme.colors.primary }
                : undefined
            }
          >
            Confirm
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </motion.div>
    );
  }

  // Render file upload
  if (blockType === 'fileupload' || blockType === 'file') {
    const acceptedTypes = (block.acceptedFileTypes as string[]) || [];
    const maxFiles = parseInt(String(block.maxFiles || '1'), 10);
    const maxFileSize =
      parseFloat(String(block.maxFileSize || '5')) * 1024 * 1024; // MB to bytes
    const currentFiles = Array.isArray(value) ? value : value ? [value] : [];

    const handleFileSelect = (files: FileList | null) => {
      if (!files || disabled) return;

      const validFiles: File[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;

        // Validate file type
        if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileExt)) {
          errors.push(`${file.name}: Invalid file type`);
          continue;
        }

        // Validate file size
        if (file.size > maxFileSize) {
          errors.push(
            `${file.name}: File too large (max ${block.maxFileSize || '5'}MB)`,
          );
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const newFiles = [...currentFiles, ...validFiles].slice(0, maxFiles);
        const finalValue = maxFiles === 1 ? newFiles[0] : newFiles;
        onChange(finalValue);
        setTimeout(() => onSubmit(finalValue), 150);
      }
    };

    // Convert value to File[] if needed
    const fileValue = Array.isArray(value) ? value : value ? [value] : [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer',
            'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="text-sm text-gray-500 font-medium">
              {currentFiles.length > 0
                ? `${currentFiles.length} file(s) selected`
                : 'Click to upload a file'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {acceptedTypes.length > 0
                ? acceptedTypes.join(', ')
                : 'All files'}
              {maxFiles > 1 && ` • Max ${maxFiles} files`}
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            disabled={disabled}
            accept={
              acceptedTypes.length > 0 ? acceptedTypes.join(',') : undefined
            }
            multiple={maxFiles > 1}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </label>
        {/* Show selected file names */}
        {currentFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentFiles.map((file: File, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {file.name}
              </span>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </motion.div>
    );
  }

  // Render textarea for long text
  if (TEXTAREA_BLOCK_TYPES.includes(blockType)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 w-full"
      >
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey && (localValue || value)) {
              onSubmit(localValue || value);
            }
          }}
          placeholder={block.placeholder || placeholder}
          disabled={disabled}
          className={cn(
            'min-h-[100px] resize-none rounded-xl',
            theme?.field?.textarea,
          )}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Press Cmd+Enter to submit
          </span>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={disabled || !localValue}
            size="sm"
            className="rounded-full w-full flex-1 lg:w-fit lg:flex-0 flex gap-3 items-center"
            style={
              theme?.colors?.primary
                ? { backgroundColor: theme.colors.primary }
                : undefined
            }
          >
            <span className="inline-block">Continue</span>
            <Send className="w-3 h-3 lg:w-4 lg:h-4" />
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </motion.div>
    );
  }

  // Default: text input with send button
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full h-fit flex gap-2 lg:gap-4 items-center"
    >
      <Input
        ref={inputRef}
        type={
          blockType === 'email'
            ? 'email'
            : blockType === 'number'
              ? 'number'
              : 'text'
        }
        value={localValue}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={block.placeholder || placeholder}
        disabled={disabled}
        className={cn(
          theme?.field?.input,
          error && 'border-red-500',
        )}
      />
      <Button
        type="button"
        onClick={handleSubmitClick}
        disabled={disabled || !localValue}
        className={cn(
          theme?.button?.primary
            ? theme?.button?.primary
            : 'shadow-none ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'relative rounded-full shrink-0 flex items-center justify-center flex-none h-full w-auto aspect-square min-h-[64px]'
        )}
        style={
          theme?.colors?.primary
            ? { backgroundColor: theme.colors.primary }
            : undefined
        }
      >
        <Send className="w-7 h-7 text-white" />
      </Button>
      {error && (
        <p className="absolute -bottom-6 left-0 text-sm text-red-500">
          {error}
        </p>
      )}
    </motion.div>
  );
};
