import React, { useEffect, useState } from 'react';
import type {
  BlockData,
  BlockDefinition,
  ContentBlockItemProps,
  ThemeDefinition,
  ChatRendererProps,
} from '../types';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { DatePickerPopover } from '../components/ui/datepicker-popover';
import { Switch } from '../components/ui/switch';
import { cn } from '../lib/utils';
import { generateFieldName } from './utils/GenFieldName';
import { themes } from '../themes';
import { format } from 'date-fns';

/**
 * Calculate a date based on age (years ago from today)
 * @param age - The age in years
 * @returns Date representing the birthdate for that age
 */
const getDateFromAge = (age: number): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date;
};

// Simple date formatter function since we're not using date-fns
const formatDate = (date: Date, format: string = 'PPP'): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (format === 'PP') {
    options.month = 'short';
  } else if (format === 'P') {
    options.month = 'numeric';
  }

  return date.toLocaleDateString('en-US', options);
};

// Form component for editing the block configuration
const DatePickerBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  // Handle field changes
  const handleChange = (field: string, value: string | boolean) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onUpdate?.({
        ...data,
        defaultValue: date.toISOString(),
      });
    } else {
      onUpdate?.({
        ...data,
        defaultValue: undefined,
      });
    }
  };

  // Create date from string value or undefined
  const defaultDate = data.defaultValue
    ? new Date(data.defaultValue as string)
    : undefined;

  // Format to display default date
  const formattedDate = defaultDate
    ? formatDate(defaultDate, 'PPP')
    : 'No default date';

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
            placeholder="Select a date..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="dateFormat">
            Date Format
          </Label>
          <Input
            id="dateFormat"
            value={data.dateFormat || ''}
            onChange={(e) => handleChange('dateFormat', e.target.value)}
            placeholder="PPP (e.g., April 29, 2025)"
          />
          <p className="text-xs text-muted-foreground">
            Format pattern: PPP, PP, or P
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="defaultValue">
            Default Value
          </Label>
          <Popover>
            <PopoverTrigger>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !defaultDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <CalendarComponent
                selected={defaultDate}
                onSelect={handleDateChange}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 pt-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="showCalendarOnFocus"
              checked={data.showCalendarOnFocus === true}
              onCheckedChange={(checked) =>
                handleChange('showCalendarOnFocus', checked)
              }
            />
            <Label className="text-sm" htmlFor="showCalendarOnFocus">
              Show calendar on input focus
            </Label>
          </div>
        </div>
      </div>
      {/* Date-based constraints */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="minDate">
            Minimum Date
          </Label>
          <Input
            id="minDate"
            type="date"
            value={data.minDate || ''}
            onChange={(e) => {
              onUpdate?.({
                ...data,
                minDate: e.target.value,
                maxAge: '', // Clear age when setting date
              });
            }}
            disabled={!!data.maxAge}
          />
          <p className="text-xs text-muted-foreground">Or use Max Age below</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="maxDate">
            Maximum Date
          </Label>
          <Input
            id="maxDate"
            type="date"
            value={data.maxDate || ''}
            onChange={(e) => {
              onUpdate?.({
                ...data,
                maxDate: e.target.value,
                minAge: '', // Clear age when setting date
              });
            }}
            disabled={!!data.minAge}
          />
          <p className="text-xs text-muted-foreground">Or use Min Age below</p>
        </div>
      </div>

      {/* Age-based constraints */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="minAge">
            Minimum Age
          </Label>
          <Input
            id="minAge"
            type="number"
            min="0"
            placeholder="e.g., 18"
            value={data.minAge || 18}
            onChange={(e) => {
              onUpdate?.({
                ...data,
                minAge: e.target.value,
                maxDate: '', // Clear date when setting age
              });
            }}
            disabled={!!data.maxDate}
          />
          <p className="text-xs text-muted-foreground">
            Must be at least X years old
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="maxAge">
            Maximum Age
          </Label>
          <Input
            id="maxAge"
            type="number"
            min="0"
            placeholder="e.g., 100"
            value={data.maxAge || ''}
            onChange={(e) => {
              onUpdate?.({
                ...data,
                maxAge: e.target.value,
                minDate: '', // Clear date when setting age
              });
            }}
            disabled={!!data.minDate}
          />
          <p className="text-xs text-muted-foreground">
            Must be at most X years old
          </p>
        </div>
      </div>

      {/* Disabled days */}
      <div className="space-y-2">
        <Label className="text-sm" htmlFor="disabledDays">
          Disabled Days
        </Label>
        <Input
          id="disabledDays"
          placeholder="0,6 (Sun,Sat)"
          value={data.disabledDays || ''}
          onChange={(e) => handleChange('disabledDays', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated days (0=Sun, 6=Sat)
        </p>
      </div>
    </div>
  );
};

// Component to render the block in the survey
const DatePickerBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  const [date, setDate] = React.useState<Date | undefined>(
    data.defaultValue ? new Date(data.defaultValue as string) : undefined
  );
  const [isOpen, setIsOpen] = React.useState(false);

  // Format date according to specified format or default
  const formatSelectedDate = (date: Date) => {
    try {
      return formatDate(date, data.dateFormat || 'PPP');
    } catch (e) {
      return formatDate(date, 'PPP');
    }
  };

  // Parse disabled days
  const disabledDays = React.useMemo(() => {
    if (!data.disabledDays) return undefined;

    try {
      return data.disabledDays
        .split(',')
        .map((d: string) => parseInt(d.trim(), 10));
    } catch {
      return undefined;
    }
  }, [data.disabledDays]);

  // Create date range constraints
  const dateConstraints = React.useMemo(() => {
    const constraints: { from?: Date; to?: Date } = {};

    if (data.minDate) {
      try {
        constraints.from = new Date(data.minDate);
      } catch (e) {
        // Invalid date, ignore
      }
    }

    if (data.maxDate) {
      try {
        constraints.to = new Date(data.maxDate);
      } catch (e) {
        // Invalid date, ignore
      }
    }

    return constraints;
  }, [data.minDate, data.maxDate]);

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

      <Popover>
        <PopoverTrigger>
          <Button
            type="button"
            id={data.fieldName}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date
              ? formatSelectedDate(date)
              : data.placeholder || 'Select a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <CalendarComponent
            selected={date}
            onSelect={setDate}
            disabled={dateConstraints}
            disableWeekdays={disabledDays}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Preview component shown in the block library
const DatePickerBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <Button
        type="button"
        variant="outline"
        className="w-4/5 max-w-full justify-start text-left font-normal text-muted-foreground"
        disabled
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Date picker
      </Button>
    </div>
  );
};

interface DatePickerRendererProps {
  block: BlockData;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: ThemeDefinition;
}

// Map our format strings to date-fns format strings
const getDateFormat = (formatStr: string = 'PPP'): string => {
  // Map our format strings to date-fns format strings
  switch (formatStr) {
    case 'P':
      return 'MM/dd/yyyy';
    case 'PP':
      return 'MMM d, yyyy';
    case 'PPP':
    default:
      return 'MMMM d, yyyy';
  }
};

/**
 * Chat renderer for DatePicker - streamlined chat experience
 * Provides a compact date picker UI optimized for conversational flow
 */
const DatePickerChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  const storageKey = `survey_field_${block.uuid || block.fieldName}`;

  const [date, setDate] = useState<Date | null>(() => {
    if (value) return new Date(value);

    // Check session storage if no value is passed
    try {
      if (typeof window !== 'undefined') {
        const savedValue = sessionStorage.getItem(storageKey);
        if (savedValue) return new Date(savedValue);
      }
    } catch (e) {
      console.error('Error loading selection from sessionStorage', e);
    }

    return block.defaultValue ? new Date(block.defaultValue as string) : null;
  });

  const [isOpen, setIsOpen] = useState(false);

  // Sync with value prop
  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    }
  }, [value]);

  // Persist to session storage
  useEffect(() => {
    if (date && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, date.toISOString());
      } catch (e) {
        console.error('Error saving selection to sessionStorage', e);
      }
    }
  }, [date, storageKey]);
  // Calculate the initial date for the calendar based on minAge or maxDate
  // minAge determines the LATEST valid date (must be at least X years old)
  const initialCalendarDate = React.useMemo(() => {
    // If there's already a selected date, use that
    if (date) return date;
    if (block.minAge) {
      const minAge = parseInt(block.minAge as string, 10);
      if (!isNaN(minAge)) {
        return getDateFromAge(minAge);
      }
    }
    // If maxDate is set, start at that date
    if (block.maxDate) {
      const maxDate = new Date(block.maxDate);
      if (!isNaN(maxDate.getTime())) {
        return maxDate;
      }
    }
    // Default to today
    return new Date();
  }, [date, block.minAge, block.maxDate]);

  // Parse disabled days from comma-separated string
  const disabledDays = React.useMemo(() => {
    if (!block.disabledDays) return undefined;
    try {
      return block.disabledDays
        .split(',')
        .map((d: string) => parseInt(d.trim(), 10));
    } catch {
      return undefined;
    }
  }, [block.disabledDays]);

  const dateConstraints = React.useMemo(() => {
    const constraints: { from?: Date; to?: Date } = {};

    if (block.minAge) {
      const minAge = parseInt(block.minAge as string, 10);
      if (!isNaN(minAge)) {
        constraints.to = getDateFromAge(minAge);
      }
    } else if (block.maxDate) {
      try {
        constraints.to = new Date(block.maxDate);
      } catch (e) {}
    }

    if (block.maxAge) {
      const maxAge = parseInt(block.maxAge as string, 10);
      if (!isNaN(maxAge)) {
        constraints.from = getDateFromAge(maxAge);
      }
    } else if (block.minDate) {
      try {
        constraints.from = new Date(block.minDate);
      } catch (e) {}
    }

    return constraints;
  }, [block.minAge, block.maxAge, block.minDate, block.maxDate]);

  const handleDateSelect = (selectedDate: Date) => {
    setDate(selectedDate);
    setIsOpen(false);
    const isoValue = selectedDate.toISOString();
    onChange(isoValue);
  };

  const handleSubmit = () => {
    if (date) {
      const isoValue = date.toISOString();
      onSubmit(isoValue);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex gap-4 items-center justify-between">
        {/* Date Picker Popover */}
        <div className="w-full sm:w-1/2 flex flex-col relative">
          <DatePickerPopover
            value={date}
            onChange={handleDateSelect}
            placeholder={block.placeholder || 'Pick a date'}
            disabled={disabled}
            error={!!error}
            dateConstraints={dateConstraints}
            disableWeekdays={disabledDays}
            initialDate={initialCalendarDate}
            showMonthSelect
            showYearSelect
            open={isOpen}
            onOpenChange={setIsOpen}
            triggerClassName="h-14 rounded-xl"
            formatDate={(d) =>
              format(d, getDateFormat(block.dateFormat as string))
            }
            side="top"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !date}
          className="h-14 px-6 rounded-xl sm:w-1/3"
          style={
            theme?.colors?.primary
              ? { backgroundColor: theme.colors.primary }
              : undefined
          }
        >
          Continue
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm font-medium text-destructive">{error}</div>
      )}
    </div>
  );
};

const DatePickerRenderer: React.FC<DatePickerRendererProps> = ({
  block,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  theme = null,
}) => {
  const themeConfig = theme ?? themes.default;

  const storageKey = `survey_field_${block.uuid || block.fieldName}`;

  // State for the selected date
  const [date, setDate] = useState<Date | null>(() => {
    if (value) return new Date(value);

    // Check session storage if no value is passed
    try {
      if (typeof window !== 'undefined') {
        const savedValue = sessionStorage.getItem(storageKey);
        if (savedValue) return new Date(savedValue);
      }
    } catch (e) {
      console.error('Error loading selection from sessionStorage', e);
    }

    return block.defaultValue ? new Date(block.defaultValue as string) : null;
  });

  // Sync with value prop
  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    }
  }, [value]);

  // Persist to session storage
  useEffect(() => {
    if (date && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, date.toISOString());
      } catch (e) {
        console.error('Error saving selection to sessionStorage', e);
      }
    }
  }, [date, storageKey]);

  // State for the calendar open/closed status
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Update internal state when prop value changes
  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    }
  }, [value]);

  // Handle date selection
  const handleDateSelect = (selectedDate: Date) => {
    setDate(selectedDate);

    if (onChange) {
      onChange(selectedDate.toISOString());
    }

    if (onBlur) {
      onBlur();
    }

    setIsCalendarOpen(false);
  };

  // Handle input click to open calendar
  const handleInputClick = () => {
    if (!disabled && block.showCalendarOnFocus) {
      setIsCalendarOpen(!isCalendarOpen);
    }
  };

  // Parse disabled days from comma-separated string
  const disabledDays = React.useMemo(() => {
    if (!block.disabledDays) return undefined;

    try {
      return block.disabledDays
        .split(',')
        .map((d: string) => parseInt(d.trim(), 10));
    } catch {
      return undefined;
    }
  }, [block.disabledDays]);

  // Create date range constraints (age-based takes priority over date-based)
  const dateConstraints = React.useMemo(() => {
    const constraints: { from?: Date; to?: Date } = {};

    // minAge sets the maximum selectable date (must be at least X years old)
    if (block.minAge) {
      const minAge = parseInt(block.minAge as string, 10);
      if (!isNaN(minAge)) {
        constraints.to = getDateFromAge(minAge);
      }
    } else if (block.maxDate) {
      try {
        constraints.to = new Date(block.maxDate);
      } catch (e) {
        // Invalid date, ignore
      }
    }

    // maxAge sets the minimum selectable date (must be at most X years old)
    if (block.maxAge) {
      const maxAge = parseInt(block.maxAge as string, 10);
      if (!isNaN(maxAge)) {
        constraints.from = getDateFromAge(maxAge);
      }
    } else if (block.minDate) {
      try {
        constraints.from = new Date(block.minDate);
      } catch (e) {
        // Invalid date, ignore
      }
    }

    return constraints;
  }, [block.minAge, block.maxAge, block.minDate, block.maxDate]);

  // Format date according to specified format
  const formattedDate = date
    ? formatDate(date, (block.dateFormat as string) || 'PPP')
    : '';

  return (
    <div className="survey-datepicker space-y-2 w-full min-w-0">
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

      {/* Date picker using shadcn components */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={block.fieldName}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              error && 'border-destructive',
              themeConfig.field.input
            )}
            disabled={disabled}
            onClick={() => setIsCalendarOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, getDateFormat(block.dateFormat as string))
            ) : (
              <span>{block.placeholder || 'Select a date'}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date || undefined}
            onSelect={(newDate) => {
              if (newDate) {
                handleDateSelect(newDate);
              }
            }}
            disabled={dateConstraints}
            disableWeekdays={disabledDays}
            initialFocus
          />
        </PopoverContent>
      </Popover>

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
};

// Export the block definition
export const DatePickerBlock: BlockDefinition = {
  type: 'datepicker',
  name: 'Date Picker',
  description: 'Calendar component for selecting a date',
  icon: <Calendar className="w-4 h-4" />,
  defaultData: {
    type: 'datepicker',
    fieldName: generateFieldName('date'),
    label: 'Select a date',
    description: '',
    placeholder: 'Pick a date',
    dateFormat: 'PPP',
    showCalendarOnFocus: true,
    minDate: '',
    maxDate: '',
    minAge: '18',
    maxAge: '',
    disabledDays: '',
  },
  generateDefaultData: () => ({
    type: 'datepicker',
    fieldName: generateFieldName('date'),
    label: 'Select a date',
    description: '',
    placeholder: 'Pick a date',
    dateFormat: 'PPP',
    showCalendarOnFocus: true,
    minDate: '',
    maxDate: '',
    minAge: '18',
    maxAge: '',
    disabledDays: '',
  }),
  renderItem: (props) => <DatePickerBlockItem {...props} />,
  renderFormFields: (props) => <DatePickerBlockForm {...props} />,
  renderPreview: () => <DatePickerBlockPreview />,
  renderBlock: (props: DatePickerRendererProps) => (
    <DatePickerRenderer {...props} />
  ),
  chatRenderer: (props) => <DatePickerChatRenderer {...props} />,
  inputSchema: {
    type: 'string',
  },
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    if (!data.label) return 'Label is required';
    return null;
  },
  validateValue: (value, data) => {
    if (data.required && !value) return 'This field is required';

    // Validate date is within range if minDate or maxDate is set
    if (value) {
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) return 'Please enter a valid date';

      if (data.minDate) {
        const minDate = new Date(data.minDate);
        if (dateValue < minDate)
          return `Date must be after ${minDate.toLocaleDateString()}`;
      }

      if (data.maxDate) {
        const maxDate = new Date(data.maxDate);
        if (dateValue > maxDate)
          return `Date must be before ${maxDate.toLocaleDateString()}`;
      }
    }

    return null;
  },
  // Output schema - this block returns a date as a string (ISO format)
  outputSchema: {
    type: 'date',
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
