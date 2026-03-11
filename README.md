# Survey Form Package

A powerful, customizable React survey renderer and builder library with TypeScript support, featuring advanced conditional logic, multiple layout options, and comprehensive theming capabilities.

## 🚀 Features

### **Core Survey Rendering**
- **Multiple Layouts**: Page-by-page, continuous, accordion, tabs, stepper, and fullpage layouts
- **18+ Block Types**: Complete set of form input types and advanced interactive blocks
- **Conditional Logic**: Show/hide blocks based on user responses with complex condition evaluation
- **Navigation Rules**: Custom routing between survey sections based on user input
- **Real-time Validation**: Field-level validation with custom error messages
- **Progress Tracking**: Multiple progress indicator styles with animations

### **Visual Flow Builder**
- **Node-based Interface**: Visual drag-and-drop survey flow creation
- **Real-time Connections**: Draw connections between nodes to create navigation rules
- **Multiple Node Types**: Pages, blocks, start/submit nodes with automatic layout
- **Flow Modes**: Select, connect, and pan modes for different editing operations
- **Interactive Canvas**: Zoom, pan, and navigate through complex survey flows
- **Visual Configuration**: Configure blocks and pages directly in the flow interface

### **Advanced Features**
- **Calculated Fields**: Dynamic computations based on other form values
- **BMI Calculator**: Built-in health assessment tools
- **Checkout Integration**: Contact information and payment collection
- **Mobile Navigation**: Touch gestures and swipe support
- **Localization**: Multi-language support with complete translation system
- **Theme System**: 7 built-in themes plus custom theme support

### **Developer Experience**
- **TypeScript First**: Full type safety with comprehensive interfaces
- **React 19 Compatible**: Built for modern React with hooks and context
- **Tree Shakeable**: Modular exports for optimal bundle sizes
- **Extensible**: Easy to add custom blocks and renderers
- **Well Documented**: Comprehensive API documentation and examples

## 📦 Installation

```bash
bun add survey-form-package
```

### Peer Dependencies
```bash
bun add react@^19.1.0 react-dom@^19.1.0
```

## 🎯 Quick Start

### Basic Survey Renderer

```tsx
import React from 'react';
import { SurveyForm } from 'survey-form-package';

const surveyData = {
  rootNode: {
    type: "section",
    name: "Customer Feedback Survey",
    uuid: "survey-root",
    items: [
      {
        type: "set",
        name: "Contact Information",
        uuid: "contact-page",
        items: [
          {
            type: "textfield",
            fieldName: "name",
            label: "Full Name",
            placeholder: "Enter your full name",
            uuid: "name-field"
          },
          {
            type: "selectablebox",
            fieldName: "satisfaction",
            label: "How satisfied are you with our service?",
            options: [
              { id: "very-satisfied", label: "Very Satisfied", value: "5" },
              { id: "satisfied", label: "Satisfied", value: "4" },
              { id: "neutral", label: "Neutral", value: "3" },
              { id: "dissatisfied", label: "Dissatisfied", value: "2" },
              { id: "very-dissatisfied", label: "Very Dissatisfied", value: "1" }
            ],
            uuid: "satisfaction-field"
          }
        ]
      }
    ]
  },
  localizations: {
    en: {}
  }
};

function App() {
  const handleSubmit = (data: Record<string, any>) => {
    console.log('Survey submitted:', data);
  };

  const handleChange = (data: Record<string, any>) => {
    console.log('Form data changed:', data);
  };

  return (
    <SurveyForm
      survey={surveyData}
      theme="modern"
      layout="page-by-page"
      progressBar={{
        type: 'percentage',
        showPercentage: true,
        position: 'top'
      }}
      onSubmit={handleSubmit}
      onChange={handleChange}
    />
  );
}

export default App;
```

### Survey Builder Integration

#### Traditional Builder (List-based)
```tsx
import React, { useState } from 'react';
import { SurveyBuilder, StandardBlocks, StandardNodes } from 'survey-form-package';

function BuilderApp() {
  const [surveyData, setSurveyData] = useState(null);

  return (
    <div style={{ height: '800px' }}>
      <SurveyBuilder
        blockDefinitions={StandardBlocks}
        nodeDefinitions={StandardNodes}
        onDataChange={setSurveyData}
        initialData={existingSurvey}
      />
    </div>
  );
}
```

#### Flow Builder (Visual Node-based)
```tsx
import React, { useState } from 'react';
import { FlowBuilder, StandardBlocks, StandardNodes } from 'survey-form-package';

function FlowBuilderApp() {
  const [surveyData, setSurveyData] = useState(null);

  return (
    <div style={{ height: '800px', width: '100%' }}>
      <FlowBuilder
        blockDefinitions={StandardBlocks}
        nodeDefinitions={StandardNodes}
        onDataChange={setSurveyData}
        initialData={existingSurvey}
        enableDebug={true}
      />
    </div>
  );
}
```

## 🎨 Themes

The package includes 7 built-in themes:

```tsx
import { SurveyForm } from 'survey-form-package';

// Available themes
type SurveyTheme = 
  | "default"     // Clean, professional gray theme
  | "minimal"     // Simplified, typography-focused
  | "colorful"    // Vibrant, engaging colors
  | "modern"      // Contemporary design with gradients
  | "corporate"   // Professional business theme
  | "dark"        // Dark mode optimized
  | "custom";     // Fully customizable

<SurveyForm survey={data} theme="modern" />
```

### Custom Theme

```tsx
const customTheme = {
  name: "custom",
  colors: {
    primary: "#3b82f6",
    secondary: "#64748b",
    background: "#ffffff",
    text: "#1f2937"
  },
  button: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
  },
  field: {
    input: "border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500",
    label: "text-gray-700 font-medium mb-2 block"
  }
};

<SurveyForm 
  survey={data} 
  theme="custom"
  customTheme={customTheme}
/>
```

## 📱 Layouts

Choose from 6 different layout options:

```tsx
// Page-by-page navigation (default)
<SurveyForm survey={data} layout="page-by-page" />

// Continuous scrolling
<SurveyForm survey={data} layout="continuous" />

// Accordion-style collapsible sections
<SurveyForm survey={data} layout="accordion" />

// Tab-based navigation
<SurveyForm survey={data} layout="tabs" />

// Step-by-step with progress indicators
<SurveyForm survey={data} layout="stepper" />

// Full-screen immersive experience
<SurveyForm survey={data} layout="fullpage" />
```

## 🧩 Block Types

### Input Blocks

#### Text Input
```tsx
{
  type: "textfield",
  fieldName: "email",
  label: "Email Address",
  placeholder: "Enter your email",
  validation: "email",
  required: true
}
```

#### Textarea
```tsx
{
  type: "textarea",
  fieldName: "comments",
  label: "Additional Comments",
  placeholder: "Share your thoughts...",
  rows: 4
}
```

#### Radio Buttons
```tsx
{
  type: "radio",
  fieldName: "gender",
  label: "Gender",
  options: [
    { id: "male", label: "Male", value: "male" },
    { id: "female", label: "Female", value: "female" },
    { id: "other", label: "Other", value: "other" }
  ]
}
```

#### Checkboxes
```tsx
{
  type: "checkbox",
  fieldName: "interests",
  label: "Select your interests",
  options: [
    { id: "tech", label: "Technology", value: "technology" },
    { id: "sports", label: "Sports", value: "sports" },
    { id: "music", label: "Music", value: "music" }
  ]
}
```

#### Selectable Boxes
```tsx
{
  type: "selectablebox",
  fieldName: "preference",
  label: "Choose your preference",
  autoContinueOnSelect: true,
  showContinueButton: false,
  options: [
    { id: "option1", label: "Option 1", value: "1" },
    { id: "option2", label: "Option 2", value: "2" }
  ]
}
```

#### Select Dropdown
```tsx
{
  type: "select",
  fieldName: "country",
  label: "Country",
  placeholder: "Select your country",
  options: [
    { id: "us", label: "United States", value: "US" },
    { id: "ca", label: "Canada", value: "CA" },
    { id: "uk", label: "United Kingdom", value: "UK" }
  ]
}
```

#### Range Slider
```tsx
{
  type: "range",
  fieldName: "satisfaction",
  label: "Rate your satisfaction (1-10)",
  min: 1,
  max: 10,
  step: 1,
  defaultValue: 5
}
```

#### Date Picker
```tsx
{
  type: "datepicker",
  fieldName: "birthdate",
  label: "Date of Birth",
  format: "MM/dd/yyyy",
  placeholder: "Select date"
}
```

#### File Upload
```tsx
{
  type: "fileupload",
  fieldName: "resume",
  label: "Upload Resume",
  accept: ".pdf,.doc,.docx",
  maxSize: "5MB",
  multiple: false
}
```

### Advanced Blocks

#### Matrix Questions
```tsx
{
  type: "matrix",
  fieldName: "evaluation",
  label: "Rate the following aspects",
  rows: [
    { id: "quality", label: "Quality" },
    { id: "service", label: "Service" },
    { id: "value", label: "Value" }
  ],
  columns: [
    { id: "poor", label: "Poor", value: "1" },
    { id: "good", label: "Good", value: "2" },
    { id: "excellent", label: "Excellent", value: "3" }
  ]
}
```

#### Conditional Block
```tsx
{
  type: "conditional",
  fieldName: "conditional_question",
  label: "Additional Information",
  visibleIf: "age >= 18",
  blocks: [
    {
      type: "textfield",
      fieldName: "adult_info",
      label: "Adult-specific question"
    }
  ]
}
```

#### Calculated Field
```tsx
{
  type: "calculated",
  fieldName: "total",
  label: "Total Amount",
  formula: "item1 + item2 + (item3 * 0.1)",
  dependencies: ["item1", "item2", "item3"],
  format: "currency"
}
```

#### BMI Calculator
```tsx
{
  type: "bmi",
  fieldName: "bmi_result",
  label: "BMI Assessment",
  heightField: "height",
  weightField: "weight",
  showCategory: true,
  showRecommendations: true
}
```

#### Checkout Block
```tsx
{
  type: "checkout",
  fieldName: "contact_info",
  label: "Contact Information",
  showContactInfo: true,
  showShippingAddress: false,
  requireEmail: true,
  requirePhone: true,
  collectFullName: true
}
```

### Content Blocks

#### HTML Block
```tsx
{
  type: "html",
  html: `
    <div class="alert alert-info">
      <h3>Important Information</h3>
      <p>Please read this carefully before proceeding.</p>
    </div>
  `,
  className: "my-4"
}
```

#### Markdown Block
```tsx
{
  type: "markdown",
  content: `
    # Survey Instructions
    
    Please answer all questions **honestly** and *completely*.
    
    - Take your time
    - Read each question carefully
    - Contact support if you need help
  `
}
```

## 🔀 Conditional Logic

### Navigation Rules

```tsx
{
  type: "selectablebox",
  fieldName: "user_type",
  label: "What type of user are you?",
  options: [
    { id: "new", label: "New User", value: "new" },
    { id: "existing", label: "Existing User", value: "existing" }
  ],
  navigationRules: [
    {
      condition: "user_type == 'new'",
      target: "new-user-page-uuid",
      isPage: true
    },
    {
      condition: "user_type == 'existing'",
      target: "existing-user-page-uuid",
      isPage: true
    }
  ]
}
```

## 📊 Progress Bars

Configure progress indicators:

```tsx
<SurveyForm
  survey={data}
  progressBar={{
    type: 'percentage',        // 'bar' | 'dots' | 'numbers' | 'percentage'
    showPercentage: true,      // Show percentage text
    showStepInfo: true,        // Show "Step 2 of 5"
    showStepTitles: false,     // Show page titles
    position: 'top',           // 'top' | 'bottom'
    animation: true            // Smooth animations
  }}
/>
```

## 🎮 Navigation Controls

Customize navigation buttons:

```tsx
<SurveyForm
  survey={data}
  navigationButtons={{
    showPrevious: true,
    showNext: true,
    showSubmit: true,
    previousText: "Back",
    nextText: "Continue",
    submitText: "Submit Survey",
    position: "bottom",        // 'bottom' | 'split'
    align: "right",           // 'left' | 'center' | 'right'
    style: "default"          // 'default' | 'outlined' | 'text'
  }}
/>
```

## 🌊 Flow Builder

The Flow Builder provides a visual, node-based interface for creating survey flows with drag-and-drop functionality.

### Flow Builder Interface

```tsx
import { FlowBuilder } from 'survey-form-package/builder';

<FlowBuilder
  blockDefinitions={StandardBlocks}
  nodeDefinitions={StandardNodes}
  onDataChange={handleSurveyChange}
  initialData={surveyData}
  enableDebug={false}
/>
```

### Flow Modes

The Flow Builder supports three different interaction modes:

```tsx
// Select mode (default) - select and configure nodes
mode="select"

// Connect mode - create connections between nodes
mode="connect" 

// Pan mode - navigate around the canvas
mode="pan"
```

### Node Types

#### Page Nodes (Set)
Represent survey pages containing multiple form blocks:
```tsx
{
  type: "set",
  name: "Contact Information", 
  uuid: "contact-page",
  items: [/* blocks */]
}
```

#### Block Nodes
Individual form elements like text inputs, radio buttons, etc.:
```tsx
{
  type: "textfield",
  fieldName: "email",
  label: "Email Address",
  uuid: "email-field"
}
```

#### Special Nodes
- **Start Node**: Entry point for the survey flow
- **Submit Node**: Survey completion endpoint

### Visual Navigation Rules

Create navigation rules by connecting nodes in the flow:

1. **Switch to Connect Mode**: Click the connect tool in the toolbar
2. **Draw Connections**: Click and drag from one node to another
3. **Configure Rules**: The navigation rule editor opens automatically
4. **Set Conditions**: Define when to follow this connection

```tsx
// Automatically generated navigation rule
{
  condition: "user_type == 'premium'",
  target: "premium-features-page",
  isPage: true,
  isDefault: false
}
```

### Flow Canvas Features

#### Interactive Canvas
- **Zoom**: Mouse wheel or zoom controls
- **Pan**: Middle mouse button or pan mode
- **Fit View**: Auto-fit all nodes in viewport
- **Node Selection**: Click to select, multi-select with Ctrl/Cmd

#### Automatic Layout
- **Hierarchical Layout**: Nodes automatically arranged by flow structure
- **Smart Positioning**: New nodes placed intelligently
- **Relative Movement**: Moving pages moves their child blocks

#### Real-time Updates
- **Live Sync**: Changes immediately reflected in survey data
- **Visual Feedback**: Active pages and selected nodes highlighted
- **Connection Updates**: Drag connection endpoints to change targets

### Flow Builder Props

```tsx
interface FlowBuilderProps {
  blockDefinitions: BlockDefinition[];
  nodeDefinitions?: NodeDefinition[];
  onDataChange?: (data: SurveyData) => void;
  initialData?: SurveyData;
  enableDebug?: boolean;
  className?: string;
}
```

### Flow Node Configuration

Configure nodes through the configuration panel:

```tsx
// Open configuration panel programmatically
const handleNodeConfigure = (nodeId: string) => {
  // Panel opens with node-specific configuration options
};
```

#### Configuration Modes
- **Full Mode**: Complete node configuration with all options
- **Navigation-Only Mode**: Focus on navigation rules and connections

### Flow Transformation

The Flow Builder automatically transforms between hierarchical survey data and visual flow representation:

```tsx
// Survey data → Flow representation
const flowData = surveyToFlow(surveyData.rootNode);

// Flow changes → Survey data updates
// Happens automatically through the Flow Builder
```

## 📱 Mobile Features

### Swipe Navigation

```tsx
<SurveyForm
  survey={data}
  mobileNavigation={{
    enableSwipeNavigation: true,
    enableDoubleTapToGoBack: true,
    showMobileBackButton: true,
    swipeThreshold: 50
  }}
/>
```

### Mobile-Optimized Layouts

All layouts are mobile-responsive with touch-friendly controls:

- Touch-optimized button sizes
- Swipe gestures for navigation
- Responsive breakpoints
- Mobile-specific UI patterns

## 🔧 Custom Blocks

Create your own block types:

### 1. Complete Example: Credit Card Block

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

## 🌐 Localization

Support multiple languages:

```tsx
const surveyWithLocalizations = {
  rootNode: {
    // ... survey structure
  },
  localizations: {
    en: {
      "welcome_title": "Welcome to our survey",
      "name_label": "Full Name",
      "submit_button": "Submit"
    },
    es: {
      "welcome_title": "Bienvenido a nuestra encuesta",
      "name_label": "Nombre Completo", 
      "submit_button": "Enviar"
    },
    fr: {
      "welcome_title": "Bienvenue à notre enquête",
      "name_label": "Nom Complet",
      "submit_button": "Soumettre"
    }
  }
};

<SurveyForm 
  survey={surveyWithLocalizations}
  language="es"  // Set active language
/>
```

Use localized strings in blocks:

```tsx
{
  type: "textfield",
  fieldName: "name",
  label: "{{name_label}}",  // References localization key
  placeholder: "{{name_placeholder}}"
}
```

## 🎛️ Advanced Configuration

### Form Validation

```tsx
<SurveyForm
  survey={data}
  customValidators={{
    email: {
      validate: (value) => {
        if (!value.includes('@')) return 'Invalid email format';
        return null;
      }
    },
    phone: {
      validate: (value) => {
        if (!/^\d{10}$/.test(value)) return 'Phone must be 10 digits';
        return null;
      }
    }
  }}
/>
```

### Computed Fields

```tsx
<SurveyForm
  survey={data}
  computedFields={{
    total: {
      formula: 'price * quantity',
      dependencies: ['price', 'quantity'],
      format: (value) => `$${value.toFixed(2)}`
    },
    age: {
      formula: 'Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))',
      dependencies: ['birthdate']
    }
  }}
/>
```

### Auto-scroll Behavior

```tsx
<SurveyForm
  survey={data}
  autoScroll={true}          // Scroll to new content
  autoFocus={true}           // Focus first input on page change
  scrollBehavior="smooth"    // Smooth scrolling
  scrollOffset={100}         // Offset from top
/>
```

### Debug Mode

```tsx
<SurveyForm
  survey={data}
  enableDebug={true}  // Shows debug information
  debug={true}        // Alternative prop name
/>
```

## 📚 API Reference

### SurveyForm Props

```tsx
interface SurveyFormProps {
  survey: {
    rootNode: NodeData;
    localizations?: LocalizationMap;
    theme?: ThemeDefinition;
  };
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>) => void;
  onPageChange?: (pageIndex: number, totalPages: number) => void;
  defaultValues?: Record<string, any>;
  language?: string;
  theme?: SurveyTheme;
  layout?: SurveyLayout;
  progressBar?: ProgressBarOptions | boolean;
  navigationButtons?: NavigationButtonsOptions;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  className?: string;
  computedFields?: ComputedFieldsConfig;
  customValidators?: Record<string, CustomValidator>;
  customComponents?: Record<string, React.FC<BlockRendererProps>>;
  mobileNavigation?: MobileNavigationConfig;
  enableDebug?: boolean;
  logo?: ReactNode;
}
```

### Block Data Interface

```tsx
interface BlockData {
  type: string;
  name?: string;
  label?: string;
  description?: string;
  fieldName?: string;
  placeholder?: string;
  text?: string;
  html?: string;
  items?: Array<BlockData>;
  labels?: Array<string>;
  values?: Array<string | number | boolean>;
  defaultValue?: any;
  className?: string;
  showResults?: boolean;
  navigationRules?: NavigationRule[];
  visibleIf?: string;
  isEndBlock?: boolean;
  autoContinueOnSelect?: boolean;
  showContinueButton?: boolean;
  required?: boolean;
  validation?: string;
  [key: string]: any;
}
```

### Theme Definition

```tsx
interface ThemeDefinition {
  name: SurveyTheme;
  containerLayout: string;
  header: string;
  title: string;
  description: string;
  background: string;
  card: string;
  field: {
    label: string;
    input: string;
    description: string;
    error: string;
    radio: string;
    checkbox: string;
    select: string;
    textarea: string;
    file: string;
    matrix: string;
    range: string;
    text: string;
    activeText: string;
    placeholder: string;
    // ... additional field styles
  };
  container: {
    card: string;
    border: string;
    activeBorder: string;
    activeBg: string;
    header: string;
  };
  progress: {
    bar: string;
    dots: string;
    numbers: string;
    percentage: string;
    label: string;
  };
  button: {
    primary: string;
    secondary: string;
    text: string;
    navigation: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
    error: string;
    success: string;
  };
}
```

## 🔌 Hooks

### useSurveyForm

```tsx
import { useSurveyForm } from 'survey-form-package';

const {
  values,              // Current form values
  errors,              // Validation errors
  currentPage,         // Current page index
  currentBlockIndex,   // Current block index
  totalPages,          // Total number of pages
  goToPage,           // Navigate to specific page
  goToNextPage,       // Go to next page
  goToPreviousPage,   // Go to previous page
  goToNextBlock,      // Go to next block
  goToPreviousBlock,  // Go to previous block
  isFirstPage,        // Is on first page
  isLastPage,         // Is on last page
  isSubmitting,       // Is form being submitted
  isValid,            // Is form valid
  submit,             // Submit form
  setValue,           // Set field value
  setError,           // Set field error
  language,           // Current language
  setLanguage,        // Change language
  theme,              // Current theme
  surveyData          // Survey data
} = useSurveyForm(survey, options);
```

### useMobileNavigation

```tsx
import { useMobileNavigation } from 'survey-form-package';

const {
  enableSwipe,        // Enable swipe gestures
  handleSwipeLeft,    // Handle left swipe
  handleSwipeRight,   // Handle right swipe
  swipeDirection,     // Current swipe direction
  isSwipeEnabled      // Is swipe enabled
} = useMobileNavigation({
  onSwipeLeft: () => goToNextPage(),
  onSwipeRight: () => goToPreviousPage(),
  threshold: 50       // Swipe threshold in pixels
});
```

## 🎯 Examples

### Complete Registration Form

```tsx
const registrationSurvey = {
  rootNode: {
    type: "section",
    name: "User Registration",
    uuid: "registration-root",
    items: [
      {
        type: "set",
        name: "Personal Information",
        uuid: "personal-info",
        items: [
          {
            type: "textfield",
            fieldName: "firstName",
            label: "First Name",
            required: true,
            placeholder: "Enter your first name"
          },
          {
            type: "textfield",
            fieldName: "lastName", 
            label: "Last Name",
            required: true,
            placeholder: "Enter your last name"
          },
          {
            type: "textfield",
            fieldName: "email",
            label: "Email Address",
            required: true,
            validation: "email",
            placeholder: "Enter your email"
          },
          {
            type: "datepicker",
            fieldName: "birthdate",
            label: "Date of Birth",
            required: true
          }
        ]
      },
      {
        type: "set",
        name: "Account Setup",
        uuid: "account-setup",
        items: [
          {
            type: "textfield",
            fieldName: "username",
            label: "Username",
            required: true,
            placeholder: "Choose a username"
          },
          {
            type: "textfield",
            fieldName: "password",
            label: "Password",
            type: "password",
            required: true,
            placeholder: "Enter a secure password"
          },
          {
            type: "checkbox",
            fieldName: "interests",
            label: "Select your interests",
            options: [
              { id: "tech", label: "Technology", value: "technology" },
              { id: "sports", label: "Sports", value: "sports" },
              { id: "music", label: "Music", value: "music" },
              { id: "travel", label: "Travel", value: "travel" }
            ]
          }
        ]
      }
    ]
  }
};

<SurveyForm
  survey={registrationSurvey}
  theme="modern"
  layout="stepper"
  progressBar={{
    type: 'numbers',
    showStepTitles: true,
    position: 'top'
  }}
  onSubmit={(data) => {
    console.log('Registration data:', data);
    // Handle registration
  }}
/>
```

### Conditional Survey with BMI Calculator

```tsx
const healthAssessment = {
  rootNode: {
    type: "section",
    name: "Health Assessment",
    uuid: "health-root",
    items: [
      {
        type: "set",
        name: "Basic Information",
        uuid: "basic-info",
        items: [
          {
            type: "radio",
            fieldName: "hasHealthConcerns",
            label: "Do you have any current health concerns?",
            options: [
              { id: "yes", label: "Yes", value: "yes" },
              { id: "no", label: "No", value: "no" }
            ],
            navigationRules: [
              {
                condition: "hasHealthConcerns == 'yes'",
                target: "health-details",
                isPage: true
              },
              {
                condition: "hasHealthConcerns == 'no'",
                target: "bmi-assessment", 
                isPage: true
              }
            ]
          }
        ]
      },
      {
        type: "set",
        name: "Health Details",
        uuid: "health-details",
        items: [
          {
            type: "textarea",
            fieldName: "healthConcerns",
            label: "Please describe your health concerns",
            placeholder: "Describe any current health issues...",
            visibleIf: "hasHealthConcerns == 'yes'"
          }
        ]
      },
      {
        type: "set",
        name: "BMI Assessment",
        uuid: "bmi-assessment",
        items: [
          {
            type: "bmi",
            fieldName: "bmi_calculator",
            label: "BMI Assessment",
            showCategory: true,
            showRecommendations: true
          }
        ]
      }
    ]
  }
};
```

## 🧪 Testing

The package is designed to be easily testable:

```tsx
import { render, fireEvent, screen } from '@testing-library/react';
import { SurveyForm } from 'survey-form-package';

test('renders survey form correctly', () => {
  const mockSurvey = {
    rootNode: {
      type: "section",
      name: "Test Survey",
      items: [
        {
          type: "set",
          name: "Test Page",
          items: [
            {
              type: "textfield",
              fieldName: "name",
              label: "Name"
            }
          ]
        }
      ]
    }
  };

  render(<SurveyForm survey={mockSurvey} />);
  
  expect(screen.getByLabelText('Name')).toBeInTheDocument();
});

test('handles form submission', () => {
  const onSubmit = jest.fn();
  
  render(
    <SurveyForm 
      survey={mockSurvey} 
      onSubmit={onSubmit}
    />
  );
  
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'John Doe' }
  });
  
  fireEvent.click(screen.getByText('Submit'));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

## 📈 Performance

### Bundle Size Optimization

- **Tree Shaking**: Import only what you need
- **Code Splitting**: Layouts and components are lazy-loaded
- **Minimal Dependencies**: Carefully chosen peer dependencies

```tsx
// Import only specific components to reduce bundle size
import { SurveyForm } from 'survey-form-package/renderer';
import { TextInputBlock } from 'survey-form-package/blocks';
```

### Rendering Performance

- **React.memo**: Components are memoized for optimal re-rendering
- **useMemo/useCallback**: Expensive calculations are memoized
- **Virtual Scrolling**: For large surveys with many blocks

## 🔒 Security

### Input Sanitization

All user inputs are automatically sanitized to prevent XSS attacks:

```tsx
// HTML content is sanitized by default
{
  type: "html",
  html: userInput,  // Automatically sanitized
  allowDangerousHTML: false  // Set to true only if you trust the source
}
```

### Validation

Built-in validation patterns prevent malicious inputs:

```tsx
{
  type: "textfield",
  fieldName: "email",
  validation: "email",      // Built-in email validation
  customValidation: (value) => {
    // Custom validation logic
    if (value.includes('<script>')) {
      return 'Invalid characters detected';
    }
    return null;
  }
}
```

## 🚀 Migration Guide

### From v0.1.x to v0.2.x

1. **Updated Theme Structure**
```tsx
// Before
theme="default"

// After - same API, enhanced themes
theme="default"  // Now includes more styling options
```

2. **New Block Types**
```tsx
// New blocks available
- BMICalculatorBlock
- CalculatedFieldBlock
- ConditionalBlock
- CheckoutBlock
```

3. **Enhanced Mobile Support**
```tsx
// New mobile navigation options
<SurveyForm
  survey={data}
  mobileNavigation={{
    enableSwipeNavigation: true,
    showMobileBackButton: true
  }}
/>
```

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/UNILOOP/react-survey-builder.git
cd react-survey-builder/src/packages/survey-form-package

# Install dependencies
bun install

# Start development mode
bun run dev

# Run tests
bun test

# Build package
bun run build
```

## 📄 License

This package is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **@dnd-kit** for drag-and-drop functionality
- **React Hook Form** for form handling inspiration

## 📞 Support

- 📧 **Email**: sayeed99@live.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/UNILOOP/react-survey-builder/issues)

---