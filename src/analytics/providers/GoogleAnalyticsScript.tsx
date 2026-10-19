import { useEffect } from 'react';

interface GoogleAnalyticsScriptProps {
  measurementId: string;
  debug?: boolean;
}

export const GoogleAnalyticsScript: React.FC<GoogleAnalyticsScriptProps> = ({ measurementId, debug }) => {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.gtag) {
      window.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      if (debug) {
        console.log('[GA Script] gtag already exists, skipping initialization');
      }
      return;
    }

    if (debug) {
      console.log('[GA Script] Initializing Google Analytics:', measurementId);
    }

    // Method 1: Direct script injection with proper initialization
    const loadGoogleAnalytics = () => {
      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      
      // Create gtag function
      window.gtag = function gtag() {
        window.dataLayer!.push(arguments as any);
      };
      
      // Set initial timestamp
      window.gtag('js', new Date());
      
      // Configure GA
      window.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        debug_mode: debug
      });

      // Create and inject script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      script.defer = true;
      
      // Add to head
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);
      
      if (debug) {
        console.log('[GA Script] Script injected into DOM');
        
        // Monitor script loading
        script.addEventListener('load', () => {
          console.log('[GA Script] Script loaded successfully from network');
        });
        
        script.addEventListener('error', (e) => {
          console.error('[GA Script] Failed to load script:', e);
        });
      }
    };

    // Method 2: Use Next.js Script component approach (inline initialization)
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        debug_mode: ${debug}
      });
    `;
    document.head.appendChild(inlineScript);
    
    // Then load the actual GA script
    loadGoogleAnalytics();

    if (debug) {
      // Log verification after a delay
      setTimeout(() => {
        console.log('[GA Script] Verification after 2s:');
        console.log('  - window.gtag exists:', typeof window.gtag === 'function');
        console.log('  - dataLayer length:', window.dataLayer?.length);
        console.log('  - GA script in DOM:', !!document.querySelector(`script[src*="${measurementId}"]`));
      }, 2000);
    }
  }, [measurementId, debug]);

  return null;
};

// Alternative: Use native script loading
export const loadGoogleAnalyticsNative = (measurementId: string, debug?: boolean): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }

    // Check if already loaded
    if (window.gtag && document.querySelector(`script[src*="${measurementId}"]`)) {
      if (debug) {
        console.log('[GA Native] Already loaded');
      }
      resolve();
      return;
    }

    try {
      // Initialize inline
      const initScript = document.createElement('script');
      initScript.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}', {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          debug_mode: ${debug || false}
        });
      `;
      document.head.appendChild(initScript);

      // Load external script
      const gaScript = document.createElement('script');
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      gaScript.async = true;
      
      let loaded = false;
      const checkLoaded = setInterval(() => {
        // Check if requests are being made
        if (window.gtag && window.dataLayer && window.dataLayer.length > 0) {
          if (!loaded) {
            loaded = true;
            clearInterval(checkLoaded);
            if (debug) {
              console.log('[GA Native] Successfully initialized');
            }
            resolve();
          }
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!loaded) {
          clearInterval(checkLoaded);
          console.warn('[GA Native] Load timeout, but gtag may still work');
          resolve(); // Resolve anyway as gtag function exists
        }
      }, 5000);

      document.head.appendChild(gaScript);
    } catch (error) {
      reject(error);
    }
  });
};
