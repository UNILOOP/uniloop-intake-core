import { cn } from '../../lib/utils';
import { optionList } from '../describe';
import type { BlockData } from '../../types';
import { isPlainObject, stripHtml } from '../utils';

/** A value of a block setting, readable: text as text, options as chips, anything else as JSON. */
export const ValueView = ({ value, className, options }: { value: unknown; className?: string; options?: boolean }) => {
  if (value === undefined || value === null || value === '') return <span className={cn('text-slate-400', className)}>—</span>;
  if (options && isPlainObject(value)) {
    const list = optionList(value as BlockData);
    if (list.length) {
      const seen = new Map<string, number>();
      const keyOf = (value: string) => {
        const count = seen.get(value) ?? 0;
        seen.set(value, count + 1);
        return count ? `${value}#${count}` : value;
      };
      return (
        <ul className={cn('flex flex-wrap gap-1', className)}>
          {list.map((option) => (
            <li key={keyOf(option.value)} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {option.label || option.value}
            </li>
          ))}
        </ul>
      );
    }
  }
  if (typeof value === 'boolean') return <span className={className}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'string') return <span className={cn('whitespace-pre-wrap break-words', className)}>{stripHtml(value)}</span>;
  if (typeof value === 'number') return <span className={className}>{value}</span>;
  return (
    <pre className={cn('max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200', className)}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};
