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
        conversionId?: string;
        eventMappings?: AnalyticsEventMappings;
        hipaaFilter?: boolean;
        debug?: boolean;
    }): Promise<void> {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const conversionId = (config.conversionId ?? this.mappedConversionId(config.eventMappings) ?? '').trim().toUpperCase();
        if (!conversionId) return;
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

        if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
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
        for (const custom of this.eventMappings?.custom_events ?? []) {
            if (custom.trigger_event !== event.action) continue;
            const condition = custom.condition;
            const clauses = condition?.all ?? (condition?.path ? [condition] : []);
            if (!clauses.every((clause) => {
                const value = clause.path?.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, event);
                const expected = clause.value;
                switch (clause.op ?? 'equals') {
                    case 'equals': return value == expected;
                    case 'not_equals': return value != expected;
                    case 'in': return Array.isArray(expected) && expected.some((entry) => entry == value);
                    case 'not_in': return Array.isArray(expected) && !expected.some((entry) => entry == value);
                    default: return false;
                }
            })) continue;
            this.fireConversion(event, custom.channels.google_ads);
        }
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
        const conversionId = mapping?.conversion_id?.trim().toUpperCase() || this.conversionId;
        if (
            mapping?.enabled === false ||
            !/^AW-[0-9]{4,20}$/.test(conversionId) ||
            !conversionLabel ||
            !/^[A-Za-z0-9_-]+$/.test(conversionLabel)
        ) return;
        const browser = window as unknown as { UNILOOP_PIXEL_REQUIRED?: boolean; UNILOOP_PIXEL_STATE?: { ready?: boolean; requires_consent?: boolean; consent?: Record<string, boolean> } };
        const category = mapping?.consent_category ?? 'marketing';
        if (!this.eventMappings?.full_data_channels?.includes('google_ads') && browser.UNILOOP_PIXEL_REQUIRED && category !== 'necessary'
            && !(browser.UNILOOP_PIXEL_STATE?.ready && !browser.UNILOOP_PIXEL_STATE.requires_consent && browser.UNILOOP_PIXEL_STATE.consent?.[category])) return;

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
            this.eventMappings?.full_data_channels?.includes('google_ads') ? false : (mapping?.hipaa_filter ?? this.hipaaFilter),
        );
        payload.send_to = `${conversionId}/${conversionLabel}`;
        window.gtag?.('event', 'conversion', payload);

        if (this.debug) console.log('[GoogleAds] Conversion tracked:', conversionLabel, payload);
    }

    private mappedConversionId(eventMappings?: AnalyticsEventMappings): string | undefined {
        for (const channels of Object.values(eventMappings?.events ?? {})) {
            const conversionId = channels.google_ads?.conversion_id;
            if (typeof conversionId === 'string' && /^AW-[0-9]{4,20}$/.test(conversionId)) return conversionId;
        }

        for (const customEvent of eventMappings?.custom_events ?? []) {
            const conversionId = customEvent.channels.google_ads?.conversion_id;
            if (typeof conversionId === 'string' && /^AW-[0-9]{4,20}$/.test(conversionId)) return conversionId;
        }

        return undefined;
    }
}
