import { useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '../AnalyticsContext';
import type { 
  SurveyAnalyticsEvent
} from '../types';

interface SurveyAnalyticsOptions {
  surveyId?: string;
  sessionId?: string;
  userId?: string;
  trackTimings?: boolean;
  trackFieldInteractions?: boolean;
  trackValidationErrors?: boolean;
  debug?: boolean;
}

export const useSurveyAnalytics = (options: SurveyAnalyticsOptions = {}) => {
  const analytics = useAnalytics();
  const startTimeRef = useRef<number>(Date.now());
  const pageStartTimeRef = useRef<number>(Date.now());
  const fieldInteractionTimesRef = useRef<Map<string, number>>(new Map());
  const currentPageRef = useRef<number>(0);
  
  // Track survey start
  const trackSurveyStart = useCallback((metadata?: Record<string, any>) => {
    startTimeRef.current = Date.now();
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'survey_start',
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: startTimeRef.current,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Survey started', event);
    }
  }, [analytics, options]);

  // Track survey completion
  const trackSurveyComplete = useCallback((responses: Record<string, any>, metadata?: Record<string, any>) => {
    const completionTime = Date.now() - startTimeRef.current;
    
    const eventMetadata = {
      completionTime,
      completedPages: currentPageRef.current + 1,
      totalPages: metadata?.totalPages || currentPageRef.current + 1,
      completionRate: 100,
      responses,
      ...metadata
    };
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'survey_complete',
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      value: completionTime,
      metadata: {
        ...eventMetadata,
        responseCount: Object.keys(responses).length
      }
    };
    
    analytics.trackEvent(event);
    
    // Track completion timing
    if (options.trackTimings) {
      analytics.trackTiming('survey', 'completion_time', completionTime, options.surveyId);
    }
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Survey completed', event);
    }
  }, [analytics, options]);

  // Track survey abandonment
  const trackSurveyAbandon = useCallback((reason?: string, metadata?: Record<string, any>) => {
    const timeSpent = Date.now() - startTimeRef.current;
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'survey_abandon',
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      value: timeSpent,
      metadata: {
        completionTime: timeSpent,
        completedPages: currentPageRef.current,
        totalPages: metadata?.totalPages || 0,
        completionRate: metadata?.completionRate || 0,
        abandonReason: reason,
        lastPage: currentPageRef.current,
        ...metadata
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Survey abandoned', event);
    }
  }, [analytics, options]);


  const toSlug = (text: string): string => {
    return text
      .toLowerCase() // convert to lowercase
      .trim() // remove leading/trailing spaces
      .replace(/[^\w\s-]/g, "") // remove non-word characters (except spaces and hyphens)
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // collapse multiple hyphens
  }

  // Track page view
  const trackPageView = useCallback((
    pageIndex: number,
    pageId: string,
    pageTitle?: string,
    totalPages?: number,
    blockLabel?: string,
    surveyName?: string
  ) => {
    // Track time spent on previous page
    if (currentPageRef.current !== pageIndex && options.trackTimings) {
      const timeOnPreviousPage = Date.now() - pageStartTimeRef.current;
      analytics.trackTiming('survey', `page_${currentPageRef.current}_time`, timeOnPreviousPage, options.surveyId);
    }

    currentPageRef.current = pageIndex;
    pageStartTimeRef.current = Date.now();

    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'page_view',
      label: pageTitle || `Page ${pageIndex + 1}`,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        pageIndex,
        pageId,
        pageTitle,
        blockLabel,
        surveyName,
        totalPages: totalPages || 0
      }
    };

    // analytics.trackEvent(event);
    analytics.trackPageView(`/survey/${toSlug(pageTitle ?? '')}/${toSlug(blockLabel ?? '')}`, pageTitle);

    if (options.debug) {
      console.log('[SurveyAnalytics] Page viewed', event);
    }
  }, [analytics, options]);

  // Track field interaction
  const trackFieldInteraction = useCallback((
    fieldId: string, 
    fieldType: string, 
    interactionType: 'focus' | 'blur' | 'change' | 'click',
    value?: any,
    fieldLabel?: string
  ) => {
    if (!options.trackFieldInteractions) return;
    
    // Track field focus time
    if (interactionType === 'focus') {
      fieldInteractionTimesRef.current.set(fieldId, Date.now());
    }
    
    const timeSpent = interactionType === 'blur' && fieldInteractionTimesRef.current.has(fieldId)
      ? Date.now() - fieldInteractionTimesRef.current.get(fieldId)!
      : undefined;
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'field_interact',
      label: fieldLabel || fieldId,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        fieldId,
        fieldType,
        fieldLabel,
        interactionType,
        timeSpent,
        hasValue: value !== undefined && value !== null && value !== ''
      }
    };
    
    analytics.trackEvent(event);
    
    if (timeSpent && options.trackTimings) {
      analytics.trackTiming('field', `${fieldType}_interaction_time`, timeSpent, fieldId);
    }
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Field interaction', event);
    }
  }, [analytics, options]);

  // Track field completion
  const trackFieldComplete = useCallback((
    fieldId: string,
    fieldType: string,
    value: any,
    fieldLabel?: string
  ) => {
    if (!options.trackFieldInteractions) return;
    
    // Format the value based on type
    let formattedValue = value;
    if (typeof value === 'object' && value !== null) {
      // For arrays (like multiple choice), convert to string
      if (Array.isArray(value)) {
        formattedValue = value.join(', ');
      } else {
        // For objects, stringify them
        formattedValue = JSON.stringify(value);
      }
    }
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'field_complete',
      label: fieldLabel || fieldId,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        fieldId,
        fieldType,
        fieldLabel,
        fieldValue: formattedValue, // Include the actual response value
        fieldResponse: value, // Include raw response for complex data types
        valueType: typeof value,
        hasValue: value !== undefined && value !== null && value !== '',
        responseLength: typeof value === 'string' ? value.length : undefined
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Field completed', event);
    }
  }, [analytics, options]);

  // Track navigation
  const trackNavigation = useCallback((
    action: 'next' | 'previous' | 'jump',
    fromPage: number,
    toPage: number,
    metadata?: Record<string, any>
  ) => {
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: `navigation_${action}`,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        fromPage,
        toPage,
        pageChange: toPage - fromPage,
        ...metadata
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Navigation', event);
    }
  }, [analytics, options]);

  // Track validation error
  const trackValidationError = useCallback((
    fieldId: string,
    fieldType: string,
    errorMessage: string,
    attemptedValue?: any
  ) => {
    if (!options.trackValidationErrors) return;
    
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'validation_error',
      label: fieldId,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        fieldId,
        fieldType,
        errorMessage,
        attemptedValue: attemptedValue !== undefined ? String(attemptedValue) : undefined,
        pageIndex: currentPageRef.current
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Validation error', event);
    }
  }, [analytics, options]);

  // Track file upload
  const trackFileUpload = useCallback((
    fieldId: string,
    fileName: string,
    fileSize: number,
    fileType: string
  ) => {
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: 'file_upload',
      label: fileName,
      value: fileSize,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata: {
        fieldId,
        fileName,
        fileSize,
        fileType,
        fileSizeMB: Math.round(fileSize / 1024 / 1024 * 100) / 100
      }
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] File uploaded', event);
    }
  }, [analytics, options]);

  // Set user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    analytics.setUserProperties({
      ...properties,
      survey_id: options.surveyId,
      session_id: options.sessionId,
      user_id: options.userId
    });
  }, [analytics, options]);

  // Track custom event
  const trackCustomEvent = useCallback((
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ) => {
    const event: SurveyAnalyticsEvent = {
      category: 'survey',
      action: action as any,
      label,
      value,
      sessionId: options.sessionId,
      userId: options.userId,
      surveyId: options.surveyId,
      timestamp: Date.now(),
      metadata
    };
    
    analytics.trackEvent(event);
    
    if (options.debug) {
      console.log('[SurveyAnalytics] Custom event', event);
    }
  }, [analytics, options]);

  // Track abandonment on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Check if survey was completed using a window property
      if (currentPageRef.current > 0 && !(window as any).surveyCompleted) {
        trackSurveyAbandon('page_unload');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trackSurveyAbandon]);

  return {
    trackSurveyStart,
    trackSurveyComplete,
    trackSurveyAbandon,
    trackPageView,
    trackFieldInteraction,
    trackFieldComplete,
    trackNavigation,
    trackValidationError,
    trackFileUpload,
    trackCustomEvent,
    setUserProperties,
    isEnabled: analytics.isEnabled
  };
};