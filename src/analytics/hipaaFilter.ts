/**
 * Browser mirror of App\Services\Analytics\HipaaDataFilter::filterOutgoingPayload().
 *
 * Applied to a MAPPED payload (after renames, drops and hashing), so keys are
 * judged by their final names: a merchant who renames `patient_email` to `em`
 * keeps the value, while any key whose name still looks like PII/PHI is
 * removed — recursively, so nested traits such as `properties.email` go too.
 * `user_id` is removed at the top level to match the server.
 *
 * HIPAA_SENSITIVE_FIELDS must stay identical to HipaaDataFilter::SENSITIVE_FIELDS;
 * tests/Unit/Analytics/HipaaFilterFrontendParityTest.php enforces it.
 */
export const HIPAA_SENSITIVE_FIELDS: readonly string[] = [
    // Direct identifiers
    'email',
    'phone',
    'phone_number',
    'mobile',
    'first_name',
    'last_name',
    'full_name',
    'name',
    'address',
    'line1',
    'line2',
    'street',
    'city',
    'zip',
    'postal_code',
    'ssn',
    'social_security',
    'date_of_birth',
    'dob',
    'birthdate',
    'birth_date',

    // Medical information
    'medical_history',
    'diagnosis',
    'medication',
    'prescription',
    'symptoms',
    'condition',
    'treatment',
    'health_info',

    // Financial information
    'card_number',
    'credit_card',
    'account_number',
    'routing_number',
    'bank_account',

    // Auth/sensitive data
    'password',
    'token',
    'access_token',
    'api_key',
    'secret',
];

/** True when the key name contains any sensitive fragment (case-insensitive substring match, like the server). */
export function isHipaaSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return HIPAA_SENSITIVE_FIELDS.some((fragment) => lower.includes(fragment));
}

/**
 * Remove PII/PHI-looking keys from a mapped payload, recursively. Returns a
 * new object; the input is not mutated. `protectedKeys` are never removed
 * (envelope keys a caller must keep, e.g. GTM's `event`).
 */
export function filterHipaaPayload(payload: Record<string, unknown>, protectedKeys: readonly string[] = []): Record<string, unknown> {
    const protectedSet = new Set(protectedKeys);
    const filtered = filterRecord(payload, protectedSet);

    if (!protectedSet.has('user_id')) {
        delete filtered.user_id;
    }

    return filtered;
}

function filterRecord(record: Record<string, unknown>, protectedSet: Set<string>, nested = false): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        if (!(protectedSet.has(key) && !nested) && isHipaaSensitiveKey(key)) {
            continue;
        }

        out[key] = isRecord(value) ? filterRecord(value, protectedSet, true) : value;
    }

    return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
