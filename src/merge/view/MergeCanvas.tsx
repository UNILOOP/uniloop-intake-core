import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, useEdgesState, useNodesInitialized, useNodesState, useReactFlow, type Edge, type Node } from '@xyflow/react';
import '../../builder/flowv3/flowV3.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLayoutedElements } from '../../builder/flowv3/utils/layout';
import type { BlockDefinition } from '../../types';
import type { MergeDecisions, MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from '../types';
import { MergeEdge } from './MergeEdge';
import { MergeNode, MergeTerminal } from './MergeNode';
import { buildMergeGraph } from './mergeGraph';
import { useMergeActions } from './MergeContext';

const nodeTypes = { 'merge-node': MergeNode, 'merge-terminal': MergeTerminal } as const;
const edgeTypes = { 'merge-edge': MergeEdge } as const;

export interface MergeCanvasProps {
  diff: SurveyDiff;
  merged: SurveySnapshot;
  decisions: MergeDecisions;
  resolve: (hunk: MergeHunk) => MergeSide;
  definitions: Record<string, BlockDefinition>;
  showDeclined: boolean;
}

const MergeCanvasInner = ({ diff, merged, decisions, resolve, definitions, showDeclined }: MergeCanvasProps) => {
  const { select, selectedKey, highlightPath } = useMergeActions();
  const { fitView } = useReactFlow();
  const graph = useMemo(
    () => buildMergeGraph({ diff, merged, decisions, resolve, definitions, showDeclined }),
    [diff, merged, decisions, resolve, definitions, showDeclined]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [needsLayout, setNeedsLayout] = useState(true);
  const initialised = useNodesInitialized();
  const laidOut = useRef(false);

  useEffect(() => {
    setNodes((existing) => {
      const positions = new Map(existing.map((node) => [node.id, node]));
      const sameShape = existing.length === graph.nodes.length && graph.nodes.every((node) => positions.has(node.id));
      if (!sameShape) setNeedsLayout(true);
      return graph.nodes.map((node) => {
        const previous = positions.get(node.id);
        return previous ? { ...node, position: previous.position, measured: previous.measured, selected: node.id === selectedKey } : { ...node, selected: node.id === selectedKey };
      }) as Node[];
    });
    setEdges(graph.edges as Edge[]);
  }, [graph, setNodes, setEdges, selectedKey]);

  useEffect(() => {
    if (!needsLayout || !initialised || nodes.length === 0) return;
    const measured = nodes.every((node) => node.measured?.width && node.measured?.height);
    if (!measured) return;
    let cancelled = false;
    getLayoutedElements(nodes, edges, 'TB').then((layout) => {
      if (cancelled) return;
      setNodes([...layout.nodes]);
      setEdges([...layout.edges]);
      setNeedsLayout(false);
      if (!laidOut.current) {
        laidOut.current = true;
        setTimeout(() => fitView({ padding: 0.25, duration: 400, maxZoom: 0.9 }), 50);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needsLayout, initialised, nodes, edges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
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
      nodesConnectable={false}
      nodesDraggable
      nodesFocusable={false}
      autoPanOnNodeFocus={false}
      elementsSelectable
      minZoom={0.1}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      className="merge-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
};

export const MergeCanvas = (props: MergeCanvasProps) => (
  <ReactFlowProvider>
    <MergeCanvasInner {...props} />
  </ReactFlowProvider>
);
