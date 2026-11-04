import { createContext, useContext } from 'react';
import type { MergeHunk, MergeSide } from '../types';

export interface MergeLabels {
  current: string;
  incoming: string;
  base: string;
}

/** A path singled out by clicking it or its label; the same path lights up in every column */
export interface HighlightedPath {
  key: string;
  source: string;
  target: string;
}

export interface MergeActions {
  labels: MergeLabels;
  readOnly: boolean;
  resolve: (hunk: MergeHunk) => MergeSide;
  decide: (hunkId: string, side: MergeSide) => void;
  select: (key: string | null) => void;
  selectedKey: string | null;
  highlightPath: (path: HighlightedPath | null) => void;
  highlightedPath: HighlightedPath | null;
}

const noop = () => {};

export const MergeActionsContext = createContext<MergeActions>({
  labels: { current: 'Current', incoming: 'Incoming', base: 'Base' },
  readOnly: false,
  resolve: (hunk) => (hunk.locked ? 'incoming' : hunk.defaultDecision),
  decide: noop,
  select: noop,
  selectedKey: null,
  highlightPath: noop,
  highlightedPath: null,
});

/** Whether a path between two nodes is lit: picked itself, or touching the selected block */
export const isPathHighlighted = (actions: Pick<MergeActions, 'selectedKey' | 'highlightedPath'>, key: string | undefined, source: string, target: string): boolean =>
  (!!key && actions.highlightedPath?.key === key) || (!!actions.selectedKey && (source === actions.selectedKey || target === actions.selectedKey));

/** Whether anything is singled out, so the rest should fade */
export const hasFocus = (actions: Pick<MergeActions, 'selectedKey' | 'highlightedPath'>): boolean => !!actions.selectedKey || !!actions.highlightedPath;

export const useMergeActions = (): MergeActions => useContext(MergeActionsContext);
