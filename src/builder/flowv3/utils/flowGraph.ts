import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { BlockData, BlockDefinition } from "../../../types";
import { areAllOptionsCoveredByRules } from "../../../utils/conditionalUtils";
import { getHumanReadableCondition } from "./conditionLabel";

export interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/** The node a navigation target leads to: a block by uuid, then by field name, else submit. */
export const resolveFlowTarget = (target: string, blocks: BlockData[], blocksMap: Map<string, BlockData>): string => {
  if (!target || target === "submit" || target === "end") return "submit";
  const targetBlock = blocksMap.get(target);
  if (targetBlock) return targetBlock.uuid || "";
  const blockByFieldName = blocks.find((b) => b.fieldName === target);
  return blockByFieldName ? blockByFieldName.uuid || "" : "submit";
};

/**
 * The React Flow nodes and edges of a pageless form: a start node, one node per
 * block, a submit node, and the paths between them: explicit navigation rules and
 * the sequential fallback where no rule covers it. Shared by the flow builder and
 * the merge view so both draw the same graph.
 */
export function buildFlowGraph(blocks: BlockData[], definitions: Record<string, BlockDefinition> = {}): FlowGraph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const blocksMap = new Map<string, BlockData>();
  blocks.forEach((block) => {
    if (block.uuid) blocksMap.set(block.uuid, block);
  });
  const resolveNavigationTarget = (target: string): string => resolveFlowTarget(target, blocks, blocksMap);

  // --- 1. Create Nodes ---
  nodes.push({
    id: "start",
    type: "input",
    data: { label: "Start Survey" },
    position: { x: 0, y: 0 },
    className: "flow-start-node",
  });

  blocks.forEach((block, index) => {
    nodes.push({
      id: block.uuid || `block-${index}`,
      type: "survey-node",
      data: { block, index },
      position: { x: 0, y: 0 }, // Layout will set this
    });
  });

  nodes.push({
    id: "submit",
    type: "output",
    data: { label: "Submit / End" },
    position: { x: 0, y: 0 },
    className: "flow-submit-node",
  });

  // --- 2. Create Edges ---
  if (blocks.length === 0) {
    edges.push({
      id: "start-to-submit",
      source: "start",
      target: "submit",
      type: "button-edge",
      data: { insertIndex: 0, weight: 2, edgeType: "default" },
      markerEnd: { type: MarkerType.ArrowClosed },
    });
    return { nodes, edges };
  }

  const firstBlockId = blocks[0].uuid || "block-0";
  edges.push({
    id: "start-to-first",
    source: "start",
    target: firstBlockId,
    type: "button-edge",
    data: { insertIndex: 0, weight: 2, edgeType: "start" },
    markerEnd: { type: MarkerType.ArrowClosed },
  });

  // Track edges from each source to assign parallel offsets
  const sourceEdgeCount: Record<string, number> = {};

  blocks.forEach((block, index) => {
    const blockId = block.uuid || `block-${index}`;
    const navRules = block.navigationRules || [];

    // Determine target for sequential flow first
    let nextBlockId = index < blocks.length - 1 ? blocks[index + 1].uuid || `block-${index + 1}` : "submit";
    if (block.nextBlockId) nextBlockId = block.nextBlockId;
    if (block.isEndBlock) nextBlockId = "submit";

    // Count total edges from this source (for parallel offset calculation)
    const totalEdgesFromSource =
      navRules.length +
      (navRules.some((r) => r.isDefault || !r.condition) || navRules.some((rule) => resolveNavigationTarget(rule.target) === nextBlockId)
        ? 0
        : 1);

    // Explicit Navigation Rules
    navRules.forEach((rule, ruleIndex) => {
      const targetId = resolveNavigationTarget(rule.target);
      if (!targetId) return;
      const isSequentialPath = targetId === nextBlockId;
      const edgeIndexFromSource = sourceEdgeCount[blockId] || 0;
      sourceEdgeCount[blockId] = edgeIndexFromSource + 1;

      edges.push({
        id: `${blockId}-nav-${ruleIndex}`,
        source: blockId,
        target: targetId,
        label: rule.isDefault ? "Default" : getHumanReadableCondition(rule.condition, blocks, definitions),
        type: "button-edge",
        animated: !rule.isDefault,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          rule,
          ruleIndex,
          insertIndex: index + 1,
          targetBlockId: targetId,
          sourceBlockId: blockId,
          weight: isSequentialPath ? 2 : 1,
          edgeIndex: edgeIndexFromSource,
          totalParallelEdges: totalEdgesFromSource,
          edgeType: rule.isDefault ? "default" : "conditional",
        },
      });
    });

    // Implicit Sequential Fallback
    const hasDefaultRule = navRules.some((r) => r.isDefault || !r.condition);
    const hasRuleToNextBlock = navRules.some((rule) => resolveNavigationTarget(rule.target) === nextBlockId);
    const allOptionsCovered = areAllOptionsCoveredByRules(block, nextBlockId, definitions[block.type]);

    if (!hasDefaultRule && !hasRuleToNextBlock && !allOptionsCovered) {
      const edgeIndexFromSource = sourceEdgeCount[blockId] || 0;
      sourceEdgeCount[blockId] = edgeIndexFromSource + 1;

      edges.push({
        id: `${blockId}-seq-${nextBlockId}`,
        source: blockId,
        target: nextBlockId,
        type: "button-edge",
        data: {
          insertIndex: index + 1,
          targetBlockId: nextBlockId,
          sourceBlockId: blockId,
          weight: 2,
          edgeIndex: edgeIndexFromSource,
          totalParallelEdges: totalEdgesFromSource,
          edgeType: "sequential",
        },
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  });

  return { nodes, edges };
}
