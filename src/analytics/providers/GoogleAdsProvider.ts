import { buildMappedAnalyticsPayload } from '../mappingTransforms';
import type { AnalyticsChannelMapping, AnalyticsEventMappings, AnalyticsProvider, ProviderAnalyticsEvent } from '../types';

export class GoogleAdsProvider implements AnalyticsProvider {
    name = 'GoogleAds';
    private initialized = false;
    private conversionId = '';
    private eventMappings?: AnalyticsEventMappings;
    private hipaaFilter = true;
    private debug = false;

    async initialize(config: {
        conversionId: string;
        eventMappings?: AnalyticsEventMappings;
        hipaaFilter?: boolean;
        debug?: boolean;
    }): Promise<void> {
        const conversionId = config.conversionId.trim().toUpperCase();
        if (!/^AW-[0-9]{4,20}$/.test(conversionId)) {
            throw new Error('Google Ads conversion ID must use the AW-123456789 format.');
        }

        this.conversionId = conversionId;
        this.eventMappings = config.eventMappings;
        this.hipaaFilter = config.hipaaFilter ?? true;
        this.debug = config.debug ?? false;

        window.dataLayer = window.dataLayer || [];
        window.gtag =
            window.gtag ||
            function gtag() {
                window.dataLayer!.push(arguments as any);
            };

        if (!document.querySelector(`script[src*="gtag/js?id=${this.conversionId}"]`)) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${this.conversionId}`;
            document.head.appendChild(script);
        }

        window.gtag('js', new Date());
        window.gtag('config', this.conversionId, {
            send_page_view: false,
            allow_ad_personalization_signals: false,
        });
        this.initialized = true;
    }

    trackEvent(event: ProviderAnalyticsEvent): void {
        if (!this.initialized || !window.gtag) return;
        const mapping = this.eventMappings?.events?.[event.action]?.google_ads;
        this.fireConversion(event, mapping);
    }

    trackPageView(url: string, title?: string, additionalData?: Record<string, any>): void {
        this.trackEvent({
            action: 'page_view',
            category: 'page',
            label: title,
            metadata: { page_path: url, page_title: title, source_url: url, ...additionalData },
        });
    }

    trackTiming(category: string, variable: string, value: number, label?: string): void {
        this.trackEvent({ action: 'timing', category, label, value, metadata: { variable, timing_ms: value } });
    }

    setUserProperties(properties: Record<string, any>): void {
        this.trackEvent({ action: 'set_properties', category: 'user', metadata: { properties } });
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private fireConversion(event: ProviderAnalyticsEvent, mapping?: AnalyticsChannelMapping): void {
        const conversionLabel = mapping?.name?.trim();
        if (mapping?.enabled === false || !conversionLabel || !/^[A-Za-z0-9_-]+$/.test(conversionLabel)) return;

        const canonicalPayload: Record<string, unknown> = {
            ...(event.metadata ?? {}),
            category: event.category,
            action: event.action,
            label: event.label,
            value: event.value,
            session_id: event.sessionId,
            user_id: event.userId,
            timestamp: event.timestamp ?? Date.now(),
        };
        Object.keys(canonicalPayload).forEach((key) => canonicalPayload[key] === undefined && delete canonicalPayload[key]);

        const payload = buildMappedAnalyticsPayload(
            canonicalPayload,
            mapping,
            this.eventMappings?.global_drop_keys?.google_ads ?? [],
            this.eventMappings?.global_hash_keys?.google_ads ?? [],
            [],
            mapping?.hipaa_filter ?? this.hipaaFilter,
        );
        payload.send_to = `${this.conversionId}/${conversionLabel}`;
        window.gtag?.('event', 'conversion', payload);

        if (this.debug) console.log('[GoogleAds] Conversion tracked:', conversionLabel, payload);
    }
}
