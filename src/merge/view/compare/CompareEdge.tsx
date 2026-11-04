import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useNodes, type EdgeProps } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { useDarkMode } from '../../../builder/flowv3/utils/useDarkMode';
import { hasFocus, isPathHighlighted, useMergeActions } from '../MergeContext';
import { EDGE_COLORS } from '../status';
import type { CompareEdgeType } from './compareColumns';
import { calculateEdgePath, type NodeBounds } from '../../../builder/flowv3/utils/pathfinding';

const CompareEdgeInner = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  markerEnd,
}: EdgeProps<CompareEdgeType>) => {
  const dark = useDarkMode();
  const actions = useMergeActions();
  const nodes = useNodes();
  const bounds = useMemo<NodeBounds[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? 300,
        height: node.measured?.height ?? 96,
      })),
    [nodes]
  );
  const status = data?.status ?? 'kept';
  const colors = EDGE_COLORS[status];
  const color = dark ? colors.dark : colors.light;
  const highlighted = isPathHighlighted(actions, data?.key, source, target);
  const dimmed = hasFocus(actions) && !highlighted;
  const pick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data?.key) actions.highlightPath({ key: data.key, source, target });
  };
  const edgeIndex = data?.edgeIndex ?? 0;
  const parallelCount = data?.totalParallelEdges ?? 1;
  const parallelOffset = parallelCount > 1 ? (edgeIndex - (parallelCount - 1) / 2) * 30 : 0;
  const routed = calculateEdgePath(sourceX, sourceY, targetX, targetY, bounds, source, target, edgeIndex, parallelCount);
  const [smoothPath, smoothLabelX, smoothLabelY] = getSmoothStepPath({
    sourceX: sourceX + parallelOffset,
    sourceY,
    targetX: targetX + parallelOffset,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });
  const path = routed.needsRouting ? routed.path : smoothPath;
  const labelX = routed.needsRouting ? routed.labelX : smoothLabelX;
  const labelY = routed.needsRouting ? routed.labelY : smoothLabelY + edgeIndex * 25;
  const faint = status === 'kept' && !highlighted;
  const sequential = data?.edgeType === 'sequential' || data?.edgeType === 'start';
  const text = typeof label === 'string' ? label : (data?.label ?? (sequential && status !== 'kept' ? 'Next step' : undefined));
  const title = status === 'added' ? 'New path' : status === 'removed' ? 'Removed path' : status === 'declined' ? 'Path not taken' : 'Path';
  const labelTransform = `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={16}
        style={{
          stroke: color,
          strokeWidth: highlighted ? 4 : status === 'kept' ? 1.5 : 2.5,
          strokeDasharray: colors.dashed ? '6 4' : undefined,
          fill: 'none',
          opacity: dimmed ? 0.18 : faint ? 0.35 : 1,
          filter: highlighted ? `drop-shadow(0 0 4px ${color})` : undefined,
          transition: 'opacity 150ms, stroke-width 150ms',
        }}
      />
      {text && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan pointer-events-auto absolute flex max-w-[240px] cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-left text-[10px] leading-tight shadow-sm"
            style={{
              transform: labelTransform,
              background: dark ? '#0f172a' : '#ffffff',
              borderColor: color,
              borderWidth: highlighted ? 2 : 1,
              color: dark ? '#e2e8f0' : '#334155',
              zIndex: highlighted ? 6 : 5,
              opacity: dimmed ? 0.3 : 1,
              boxShadow: highlighted ? `0 0 0 3px ${color}33` : undefined,
            }}
            title={`${title}: ${text}`}
            onClick={pick}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span className="whitespace-normal break-words">{text}</span>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const CompareEdge = memo(CompareEdgeInner);
CompareEdge.displayName = 'CompareEdge';
