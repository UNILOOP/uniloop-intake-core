import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllBlockDefinitions } from '../../blocks';
import type { BlockDefinition } from '../../types';
import { cascadeDecision, resolveDecision } from '../decisions';
import { diffSurveys } from '../diff';
import { applyMergeDecisions } from '../merge';
import type { MergeDecisions, MergeHunk, MergeIssue, MergeSide, SurveyDiff, SurveySnapshot } from '../types';
import { validateMergedSurvey } from '../validate';

export interface UseSurveyMergeOptions {
  current: SurveySnapshot;
  incoming: SurveySnapshot;
  base?: SurveySnapshot | null;
  blockDefinitions?: BlockDefinition[];
  themeDefault?: 'auto' | 'current';
  /** Controlled decisions; leave undefined to let the hook keep them */
  decisions?: MergeDecisions;
  initialDecisions?: MergeDecisions;
  onDecisionsChange?: (decisions: MergeDecisions) => void;
  onMergedChange?: (merged: SurveySnapshot, issues: MergeIssue[], diff: SurveyDiff) => void;
}

export interface SurveyMergeState {
  diff: SurveyDiff;
  decisions: MergeDecisions;
  merged: SurveySnapshot;
  issues: MergeIssue[];
  definitions: Record<string, BlockDefinition>;
  resolve: (hunk: MergeHunk) => MergeSide;
  decide: (hunkId: string, side: MergeSide) => void;
  setMany: (patch: MergeDecisions) => void;
  reset: () => void;
}

const sameRecord = (a: MergeDecisions, b: MergeDecisions): boolean => {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

/** The same object for as long as its entries stay equal. */
function useStableRecord(value: MergeDecisions | undefined): MergeDecisions | undefined {
  const ref = useRef(value);
  if (value !== ref.current) {
    if (!value || !ref.current || !sameRecord(value, ref.current)) ref.current = value;
  }
  return ref.current;
}

/** The diff, decisions and merged result for one pair of surveys. */
export function useSurveyMerge(options: UseSurveyMergeOptions): SurveyMergeState {
  const { current, incoming, base, blockDefinitions, themeDefault, onDecisionsChange, onMergedChange } = options;
  const definitions = useMemo(() => {
    const list = blockDefinitions ?? getAllBlockDefinitions();
    return Object.fromEntries(list.map((definition) => [definition.type, definition]));
  }, [blockDefinitions]);
  const diff = useMemo(
    () => diffSurveys(current, incoming, { base: base ?? undefined, definitions, themeDefault }),
    [current, incoming, base, definitions, themeDefault]
  );

  const controlled = options.decisions !== undefined;
  const [internal, setInternal] = useState<MergeDecisions>(options.initialDecisions ?? {});
  // A host that passes a fresh but equal object each render must not restart the merge
  const stableControlled = useStableRecord(options.decisions);
  const decisions = controlled ? (stableControlled as MergeDecisions) : internal;
  const decisionsRef = useRef(decisions);
  decisionsRef.current = decisions;

  // A new pair of surveys starts over, unless the host controls the decisions
  const previousDiff = useRef(diff);
  useEffect(() => {
    if (previousDiff.current === diff) return;
    previousDiff.current = diff;
    if (!controlled) setInternal(options.initialDecisions ?? {});
  }, [diff, controlled, options.initialDecisions]);

  const commit = useCallback(
    (next: MergeDecisions) => {
      if (!controlled) setInternal(next);
      onDecisionsChange?.(next);
    },
    [controlled, onDecisionsChange]
  );
  const setMany = useCallback((patch: MergeDecisions) => commit({ ...decisionsRef.current, ...patch }), [commit]);
  const decide = useCallback((hunkId: string, side: MergeSide) => setMany(cascadeDecision(diff, hunkId, side)), [diff, setMany]);
  const reset = useCallback(() => commit({}), [commit]);
  const resolve = useCallback((hunk: MergeHunk) => resolveDecision(hunk, decisions), [decisions]);

  const merged = useMemo(() => applyMergeDecisions(diff, decisions), [diff, decisions]);
  const issues = useMemo(() => validateMergedSurvey(merged, { incoming, definitions }), [merged, incoming, definitions]);
  // Report through a ref so an inline callback never re-fires the effect on its own
  const onMergedRef = useRef(onMergedChange);
  onMergedRef.current = onMergedChange;
  useEffect(() => {
    onMergedRef.current?.(merged, issues, diff);
  }, [merged, issues, diff]);

  return { diff, decisions, merged, issues, definitions, resolve, decide, setMany, reset };
}
