const monetaryActions = new Set([
    'checkout_view',
    'checkout_started',
    'checkout_completed',
    'payment_authorized',
    'order_placed',
    'first_time_order',
    'enrollment_complete',
    'emr_enrollment_created',
]);

export function pixelEventProtectionActive(): boolean {
    return typeof window !== 'undefined' && (window as Window & { UNILOOP_PIXEL_REQUIRED?: boolean }).UNILOOP_PIXEL_REQUIRED === true;
}

/** Keep structural journey facts; form responses and patient profiles never become marketing payloads. */
export function pixelSafeMetadata(metadata?: Record<string, unknown>, monetary = false): Record<string, unknown> {
    if (!pixelEventProtectionActive()) return metadata ?? {};
    const safe: Record<string, unknown> = {};
    const fields = [
        'page_index',
        'pageIndex',
        'page_number',
        'pageNumber',
        'total_pages',
        'totalPages',
        'current_page',
        'currentPage',
        'completed_pages',
        'completedPages',
        'form_count',
        'formCount',
        'form_index',
        'formIndex',
        'total_forms',
        'totalForms',
        'block_index',
        'blockIndex',
        'total_blocks',
        'totalBlocks',
        'completion_time_ms',
        'completionTime',
        'time_spent_ms',
        'timeOnPage',
    ];
    for (const key of fields) {
        const value = metadata?.[key];
        const maximum = /time|Time/.test(key) ? 604800000 : 10000;
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum) safe[key] = value;
    }
    if (monetary) {
        if (typeof metadata?.currency === 'string' && /^[A-Za-z]{3}$/.test(metadata.currency)) safe.currency = metadata.currency.toUpperCase();
        for (const key of ['amount', 'total', 'value']) {
            const value = metadata?.[key];
            if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99999999.99) safe[key] = value;
        }
    }
    return safe;
}

export function pixelSafeEvent<T extends { action: string; value?: unknown; metadata?: Record<string, unknown> }>(event: T): T {
    if (!pixelEventProtectionActive()) return event;
    const safe = { ...event, metadata: pixelSafeMetadata(event.metadata, monetaryActions.has(event.action)) };
    for (const key of ['label', 'user_id', 'userId', 'responses', 'properties']) delete (safe as Record<string, unknown>)[key];
    if (
        !monetaryActions.has(event.action) ||
        typeof safe.value !== 'number' ||
        !Number.isFinite(safe.value) ||
        safe.value < 0 ||
        safe.value > 99999999.99
    )
        delete safe.value;
    return safe;
}

export function pixelInternalMetadata(original: Record<string, unknown> | undefined, safe: Record<string, unknown>): Record<string, unknown> {
    if (!pixelEventProtectionActive()) return original ?? {};
    const internal = { ...safe };
    for (const key of ['treatment_id', 'enrollment_id']) {
        const value = original?.[key];
        if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) internal[key] = value;
    }
    return internal;
}
