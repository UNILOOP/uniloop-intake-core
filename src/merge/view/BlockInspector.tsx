import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { BlockDiffEntry, SurveyDiff } from '../types';
import { DecisionToggle } from './DecisionToggle';
import { useMergeActions } from './MergeContext';
import { entryStatus } from './entryStatus';
import { CATEGORY_LABEL, NODE_STATUS_CLASSES, NODE_STATUS_LABEL, ORIGIN_CLASSES, originText } from './status';
import { TextDiff } from './TextDiff';
import { ValueView } from './ValueView';

/** The selected block, side by side: every differing setting with its decision. */
export const BlockInspector = ({ diff, entry }: { diff: SurveyDiff; entry: BlockDiffEntry }) => {
  const { labels, resolve, select } = useMergeActions();
  const { status } = entryStatus(entry, resolve);
  const classes = NODE_STATUS_CLASSES[status];
  const container = diff.containers[entry.containerKey];
  const structural = entry.hunks.find((hunk) => hunk.category === 'block');
  const fieldHunks = entry.hunks.filter((hunk) => hunk.category !== 'block');

  return (
    <div data-inspector-key={entry.key}>
      <header className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-700">
        <button type="button" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-300" onClick={() => select(null)}>
          <ChevronLeft className="h-3.5 w-3.5" /> All changes
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{entry.isPage ? `Page: ${entry.title}` : entry.title}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', classes.badge)}>{NODE_STATUS_LABEL[status]}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {entry.type}
            {entry.fieldName ? ` · ${entry.fieldName}` : ''}
            {container && container.kind !== 'root' ? ` · in ${container.name}` : ''}
            {entry.matchedBy === 'fieldName' ? ' · matched by field name' : ''}
            {entry.locked ? ' · provider-locked' : ''}
          </p>
        </div>
      </header>
      <div className="space-y-3 p-3">
        {structural && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{structural.label}</div>
              <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', ORIGIN_CLASSES[structural.origin])}>{originText(structural.origin, labels)}</span>
            </div>
            <DecisionToggle hunk={structural} />
          </div>
        )}
        {fieldHunks.map((hunk) => {
          const hasDescribedValues = hunk.meta?.currentText !== undefined || hunk.meta?.incomingText !== undefined;
          return (
            <section
              key={hunk.id}
              className={cn(
                'space-y-2 rounded-md border border-slate-200 p-3 text-xs dark:border-slate-700',
                hunk.conflict && 'bg-amber-50/60 dark:bg-amber-900/20'
              )}
              data-hunk-id={hunk.id}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="font-medium text-slate-800 dark:text-slate-100">{hunk.label}</h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{CATEGORY_LABEL[hunk.category] ?? hunk.category}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', ORIGIN_CLASSES[hunk.origin])}>{originText(hunk.origin, labels)}</span>
              </div>
              {hunk.detail && hunk.category !== 'text' && !hasDescribedValues && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{hunk.detail}</p>
              )}
              <dl className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-200">
                <div className="min-w-0">
                  <dt className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{labels.current}</dt>
                  <dd>
                    {hasDescribedValues ? (hunk.meta?.currentText ?? '—') : <ValueView value={hunk.current} options={hunk.category === 'options'} />}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{labels.incoming}</dt>
                  <dd>
                    {hasDescribedValues ? (
                      (hunk.meta?.incomingText ?? '—')
                    ) : hunk.category === 'text' ? (
                      <TextDiff before={hunk.current} after={hunk.incoming} />
                    ) : (
                      <ValueView value={hunk.incoming} options={hunk.category === 'options'} />
                    )}
                  </dd>
                </div>
              </dl>
              <DecisionToggle hunk={hunk} />
            </section>
          );
        })}
        {!structural && fieldHunks.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">This block is the same in both versions.</p>}
        {entry.isPage && entry.childKeys && entry.childKeys.length > 0 && (
          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Blocks on this page</h4>
            <ul className="space-y-1">
              {entry.childKeys.map((childKey) => {
                const child = diff.blocks.find((candidate) => candidate.key === childKey);
                if (!child) return null;
                const childStatus = entryStatus(child, resolve).status;
                return (
                  <li key={childKey} className="flex items-center gap-2 text-xs">
                    <span className={cn('h-2 w-2 rounded-full', NODE_STATUS_CLASSES[childStatus].badge)} />
                    <button type="button" className="truncate hover:underline" onClick={() => select(childKey)}>
                      {child.title}
                    </button>
                    <span className="ml-auto text-[10px] text-slate-400">{NODE_STATUS_LABEL[childStatus]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
