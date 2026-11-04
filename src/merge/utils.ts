/** JSON with sorted object keys and no undefined values, so equal data compares equal. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export const isEqual = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b);

export function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncate(text: string, length = 80): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

/** A short, readable rendering of any value for labels. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return truncate(stripHtml(value), 60);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  return truncate(JSON.stringify(value), 60);
}
