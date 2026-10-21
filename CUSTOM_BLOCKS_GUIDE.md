# Custom Blocks Guide

This guide explains how to create custom blocks for the unified survey form package.

## Overview

With the unified block system, you can create custom blocks that work seamlessly in both the builder and renderer. Each block definition includes all necessary components and methods.

## Creating a Custom Block

### 1. Basic Structure

```typescript
import React from "react";
import type { BlockDefinition, ContentBlockItemProps, BlockRendererProps } from "survey-form-package/src";

const MyCustomBlock: BlockDefinition = {
  type: "my-custom-type",
  name: "My Custom Block",
  description: "Description of what this block does",
  icon: <MyIcon className="w-4 h-4" />,
  defaultData: {
    type: "my-custom-type",
    fieldName: "",
    label: "My Custom Question",
    // ... other default properties
  },
  
  // BUILDER METHODS
  renderItem: (props: ContentBlockItemProps) => {
    // How the block appears in the builder's survey preview
    return <div>Builder Preview</div>;
  },
  
  renderFormFields: (props: ContentBlockItemProps) => {
    // Configuration form in the builder
    return <div>Configuration Form</div>;
  },
  
  renderPreview: () => {
    // Preview in the block library
    return <div>Library Preview</div>;
  },
  
  // RENDERER METHOD
  renderBlock: (props: BlockRendererProps) => {
    // How the block renders in the actual survey
    return <div>Survey Renderer</div>;
  },
  
  // VALIDATION METHODS
  validate: (data) => {
    // Validate block configuration
    if (!data.fieldName) return "Field name is required";
    return null;
  },
  
  validateValue: (value, data) => {
    // Validate user input
    if (data.required && !value) return "This field is required";
    return null;
  },
};
```

### 2. Complete Example: Credit Card Block

```typescript
import React, { useEffect } from "react";
import { CreditCard } from "lucide-react";
import { 
  BlockDefinition, 
  ContentBlockItemProps, 
  BlockRendererProps, 
  registerBlock 
} from "survey-form-package/src";

const CreditCardBlock: BlockDefinition = {
  type: 'credit-card',
  name: 'Credit Card Input',
  description: 'Collect credit card information',
  icon: <CreditCard className="w-4 h-4" />,
  
  defaultData: {
    type: 'credit-card',
    fieldName: 'cardNumber',
    label: 'Card Number',
    placeholder: 'XXXX XXXX XXXX XXXX',
    required: false,
  },
  
  // Builder: How block appears in survey preview
  renderItem: ({ data }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{data.label}</label>
      <input
        type="text"
        name={data.fieldName}
        placeholder={data.placeholder}
        className="w-full p-2 border rounded-md"
        disabled
      />
    </div>
  ),
  
  // Builder: Configuration form
  renderFormFields: ({ data, onUpdate }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Label</label>
        <input
          type="text"
          value={data.label || ''}
          onChange={(e) => onUpdate?.({ ...data, label: e.target.value })}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Field Name</label>
        <input
          type="text"
          value={data.fieldName || ''}
          onChange={(e) => onUpdate?.({ ...data, fieldName: e.target.value })}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Placeholder</label>
        <input
          type="text"
          value={data.placeholder || ''}
          onChange={(e) => onUpdate?.({ ...data, placeholder: e.target.value })}
          className="w-full p-2 border rounded-md"
        />
      </div>
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.required || false}
            onChange={(e) => onUpdate?.({ ...data, required: e.target.checked })}
            className="mr-2"
          />
          Required
        </label>
      </div>
    </div>
  ),
  
  // Builder: Library preview
  renderPreview: () => (
    <div className="p-2 flex items-center justify-center">
      <input
        type="text"
        placeholder="XXXX XXXX XXXX XXXX"
        className="w-4/5 p-1 border rounded"
        disabled
      />
    </div>
  ),
  
  // Renderer: Actual survey form
  renderBlock: ({ block, value, onChange, error, disabled }) => (
    <div className="space-y-2">
      {block.label && (
        <label className="block text-sm font-medium text-gray-900">
          {block.label}
          {block.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          // Format card number with spaces
          const formatted = e.target.value
            .replace(/\s/g, '')
            .replace(/(\d{4})/g, '$1 ')
            .trim()
            .substr(0, 19);
          onChange?.(formatted);
        }}
        placeholder={block.placeholder}
        disabled={disabled}
        className={`w-full p-3 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : ''}`}
        maxLength={19}
      />
      
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
    </div>
  ),
  
  // Validation
  validate: (data) => {
    if (!data.fieldName) return "Field name is required";
    if (!data.label) return "Label is required";
    return null;
  },
  
  validateValue: (value, data) => {
    if (data.required && !value) return "Card number is required";
    
    if (value) {
      const cleaned = value.replace(/\s/g, '');
      if (cleaned.length < 13 || cleaned.length > 19) {
        return "Please enter a valid card number";
      }
      if (!/^\d+$/.test(cleaned)) {
        return "Card number can only contain digits";
      }
    }
    
    return null;
  },
};

// Usage in your application
export default function MyApp() {
  useEffect(() => {
    // Register the custom block
    registerBlock(CreditCardBlock);
  }, []);

  return (
    <SurveyBuilder
      blockDefinitions={[...StandardBlocks, CreditCardBlock]}
      // ... other props
    />
  );
}
```

## Registration Methods

### Method 1: Global Registration (Recommended)

Register blocks globally so they work in both builder and renderer:

```typescript
import { registerBlock, unregisterBlock } from "survey-form-package/src";

// Register when your app starts
useEffect(() => {
  registerBlock(MyCustomBlock);
  
  // Optional: cleanup on unmount
  return () => unregisterBlock('my-custom-type');
}, []);
```

### Method 2: Direct Block Registry

Import and modify the block registry directly:

```typescript
import { blockRegistry } from "survey-form-package/src";

// Add your block directly
blockRegistry['my-custom-type'] = MyCustomBlock;
```

## Overriding a System Block

A registered block can stand in for a built-in one. Map the built-in type to your block's type with `blockOverrides`, and pass the same mapping to `SurveyForm` and `SurveyBuilder`:

```tsx
import { SurveyForm, registerBlock } from "survey-form-package/src";
import type { BlockOverrides } from "survey-form-package/src";

registerBlock(MyYesNoBlock); // type: "myYesNo"

const blockOverrides: BlockOverrides = { yesNoAnswer: "myYesNo" };

<SurveyForm survey={surveyData} blockOverrides={blockOverrides} />
```

What your block needs to know:

- It receives blocks whose `type` is the built-in type (`yesNoAnswer`), and the builder saves new blocks with that type, so forms stay valid without the mapping.
- It should save the same answer shape as the block it replaces, because rules and computed fields read that answer.
- If it isn't registered, has no `renderBlock`, or throws while rendering, the built-in block is shown instead, with its own validation. After a throw, every block of that type uses the built-in block until the page reloads or your block is registered again. The library logs one console message per mapping; React also reports the error it caught.
- Have `renderBlock` return a component rather than call hooks itself, so the block can be swapped while a form is open.
- Chat and voice layouts show display-only blocks as chat text, whatever the mapping.

## Block Definition Properties

### Required Properties

- **`type`**: Unique identifier for the block
- **`name`**: Display name in the builder
- **`description`**: Brief description of the block's purpose
- **`defaultData`**: Default configuration when block is created

### Builder Methods

- **`renderItem`**: How the block appears in the builder's survey preview
- **`renderFormFields`**: Configuration form for editing block properties
- **`renderPreview`**: Small preview shown in the block library
- **`generateDefaultData`**: Function to generate default data (optional)

### Renderer Methods

- **`renderBlock`**: How the block renders in the actual survey (REQUIRED for rendering)

### Validation Methods

- **`validate`**: Validates block configuration in the builder
- **`validateValue`**: Validates user input in the survey

### Optional Properties

- **`icon`**: React component/element for the block icon
- **`category`**: Grouping category in the block library

## BlockRendererProps Interface

The `renderBlock` method receives these props:

```typescript
interface BlockRendererProps {
  block: BlockData;           // Block configuration
  value?: any;               // Current input value
  onChange?: (value: any) => void;  // Value change handler
  onBlur?: () => void;       // Blur event handler
  error?: string;            // Validation error message
  fieldErrors?: Record<string, string>; // Errors of mapped output keys, by output key
  disabled?: boolean;        // Whether the field is disabled
  theme?: ThemeDefinition;   // Current theme
  isVisible?: boolean;       // Visibility state
  customValidation?: (value: any) => string | null;
}
```

## ContentBlockItemProps Interface

Builder methods receive these props:

```typescript
interface ContentBlockItemProps {
  data: BlockData;           // Block configuration data
  onUpdate?: (data: BlockData) => void;  // Update handler
  onRemove?: () => void;     // Remove handler
}
```

## Best Practices

### 1. Consistent Naming
- Use kebab-case for block types: `credit-card`, `phone-number`
- Use PascalCase for block names: `CreditCardBlock`

### 2. Proper Validation
- Always validate required configuration in `validate()`
- Implement meaningful user input validation in `validateValue()`

### 3. Accessibility
- Include proper ARIA attributes
- Use semantic HTML elements
- Support keyboard navigation

### 4. Error Handling
- Display error messages clearly
- Handle edge cases gracefully
- Provide helpful validation messages

### 5. Styling
- Use consistent CSS classes
- Support theme system
- Handle disabled and error states

### 6. Performance
- Avoid expensive operations in render methods
- Use React.memo() for complex components
- Minimize re-renders

## Advanced Features

### Custom Data Types

```typescript
interface CustomBlockData extends BlockData {
  customProperty: string;
  options: Array<{ label: string; value: string }>;
  validationRules: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}
```

### Conditional Rendering

```typescript
renderBlock: ({ block, value, onChange }) => {
  const showAdvanced = value?.length > 10;
  
  return (
    <div>
      <input onChange={onChange} />
      {showAdvanced && <div>Advanced options...</div>}
    </div>
  );
}
```

### Multiple Field Blocks

```typescript
renderBlock: ({ block, value, onChange }) => {
  const handleFieldChange = (field: string, fieldValue: any) => {
    onChange?.({
      ...value,
      [field]: fieldValue
    });
  };
  
  return (
    <div>
      <input 
        value={value?.firstName || ''} 
        onChange={(e) => handleFieldChange('firstName', e.target.value)}
      />
      <input 
        value={value?.lastName || ''} 
        onChange={(e) => handleFieldChange('lastName', e.target.value)}
      />
    </div>
  );
}
```

### Saving Output Keys Under Their Own Field Names

A block whose answer is an object can save each key under its own field name, so navigation
rules, validation rules and the flow builder use that key like any other field. The block's
own answer stays under its `fieldName` as before.

1. Declare the keys in the block's `outputSchema` (an object type). A key's `description` is
   the default question it answers, and its `options` fill rule value pickers.
2. In the builder, the block's settings show **Output Field Names**: one row per key, with a
   field name and a question. A key with no field name stays inside the block's answer only.
   The builder warns when a name is already used elsewhere in the form. The block needs its own
   field name: without one its answer isn't saved, so neither are its keys.
3. The settings are saved on the block as `outputFields`:

```json
{
  "type": "symptomCheck",
  "fieldName": "symptoms",
  "outputFields": {
    "frequency": { "fieldName": "symptomFrequency", "question": "How often do you have symptoms?" },
    "severity": { "fieldName": "symptomSeverity" }
  }
}
```

When the block calls `onChange`, the form saves `symptoms` and every mapped key in one update,
before validation and navigation run, auto-continue included. A validation rule whose field is a
mapped key reports under that key, and the block receives those errors in `fieldErrors`, keyed by
output key, next to its own `error`:

```typescript
renderBlock: ({ value, onChange, error, fieldErrors }) => (
  <div>
    <select value={value?.frequency ?? ''} onChange={(e) => onChange?.({ ...value, frequency: e.target.value })}>
      ...
    </select>
    {fieldErrors?.frequency && <p role="alert">{fieldErrors.frequency}</p>}
    {error && <p role="alert">{error}</p>}
  </div>
)
```

The helpers behind this are exported for hosts: `getBlockFieldNames(block)` lists every field a
block saves, `findBlockForField(blocks, name)` finds the block and output key for a name, and
`getFieldQuestion(block, name, definition)` gives the question a field answers. Saved or prefilled
answers (`defaultValues`, `initialValues`) fill in their mapped keys when the form loads. The page-by-page
and stepper layouts pass `fieldErrors`; the chat and voice layouts don't yet.

## Troubleshooting

### Block Not Rendering in Survey

1. Ensure the block is registered: `registerBlock(YourBlock)`
2. Check that `renderBlock` method is implemented
3. Verify the block type matches exactly

### Builder Preview Not Working

1. Check that `renderItem` method is implemented
2. Ensure the block is in the `blockDefinitions` prop
3. Verify no JavaScript errors in console

### Configuration Form Issues

1. Implement `renderFormFields` method
2. Check that `onUpdate` is called correctly
3. Ensure data structure matches `defaultData`

## Migration from Legacy Blocks

If you have existing separate builder/renderer components:

1. Create a new unified block file
2. Copy builder components to builder methods
3. Copy renderer component to `renderBlock` method
4. Register the block globally
5. Test both builder and renderer functionality