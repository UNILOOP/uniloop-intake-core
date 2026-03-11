# Intake Builder Package

A powerful, customizable React intake form renderer and builder library with TypeScript support, featuring AI-powered conversational layouts, advanced conditional logic, comprehensive theming, analytics, and A/B testing capabilities. Code identifiers use `Survey*` naming (e.g., `SurveyForm`, `SurveyBuilder`).

## Features

### **Core Rendering**
- **4 Layouts**: Default (page-by-page), Chat (AI conversational), Voice (speech-to-speech), and custom layouts
- **18 Block Types**: Complete set of form input types, content blocks, and logic blocks
- **Conditional Logic**: Show/hide blocks based on user responses with complex condition evaluation
- **Navigation Rules**: Custom routing between pages based on user input
- **Real-time Validation**: 47 validation operators across 6 categories with variable references
- **Progress Tracking**: Multiple progress indicator styles (bar, dots, numbers, percentage)
- **Computed Fields**: Dynamic calculations based on other form values

### **AI-Powered Layouts**
- **Chat Layout**: Conversational AI interface with typing indicators, schema-based multi-field input, and per-block chat renderers
- **Voice Layout**: Speech-to-speech with TTS/STT handlers, animated orb, voice commands, and visual input fallback

### **Analytics**
- **GA4, GTM, Meta Pixel**: Built-in provider integrations
- **Custom Handlers**: `trackEvent`, `trackPageView`, `trackTiming`, `setUserProperties`
- **18 Event Types**: Automatically tracked across the intake lifecycle

### **A/B Testing**
- **Per-Block Variants**: Weighted variant selection with session persistence
- **Preview Mode**: Bypass persistence for testing

### **Visual Flow Builder**
- **Node-based Interface**: Visual drag-and-drop intake flow creation
- **Real-time Connections**: Draw connections between nodes to create navigation rules
- **Multiple Node Types**: Pages, blocks, start/submit nodes with automatic layout
- **Flow Modes**: Select, connect, and pan modes for different editing operations
- **Interactive Canvas**: Zoom, pan, and navigate through complex flows

### **Theming**
- **8 Built-in Themes**: default, minimal, colorful, modern, corporate, dark, hims, uniloop
- **Dark Mode**: `themeMode` prop with `'light' | 'dark' | 'system'`
- **Custom Fonts**: Load fonts via CDN URLs on any theme
- **Full Customization**: Override every visual aspect via `ThemeDefinition`

### **Developer Experience**
- **TypeScript First**: Full type safety with comprehensive interfaces
- **React 19 Compatible**: Built for modern React with hooks and context
- **Extensible**: Register custom blocks and layouts at runtime
- **Resume/Save**: Restore partially completed forms with `initialValues`, `startPage`, and navigation history

## Installation

```bash
npm install survey-form-package
```

### Peer Dependencies
```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "lucide-react": "^0.525.0"
}
```

## Quick Start

### Basic Intake Form Renderer

```tsx
import React from 'react';
import SurveyForm from 'survey-form-package';

const surveyData = {
  rootNode: {
    type: "section",
    name: "Customer Feedback",
    uuid: "survey-root",
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
        values: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
        uuid: "satisfaction-field"
      },
      {
        type: "textarea",
        fieldName: "comments",
        label: "Additional Comments",
        placeholder: "Share your thoughts...",
        uuid: "comments-field"
      }
    ]
  },
};

function App() {
  const handleSubmit = (data: Record<string, any>) => {
    console.log('Submitted:', data);
  };

  const handleChange = (data: Record<string, any>) => {
    console.log('Changed:', data);
  };

  return (
    <SurveyForm
      survey={surveyData}
      theme="modern"
      layout="default"
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

### Builder Integration

```tsx
import React, { useState } from 'react';
import { SurveyBuilder, StandardBlocks, StandardNodes } from 'survey-form-package/src/builder';

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

The builder supports multiple display modes: `list`, `graph`, `flow`, `lang`, and `theme`.

## Layouts

The `layout` prop accepts a layout name string or a custom `React.FC<LayoutProps>` component.

### `default` / `renderPage`

Page-by-page layout with progress bar and navigation buttons. This is the standard intake form experience.

```tsx
<SurveyForm survey={surveyData} layout="default" />
```

### `chat`

AI-powered conversational interface. Questions are presented one at a time as chat messages with typing indicators. Supports schema-based multi-field input collection and per-block custom chat renderers.

Requires an `aiHandler` in `customData` for conversational question generation.

```tsx
import SurveyForm from 'survey-form-package';
import type { AIHandler, ChatCustomData } from 'survey-form-package';

const aiHandler: AIHandler = async (context) => {
  // context includes:
  //   block: BlockData          - current block configuration
  //   previousResponses         - all previous answers
  //   conversationHistory       - full chat message history
  //   surveyTitle               - title of the survey
  //   currentQuestionIndex      - current question position
  //   totalQuestions            - total number of questions
  //   inputSchema               - schema for multi-field blocks
  //   currentField              - which field is being collected
  //   collectedFields           - fields already collected
  //   remainingFields           - fields still needed

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      block: context.block,
      previousResponses: context.previousResponses,
      conversationHistory: context.conversationHistory,
      currentQuestionIndex: context.currentQuestionIndex,
      totalQuestions: context.totalQuestions,
    }),
  });
  const data = await response.json();

  return {
    conversationalQuestion: data.question,
    additionalContext: data.context,     // Optional extra context
    audio: data.audioBase64,             // Optional TTS audio (base64)
    audioFormat: 'mp3',                  // Required if audio provided
  };
};

const customData: ChatCustomData = {
  aiHandler,
  welcomeMessage: "Hi! I'm here to help you complete this intake. Let's get started!",
  typingDelay: 500,           // Typing indicator delay in ms
  showTimestamps: false,      // Show timestamps on messages
  inputPlaceholder: 'Type your answer...',
};

<SurveyForm
  survey={surveyData}
  layout="chat"
  customData={customData}
  onSubmit={(data) => console.log('Completed:', data)}
/>
```

#### Chat Layout Types

```typescript
interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  blockId?: string;
  blockType?: string;
  timestamp: Date;
  isLoading?: boolean;
  originalQuestion?: string;
  userResponse?: {
    value: any;
    displayValue: string;
  };
}

interface AIHandlerContext {
  block: BlockData;
  previousResponses: Record<string, any>;
  conversationHistory: ChatMessage[];
  surveyTitle?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  inputSchema?: BlockSchema;
  currentField?: string;
  collectedFields?: Record<string, any>;
  remainingFields?: string[];
}

interface AIHandlerResponse {
  conversationalQuestion: string;
  additionalContext?: string;
  audio?: string;               // Base64 encoded TTS audio
  audioFormat?: 'mp3' | 'pcm' | 'ogg' | 'wav';
  audioSampleRate?: number;     // For PCM format
}

type AIHandler = (context: AIHandlerContext) => Promise<AIHandlerResponse>;

interface ChatCustomData {
  aiHandler?: AIHandler;
  welcomeMessage?: string;
  typingDelay?: number;
  showTimestamps?: boolean;
  inputPlaceholder?: string;
}
```

#### Per-Block Chat Renderers

Blocks can define a `chatRenderer` for custom UI in chat layout:

```typescript
const MyBlock: BlockDefinition = {
  type: 'rating',
  // ...
  chatRenderer: ({ block, value, onChange, onSubmit, theme, disabled, error }) => (
    <div>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => { onChange(star); onSubmit(star); }}
          disabled={disabled}
        >
          {star <= (value || 0) ? '★' : '☆'}
        </button>
      ))}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  ),
};
```

### `voice`

Speech-to-speech conversational layout with an animated orb, TTS/STT integration, voice commands, and visual input fallback. All handlers are optional — features degrade gracefully when not provided.

```tsx
import SurveyForm from 'survey-form-package';
import type { VoiceCustomData } from 'survey-form-package';

const customData: VoiceCustomData = {
  // Messages
  welcomeMessage: "Hi! Let's get started with your intake.",
  completionMessage: "Thank you for completing the intake!",

  // AI handler (same as chat layout)
  aiHandler: async (context) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(context),
    });
    return await res.json();
  },

  // TTS handler - returns audio data or stream URL
  ttsHandler: async (req) => {
    // req: { text, language?, voice?, rate? }
    const res = await fetch(`/api/tts?text=${encodeURIComponent(req.text)}&voice=${req.voice || 'Joanna'}`);
    return {
      streamUrl: res.url,    // Preferred: browser starts playing before full download
      // OR: audio: base64String, format: 'mp3'
    };
  },

  // STT streaming session factory
  sttSessionFactory: (onTranscript, onError, config) => ({
    start: async () => { /* Connect to streaming STT service */ },
    sendAudio: (audio) => { /* Send PCM Int16 ArrayBuffer chunk */ },
    end: async () => { /* Close connection */ },
    isActive: false,
    // Optional methods:
    preconnect: async () => { /* Pre-establish connection */ },
    pause: () => { /* Pause listening, keep connection */ },
    resume: () => { /* Resume listening */ },
  }),

  // Optional: custom audio capture (e.g., for iOS compatibility)
  mediaCaptureFactory: (onAudioChunk, config, onError) => ({
    start: async () => { /* Start recording */ },
    stop: () => { /* Stop recording */ },
    isCapturing: false,
    volume: 0,
  }),

  // Voice answer validation
  validationHandler: async (req) => {
    // req: { transcript, options, multiSelect, questionLabel?, blockType? }
    const res = await fetch('/api/voice-validate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return await res.json();
    // Response: { success, isValid, matchedOptions, matchedValues, confidence,
    //             needsConfirmation, confirmationMessage?, suggestedAction?,
    //             extractedData?, partialData?, missingFields? }
  },

  // Session handlers
  sessionInitHandler: async (req) => {
    return { success: true, sessionId: 'session-123' };
  },
  sessionEndHandler: async (req) => { /* Cleanup */ },

  // Behavior options
  autoListen: true,          // Auto-start listening after speaking
  silenceTimeout: 2000,      // ms before processing speech
  maxListenTime: 15000,      // Maximum listening time in ms
  typingDelay: 500,
  orbStyle: 'breathe',       // 'pulse' | 'wave' | 'glow' | 'minimal' | 'breathe'
  language: 'en-US',
  ttsVoice: 'Joanna',        // Voice ID for TTS

  // Session configuration
  sessionConfig: {
    sessionId: 'session-123',
    surveyId: 'intake-001',
    userId: 'user-456',
    language: 'en-US',
    useBrowserTTS: false,     // Use browser Web Speech API for TTS
    useBrowserSTT: false,     // Use browser SpeechRecognition for STT
  },

  // Event callbacks
  onVoiceCommand: (command) => console.log('Voice command:', command),
  onTranscript: (transcript, isFinal) => console.log('Transcript:', transcript),
  onStateChange: (state) => console.log('Voice state:', state),
};

<SurveyForm
  survey={surveyData}
  layout="voice"
  customData={customData}
  onSubmit={(data) => console.log('Completed:', data)}
/>
```

#### Voice Layout Types

```typescript
type VoiceState =
  | 'idle'          // Waiting
  | 'listening'     // Recording user speech
  | 'processing'    // Processing user input
  | 'speaking'      // Playing TTS audio
  | 'visual_input'  // User is using visual controls
  | 'error'         // Error state
  | 'complete'      // Survey finished
  | 'loading';      // API call in progress

type InputMode = 'voice' | 'visual' | 'hybrid';

type VoiceCommandType = 'navigate' | 'repeat' | 'skip' | 'stop' | 'change';

interface VoiceCommand {
  type: VoiceCommandType;
  payload?: {
    direction?: 'back' | 'forward';
    fieldName?: string;
    [key: string]: unknown;
  };
}

interface TTSRequest {
  text: string;
  language?: string;
  voice?: string;
  rate?: number;         // 0.5-2.0, default 1.0
}

interface TTSResponse {
  audio?: string | ArrayBuffer;
  format?: 'mp3' | 'pcm' | 'ogg' | 'wav';
  sampleRate?: number;
  streamUrl?: string;    // Preferred for streaming playback
}

interface VoiceLayoutProps extends LayoutProps {
  welcomeMessage?: string;
  completionMessage?: string;
  autoListen?: boolean;
  silenceTimeout?: number;
  maxListenTime?: number;
  containerClassName?: string;
  messageHistoryClassName?: string;
  showMessageHistory?: boolean;
  showVisualFallback?: boolean;
  orbStyle?: 'pulse' | 'wave' | 'glow' | 'minimal';
  orbPosition?: 'center' | 'bottom' | 'top';
}
```

#### Block-Level Voice Controls

Blocks can opt out of AI validation or disable audio input:

```typescript
{
  type: 'fileupload',
  fieldName: 'document',
  label: 'Upload your document',
  skipAIValidation: true,    // Don't use AI to validate voice input
  disableAudioInput: true,   // Hide voice input button, visual only
}
```

### Custom Layouts

The intake system is fully extensible — you can inject your own layout components to completely control how the form is rendered, while still getting automatic analytics tracking, form state management, and block rendering for free.

There are three ways to use a custom layout:

#### Option 1: Pass a Component Directly

The simplest approach — pass your React component as the `layout` prop. It's automatically wrapped with analytics tracking via `createLayout()`.

```tsx
import SurveyForm from 'survey-form-package';
import { useSurveyForm, CurrentBlock, NavigationButtons, ProgressIndicator } from 'survey-form-package';
import type { LayoutProps } from 'survey-form-package';

const MinimalLayout: React.FC<LayoutProps> = (props) => {
  const { currentPage, totalPages, theme } = useSurveyForm();

  return (
    <div className="max-w-lg mx-auto p-6">
      <ProgressIndicator type="bar" showPercentage />

      <div className="my-8">
        <CurrentBlock className="mb-4" autoFocus />
      </div>

      <NavigationButtons
        nextText="Continue"
        submitText="Done"
        previousText="Back"
      />
    </div>
  );
};

<SurveyForm survey={surveyData} layout={MinimalLayout} />
```

#### Option 2: Register a Named Layout

Register a layout by name so it can be referenced with a string. Useful when you want to switch layouts dynamically or reuse across multiple forms.

```tsx
import { registerLayout, unregisterLayout } from 'survey-form-package';
import type { LayoutDefinition } from 'survey-form-package';

const wizardLayout: LayoutDefinition = {
  name: 'wizard',
  description: 'Step-by-step wizard with sidebar navigation',
  component: WizardLayoutComponent,
};

// Register on app startup
registerLayout(wizardLayout);

// Use by name
<SurveyForm survey={surveyData} layout="wizard" />

// Unregister when no longer needed
unregisterLayout('wizard');
```

#### Option 3: Wrap with `createLayout()` Manually

If you need direct control over when the analytics wrapper is applied:

```tsx
import { createLayout } from 'survey-form-package';

const AnalyticsWrappedLayout = createLayout(MyRawLayoutComponent);

<SurveyForm survey={surveyData} layout={AnalyticsWrappedLayout} />
```

#### LayoutProps Interface

All custom layouts receive these props:

```typescript
interface LayoutProps {
  progressBar?: ProgressBarOptions | boolean;
  navigationButtons?: NavigationButtonsOptions;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  enableDebug?: boolean;
  showNavigationHistory?: boolean;
  logo?: any;
}
```

#### Layout Helper Components

Three composable components are exported so you don't have to reimplement common layout functionality:

##### `CurrentBlock`

Automatically renders the current block with proper value binding, error handling, and theme application. Handles `autoContinueOnSelect` behavior automatically.

```tsx
import { CurrentBlock } from 'survey-form-package';

<CurrentBlock
  className="my-4"
  autoFocus={true}
  onValueChange={(fieldName, value) => console.log(fieldName, value)}
  wrapper={MyAnimationWrapper}  // Optional wrapper component
/>
```

Props:
- `className` — Container CSS class
- `autoFocus` — Focus the first input when block changes
- `onValueChange` — Callback when the current block's value changes
- `wrapper` — Custom wrapper component `React.ComponentType<{ children: ReactNode }>`

##### `NavigationButtons`

Automatically renders Previous/Next/Submit buttons with correct state. Handles form submission, determines if it's the last step, and manages disabled states.

```tsx
import { NavigationButtons } from 'survey-form-package';

// Simple
<NavigationButtons />

// Customized
<NavigationButtons
  className="mt-6"
  showPrevious={true}
  showNext={true}
  previousText="Go Back"
  nextText="Continue"
  submitText="Finish"
  align="space-between"          // 'left' | 'center' | 'right' | 'space-between'
  variant="default"              // 'default' | 'custom'
  onNavigate={(direction) => console.log(direction)}
/>

// With fully custom button rendering
<NavigationButtons
  renderPreviousButton={({ onClick, disabled, text }) => (
    <button onClick={onClick} disabled={disabled} className="my-back-btn">
      {text}
    </button>
  )}
  renderNextButton={({ onClick, disabled, text, isSubmit }) => (
    <button onClick={onClick} disabled={disabled} className="my-next-btn">
      {isSubmit ? '🎉 ' : ''}{text}
    </button>
  )}
/>
```

##### `ProgressIndicator`

Renders a progress indicator with multiple visualization types. Supports fully custom rendering.

```tsx
import { ProgressIndicator } from 'survey-form-package';

// Simple bar
<ProgressIndicator />

// Customized
<ProgressIndicator
  type="bar"                     // 'bar' | 'dots' | 'numbers' | 'percentage' | 'steps'
  showPercentage={true}
  showStepInfo={true}            // "Question 1 of 5"
  color="#3B82F6"
  backgroundColor="#E5E7EB"
  height={4}
  animate={true}
  className="mb-4"
/>

// Fully custom rendering
<ProgressIndicator
  render={({ progress, currentStep, totalSteps }) => (
    <div className="text-sm text-gray-500">
      {currentStep}/{totalSteps} — {Math.round(progress)}% complete
    </div>
  )}
/>
```

#### Complete Custom Layout Example

Here's a full example of a card-based layout with a sidebar, custom animations, and all three helper components:

```tsx
import React from 'react';
import SurveyForm, {
  useSurveyForm,
  CurrentBlock,
  NavigationButtons,
  ProgressIndicator,
} from 'survey-form-package';
import type { LayoutProps } from 'survey-form-package';

const CardLayout: React.FC<LayoutProps> = ({ logo }) => {
  const {
    theme,
    currentPage,
    totalPages,
    values,
    canGoBack,
    getActualProgress,
  } = useSurveyForm();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        {logo && <div className="text-center mb-6">{logo}</div>}

        <ProgressIndicator
          type="bar"
          showPercentage
          className="mb-6"
        />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <CurrentBlock
            className="min-h-[200px]"
            autoFocus
          />
        </div>

        {/* Navigation */}
        <div className="mt-6">
          <NavigationButtons
            nextText="Continue"
            submitText="Complete"
            previousText="Back"
            align="space-between"
            renderNextButton={({ onClick, disabled, text, isSubmit }) => (
              <button
                onClick={onClick}
                disabled={disabled}
                className={`w-full py-4 rounded-full font-semibold text-white transition-all
                  ${disabled ? 'bg-gray-300' : 'bg-black hover:bg-gray-800'}`}
              >
                {text}
              </button>
            )}
          />
        </div>
      </div>
    </div>
  );
};

// Usage
<SurveyForm
  survey={surveyData}
  layout={CardLayout}
  logo={<img src="/logo.svg" alt="Logo" />}
  analytics={{ enabled: true, surveyId: 'my-form' }}
  onSubmit={(data) => console.log(data)}
/>
```

#### Accessing Form Context in Custom Layouts

Inside any custom layout, use `useSurveyForm()` to access the full form state and navigation methods. See the [useSurveyForm hook](#useSurveyForm) section for all available values.

#### Layout Registry Functions

```tsx
import {
  registerLayout,        // Add a layout to the registry
  unregisterLayout,      // Remove a layout from the registry
  getLayoutDefinition,   // Get a layout definition by name
  getAllLayoutDefinitions, // Get all registered layouts
  getLayoutComponent,    // Resolve a layout string/component to a React component
} from 'survey-form-package';
```

## Themes

8 built-in themes plus full customization:

```tsx
import SurveyForm from 'survey-form-package';

// Available themes
type SurveyTheme =
  | "default"      // Clean blue accent, gray background
  | "minimal"      // Simplified, typography-focused, gray tones
  | "colorful"     // Vibrant purple/pink gradients
  | "modern"       // Coral accent (#E67E4D), white background, rounded elements
  | "corporate"    // Professional blue, left-border cards
  | "dark"         // Dark background, blue accents
  | "hims"         // Medical aesthetic, coral orange, centered labels
  | "uniloop"      // Medical-friendly, purple primary (#948EC4), custom fonts
  | "custom";      // Fully customizable

<SurveyForm survey={data} theme="modern" />

// Dark mode support
<SurveyForm survey={data} theme="modern" themeMode="dark" />
// themeMode: 'light' | 'dark' | 'system'
```

### Custom Theme

```tsx
import type { ThemeDefinition } from 'survey-form-package';

const customTheme: ThemeDefinition = {
  name: "custom",
  containerLayout: "max-w-2xl mx-auto",
  header: "mb-6",
  title: "text-2xl font-semibold text-gray-900 mb-2",
  description: "text-base text-gray-600",
  background: "bg-white",
  card: "bg-white shadow-sm border border-gray-100 rounded-lg p-4 mb-4",
  field: {
    label: "block text-sm font-medium text-gray-700 mb-2",
    input: "w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    description: "mt-1 text-xs text-gray-500",
    error: "mt-1 text-xs text-red-600",
    radio: "focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-200",
    checkbox: "focus:ring-1 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-200 rounded",
    select: "w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    textarea: "w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
    file: "w-full text-sm text-gray-700 border border-gray-200 rounded-md cursor-pointer bg-white",
    matrix: "border-collapse w-full text-sm",
    range: "accent-blue-600",
    text: "text-gray-700",
    activeText: "text-blue-600",
    placeholder: "text-gray-400",
    boxBorder: "border-gray-200",
    // SelectableBox styling
    selectableBox: "p-3 transition-all duration-150 cursor-pointer rounded-md",
    selectableBoxDefault: "border border-gray-200 bg-white hover:bg-gray-50",
    selectableBoxSelected: "border-2 border-blue-500 bg-blue-50",
    selectableBoxHover: "hover:border-gray-300",
    selectableBoxFocus: "focus-within:ring-1 focus-within:ring-blue-500 focus-within:ring-offset-1",
    selectableBoxDisabled: "opacity-50 cursor-not-allowed",
    selectableBoxContainer: "space-y-2",
    selectableBoxText: "text-gray-700 text-sm",
    selectableBoxTextSelected: "text-blue-900 font-medium",
    selectableBoxIndicator: "bg-blue-600 text-white",
    selectableBoxIndicatorIcon: "text-white",
    // Agreement block styling
    agreementContainer: "p-4 space-y-3",
    agreementPanel: "rounded-md border border-gray-100 p-3 text-sm whitespace-pre-wrap bg-gray-50",
    signatureCanvas: "w-full h-36 border border-gray-200 rounded-md overflow-hidden bg-white",
    signatureColor: "#111827",
  },
  container: {
    card: "bg-white border border-gray-100 rounded-lg",
    border: "border-gray-200",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-50",
    header: "bg-gray-50",
  },
  progress: {
    bar: "h-2 bg-blue-500 rounded-full overflow-hidden",
    dots: "flex space-x-2",
    numbers: "flex space-x-2",
    percentage: "text-right text-xs text-gray-500 mb-1",
    label: "text-xs text-gray-500 mb-1",
  },
  button: {
    primary: "w-full justify-center rounded-full px-8 py-4 bg-blue-600 text-white font-semibold text-sm transition-all",
    secondary: "inline-flex justify-center py-2 px-4 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white",
    text: "text-sm font-medium text-blue-600 hover:text-blue-700",
    navigation: "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600",
  },
  colors: {
    primary: "#3B82F6",
    secondary: "#6B7280",
    accent: "#F59E0B",
    background: "#F9FAFB",
    text: "#111827",
    border: "#E5E7EB",
    error: "#EF4444",
    success: "#10B981",
  },
};

<SurveyForm
  survey={data}
  theme="custom"
  survey={{ ...surveyData, theme: customTheme }}
/>
```

### Custom Fonts

Themes can load custom fonts via the `fonts` property:

```typescript
const customTheme: ThemeDefinition = {
  // ...other theme properties
  fonts: {
    // CDN URLs for loading custom fonts
    urls: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap',
    ],
    // Font families
    primary: 'Inter, sans-serif',
    secondary: 'DM Sans, sans-serif',
    heading: 'DM Sans, sans-serif',
    body: 'Inter, sans-serif',
    monospace: 'JetBrains Mono, monospace',
    // Font weights
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};
```

Font utilities are exported for manual use:

```tsx
import { useFontLoader, loadFonts, unloadFonts, getFontCSSProperties } from 'survey-form-package';

// Hook: auto-load/unload fonts based on theme
useFontLoader(theme);

// Manual: load specific font URLs
await loadFonts(['https://fonts.googleapis.com/css2?family=Inter&display=swap']);

// Get CSS properties for inline style application
const cssProps = getFontCSSProperties(theme);
```

### ThemeDefinition Interface

```typescript
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
    boxBorder?: string;
    // SelectableBox styling
    selectableBox?: string;
    selectableBoxDefault?: string;
    selectableBoxSelected?: string;
    selectableBoxHover?: string;
    selectableBoxFocus?: string;
    selectableBoxDisabled?: string;
    selectableBoxContainer?: string;
    selectableBoxText?: string;
    selectableBoxTextSelected?: string;
    selectableBoxIndicator?: string;
    selectableBoxIndicatorIcon?: string;
    // Agreement block styling
    agreementContainer?: string;
    agreementPanel?: string;
    signatureCanvas?: string;
    signatureColor?: string;
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
  fonts?: {
    urls?: string[];
    primary?: string;
    secondary?: string;
    heading?: string;
    body?: string;
    monospace?: string;
    weights?: {
      normal?: number;
      medium?: number;
      semibold?: number;
      bold?: number;
    };
  };
}
```

## Block Types

18 active block types in the registry.

### Input Blocks

#### Text Input
```tsx
{
  type: "textfield",
  fieldName: "email",
  label: "Email Address",
  placeholder: "Enter your email",
  uuid: "email-field"
}
```

#### Textarea
```tsx
{
  type: "textarea",
  fieldName: "comments",
  label: "Additional Comments",
  placeholder: "Share your thoughts...",
  uuid: "comments-field"
}
```

#### Radio Buttons
```tsx
{
  type: "radio",
  fieldName: "gender",
  label: "Gender",
  values: ["Male", "Female", "Other"],
  uuid: "gender-field"
}
```

#### Checkboxes
```tsx
{
  type: "checkbox",
  fieldName: "interests",
  label: "Select your interests",
  values: ["Technology", "Sports", "Music", "Travel"],
  uuid: "interests-field"
}
```

#### Selectable Boxes
```tsx
{
  type: "selectablebox",
  fieldName: "preference",
  label: "Choose your preference",
  values: ["Option A", "Option B", "Option C"],
  autoContinueOnSelect: true,    // Auto-advance after selection
  showContinueButton: false,     // Hide continue button
  uuid: "preference-field"
}
```

#### Select Dropdown
```tsx
{
  type: "select",
  fieldName: "country",
  label: "Country",
  placeholder: "Select your country",
  values: ["United States", "Canada", "United Kingdom"],
  uuid: "country-field"
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
  defaultValue: 5,
  uuid: "satisfaction-field"
}
```

#### Date Picker
```tsx
{
  type: "datepicker",
  fieldName: "birthdate",
  label: "Date of Birth",
  placeholder: "Select date",
  uuid: "birthdate-field"
}
```

#### File Upload
```tsx
{
  type: "fileupload",
  fieldName: "resume",
  label: "Upload Resume",
  accept: ".pdf,.doc,.docx",
  multiple: false,
  uuid: "resume-field"
}
```

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
  ],
  uuid: "evaluation-field"
}
```

### Content Blocks

#### HTML Block
```tsx
{
  type: "html",
  html: `
    <div class="alert">
      <h3>Important Information</h3>
      <p>Please read this carefully before proceeding.</p>
    </div>
  `,
  className: "my-4",
  uuid: "info-block"
}
```

#### Markdown Block
```tsx
{
  type: "markdown",
  text: `
# Instructions

Please answer all questions **honestly** and *completely*.

- Take your time
- Read each question carefully
- Contact support if you need help
  `,
  uuid: "instructions-block"
}
```

### Logic & Utility Blocks

#### Auth Block
```tsx
{
  type: "auth",
  fieldName: "auth",
  label: "Please sign in to continue",
  uuid: "auth-block"
}
```

#### Agreement Block
```tsx
{
  type: "agreement",
  fieldName: "consent",
  label: "Terms and Conditions",
  text: "I agree to the terms and conditions...",
  uuid: "agreement-block"
  // Supports signature canvas for collecting signatures
}
```

#### Script Block
```tsx
{
  type: "script",
  fieldName: "custom_script",
  label: "Custom Logic",
  uuid: "script-block"
  // Executes custom script logic during the intake flow
}
```

#### Conditional Block
```tsx
{
  type: "conditional",
  fieldName: "conditional_question",
  label: "Additional Information",
  visibleIf: "age >= 18",
  items: [
    {
      type: "textfield",
      fieldName: "adult_info",
      label: "Adult-specific question"
    }
  ],
  uuid: "conditional-block"
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
  uuid: "total-field"
}
```

#### BMI Calculator
```tsx
{
  type: "bmiCalculator",
  fieldName: "bmi_result",
  label: "BMI Assessment",
  uuid: "bmi-field"
}
```

## Custom Blocks

The intake system supports injecting custom block types at runtime. Custom blocks integrate fully with the builder (drag-and-drop, configuration panel, preview), the renderer (all layouts including default, chat, and voice), validation, A/B testing, analytics, and output schemas. Once registered, custom blocks behave identically to built-in blocks.

### How It Works

1. Define a `BlockDefinition` object with your block's type, name, rendering logic, and validation
2. Register it with `registerBlock()` — it's immediately available in both builder and renderer
3. Use it in survey data by referencing your block's `type` string
4. Optionally provide `chatRenderer` for chat layout, `outputSchema` for AI validation, and `skipAIValidation`/`disableAudioInput` for voice layout control

### Complete Example: Credit Card Block

```typescript
import React, { useEffect } from "react";
import { CreditCard } from "lucide-react";
import type {
  BlockDefinition,
  ContentBlockItemProps,
  BlockRendererProps,
  ChatRendererProps,
} from "survey-form-package";
import { registerBlock } from "survey-form-package";

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

  // Renderer: Actual intake form
  renderBlock: ({ block, value, onChange, error, disabled, theme }) => (
    <div className="space-y-2">
      {block.label && (
        <label className={theme?.field.label || "block text-sm font-medium text-gray-900"}>
          {block.label}
        </label>
      )}

      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          const formatted = e.target.value
            .replace(/\s/g, '')
            .replace(/(\d{4})/g, '$1 ')
            .trim()
            .substr(0, 19);
          onChange?.(formatted);
        }}
        placeholder={block.placeholder}
        disabled={disabled}
        className={`${theme?.field.input || 'w-full p-3 border rounded-md'} ${
          error ? 'border-red-500' : ''
        } ${disabled ? 'bg-gray-100' : ''}`}
        maxLength={19}
      />

      {error && (
        <div className={theme?.field.error || "text-sm text-red-600"}>{error}</div>
      )}
    </div>
  ),

  // Chat layout: custom chat renderer
  chatRenderer: ({ block, value, onChange, onSubmit, disabled, error }) => (
    <div className="flex gap-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value && onSubmit(value)}
        placeholder="Enter card number"
        disabled={disabled}
        className="flex-1 p-2 border rounded-md"
      />
      <button
        onClick={() => value && onSubmit(value)}
        disabled={disabled || !value}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Submit
      </button>
    </div>
  ),

  // Output schema for AI validation
  outputSchema: { type: 'string' },

  // Validation
  validate: (data) => {
    if (!data.fieldName) return "Field name is required";
    if (!data.label) return "Label is required";
    return null;
  },

  validateValue: (value, data) => {
    if (!value) return null;

    const cleaned = value.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      return "Please enter a valid card number";
    }
    if (!/^\d+$/.test(cleaned)) {
      return "Card number can only contain digits";
    }

    return null;
  },
};

// Register when your app starts
export default function MyApp() {
  useEffect(() => {
    registerBlock(CreditCardBlock);
    return () => unregisterBlock('credit-card');
  }, []);

  return (
    <SurveyBuilder
      blockDefinitions={[...StandardBlocks, CreditCardBlock]}
      // ... other props
    />
  );
}
```

### Registration Methods

#### Method 1: Global Registration (Recommended)

Register blocks globally so they work in both builder and renderer:

```typescript
import { registerBlock, unregisterBlock } from "survey-form-package";

// Register when your app starts
useEffect(() => {
  registerBlock(CreditCardBlock);

  // Optional: cleanup on unmount
  return () => unregisterBlock('credit-card');
}, []);
```

#### Method 2: Direct Registry Access

Import and modify the block registry directly:

```typescript
import { blockRegistry } from "survey-form-package";

blockRegistry['credit-card'] = CreditCardBlock;
```

#### Method 3: Pass to Builder

When using the builder, pass custom blocks alongside standard blocks:

```tsx
import { SurveyBuilder, StandardBlocks } from 'survey-form-package/src/builder';

<SurveyBuilder
  blockDefinitions={[...StandardBlocks, CreditCardBlock, AnotherCustomBlock]}
  // ...
/>
```

### Using Custom Blocks in Survey Data

Once registered, custom blocks are used in survey data just like built-in blocks — reference them by their `type` string:

```tsx
const surveyData = {
  rootNode: {
    type: "section",
    uuid: "root",
    items: [
      { type: "textfield", fieldName: "name", label: "Full Name" },
      // Use your custom block by its type
      { type: "credit-card", fieldName: "card", label: "Payment Card" },
      { type: "textfield", fieldName: "email", label: "Email" },
    ]
  }
};

// The custom block renders automatically — no special config needed
<SurveyForm survey={surveyData} layout="default" onSubmit={handleSubmit} />
```

Custom blocks also work with all layouts, including chat and voice:

```tsx
// Chat layout will use chatRenderer if defined on the block, or fall back to renderBlock
<SurveyForm survey={surveyData} layout="chat" customData={{ aiHandler }} />

// Voice layout respects skipAIValidation and disableAudioInput on the block
<SurveyForm survey={surveyData} layout="voice" customData={{ aiHandler, ttsHandler }} />
```

### Block Registry Functions

```tsx
import {
  registerBlock,          // Add a block to the registry
  unregisterBlock,        // Remove a block from the registry
  getBlockDefinition,     // Get a block definition by type (auto-wrapped with BlockMountGuard)
  getAllBlockDefinitions,  // Get all registered block definitions
  blockRegistry,          // Direct access to the registry Record<string, BlockDefinition>
  clearBlockCache,        // Clear the wrapped block cache (useful for testing)
} from 'survey-form-package';
```

### Block Definition Properties

#### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Unique identifier for the block (e.g., `'credit-card'`) |
| `name` | `string` | Display name in the builder |
| `description` | `string` | Brief description of the block's purpose |
| `defaultData` | `BlockData` | Default configuration when block is created |

#### Builder Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `renderItem` | `(props: ContentBlockItemProps) => JSX.Element` | How the block appears in the builder's survey preview |
| `renderFormFields` | `(props: ContentBlockItemProps) => JSX.Element` | Configuration form for editing block properties |
| `renderPreview` | `() => JSX.Element` | Small preview shown in the block library |
| `generateDefaultData` | `() => BlockData` | Optional function to generate default data dynamically |

#### Renderer Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `renderBlock` | `(props: BlockRendererProps) => JSX.Element \| null` | **Required for rendering.** How the block renders in the actual intake form |
| `chatRenderer` | `(props: ChatRendererProps) => JSX.Element \| null` | Optional custom UI for chat layout. When defined, ChatLayout uses this instead of the default input |

#### Validation Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `validate` | `(data: BlockData) => string \| null` | Validates block configuration in the builder |
| `validateValue` | `(value: any, data: BlockData) => string \| null` | Validates user input in the intake form |

#### AI/Voice Properties

| Property | Type | Description |
|----------|------|-------------|
| `outputSchema` | `OutputSchema` | Defines what data structure this block returns (used by AI layouts for validation and data extraction) |
| `inputSchema` | `OutputSchema` | Defines expected input structure |
| `blockFunctions` | `BlockFunctionDef[]` | Custom functions callable by AI |
| `skipAIValidation` | `boolean` | When true, AI won't validate/transform voice or chat input for this block |
| `disableAudioInput` | `boolean` | When true, hides the voice input button in voice layout (visual input only) |

### BlockRendererProps Interface

Props passed to `renderBlock`:

```typescript
interface BlockRendererProps {
  block: BlockData;                    // Block configuration data
  value?: any;                        // Current input value
  onChange?: (value: any) => void;    // Value change handler
  onBlur?: () => void;               // Blur event handler
  error?: string;                     // Validation error message
  disabled?: boolean;                 // Whether the field is disabled
  customComponents?: Record<string, React.FC<BlockRendererProps>>;
  theme?: ThemeDefinition;            // Current theme definition
  isVisible?: boolean;                // Visibility state (from conditional logic)
  customValidation?: (value: any) => string | null;
}
```

### ChatRendererProps Interface

Props passed to `chatRenderer`. The renderer is responsible for the full interaction — rendering UI, handling value changes, and calling `onSubmit` when done to advance to the next question:

```typescript
interface ChatRendererProps {
  block: BlockData;                    // Block configuration
  value?: any;                        // Current value (may be undefined for first render)
  onChange: (value: any) => void;     // Update value without submitting
  onSubmit: (value: any) => void;    // Submit value and advance to next question
  theme?: ThemeDefinition;            // Theme for styling
  disabled?: boolean;                 // Whether input is disabled
  error?: string;                     // Validation error message
  placeholder?: string;               // Placeholder text
}
```

### ContentBlockItemProps Interface

Props passed to builder methods (`renderItem`, `renderFormFields`):

```typescript
interface ContentBlockItemProps {
  data: BlockData;                     // Block configuration data
  onUpdate?: (data: BlockData) => void; // Update handler
  onRemove?: () => void;              // Remove handler
}
```

### Minimal Custom Block Example

If you only need a renderer (no builder support), a custom block can be very simple:

```typescript
import { registerBlock } from 'survey-form-package';

registerBlock({
  type: 'star-rating',
  name: 'Star Rating',
  description: 'Rate with stars',
  defaultData: { type: 'star-rating', fieldName: 'rating', label: 'Rating' },
  renderBlock: ({ block, value, onChange, theme }) => (
    <div>
      <label className={theme?.field.label}>{block.label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={`text-2xl ${star <= (value || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  ),
  outputSchema: { type: 'number' },
});
```

## Conditional Logic & Navigation Rules

### Visibility Conditions

Show/hide blocks based on form values using the `visibleIf` property:

```tsx
{
  type: "textfield",
  fieldName: "allergies",
  label: "List your allergies",
  visibleIf: "hasAllergies == 'yes'"
}
```

### Navigation Rules

Control page flow based on responses using `navigationRules` on blocks or pages:

```tsx
{
  type: "selectablebox",
  fieldName: "user_type",
  label: "What type of user are you?",
  values: ["New User", "Existing User"],
  navigationRules: [
    {
      condition: "user_type == 'New User'",
      target: "new-user-page-uuid",
      isPage: true
    },
    {
      condition: "user_type == 'Existing User'",
      target: "existing-user-page-uuid",
      isPage: true
    }
  ]
}
```

In paged mode, navigation rules can also be set at the page (set) level:

```tsx
// Only relevant when using mode="paged"
{
  type: "set",
  uuid: "page-1",
  name: "Initial Assessment",
  items: [/* blocks */],
  navigationRules: [
    { condition: "score > 80", target: "advanced-block-uuid" },
    { condition: "score <= 80", target: "basic-block-uuid" },
  ]
}
```

### End Blocks

Mark a block as the end of a flow path:

```tsx
{
  type: "html",
  html: "<p>Thank you! You are not eligible for this program.</p>",
  isEndBlock: true,
  isEndBlockManual: true  // Prevents auto-clearing by the builder
}
```

### Condition Operators

Available operators for `visibleIf` and `navigationRules` conditions:

```
==, !=, >, >=, <, <=
contains, notContains, startsWith, endsWith, matches
empty, notEmpty, isEmpty, isNotEmpty
between, notBetween
in, notIn, containsAny, containsAll, containsNone
```

## Progress Bars & Navigation Controls

### Progress Bars

```tsx
<SurveyForm
  survey={data}
  progressBar={{
    type: 'percentage',        // 'bar' | 'dots' | 'numbers' | 'percentage'
    showPercentage: true,      // Show percentage text
    showStepInfo: true,        // Show "Step 2 of 5"
    showStepTitles: false,     // Show page titles
    showStepNumbers: true,     // Show step numbers
    position: 'top',           // 'top' | 'bottom'
    color: '#3B82F6',          // Custom color
    backgroundColor: '#E5E7EB', // Custom background color
    height: 4,                 // Bar height
    animation: true            // Smooth animations
  }}
/>
```

### Navigation Controls

```tsx
<SurveyForm
  survey={data}
  navigationButtons={{
    showPrevious: true,
    showNext: true,
    showSubmit: true,
    previousText: "Back",
    nextText: "Continue",
    submitText: "Submit",
    position: "bottom",        // 'bottom' | 'split'
    align: "right",           // 'left' | 'center' | 'right'
    style: "default"          // 'default' | 'outlined' | 'text'
  }}
/>
```

## Analytics

Configure analytics via the `analytics` prop. Supports GA4, Google Tag Manager, Meta Pixel, and custom handlers.

```tsx
<SurveyForm
  survey={surveyData}
  analytics={{
    enabled: true,
    surveyId: 'intake-001',
    sessionId: 'session-abc',
    userId: 'user-123',

    // Google Analytics 4
    googleAnalytics: {
      measurementId: 'G-XXXXXXXXXX',
      debug: false,
    },

    // Google Tag Manager
    googleTagManager: {
      containerId: 'GTM-XXXXXXX',
      auth: 'optional-auth-token',
      preview: 'optional-preview-id',
      debug: false,
    },

    // Meta Pixel + Conversion API
    meta: {
      pixelId: '1234567890',
      accessToken: 'optional-for-conversion-api',
      testEventCode: 'TEST12345',
      debug: false,
    },

    // Custom handlers
    trackEvent: (event) => {
      // event: SurveyAnalyticsEvent
      console.log('Event:', event.action, event.label, event.metadata);
    },
    trackPageView: (url, title, additionalData) => {
      console.log('Page:', url, title);
    },
    trackTiming: (category, variable, value, label) => {
      console.log('Timing:', category, variable, value);
    },
    setUserProperties: (properties) => {
      console.log('User:', properties);
    },

    // Granular control
    trackFieldInteractions: true,   // Track field focus/blur/change
    trackValidationErrors: true,    // Track validation failures
    trackTimings: true,             // Track time spent per page/field
    customDimensions: {
      campaign: 'spring-2026',
      variant: 'A',
    },
  }}
/>
```

### Tracked Event Types (18)

| Event | Description |
|-------|-------------|
| `user_authenticated` | User completed authentication |
| `survey_start` | Intake form started |
| `survey_complete` | Intake form submitted |
| `survey_abandon` | User left without completing |
| `page_view` | Page navigated to |
| `page_complete` | All fields on page completed |
| `field_interact` | Field received focus/interaction |
| `field_complete` | Field value finalized |
| `field_error` | Field validation failed |
| `navigation_next` | Navigated forward |
| `navigation_previous` | Navigated backward |
| `navigation_jump` | Jumped to specific page |
| `validation_error` | Page-level validation error |
| `conditional_show` | Conditional block became visible |
| `conditional_hide` | Conditional block became hidden |
| `file_upload` | File uploaded |
| `time_spent` | Time tracking event |
| `block_value_selected` | Block value was selected |

### Analytics Types

```typescript
interface AnalyticsConfig {
  sessionId?: string;
  userId?: string;
  customDimensions?: Record<string, any>;
  googleAnalytics?: { measurementId: string; debug?: boolean };
  googleTagManager?: { containerId: string; auth?: string; preview?: string; debug?: boolean };
  meta?: { pixelId: string; accessToken?: string; testEventCode?: string; debug?: boolean };
  trackEvent?: (event: SurveyAnalyticsEvent) => void;
  trackPageView?: (url: string, title?: string, additionalData?: Record<string, any>) => void;
  trackTiming?: (category: string, variable: string, value: number, label?: string) => void;
  setUserProperties?: (properties: Record<string, any>) => void;
  custom?: { name: string; config: Record<string, any>; handler: AnalyticsProvider };
}

interface SurveyAnalyticsEvent {
  category: 'survey';
  action: SurveyAction;
  label?: string;
  value?: number;
  sessionId?: string;
  userId?: string;
  surveyId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}
```

### Custom Analytics Provider

```typescript
interface AnalyticsProvider {
  name: string;
  initialize(config: any): Promise<void>;
  trackEvent(event: SurveyAnalyticsEvent): void;
  trackPageView(url: string, title?: string, additionalData?: Record<string, any>): void;
  trackTiming(category: string, variable: string, value: number, label?: string): void;
  setUserProperties(properties: Record<string, any>): void;
  setCustomDimensions?(dimensions: Record<string, any>): void;
  isInitialized(): boolean;
  destroy?(): void;
}
```

## A/B Testing

Configure A/B test variants per block via the `abTest` property on `BlockData`:

```tsx
const block = {
  type: 'radio',
  fieldName: 'plan',
  label: 'Choose a plan',
  values: ['Basic', 'Pro'],
  abTest: {
    enabled: true,
    variants: [
      {
        id: 'control',
        name: 'Control',
        weight: 1,     // Relative weight for probability
        blockData: {
          type: 'radio',
          fieldName: 'plan',
          label: 'Select your plan',
          values: ['Basic', 'Pro'],
        },
      },
      {
        id: 'variant-a',
        name: 'Card Layout',
        weight: 1,
        blockData: {
          type: 'selectablebox',
          fieldName: 'plan',
          label: 'Pick the best plan for you',
          values: ['Basic', 'Pro'],
        },
      },
      {
        id: 'variant-b',
        name: 'Detailed Cards',
        weight: 2,     // 2x more likely than control or variant-a
        blockData: {
          type: 'selectablebox',
          fieldName: 'plan',
          label: 'Choose your perfect plan',
          values: ['Basic - Free', 'Pro - $9/mo'],
        },
      },
    ],
    selectedVariantId: undefined,  // Set after variant selection
  },
};
```

### A/B Test Types

```typescript
interface ABTestVariant {
  id: string;
  name: string;
  weight: number;        // Relative weight for probability (e.g., 1, 2, 3)
  blockData: BlockData;  // Block configuration for this variant
}

interface ABTestConfig {
  enabled: boolean;
  variants: ABTestVariant[];
  selectedVariantId?: string;  // Tracks which variant was selected
}
```

### Preview Mode

Use `abTestPreviewMode` to bypass session persistence and select fresh variants each render:

```tsx
<SurveyForm
  survey={surveyData}
  abTestPreviewMode={true}
/>
```

## Resume / Save Progress

Restore a partially completed intake form:

```tsx
function ResumableForm() {
  // Load saved state
  const savedAnswers = JSON.parse(localStorage.getItem('answers') || '{}');
  const savedPage = parseInt(localStorage.getItem('page') || '0');
  const savedHistory = JSON.parse(localStorage.getItem('nav-history') || '[]');

  return (
    <SurveyForm
      survey={surveyData}
      initialValues={savedAnswers}
      startPage={savedPage}
      initialNavigationHistory={savedHistory}
      onChange={(data) => {
        localStorage.setItem('answers', JSON.stringify(data));
      }}
      onPageChange={(pageIndex, totalPages) => {
        localStorage.setItem('page', String(pageIndex));
      }}
      onNavigationHistoryChange={(history) => {
        localStorage.setItem('nav-history', JSON.stringify(history));
      }}
      onSubmit={(data) => {
        // Clear saved state on completion
        localStorage.removeItem('answers');
        localStorage.removeItem('page');
        localStorage.removeItem('nav-history');
        // Submit to server
        fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
      }}
    />
  );
}
```

### Navigation History Entry

```typescript
interface NavigationHistoryEntry {
  pageUuid: string;
  blockUuid?: string;
  timestamp: number;
  trigger: 'forward' | 'back' | 'jump' | 'initial';
}
```

## Validation

Each block supports a `validationRules` array with 47 operators across 6 categories.

### Validation Rule Structure

```typescript
interface ValidationRule {
  id?: string;
  field?: string;                    // Reference another field (optional)
  operator: string;                  // Validation operator
  value?: string | string[] | VariableRef[];  // Comparison value
  message: string;                   // Error message on failure
  severity?: 'error' | 'warning';   // Default: 'error'
  dependencies?: string[];          // Fields this rule depends on
  condition?: string;                // Optional condition for when to apply
}
```

### Comparison Operators (6)

All support variable references in values.

| Operator | Label | Description |
|----------|-------|-------------|
| `==` | Equals | Trigger: if value matches, validation **fails** (disqualify) |
| `!=` | Not equals | Constraint: value must not equal |
| `>` | Greater than | Numeric comparison |
| `>=` | Greater than or equal | Numeric comparison |
| `<` | Less than | Numeric comparison |
| `<=` | Less than or equal | Numeric comparison |

### String Operators (10)

| Operator | Label | Value Type |
|----------|-------|-----------|
| `contains` | Contains | Single |
| `notContains` | Does not contain | Single |
| `startsWith` | Starts with | Single |
| `endsWith` | Ends with | Single |
| `matches` | Matches pattern | Single (regex) |
| `lengthEquals` | Length equals | Single |
| `lengthGreaterThan` | Length greater than | Single |
| `lengthLessThan` | Length less than | Single |
| `minLength` | Minimum length | Single |
| `maxLength` | Maximum length | Single |

### Array Operators (5)

| Operator | Label | Description |
|----------|-------|-------------|
| `in` | In array | Value is in the list |
| `notIn` | Not in array | Value is not in the list |
| `containsAny` | Contains any of | Contains at least one value from list |
| `containsAll` | Contains all of | Contains all values from list |
| `containsNone` | Contains none of | Contains no values from list |

### Logical Operators (4)

| Operator | Label | Value Type |
|----------|-------|-----------|
| `isEmpty` | Is empty | None |
| `isNotEmpty` | Is not empty | None |
| `between` | Between | Array [min, max] |
| `notBetween` | Not between | Array [min, max] |

### Format Operators (6)

| Operator | Label | Description |
|----------|-------|-------------|
| `isEmail` | Is valid email | Email format validation |
| `isUrl` | Is valid URL | URL format validation |
| `isNumber` | Is valid number | Numeric validation |
| `isInteger` | Is valid integer | Integer validation |
| `isDate` | Is valid date | Date format validation |
| `isPhone` | Is valid phone | Phone number validation |

### Date Operators (19)

| Operator | Label | Value Type |
|----------|-------|-----------|
| `dateEquals` | Date equals | Single |
| `dateNotEquals` | Date not equals | Single |
| `dateGreaterThan` | Date after | Single |
| `dateGreaterThanOrEqual` | Date on or after | Single |
| `dateLessThan` | Date before | Single |
| `dateLessThanOrEqual` | Date on or before | Single |
| `dateBetween` | Date between | Array [start, end] |
| `dateNotBetween` | Date not between | Array [start, end] |
| `isToday` | Is today | None |
| `isPastDate` | Is past date | None |
| `isFutureDate` | Is future date | None |
| `isWeekday` | Is weekday | None |
| `isWeekend` | Is weekend | None |
| `dayOfWeekEquals` | Day of week equals | Single (0=Sun, 1=Mon, ...) |
| `monthEquals` | Month equals | Single (1=Jan, 2=Feb, ...) |
| `yearEquals` | Year equals | Single |
| `ageGreaterThan` | Age greater than | Single |
| `ageLessThan` | Age less than | Single |
| `ageBetween` | Age between | Array [min, max] |

### Validation Examples

```tsx
// Email validation
{
  type: "textfield",
  fieldName: "email",
  label: "Email",
  validationRules: [
    { operator: 'isNotEmpty', message: 'Email is required' },
    { operator: 'isEmail', message: 'Must be a valid email address' },
  ],
}

// Age range validation with date
{
  type: "datepicker",
  fieldName: "birthdate",
  label: "Date of Birth",
  validationRules: [
    { operator: 'isNotEmpty', message: 'Date of birth is required' },
    { operator: 'isPastDate', message: 'Date must be in the past' },
    { operator: 'ageBetween', value: ['18', '100'], message: 'You must be between 18 and 100 years old' },
  ],
}

// Conditional validation (only applies when condition is met)
{
  type: "textfield",
  fieldName: "spouse_name",
  label: "Spouse Name",
  validationRules: [
    {
      operator: 'isNotEmpty',
      message: 'Spouse name is required when married',
      condition: "marital_status == 'married'",
    },
  ],
}

// Disqualification trigger
{
  type: "radio",
  fieldName: "pregnant",
  label: "Are you currently pregnant?",
  values: ["Yes", "No"],
  validationRules: [
    { operator: '==', value: 'Yes', message: 'This program is not available during pregnancy' },
  ],
}
```

### Variable References

Validation values can reference other fields dynamically:

```tsx
{
  operator: '>=',
  value: [{ type: 'variable', value: 'minAge' }],
  message: 'Must be at least the minimum age',
}
```

### Custom Validators

Pass custom validators via the `customValidators` prop:

```tsx
<SurveyForm
  survey={data}
  customValidators={{
    email: {
      validate: (value, formValues) => {
        if (!value?.includes('@')) return 'Invalid email format';
        return null;
      },
      validateAsync: async (value, formValues) => {
        // Check if email is already registered
        const res = await fetch(`/api/check-email?email=${value}`);
        const { exists } = await res.json();
        return exists ? 'Email already registered' : null;
      },
      dependencies: [],  // Fields this validator depends on
    },
    phone: {
      validate: (value) => {
        if (value && !/^\+?[\d\s\-\(\)]+$/.test(value)) return 'Invalid phone number';
        return null;
      },
    },
  }}
/>
```

## Output Schema

Blocks can define an `outputSchema` describing their return data structure. This is used by AI layouts (chat/voice) for validation, data extraction, and multi-field input collection.

### Schema Types

```typescript
// Scalar
const scalarSchema: OutputSchemaScalar = {
  type: 'string'  // or 'number' | 'boolean' | 'date'
};

// Array
const arraySchema: OutputSchemaArray = {
  type: 'array',
  items: { type: 'string' }  // or 'number' | 'boolean' | 'object'
};

// Object (for multi-field blocks like BMI calculator)
const objectSchema: OutputSchemaObject = {
  type: 'object',
  properties: {
    height: { type: 'number', description: 'Height in inches' },
    weight: { type: 'number', description: 'Weight in pounds' },
    bmi: { type: 'number', optional: true, description: 'Calculated BMI' },
  },
};

// Union with discriminator (for blocks that return different types based on config)
const unionSchema: OutputSchemaUnion = {
  oneOf: [
    { type: 'string' },                           // Single select
    { type: 'array', items: { type: 'string' } }, // Multi select
  ],
  discriminator: {
    propertyName: 'multiSelect',  // Block config field that determines type
    mapping: { 'false': 0, 'true': 1 },  // Maps config value to oneOf index
  },
};
```

## Computed Fields

Configure dynamic calculations based on other form values:

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
    },
    bmi: {
      formula: '(weight / (height * height)) * 703',
      dependencies: ['height', 'weight'],
      format: (value) => value.toFixed(1)
    }
  }}
/>
```

## SurveyForm Props Reference

All props on `SurveyFormRendererProps`:

```typescript
interface SurveyFormRendererProps {
  // Required
  survey: {
    rootNode: NodeData;
    localizations?: LocalizationMap;
    theme?: ThemeDefinition;
    mode?: SurveyMode;
  };

  // Structure
  mode?: 'paged' | 'pageless';              // Default: 'pageless'

  // Callbacks
  onSubmit?: (data: Record<string, any>) => void;
  onChange?: (data: Record<string, any>) => void;
  onPageChange?: (pageIndex: number, totalPages: number) => void;
  onNavigationHistoryChange?: (history: NavigationHistoryEntry[]) => void;

  // Initial state / Resume
  defaultValues?: Record<string, any>;
  initialValues?: Record<string, any>;       // For loading saved answers
  startPage?: number;                        // For resuming from specific page
  initialNavigationHistory?: NavigationHistoryEntry[];

  // Layout & Theme
  layout?: string | React.FC<LayoutProps>;
  theme?: SurveyTheme;
  themeMode?: 'light' | 'dark' | 'system';
  className?: string;
  logo?: any;

  // UI Options
  progressBar?: ProgressBarOptions | boolean;
  navigationButtons?: NavigationButtonsOptions;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showSummary?: boolean;
  submitText?: string;
  language?: string;

  // Logic & Validation
  computedFields?: ComputedFieldsConfig;
  customValidators?: Record<string, CustomValidator>;

  // Analytics & A/B Testing
  analytics?: AnalyticsConfig;
  abTestPreviewMode?: boolean;

  // Extensibility
  customData?: any;                          // Passed to layouts/blocks

  // Debug
  debug?: boolean;
  enableDebug?: boolean;
}
```

## BlockData Interface

```typescript
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
  validationRules?: ValidationRule[];
  visibleIf?: any;
  isEndBlock?: boolean;
  isEndBlockManual?: boolean;
  autoContinueOnSelect?: boolean;
  showContinueButton?: boolean;
  abTest?: ABTestConfig;
  isCustom?: boolean;
  nextBlockId?: string;
  skipAIValidation?: boolean;
  disableAudioInput?: boolean;
  [key: string]: any;
}
```

## Hooks

### useSurveyForm

Access the full form context from any component rendered inside `SurveyForm`:

```tsx
import { useSurveyForm } from 'survey-form-package';

function MyComponent() {
  const {
    // Form state
    values,                  // Current form values
    errors,                  // Validation errors
    conditionalErrors,       // Errors from conditional validation
    computedValues,          // Computed field values

    // Field operations
    setValue,                // Set a field value
    setError,                // Set/clear a field error
    validateField,           // Validate a single field

    // Page navigation
    currentPage,             // Current page index
    currentBlockIndex,       // Current block index (pageless mode)
    totalPages,              // Total number of pages
    goToPage,               // Navigate to specific page
    goToNextPage,           // Go to next page
    goToPreviousPage,       // Go to previous page
    goToNextBlock,          // Go to next block (pageless)
    goToPreviousBlock,      // Go to previous block (pageless)

    // Page state
    isFirstPage,             // Is on first page
    isLastPage,              // Is on last page
    isSubmitting,            // Is form being submitted
    isValid,                 // Is form valid
    isCurrentPageValid,      // Is current page valid

    // Navigation history
    navigationHistory,       // Array of NavigationHistoryEntry
    canGoBack,               // Whether back navigation is possible

    // Progress
    getActualProgress,       // Get progress percentage
    getTotalVisibleSteps,    // Total visible steps count
    getCurrentStepPosition,  // Current step position in visible steps

    // Actions
    submit,                  // Submit the form
    setLanguage,            // Change language
    evaluateCondition,       // Evaluate a condition string
    getVisibleBlocks,        // Filter blocks by visibility
    updateComputedValues,    // Recalculate computed values
    getNextPageIndex,        // Get next page based on navigation rules

    // Config
    language,                // Current language
    theme,                   // Current ThemeDefinition
    surveyData,              // Original survey data
    enableDebug,             // Debug mode flag
    logo,                    // Logo element
    analytics,               // Analytics context
    customData,              // Custom data from props
    abTestPreviewMode,       // A/B test preview mode
  } = useSurveyForm();

  return <div>Page {currentPage + 1} of {totalPages}</div>;
}
```

### useBlockOperation

Deduplicate async operations during rapid block mount/unmount cycles:

```tsx
import { useBlockOperation, BlockMountGuard } from 'survey-form-package';

function MyBlock({ block }) {
  const { runOperation } = useBlockOperation(block.uuid);

  useEffect(() => {
    runOperation('init', async () => {
      // This won't run twice even if the component remounts quickly
      await fetchData();
    });
  }, []);
}

// BlockMountGuard wraps blocks automatically via getBlockDefinition()
// It handles rapid unmount/remount cycles to prevent duplicate operations
```

### useFontLoader

Automatically load/unload custom fonts defined in a theme:

```tsx
import { useFontLoader } from 'survey-form-package';

function MyComponent({ theme }) {
  useFontLoader(theme);
  // Fonts from theme.fonts.urls are loaded on mount and unloaded on unmount
}
```

## Flow Builder

The Flow Builder provides a visual, node-based interface for creating intake flows with drag-and-drop functionality.

### Flow Builder Interface

```tsx
import { SurveyBuilder, StandardBlocks, StandardNodes } from 'survey-form-package/src/builder';

// The builder includes flow mode as one of its display modes
<SurveyBuilder
  blockDefinitions={StandardBlocks}
  nodeDefinitions={StandardNodes}
  onDataChange={handleSurveyChange}
  initialData={surveyData}
  enableDebug={false}
/>
```

### Display Modes

The builder supports five display modes: `list`, `graph`, `flow`, `lang`, `theme`.

### Node Types

#### Block Nodes
Individual form elements (the primary node type in pageless mode, the default):
```tsx
{
  type: "textfield",
  fieldName: "email",
  label: "Email Address",
  uuid: "email-field"
}
```

#### Page Nodes (Set) — Paged Mode Only
In paged mode (`mode="paged"`), blocks are grouped into pages using set nodes:
```tsx
{
  type: "set",
  name: "Contact Information",
  uuid: "contact-page",
  items: [/* blocks */]
}
```

### Visual Navigation Rules

Create navigation rules by connecting nodes in the flow:

1. **Switch to Connect Mode**: Click the connect tool in the toolbar
2. **Draw Connections**: Click and drag from one node to another
3. **Configure Rules**: The navigation rule editor opens automatically
4. **Set Conditions**: Define when to follow this connection

### Flow Canvas Features

- **Zoom**: Mouse wheel or zoom controls
- **Pan**: Middle mouse button or pan mode
- **Fit View**: Auto-fit all nodes in viewport
- **Node Selection**: Click to select, multi-select with Ctrl/Cmd
- **Hierarchical Layout**: Nodes automatically arranged by flow structure
- **Live Sync**: Changes immediately reflected in survey data

## Mobile Features

### Swipe Navigation

```tsx
<SurveyForm
  survey={data}
  mobileNavigation={{
    enableSwipeNavigation: true,
    enableDoubleTapToGoBack: true,
    showMobileBackButton: true,
    preventBrowserBack: false,
    swipeThreshold: 50           // Minimum swipe distance in pixels
  }}
/>
```

### Mobile Navigation Types

```typescript
interface MobileNavigationConfig {
  enableSwipeNavigation?: boolean;
  enableDoubleTapToGoBack?: boolean;
  showMobileBackButton?: boolean;
  preventBrowserBack?: boolean;
  swipeThreshold?: number;
}
```

## Localization

Support multiple languages through the `localizations` property and `language` prop:

```tsx
const surveyWithLocalizations = {
  rootNode: {
    // ... survey structure
  },
  localizations: {
    en: {
      "welcome_title": "Welcome to our intake",
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
  language="es"
/>
```

Use localized strings in blocks:

```tsx
{
  type: "textfield",
  fieldName: "name",
  label: "{{name_label}}",
  placeholder: "{{name_placeholder}}"
}
```

## Advanced Configuration

### Auto-scroll & Focus

```tsx
<SurveyForm
  survey={data}
  autoScroll={true}    // Scroll to new content on page change
  autoFocus={true}     // Focus first input on page change
/>
```

### Debug Mode

```tsx
<SurveyForm
  survey={data}
  enableDebug={true}   // Shows debug panel with form state
  debug={true}         // Alternative prop
/>
```

### Survey Mode

The default mode is **pageless** — blocks live directly under `rootNode.items` and each block is presented as its own step. Use paged mode only if you need to group multiple blocks onto a single page.

```tsx
// Pageless mode (default): rootNode -> blocks directly, one block per step
<SurveyForm survey={data} />
// or explicitly:
<SurveyForm survey={data} mode="pageless" />

// Paged mode: rootNode -> pages (sets) -> blocks, multiple blocks per page
<SurveyForm survey={data} mode="paged" />
```

#### Pageless Data Structure (Default)
```tsx
{
  rootNode: {
    type: "section",
    uuid: "root",
    items: [
      { type: "textfield", fieldName: "name", label: "Name" },
      { type: "radio", fieldName: "role", label: "Role", values: ["Admin", "User"] },
      { type: "textarea", fieldName: "bio", label: "Bio" },
    ]
  }
}
```

#### Paged Data Structure
```tsx
{
  rootNode: {
    type: "section",
    uuid: "root",
    nodes: [
      {
        type: "set", uuid: "page-1", name: "Page 1",
        items: [
          { type: "textfield", fieldName: "name", label: "Name" },
          { type: "textfield", fieldName: "email", label: "Email" },
        ]
      },
      {
        type: "set", uuid: "page-2", name: "Page 2",
        items: [
          { type: "textarea", fieldName: "bio", label: "Bio" },
        ]
      },
    ]
  }
}
```

## Examples

### Health Assessment with Conditional Logic

```tsx
const healthAssessment = {
  rootNode: {
    type: "section",
    name: "Health Assessment",
    uuid: "health-root",
    items: [
      {
        type: "radio",
        fieldName: "hasHealthConcerns",
        label: "Do you have any current health concerns?",
        values: ["Yes", "No"],
        uuid: "concerns-question",
        navigationRules: [
          {
            condition: "hasHealthConcerns == 'Yes'",
            target: "health-details",
          },
          {
            condition: "hasHealthConcerns == 'No'",
            target: "bmi-block",
          }
        ]
      },
      {
        type: "textarea",
        fieldName: "healthConcerns",
        label: "Please describe your health concerns",
        placeholder: "Describe any current health issues...",
        uuid: "health-details",
        visibleIf: "hasHealthConcerns == 'Yes'",
        validationRules: [
          { operator: 'isNotEmpty', message: 'Please describe your concerns' },
          { operator: 'minLength', value: '10', message: 'Please provide at least 10 characters' },
        ],
      },
      {
        type: "bmiCalculator",
        fieldName: "bmi_calculator",
        label: "BMI Assessment",
        uuid: "bmi-block",
      }
    ]
  }
};

<SurveyForm
  survey={healthAssessment}
  theme="hims"
  layout="default"
  progressBar={{ type: 'bar', showPercentage: true, position: 'top' }}
  onSubmit={(data) => console.log('Assessment data:', data)}
/>
```

### Registration with Agreement

```tsx
const registrationSurvey = {
  rootNode: {
    type: "section",
    name: "User Registration",
    uuid: "registration-root",
    items: [
      {
        type: "textfield",
        fieldName: "firstName",
        label: "First Name",
        placeholder: "Enter your first name",
        uuid: "first-name",
        validationRules: [
          { operator: 'isNotEmpty', message: 'First name is required' },
        ],
      },
      {
        type: "textfield",
        fieldName: "lastName",
        label: "Last Name",
        placeholder: "Enter your last name",
        uuid: "last-name",
        validationRules: [
          { operator: 'isNotEmpty', message: 'Last name is required' },
        ],
      },
      {
        type: "textfield",
        fieldName: "email",
        label: "Email Address",
        placeholder: "Enter your email",
        uuid: "email",
        validationRules: [
          { operator: 'isNotEmpty', message: 'Email is required' },
          { operator: 'isEmail', message: 'Must be a valid email' },
        ],
      },
      {
        type: "datepicker",
        fieldName: "birthdate",
        label: "Date of Birth",
        uuid: "birthdate",
        validationRules: [
          { operator: 'isNotEmpty', message: 'Date of birth is required' },
          { operator: 'ageBetween', value: ['18', '120'], message: 'You must be at least 18' },
        ],
      },
      {
        type: "selectablebox",
        fieldName: "interests",
        label: "Select your interests",
        values: ["Technology", "Sports", "Music", "Travel", "Health"],
        uuid: "interests",
      },
      {
        type: "agreement",
        fieldName: "consent",
        label: "Terms and Conditions",
        text: "By signing below, you agree to our terms of service and privacy policy.",
        uuid: "consent",
      }
    ]
  }
};

<SurveyForm
  survey={registrationSurvey}
  theme="uniloop"
  layout="default"
  analytics={{
    enabled: true,
    surveyId: 'registration-v2',
    googleAnalytics: { measurementId: 'G-XXXXXXXXXX' },
  }}
  onSubmit={(data) => {
    console.log('Registration data:', data);
  }}
/>
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit your changes
6. Push to the branch and open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build package
npm run build

# Run linter
npm run lint
```

## Acknowledgments

- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **@dnd-kit** for drag-and-drop functionality
- **@xyflow/react** for the visual flow builder

## License

MIT
