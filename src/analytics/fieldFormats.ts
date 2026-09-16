/**
 * Field-map entry normalisation + standard value formats, shared by the survey
 * package providers, the host app's AnalyticsManager (lib/analytics.ts) and
 * the Event Mapping editor. Pure and dependency-free so this package stays
 * standalone; the host re-exports it from resources/js/lib/analyticsFieldFormats.ts.
 *
 * Mirrors the PHP pair App\Services\Analytics\Support\FieldMapEntry and
 * App\Services\Analytics\Support\FieldValueFormatter — the backend parity test
 * (FieldFormatFrontendParityTest) runs both over the same fixtures and checks
 * FIELD_VALUE_TYPE_CATALOG against the PHP enum. Any change here must be made
 * there too.
 *
 * Contract: a value the formatter cannot parse is returned UNCHANGED.
 *
 * Temporal rules (shared with PHP):
 *  - numbers are Unix timestamps — seconds, or milliseconds above 10^10;
 *  - `YYYY-MM-DD[ T]HH:MM[:SS[.fff]][Z|±HH:MM]` (also `/` separators);
 *  - `MM/DD/YYYY[ HH:MM[:SS]][ AM|PM]` (US order; also `-` separators);
 *  - `HH:MM[:SS][ AM|PM]` for the time type;
 *  - inputs without a zone are read as UTC; timestamps are rendered in UTC.
 * Phone rules assume a US default country code (+1) for 10-digit numbers.
 */

export const FIELD_VALUE_TYPES = ['phone', 'date', 'time', 'datetime', 'number', 'boolean', 'text', 'email'] as const;

export type FieldValueType = (typeof FIELD_VALUE_TYPES)[number];

export interface FieldFormatOption {
    id: string;
    label: string;
    /** Example output shown next to the option so merchants can pick by eye. */
    example: string;
}

export interface FieldValueTypeDescriptor {
    id: FieldValueType;
    label: string;
    formats: FieldFormatOption[];
}

/**
 * The full catalog, in the order the editor lists it. The first format of
 * each type is the default the editor picks when the type is chosen. Format
 * ids must match AnalyticsFieldValueType::formats() on the backend.
 */
export const FIELD_VALUE_TYPE_CATALOG: readonly FieldValueTypeDescriptor[] = [
    {
        id: 'phone',
        label: 'Phone number',
        formats: [
            { id: 'e164', label: 'E.164', example: '+14155551234' },
            { id: 'digits', label: 'Digits only', example: '14155551234' },
            { id: 'national', label: 'National (US)', example: '(415) 555-1234' },
            { id: 'national_digits', label: 'National digits', example: '4155551234' },
        ],
    },
    {
        id: 'date',
        label: 'Date',
        formats: [
            { id: 'iso', label: 'ISO 8601', example: '2024-01-05' },
            { id: 'us', label: 'US', example: '01/05/2024' },
            { id: 'eu', label: 'Day first', example: '05/01/2024' },
            { id: 'unix', label: 'Unix seconds', example: '1704412800' },
            { id: 'unix_ms', label: 'Unix milliseconds', example: '1704412800000' },
        ],
    },
    {
        id: 'time',
        label: 'Time',
        formats: [
            { id: '24h', label: '24-hour', example: '14:05' },
            { id: '24h_seconds', label: '24-hour with seconds', example: '14:05:30' },
            { id: '12h', label: '12-hour', example: '2:05 PM' },
        ],
    },
    {
        id: 'datetime',
        label: 'Date & time',
        formats: [
            { id: 'iso8601', label: 'ISO 8601 (UTC)', example: '2024-01-05T14:05:30Z' },
            { id: 'unix', label: 'Unix seconds', example: '1704463530' },
            { id: 'unix_ms', label: 'Unix milliseconds', example: '1704463530000' },
            { id: 'us', label: 'US', example: '01/05/2024 14:05:30' },
        ],
    },
    {
        id: 'number',
        label: 'Number',
        formats: [
            { id: 'integer', label: 'Integer', example: '100' },
            { id: 'float', label: 'Decimal', example: '99.5' },
            { id: 'fixed_2', label: 'Two decimals (text)', example: '99.50' },
            { id: 'cents_to_units', label: 'Cents → units', example: '9950 → 99.5' },
            { id: 'units_to_cents', label: 'Units → cents', example: '99.5 → 9950' },
        ],
    },
    {
        id: 'boolean',
        label: 'Boolean',
        formats: [
            { id: 'true_false', label: 'true / false', example: 'true' },
            { id: 'one_zero', label: '1 / 0', example: '1' },
            { id: 'yes_no', label: 'yes / no', example: 'yes' },
        ],
    },
    {
        id: 'text',
        label: 'Text',
        formats: [
            { id: 'trim', label: 'Trimmed', example: 'Jane' },
            { id: 'lowercase', label: 'Lowercase', example: 'jane' },
            { id: 'uppercase', label: 'Uppercase', example: 'JANE' },
        ],
    },
    {
        id: 'email',
        label: 'Email',
        formats: [
            { id: 'normalized', label: 'Normalised', example: 'jane@example.com' },
            { id: 'domain', label: 'Domain only', example: 'example.com' },
        ],
    },
];

for (const descriptor of FIELD_VALUE_TYPE_CATALOG) {
    descriptor.formats.push({ id: 'hashed', label: 'Hashed (SHA-256)', example: 'trim + lowercase → SHA-256' });
}

const CATALOG_BY_TYPE: Record<string, FieldValueTypeDescriptor> = Object.fromEntries(
    FIELD_VALUE_TYPE_CATALOG.map((descriptor) => [descriptor.id, descriptor]),
);

export function isFieldValueType(value: unknown): value is FieldValueType {
    return typeof value === 'string' && value in CATALOG_BY_TYPE;
}

export function isValidFieldFormat(type: unknown, format: unknown): boolean {
    if (!isFieldValueType(type) || typeof format !== 'string') return false;
    return CATALOG_BY_TYPE[type].formats.some((option) => option.id === format);
}

export function formatsForType(type: FieldValueType): FieldFormatOption[] {
    return CATALOG_BY_TYPE[type]?.formats ?? [];
}

/** Data-layer level: 0 = top of the envelope (next to `event`), 1 = nested (the default). */
export type FieldMapLevel = 0 | 1;

export const FIELD_MAP_LEVEL_ROOT: FieldMapLevel = 0;
export const FIELD_MAP_LEVEL_NESTED: FieldMapLevel = 1;

/**
 * The object form of a field_map value. The legacy string form is shorthand
 * for `{ to: string }`.
 */
export interface FieldMapEntry {
    to: string;
    level?: FieldMapLevel;
    type?: FieldValueType;
    format?: string;
}

export type FieldMapValue = string | FieldMapEntry;

export interface NormalizedFieldMapEntry {
    to: string;
    level: FieldMapLevel;
    type: FieldValueType | null;
    format: string | null;
}

/**
 * The object form of an extra_fields value. The legacy scalar/object form is
 * shorthand for a nested static value; use this wrapper when a static key needs
 * to be hoisted to the channel envelope.
 */
export interface ExtraFieldEntry {
    value: unknown;
    level?: FieldMapLevel;
}

export type JsonLikeValue = string | number | boolean | null | JsonLikeValue[] | { [key: string]: JsonLikeValue };

export type ExtraFieldValue = JsonLikeValue | ExtraFieldEntry;

export interface NormalizedExtraFieldEntry {
    value: unknown;
    level: FieldMapLevel;
}

/**
 * Normalise a raw field_map value. Returns null when no output key can be
 * produced (blank strings, malformed objects), which callers treat as "skip".
 * Unknown types/formats are ignored rather than rejected so a stale mapping
 * still renames the key; the validators are where bad ids are refused.
 * Mirrors FieldMapEntry::fromRaw() in PHP.
 */
export function normalizeFieldMapEntry(raw: unknown): NormalizedFieldMapEntry | null {
    if (typeof raw === 'string') {
        return !isValidOutputPath(raw) ? null : { to: raw, level: FIELD_MAP_LEVEL_NESTED, type: null, format: null };
    }
    if (!isRecord(raw)) return null;

    const to = raw.to;
    if (typeof to !== 'string' || !isValidOutputPath(to)) return null;

    const level: FieldMapLevel = raw.level === 0 || raw.level === '0' ? FIELD_MAP_LEVEL_ROOT : FIELD_MAP_LEVEL_NESTED;
    const hasFormat = isFieldValueType(raw.type) && isValidFieldFormat(raw.type, raw.format);

    return {
        to,
        level,
        type: hasFormat ? (raw.type as FieldValueType) : null,
        format: hasFormat ? (raw.format as string) : null,
    };
}

/**
 * Normalise a whole field_map keyed by canonical source key, dropping entries
 * that cannot be normalised. Mirrors FieldMapEntry::fromFieldMap() in PHP.
 */
export function normalizeFieldMap(fieldMap: Record<string, unknown> | undefined | null): Record<string, NormalizedFieldMapEntry> {
    const entries: Record<string, NormalizedFieldMapEntry> = {};
    for (const [sourceKey, raw] of Object.entries(fieldMap ?? {})) {
        if (sourceKey === '') continue;
        const entry = normalizeFieldMapEntry(raw);
        if (entry) entries[sourceKey] = entry;
    }
    return entries;
}

/**
 * Collapse a normalised entry back to the most compact stored form: the
 * legacy string when it is a plain rename, the object otherwise.
 */
export function serializeFieldMapEntry(entry: NormalizedFieldMapEntry): FieldMapValue {
    if (entry.level === FIELD_MAP_LEVEL_NESTED && entry.type === null) {
        return entry.to;
    }
    const out: FieldMapEntry = { to: entry.to };
    if (entry.level === FIELD_MAP_LEVEL_ROOT) out.level = FIELD_MAP_LEVEL_ROOT;
    if (entry.type !== null && entry.format !== null) {
        out.type = entry.type;
        out.format = entry.format;
    }
    return out;
}

/**
 * Normalise one extra_fields value. Unlike field_map entries, the object key is
 * already the output key, so the wrapper only carries the static value and the
 * requested data-layer level.
 */
export function normalizeExtraFieldEntry(raw: unknown): NormalizedExtraFieldEntry {
    if (isRecord(raw) && Object.prototype.hasOwnProperty.call(raw, 'value')) {
        return {
            value: raw.value,
            level: raw.level === 0 || raw.level === '0' ? FIELD_MAP_LEVEL_ROOT : FIELD_MAP_LEVEL_NESTED,
        };
    }

    return { value: raw, level: FIELD_MAP_LEVEL_NESTED };
}

/**
 * Normalise a whole extra_fields map keyed by outgoing static key.
 */
export function normalizeExtraFields(
    extraFields: Record<string, unknown> | undefined | null,
): Record<string, NormalizedExtraFieldEntry> {
    const entries: Record<string, NormalizedExtraFieldEntry> = {};
    for (const [key, raw] of Object.entries(extraFields ?? {})) {
        if (!isValidOutputPath(key)) continue;
        entries[key] = normalizeExtraFieldEntry(raw);
    }
    return entries;
}

/**
 * Collapse a normalised static field back to the compact legacy value unless
 * the merchant explicitly selected a non-default level.
 */
export function serializeExtraFieldEntry(entry: NormalizedExtraFieldEntry): ExtraFieldValue {
    if (entry.level === FIELD_MAP_LEVEL_NESTED) {
        return entry.value as ExtraFieldValue;
    }

    return { value: entry.value, level: FIELD_MAP_LEVEL_ROOT };
}

/**
 * Split a mapped (flat) payload into the keys that belong at data-layer level
 * 0 and the rest, according to the mapping's field_map and extra_fields
 * entries. Keys are only hoisted when they actually exist in the payload.
 */
export function splitRootLevelKeys(
    payload: Record<string, unknown>,
    fieldMap: Record<string, unknown> | undefined | null,
    extraFields?: Record<string, unknown> | undefined | null,
): { root: Record<string, unknown>; nested: Record<string, unknown> } {
    const rootKeys = new Set<string>();
    for (const entry of Object.values(normalizeFieldMap(fieldMap))) {
        if (entry.level === FIELD_MAP_LEVEL_ROOT) rootKeys.add(entry.to.split('.')[0]);
    }
    for (const [key, entry] of Object.entries(normalizeExtraFields(extraFields))) {
        if (entry.level === FIELD_MAP_LEVEL_ROOT) rootKeys.add(key.split('.')[0]);
    }

    const root: Record<string, unknown> = {};
    const nested: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        (rootKeys.has(key) ? root : nested)[key] = value;
    }
    return { root, nested };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const ISO_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?\s*(?:(Z)|([+-])(\d{2}):?(\d{2}))?)?$/i;
const US_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;
const MILLIS_THRESHOLD = 10_000_000_000;

interface TemporalParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    hasDate: boolean;
    hasTime: boolean;
}

/**
 * Format a value to the given type/format. Lists are formatted element-wise
 * so array-valued canonical keys (e.g. repeated url params) keep their shape.
 * Mirrors FieldValueFormatter::format() in PHP.
 */
export function formatFieldValue(value: unknown, type: FieldValueType, format: string): unknown {
    if (!isValidFieldFormat(type, format)) return value;

    if (Array.isArray(value)) {
        return value.map((item) => formatFieldValue(item, type, format));
    }

    if (format === 'hashed') {
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? sha256(value) : value;
    }

    let formatted: unknown;
    switch (type) {
        case 'phone':
            formatted = formatPhone(value, format);
            break;
        case 'date':
            formatted = formatDate(value, format);
            break;
        case 'time':
            formatted = formatTime(value, format);
            break;
        case 'datetime':
            formatted = formatDateTime(value, format);
            break;
        case 'number':
            formatted = formatNumber(value, format);
            break;
        case 'boolean':
            formatted = formatBoolean(value, format);
            break;
        case 'text':
            formatted = formatText(value, format);
            break;
        case 'email':
            formatted = formatEmail(value, format);
            break;
    }

    return formatted === null || formatted === undefined ? value : formatted;
}

function formatPhone(value: unknown, format: string): string | null {
    const raw = scalarToString(value);
    if (raw === null) return null;

    const digits = raw.replace(/\D+/g, '');
    if (digits === '') return null;

    const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

    switch (format) {
        case 'e164':
            return raw.trim().startsWith('+') || digits.length !== 10 ? `+${digits}` : `+1${digits}`;
        case 'digits':
            return digits;
        case 'national_digits':
            return national;
        case 'national':
            return national.length === 10 ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}` : national;
        default:
            return null;
    }
}

function formatDate(value: unknown, format: string): string | number | null {
    const parts = parseTemporal(value);
    if (!parts || !parts.hasDate) return null;

    switch (format) {
        case 'iso':
            return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
        case 'us':
            return `${pad(parts.month)}/${pad(parts.day)}/${pad(parts.year, 4)}`;
        case 'eu':
            return `${pad(parts.day)}/${pad(parts.month)}/${pad(parts.year, 4)}`;
        case 'unix':
            return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 1000);
        case 'unix_ms':
            return Date.UTC(parts.year, parts.month - 1, parts.day);
        default:
            return null;
    }
}

function formatTime(value: unknown, format: string): string | null {
    const parts = parseTemporal(value);
    if (!parts || !parts.hasTime) return null;

    switch (format) {
        case '24h':
            return `${pad(parts.hour)}:${pad(parts.minute)}`;
        case '24h_seconds':
            return `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
        case '12h': {
            const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
            return `${hour12}:${pad(parts.minute)} ${parts.hour < 12 ? 'AM' : 'PM'}`;
        }
        default:
            return null;
    }
}

function formatDateTime(value: unknown, format: string): string | number | null {
    const parts = parseTemporal(value);
    if (!parts || !parts.hasDate) return null;

    const epochSeconds = Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) / 1000);

    switch (format) {
        case 'iso8601':
            return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}Z`;
        case 'unix':
            return epochSeconds;
        case 'unix_ms':
            return epochSeconds * 1000 + parts.millisecond;
        case 'us':
            return `${pad(parts.month)}/${pad(parts.day)}/${pad(parts.year, 4)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
        default:
            return null;
    }
}

function formatNumber(value: unknown, format: string): string | number | null {
    const number = parseNumber(value);
    if (number === null) return null;

    switch (format) {
        case 'integer':
            return roundHalfAwayFromZero(number);
        case 'float':
            return number;
        case 'fixed_2':
            return roundTo(number, 2).toFixed(2);
        case 'cents_to_units':
            return roundTo(number / 100, 2);
        case 'units_to_cents':
            return roundHalfAwayFromZero(shiftDecimal(number, 2));
        default:
            return null;
    }
}

function formatBoolean(value: unknown, format: string): boolean | number | string | null {
    const bool = parseBoolean(value);
    if (bool === null) return null;

    switch (format) {
        case 'true_false':
            return bool;
        case 'one_zero':
            return bool ? 1 : 0;
        case 'yes_no':
            return bool ? 'yes' : 'no';
        default:
            return null;
    }
}

function formatText(value: unknown, format: string): string | null {
    const text = scalarToString(value);
    if (text === null) return null;

    switch (format) {
        case 'trim':
            return text.trim();
        case 'lowercase':
            return text.toLowerCase();
        case 'uppercase':
            return text.toUpperCase();
        default:
            return null;
    }
}

function formatEmail(value: unknown, format: string): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    switch (format) {
        case 'normalized':
            return normalized;
        case 'domain':
            return normalized.includes('@') ? normalized.slice(normalized.lastIndexOf('@') + 1) : null;
        default:
            return null;
    }
}

/**
 * Strings and numbers become strings; booleans, null and containers do not
 * (PHP and JS stringify booleans differently, so they are left alone).
 */
function scalarToString(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
}

function parseNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;

    const clean = value.trim().replace(/[^0-9.-]/g, '');
    if (!NUMERIC_PATTERN.test(clean)) return null;

    return Number(clean);
}

function parseBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
        return null;
    }
    if (typeof value !== 'string') return null;

    switch (value.trim().toLowerCase()) {
        case '1':
        case 'true':
        case 'yes':
        case 'y':
        case 'on':
            return true;
        case '0':
        case 'false':
        case 'no':
        case 'n':
        case 'off':
        case '':
            return false;
        default:
            return null;
    }
}

/** Round half away from zero, like PHP's round(). */
function roundHalfAwayFromZero(value: number): number {
    const rounded = Math.round(Math.abs(value));
    return value < 0 ? -rounded : rounded;
}

/**
 * Multiply by 10^places using the decimal string representation so 1.005
 * becomes 100.5 rather than 100.49999999999999 — keeps rounding aligned with
 * PHP's decimal-aware round().
 */
function shiftDecimal(value: number, places: number): number {
    const text = String(value);
    if (text.includes('e') || text.includes('E')) {
        return value * 10 ** places;
    }
    return Number(`${text}e${places}`);
}

function roundTo(value: number, places: number): number {
    const shifted = roundHalfAwayFromZero(shiftDecimal(value, places));
    return Number(`${shifted}e-${places}`);
}

function pad(value: number, width = 2): string {
    return String(value).padStart(width, '0');
}

/** Parse a temporal value into UTC calendar components. */
function parseTemporal(value: unknown): TemporalParts | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? partsFromTimestamp(value) : null;
    }
    if (typeof value !== 'string') return null;

    const text = value.trim();
    if (text === '') return null;

    if (NUMERIC_PATTERN.test(text)) {
        return partsFromTimestamp(Number(text));
    }

    const iso = ISO_PATTERN.exec(text);
    if (iso) {
        const hasTime = Boolean(iso[4]);
        const millisecond = iso[7] ? Number(iso[7].padEnd(3, '0').slice(0, 3)) : 0;
        const parts = buildParts(
            Number(iso[1]),
            Number(iso[2]),
            Number(iso[3]),
            hasTime ? Number(iso[4]) : 0,
            hasTime ? Number(iso[5]) : 0,
            iso[6] ? Number(iso[6]) : 0,
            millisecond,
            true,
            hasTime,
        );
        if (!parts) return null;

        if (iso[9]) {
            const offsetSeconds = (Number(iso[10]) * 3600 + Number(iso[11]) * 60) * (iso[9] === '-' ? -1 : 1);
            const epoch = Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) / 1000) - offsetSeconds;
            return partsFromTimestamp(epoch, millisecond);
        }

        return parts;
    }

    const us = US_PATTERN.exec(text);
    if (us) {
        const hasTime = Boolean(us[4]);
        const hour = hasTime ? to24Hour(Number(us[4]), us[7] ?? '') : 0;
        if (hour === null) return null;

        return buildParts(
            Number(us[3]),
            Number(us[1]),
            Number(us[2]),
            hour,
            hasTime ? Number(us[5]) : 0,
            us[6] ? Number(us[6]) : 0,
            0,
            true,
            hasTime,
        );
    }

    const time = TIME_PATTERN.exec(text);
    if (time) {
        const hour = to24Hour(Number(time[1]), time[4] ?? '');
        if (hour === null) return null;

        return buildParts(1970, 1, 1, hour, Number(time[2]), time[3] ? Number(time[3]) : 0, 0, false, true);
    }

    return null;
}

/** Resolve a clock hour with an optional AM/PM marker to 0–23, or null when out of range. */
function to24Hour(hour: number, meridiem: string): number | null {
    const marker = meridiem.toUpperCase();
    if (marker === '') return hour <= 23 ? hour : null;
    if (hour < 1 || hour > 12) return null;
    if (marker === 'AM') return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
}

function buildParts(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
    hasDate: boolean,
    hasTime: boolean,
): TemporalParts | null {
    const probe = new Date(Date.UTC(year, month - 1, day));
    const validDate = year >= 1 && probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
    if (!validDate || hour > 23 || minute > 59 || second > 59) return null;

    return { year, month, day, hour, minute, second, millisecond, hasDate, hasTime };
}

function partsFromTimestamp(timestamp: number, millisecond: number | null = null): TemporalParts | null {
    let seconds = timestamp;
    let millis = millisecond;
    if (Math.abs(timestamp) >= MILLIS_THRESHOLD) {
        const whole = Math.floor(timestamp);
        millis = millis ?? Math.abs(whole) % 1000;
        seconds = Math.trunc(whole / 1000);
    }

    const date = new Date(Math.floor(seconds) * 1000);
    if (Number.isNaN(date.getTime())) return null;

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        millisecond: millis ?? 0,
        hasDate: true,
        hasTime: true,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
}

export function sha256(value: unknown): string {
    const input = new TextEncoder().encode(String(value).trim().toLowerCase());
    const bitLength = input.length * 8;
    const withOne = new Uint8Array(input.length + 1);
    withOne.set(input);
    withOne[input.length] = 0x80;

    const paddedLength = Math.ceil((withOne.length + 8) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(withOne);
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 4, bitLength, false);

    const constants = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const words = new Array<number>(64);

    for (let offset = 0; offset < padded.length; offset += 64) {
        for (let i = 0; i < 16; i++) {
            words[i] = view.getUint32(offset + i * 4, false);
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
            const s1 = rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
            words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = hash;
        for (let i = 0; i < 64; i++) {
            const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + s1 + ch + constants[i] + words[i]) >>> 0;
            const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (s0 + maj) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        hash[0] = (hash[0] + a) >>> 0;
        hash[1] = (hash[1] + b) >>> 0;
        hash[2] = (hash[2] + c) >>> 0;
        hash[3] = (hash[3] + d) >>> 0;
        hash[4] = (hash[4] + e) >>> 0;
        hash[5] = (hash[5] + f) >>> 0;
        hash[6] = (hash[6] + g) >>> 0;
        hash[7] = (hash[7] + h) >>> 0;
    }

    return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

/** Destination paths create objects; zero-based numeric segments create arrays. */
export function isValidOutputPath(path: string): boolean {
    return path.split('.').every((segment) => segment !== '' && !['__proto__', 'prototype', 'constructor'].includes(segment));
}

export function setOutputPath(payload: Record<string, unknown>, path: string, value: unknown): void {
    if (!isValidOutputPath(path)) return;
    const segments = path.split('.');
    let current = payload;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (!Object.prototype.hasOwnProperty.call(current, segment) || typeof current[segment] !== 'object' || current[segment] === null) {
            current[segment] = /^(0|[1-9][0-9]*)$/.test(segments[index + 1]) ? [] : {};
        }
        current = current[segment] as Record<string, unknown>;
    }
    current[segments[segments.length - 1]] = value;
}
