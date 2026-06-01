import React, { forwardRef } from "react";
import type { BlockDefinition, ContentBlockItemProps, BlockRendererProps } from "../types";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { LucideTextCursor } from "lucide-react";
import { cn } from "../lib/utils";
import { themes } from "../themes";
import { generateFieldName } from "./utils/GenFieldName";

// ============= BUILDER COMPONENTS =============

// Form component for editing the block configuration in builder
const TextInputBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const handleChange = (field: string, value: string) => {
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
          <Label className="text-sm" htmlFor="defaultValue">Default Value</Label>
          <Input
            id="defaultValue"
            value={data.defaultValue || ""}
            onChange={(e) => handleChange("defaultValue", e.target.value)}
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
    </div>
  );
};

// Component to render the block in the builder's survey view
const TextInputBlockItem: React.FC<ContentBlockItemProps> = ({
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

      <Input
        id={data.fieldName}
        name={data.fieldName}
        placeholder={data.placeholder}
        defaultValue={data.defaultValue}
      />
    </div>
  );
};

// Preview component shown in the block library
const TextInputBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1">
      <Input
        placeholder="Text input field"
        className="w-4/5 max-w-full"
        disabled
      />
    </div>
  );
};

// ============= RENDERER COMPONENT =============

// Main renderer component for end-user surveys
const TextInputRenderer = forwardRef<HTMLInputElement, BlockRendererProps>(
  ({ block, value, onChange, onBlur, error, disabled, theme }, ref) => {
    const themeConfig = theme ?? themes.default;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="survey-text-input space-y-2 w-full min-w-0">
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

        {/* Input field */}
        <Input
          id={block.fieldName}
          name={block.fieldName}
          type="text"
          value={value || ''}
          placeholder={block.placeholder}
          disabled={disabled}
          onChange={handleChange}
          onBlur={onBlur}
          ref={ref}
          className={cn(error && "border-destructive", themeConfig.field.input)}
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

TextInputRenderer.displayName = 'TextInputRenderer';

// ============= UNIFIED BLOCK DEFINITION =============

export const TextInputBlock: BlockDefinition = {
  type: "textfield",
  name: "Text Input",
  description: "Single line text field for short answers",
  icon: <LucideTextCursor className="w-4 h-4" />,
  defaultData: {
    type: "textfield",
    fieldName: "",
    label: "Text Input Question",
    placeholder: "Type your answer here",
    description: "",
    defaultValue: "",
  },
  generateDefaultData: () => ({
    type: "textfield",
    fieldName: generateFieldName("textInput"),
    label: "Text Input Question",
    placeholder: "Type your answer here",
    description: "",
    defaultValue: "",
  }),
  // Builder methods
  renderItem: (props) => <TextInputBlockItem {...props} />,
  renderFormFields: (props) => <TextInputBlockForm {...props} />,
  renderPreview: () => <TextInputBlockPreview />,
  // Renderer method - NEW
  renderBlock: (props) => <TextInputRenderer {...props} />,
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
  // Output schema - this block returns a simple string value
  outputSchema: {
    type: 'string'
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};