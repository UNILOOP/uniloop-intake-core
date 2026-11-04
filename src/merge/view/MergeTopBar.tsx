import { Check, Info, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import type { DiffSummary, MergeSide } from '../types';
import { useMergeActions } from './MergeContext';

export type MergeView = 'compare' | 'flow' | 'changes' | 'preview';

export interface MergeTopBarProps {
  summary: DiffSummary;
  mode: 'two-way' | 'three-way';
  view: MergeView;
  onView: (view: MergeView) => void;
  onBulk: (side: MergeSide) => void;
  onReset: () => void;
}

const Chip = ({ value, label, className }: { value: number; label: string; className: string }) =>
  value > 0 ? (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', className)}>
      {value} {label}
    </span>
  ) : null;

export const MergeTopBar = ({ summary, mode, view, onView, onBulk, onReset }: MergeTopBarProps) => {
  const { labels, readOnly } = useMergeActions();
  const views: Array<{ id: MergeView; label: string }> = [
    { id: 'compare', label: 'Side by side' },
    { id: 'flow', label: 'Merged flow' },
    { id: 'changes', label: 'List' },
    { id: 'preview', label: 'Preview' },
  ];
  const baseText = mode === 'three-way' ? `Compared with ${labels.base}` : 'No earlier version';
  const baseTitle =
    mode === 'three-way'
      ? `Each change is attributed to a side by comparing both with ${labels.base}, the version they started from.`
      : `No earlier version was stored, so every difference is listed and ${labels.current} stays as it is unless you choose Use.`;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-card px-3 py-2 dark:border-slate-700">
      <div role="tablist" aria-label="View" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              view === item.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            )}
            onClick={() => onView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="flex flex-wrap items-center gap-1.5" aria-label="Summary">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={baseTitle}>
          <Info className="h-3 w-3" /> {baseText}
        </span>
        <Chip value={summary.changed} label="changed" className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" />
        <Chip value={summary.added} label="new" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" />
        <Chip value={summary.removed} label="removed" className="bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200" />
        <Chip value={summary.moved} label="moved" className="bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200" />
      </section>
      {!readOnly && summary.hunks > 0 && (
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="text-emerald-700 dark:text-emerald-300" onClick={() => onBulk('incoming')} title={`Take every change from ${labels.incoming}`}>
            <Check className="mr-1 h-3.5 w-3.5" /> Use all from {labels.incoming}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onBulk('current')} title={`Keep ${labels.current} exactly as it is`}>
            Keep everything
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onReset} title="Back to the suggested decisions">
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      )}
    </div>
  );
};
