import type { ReactFlowInstance, Viewport } from '@xyflow/react';
import { Columns3, Minus, Plus, Scan } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BlockDefinition } from '../../../types';
import type { MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from '../../types';
import { useMergeActions } from '../MergeContext';
import { CompareColumn } from './CompareColumn';
import {
  buildCompareColumns,
  compareBounds,
  layoutCompareColumn,
  synchronizedViewport,
  type ColumnHeights,
  type CompareColumnId,
  type CompareColumnGraph,
} from './compareColumns';

export interface CompareViewProps {
  diff: SurveyDiff;
  merged: SurveySnapshot;
  /** Changes identity with every decision, which is what keeps the columns in step */
  resolve: (hunk: MergeHunk) => MergeSide;
  definitions: Record<string, BlockDefinition>;
}

/** Each version follows the same Dagre layout system as the flow builder. */
export const CompareView = ({ diff, merged, resolve, definitions }: CompareViewProps) => {
  const { labels, selectedKey } = useMergeActions();
  const initializedFlows = useRef(new Set<CompareColumnId>());
  const flows = useRef<Partial<Record<CompareColumnId, ReactFlowInstance>>>({});
  const registerFlow = useCallback((column: CompareColumnId, flow: ReactFlowInstance) => {
    flows.current[column] = flow;
    return () => {
      delete flows.current[column];
      initializedFlows.current.delete(column);
    };
  }, []);
  const initialViewport = useCallback((column: CompareColumnId, fallback: Viewport): Viewport => {
    const peer = [...initializedFlows.current].find((id) => id !== column);
    const viewport = peer ? (flows.current[peer]?.getViewport() ?? fallback) : fallback;
    initializedFlows.current.add(column);
    return viewport;
  }, []);
  const synchronizeViewport = useCallback((source: CompareColumnId, previous: Viewport, next: Viewport) => {
    for (const [id, flow] of Object.entries(flows.current)) {
      if (id === source || !flow) continue;
      void flow.setViewport(synchronizedViewport(flow.getViewport(), previous, next));
    }
  }, []);
  const [showResult, setShowResult] = useState(false);
  const [showUnchangedPaths, setShowUnchangedPaths] = useState(true);
  const [columns, setColumns] = useState<CompareColumnGraph[]>([]);
  const [layoutError, setLayoutError] = useState(false);
  const [navigation, setNavigation] = useState<{ action: 'zoom-in' | 'zoom-out' | 'fit'; revision: number }>({ action: 'fit', revision: 0 });
  const [heights, setHeights] = useState<ColumnHeights>({});
  const onMeasured = useCallback((column: CompareColumnId, id: string, height: number) => {
    setHeights((previous) => {
      if (previous[column]?.[id] === height) return previous;
      return { ...previous, [column]: { ...(previous[column] ?? {}), [id]: height } };
    });
  }, []);
  const graphs = useMemo(
    () => buildCompareColumns({ diff, merged, resolve, definitions, labels, showResult, showUnchangedPaths, heights, selectedKey }),
    [diff, merged, resolve, definitions, labels, showResult, showUnchangedPaths, heights, selectedKey]
  );
  useEffect(() => {
    let cancelled = false;
    setLayoutError(false);
    Promise.all(graphs.map(layoutCompareColumn))
      .then((laidOut) => {
        if (!cancelled) setColumns(laidOut);
      })
      .catch(() => {
        if (!cancelled) setLayoutError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [graphs]);
  const bounds = useMemo(() => compareBounds(columns), [columns]);
  const navigate = (action: typeof navigation.action) => setNavigation((previous) => ({ action, revision: previous.revision + 1 }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
          <Columns3 className="h-3.5 w-3.5" /> Side by side
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          Branches follow each version’s flow. Pan and zoom stay linked. Select a block to find its counterpart.
        </span>
        <label
          className="ml-auto inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          title="Paths that are the same in both versions are drawn faintly; click a block to see its paths in full"
        >
          <input type="checkbox" checked={showUnchangedPaths} onChange={(event) => setShowUnchangedPaths(event.target.checked)} /> Show unchanged
          paths (faint)
        </label>
        <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={showResult} onChange={(event) => setShowResult(event.target.checked)} /> Show result after applying
        </label>
        <fieldset className="m-0 inline-flex min-w-0 overflow-hidden rounded-md border border-slate-200 p-0 dark:border-slate-700">
          <legend className="sr-only">Zoom</legend>
          <button
            type="button"
            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate('zoom-out')}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="border-x border-slate-200 px-2 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={() => navigate('fit')}
            aria-label="Fit flows"
          >
            <Scan className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate('zoom-in')}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </fieldset>
      </div>
      {layoutError && (
        <p role="alert" className="p-3 text-sm text-rose-600">
          Could not arrange the flows. Switch views and try again.
        </p>
      )}
      {columns.length === 0 && !layoutError && <p className="animate-pulse p-6 text-sm text-slate-500">Arranging the flows…</p>}
      <div className="flex min-h-0 flex-1">
        {columns.map((column) => (
          <CompareColumn
            key={column.id}
            column={column}
            navigation={navigation}
            bounds={bounds}
            registerFlow={registerFlow}
            initialViewport={initialViewport}
            onUserMove={synchronizeViewport}
            onMeasured={onMeasured}
            accent={column.id}
          />
        ))}
      </div>
    </div>
  );
};
