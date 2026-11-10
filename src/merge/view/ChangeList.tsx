import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { BlockDiffEntry, MergeHunk, SurveyDiff } from '../types';
import { entryStatus } from './entryStatus';
import { HunkRow } from './HunkRow';
import { useMergeActions } from './MergeContext';
import { NODE_STATUS_CLASSES, NODE_STATUS_LABEL } from './status';

export type ChangeFilter = 'all' | 'required' | 'conflicts' | 'added' | 'removed' | 'edited' | 'form';

export const matchesFilter = (hunk: MergeHunk, filter: ChangeFilter, blockLevel: boolean): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'required':
      return hunk.forced === true;
    case 'conflicts':
      return hunk.conflict;
    case 'added':
      return hunk.kind === 'block-added' || hunk.kind === 'page-added' || hunk.kind === 'section-added';
    case 'removed':
      return hunk.kind === 'block-removed' || hunk.kind === 'page-removed' || hunk.kind === 'section-removed';
    case 'edited':
      return blockLevel && hunk.kind !== 'block-added' && hunk.kind !== 'page-added' && hunk.kind !== 'block-removed' && hunk.kind !== 'page-removed';
    case 'form':
      return !blockLevel;
  }
};

export interface ChangeListProps {
  diff: SurveyDiff;
  filter: ChangeFilter;
}

/** Every change, grouped by block in form order, then the form-level ones. */
export const ChangeList = ({ diff, filter }: ChangeListProps) => {
  const { resolve, select, selectedKey } = useMergeActions();
  const groups = useMemo(() => {
    const byEntry: Array<{ entry: BlockDiffEntry; hunks: MergeHunk[] }> = [];
    for (const entry of diff.blocks) {
      const hunks = entry.hunks.filter((hunk) => matchesFilter(hunk, filter, true));
      if (hunks.length) byEntry.push({ entry, hunks });
    }
    const blockHunkIds = new Set(diff.blocks.flatMap((entry) => entry.hunks.map((hunk) => hunk.id)));
    const formLevel = diff.hunks.filter((hunk) => !blockHunkIds.has(hunk.id) && matchesFilter(hunk, filter, false));
    return { byEntry, formLevel };
  }, [diff, filter]);

  if (groups.byEntry.length === 0 && groups.formLevel.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Nothing to show for this filter.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.byEntry.map(({ entry, hunks }) => {
        const { status } = entryStatus(entry, resolve);
        const classes = NODE_STATUS_CLASSES[status];
        const container = diff.containers[entry.containerKey];
        return (
          <section
            key={entry.key}
            className={cn('rounded-xl border bg-slate-50/60 p-2 dark:bg-slate-800/40', selectedKey === entry.key ? 'border-primary' : 'border-slate-200 dark:border-slate-700')}
            data-entry-key={entry.key}
          >
            <button
              type="button"
              className="group mb-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-white dark:hover:bg-slate-800"
              onClick={() => select(entry.key)}
              title="Compare this block side by side"
            >
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', classes.dot)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{entry.isPage ? `Page: ${entry.title}` : entry.title}</span>
                <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {entry.fieldName ?? entry.type}
                  {container && container.kind === 'page' ? ` · on ${container.name}` : ''}
                </span>
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', classes.badge)}>{NODE_STATUS_LABEL[status]}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <div className="space-y-1.5">
              {hunks.map((hunk) => (
                <HunkRow key={hunk.id} hunk={hunk} />
              ))}
            </div>
          </section>
        );
      })}
      {groups.formLevel.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-800/40">
          <header className="mb-2 px-1 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Sections, form settings, translations and theme</header>
          <div className="space-y-1.5">
            {groups.formLevel.map((hunk) => (
              <HunkRow key={hunk.id} hunk={hunk} showValues />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
