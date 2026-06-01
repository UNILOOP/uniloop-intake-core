import React, { forwardRef } from "react";
import type { BlockDefinition, ContentBlockItemProps, BlockRendererProps } from "../types";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { LucideTextCursor } from "lucide-react";
import { cn } from "../lib/utils";
import { themes } from "../themes";
import { generateFieldName } from "./utils/GenFieldName";

// ============= BUILDER COMPONENTS =============

const TextareaBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const handleChange = (field: string, value: string | number) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="label">Label</Label>
          <Input
            id="label"
            value={data.label || ""}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Your question here?"
          />
          <p className="text-xs text-muted-foreground">
            Question or prompt shown to the respondent
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="placeholder">Placeholder</Label>
          <Input
            id="placeholder"
            value={data.placeholder || ""}
            onChange={(e) => handleChange("placeholder", e.target.value)}
            placeholder="Type your answer here..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm" htmlFor="rows">Number of Rows</Label>
          <Input
            id="rows"
            type="number"
            min="2"
            max="20"
            value={data.rows || 4}
            onChange={(e) => handleChange("rows", parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">Description/Help Text</Label>
        <Input
          id="description"
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Additional information about this question"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="defaultValue">Default Value</Label>
        <Textarea
          id="defaultValue"
          value={data.defaultValue || ""}
          onChange={(e) => handleChange("defaultValue", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
};

const TextareaBlockItem: React.FC<ContentBlockItemProps> = ({
  data,
}) => {
  return (
    <div className="space-y-2">
      {data.label && (
        <Label className="text-sm" htmlFor={data.fieldName}>{data.label}</Label>
      )}

      {data.description && (
        <p className="text-sm text-muted-foreground">{data.description}</p>
      )}

      <Textarea
        id={data.fieldName}
        name={data.fieldName}
        placeholder={data.placeholder}
        defaultValue={data.defaultValue}
        rows={data.rows || 4}
      />
    </div>
  );
};

const TextareaBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <Textarea
        placeholder="Multi-line text area"
        className="w-4/5 max-w-full"
        rows={3}
        disabled
      />
    </div>
  );
};

// ============= RENDERER COMPONENT =============

const TextareaRenderer = forwardRef<HTMLTextAreaElement, BlockRendererProps>(
  ({ block, value, onChange, onBlur, error, disabled, theme }, ref) => {
    const themeConfig = theme ?? themes.default;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="survey-textarea space-y-2 w-full min-w-0">
        {/* Label */}
        {block.label && (
          <Label
            htmlFor={block.fieldName}
            className={cn("text-base", themeConfig.field.label)}
          >
            {block.label}
          </Label>
        )}

        {/* Description */}
        {block.description && (
          <div className={cn("text-sm text-muted-foreground", themeConfig.field.description)}>
            {block.description}
          </div>
        )}

        {/* Textarea field */}
        <Textarea
          id={block.fieldName}
          name={block.fieldName}
          value={value || ''}
          placeholder={block.placeholder}
          disabled={disabled}
          onChange={handleChange}
          onBlur={onBlur}
          ref={ref}
          rows={block.rows || 4}
          className={cn(
            error && "border-destructive",
            themeConfig.field.textarea
          )}
          aria-invalid={!!error}
        />

        {/* Error message */}
        {error && (
          <div className={cn("text-sm font-medium text-destructive", themeConfig.field.error)}>
            {error}
          </div>
        )}
      </div>
    );
  }
);

TextareaRenderer.displayName = 'TextareaRenderer';

// ============= UNIFIED BLOCK DEFINITION =============

export const TextareaBlock: BlockDefinition = {
  type: "textarea",
  name: "Text Area",
  description: "Multi-line text field for longer answers",
  icon: <LucideTextCursor className="w-4 h-4" />,
  defaultData: {
    type: "textarea",
    fieldName: "",
    label: "Text Area Question",
    placeholder: "Type your detailed answer here",
    description: "",
    defaultValue: "",
    rows: 4,
  },
  generateDefaultData: () => ({
    type: "textarea",
    fieldName: generateFieldName("textarea"),
    label: "Text Area Question",
    placeholder: "Type your detailed answer here",
    description: "",
    defaultValue: "",
    rows: 4,
  }),
  // Builder methods
  renderItem: (props) => <TextareaBlockItem {...props} />,
  renderFormFields: (props) => <TextareaBlockForm {...props} />,
  renderPreview: () => <TextareaBlockPreview />,
  // Renderer method - NEW
  renderBlock: (props) => <TextareaRenderer {...props} />,
  // Validation methods
  validate: (data) => {
    if (!data.fieldName) return "Field name is required";
    if (!data.label) return "Label is required";
    return null;
  },
  validateValue: (value, data) => {
    if (data.required && !value) return "This field is required";
    if (data.minLength && value?.length < data.minLength)
      return `Minimum ${data.minLength} characters required`;
    if (data.maxLength && value?.length > data.maxLength)
      return `Maximum ${data.maxLength} characters allowed`;
    return null;
  },
  // Output schema - this block returns multi-line text as a string
  outputSchema: {
    type: 'string'
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};