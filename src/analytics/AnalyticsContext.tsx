import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type {
  AnalyticsConfig,
  AnalyticsContextValue,
  AnalyticsProvider,
  SurveyAnalyticsEvent
} from './types';
import { GoogleAnalyticsProvider } from './providers/GoogleAnalyticsProvider';
import { GoogleTagManagerProvider } from './providers/GoogleTagManagerProvider';
import { MetaPixelProvider } from './providers/MetaPixelProvider';
import { CustomPixelProvider } from './providers/CustomPixelProvider';
// import './utils/debugHelpers'; // Import debug helpers to make them available

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export interface SurveyAnalyticsProviderProps {
  children: React.ReactNode;
  config: AnalyticsConfig;
  enabled?: boolean;
  debug?: boolean;
}

export const SurveyAnalyticsProvider: React.FC<SurveyAnalyticsProviderProps> = ({ 
  children, 
  config, 
  enabled = true,
  debug = false 
}) => {
  const [providers, setProviders] = useState<AnalyticsProvider[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);

  // Initialize analytics providers
  useEffect(() => {
    if (!enabled) {
      if (debug) {
        console.log('[Analytics] Analytics disabled');
      }
      return;
    }
    
    if (initializingRef.current) {
      if (debug) {
        console.log('[Analytics] Already initializing, skipping...');
      }
      return;
    }

    const initializeProviders = async () => {
      initializingRef.current = true;
      const activeProviders: AnalyticsProvider[] = [];

      if (debug) {
        console.log('[Analytics] Starting provider initialization with config:', config);
      }

      try {
        // Initialize Google Analytics
        if (config.googleAnalytics?.measurementId) {
          if (debug) {
            console.log('[Analytics] Initializing Google Analytics with measurement ID:', config.googleAnalytics.measurementId);
          }
          const gaProvider = new GoogleAnalyticsProvider();
          await gaProvider.initialize({
            ...config.googleAnalytics,
            debug: debug || config.googleAnalytics.debug,
            sessionId: config.sessionId,
            userId: config.userId
          });
          activeProviders.push(gaProvider);
          if (debug) {
            console.log('[Analytics] Google Analytics initialized successfully');
          }
        }

        // Initialize Google Tag Manager
        if (config.googleTagManager?.containerId) {
          const gtmProvider = new GoogleTagManagerProvider();
          await gtmProvider.initialize({
            ...config.googleTagManager,
            debug: debug || config.googleTagManager.debug,
            sessionId: config.sessionId,
            userId: config.userId
          });
          activeProviders.push(gtmProvider);
          if (debug) {
            console.log('[Analytics] Google Tag Manager initialized');
          }
        }

        // Initialize Meta Pixel
        if (config.meta?.pixelId) {
          if (debug) {
            console.log('[Analytics] Initializing Meta Pixel with pixel ID:', config.meta.pixelId);
          }
          const metaProvider = new MetaPixelProvider();
          await metaProvider.initialize({
            ...config.meta,
            debug: debug || config.meta.debug,
            sessionId: config.sessionId,
            userId: config.userId
          });
          activeProviders.push(metaProvider);
          if (debug) {
            console.log('[Analytics] Meta Pixel initialized successfully');
          }
        }

        // Initialize custom browser pixels (TikTok, Snapchat, …)
        if (config.customPixels?.pixels && config.customPixels.pixels.length > 0) {
          if (debug) {
            console.log('[Analytics] Initializing Custom Pixels:', config.customPixels.pixels);
          }
          const customPixelProvider = new CustomPixelProvider();
          await customPixelProvider.initialize({
            ...config.customPixels,
            debug: debug || config.customPixels.debug,
            sessionId: config.sessionId,
            userId: config.userId
          });
          activeProviders.push(customPixelProvider);
          if (debug) {
            console.log('[Analytics] Custom Pixels initialized successfully');
          }
        }

        // Initialize custom provider if provided
        if (config.custom?.handler) {
          await config.custom.handler.initialize(config.custom.config);
          activeProviders.push(config.custom.handler);
          if (debug) {
            console.log(`[Analytics] Custom provider "${config.custom.name}" initialized`);
          }
        }

        setProviders(activeProviders);
        setIsInitialized(true);
      } catch (error) {
        console.error('[Analytics] Failed to initialize providers:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    initializeProviders();

    // Cleanup function
    return () => {
      providers.forEach(provider => {
        if (provider.destroy) {
          provider.destroy();
        }
      });
    };
  }, [config, enabled, debug]);

  // Track event across all providers
  const trackEvent = useCallback((event: SurveyAnalyticsEvent) => {
    if (!enabled || !isInitialized) return;

    // Call custom event handler if provided
    if (config.trackEvent) {
      try {
        config.trackEvent(event);
        if (debug) {
          console.log('[Analytics:CustomHandler] Event sent to custom handler:', event);
        }
      } catch (error) {
        console.error('[Analytics:CustomHandler] Failed to call custom event handler:', error);
      }
    }

    providers.forEach(provider => {
      try {
        provider.trackEvent(event);
        if (debug) {
          console.log(`[Analytics:${provider.name}] Event tracked:`, event);
        }
      } catch (error) {
        console.error(`[Analytics:${provider.name}] Failed to track event:`, error);
      }
    });
  }, [providers, enabled, isInitialized, debug, config]);

  // Track page view across all providers
  const trackPageView = useCallback((url: string, title?: string, additionalData?: Record<string, any>) => {
    if (!enabled || !isInitialized) return;

    // Call custom event handler if provided
    if (config.trackPageView) {
      try {
        config.trackPageView(url, title, additionalData);
        if (debug) {
          console.log('[Analytics:CustomHandler] Page View sent to custom handler:', event);
        }
      } catch (error) {
        console.error('[Analytics:CustomHandler] Failed to call custom page view handler:', error);
      }
    }

    providers.forEach(provider => {
      try {
        provider.trackPageView(url, title, additionalData);
        if (debug) {
          console.log(`[Analytics:${provider.name}] Page view tracked:`, { url, title, additionalData });
        }
      } catch (error) {
        console.error(`[Analytics:${provider.name}] Failed to track page view:`, error);
      }
    });
  }, [providers, enabled, isInitialized, debug]);

  // Track timing across all providers
  const trackTiming = useCallback((category: string, variable: string, value: number, label?: string) => {
    if (!enabled || !isInitialized) return;

    // Call custom event handler if provided
    if (config.trackTiming) {
      try {
        config.trackTiming(category, variable, value, label);
        if (debug) {
          console.log('[Analytics:CustomHandler] Time Tracked sent to custom handler:', { category, variable, value, label });
        }
      } catch (error) {
        console.error('[Analytics:CustomHandler] Failed to call custom time tracker handler:', error);
      }
    }

    providers.forEach(provider => {
      try {
        provider.trackTiming(category, variable, value, label);
        if (debug) {
          console.log(`[Analytics:${provider.name}] Timing tracked:`, { category, variable, value, label });
        }
      } catch (error) {
        console.error(`[Analytics:${provider.name}] Failed to track timing:`, error);
      }
    });
  }, [providers, enabled, isInitialized, debug]);

  // Set user properties across all providers
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    if (!enabled || !isInitialized) return;

    // Call custom event handler if provided
    if (config.setUserProperties) {
      try {
        config.setUserProperties(properties);
        if (debug) {
          console.log('[Analytics:CustomHandler] User Properties sent to custom handler:', { properties });
        }
      } catch (error) {
        console.error('[Analytics:CustomHandler] Failed to call custom user properties handler:', error);
      }
    }

    providers.forEach(provider => {
      try {
        provider.setUserProperties(properties);
        if (debug) {
          console.log(`[Analytics:${provider.name}] User properties set:`, properties);
        }
      } catch (error) {
        console.error(`[Analytics:${provider.name}] Failed to set user properties:`, error);
      }
    });
  }, [providers, enabled, isInitialized, debug]);

  const value: AnalyticsContextValue = {
    providers,
    trackEvent,
    trackPageView,
    trackTiming,
    setUserProperties,
    isEnabled: enabled && isInitialized,
    config
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Custom hook to use analytics
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  
  // Return a no-op implementation if context is not available
  if (!context) {
    return {
      providers: [],
      trackEvent: () => {},
      trackPageView: () => {},
      trackTiming: () => {},
      setUserProperties: () => {},
      isEnabled: false,
      config: {} as AnalyticsConfig
    };
  }
  
  return context;
};