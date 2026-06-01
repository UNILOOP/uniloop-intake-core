import React, { forwardRef, useState } from 'react';
import {
  BlockData,
  BlockDefinition,
  ContentBlockItemProps,
  ThemeDefinition,
  ChatRendererProps,
} from '../types';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import {
  CheckSquare,
  CirclePlus,
  CircleX,
  GripVertical,
  Check,
} from 'lucide-react';
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

interface CheckboxOption {
  id: string;
  label: string;
  value: string;
}

// Form component for editing the block configuration
const CheckboxBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // Extract options from block data
  const options: CheckboxOption[] = data.options || [];

  // Handle field changes
  const handleChange = (
    field: string,
    value: string | CheckboxOption[] | boolean
  ) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  // Handle adding a new option
  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;

    const newOptions = [
      ...options,
      {
        id: uuidv4(),
        label: newOptionLabel,
        value: newOptionValue || newOptionLabel,
      },
    ];

    handleChange('options', newOptions);
    setNewOptionLabel('');
    setNewOptionValue('');
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
            Label
          </Label>
          <Input
            id="label"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Select all that apply"
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

      {/* Options section */}
      <div className="space-y-2 border rounded-md p-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm">Checkbox Options</Label>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={options.map((option) => option.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {options.map((option, index) => (
                <SortableCheckboxOption
                  key={option.id}
                  option={option}
                  index={index}
                  onUpdateOption={handleUpdateOption}
                  onRemoveOption={handleRemoveOption}
                />
              ))}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CirclePlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grow grid grid-cols-2 gap-2">
                    <Input
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      placeholder="New option label"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                    />
                    <Input
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
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
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

// Component to render the block in the survey
const CheckboxBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        {data.label && (
          <Label className="text-sm" htmlFor={data.fieldName}>
            {data.label}
          </Label>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {data.options.map((option: CheckboxOption, index: number) => {
          const optionValue = option.value;
          const id = `${data.fieldName}-${index}`;

          return (
            <div
              key={option.id || id}
              className="flex items-center space-x-2 py-1"
            >
              <Checkbox id={id} name={`${data.fieldName}[]`} />
              <Label
                htmlFor={id}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>

      {data.description && (
        <p className="text-sm text-muted-foreground ml-6">{data.description}</p>
      )}

      {data.showYesNo && (
        <div className="flex space-x-4 ml-6 text-sm text-muted-foreground">
          <span>Checked: {data.trueLabel || 'Yes'}</span>
          <span>Unchecked: {data.falseLabel || 'No'}</span>
        </div>
      )}
    </div>
  );
};

// Preview component shown in the block library
const CheckboxBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <div className="flex items-center space-x-2 w-4/5 max-w-full">
        <Checkbox id="preview-checkbox" disabled />
        <Label className="text-sm" htmlFor="preview-checkbox">
          Checkbox option
        </Label>
      </div>
    </div>
  );
};

interface CheckboxRendererProps {
  block: BlockData;
  value?: (string | number)[];
  onChange?: (value: (string | number)[]) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: ThemeDefinition;
}

const CheckboxRenderer = forwardRef<HTMLButtonElement, CheckboxRendererProps>(
  (
    { block, value = [], onChange, onBlur, error, disabled, theme = null },
    ref
  ) => {
    const themeConfig = theme ?? themes.default;

    // Get labels and values arrays from the block
    const label = block.label || [];
    const options = block.options || [];
    const values = block.values || options.map((_: any, i: any) => i);

    // Handle checkbox change
    const handleChange = (optionValue: string | number, checked: boolean) => {
      if (!onChange) return;

      const currentValues = [...(value || [])];

      if (checked) {
        // Add the value if not already present
        if (!currentValues.includes(optionValue)) {
          onChange([...currentValues, optionValue]);
        }
      } else {
        // Remove the value
        onChange(currentValues.filter((v) => v !== optionValue));
      }

      if (onBlur) {
        onBlur();
      }
    };

    return (
      <div className="survey-checkbox space-y-3 w-full min-w-0">
        {/* Label */}
        {label && (
          <Label className={cn('text-base block', themeConfig.field.label)}>
            {label}
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

        {/* Checkbox options */}
        <div className="space-y-2 mt-2">
          {options.map((option: CheckboxOption, index: number) => {
            const optionValue = option.value ?? values[index];
            const id = `${block.fieldName}-${index}`;
            const isChecked =
              typeof optionValue === 'string' || typeof optionValue === 'number'
                ? value?.includes(optionValue) || false
                : false;

            return (
              <div
                key={option.id || id}
                className="flex items-center space-x-2 py-1"
              >
                <Checkbox
                  id={id}
                  name={`${block.fieldName}[]`}
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={(checked: boolean) =>
                    handleChange(optionValue as string, checked as boolean)
                  }
                  aria-invalid={!!error}
                  ref={index === 0 ? ref : undefined}
                />
                <Label
                  htmlFor={id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>

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
  }
);

CheckboxRenderer.displayName = 'CheckboxRenderer';

// Sortable option component for drag and drop
interface SortableCheckboxOptionProps {
  option: CheckboxOption;
  index: number;
  onUpdateOption: (
    index: number,
    field: 'label' | 'value',
    value: string
  ) => void;
  onRemoveOption: (index: number) => void;
}

const SortableCheckboxOption: React.FC<SortableCheckboxOptionProps> = ({
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
        <span className="text-xs text-muted-foreground">{index + 1}</span>
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

/**
 * Chat renderer for Checkbox - provides a streamlined chat experience
 * for selecting multiple options with styled option cards
 */
const CheckboxChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value = [],
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  const themeConfig = theme ?? themes.default;

  // Get options from block
  const options: CheckboxOption[] = block.options || [];

  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : [];

  // Handle option toggle
  const handleOptionToggle = (optionValue: string) => {
    if (disabled) return;

    const isSelected = selectedValues.includes(optionValue);
    let newValues: (string | number)[];

    if (isSelected) {
      newValues = selectedValues.filter((v) => v !== optionValue);
    } else {
      newValues = [...selectedValues, optionValue];
    }

    onChange(newValues);
  };

  // Handle submit
  const handleSubmit = () => {
    onSubmit(selectedValues);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Options grid */}
      <div className="flex flex-col gap-3">
        {options.map((option, index) => {
          const optionValue = option.value;
          const isSelected = selectedValues.includes(optionValue);

          return (
            <button
              key={option.id || `${block.fieldName}-${index}`}
              type="button"
              onClick={() => handleOptionToggle(optionValue)}
              disabled={disabled}
              className={cn(
                'relative w-full flex justify-between gap-6 items-center transition-all border',
                themeConfig.field.select,
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                borderColor: isSelected
                  ? themeConfig.colors.primary
                  : themeConfig.colors.border,
              }}
            >
              {/* Label */}
              <p
                className={cn(
                  'text-left transition-colors mb-0',
                  themeConfig.field.label
                )}
                style={{
                  color: isSelected ? themeConfig.colors.primary : undefined,
                  marginBottom: 0, // Force override of theme label margin
                }}
              >
                {option.label}
              </p>

              {/* Custom checkbox indicator */}
              <div
                className="flex h-6 w-6 items-center justify-center rounded border bg-white shrink-0 relative transition-colors"
                style={{
                  borderColor: isSelected
                    ? themeConfig.colors.primary
                    : themeConfig.colors.border,
                  flexShrink: 0,
                  borderRadius: '6px',
                }}
              >
                {isSelected && (
                  <Check
                    className="w-4 h-4"
                    style={{ color: themeConfig.colors.primary }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-destructive px-2">{error}</p>}

      {/* Submit button */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className={cn(
          'h-12 rounded-xl w-full mt-2 font-semibold',
          themeConfig.button.primary
        )}
        style={
          themeConfig.colors.primary
            ? { backgroundColor: themeConfig.colors.primary }
            : undefined
        }
      >
        {selectedValues.length > 0
          ? `Continue with ${selectedValues.length} selected`
          : 'Continue'}
      </Button>
    </div>
  );
};

// Export the block definition
export const CheckboxBlock: BlockDefinition = {
  type: 'checkbox',
  name: 'Checkbox',
  description: 'Single checkbox for binary/boolean options',
  icon: <CheckSquare className="w-4 h-4" />,
  defaultData: {
    type: 'checkbox',
    fieldName: generateFieldName('checkbox'),
    label: 'Select all that apply',
    description: '',
    options: [
      {
        id: uuidv4(),
        label: 'Option 1',
        value: 'option-1',
      },
      {
        id: uuidv4(),
        label: 'Option 2',
        value: 'option-2',
      },
    ],
  },
  generateDefaultData: () => ({
    type: 'checkbox',
    fieldName: generateFieldName('checkbox'),
    label: 'Select all that apply',
    description: '',
    options: [
      {
        id: uuidv4(),
        label: 'Option 1',
        value: 'option-1',
      },
      {
        id: uuidv4(),
        label: 'Option 2',
        value: 'option-2',
      },
    ],
  }),
  renderItem: (props) => <CheckboxBlockItem {...props} />,
  renderFormFields: (props) => <CheckboxBlockForm {...props} />,
  renderPreview: () => <CheckboxBlockPreview />,
  renderBlock: (props) => <CheckboxRenderer {...props} />,
  chatRenderer: (props) => <CheckboxChatRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    if (!data.label) return 'Label is required';
    return null;
  },
  validateValue: (value, data) => {
    if (data.required && (!value || value === false))
      return 'This field is required';
    return null;
  },
  inputSchema: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  // Output schema - this block returns an array of strings (selected option values)
  outputSchema: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
