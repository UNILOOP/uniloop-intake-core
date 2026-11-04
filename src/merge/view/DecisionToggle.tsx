import { Check, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MergeHunk, MergeSide } from '../types';
import { useMergeActions } from './MergeContext';

/** Keep the current side or use the incoming one for a hunk; a locked hunk shows its lock instead. */
export const DecisionToggle = ({ hunk }: { hunk: MergeHunk; compact?: boolean }) => {
  const { decide, labels, readOnly, resolve } = useMergeActions();
  const side = resolve(hunk);
  if (hunk.locked) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        title={`Locked by the provider: this always follows ${labels.incoming}`}
      >
        <Lock className="h-3 w-3" /> Follows {labels.incoming}
      </span>
    );
  }
  const option = (value: MergeSide, text: string) => {
    const active = side === value;
    const explanation =
      value === 'current'
        ? `Leave this setting as it is in ${labels.current}. Nothing changes.`
        : `Replace this setting with the version from ${labels.incoming}.`;
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${value === 'current' ? 'Keep' : 'Use'} for ${hunk.label}`}
        title={explanation}
        disabled={readOnly}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed',
          active
            ? value === 'incoming'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
        )}
        onClick={() => decide(hunk.id, value)}
      >
        {active && <Check className="h-3 w-3" />}
        {text}
      </button>
    );
  };
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {option('current', 'Keep yours')}
      {option('incoming', `Use ${labels.incoming}`)}
    </div>
  );
};
