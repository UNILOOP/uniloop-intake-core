import React, { memo, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import type { FlowV3NodeData } from "../types";
import { cn } from "../../../lib/utils";
import { BlockData } from "../../../types";
import { CircleDot, GripVertical, PieChart, Settings, Trash2, GitBranch, Replace } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { useBlocksMap } from "../utils/BlocksMapContext";

// Custom Node Component - Performance optimized
// Using areEqual comparison to prevent unnecessary re-renders
const SurveyNodeInner = ({ id, data, selected }: NodeProps<Node<FlowV3NodeData>>) => {
  const { state } = useSurveyBuilder();
  const { deleteElements } = useReactFlow();
  const blocksMap = useBlocksMap();

  // Get fresh block data using O(1) Map lookup instead of O(n) Array.find
  // OPTIMIZED: Uses context-provided blocksMap for efficient lookup
  const block = useMemo(() => {
    const blockFromData = data.block;
    if (!blockFromData.uuid) return blockFromData;
    // O(1) lookup via Map
    const freshBlock = blocksMap.get(blockFromData.uuid);
    return freshBlock || blockFromData;
  }, [data.block, blocksMap]);

  // Memoize block definition lookup
  const blockDefinition = useMemo(
    () => state.definitions.blocks[block.type],
    [state.definitions.blocks, block.type]
  );

  // Stable reference for delete - only depends on id and deleteElements
  const handleDelete = useCallback((e?: React.MouseEvent) => {
      e?.stopPropagation();
      deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  // Stable reference - only depends on id and block.uuid
  const handleConfigure = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('flow-v3-configure-node', {
      detail: { nodeId: id, blockUuid: block.uuid }
    }));
  }, [id, block.uuid]);

  // Stable reference - only depends on block.uuid
  const handleReplace = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('flow-v3-replace-block', {
      detail: { blockUuid: block.uuid }
    }));
  }, [block.uuid]);

  // Stable reference - only depends on block.uuid
  const handleAddBranch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('flow-v3-add-branch', {
      detail: { sourceBlockId: block.uuid }
    }));
  }, [block.uuid]);

  // Dispatch event for update instead of directly updating state
  // This removes the dependency on state.rootNode which changes frequently
  const handleUpdate = useCallback((updatedBlockData: BlockData) => {
    window.dispatchEvent(new CustomEvent('flow-v3-update-block', {
      detail: { blockUuid: block.uuid, data: updatedBlockData }
    }));
  }, [block.uuid]);


  // Check if deletion should be prevented
  const hasActiveRules = block.navigationRules && block.navigationRules.some(rule => 
    rule.target && rule.target !== "submit" && rule.target !== "end"
  );

  return (
    <div
      className={cn(
        "relative group bg-white dark:bg-slate-900 rounded-xl shadow-sm border-2 transition-all duration-200 min-w-[400px] max-w-[600px]",
        selected ? "border-primary ring-2 ring-primary/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
      )}
      style={{ zIndex: 10 }} // Ensure nodes appear above edge labels
    >
      {/* Target Handle (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-900"
      />

      <div 
        className={`flex items-center gap-2 px-3 py-2 border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl border-b'}`}
      >
        <div className="cursor-grab opacity-50 hover:opacity-100">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>


        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
          {blockDefinition?.icon || <CircleDot className="w-3.5 h-3.5" />}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate block">
            {blockDefinition?.name || block.type}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {block.abTest?.enabled && (
            <Badge variant="secondary" className="gap-1">
              <PieChart className="h-3 w-3" />
              A/B Testing ({block.abTest.variants.length} variants)
            </Badge>
          )}
        </div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {block.fieldName}
            </div>

      </div>


      {/* Node Actions Toolbar (Visible on Hover) */}
      <div className="absolute -top-3 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={handleAddBranch}
            title="Add Branch"
        >
            <GitBranch className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </Button>
        <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={handleConfigure}
            title="Configure Block"
        >
            <Settings className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </Button>
        <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={handleReplace}
            title="Replace Block"
        >
            <Replace className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </Button>
        {!hasActiveRules && (
          <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7 rounded-full shadow-sm border border-red-200 dark:border-red-800 hover:bg-red-600 dark:hover:bg-red-700"
              onClick={handleDelete}
              title="Delete Block"
          >
              <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="p-4" onDoubleClick={handleConfigure}>
        {/* Render the actual block content */}
        {blockDefinition?.renderItem ? (
           <div className="nodrag cursor-default" onMouseDown={(e) => e.stopPropagation()}>
            {blockDefinition.renderItem({
              data: block,
              onUpdate: handleUpdate,
              onRemove: handleDelete, 
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-500">
            Unknown Block Type: {block.type}
          </div>
        )}
      </div>

      {/* Source Handle (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
};

// Custom areEqual function for deep comparison of node props
// This prevents re-renders when only position changes or parent re-renders
const areEqual = (
  prevProps: NodeProps<Node<FlowV3NodeData>>,
  nextProps: NodeProps<Node<FlowV3NodeData>>
): boolean => {
  // Check selected state
  if (prevProps.selected !== nextProps.selected) return false;

  // Check block data - deep compare critical fields
  const prevBlock = prevProps.data.block;
  const nextBlock = nextProps.data.block;

  if (prevBlock.uuid !== nextBlock.uuid) return false;
  if (prevBlock.type !== nextBlock.type) return false;
  if (prevBlock.fieldName !== nextBlock.fieldName) return false;
  if (prevBlock.label !== nextBlock.label) return false;
  if (prevBlock.isEndBlock !== nextBlock.isEndBlock) return false;

  // Check navigation rules (shallow compare length and targets)
  const prevRules = prevBlock.navigationRules || [];
  const nextRules = nextBlock.navigationRules || [];
  if (prevRules.length !== nextRules.length) return false;

  // Check A/B test state
  if (prevBlock.abTest?.enabled !== nextBlock.abTest?.enabled) return false;
  if (prevBlock.abTest?.variants?.length !== nextBlock.abTest?.variants?.length) return false;

  return true;
};

export const SurveyNode = memo(SurveyNodeInner, areEqual);

SurveyNode.displayName = "SurveyNode";
