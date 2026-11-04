import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { diffWords } from '../textDiff';
import { stripHtml } from '../utils';

/** Two texts with their differing words marked. */
export const TextDiff = ({ before, after, className }: { before: unknown; after: unknown; className?: string }) => {
  const segments = useMemo(() => {
    const a = typeof before === 'string' ? stripHtml(before) : before == null ? '' : String(before);
    const b = typeof after === 'string' ? stripHtml(after) : after == null ? '' : String(after);
    return diffWords(a, b);
  }, [before, after]);
  if (segments.length === 0) return <span className={cn('text-slate-400', className)}>—</span>;
  let offset = 0;
  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {segments.map((segment) => {
        const key = `${segment.type}:${offset}`;
        offset += segment.text.length;
        if (segment.type === 'equal') return <span key={key}>{segment.text}</span>;
        if (segment.type === 'added') {
          return (
            <mark key={key} className="rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
              {segment.text}
            </mark>
          );
        }
        return (
          <del key={key} className="rounded bg-red-100 px-0.5 text-red-900 dark:bg-red-900/60 dark:text-red-100">
            {segment.text}
          </del>
        );
      })}
    </span>
  );
};
