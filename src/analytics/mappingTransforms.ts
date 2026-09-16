import type { AnalyticsChannelMapping } from './types';
import { FIELD_MAP_LEVEL_ROOT, formatFieldValue, normalizeExtraFields, normalizeFieldMap, sha256, setOutputPath } from './fieldFormats';
import { filterHipaaPayload } from './hipaaFilter';

export function buildMappedAnalyticsPayload(
    payload: Record<string, unknown>,
    mapping: AnalyticsChannelMapping | undefined,
    globalDrops: string[] = [],
    globalHashes: string[] = [],
    protectedKeys: string[] = [],
    hipaaFilter = false,
): Record<string, unknown> {
    // Mirrors App\Services\Analytics\EventMappingResolver::buildPayload():
    // rename/format → drop (matched on the post-rename keys) → hash → HIPAA
    // filter on the output keys (when the channel asks for it) → static
    // fields → level-0 keys first. A rename therefore wins over a drop or a
    // HIPAA rule that names its SOURCE key; only the output key is judged
    // afterwards. Entries carry the output key plus an optional value format;
    // whether a level-0 key is hoisted out of the flat object is up to the
    // caller (see splitRootLevelKeys), since only the caller knows its envelope.
    const entries = normalizeFieldMap(mapping?.field_map);
    const out = clonePayload(payload);
    const protectedSet = new Set(protectedKeys);
    const rootKeys = new Set<string>();

    for (const [sourceKey, entry] of Object.entries(entries)) {
        if (protectedSet.has(sourceKey)) {
            continue;
        }
        const value = getValue(payload, sourceKey);
        if (!value.exists) {
            continue;
        }
        removeValue(out, sourceKey);
        // Format runs on the raw canonical value, before hashing, so a hashed
        // phone/email is hashed in its normalised form — same as the server.
        setOutputPath(out, entry.to, clonePayload(entry.type && entry.format ? formatFieldValue(value.value, entry.type, entry.format) : value.value));
        if (entry.level === FIELD_MAP_LEVEL_ROOT) {
            rootKeys.add(entry.to.split('.')[0]);
        }
    }

    pruneEmptyContainers(out);

    const dropSet = new Set<string>([...(mapping?.drop_keys ?? []), ...globalDrops]);
    for (const key of dropSet) {
        if (!protectedSet.has(key)) {
            removeValue(out, key);
        }
    }

    pruneEmptyContainers(out);

    const hashedTargets = new Set(Object.values(entries).filter((entry) => entry.format === 'hashed').map((entry) => entry.to));
    for (const key of [...(mapping?.hash_keys ?? []), ...globalHashes]) {
        const targetKey = entries[key]?.to ?? key;
        if (!protectedSet.has(targetKey) && !hashedTargets.has(targetKey)) {
            hashedTargets.add(targetKey);
            hashValueAt(out, targetKey);
        }
    }

    // Static fields are merchant literals, never PHI, so they merge after the filter.
    const filtered = hipaaFilter ? filterHipaaPayload(out, protectedKeys) : out;

    for (const [key, entry] of Object.entries(normalizeExtraFields(mapping?.extra_fields))) {
        setOutputPath(filtered, key, clonePayload(entry.value));
        if (entry.level === FIELD_MAP_LEVEL_ROOT) {
            rootKeys.add(key.split('.')[0]);
        }
    }

    return orderRootKeysFirst(filtered, rootKeys);
}

/**
 * Level-0 keys lead the payload (same as the server), keeping their relative
 * order; everything else follows in its existing order.
 */
function orderRootKeysFirst(payload: Record<string, unknown>, rootKeys: Set<string>): Record<string, unknown> {
    if (rootKeys.size === 0) {
        return payload;
    }

    const ordered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (rootKeys.has(key)) {
            ordered[key] = value;
        }
    }
    for (const [key, value] of Object.entries(payload)) {
        if (!rootKeys.has(key)) {
            ordered[key] = value;
        }
    }

    return ordered;
}

function clonePayload<T>(payload: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(payload);
    }

    return payload === undefined ? payload : JSON.parse(JSON.stringify(payload)) as T;
}

function getValue(payload: Record<string, unknown>, key: string): { exists: boolean; value?: unknown } {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
        return { exists: true, value: payload[key] };
    }

    const segments = key.split('.');
    let current: unknown = payload;
    for (const segment of segments) {
        if (!isContainer(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return { exists: false };
        }
        current = current[segment];
    }

    return { exists: true, value: current };
}

function removeValue(payload: Record<string, unknown>, key: string): void {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
        delete payload[key];
        return;
    }

    const parent = parentFor(payload, key);
    if (!parent) {
        return;
    }

    delete parent.record[parent.leaf];
}

function hashValueAt(payload: Record<string, unknown>, key: string): void {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
        payload[key] = hashPayloadValue(payload[key]);
        return;
    }

    const parent = parentFor(payload, key);
    if (!parent || !Object.prototype.hasOwnProperty.call(parent.record, parent.leaf)) {
        return;
    }

    parent.record[parent.leaf] = hashPayloadValue(parent.record[parent.leaf]);
}

function parentFor(payload: Record<string, unknown>, key: string): { record: Record<string, unknown>; leaf: string } | null {
    const segments = key.split('.');
    let current: unknown = payload;
    for (const segment of segments.slice(0, -1)) {
        if (!isContainer(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return null;
        }
        current = current[segment];
    }

    const leaf = segments[segments.length - 1];
    return isContainer(current) && leaf ? { record: current, leaf } : null;
}

function hashPayloadValue(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => hashPayloadValue(item));
    }

    if (['string', 'number', 'boolean', 'bigint'].includes(typeof value)) {
        return sha256(value);
    }

    return value;
}

function pruneEmptyContainers(payload: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(payload)) {
        if (!isRecord(value)) {
            continue;
        }
        pruneEmptyContainers(value);
        if (Object.keys(value).length === 0) {
            delete payload[key];
        }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isContainer(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
