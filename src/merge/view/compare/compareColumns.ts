import { MarkerType, type Edge, type Node, type Rect, type Viewport } from '@xyflow/react';
import { getLayoutedElements } from '../../../builder/flowv3/utils/layout';
import type { BlockDefinition } from '../../../types';
import type { BlockDiffEntry, MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from '../../types';
import { blockTitle } from '../../describe';
import { entryStatus } from '../entryStatus';
import type { MergeLabels } from '../MergeContext';
import {
  buildSideGraphs,
  digest,
  edgeKey,
  entryNodeData,
  isStepEntry,
  type MergeEdgeData,
  type MergeNodeData,
  type MergeTerminalData,
} from '../mergeGraph';
import type { EdgeStatus, NodeStatus } from '../status';

export type CompareColumnId = 'current' | 'incoming' | 'result';

export interface CompareGhostData extends Record<string, unknown> {
  text: string;
  height: number;
}

export type CompareNode = Node<MergeNodeData, 'merge-node'> | Node<MergeTerminalData, 'merge-terminal'>;
export type CompareEdgeType = Edge<MergeEdgeData, 'compare-edge'>;

export interface CompareColumnGraph {
  id: CompareColumnId;
  title: string;
  subtitle: string;
  nodes: CompareNode[];
  edges: CompareEdgeType[];
}

export const COMPARE_NODE_WIDTH = 300;
const TERMINAL_WIDTH = 90;
const TERMINAL_HEIGHT = 34;
const DEFAULT_ROW_HEIGHT = 96;

/** Measured node heights per column, by entry key */
export type ColumnHeights = Partial<Record<CompareColumnId, Record<string, number>>>;

export interface CompareOptions {
  diff: SurveyDiff;
  merged: SurveySnapshot;
  resolve: (hunk: MergeHunk) => MergeSide;
  definitions: Record<string, BlockDefinition>;
  labels: MergeLabels;
  showResult: boolean;
  /** Draw paths that are the same on both sides too, faintly (off: only the sequence and what differs) */
  showUnchangedPaths?: boolean;
  heights: ColumnHeights;
  selectedKey: string | null;
}

type Cell = { status: NodeStatus; present: boolean } | null;

/** Each version uses its own flow topology; absent blocks do not occupy placeholder rows. */
export function buildCompareColumns(options: CompareOptions): CompareColumnGraph[] {
  const { diff, merged, resolve, definitions, labels, showResult, showUnchangedPaths = true, heights, selectedKey } = options;
  const graphs = buildSideGraphs(diff, merged, definitions);
  const context = { diff, definitions, resolve };
  const rows = diff.blocks.filter((entry) => isStepEntry(diff, entry));
  const columnIds: CompareColumnId[] = showResult ? ['current', 'incoming', 'result'] : ['current', 'incoming'];

  const cell = (column: CompareColumnId, entry: BlockDiffEntry): Cell => {
    const outcome = entryStatus(entry, resolve);
    if (column === 'current') {
      if (!entry.current) return null;
      if (entry.status === 'removed') return { status: outcome.status, present: outcome.status !== 'removed' };
      return { status: outcome.status, present: true };
    }
    if (column === 'incoming') {
      if (!entry.incoming) return null;
      if (entry.status === 'added') return { status: outcome.status, present: outcome.present };
      return { status: outcome.status, present: true };
    }
    return outcome.present ? { status: outcome.status, present: true } : null;
  };

  const TITLE_KEYS = new Set(['label', 'name', 'title', 'question', 'text', 'html', 'markdown']);
  // Each column shows its own wording; the result shows whichever side its title decision took
  const titleFor = (entry: BlockDiffEntry, column: CompareColumnId): string => {
    if (column === 'current') return blockTitle(entry.current ?? entry.incoming, definitions);
    if (column === 'incoming') return blockTitle(entry.incoming ?? entry.current, definitions);
    const titleHunk = entry.hunks.find((hunk) => hunk.meta?.kind === 'key' && TITLE_KEYS.has(hunk.meta.key ?? ''));
    const useIncoming = titleHunk ? resolve(titleHunk) === 'incoming' : entry.status === 'added';
    return blockTitle(useIncoming ? (entry.incoming ?? entry.current) : (entry.current ?? entry.incoming), definitions);
  };

  return columnIds.map((column) => {
    const graph = column === 'current' ? graphs.current : column === 'incoming' ? graphs.incoming : graphs.merged;
    const graphIds = new Set(graph.nodes.map((node) => node.id));
    const nodes: CompareNode[] = [
      {
        id: 'start',
        type: 'merge-terminal',
        data: { label: 'Start', kind: 'start' },
        position: { x: 0, y: 0 },
        measured: { width: TERMINAL_WIDTH, height: heights[column]?.start ?? TERMINAL_HEIGHT },
        draggable: false,
        selectable: false,
      },
    ];
    const presentOrder: string[] = ['start'];
    for (const entry of rows) {
      const content = cell(column, entry);
      if (!content || !graphIds.has(entry.key)) continue;
      presentOrder.push(entry.key);
      nodes.push({
        id: entry.key,
        type: 'merge-node',
        data: { ...entryNodeData(entry, content.status, content.present, context), title: titleFor(entry, column), compact: true },
        position: { x: 0, y: 0 },
        measured: { width: COMPARE_NODE_WIDTH, height: heights[column]?.[entry.key] ?? DEFAULT_ROW_HEIGHT },
        selected: entry.key === selectedKey,
        draggable: false,
      });
    }
    presentOrder.push('submit');
    nodes.push({
      id: 'submit',
      type: 'merge-terminal',
      data: { label: 'Submit', kind: 'end' },
      position: { x: 0, y: 0 },
      measured: { width: TERMINAL_WIDTH, height: heights[column]?.submit ?? TERMINAL_HEIGHT },
      draggable: false,
      selectable: false,
    });

    const index = new Map(presentOrder.map((id, position) => [id, position]));
    const otherKeys = new Set((column === 'current' ? graphs.incoming : graphs.current).edges.map(edgeKey));
    const edges: CompareEdgeType[] = [];
    const seen = new Set<string>();
    for (const edge of graph.edges) {
      const key = edgeKey(edge);
      if (seen.has(key) || edge.source === edge.target || !index.has(edge.source) || !index.has(edge.target)) continue;
      seen.add(key);
      const status: EdgeStatus = otherKeys.has(key) ? 'kept' : column === 'current' ? 'removed' : 'added';
      const edgeType = typeof edge.data?.edgeType === 'string' ? edge.data.edgeType : undefined;
      const sequential = edgeType === 'sequential' || edgeType === 'start';
      const direct = sequential && (index.get(edge.target) ?? -1) === (index.get(edge.source) ?? -2) + 1;
      const touchesSelection = selectedKey !== null && (edge.source === selectedKey || edge.target === selectedKey);
      const hidden = status === 'kept' && !sequential && !showUnchangedPaths && !touchesSelection;
      edges.push({
        id: `${column}-${status}-${digest(key)}`,
        source: edge.source,
        target: edge.target,
        type: 'compare-edge',
        label: edge.label,
        hidden,
        data: {
          status,
          key,
          edgeType,
          label: typeof edge.label === 'string' ? edge.label : undefined,
          direct,
          weight: typeof edge.data?.weight === 'number' ? edge.data.weight : 1,
          totalParallelEdges: typeof edge.data?.totalParallelEdges === 'number' ? edge.data.totalParallelEdges : 1,
          edgeIndex: typeof edge.data?.edgeIndex === 'number' ? edge.data.edgeIndex : 0,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
    const blockCount = presentOrder.length - 2;
    const title = column === 'current' ? labels.current : column === 'incoming' ? labels.incoming : 'Result after applying';
    const subtitle =
      column === 'result'
        ? `${blockCount} step${blockCount === 1 ? '' : 's'} · updates as you decide`
        : `${blockCount} step${blockCount === 1 ? '' : 's'}`;
    return { id: column, title, subtitle, nodes, edges };
  });
}

/** Reuse exactly the flow builder's Dagre sizing, ranking and branch spacing. */
export async function layoutCompareColumn(column: CompareColumnGraph): Promise<CompareColumnGraph> {
  const layout = await getLayoutedElements(column.nodes, column.edges, 'TB');
  return { ...column, nodes: layout.nodes as CompareNode[], edges: layout.edges as CompareEdgeType[] };
}

/** Apply the same screen-space pan/zoom while preserving each graph's starting offset. */
export function synchronizedViewport(viewport: Viewport, previous: Viewport, next: Viewport): Viewport {
  const ratio = next.zoom / previous.zoom;
  return { x: viewport.x * ratio + next.x - previous.x * ratio, y: viewport.y * ratio + next.y - previous.y * ratio, zoom: viewport.zoom * ratio };
}

/** All columns share these bounds so fitting never gives each version a different zoom. */
export function compareBounds(columns: CompareColumnGraph[]): Rect {
  const nodes = columns.flatMap((column) => column.nodes);
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...nodes.map((node) => node.position.x));
  const top = Math.min(...nodes.map((node) => node.position.y));
  const right = Math.max(...nodes.map((node) => node.position.x + (node.measured?.width ?? COMPARE_NODE_WIDTH)));
  const bottom = Math.max(...nodes.map((node) => node.position.y + (node.measured?.height ?? DEFAULT_ROW_HEIGHT)));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
