import type { AnalyticsChannelMapping, AnalyticsEventMappings, AnalyticsProvider, CustomPixelInstance, SurveyAnalyticsEvent } from '../types';
import { buildMappedAnalyticsPayload } from '../mappingTransforms';

/**
 * Vetted browser-pixel vendor bootstrap, inlined so this package stays
 * self-contained (it cannot import the host app's resources/js/lib/pixelVendors.ts).
 * The vendor keys MUST mirror App\Enums\PixelVendor + that host registry:
 * tiktok, snapchat, pinterest, linkedin, reddit, twitter. Only a vetted vendor
 * key + a merchant-supplied pixel ID string ever flow into these functions —
 * no merchant-supplied markup or script is evaluated (XSS-safe core).
 *
 * Mirrors the host MetaPixelProvider pattern (check-global → inject → init →
 * trackEvent): each init is idempotent (guards the vendor global / script id)
 * and SSR-safe (guards `typeof window` / `typeof document`).
 */
const PACKAGE_PIXEL_VENDOR_KEYS = ['tiktok', 'snapchat', 'pinterest', 'linkedin', 'reddit', 'twitter'] as const;

type PackagePixelVendorKey = (typeof PACKAGE_PIXEL_VENDOR_KEYS)[number];

interface PackagePixelVendorDefinition {
    init(pixelId: string): void;
    track(pixelId: string, eventName: string, payload: Record<string, unknown>): void;
}

/**
 * Inject a vendor `<script src>` once, keyed by a stable id so repeated calls
 * are no-ops. Returns false when the document is unavailable (SSR).
 */
function injectScriptOnce(scriptId: string, src: string): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    if (document.getElementById(scriptId)) {
        return false;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = src;

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
    } else {
        document.head.appendChild(script);
    }

    return true;
}

const PACKAGE_PIXEL_VENDORS: Record<PackagePixelVendorKey, PackagePixelVendorDefinition> = {
    tiktok: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            if (!win.ttq) {
                win.TiktokAnalyticsObject = 'ttq';
                const ttq: any = function () {
                    (ttq._q ??= []).push([].slice.call(arguments));
                    return ttq;
                };
                ttq.methods = [
                    'page',
                    'track',
                    'identify',
                    'instances',
                    'debug',
                    'on',
                    'off',
                    'once',
                    'ready',
                    'alias',
                    'group',
                    'enableCookie',
                    'disableCookie',
                    'holdConsent',
                    'revokeConsent',
                    'grantConsent',
                ];
                ttq.setAndDefer = (target: any, method: string): void => {
                    target[method] = (...args: unknown[]): unknown => {
                        (ttq._q ??= []).push([method, ...args]);
                        return target;
                    };
                };
                for (const method of ttq.methods) {
                    ttq.setAndDefer(ttq, method);
                }
                ttq.load = (id: string): void => {
                    const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
                    ttq._i ??= {};
                    ttq._i[id] = [];
                    ttq._t ??= {};
                    ttq._t[id] = Date.now();
                    ttq._o ??= {};
                    ttq._o[id] = {};
                    injectScriptOnce('tiktok-pixel-script', `${url}?sdkid=${encodeURIComponent(id)}&lib=ttq`);
                };
                win.ttq = ttq;
            }

            win.ttq.load?.(pixelId);
            win.ttq.page?.();
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            (window as any).ttq?.track?.(eventName, payload);
        },
    },

    snapchat: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            if (!win.snaptr) {
                const snaptr: any = (...args: unknown[]) => {
                    snaptr.handleRequest ? snaptr.handleRequest(...args) : (snaptr.queue ??= []).push(args);
                };
                snaptr.queue = [];
                win.snaptr = snaptr;
                injectScriptOnce('snapchat-pixel-script', 'https://sc-static.net/scevent.min.js');
            }

            win.snaptr('init', pixelId);
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            (window as any).snaptr?.('track', eventName, payload);
        },
    },

    pinterest: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            if (!win.pintrk) {
                const pintrk: any = (...args: unknown[]) => {
                    (pintrk.queue ??= []).push(args);
                };
                pintrk.queue = [];
                pintrk.version = '3.0';
                win.pintrk = pintrk;
                injectScriptOnce('pinterest-pixel-script', 'https://s.pinimg.com/ct/core.js');
            }

            win.pintrk('load', pixelId);
            win.pintrk('page');
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            (window as any).pintrk?.('track', eventName, payload);
        },
    },

    linkedin: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            win._linkedin_partner_id = pixelId;
            const partnerIds = (win._linkedin_data_partner_ids ??= []);
            if (!partnerIds.includes(pixelId)) {
                partnerIds.push(pixelId);
            }

            if (!win.lintrk) {
                const lintrk: any = (...args: unknown[]) => {
                    (lintrk.q ??= []).push(args);
                };
                lintrk.q = [];
                win.lintrk = lintrk;
                injectScriptOnce('linkedin-insight-script', 'https://snap.licdn.com/li.lms-analytics/insight.min.js');
            }
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            const conversionId = payload['conversion_id'];
            (window as any).lintrk?.('track', conversionId !== undefined ? { conversion_id: conversionId } : { conversion_id: eventName });
        },
    },

    reddit: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            if (!win.rdt) {
                const rdt: any = (...args: unknown[]) => {
                    rdt.sendEvent ? rdt.sendEvent(...args) : (rdt.callQueue ??= []).push(args);
                };
                rdt.callQueue = [];
                win.rdt = rdt;
                injectScriptOnce('reddit-pixel-script', 'https://www.redditstatic.com/ads/pixel.js');
            }

            win.rdt('init', pixelId);
            win.rdt('track', 'PageVisit');
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            (window as any).rdt?.('track', eventName, payload);
        },
    },

    twitter: {
        init(pixelId: string): void {
            if (typeof window === 'undefined') {
                return;
            }
            const win = window as any;
            if (!win.twq) {
                const twq: any = (...args: unknown[]) => {
                    twq.exe ? twq.exe(...args) : (twq.queue ??= []).push(args);
                };
                twq.version = '1.1';
                twq.queue = [];
                win.twq = twq;
                injectScriptOnce('twitter-pixel-script', 'https://static.ads-twitter.com/uwt.js');
            }

            win.twq('config', pixelId);
        },
        track(_pixelId: string, eventName: string, payload: Record<string, unknown>): void {
            if (typeof window === 'undefined') {
                return;
            }
            (window as any).twq?.('event', eventName, payload);
        },
    },
};

function getPackagePixelVendor(vendor: string | null | undefined): PackagePixelVendorDefinition | null {
    if (vendor === null || vendor === undefined || !(PACKAGE_PIXEL_VENDOR_KEYS as readonly string[]).includes(vendor)) {
        return null;
    }

    return PACKAGE_PIXEL_VENDORS[vendor as PackagePixelVendorKey];
}

/**
 * Per-block survey-form provider that fans block-level events out to each
 * merchant-configured custom browser pixel (TikTok, Snapchat, …). Mirrors the
 * host app's AnalyticsManager.fireCustomPixels(): each instance resolves its
 * own `pixel:{id}` mapping, which is DEFAULT-DISABLED, so an event only fires
 * when the merchant explicitly enabled that action's mapping. The payload is
 * built with the SAME mapping transforms (drop/hash/rename) the backend
 * resolver and host AnalyticsManager apply.
 */
export class CustomPixelProvider implements AnalyticsProvider {
    name = 'CustomPixel';
    private initialized = false;
    private pixels: CustomPixelInstance[] = [];
    private debug = false;
    private sessionId?: string;
    private userId?: string;
    private eventMappings?: AnalyticsEventMappings;

    async initialize(config: {
        pixels: CustomPixelInstance[];
        debug?: boolean;
        sessionId?: string;
        userId?: string;
        eventMappings?: AnalyticsEventMappings;
    }): Promise<void> {
        this.pixels = config.pixels ?? [];
        this.debug = config.debug || false;
        this.sessionId = config.sessionId;
        this.userId = config.userId;
        this.eventMappings = config.eventMappings;

        if (typeof window === 'undefined') {
            return;
        }

        for (const pixel of this.pixels) {
            const vendor = getPackagePixelVendor(pixel.vendor);
            if (vendor === null || !pixel.pixel_id) {
                continue;
            }
            vendor.init(pixel.pixel_id);
        }

        this.initialized = true;

        if (this.debug) {
            console.log('[CustomPixel] Initialized pixels:', this.pixels);
        }
    }

    trackEvent(event: SurveyAnalyticsEvent): void {
        if (!this.initialized || typeof window === 'undefined' || this.pixels.length === 0) {
            return;
        }

        for (const pixel of this.pixels) {
            const vendor = getPackagePixelVendor(pixel.vendor);
            if (vendor === null || !pixel.pixel_id || !pixel.key) {
                continue;
            }

            const mapping = this.eventMappings?.events?.[event.action]?.[pixel.key];

            // Dynamic pixel channels are default-disabled server-side; fire only
            // when the merchant explicitly enabled this action's mapping.
            if (!mapping?.name || mapping.enabled !== true) {
                continue;
            }

            const payload = this.buildPayload(event, mapping, pixel.key);
            vendor.track(pixel.pixel_id, mapping.name, payload);

            if (this.debug) {
                console.log('[CustomPixel] Event tracked:', pixel.vendor, mapping.name, payload);
            }
        }
    }

    private buildPayload(event: SurveyAnalyticsEvent, mapping: AnalyticsChannelMapping, channelKey: string): Record<string, unknown> {
        const rawData: Record<string, unknown> = {
            category: event.category,
            action: event.action,
            label: event.label,
            value: event.value,
            session_id: event.sessionId || this.sessionId,
            user_id: event.userId || this.userId,
            survey_id: event.surveyId,
            timestamp: event.timestamp || Date.now(),
            ...(event.metadata ?? {}),
        };

        Object.keys(rawData).forEach((key) => rawData[key] === undefined && delete rawData[key]);

        return buildMappedAnalyticsPayload(
            rawData,
            mapping,
            this.eventMappings?.global_drop_keys?.[channelKey] ?? [],
            this.eventMappings?.global_hash_keys?.[channelKey] ?? [],
        );
    }

    trackPageView(_url: string, _title?: string, _additionalData?: Record<string, any>): void {
        // Page views are handled by the host AnalyticsManager's fireCustomPixels;
        // the per-block provider only fans out survey block-level events.
    }

    trackTiming(_category: string, _variable: string, _value: number, _label?: string): void {
        // No-op: timing events are not fanned out to custom pixels.
    }

    setUserProperties(properties: Record<string, any>): void {
        if (properties.user_id) {
            this.userId = properties.user_id;
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    destroy(): void {
        this.initialized = false;
        if (this.debug) {
            console.log('[CustomPixel] Provider destroyed');
        }
    }
}
