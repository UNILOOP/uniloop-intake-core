export interface DiffSegment {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

const tokenize = (text: string): string[] => text.split(/(\s+)/).filter((token) => token.length > 0);

/** Word-level difference between two texts, as segments to colour. */
export function diffWords(before: string, after: string): DiffSegment[] {
  if (before === after) return before ? [{ type: 'equal', text: before }] : [];
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > 250000) {
    return [
      ...(before ? [{ type: 'removed' as const, text: before }] : []),
      ...(after ? [{ type: 'added' as const, text: after }] : []),
    ];
  }
  const table: Uint32Array[] = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('equal', a[i]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', a[i]);
      i += 1;
    } else {
      push('added', b[j]);
      j += 1;
    }
  }
  while (i < a.length) push('removed', a[i++]);
  while (j < b.length) push('added', b[j++]);
  return segments;
}
