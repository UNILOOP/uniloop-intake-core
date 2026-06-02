import type { AnalyticsProvider, SurveyAnalyticsEvent } from '../types';
import { loadGoogleAnalyticsNative } from './GoogleAnalyticsScript';

export class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'GoogleAnalytics';
  private initialized = false;
  private measurementId: string = '';
  private sessionId?: string;
  private userId?: string;
  private debug = false;

  async initialize(config: { 
    measurementId: string; 
    debug?: boolean;
    sessionId?: string;
    userId?: string;
  }): Promise<void> {
    this.measurementId = config.measurementId;
    this.debug = config.debug || false;
    this.sessionId = config.sessionId;
    this.userId = config.userId;

    if (this.debug) {
      console.log('[GoogleAnalytics] Initializing with measurement ID:', this.measurementId);
    }

    // Try using the native loader which handles script injection better
    try {
      await loadGoogleAnalyticsNative(this.measurementId, this.debug);
      this.initialized = true;
      
      // Add session and user configuration if needed
      if (this.sessionId || this.userId) {
        this.configureGA();
      }
      
      if (this.debug) {
        console.log('[GoogleAnalytics] Initialized successfully using native loader');
      }
      return;
    } catch (error) {
      if (this.debug) {
        console.log('[GoogleAnalytics] Native loader failed, falling back to manual method:', error);
      }
    }

    // Fallback: Check if gtag already exists
    if (window.gtag) {
      if (this.debug) {
        console.log('[GoogleAnalytics] gtag already exists, configuring...');
      }
      this.initialized = true;
      this.configureGA();
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="${this.measurementId}"]`);
    if (existingScript) {
      if (this.debug) {
        console.log('[GoogleAnalytics] Script already exists for measurement ID:', this.measurementId);
      }
      // Initialize dataLayer and gtag if they don't exist
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function() {
        window.dataLayer!.push(arguments as any);
      };
      window.gtag('js', new Date());
      this.configureGA();
      this.initialized = true;
      return;
    }

    // Initialize dataLayer and gtag FIRST, before creating script element
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function() {
        window.dataLayer!.push(arguments as any);
      };
    }
    
    // Push initial gtag js command
    window.gtag('js', new Date());

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.id = `google-analytics-${this.measurementId}`;
    
    if (this.debug) {
      console.log('[GoogleAnalytics] Creating script element:', script.src);
      console.log('[GoogleAnalytics] Document readyState:', document.readyState);
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[GoogleAnalytics] Script load timeout after 10 seconds');
        reject(new Error('GA script load timeout'));
      }, 10000);
      
      script.onload = () => {
        clearTimeout(timeout);
        if (this.debug) {
          console.log('[GoogleAnalytics] Script onload event fired');
          console.log('[GoogleAnalytics] Verifying script in DOM:', document.getElementById(`google-analytics-${this.measurementId}`));
          console.log('[GoogleAnalytics] window.gtag type:', typeof window.gtag);
          console.log('[GoogleAnalytics] window.dataLayer length:', window.dataLayer?.length);
        }
        
        // Configure GA with the measurement ID
        this.configureGA();
        
        // Verify initialization with a test
        if (this.debug) {
          setTimeout(() => {
            // Send test event after a small delay to ensure GA is ready
            window.gtag?.('event', 'analytics_initialized', {
              measurement_id: this.measurementId,
              debug_mode: true,
              timestamp: Date.now()
            });
            console.log('[GoogleAnalytics] Test event sent: analytics_initialized');
            console.log('[GoogleAnalytics] Current dataLayer:', window.dataLayer);
          }, 100);
        }
        
        this.initialized = true;
        resolve();
      };
      
      script.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[GoogleAnalytics] Script onerror event:', error);
        console.error('[GoogleAnalytics] Failed to load from URL:', script.src);
        reject(new Error('Failed to load Google Analytics'));
      };
      
      // Try different append methods based on document state
      if (document.readyState === 'loading') {
        // Document still loading, wait for DOM
        document.addEventListener('DOMContentLoaded', () => {
          document.head.appendChild(script);
          if (this.debug) {
            console.log('[GoogleAnalytics] Script appended after DOMContentLoaded');
          }
        });
      } else {
        // Document already loaded, append immediately
        document.head.appendChild(script);
        if (this.debug) {
          console.log('[GoogleAnalytics] Script appended immediately to document head');
          // Force browser to start loading
          script.src = script.src; // Trigger load
        }
      }
    });
  }

  private configureGA(): void {
    if (!window.gtag) {
      console.error('[GoogleAnalytics] gtag is not defined');
      return;
    }

    const config: any = {
      send_page_view: false, // We'll handle page views manually
      debug_mode: this.debug,
      // Enable enhanced measurement
      allow_google_signals: true,
      allow_ad_personalization_signals: false
    };

    // Add session and user IDs if provided
    if (this.sessionId) {
      config.session_id = this.sessionId;
    }
    if (this.userId) {
      config.user_id = this.userId;
    }

    if (this.debug) {
      console.log('[GoogleAnalytics] Configuring with:', config);
    }

    window.gtag('config', this.measurementId, config);
    
    // Set up consent (required for GA4)
    window.gtag('consent', 'default', {
      'analytics_storage': 'granted',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });

    if (this.debug) {
      console.log('[GoogleAnalytics] Configuration complete');
    }
  }

  trackEvent(event: SurveyAnalyticsEvent): void {
    if (!this.initialized || !window.gtag) return;

    const eventData: any = {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      session_id: event.sessionId || this.sessionId,
      user_id: event.userId || this.userId,
      survey_id: event.surveyId
    };

    // Add metadata fields, including field responses
    if (event.metadata) {
      // For field_complete events, ensure we capture the response
      if (event.action === 'field_complete' && event.metadata.fieldValue !== undefined) {
        eventData.field_value = event.metadata.fieldValue;
        eventData.field_id = event.metadata.fieldId;
        eventData.field_type = event.metadata.fieldType;
        eventData.field_label = event.metadata.fieldLabel;
        
        // For complex responses, also send as custom dimension
        if (event.metadata.fieldResponse !== undefined) {
          eventData.field_response = typeof event.metadata.fieldResponse === 'string' 
            ? event.metadata.fieldResponse 
            : JSON.stringify(event.metadata.fieldResponse);
        }
      }
      
      // Include all other metadata
      const metadata = event.metadata;
      Object.keys(metadata).forEach(key => {
        if (!eventData.hasOwnProperty(key)) {
          eventData[key] = metadata[key];
        }
      });
    }

    // Remove undefined values
    Object.keys(eventData).forEach(key => 
      eventData[key] === undefined && delete eventData[key]
    );

    window.gtag('event', event.action, eventData);

    if (this.debug) {
      console.log('[GA] Event tracked:', event.action, eventData);
    }
  }

  trackPageView(url: string, title?: string, additionalData?: Record<string, any>): void {
    if (!this.initialized || !window.gtag) return;

    const pageData: any = {
      page_path: url,
      page_title: title,
      session_id: this.sessionId,
      user_id: this.userId,
      ...additionalData
    };

    // Remove undefined values
    Object.keys(pageData).forEach(key => 
      pageData[key] === undefined && delete pageData[key]
    );

    window.gtag('event', 'page_view', pageData);

    if (this.debug) {
      console.log('[GA] Page view tracked:', pageData);
    }
  }

  trackTiming(category: string, variable: string, value: number, label?: string): void {
    if (!this.initialized || !window.gtag) return;

    const timingData: any = {
      name: variable,
      value: Math.round(value), // GA expects integer milliseconds
      event_category: category,
      event_label: label,
      session_id: this.sessionId,
      user_id: this.userId
    };

    // Remove undefined values
    Object.keys(timingData).forEach(key => 
      timingData[key] === undefined && delete timingData[key]
    );

    window.gtag('event', 'timing_complete', timingData);

    if (this.debug) {
      console.log('[GA] Timing tracked:', timingData);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.initialized || !window.gtag) return;

    // Set user properties
    window.gtag('set', 'user_properties', properties);

    // Also update userId if provided
    if (properties.user_id) {
      this.userId = properties.user_id;
      window.gtag('config', this.measurementId, {
        user_id: this.userId
      });
    }

    if (this.debug) {
      console.log('[GA] User properties set:', properties);
    }
  }

  setCustomDimensions(dimensions: Record<string, any>): void {
    if (!this.initialized || !window.gtag) return;

    // Custom dimensions in GA4 are set as event parameters
    // They need to be configured in GA4 interface first
    window.gtag('set', dimensions);

    if (this.debug) {
      console.log('[GA] Custom dimensions set:', dimensions);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    // GA doesn't provide a way to fully unload, but we can stop tracking
    this.initialized = false;
    if (this.debug) {
      console.log('[GA] Provider destroyed');
    }
  }
}