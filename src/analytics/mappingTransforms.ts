import type { AnalyticsChannelMapping } from './types';

function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
}

function sha256(value: unknown): string {
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

export function buildMappedAnalyticsPayload(
    payload: Record<string, unknown>,
    mapping: AnalyticsChannelMapping | undefined,
    globalDrops: string[] = [],
    globalHashes: string[] = [],
    protectedKeys: string[] = [],
): Record<string, unknown> {
    const fieldMap = mapping?.field_map ?? {};
    const out = clonePayload(payload);
    const protectedSet = new Set(protectedKeys);
    const dropSet = new Set<string>([...(mapping?.drop_keys ?? []), ...globalDrops]);

    for (const key of dropSet) {
        if (!protectedSet.has(key)) {
            removeValue(out, key);
        }
    }

    for (const [sourceKey, outputKey] of Object.entries(fieldMap)) {
        if (!outputKey || protectedSet.has(sourceKey) || isDroppedSource(sourceKey, dropSet)) {
            continue;
        }
        const value = getValue(payload, sourceKey);
        if (!value.exists) {
            continue;
        }
        removeValue(out, sourceKey);
        out[outputKey] = value.value;
    }

    pruneEmptyContainers(out);

    for (const key of [...(mapping?.hash_keys ?? []), ...globalHashes]) {
        const targetKey = fieldMap[key] || key;
        if (!protectedSet.has(targetKey)) {
            hashValueAt(out, targetKey);
        }
    }

    Object.assign(out, mapping?.extra_fields ?? {});

    return out;
}

function clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
    if (typeof structuredClone === 'function') {
        return structuredClone(payload);
    }

    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function getValue(payload: Record<string, unknown>, key: string): { exists: boolean; value?: unknown } {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
        return { exists: true, value: payload[key] };
    }

    const segments = key.split('.');
    let current: unknown = payload;
    for (const segment of segments) {
        if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
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
        if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return null;
        }
        current = current[segment];
    }

    const leaf = segments[segments.length - 1];
    return isRecord(current) && leaf ? { record: current, leaf } : null;
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

function isDroppedSource(sourceKey: string, dropSet: Set<string>): boolean {
    if (dropSet.has(sourceKey)) {
        return true;
    }

    const segments = sourceKey.split('.');
    while (segments.length > 1) {
        segments.pop();
        if (dropSet.has(segments.join('.'))) {
            return true;
        }
    }

    return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
