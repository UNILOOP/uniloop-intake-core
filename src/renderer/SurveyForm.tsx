import React, { useEffect } from 'react';
import type { SurveyFormRendererProps } from '../types';
import { SurveyFormProvider } from '../context/SurveyFormContext';
import { getLayoutComponent } from './layouts';
import { themes } from '../themes';
import { applyDynamicColors } from '../utils/colorUtils';
import { useFontLoader, getFontCSSProperties } from '../utils/fontLoader';
import { SurveyAnalyticsProvider } from '../analytics';
import type { AnalyticsConfig } from '../analytics';

// Import the theme isolation CSS
import '../styles/survey-theme-isolation.css';

export const SurveyForm: React.FC<SurveyFormRendererProps> = ({
  survey,
  onSubmit,
  onChange,
  onPageChange,
  onNavigationHistoryChange,
  defaultValues = {},
  initialValues,
  startPage = 0,
  initialNavigationHistory,
  language = 'en',
  progressBar = true,
  navigationButtons = {
    showPrevious: true,
    showNext: true,
    showSubmit: true,
    previousText: 'Previous',
    nextText: 'Next',
    submitText: 'Submit',
    position: 'bottom',
    align: 'center',
    style: 'default',
  },
  autoScroll = true,
  autoFocus = true,
  showSummary = false,
  submitText = 'Submit',
  enableDebug = false,
  logo = null,
  className = '',
  themeMode = 'light',
  layout,
  abTestPreviewMode = false,
  analytics,
  customData,
  mode,
}) => {
  // Track render count to diagnose re-render issues
  const renderCountRef = React.useRef(0);
  const mountIdRef = React.useRef(Math.random().toString(36).substr(2, 9));
  renderCountRef.current += 1;

  // Track mount/unmount
  React.useEffect(() => {
    if (enableDebug)
      console.log(`[SurveyForm] MOUNTED (instance: ${mountIdRef.current})`);
    return () => {
      if (enableDebug)
        console.log(`[SurveyForm] UNMOUNTED (instance: ${mountIdRef.current})`);
    };
  }, []);

  // Debug log - helps diagnose issues with the survey data and resume functionality
  if (enableDebug) {
    console.log(
      `[SurveyForm] Render #${renderCountRef.current} (instance: ${mountIdRef.current}) - Props received:`,
      {
        initialValues,
        startPage,
        enableDebug,
        hasDefaultValues:
          !!defaultValues && Object.keys(defaultValues).length > 0,
      }
    );
  }

  if (enableDebug) {
    console.log(
      'SurveyForm rendering with survey data:',
      survey?.rootNode?.type || 'No survey data'
    );
  }

  // Get the selected theme - memoize to prevent recreation
  const themeConfig = React.useMemo(
    () => survey?.theme ?? themes.uniloop,
    [survey?.theme]
  );

  // Load custom fonts from CDN URLs if provided in theme
  useFontLoader(themeConfig);

  // Determine if we should use dark theme based on the themeMode prop
  const isDarkMode = React.useMemo(
    () =>
      themeMode === 'dark' ||
      (themeMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches),
    [themeMode]
  );

  // Get font CSS properties
  const fontCSSProperties = React.useMemo(
    () => getFontCSSProperties(themeConfig),
    [themeConfig]
  );

  // Create theme-specific CSS variables that override default values - memoize to prevent recreation
  const surveyThemeStyle = React.useMemo(
    () =>
      ({
        // Use CSS custom properties to override within the survey scope
        '--survey-primary': themeConfig.colors.primary,
        '--survey-secondary': themeConfig.colors.secondary,
        '--survey-accent': themeConfig.colors.accent,
        '--survey-success':
          themeConfig.colors.success ||
          (isDarkMode
            ? 'oklch(0.696 0.17 162.48)'
            : 'oklch(0.6 0.118 184.704)'),
        '--survey-error':
          themeConfig.colors.error ||
          (isDarkMode
            ? 'oklch(0.704 0.191 22.216)'
            : 'oklch(0.577 0.245 27.325)'),
        '--survey-background':
          themeConfig.colors.background ||
          (isDarkMode ? 'oklch(0.141 0.005 285.823)' : 'oklch(0.99 0.002 286)'),
        '--survey-text':
          themeConfig.colors.text ||
          (isDarkMode ? 'oklch(0.985 0 0)' : 'oklch(0.141 0.005 285.823)'),
        '--survey-border':
          themeConfig.colors.border ||
          (isDarkMode ? 'oklch(1 0 0 / 12%)' : 'oklch(0.94 0.002 286.32)'),
        '--survey-surface': isDarkMode
          ? 'oklch(0.21 0.006 285.885)'
          : 'oklch(1 0 0)',
        '--survey-text-muted': isDarkMode
          ? 'oklch(0.705 0.015 286.067)'
          : 'oklch(0.552 0.016 285.938)',
        '--survey-input': isDarkMode
          ? 'oklch(1 0 0 / 18%)'
          : 'oklch(0.96 0.002 286.32)',
        '--survey-ring': isDarkMode
          ? 'oklch(0.552 0.016 285.938)'
          : 'oklch(0.705 0.015 286.067)',
        '--survey-bg':
          themeConfig.colors.background ||
          (isDarkMode ? 'oklch(0.141 0.005 285.823)' : 'oklch(0.99 0.002 286)'),
        '--survey-shadow': isDarkMode
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        '--survey-shadow-lg': isDarkMode
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        // Add font CSS properties
        ...fontCSSProperties,
      } as React.CSSProperties),
    [themeConfig, isDarkMode, fontCSSProperties]
  );

  useEffect(() => {
    applyDynamicColors(themeConfig);
  }, [themeConfig]);

  // Determine theme class based on mode - memoize to prevent recreation
  const themeClass = React.useMemo(() => {
    switch (themeMode) {
      case 'light':
        return 'survey-theme-light';
      case 'dark':
        return 'survey-theme-dark';
      case 'system':
        return 'survey-theme-system';
      default:
        return 'survey-theme-light';
    }
  }, [themeMode]);

  // Enhanced container class with better mobile responsiveness - memoize to prevent recreation
  const containerClass = React.useMemo(
    () =>
      `survey-form-container w-full ${themeConfig.containerLayout} antialiased ${className}`,
    [themeConfig.containerLayout, className]
  );

  // Get the layout component to use
  const LayoutComponent = React.useMemo(() => {
    if (enableDebug) {
      console.log('[SurveyForm] Getting layout component for:', {
        hasLayout: !!layout,
        layoutType: typeof layout,
        layoutName:
          typeof layout === 'function' ? layout.name || 'Anonymous' : layout,
      });
    }
    const component = getLayoutComponent(layout);
    if (enableDebug) {
      console.log('[SurveyForm] Got layout component:', {
        componentType: typeof component,
        componentName: component.name || 'Anonymous',
      });
    }
    return component;
  }, [layout, enableDebug]);

  // Memoize layout props to prevent recreation
  const layoutProps = React.useMemo(
    () => ({
      enableDebug,
      progressBar,
      navigationButtons,
      autoScroll,
      autoFocus,
      showSummary,
      submitText,
      logo,
    }),
    [
      enableDebug,
      progressBar,
      navigationButtons,
      autoScroll,
      autoFocus,
      showSummary,
      submitText,
      logo,
    ]
  );

  // Prepare analytics configuration - memoize to prevent recreation
  const analyticsConfig: AnalyticsConfig = React.useMemo(() => {
    if (!analytics) return {};
    // When the host app supplies a merchant mapping alongside a channel
    // config, thread it into that channel's init payload so the provider's
    // mapEventToXxx() honors it.
    const mappings = analytics.eventMappings;
    return {
      sessionId: analytics.sessionId,
      userId: analytics.userId,
      customDimensions: analytics.customDimensions,
      eventMappings: mappings,
      googleAnalytics: analytics.googleAnalytics,
      googleTagManager: analytics.googleTagManager
        ? { ...analytics.googleTagManager, eventMappings: analytics.googleTagManager.eventMappings ?? mappings }
        : undefined,
      meta: analytics.meta
        ? { ...analytics.meta, eventMappings: analytics.meta.eventMappings ?? mappings }
        : undefined,
      trackEvent: analytics.trackEvent,
      trackPageView: analytics.trackPageView,
      trackTiming: analytics.trackTiming,
      setUserProperties: analytics.setUserProperties,
    };
  }, [analytics]);

  // Determine if analytics should be enabled
  const isAnalyticsEnabled = React.useMemo(
    () =>
      analytics?.enabled !== false &&
      (analytics?.googleAnalytics ||
        analytics?.googleTagManager ||
        analytics?.meta ||
        analytics?.trackEvent),
    [analytics]
  );

  if (enableDebug) {
    console.log('[SurveyForm] Analytics config:', {
      analytics,
      isAnalyticsEnabled,
      analyticsConfig,
    });
  }

  const surveyContent = (
    <div
      className={`relative survey-theme-container ${themeClass} flex-1 min-h-screen flex flex-col`}
      style={surveyThemeStyle}
    >
      <div className="survey-isolated-content flex-1 flex flex-col min-h-screen">
        <div
          className={`${containerClass} ${themeConfig.background} flex flex-col flex-1 min-h-screen`}
        >
          <SurveyFormProvider
            surveyData={survey}
            defaultValues={defaultValues}
            initialValues={initialValues}
            startPage={startPage}
            initialNavigationHistory={initialNavigationHistory}
            onSubmit={onSubmit}
            onChange={onChange}
            onPageChange={onPageChange}
            onNavigationHistoryChange={onNavigationHistoryChange}
            enableDebug={enableDebug}
            language={language}
            theme={themeConfig}
            logo={logo}
            abTestPreviewMode={abTestPreviewMode}
            analytics={analytics}
            customData={customData}
            mode={mode ?? survey.mode}
          >
            <LayoutComponent {...layoutProps} />
          </SurveyFormProvider>
        </div>
      </div>
    </div>
  );

  // Wrap with analytics provider if enabled
  if (isAnalyticsEnabled) {
    return (
      <SurveyAnalyticsProvider
        config={analyticsConfig}
        enabled={analytics?.enabled !== false}
        debug={
          enableDebug ||
          analytics?.googleAnalytics?.debug ||
          analytics?.googleTagManager?.debug
        }
      >
        {surveyContent}
      </SurveyAnalyticsProvider>
    );
  }

  return surveyContent;
};
