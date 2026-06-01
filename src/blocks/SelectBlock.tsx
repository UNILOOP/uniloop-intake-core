import React, { forwardRef, useState } from 'react';
import {
  BlockData,
  BlockDefinition,
  ContentBlockItemProps,
  ThemeDefinition,
  ChatRendererProps,
} from '../types';
import { Check } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { CirclePlus, CircleX, ListFilter, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { generateFieldName } from './utils/GenFieldName';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SelectOption {
  id: string;
  label: string;
  value: string;
}

// Form component for editing the block configuration
const SelectBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  // Convert legacy labels/values arrays to options format
  const options: SelectOption[] =
    data.options ||
    (data.labels || []).map((label: string, index: number) => ({
      id: uuidv4(),
      label,
      value: (data.values || [])[index] || label,
    }));

  // Handle field changes
  const handleChange = (field: string, value: any) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  // Handle adding a new option
  const handleAddOption = () => {
    if (!newLabel.trim()) return;

    const newOptions = [
      ...options,
      {
        id: uuidv4(),
        label: newLabel,
        value: newValue || newLabel,
      },
    ];

    handleChange('options', newOptions);
    setNewLabel('');
    setNewValue('');
  };

  // Handle removing an option
  const handleRemoveOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    handleChange('options', newOptions);
  };

  // Handle updating an option
  const handleUpdateOption = (
    index: number,
    field: 'label' | 'value',
    value: string
  ) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value,
    };
    handleChange('options', newOptions);
  };

  // Handle drag end for reordering options
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((option) => option.id === active.id);
      const newIndex = options.findIndex((option) => option.id === over.id);

      const newOptions = arrayMove(options, oldIndex, newIndex);
      handleChange('options', newOptions);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="label">
            Question Label
          </Label>
          <Input
            id="label"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Your question here?"
          />
          <p className="text-xs text-muted-foreground">
            Question or prompt shown to the respondent
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">
          Description/Help Text
        </Label>
        <Input
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Additional information about this question"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="placeholder">
            Placeholder
          </Label>
          <Input
            id="placeholder"
            value={data.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            placeholder="Select an option..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="defaultValue">
            Default Value
          </Label>
          <Select
            value={(data.defaultValue as string) || ''}
            onValueChange={(value) => handleChange('defaultValue', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a default option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option, index) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        <div className="border rounded-md p-4 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={options.map((option) => option.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {options.map((option, index) => (
                  <SortableSelectOption
                    key={option.id}
                    option={option}
                    index={index}
                    onUpdateOption={handleUpdateOption}
                    onRemoveOption={handleRemoveOption}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="pt-2 border-t mt-2">
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 flex items-center justify-center">
                <CirclePlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grow grid grid-cols-2 gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="New option label"
                />
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="New option value (optional)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleAddOption}
              >
                <CirclePlus className="h-4 w-4 text-primary" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component to render the block in the survey
const SelectBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  return (
    <div className="space-y-2">
      {data.label && (
        <Label className="text-sm" htmlFor={data.fieldName}>
          {data.label}
        </Label>
      )}

      {data.description && (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      )}

      <Select defaultValue={data.defaultValue as string}>
        <SelectTrigger id={data.fieldName}>
          <SelectValue
            placeholder={data.placeholder || 'Select an option...'}
          />
        </SelectTrigger>
        <SelectContent>
          {(data.options || data.labels || []).map(
            (item: any, index: number) => {
              const label = item.label || item;
              const value = item.value || (data.values || [])[index] || item;
              return (
                <SelectItem key={item.id || index} value={value.toString()}>
                  {label}
                </SelectItem>
              );
            }
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

// Preview component shown in the block library
const SelectBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <Select disabled>
        <SelectTrigger className="w-4/5 max-w-full">
          <SelectValue placeholder="Dropdown select" />
        </SelectTrigger>
      </Select>
    </div>
  );
};

interface SelectRendererProps {
  block: BlockData;
  value?: string | number;
  onChange?: (value: string | number | boolean) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: ThemeDefinition;
}

export const SelectRenderer = forwardRef<
  HTMLButtonElement,
  SelectRendererProps
>(({ block, value, onChange, onBlur, error, disabled, theme = null }, ref) => {
  const themeConfig = theme ?? themes.default;

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value);
  };

  // Get labels and values arrays from the block
  const labels = block.labels || [];
  const values = block.values || labels.map((_, i) => i);

  return (
    <div className="survey-select space-y-2 w-full min-w-0">
      {/* Label */}
      {block.label && (
        <Label
          htmlFor={block.fieldName}
          className={cn('text-base', themeConfig.field.label)}
        >
          {block.label}
        </Label>
      )}

      {/* Description */}
      {block.description && (
        <div
          className={cn(
            'text-sm text-muted-foreground',
            themeConfig.field.description
          )}
        >
          {block.description}
        </div>
      )}

      {/* Select field */}
      <Select
        name={block.fieldName}
        value={
          value !== undefined && value !== null ? value.toString() : undefined
        }
        onValueChange={(selectedValue) => {
          // Find the original value type (string or number)
          const index = values.findIndex((v) => v.toString() === selectedValue);
          if (index !== -1) {
            onChange?.(values[index]);
          } else {
            onChange?.(selectedValue);
          }
          if (onBlur) onBlur();
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={block.fieldName}
          className={cn(
            error && 'border-destructive',
            themeConfig.field.select
          )}
          aria-invalid={!!error}
          ref={ref}
        >
          <SelectValue placeholder={block.placeholder || 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
          {labels.map((label, index) => {
            const optionValue = values[index];
            const stringValue =
              optionValue !== undefined ? optionValue.toString() : '';
            return (
              <SelectItem key={index} value={stringValue}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Error message */}
      {error && (
        <div
          className={cn(
            'text-sm font-medium text-destructive',
            themeConfig.field.error
          )}
        >
          {error}
        </div>
      )}
    </div>
  );
});

SelectRenderer.displayName = 'SelectRenderer';

// Sortable option component for drag and drop
interface SortableSelectOptionProps {
  option: SelectOption;
  index: number;
  onUpdateOption: (
    index: number,
    field: 'label' | 'value',
    value: string
  ) => void;
  onRemoveOption: (index: number) => void;
}

const SortableSelectOption: React.FC<SortableSelectOptionProps> = ({
  option,
  index,
  onUpdateOption,
  onRemoveOption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-6 h-6 flex items-center justify-center">
        <ListFilter className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grow grid grid-cols-2 gap-2">
        <Input
          value={option.label}
          onChange={(e) => onUpdateOption(index, 'label', e.target.value)}
          placeholder="Option label"
        />
        <Input
          value={option.value}
          onChange={(e) => onUpdateOption(index, 'value', e.target.value)}
          placeholder="Option value"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemoveOption(index)}
        className="text-destructive"
      >
        <CircleX className="h-4 w-4" />
      </Button>
    </div>
  );
};

const SelectChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  const themeConfig = theme ?? themes.default;
  const options: SelectOption[] =
    block.options ||
    (block.labels || []).map((label: string, index: number) => ({
      id: uuidv4(),
      label,
      value: (block.values || [])[index] || label,
    }));

  // Handle string or number inputs for value
  const currentValue =
    value !== undefined && value !== null ? value.toString() : '';

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
  };

  const handleSubmit = () => {
    onSubmit(currentValue);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-3">
        {options.map((option, index) => {
          const isSelected = currentValue === option.value;
          return (
            <button
              key={option.id || index}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              disabled={disabled}
              className={cn(
                'relative w-full flex justify-between gap-6 items-center transition-all border text-left',
                themeConfig.field.select,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                borderColor: isSelected
                  ? themeConfig.colors.primary
                  : themeConfig.colors.border,
                backgroundColor: themeConfig.colors.background,
              }}
            >
              <div
                className={cn(
                  'text-base font-medium transition-colors mb-0',
                  themeConfig.field.label
                )}
                style={{
                  color: isSelected ? themeConfig.colors.primary : undefined,
                  marginBottom: 0,
                }}
              >
                {option.label}
              </div>

              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border bg-white shrink-0 relative transition-colors"
                style={{
                  borderColor: isSelected
                    ? themeConfig.colors.primary
                    : themeConfig.colors.border,
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: themeConfig.colors.primary }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div
          className={cn(
            'text-sm font-medium text-destructive',
            themeConfig.field.error
          )}
        >
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !currentValue}
        className={cn(
          'h-12 rounded-xl w-full mt-2 font-semibold',
          themeConfig.button.primary
        )}
        style={{
          backgroundColor: themeConfig.colors.primary,
        }}
      >
        Continue
      </Button>
    </div>
  );
};

// Export the block definition
export const SelectBlock: BlockDefinition = {
  type: 'select',
  name: 'Dropdown Select',
  description: 'Single selection from a dropdown list',
  icon: <ListFilter className="w-4 h-4" />,
  defaultData: {
    type: 'select',
    fieldName: generateFieldName('select'),
    label: 'Select an option',
    description: '',
    placeholder: 'Choose from the list...',
    options: [
      {
        id: uuidv4(),
        label: 'Option 1',
        value: '1',
      },
      {
        id: uuidv4(),
        label: 'Option 2',
        value: '2',
      },
      {
        id: uuidv4(),
        label: 'Option 3',
        value: '3',
      },
    ],
    defaultValue: '',
  },
  generateDefaultData: () => ({
    type: 'select',
    fieldName: generateFieldName('select'),
    label: 'Select an option',
    description: '',
    placeholder: 'Choose from the list...',
    options: [
      {
        id: uuidv4(),
        label: 'Option 1',
        value: '1',
      },
      {
        id: uuidv4(),
        label: 'Option 2',
        value: '2',
      },
      {
        id: uuidv4(),
        label: 'Option 3',
        value: '3',
      },
    ],
    defaultValue: '',
  }),

  renderItem: (props) => <SelectBlockItem {...props} />,
  renderFormFields: (props) => <SelectBlockForm {...props} />,
  renderPreview: () => <SelectBlockPreview />,
  renderBlock: (props) => <SelectRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    if (!data.label) return 'Label is required';
    if (!data.labels || !data.labels.length)
      return 'At least one option is required';
    return null;
  },
  validateValue: (value, data) => {
    if (data.required && !value) return 'This field is required';
    if (value && data.values && !data.values.includes(value))
      return 'Selected value is not valid';
    return null;
  },
  // Output schema - this block returns a single selected value (string or number)
  inputSchema: {
    type: 'object',
    properties: {
      value: { type: 'string', description: 'Selected Option' },
    },
  },
  outputSchema: {
    type: 'string',
  },
  chatRenderer: (props) => <SelectChatRenderer {...props} />,
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
