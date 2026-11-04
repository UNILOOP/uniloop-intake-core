import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  type Rect,
  type Viewport,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import '../../../builder/flowv3/flowV3.css';
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import { useMergeActions } from '../MergeContext';
import { MergeNode, MergeTerminal } from '../MergeNode';
import { CompareEdge } from './CompareEdge';
import type { CompareColumnGraph, CompareColumnId } from './compareColumns';

const nodeTypes = { 'merge-node': MergeNode, 'merge-terminal': MergeTerminal } as const;
const edgeTypes = { 'compare-edge': CompareEdge } as const;

export interface CompareColumnProps {
  column: CompareColumnGraph;
  bounds: Rect;
  initialViewport: (column: CompareColumnId, fallback: Viewport) => Viewport;
  registerFlow: (column: CompareColumnId, flow: ReactFlowInstance) => () => void;
  onUserMove: (column: CompareColumnId, previous: Viewport, next: Viewport) => void;
  navigation: { action: 'zoom-in' | 'zoom-out' | 'fit'; revision: number };
  onMeasured: (column: CompareColumnId, id: string, height: number) => void;
  accent: 'current' | 'incoming' | 'result';
}

const ACCENT: Record<CompareColumnProps['accent'], string> = {
  current: 'border-t-slate-700 dark:border-t-slate-300',
  incoming: 'border-t-emerald-500',
  result: 'border-t-violet-500',
};

const CompareColumnInner = ({ column, bounds, navigation, registerFlow, initialViewport, onUserMove, onMeasured, accent }: CompareColumnProps) => {
  const { select, highlightPath, selectedKey } = useMergeActions();
  const flow = useReactFlow();
  const initialized = useNodesInitialized();
  const previousViewport = useRef<Viewport | null>(null);
  useEffect(() => registerFlow(column.id, flow), [column.id, flow, registerFlow]);
  const initialFit = useRef(false);
  const canvas = useRef<HTMLDivElement>(null);
  const lastNavigation = useRef(navigation.revision);
  const lastSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!initialized || initialFit.current) return;
    initialFit.current = true;
    const start = column.nodes.find((node) => node.id === 'start');
    if (!start || !canvas.current) return;
    const zoom = Math.min(0.85, (canvas.current.clientWidth - 48) / 300);
    void flow.setViewport(
      initialViewport(column.id, { x: canvas.current.clientWidth / 2 - (start.position.x + 45) * zoom, y: 32 - start.position.y * zoom, zoom })
    );
  }, [initialized, column.id, column.nodes, flow, initialViewport]);
  useEffect(() => {
    if (lastNavigation.current === navigation.revision) return;
    lastNavigation.current = navigation.revision;
    if (navigation.action === 'fit') void flow.fitBounds(bounds, { padding: 0.2, duration: 250 });
    else if (navigation.action === 'zoom-in') void flow.zoomIn({ duration: 150 });
    else void flow.zoomOut({ duration: 150 });
  }, [navigation, bounds, flow]);
  useEffect(() => {
    if (!initialized || lastSelection.current === selectedKey) return;
    lastSelection.current = selectedKey;
    if (selectedKey && column.nodes.some((node) => node.id === selectedKey)) {
      void flow.fitView({ nodes: [{ id: selectedKey }], padding: 0.4, minZoom: 0.3, maxZoom: 0.85, duration: 250 });
    }
  }, [selectedKey, initialized, column.nodes, flow]);
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions) onMeasured(column.id, change.id, change.dimensions.height);
      }
    },
    [column.id, onMeasured]
  );

  return (
    <section
      className={cn('flex min-w-0 flex-1 flex-col border-r border-t-4 border-slate-200 last:border-r-0 dark:border-slate-700', ACCENT[accent])}
      aria-label={column.title}
    >
      <header className="flex items-baseline gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{column.title}</h3>
        <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{column.subtitle}</span>
      </header>
      {selectedKey && !column.nodes.some((node) => node.id === selectedKey) && (
        <p className="border-b bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">Selected block is absent from this version.</p>
      )}
      <div ref={canvas} className="min-h-0 flex-1">
        <ReactFlow
          nodes={column.nodes as Node[]}
          edges={column.edges as Edge[]}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onMove={(event, viewport) => {
            const previous = previousViewport.current;
            previousViewport.current = viewport;
            if (event && previous) onUserMove(column.id, previous, viewport);
          }}
          onNodeClick={(_, node) => {
            if (node.type === 'merge-node') select(node.id);
          }}
          onEdgeClick={(_, edge) => {
            const data = edge.data as { key?: string } | undefined;
            if (data?.key) highlightPath({ key: data.key, source: edge.source, target: edge.target });
          }}
          onPaneClick={() => {
            select(null);
            highlightPath(null);
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          autoPanOnNodeFocus={false}
          elementsSelectable
          panOnScroll
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          minZoom={0.05}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="compare-column"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>
    </section>
  );
};

export const CompareColumn = (props: CompareColumnProps) => (
  <ReactFlowProvider>
    <CompareColumnInner {...props} />
  </ReactFlowProvider>
);
