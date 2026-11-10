import { AlertTriangle, CheckCircle2, GitMerge, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { pendingForced } from '../decisions';
import type { BlockDiffEntry, MergeDecisions, MergeIssue, SurveyDiff } from '../types';
import { BlockInspector } from './BlockInspector';
import { ChangeList, matchesFilter, type ChangeFilter } from './ChangeList';
import { useMergeActions } from './MergeContext';

export interface ReviewPanelProps {
  diff: SurveyDiff;
  decisions: MergeDecisions;
  issues: MergeIssue[];
  filter: ChangeFilter;
  onFilter: (filter: ChangeFilter) => void;
  selected: BlockDiffEntry | null;
  /** Whether the list belongs in this panel (false when the main area already shows it) */
  showList: boolean;
  onApply?: () => void;
  applyLabel?: string;
  applying?: boolean;
}

export const IssueList = ({ issues }: { issues: MergeIssue[] }) =>
  issues.length === 0 ? null : (
    <ul className="space-y-1" aria-label="Merge issues">
      {issues.map((issue) => (
        <li
          key={`${issue.code}:${issue.blockKey ?? ''}:${issue.message}`}
          className={cn(
            'rounded-md border px-2 py-1.5 text-xs',
            issue.level === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
              : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
          )}
        >
          <span className="font-semibold">{issue.level === 'error' ? 'Fix first: ' : 'Check: '}</span>
          {issue.message}
        </li>
      ))}
    </ul>
  );

/** The right-hand side: progress, filters and the list of changes, or the selected block, with the apply action. */
export const ReviewPanel = ({ diff, decisions, issues, filter, onFilter, selected, showList, onApply, applyLabel, applying }: ReviewPanelProps) => {
  const { labels, readOnly } = useMergeActions();
  const decidable = diff.hunks.filter((hunk) => !hunk.locked);
  const reviewed = decidable.filter((hunk) => (hunk.forced ? decisions[hunk.id] === 'incoming' : decisions[hunk.id] !== undefined)).length;
  const required = pendingForced(diff, decisions).length;
  const conflicts = decidable.filter((hunk) => hunk.conflict);
  const unresolved = conflicts.filter((hunk) => decisions[hunk.id] === undefined).length;
  const errors = issues.filter((issue) => issue.level === 'error').length;
  const blockHunkIds = new Set(diff.blocks.flatMap((entry) => entry.hunks.map((hunk) => hunk.id)));
  const count = (candidate: ChangeFilter) => diff.hunks.filter((hunk) => matchesFilter(hunk, candidate, blockHunkIds.has(hunk.id))).length;
  const chips: Array<{ id: ChangeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'required', label: 'Required' },
    { id: 'conflicts', label: 'Conflicts' },
    { id: 'added', label: 'New' },
    { id: 'removed', label: 'Removed' },
    { id: 'edited', label: 'Edited' },
    { id: 'form', label: 'Form' },
  ];
  const percent = decidable.length ? Math.round((reviewed / decidable.length) * 100) : 100;

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-slate-200 bg-card dark:border-slate-700" aria-label="Review">
      {selected ? (
        <BlockInspector diff={diff} entry={selected} />
      ) : (
        <>
          <div className="space-y-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Review changes</h3>
              {decidable.length > 0 && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {reviewed} of {decidable.length} reviewed
                </span>
              )}
            </div>
            {decidable.length > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
            )}
            {required > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />{' '}
                {required === 1 ? `1 required change from ${labels.incoming} to take` : `${required} required changes from ${labels.incoming} to take`}
              </p>
            )}
            {unresolved > 0 ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> {unresolved === 1 ? '1 conflict needs your decision' : `${unresolved} conflicts need your decision`}
              </p>
            ) : conflicts.length > 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> All conflicts decided
              </p>
            ) : null}
            {diff.hunks.length > 0 && (
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                For each change: <span className="font-semibold text-slate-700 dark:text-slate-200">Keep yours</span> leaves {labels.current} as it is;{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Use {labels.incoming}</span> brings in their version of that one setting.
              </p>
            )}
            {diff.mode === 'two-way' && diff.hunks.length > 0 && (
              <p className="flex items-start gap-1.5 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No earlier version of this form was stored, so every difference is listed. {labels.current} stays as it is unless you choose Use.
                </span>
              </p>
            )}
            {showList && diff.hunks.length > 0 && (
              <fieldset className="m-0 flex min-w-0 flex-wrap gap-1 border-0 p-0 pt-1">
                <legend className="sr-only">Filter changes</legend>
                {chips.map((chip) => {
                  const total = count(chip.id);
                  if (chip.id !== 'all' && total === 0) return null;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={filter === chip.id}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        filter === chip.id
                          ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      )}
                      onClick={() => onFilter(chip.id)}
                    >
                      {chip.label} {total}
                    </button>
                  );
                })}
              </fieldset>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {diff.hunks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{labels.current} already matches {labels.incoming}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">There is nothing to merge.</p>
              </div>
            ) : showList ? (
              <ChangeList diff={diff} filter={filter} />
            ) : (
              <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Pick a block in the list to compare it side by side.</p>
            )}
          </div>
        </>
      )}
      <footer className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
        <IssueList issues={issues} />
        {onApply && (
          <Button type="button" className="w-full" size="lg" disabled={readOnly || applying || errors > 0 || required > 0} onClick={onApply}>
            <GitMerge className="mr-2 h-4 w-4" /> {applying ? 'Applying…' : applyLabel ?? 'Apply merge'}
          </Button>
        )}
        {onApply && (
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            {errors > 0
              ? 'Fix the problems above before applying.'
              : required > 0
                ? `Take every required change from ${labels.incoming} before applying.`
                : unresolved > 0
                ? `You can apply now; undecided conflicts keep ${labels.current}.`
                : diff.hunks.length === 0
                  ? `Applying only records that ${labels.current} matches ${labels.incoming}.`
                  : `Writes these decisions into ${labels.current}. Other versions are not affected.`}
          </p>
        )}
      </footer>
    </aside>
  );
};
