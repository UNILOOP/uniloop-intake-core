/**
 * A navigation or visibility condition can combine several conditions that all
 * have to match. Each one is wrapped in parentheses and joined with `&&`, so a
 * single condition that uses `&&` itself (like "between") stays one condition.
 */

/** Joins conditions that all have to match into one expression */
export function joinConditions(conditions: string[]): string {
  const parts = conditions.map(condition => condition.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.map(part => `(${part})`).join(' && ');
}

/**
 * Splits an expression made by `joinConditions` back into its conditions. Anything
 * else comes back as one condition.
 */
export function splitConditions(condition: string): string[] {
  const trimmed = condition.trim();
  if (!trimmed.startsWith('(')) return [trimmed];

  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = -1;
  let i = 0;
  while (i < trimmed.length) {
    const char = trimmed[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth < 0) return [trimmed];
      if (depth === 0) {
        parts.push(trimmed.slice(start, i).trim());
        // Between groups only ` && ` may follow
        const rest = trimmed.slice(i + 1);
        const joiner = rest.match(/^\s*&&\s*/);
        if (rest.trim() === '') break;
        if (!joiner || rest[joiner[0].length] !== '(') return [trimmed];
        i += joiner[0].length;
      }
    } else if (depth === 0) {
      return [trimmed];
    }
    i++;
  }

  if (depth !== 0 || quote || parts.length < 2) return [trimmed];
  return parts;
}
