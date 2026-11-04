import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react';
import { memo } from 'react';
import { useDarkMode } from '../../builder/flowv3/utils/useDarkMode';
import { hasFocus, isPathHighlighted, useMergeActions } from './MergeContext';
import type { MergeEdgeData } from './mergeGraph';
import { EDGE_COLORS } from './status';

const MergeEdgeInner = ({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, markerEnd }: EdgeProps<Edge<MergeEdgeData>>) => {
  const dark = useDarkMode();
  const actions = useMergeActions();
  const status = data?.status ?? 'kept';
  const colors = EDGE_COLORS[status];
  const color = dark ? colors.dark : colors.light;
  const highlighted = isPathHighlighted(actions, data?.key, source, target);
  const dimmed = hasFocus(actions) && !highlighted;
  const pick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data?.key) actions.highlightPath({ key: data.key, source, target });
  };
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const text = typeof label === 'string' ? label : data?.label;
  const prefix = status === 'added' ? 'New path' : status === 'removed' ? 'Removed path' : status === 'declined' ? 'Not taken' : '';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={16}
        style={{
          stroke: color,
          strokeWidth: highlighted ? 4 : status === 'added' ? 2.5 : 1.5,
          strokeDasharray: colors.dashed ? '6 4' : undefined,
          opacity: dimmed ? 0.18 : status === 'declined' ? 0.7 : 1,
          filter: highlighted ? `drop-shadow(0 0 4px ${color})` : undefined,
          transition: 'opacity 150ms, stroke-width 150ms',
        }}
      />
      {(text || prefix) && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan pointer-events-auto absolute flex max-w-[200px] cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-left text-[10px] leading-tight shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: dark ? '#0f172a' : '#ffffff',
              borderColor: color,
              borderWidth: highlighted ? 2 : 1,
              color: dark ? '#e2e8f0' : '#334155',
              opacity: dimmed ? 0.3 : 1,
              boxShadow: highlighted ? `0 0 0 3px ${color}33` : undefined,
            }}
            title={prefix ? `${prefix}${text ? `: ${text}` : ''}` : text}
            onClick={pick}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span className="truncate">{text || prefix}</span>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const MergeEdge = memo(MergeEdgeInner);
MergeEdge.displayName = 'MergeEdge';
