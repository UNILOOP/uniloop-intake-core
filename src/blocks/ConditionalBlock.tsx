import React, { useState, useEffect } from 'react';
import {
  BlockDefinition,
  ConditionalBlockProps,
  ContentBlockItemProps,
  ChatRendererProps,
} from '../types';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import {
  GitBranch,
  Eye,
  EyeOff,
  Code,
  Info,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useSurveyForm } from '../context/SurveyFormContext';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import { FileUploadInput } from '../components/FileUploadInput';
// import { BlockRenderer } from "../renderer/renderers/BlockRenderer"; // Removed to avoid circular import

// Form component for editing the block configuration
const ConditionalBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const [showChildConfig, setShowChildConfig] = useState(false);

  const handleChange = (field: string, value: any) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  const handleChildBlockChange = (field: string, value: any) => {
    onUpdate?.({
      ...data,
      childBlock: {
        ...data.childBlock,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Condition Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <Label className="text-base font-medium">Conditional Logic</Label>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="condition">
            Condition
          </Label>
          <Textarea
            id="condition"
            value={data.condition || ''}
            onChange={(e) => handleChange('condition', e.target.value)}
            placeholder={`// Show this block when condition is true
return age >= 18 && country === "US";

// Or simple field comparison
return fieldA === "Yes";`}
            className="font-mono text-sm min-h-[100px]"
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            JavaScript expression that returns true/false. Use field names as
            variables.
          </p>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-2">
            <strong>Examples:</strong>
            <div className="space-y-1">
              <code className="block">return age {'>'}= 18;</code>
              <code className="block">
                return income {'>'} 50000 && hasInsurance === true;
              </code>
              <code className="block">
                return bmiCalculator?.category === "Overweight";
              </code>
              <code className="block">
                return answers.includes("Option A");
              </code>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="dependencies">
            Dependencies
          </Label>
          <Input
            id="dependencies"
            value={data.dependencies?.join(', ') || ''}
            onChange={(e) => {
              const dependencies = e.target.value
                .split(',')
                .map((dep) => dep.trim())
                .filter((dep) => dep.length > 0);
              handleChange('dependencies', dependencies);
            }}
            placeholder="age, country, fieldA"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of field names this condition depends on
          </p>
        </div>
      </div>

      <Separator />

      {/* Child Block Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            <Label className="text-base font-medium">Child Block</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowChildConfig(!showChildConfig)}
          >
            {showChildConfig ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {showChildConfig ? 'Hide' : 'Show'} Config
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="childBlockType">
            Block Type
          </Label>
          <Select
            value={data.childBlock?.type || 'text'}
            onValueChange={(value) => handleChildBlockChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select block type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="textarea">Text Area</SelectItem>
              <SelectItem value="select">Select Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="radio">Radio Buttons</SelectItem>
              <SelectItem value="number">Number Input</SelectItem>
              <SelectItem value="date">Date Input</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="html">HTML Content</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showChildConfig && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label className="text-sm" htmlFor="childLabel">
                Label
              </Label>
              <Input
                id="childLabel"
                value={data.childBlock?.label || ''}
                onChange={(e) =>
                  handleChildBlockChange('label', e.target.value)
                }
                placeholder="Enter label for the child block"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm" htmlFor="childFieldName">
                Field Name
              </Label>
              <Input
                id="childFieldName"
                value={data.childBlock?.fieldName || ''}
                onChange={(e) =>
                  handleChildBlockChange('fieldName', e.target.value)
                }
                placeholder="conditionalField"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm" htmlFor="childDescription">
                Description
              </Label>
              <Textarea
                id="childDescription"
                value={data.childBlock?.description || ''}
                onChange={(e) =>
                  handleChildBlockChange('description', e.target.value)
                }
                placeholder="Optional description for the child block"
                rows={2}
              />
            </div>

            {(data.childBlock?.type === 'text' ||
              data.childBlock?.type === 'textarea' ||
              data.childBlock?.type === 'number') && (
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="childPlaceholder">
                  Placeholder
                </Label>
                <Input
                  id="childPlaceholder"
                  value={data.childBlock?.placeholder || ''}
                  onChange={(e) =>
                    handleChildBlockChange('placeholder', e.target.value)
                  }
                  placeholder="Enter placeholder text"
                />
              </div>
            )}

            {(data.childBlock?.type === 'select' ||
              data.childBlock?.type === 'radio' ||
              data.childBlock?.type === 'checkbox') && (
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="childOptions">
                  Options
                </Label>
                <Textarea
                  id="childOptions"
                  value={data.childBlock?.options?.join('\n') || ''}
                  onChange={(e) => {
                    const options = e.target.value
                      .split('\n')
                      .filter((opt) => opt.trim().length > 0);
                    handleChildBlockChange('options', options);
                  }}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  One option per line
                </p>
              </div>
            )}

            {data.childBlock?.type === 'html' && (
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="childHtml">
                  HTML Content
                </Label>
                <Textarea
                  id="childHtml"
                  value={data.childBlock?.html || ''}
                  onChange={(e) =>
                    handleChildBlockChange('html', e.target.value)
                  }
                  placeholder="<p>Your HTML content here</p>"
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="className">
          CSS Class Names
        </Label>
        <Input
          id="className"
          value={data.className || ''}
          onChange={(e) => handleChange('className', e.target.value)}
          placeholder="conditional-block custom-styles"
        />
      </div>
    </div>
  );
};

// Component to render the block in the survey
const ConditionalBlockItem: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  // In a real survey, the survey engine would evaluate the condition
  // and only render this component if the condition is true
  const [isVisible] = useState(true); // Always show in preview mode

  if (!isVisible) {
    return null;
  }

  const renderChildBlock = () => {
    const childBlock = data.childBlock;
    if (!childBlock) return null;

    // This is a simplified renderer - in a real implementation,
    // you'd use the actual block renderers from your block registry
    switch (childBlock.type) {
      case 'text':
      case 'number':
        return (
          <div className="space-y-2">
            {childBlock.label && <Label>{childBlock.label}</Label>}
            {childBlock.description && (
              <p className="text-sm text-muted-foreground">
                {childBlock.description}
              </p>
            )}
            <Input
              type={childBlock.type}
              placeholder={childBlock.placeholder}
              onChange={(e) => {
                if (onUpdate && childBlock.fieldName) {
                  onUpdate({
                    ...data,
                    [childBlock.fieldName]: e.target.value,
                  });
                }
              }}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            {childBlock.label && <Label>{childBlock.label}</Label>}
            {childBlock.description && (
              <p className="text-sm text-muted-foreground">
                {childBlock.description}
              </p>
            )}
            <Textarea
              placeholder={childBlock.placeholder}
              rows={3}
              onChange={(e) => {
                if (onUpdate && childBlock.fieldName) {
                  onUpdate({
                    ...data,
                    [childBlock.fieldName]: e.target.value,
                  });
                }
              }}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            {childBlock.label && <Label>{childBlock.label}</Label>}
            {childBlock.description && (
              <p className="text-sm text-muted-foreground">
                {childBlock.description}
              </p>
            )}
            <Select
              onValueChange={(value) => {
                if (onUpdate && childBlock.fieldName) {
                  onUpdate({
                    ...data,
                    [childBlock.fieldName]: value,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {childBlock.options?.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'html':
        return (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: childBlock.html || '' }}
          />
        );

      default:
        return (
          <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
            <p className="text-sm">
              Child block type "{childBlock.type}" will render here
            </p>
          </div>
        );
    }
  };

  return (
    <Card className={`w-full ${data.className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5 text-primary" />
            Conditional Content
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Condition Met
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Condition Display */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="text-sm font-medium">This content is shown when:</p>
              <div className="bg-muted rounded p-2">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {data.condition || 'No condition specified'}
                </pre>
              </div>
              {data.dependencies && data.dependencies.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">Depends on:</span>
                  {data.dependencies.map((dep: string) => (
                    <Badge key={dep} variant="outline" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Child Block Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Conditional Content:
            </span>
          </div>
          <div className="pl-6 border-l-2 border-primary/20">
            {renderChildBlock()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Preview component shown in the block library
const ConditionalBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-3">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <span className="font-medium">Conditional Block</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1">
            <Badge variant="outline" className="text-xs">
              if (condition)
            </Badge>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              show content
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Shows content conditionally
          </div>
        </div>
      </div>
    </div>
  );
};

const ConditionalBlockRenderer: React.FC<ConditionalBlockProps> = ({
  block,
  condition,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  theme,
  contextData,
  customComponents,
}) => {
  const { evaluateCondition } = useSurveyForm();

  // Evaluate the condition
  const conditionMet = evaluateCondition(condition, contextData);

  // If condition is not met, don't render anything
  if (!conditionMet) {
    return null;
  }

  // If condition is met, render the child block directly
  // Note: This is a simplified renderer. For full functionality,
  // the survey form should handle conditional rendering at a higher level
  return (
    <div className="conditional-block">
      {block.childBlock && (
        <ConditionalBlockItem
          data={block}
          onUpdate={(updatedData) => {
            if (onChange && block.fieldName) {
              onChange(updatedData[block.fieldName]);
            }
          }}
        />
      )}
    </div>
  );
};

/**
 * Chat renderer for ConditionalBlock - provides a streamlined chat experience
 * for conditionally displayed content based on child block type
 */
const ConditionalChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  const themeConfig = theme ?? themes.default;
  const childBlock = block.childBlock;

  // Initialize local state from value or default
  const [localValue, setLocalValue] = useState<any>(() => {
    if (value !== undefined) return value;
    if (childBlock?.defaultValue !== undefined) return childBlock.defaultValue;
    // Appropriate defaults based on type
    switch (childBlock?.type) {
      case 'checkbox':
        return [];
      case 'number':
        return '';
      default:
        return '';
    }
  });

  // Sync with external value changes
  useEffect(() => {
    if (value !== undefined) {
      setLocalValue(value);
    }
  }, [value]);

  // Handle value changes
  const handleChange = (newValue: any) => {
    if (disabled) return;
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Handle submit
  const handleSubmit = () => {
    // For HTML blocks, submit 'true' as acknowledgment since they don't collect user input
    // This prevents ChatLayout's empty value validation from rejecting the submission
    const submitValue = childBlock?.type === 'html' ? true : localValue;
    onSubmit(submitValue);
  };

  // Render child block based on type
  const renderChildBlock = () => {
    if (!childBlock) {
      return (
        <div
          className="p-4 border border-dashed rounded-xl text-center"
          style={{ color: themeConfig.colors.text, opacity: 0.5 }}
        >
          <p className="text-sm">No child block configured</p>
        </div>
      );
    }

    const options = childBlock.options || [];

    switch (childBlock.type) {
      case 'text':
      case 'number':
        return (
          <div className="space-y-2">
            {childBlock.description && (
              <p
                className={cn('text-sm', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            <Input
              type={childBlock.type}
              value={localValue || ''}
              placeholder={
                childBlock.placeholder ||
                `Enter ${childBlock.type === 'number' ? 'a number' : 'text'}...`
              }
              disabled={disabled}
              onChange={(e) =>
                handleChange(
                  childBlock.type === 'number'
                    ? e.target.value
                    : e.target.value,
                )
              }
              className={cn(
                error && 'border-destructive',
                themeConfig.field.input,
              )}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            {childBlock.description && (
              <p
                className={cn('text-sm', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            <Textarea
              value={localValue || ''}
              placeholder={childBlock.placeholder || 'Enter your response...'}
              disabled={disabled}
              onChange={(e) => handleChange(e.target.value)}
              className={cn(
                error && 'border-destructive',
                themeConfig.field.textarea,
              )}
              rows={4}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            {childBlock.description && (
              <p
                className={cn('text-sm', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            <Select
              value={localValue || ''}
              onValueChange={(val) => handleChange(val)}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  error && 'border-destructive',
                  themeConfig.field.select,
                )}
              >
                <SelectValue
                  placeholder={childBlock.placeholder || 'Select an option...'}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio':
        return (
          <div className="flex flex-col gap-2">
            {childBlock.description && (
              <p
                className={cn('text-sm mb-2', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            {options.map((option: string, index: number) => {
              const isSelected = localValue === option;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleChange(option)}
                  disabled={disabled}
                  className={cn(
                    'relative w-full flex justify-between gap-6 items-center transition-all border',
                    themeConfig.field.select,
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    borderColor: isSelected
                      ? themeConfig.colors.primary
                      : undefined,
                  }}
                >
                  <p
                    className={cn(
                      'text-left transition-colors mb-0',
                      themeConfig.field.label,
                    )}
                    style={{
                      color: isSelected
                        ? themeConfig.colors.primary
                        : themeConfig.colors.text,
                      marginBottom: 0,
                    }}
                  >
                    {option}
                  </p>
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
        );

      case 'checkbox':
        const selectedValues = Array.isArray(localValue) ? localValue : [];
        return (
          <div className="flex flex-col gap-2">
            {childBlock.description && (
              <p
                className={cn('text-sm mb-2', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            {options.map((option: string, index: number) => {
              const isSelected = selectedValues.includes(option);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter((v: string) => v !== option)
                      : [...selectedValues, option];
                    handleChange(newValues);
                  }}
                  disabled={disabled}
                  className={cn(
                    'relative w-full flex justify-between gap-6 items-center transition-all border',
                    themeConfig.field.select,
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    borderColor: isSelected
                      ? themeConfig.colors.primary
                      : undefined,
                  }}
                >
                  <p
                    className={cn(
                      'text-left transition-colors mb-0',
                      themeConfig.field.label,
                    )}
                    style={{
                      color: isSelected
                        ? themeConfig.colors.primary
                        : themeConfig.colors.text,
                      marginBottom: 0,
                    }}
                  >
                    {option}
                  </p>
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
        );

      case 'date':
        return (
          <div className="space-y-2">
            {childBlock.description && (
              <p
                className={cn('text-sm', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            <Input
              type="date"
              value={localValue || ''}
              disabled={disabled}
              onChange={(e) => handleChange(e.target.value)}
              className={cn(
                error && 'border-destructive',
                themeConfig.field.input,
              )}
            />
          </div>
        );

      case 'fileupload':
      case 'file': {
        const fileConfig = {
          maxFiles: parseInt(String(childBlock.maxFiles || '1'), 10),
          maxFileSize: parseFloat(String(childBlock.maxFileSize || '5')),
          acceptedFileTypes: (childBlock.acceptedFileTypes as string[]) || [],
          showPreview: childBlock.showPreview as boolean,
          helpText: childBlock.helpText as string,
        };

        // Convert localValue to File[] if needed
        const fileValue = Array.isArray(localValue)
          ? localValue
          : localValue
            ? [localValue]
            : [];

        return (
          <div className="space-y-2">
            {childBlock.description && (
              <p
                className={cn('text-sm', themeConfig.field.description)}
                style={{ color: themeConfig.colors.text, opacity: 0.7 }}
              >
                {childBlock.description}
              </p>
            )}
            <FileUploadInput
              value={fileValue}
              onChange={(files: File[]) => handleChange(files)}
              config={fileConfig}
              disabled={disabled}
              error={error}
              theme={theme}
              showSubmitButton={false}
            />
          </div>
        );
      }

      case 'html':
        return (
          <div
            className="prose prose-sm max-w-none p-4 rounded-xl"
            style={{ backgroundColor: themeConfig.colors.background }}
            dangerouslySetInnerHTML={{ __html: childBlock.html || '' }}
          />
        );

      default:
        return (
          <div
            className="p-4 border border-dashed rounded-xl text-center"
            style={{ color: themeConfig.colors.text, opacity: 0.5 }}
          >
            <p className="text-sm">
              Child block type "{childBlock.type}" is not supported in chat mode
            </p>
          </div>
        );
    }
  };

  // Determine if submit button should be enabled
  const hasValue = () => {
    if (!childBlock) return false;
    switch (childBlock.type) {
      case 'checkbox':
        return Array.isArray(localValue) && localValue.length > 0;
      case 'html':
        return true; // HTML blocks can always be submitted
      default:
        return (
          localValue !== undefined && localValue !== '' && localValue !== null
        );
    }
  };

  // Get button text based on child block type
  const getButtonText = () => {
    if (
      childBlock?.type === 'checkbox' &&
      Array.isArray(localValue) &&
      localValue.length > 0
    ) {
      return `Continue with ${localValue.length} selected`;
    }
    return 'Continue';
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Child block label */}
      {childBlock?.label && (
        <Label
          className={cn('text-base', themeConfig.field.label)}
          style={{ color: themeConfig.colors.text }}
        >
          {childBlock.label}
        </Label>
      )}

      {/* Child block content */}
      {renderChildBlock()}

      {/* Error message */}
      {error && (
        <p
          className={cn('text-sm', themeConfig.field.error)}
          style={{ color: themeConfig.colors.error }}
        >
          {error}
        </p>
      )}

      {/* Submit button */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !hasValue()}
        className={cn(
          'h-12 rounded-xl w-full mt-2 font-semibold',
          themeConfig.button.primary,
        )}
        style={{ backgroundColor: themeConfig.colors.primary }}
      >
        {getButtonText()}
      </Button>
    </div>
  );
};

// Export the block definition
export const ConditionalBlock: BlockDefinition = {
  type: 'conditional',
  name: 'Conditional Block',
  description: 'Display content only when specific conditions are met',
  icon: <GitBranch className="w-4 h-4" />,
  defaultData: {
    type: 'conditional',
    condition: `// Show when age is 18 or older
return age >= 18;`,
    dependencies: ['age'],
    childBlock: {
      type: 'text',
      label: 'Additional Information',
      fieldName: 'additionalInfo',
      placeholder: 'Enter additional information',
      description: "This field appears when you're 18 or older",
    },
    className: '',
  },
  renderItem: (props) => <ConditionalBlockItem {...props} />,
  renderFormFields: (props) => <ConditionalBlockForm {...props} />,
  renderPreview: () => <ConditionalBlockPreview />,
  renderBlock: (props) => (
    <ConditionalBlockRenderer
      {...props}
      condition={props.block.condition}
      contextData={props.block.contextData}
    />
  ),
  validate: (data) => {
    if (!data.condition) return 'Condition is required';
    if (!data.childBlock) return 'Child block configuration is required';
    if (!data.childBlock.type) return 'Child block type is required';
    if (!data.dependencies || data.dependencies.length === 0) {
      return 'At least one dependency field is required';
    }
    return null;
  },
  // Chat renderer for chat layout experience
  chatRenderer: (props) => <ConditionalChatRenderer {...props} />,
  // Input schema - describes expected input format based on child block type
  // Since the child block type is dynamic, we use a union type
  inputSchema: {
    oneOf: [
      { type: 'string' }, // For text, textarea, select, radio, date, number (as string), html
      { type: 'array', items: { type: 'string' } }, // For checkbox (multi-select)
      { type: 'object', properties: {} }, // For file upload
    ],
    discriminator: {
      propertyName: 'childBlock.type',
      mapping: {
        text: 0,
        textarea: 0,
        number: 0,
        select: 0,
        radio: 0,
        date: 0,
        html: 0,
        checkbox: 1,
        file: 2,
        fileupload: 2,
      },
    },
  },
  // Note: ConditionalBlock is a container block - its output schema depends on the child block
  // The actual output will match whatever the child block returns
};
