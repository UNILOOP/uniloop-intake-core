import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MergeHunk } from '../types';
import { DecisionToggle } from './DecisionToggle';
import { useMergeActions } from './MergeContext';
import { CATEGORY_ICON, ORIGIN_CLASSES, originText } from './status';
import { TextDiff } from './TextDiff';
import { ValueView } from './ValueView';

/** One change: what it is, who made it, and the decision. */
export const HunkRow = ({ hunk, showValues = false }: { hunk: MergeHunk; showValues?: boolean }) => {
  const { labels } = useMergeActions();
  const Icon = CATEGORY_ICON[hunk.category] ?? CATEGORY_ICON.settings;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2.5',
        hunk.conflict ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      )}
      data-hunk-id={hunk.id}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{hunk.label}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ORIGIN_CLASSES[hunk.origin])}>{originText(hunk.origin, labels)}</span>
          {hunk.conflict && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" /> Needs your decision
            </span>
          )}
        </div>
        {hunk.category === 'text' ? (
          <p className="text-xs text-slate-700 dark:text-slate-200">
            <TextDiff before={hunk.current} after={hunk.incoming} />
          </p>
        ) : (
          hunk.detail && <p className="text-xs text-slate-600 dark:text-slate-300">{hunk.detail}</p>
        )}
        {showValues && hunk.category !== 'text' && hunk.category !== 'block' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <ValueView value={hunk.current} options={hunk.category === 'options'} />
            <ValueView value={hunk.incoming} options={hunk.category === 'options'} />
          </div>
        )}
      </div>
      <DecisionToggle hunk={hunk} compact />
    </div>
  );
};
