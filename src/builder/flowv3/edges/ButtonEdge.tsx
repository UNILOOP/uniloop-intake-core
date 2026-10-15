import React, { memo, useCallback, useMemo, useState, useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useNodes,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { Plus, X, Pencil } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useDarkMode } from "../utils/useDarkMode";
import { useBlocksMap } from "../utils/BlocksMapContext";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { isBlockLinkLocked } from "../../../utils/blockLock";
import {
  calculateEdgePath,
  type NodeBounds,
} from "../utils/pathfinding";

// Edge data interface for type safety
interface ButtonEdgeData {
  insertIndex?: number;
  targetBlockId?: string;
  sourceBlockId?: string;
  rule?: unknown;
  ruleIndex?: number;
  weight?: number;
  edgeIndex?: number; // Index of this edge among parallel edges from same source
  totalParallelEdges?: number; // Total number of edges from the same source
  isHighlighted?: boolean; // Whether this edge is connected to a selected node
  edgeType?: 'default' | 'start' | 'conditional' | 'sequential'; // Type for styling
}

// Edge colors that work in both light and dark modes
// Using CSS custom properties would be ideal but React Flow styles need inline values
const EDGE_COLORS = {
  light: {
    default: '#64748b',      // slate-500
    start: '#10b981',        // emerald-500
    conditional: '#0ea5e9',  // sky-500 (less harsh than blue-500)
    sequential: '#94a3b8',   // slate-400
    selected: '#6366f1',     // indigo-500
    highlighted: '#a855f7',  // purple-500
  },
  dark: {
    default: '#94a3b8',      // slate-400
    start: '#34d399',        // emerald-400
    conditional: '#38bdf8',  // sky-400
    sequential: '#64748b',   // slate-500
    selected: '#818cf8',     // indigo-400
    highlighted: '#c084fc',  // purple-400
  }
};

// Convert React Flow nodes to NodeBounds format for pathfinding
const nodesToBounds = (nodes: ReturnType<typeof useNodes>): NodeBounds[] => {
  return nodes
    .filter(node => node.position && node.measured?.width && node.measured?.height)
    .map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width ?? 400,
      height: node.measured?.height ?? 150,
    }));
};


const ButtonEdgeInner = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label,
  selected,
}: EdgeProps) => {
  const edgeData = data as ButtonEdgeData | undefined;
  const isDarkMode = useDarkMode();
  const flowNodes = useNodes();
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  const { state } = useSurveyBuilder();
  const blocksMap = useBlocksMap();

  // A locked source block keeps its links, so hide the controls that would change them.
  const sourceBlock = blocksMap.get(source);
  const sourceDefinition = sourceBlock && state.definitions.blocks[sourceBlock.type];
  const rulesLocked = isBlockLinkLocked(sourceBlock, sourceDefinition, true);
  const nextStepLocked = isBlockLinkLocked(sourceBlock, sourceDefinition, false);

  // State for reconnection drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  // Convert flow nodes to bounds for pathfinding
  const nodeBounds = useMemo(() => nodesToBounds(flowNodes), [flowNodes]);

  // Parallel edge info for offsetting overlapping edges
  const edgeIndex = edgeData?.edgeIndex ?? 0;
  const totalParallelEdges = edgeData?.totalParallelEdges ?? 1;

  // Calculate parallel offset for this edge
  const parallelOffset = useMemo(() => {
    return totalParallelEdges > 1
      ? (edgeIndex - (totalParallelEdges - 1) / 2) * 30
      : 0;
  }, [edgeIndex, totalParallelEdges]);

  // Calculate the effective target position - use drag position when dragging
  const effectiveTargetX = isDragging && dragPosition ? dragPosition.x : targetX + parallelOffset;
  const effectiveTargetY = isDragging && dragPosition ? dragPosition.y : targetY;

  const { edgePath, labelX, labelY, actualTargetX, actualTargetY } = useMemo(() => {
    // Validate coordinates - use fallback if invalid
    if (!isFinite(sourceX) || !isFinite(sourceY) || !isFinite(effectiveTargetX) || !isFinite(effectiveTargetY)) {
      return {
        edgePath: `M 0 0 L 0 0`,
        labelX: 0,
        labelY: 0,
        actualTargetX: effectiveTargetX,
        actualTargetY: effectiveTargetY,
      };
    }

    // When dragging, use a simple smooth path to the cursor
    if (isDragging && dragPosition) {
      const [path, lx, ly] = getSmoothStepPath({
        sourceX: sourceX + parallelOffset,
        sourceY,
        sourcePosition,
        targetX: effectiveTargetX,
        targetY: effectiveTargetY,
        targetPosition,
        borderRadius: 16,
      });

      return {
        edgePath: path,
        labelX: lx,
        labelY: ly,
        actualTargetX: effectiveTargetX,
        actualTargetY: effectiveTargetY,
      };
    }

    // Calculate path with collision detection
    const pathResult = calculateEdgePath(
      sourceX, sourceY, targetX, targetY,
      nodeBounds, source, target,
      edgeIndex, totalParallelEdges
    );

    if (!pathResult.needsRouting) {
      // No obstacles - use smooth step path for direct connections
      const [path, lx, ly] = getSmoothStepPath({
        sourceX: sourceX + parallelOffset,
        sourceY,
        sourcePosition,
        targetX: targetX + parallelOffset,
        targetY,
        targetPosition,
        borderRadius: 16,
      });

      const adjustedLabelY = ly + (edgeIndex * 25);
      return {
        edgePath: path,
        labelX: lx,
        labelY: adjustedLabelY,
        actualTargetX: targetX + parallelOffset,
        actualTargetY: targetY,
      };
    }

    // Use the routed path that avoids obstacles
    // For routed paths, the end point is at the target with offset
    return {
      edgePath: pathResult.path,
      labelX: pathResult.labelX,
      labelY: pathResult.labelY,
      actualTargetX: targetX + parallelOffset,
      actualTargetY: targetY,
    };
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, nodeBounds, source, target, edgeIndex, totalParallelEdges, parallelOffset, isDragging, dragPosition, effectiveTargetX, effectiveTargetY]);

  // Memoize data extraction to avoid recalculating on every render
  const { isExplicitRule, hasRuleIndex, showInsertButton, insertIndex, ruleIndex } = useMemo(() => ({
    isExplicitRule: !!edgeData?.rule,
    hasRuleIndex: typeof edgeData?.ruleIndex === 'number',
    showInsertButton: typeof edgeData?.insertIndex === 'number',
    insertIndex: edgeData?.insertIndex,
    ruleIndex: edgeData?.ruleIndex,
  }), [edgeData?.rule, edgeData?.ruleIndex, edgeData?.insertIndex]);

  // Inserting a block re-points this link to the new block, so a locked link gets no insert button.
  const linkLocked = isExplicitRule ? rulesLocked : nextStepLocked;
  const canInsert = showInsertButton && !linkLocked;

  // Only show start/end + buttons when this is the only edge from source
  // This prevents confusion when multiple edges share the same origin point
  const showEndpointButtons = canInsert && totalParallelEdges <= 1;

  // Stable callback references
  const onInsertClick = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (typeof insertIndex === 'number') {
      window.dispatchEvent(new CustomEvent('flow-v3-add-block', {
        detail: {
          insertIndex,
          targetBlockId: edgeData?.targetBlockId,
          sourceBlockId: edgeData?.sourceBlockId,
          rule: edgeData?.rule
        }
      }));
    }
  }, [insertIndex, edgeData?.targetBlockId, edgeData?.sourceBlockId, edgeData?.rule]);

  const onDeleteClick = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    window.dispatchEvent(new CustomEvent('flow-v3-delete-edge', {
      detail: { id, source, target, rule: edgeData?.rule }
    }));
  }, [id, source, target, edgeData?.rule]);

  const onEditClick = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (typeof ruleIndex === 'number') {
      window.dispatchEvent(new CustomEvent('flow-v3-edit-edge', {
        detail: { source, ruleIndex }
      }));
    }
  }, [source, ruleIndex]);

  // Refs for optimized drag handling
  const rafRef = useRef<number | null>(null);
  const autoPanRef = useRef<number | null>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  // Auto-pan settings
  const AUTO_PAN_EDGE = 50; // Distance from edge to start panning
  const AUTO_PAN_SPEED = 15; // Pixels to pan per frame

  // Reconnection drag handlers - optimized with RAF throttling
  const handleReconnectMouseDown = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    setIsDragging(true);

    // Store reference to the handle wrapper (parent div) to hide it during drop detection
    const handleElement = evt.currentTarget as HTMLElement;
    const wrapperElement = handleElement.parentElement;

    // Get the React Flow container for bounds
    const reactFlowContainer = document.querySelector('.react-flow');
    const containerRect = reactFlowContainer?.getBoundingClientRect();

    // Auto-pan function - runs continuously while dragging near edges
    const autoPan = () => {
      if (!lastMousePos.current || !containerRect) {
        autoPanRef.current = requestAnimationFrame(autoPan);
        return;
      }

      const { x: clientX, y: clientY } = lastMousePos.current;
      const viewport = getViewport();
      let dx = 0;
      let dy = 0;

      // Check if near edges and calculate pan direction
      if (clientX < containerRect.left + AUTO_PAN_EDGE) {
        dx = AUTO_PAN_SPEED; // Pan right (move viewport left)
      } else if (clientX > containerRect.right - AUTO_PAN_EDGE) {
        dx = -AUTO_PAN_SPEED; // Pan left (move viewport right)
      }

      if (clientY < containerRect.top + AUTO_PAN_EDGE) {
        dy = AUTO_PAN_SPEED; // Pan down (move viewport up)
      } else if (clientY > containerRect.bottom - AUTO_PAN_EDGE) {
        dy = -AUTO_PAN_SPEED; // Pan up (move viewport down)
      }

      // Apply pan if needed
      if (dx !== 0 || dy !== 0) {
        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
          zoom: viewport.zoom,
        });

        // Also update drag position to follow the pan
        const flowPos = screenToFlowPosition(lastMousePos.current);
        setDragPosition(flowPos);
      }

      autoPanRef.current = requestAnimationFrame(autoPan);
    };

    // Start auto-pan loop
    autoPanRef.current = requestAnimationFrame(autoPan);

    // Throttled update using requestAnimationFrame
    const updatePosition = () => {
      if (lastMousePos.current) {
        const flowPos = screenToFlowPosition(lastMousePos.current);
        setDragPosition(flowPos);
      }
      rafRef.current = null;
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      lastMousePos.current = { x: moveEvt.clientX, y: moveEvt.clientY };

      // Only schedule update if one isn't pending
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const handleMouseUp = (upEvt: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Cancel any pending RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Cancel auto-pan
      if (autoPanRef.current) {
        cancelAnimationFrame(autoPanRef.current);
        autoPanRef.current = null;
      }

      // Temporarily hide the entire handle wrapper to detect elements underneath
      if (wrapperElement) {
        wrapperElement.style.display = 'none';
      }

      // Find if we're over a node
      const element = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
      const nodeElement = element?.closest('.react-flow__node');

      // Restore visibility
      if (wrapperElement) {
        wrapperElement.style.display = '';
      }

      // Prevent the click event that follows mouseup from triggering node actions
      const preventClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      document.addEventListener('click', preventClick, { capture: true, once: true });
      // Remove after a tick in case no click fires
      setTimeout(() => document.removeEventListener('click', preventClick, { capture: true }), 100);

      setIsDragging(false);
      setDragPosition(null);
      lastMousePos.current = null;

      if (nodeElement) {
        const newTargetId = nodeElement.getAttribute('data-id');
        if (newTargetId && newTargetId !== source && newTargetId !== target) {
          // Dispatch reconnect event
          window.dispatchEvent(new CustomEvent('flow-v3-reconnect-edge', {
            detail: {
              edgeId: id,
              source,
              oldTarget: target,
              newTarget: newTargetId,
              rule: edgeData?.rule,
              ruleIndex: edgeData?.ruleIndex
            }
          }));
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, source, target, edgeData?.rule, edgeData?.ruleIndex, screenToFlowPosition, getViewport, setViewport]);

  // Check if edge is highlighted (connected to selected node)
  const isHighlighted = edgeData?.isHighlighted ?? false;
  const edgeType = edgeData?.edgeType ?? 'default';

  // Memoize edge style computation to avoid recalculating on every render
  const edgeStyle = useMemo(() => {
    const colors = isDarkMode ? EDGE_COLORS.dark : EDGE_COLORS.light;

    // When dragging, use a distinct style
    if (isDragging) {
      return {
        ...style,
        stroke: '#3b82f6', // blue-500
        strokeWidth: 3,
        strokeDasharray: undefined,
        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
      };
    }

    // Determine base stroke color based on edge type
    const baseStrokeColor = (() => {
      switch (edgeType) {
        case 'start': return colors.start;
        case 'conditional': return colors.conditional;
        case 'sequential': return colors.sequential;
        default: return colors.default;
      }
    })();

    // Stroke width is always 2 for base
    const baseStrokeWidth = 2;

    // Stroke dash array for sequential edges
    const strokeDasharray = edgeType === 'sequential' ? '5,5' : undefined;

    return {
      ...style,
      stroke: selected ? colors.selected : isHighlighted ? colors.highlighted : baseStrokeColor,
      strokeWidth: selected ? 5 : isHighlighted ? 3 : baseStrokeWidth,
      strokeDasharray,
    };
  }, [isDarkMode, edgeType, selected, isHighlighted, style, isDragging]);

  // z-index for EdgeLabelRenderer elements (these are HTML, so CSS z-index works)
  // Both selected and highlighted edges should render above nodes
  const labelZIndex = selected || isHighlighted ? 1000 : 0;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        interactionWidth={25}
      />

      <EdgeLabelRenderer>
        {/* Label / Edit / Delete Container - Always visible when there's a label or explicit rule */}
        {(label || isExplicitRule) && (
          <div
            style={{
              position: "absolute",
              // Center on the label position
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 12}px)`,
              pointerEvents: "all",
              zIndex: labelZIndex,
            }}
            className="nodrag nopan flex flex-col items-center gap-1"
          >
            {/* Label row */}
            {label && (
              <div className={`px-2 py-1 text-wrap border rounded text-[10px] font-medium shadow-sm max-w-[150px] text-center ${selected ? 'bg-primary border-primary text-white dark:bg-primary dark:border-primary' : isHighlighted ? 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                {String(label).length > 30 ? `${String(label).slice(0, 30)}...` : String(label)}
              </div>
            )}

            {/* Actions row - horizontal */}
            <div className="flex items-center gap-1">
              {/* Edit button for explicit rules */}
              {isExplicitRule && hasRuleIndex && !rulesLocked && (
                <button
                  className="h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:border-amber-500 dark:hover:text-amber-400 dark:hover:border-amber-400 flex items-center justify-center shadow-sm transition-colors"
                  onClick={onEditClick}
                  title="Edit Rule"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              )}

              {isExplicitRule && !rulesLocked && (
                <button
                  className="h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-500 dark:hover:text-red-400 dark:hover:border-red-400 flex items-center justify-center shadow-sm transition-colors"
                  onClick={onDeleteClick}
                  title="Delete Connection"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Reconnection Handle */}
              {source !== 'start' && !isDragging && !linkLocked && (
                <div
                  onMouseDown={handleReconnectMouseDown}
                  className="h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:border-blue-500 dark:hover:text-blue-400 dark:hover:border-blue-400 flex items-center justify-center shadow-sm transition-colors cursor-grab active:cursor-grabbing"
                  title="Drag to reconnect to a different block"
                >
                  <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insert Button - At the start of the edge (near source) */}
        {canInsert && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${sourceX + parallelOffset}px,${sourceY + 35}px)`,
              pointerEvents: "all",
              zIndex: labelZIndex
            }}
            className="nodrag nopan"
          >
            <Button
              variant="outline"
              size="icon"
              className={`h-6 w-6 rounded-full border shadow-sm p-0 transition-colors ${selected ? 'border-primary bg-primary text-white dark:bg-primary' : isHighlighted ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : 'border-primary/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20'}`}
              onClick={onInsertClick}
              title="Insert Block"
            >
              <Plus className="h-3.5 w-3.5 text-current" />
            </Button>
          </div>
        )}

        {/* Reconnection Handle for edges without labels (sequential edges) - centered on edge */}
        {!label && !isExplicitRule && source !== 'start' && !isDragging && !nextStepLocked && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: labelZIndex,
            }}
            className="nodrag nopan"
          >
            <div
              onMouseDown={handleReconnectMouseDown}
              className="h-5 w-5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:border-blue-500 dark:hover:text-blue-400 dark:hover:border-blue-400 flex items-center justify-center shadow-sm transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reconnect to a different block"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Insert Button - Near Target (appears on hover) */}
        {/* Only shown when this is the only edge from source to avoid ambiguity */}
        {showEndpointButtons && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 40}px)`,
              pointerEvents: "all",
              zIndex: labelZIndex
            }}
            className="nodrag nopan group/end"
          >
            <Button
              variant="outline"
              size="icon"
              className="h-5 w-5 rounded-full border shadow-sm p-0 transition-all opacity-0 group-hover/end:opacity-100 hover:!opacity-100 border-amber-500 dark:border-amber-400 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-110"
              onClick={onInsertClick}
              title="Insert Block Before Target"
            >
              <Plus className="h-3 w-3 text-current" />
            </Button>
          </div>
        )}

        {/* Floating drag handle that follows cursor while dragging */}
        {isDragging && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${actualTargetX}px,${actualTargetY}px)`,
              pointerEvents: "none",
              zIndex: 1001,
            }}
            className="nodrag nopan"
          >
            <div className="w-7 h-7 bg-blue-500 border-2 border-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

// Custom areEqual function for edge memoization
// Edges re-render frequently due to position changes, so we check only meaningful props
const areEdgePropsEqual = (prevProps: EdgeProps, nextProps: EdgeProps): boolean => {
  // Check selection state
  if (prevProps.selected !== nextProps.selected) return false;

  // Check label
  if (prevProps.label !== nextProps.label) return false;

  // Check critical position values (significant changes only)
  // Allow small position changes without re-render
  const posTolerance = 1;
  if (Math.abs(prevProps.sourceX - nextProps.sourceX) > posTolerance) return false;
  if (Math.abs(prevProps.sourceY - nextProps.sourceY) > posTolerance) return false;
  if (Math.abs(prevProps.targetX - nextProps.targetX) > posTolerance) return false;
  if (Math.abs(prevProps.targetY - nextProps.targetY) > posTolerance) return false;

  // Check data object (shallow compare important fields)
  const prevData = prevProps.data as ButtonEdgeData | undefined;
  const nextData = nextProps.data as ButtonEdgeData | undefined;

  if (prevData?.insertIndex !== nextData?.insertIndex) return false;
  if (prevData?.ruleIndex !== nextData?.ruleIndex) return false;
  if (prevData?.rule !== nextData?.rule) return false;
  if (prevData?.isHighlighted !== nextData?.isHighlighted) return false;
  if (prevData?.edgeType !== nextData?.edgeType) return false;

  return true;
};

export const ButtonEdge = memo(ButtonEdgeInner, areEdgePropsEqual);
