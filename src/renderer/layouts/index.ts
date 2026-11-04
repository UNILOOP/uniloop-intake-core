import type { LayoutDefinition, LayoutProps } from "../../types";
import { RenderPageSurveyLayout } from "./RenderPageSurveyLayout";
import { createLayout } from "./createLayout";
import React, { Suspense, lazy, createElement } from "react";

// Lazy load heavy layout components
const ChatLayoutLazy = lazy(() => import("./ChatLayout").then(m => ({ default: m.ChatLayout })));
const VoiceLayoutLazy = lazy(() => import("./VoiceLayout").then(m => ({ default: m.VoiceLayout })));

// Create wrapper components that handle Suspense using createElement to avoid JSX in .ts file
const ChatLayoutWrapper: React.FC<LayoutProps> = (props) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-4 flex items-center justify-center' }, 'Loading chat...') },
    createElement(ChatLayoutLazy, props)
  );

const VoiceLayoutWrapper: React.FC<LayoutProps> = (props) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-4 flex items-center justify-center' }, 'Loading voice interface...') },
    createElement(VoiceLayoutLazy, props)
  );

// Registry of all layout definitions
export const layoutRegistry: Record<string, LayoutDefinition> = {
  default: {
    name: "default",
    description: "Default page-by-page layout with progress bar and navigation",
    component: RenderPageSurveyLayout,
  },
  renderPage: {
    name: "renderPage",
    description: "Alias for default layout - page-by-page rendering",
    component: RenderPageSurveyLayout,
  },
  chat: {
    name: "chat",
    description: "Conversational chat-style layout with AI-powered questions",
    component: ChatLayoutWrapper,
  },
  voice: {
    name: "voice",
    description: "Conversational voice + visual intake form with speech-to-speech interaction",
    component: VoiceLayoutWrapper,
  },
};

// Helper function to get a layout definition by name
export function getLayoutDefinition(name: string): LayoutDefinition | undefined {
  return layoutRegistry[name];
}

// Helper function to get all layout definitions
export function getAllLayoutDefinitions(): LayoutDefinition[] {
  return Object.values(layoutRegistry);
}

// Helper function to register a custom layout
export function registerLayout(layout: LayoutDefinition): void {
  layoutRegistry[layout.name] = layout;
}

// Helper function to unregister a layout
export function unregisterLayout(name: string): void {
  delete layoutRegistry[name];
}

// Helper function to get layout component by name or return custom component
// Automatically wraps custom layouts with analytics tracking
export function getLayoutComponent(
  layout?: string | React.FC<LayoutProps>
): React.FC<LayoutProps> {

  // If no layout specified, return default (already has analytics built-in)
  if (!layout) {
    return RenderPageSurveyLayout;
  }

  // If it's a function component, wrap it with createLayout for automatic analytics
  if (typeof layout === "function") {
    const wrapped = createLayout(layout);
    return wrapped;
  }

  // If it's a string, look it up in the registry
  if (typeof layout === "string") {
    const layoutDef = getLayoutDefinition(layout);
    if (layoutDef) {
      // Registry layouts are already set up correctly, no need to wrap
      return layoutDef.component;
    }
    console.warn(
      `Layout "${layout}" not found in registry. Using default layout.`
    );
    return RenderPageSurveyLayout;
  }

  return RenderPageSurveyLayout;
}

export {
  pageLayoutRegistry,
  getPageLayoutDefinition,
  getAllPageLayoutDefinitions,
  resolvePageLayout,
  registerPageLayout,
  unregisterPageLayout,
} from './pageLayouts';

// Export the default layout for direct import
export { RenderPageSurveyLayout };

// Export ChatLayout types (component is lazy-loaded via registry)
export type {
  ChatMessage as ChatMessageType,
  AIHandler,
  AIHandlerContext,
  AIHandlerResponse,
  ChatLayoutProps,
  ChatCustomData,
  ChatRendererProps,
} from './ChatLayout';

// Export VoiceLayout types (component is lazy-loaded via registry)
export type {
  VoiceLayoutProps,
  VoiceCustomData,
  VoiceState,
  VoiceMessage as VoiceMessageType,
  VoiceCommand,
  VoiceCommandType,
  InputMode,
  QuestionClassification,
  VoiceSessionConfig,
} from './VoiceLayout';

// Export helper components and utilities
export { CurrentBlock, NavigationButtons, ProgressIndicator, usePageOwnsNavigation } from './helpers';
export { createLayout } from './createLayout';
