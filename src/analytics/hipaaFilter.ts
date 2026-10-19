/**
 * Browser mirror of App\Services\Analytics\HipaaDataFilter::filterOutgoingPayload().
 *
 * Applied to a MAPPED payload (after renames, drops and hashing), so keys are
 * judged by their final names. Exact output paths demonstrably hashed by the
 * mapping may be protected so vendor-required identifier names survive without
 * exposing unhashed neighbouring fields.
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
    'patient',
    'user_id',
    'gender',
    'sex',
    'height',
    'weight',

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
 * new object; the input is not mutated. `protectedPaths` may be root keys or
 * exact dot paths (envelope keys a caller must keep or outputs it hashed).
 */
export function filterHipaaPayload(payload: Record<string, unknown>, protectedPaths: readonly string[] = []): Record<string, unknown> {
    return filterRecord(payload, new Set(protectedPaths));
}

function filterRecord(record: Record<string, unknown>, protectedPaths: Set<string>, prefix = '', protectedOnly = false): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const isProtected = protectedPaths.has(path);
        const hasProtectedDescendant = [...protectedPaths].some((protectedPath) => protectedPath.startsWith(`${path}.`));

        if (protectedOnly && !isProtected && !hasProtectedDescendant) {
            continue;
        }

        if (isProtected) {
            out[key] = cloneValue(value);
            continue;
        }

        const isSensitive = isHipaaSensitiveKey(key);
        if (isSensitive && !hasProtectedDescendant) {
            continue;
        }

        if (Array.isArray(value)) {
            out[key] = value
                .map((item, index) => filterValue(item, protectedPaths, `${path}.${index}`, protectedOnly || isSensitive))
                .filter((item) => !isEmptyContainer(item));
        } else if (isRecord(value)) {
            out[key] = filterRecord(value, protectedPaths, path, protectedOnly || isSensitive);
        } else if (!isSensitive) {
            out[key] = value;
        }
    }

    return out;
}

function filterValue(value: unknown, protectedPaths: Set<string>, path: string, protectedOnly: boolean): unknown {
    if (protectedPaths.has(path)) {
        return cloneValue(value);
    }

    if (Array.isArray(value)) {
        return value
            .map((item, index) => filterValue(item, protectedPaths, `${path}.${index}`, protectedOnly))
            .filter((item) => !isEmptyContainer(item));
    }

    return isRecord(value) ? filterRecord(value, protectedPaths, path, protectedOnly) : value;
}

function cloneValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(cloneValue);
    }

    if (isRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
    }

    return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmptyContainer(value: unknown): boolean {
    return (Array.isArray(value) && value.length === 0) || (isRecord(value) && Object.keys(value).length === 0);
}
