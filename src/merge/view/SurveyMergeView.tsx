import { GitMerge } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { BlockDefinitionScope } from '../../blocks';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import type { BlockDefinition } from '../../types';
import { bulkDecisions } from '../decisions';
import type { MergeDecisions, MergeIssue, MergeSide, SurveyDiff, SurveySnapshot } from '../types';
import { ChangeList, type ChangeFilter } from './ChangeList';
import { MergeActionsContext, type HighlightedPath, type MergeLabels } from './MergeContext';
import { MergeLegend } from './MergeLegend';
import { MergeTopBar, type MergeView } from './MergeTopBar';
import { IssueList, ReviewPanel } from './ReviewPanel';
import { useSurveyMerge } from './useSurveyMerge';

const MergeCanvas = lazy(() => import('./MergeCanvas').then((module) => ({ default: module.MergeCanvas })));
const MergePreview = lazy(() => import('./MergePreview').then((module) => ({ default: module.MergePreview })));
const CompareView = lazy(() => import('./compare/CompareView').then((module) => ({ default: module.CompareView })));

export type MergeTab = MergeView;

export interface SurveyMergeViewProps {
  /** The version being merged into, e.g. the form as edited locally */
  current: SurveySnapshot;
  /** The version to merge from, e.g. the latest upstream template */
  incoming: SurveySnapshot;
  /** The version both started from, when known */
  base?: SurveySnapshot | null;
  blockDefinitions?: BlockDefinition[];
  previewBlockDefinitionScope?: BlockDefinitionScope;
  labels?: Partial<MergeLabels>;
  /** Controlled decisions; omit to let the view keep them */
  decisions?: MergeDecisions;
  initialDecisions?: MergeDecisions;
  onDecisionsChange?: (decisions: MergeDecisions) => void;
  onMergedChange?: (merged: SurveySnapshot, issues: MergeIssue[], diff: SurveyDiff) => void;
  onApply?: (merged: SurveySnapshot, decisions: MergeDecisions, diff: SurveyDiff) => void | Promise<void>;
  applyLabel?: string;
  applying?: boolean;
  readOnly?: boolean;
  themeDefault?: 'auto' | 'current';
  initialTab?: MergeView;
  className?: string;
  /** Rendered above the top bar, e.g. a version switcher */
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Compare two versions of a form and build a third from them: the two flows side by
 * side with rows aligned, a merged flow with every change marked, a review list with a
 * keep-or-use decision on each change, a side-by-side view of any block, and a preview.
 */
export const SurveyMergeView = ({
  current,
  incoming,
  base,
  blockDefinitions,
  previewBlockDefinitionScope,
  labels,
  decisions: controlledDecisions,
  initialDecisions,
  onDecisionsChange,
  onMergedChange,
  onApply,
  applyLabel,
  applying = false,
  readOnly = false,
  themeDefault = 'auto',
  initialTab = 'compare',
  className,
  header,
  footer,
}: SurveyMergeViewProps) => {
  const state = useSurveyMerge({
    current,
    incoming,
    base,
    blockDefinitions,
    themeDefault,
    decisions: controlledDecisions,
    initialDecisions,
    onDecisionsChange,
    onMergedChange,
  });
  const { diff, decisions, merged, issues, definitions, resolve, decide, setMany, reset } = state;
  const [view, setView] = useState<MergeView>(initialTab);
  const [filter, setFilter] = useState<ChangeFilter>('all');
  const [showDeclined, setShowDeclined] = useState(true);
  const [showCompareReview, setShowCompareReview] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<HighlightedPath | null>(null);
  const select = useCallback((key: string | null) => {
    setSelectedKey(key);
    if (key) setShowCompareReview(true);
    setHighlightedPath(null);
  }, []);

  const currentLabel = labels?.current ?? 'current';
  const incomingLabel = labels?.incoming ?? 'incoming';
  const baseLabel = labels?.base ?? 'base';
  const mergedLabels: MergeLabels = useMemo(
    () => ({ current: currentLabel, incoming: incomingLabel, base: baseLabel }),
    [currentLabel, incomingLabel, baseLabel]
  );
  const actions = useMemo(
    () => ({
      labels: mergedLabels,
      readOnly,
      resolve,
      decide: readOnly ? () => {} : decide,
      select,
      selectedKey,
      highlightPath: setHighlightedPath,
      highlightedPath,
    }),
    [mergedLabels, readOnly, resolve, decide, select, selectedKey, highlightedPath]
  );
  const selected = useMemo(() => (selectedKey ? (diff.blocks.find((entry) => entry.key === selectedKey) ?? null) : null), [diff, selectedKey]);
  const onBulk = useCallback((side: MergeSide) => setMany(bulkDecisions(diff, side)), [diff, setMany]);
  const apply = useCallback(() => onApply?.(merged, decisions, diff), [onApply, merged, decisions, diff]);
  const hasErrors = issues.some((issue) => issue.level === 'error');
  const hasUnresolvedConflicts = diff.hunks.some((hunk) => !hunk.locked && hunk.conflict && decisions[hunk.id] === undefined);

  return (
    <MergeActionsContext.Provider value={actions}>
      <div className={cn('survey-merge flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground', className)} data-mode={diff.mode}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="max-h-[40%] shrink-0 overflow-y-auto overscroll-contain">
            {header}
            <MergeTopBar summary={diff.summary} mode={diff.mode} view={view} onView={setView} onBulk={onBulk} onReset={reset} />
          </div>
          {view === 'compare' && (
            <div className="flex shrink-0 justify-end border-b border-slate-200 px-3 py-1 dark:border-slate-700">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-pressed={showCompareReview}
                onClick={() => setShowCompareReview((visible) => !visible)}
              >
                {showCompareReview ? 'Hide review panel' : `Review changes (${diff.hunks.length})`}
              </button>
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-50/60 dark:bg-slate-950/40" role="tabpanel">
              {view === 'compare' && (
                <Suspense fallback={<p className="animate-pulse p-6 text-sm text-slate-500">Drawing both flows…</p>}>
                  <CompareView diff={diff} merged={merged} resolve={resolve} definitions={definitions} />
                </Suspense>
              )}
              {view === 'flow' && (
                <>
                  <Suspense fallback={<p className="animate-pulse p-6 text-sm text-slate-500">Drawing the flow…</p>}>
                    <div className="h-full w-full">
                      <MergeCanvas
                        diff={diff}
                        merged={merged}
                        decisions={decisions}
                        resolve={resolve}
                        definitions={definitions}
                        showDeclined={showDeclined}
                      />
                    </div>
                  </Suspense>
                  <MergeLegend showDeclined={showDeclined} onShowDeclined={setShowDeclined} />
                </>
              )}
              {view === 'changes' && (
                <div className="mx-auto h-full max-w-3xl overflow-y-auto overscroll-contain p-4 [overflow-wrap:anywhere]">
                  <ChangeList diff={diff} filter={filter} />
                </div>
              )}
              {view === 'preview' && (
                <Suspense fallback={<p className="animate-pulse p-6 text-sm text-slate-500">Loading the preview…</p>}>
                  <div className="h-full overflow-y-auto">
                    <MergePreview merged={merged} blockDefinitionScope={previewBlockDefinitionScope} />
                  </div>
                </Suspense>
              )}
            </div>
            {(view !== 'compare' || showCompareReview) && (
              <ReviewPanel
                diff={diff}
                decisions={decisions}
                filter={filter}
                onFilter={setFilter}
                selected={selected}
                showList={view !== 'changes'}
              />
            )}
          </div>
        </div>
        {(onApply || issues.length > 0) && (
          <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-card p-3 dark:border-slate-700">
            {issues.length > 0 && (
              <div className="max-h-[15dvh] overflow-y-auto overscroll-contain [overflow-wrap:anywhere]">
                <IssueList issues={issues} />
              </div>
            )}
            {onApply && (
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                <p className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400">
                  {hasErrors
                    ? 'Fix the problems above before applying.'
                    : hasUnresolvedConflicts
                      ? `You can apply now; undecided conflicts keep ${currentLabel}.`
                      : diff.hunks.length === 0
                        ? `Applying only records that ${currentLabel} matches ${incomingLabel}.`
                        : `Writes these decisions into ${currentLabel}. Other versions are not affected.`}
                </p>
                <Button type="button" className="w-full sm:w-auto" size="lg" disabled={readOnly || applying || hasErrors} onClick={apply}>
                  <GitMerge className="h-4 w-4" /> {applying ? 'Applying…' : applyLabel ?? 'Apply merge'}
                </Button>
              </div>
            )}
          </footer>
        )}
        {footer}
      </div>
    </MergeActionsContext.Provider>
  );
};
