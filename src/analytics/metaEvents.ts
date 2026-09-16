/**
 * Meta Pixel standard event names. Anything not in this set must be sent via
 * fbq('trackCustom', …) — fbevents.js drops non-standard names passed to
 * fbq('track', …) and logs a console warning.
 */
export const META_STANDARD_EVENTS = new Set<string>([
    'AddPaymentInfo',
    'AddToCart',
    'AddToWishlist',
    'CompleteRegistration',
    'Contact',
    'CustomizeProduct',
    'Donate',
    'FindLocation',
    'InitiateCheckout',
    'Lead',
    'PageView',
    'Purchase',
    'Schedule',
    'Search',
    'StartTrial',
    'SubmitApplication',
    'Subscribe',
    'ViewContent',
]);

