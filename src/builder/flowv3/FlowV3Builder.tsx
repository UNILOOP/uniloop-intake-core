import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  type OnConnect,
  type OnConnectEnd,
  Connection,
  Panel,
  OnConnectStart,
  type OnSelectionChangeFunc,
  type OnReconnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";

import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import { SurveyNode } from "./nodes/SurveyNode";
import { ButtonEdge } from "./edges/ButtonEdge";
import { getLayoutedElements } from "./utils/layout";
import type { BlockData } from "../../types";
import { FlowV2Sidebar } from "./FlowV2Sidebar";
import { FlowV2Toolbar } from "./FlowV2Toolbar";
import type { FlowV2Mode } from "./types";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { BlockSelectorDialog } from "./BlockSelectorDialog";
import { getHumanReadableCondition } from "./utils/conditionLabel";
import { areAllOptionsCoveredByRules } from "../../utils/conditionalUtils";
import { Button } from "../../components/ui/button";
import { BlocksMapProvider } from "./utils/BlocksMapContext";

import { Plus, ArrowUpToLine, ArrowDownToLine, Pencil } from "lucide-react";

// CRITICAL: Define nodeTypes and edgeTypes outside component to prevent re-creation
// This is a key React Flow optimization - these objects must be stable references
const nodeTypes = {
  "survey-node": SurveyNode,
} as const;

const edgeTypes = {
  "button-edge": ButtonEdge,
} as const;

interface FlowV3BuilderProps {
  onClose?: () => void;
}

const FlowV3BuilderInner: React.FC<FlowV3BuilderProps> = ({ onClose }) => {
  const { state, updateNode } = useSurveyBuilder();
  const { fitView, zoomIn, zoomOut, getNodes } = useReactFlow();

  
  const [mode, setMode] = useState<FlowV2Mode>("select");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Config Panel State
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [configMode, setConfigMode] = useState<"full" | "navigation-only">("full");
  const [editRuleIndex, setEditRuleIndex] = useState<number | undefined>(undefined);
  const [hideRemoveButton, setHideRemoveButton] = useState(false);

  // Block Selector State
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [branchSourceId, setBranchSourceId] = useState<string | null>(null);

  // Track if we are waiting for a layout update
  const [needsLayout, setNeedsLayout] = useState(false);

  // Track newly added node to pan to after layout
  const [pendingPanToNodeId, setPendingPanToNodeId] = useState<string | null>(null);

  // Track the "Insert Index" for the context menu/sidebar
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [insertTargetId, setInsertTargetId] = useState<string | null>(null);
  const [insertSourceId, setInsertSourceId] = useState<string | null>(null);
  const [insertRule, setInsertRule] = useState<any>(null);

  // Edge tooltip state
  const [edgeTooltip, setEdgeTooltip] = useState<{
    edgeId: string;
    x: number;
    y: number;
    sourceId: string;
    targetId: string;
    label?: string;
    ruleIndex?: number;
    isExplicitRule: boolean;
    // Insert block data
    insertIndex?: number;
    sourceBlockId?: string;
    targetBlockId?: string;
    rule?: any;
  } | null>(null);

  // Track selected nodes to highlight connected edges
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // OPTIMIZED: Memoized blocks array and lookup map for O(1) access
  const blocks = useMemo(() => {
    return (state.rootNode?.items || []) as BlockData[];
  }, [state.rootNode?.items]);

  const blocksMap = useMemo(() => {
    const map = new Map<string, BlockData>();
    blocks.forEach(block => {
      if (block.uuid) map.set(block.uuid, block);
    });
    return map;
  }, [blocks]);

  // Create a stable key from block structure to trigger re-computation when structure changes
  // OPTIMIZED: Uses targeted property extraction instead of full JSON.stringify
  // Includes: uuid, navigation rules (condition + target + isDefault), nextBlockId, isEndBlock
  const structuralKey = useMemo(() => {
    if (blocks.length === 0) return "";
    // Build a structural key from properties that affect graph structure and edge labels
    return blocks.map(block => {
      const rulesKey = block.navigationRules
        ? block.navigationRules.map(r => `${r.condition ?? ''}|${r.target}|${r.isDefault ? 1 : 0}`).join(';')
        : '';
      return `${block.uuid}|${block.type}|${block.nextBlockId ?? ''}|${block.isEndBlock ? 1 : 0}|${rulesKey}`;
    }).join('::');
  }, [blocks]);

  // Transform survey state to React Flow nodes/edges
  // This only runs when the STRUCTURE changes (not on every text edit)
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!state.rootNode || blocks.length === 0) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper to resolve target - OPTIMIZED: uses Map for O(1) lookup
    const resolveNavigationTarget = (target: string): string => {
      if (!target || target === "submit" || target === "end") return "submit";
      // First try direct UUID lookup (O(1))
      const targetBlock = blocksMap.get(target);
      if (targetBlock) return targetBlock.uuid || "";
      // Fallback to fieldName search if not found by UUID (rare case)
      const blockByFieldName = blocks.find((b) => b.fieldName === target);
      return blockByFieldName ? blockByFieldName.uuid || "" : "submit";
    };

    // --- 1. Create Nodes ---

    // Start Node - Uses emerald green, works well in both light and dark modes
    nodes.push({
      id: "start",
      type: "input",
      data: { label: "Start Survey" },
      position: { x: 0, y: 0 },
      className: 'flow-start-node',
    });

    // Block Nodes
    blocks.forEach((block, index) => {
      nodes.push({
        id: block.uuid || `block-${index}`,
        type: "survey-node",
        data: { block, index },
        position: { x: 0, y: 0 }, // Layout will set this
      });
    });

    // Submit Node - Uses primary color that adapts to dark mode
    nodes.push({
      id: "submit",
      type: "output",
      data: { label: "Submit / End" },
      position: { x: 0, y: 0 },
      className: 'flow-submit-node',
    });

    // --- 2. Create Edges ---

    if (blocks.length === 0) {
       edges.push({
        id: "start-to-submit",
        source: "start",
        target: "submit",
        type: "button-edge", // Use button edge to allow insert
        data: { insertIndex: 0, weight: 2, edgeType: 'default' },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    } else {
      // Start -> First Block
      const firstBlockId = blocks[0].uuid || "block-0";
      edges.push({
        id: "start-to-first",
        source: "start",
        target: firstBlockId,
        type: "button-edge",
        data: { insertIndex: 0, weight: 2, edgeType: 'start' },
        markerEnd: { type: MarkerType.ArrowClosed },
      });

      // Track edges from each source to assign parallel offsets
      const sourceEdgeCount: Record<string, number> = {};

      // Block Connections
      blocks.forEach((block, index) => {
        const blockId = block.uuid || `block-${index}`;
        const navRules = block.navigationRules || [];

        // Determine target for sequential flow first
        let nextBlockId = index < blocks.length - 1 ? blocks[index + 1].uuid || `block-${index + 1}` : "submit";

        if (block.nextBlockId) {
            nextBlockId = block.nextBlockId;
        }

        if (block.isEndBlock) {
            nextBlockId = "submit";
        }

        // Count total edges from this source (for parallel offset calculation)
        const totalEdgesFromSource = navRules.length +
          (navRules.some((r) => r.isDefault || !r.condition) ||
           navRules.some(rule => resolveNavigationTarget(rule.target) === nextBlockId) ? 0 : 1);

        // Explicit Navigation Rules
        navRules.forEach((rule, ruleIndex) => {
          const targetId = resolveNavigationTarget(rule.target);
          if (targetId) {
            // Check if this rule follows the sequential path
            const isSequentialPath = targetId === nextBlockId;

            // Track edge index from this source for parallel offset
            const edgeIndexFromSource = sourceEdgeCount[blockId] || 0;
            sourceEdgeCount[blockId] = edgeIndexFromSource + 1;

            edges.push({
              id: `${blockId}-nav-${ruleIndex}`,
              source: blockId,
              target: targetId,
              // Use human readable label
              label: rule.isDefault ? "Default" : getHumanReadableCondition(rule.condition, blocks),
              // ALWAYS use button-edge to show labels/delete buttons
              type: "button-edge",
              animated: !rule.isDefault,
              markerEnd: { type: MarkerType.ArrowClosed },
              data: {
                  rule,
                  ruleIndex, // Include rule index for editing
                  // ALWAYS provide insertIndex to allow insertion
                  insertIndex: index + 1,
                  targetBlockId: targetId,
                  sourceBlockId: blockId,
                  weight: isSequentialPath ? 2 : 1, // Give higher weight to sequential path
                  // Parallel edge info for offset calculation
                  edgeIndex: edgeIndexFromSource,
                  totalParallelEdges: totalEdgesFromSource,
                  // Edge type for styling
                  edgeType: rule.isDefault ? 'default' : 'conditional',
              }
            });
          }
        });

        // Implicit Sequential Fallback
        const hasDefaultRule = navRules.some((r) => r.isDefault || !r.condition);

        // Check if we already have a rule pointing to the next block
        const hasRuleToNextBlock = navRules.some(rule => {
             const targetId = resolveNavigationTarget(rule.target);
             return targetId === nextBlockId;
        });

        // Check if all options are covered by navigation rules pointing to non-sequential targets
        // If so, we don't need a fallback edge because every possible selection has a defined path
        const allOptionsCovered = areAllOptionsCoveredByRules(block, nextBlockId);

        if (!hasDefaultRule && !hasRuleToNextBlock && !allOptionsCovered) {
           // Track edge index from this source for parallel offset
           const edgeIndexFromSource = sourceEdgeCount[blockId] || 0;
           sourceEdgeCount[blockId] = edgeIndexFromSource + 1;

           edges.push({
            id: `${blockId}-seq-${nextBlockId}`,
            source: blockId,
            target: nextBlockId,
            type: "button-edge", // Allow insert on sequential edges
            data: {
                insertIndex: index + 1,
                targetBlockId: nextBlockId,
                sourceBlockId: blockId,
                weight: 2,
                // Parallel edge info for offset calculation
                edgeIndex: edgeIndexFromSource,
                totalParallelEdges: totalEdgesFromSource,
                // Edge type for styling
                edgeType: 'sequential',
            },
            animated: false,
            // No "Else" label
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        }
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey, blocks, blocksMap]); // Only recompute when structure actually changes

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Force sync nodes on mount synchronously before paint
  // This prevents React Flow from rendering stale cached nodes
  useLayoutEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setNeedsLayout(true);
  }, []); // Only on mount

  const hasInitialLayoutRef = useRef(false);
  
  // Effect to update nodes/edges when structure changes
  useEffect(() => {
      setNodes((currentNodes) => {
        const nodeMap = new Map(currentNodes.map(n => [n.id, n]));

        return initialNodes.map(node => {
          const existing = nodeMap.get(node.id);
          if (existing) {
             // Preserve position, measured dimensions, and selection state
             return {
               ...node,
               position: existing.position,
               measured: existing.measured,
               selected: existing.selected,
               // Ensure data is updated
               data: node.data
             };
          }
          return node;
        });
      });
      // Preserve isHighlighted state when updating edges
      setEdges((currentEdges) => {
        const edgeMap = new Map(currentEdges.map(e => [e.id, e]));
        return initialEdges.map(edge => {
          const existing = edgeMap.get(edge.id);
          if (existing && existing.data?.isHighlighted) {
            return { ...edge, data: { ...edge.data, isHighlighted: true } };
          }
          return edge;
        });
      });

      // Only trigger layout if structure changed (count diff)
      // Or if it's the very first load
      if (nodes.length !== initialNodes.length || edges.length !== initialEdges.length || initialNodes.length === 0) {
         setNeedsLayout(true);
      }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Trigger layout on initial mount
  useEffect(() => {
    if (!hasInitialLayoutRef.current) {
      setNeedsLayout(true);
    }
  }, []);

  // Effect to run layout when nodes are initialized or structure changed
  useEffect(() => {
    // Wait for nodes to be initialized and have measurements
    const allMeasured = nodes.every(n => n.measured && n.measured.width && n.measured.height);

    if (needsLayout && nodes.length > 0 && allMeasured) {
      let cancelled = false;

      // Use nodes/edges from state, not getNodes()/getEdges() which may have stale cached data
      getLayoutedElements(nodes, edges, "TB").then((layout) => {
        if (cancelled) return;

        setNodes([...layout.nodes]);
        setEdges([...layout.edges]);
        setNeedsLayout(false);

        // Only fit view on initial load
        if (!hasInitialLayoutRef.current) {
          setTimeout(() => fitView({ padding: 0.3, duration: 500, maxZoom: 0.85 }), 50);
          hasInitialLayoutRef.current = true;
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [needsLayout, nodes, edges, setNodes, setEdges, fitView]);

  // Effect to pan to newly added node after it appears in the graph
  // OPTIMIZED: Removed nodes dependency - uses retry mechanism instead
  useEffect(() => {
    if (!pendingPanToNodeId) return;

    let retryCount = 0;
    const maxRetries = 10;

    const tryPanToNode = () => {
      const node = getNodes().find(n => n.id === pendingPanToNodeId);
      if (node && node.position.x !== 0 && node.position.y !== 0) {
        // Node exists and has been positioned by layout
        fitView({
          nodes: [node],
          duration: 400,
          padding: 0.5,
          maxZoom: 0.85,
        });
        setPendingPanToNodeId(null);
      } else if (retryCount < maxRetries) {
        // Node not ready yet, retry
        retryCount++;
        setTimeout(tryPanToNode, 100);
      } else {
        // Give up after max retries
        setPendingPanToNodeId(null);
      }
    };

    // Initial delay to allow layout to start
    const timer = setTimeout(tryPanToNode, 200);
    return () => clearTimeout(timer);
  }, [pendingPanToNodeId, getNodes, fitView]);

  // Handle Node Deletion
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      if (!state.rootNode || !state.rootNode.items) return;

      const items = state.rootNode.items as BlockData[];
      
      // 1. Identify deleted block UUIDs and objects
      const deletedBlockUuids = new Set<string>();
      const deletedBlocks: BlockData[] = [];
      
      deletedNodes.forEach(n => {
          if (n.type === 'survey-node') {
              const block = (n.data as any).block as BlockData;
              if (block && block.uuid) {
                  deletedBlockUuids.add(block.uuid);
                  deletedBlocks.push(block);
              }
          }
      });

      if (deletedBlockUuids.size === 0) return;

      // 2. Check for Prevention: "We should not allow deletion of a node if it has conditional rules and valid targets exists"
      // Only prevent if the target is NOT also being deleted.
      const hasActiveRules = deletedBlocks.some(block => {
          return block.navigationRules && block.navigationRules.some(rule => {
             return rule.target && 
                    rule.target !== "submit" && 
                    rule.target !== "end" && 
                    !deletedBlockUuids.has(rule.target); // Target is still alive
          });
      });

      if (hasActiveRules) {
          // Ideally show a toast/alert here. For now we just prevent.
          console.warn("Cannot delete node with active navigation rules to valid targets.");
          // We need to "undo" the deletion in UI because React Flow optimistically removes them? 
          // Actually onNodesDelete is called *after* usually or we are responsible for state update. 
          // React Flow 'useNodesState' handles the visual removal. 
          // To "cancel", we would need to setNodes back to previous. 
          // But since we drive nodes from `initialNodes` (which comes from `state`), 
          // effectively doing nothing here *should* revert the deletion on next render 
          // because `state` hasn't changed!
          // We just need to trigger a re-render or ensure the nodes state syncs back.
          // calling updateNode with same state *might* trigger it, but let's rely on the fact we don't update state.
          
          // Force a re-sync to restore nodes
          setNodes(current => [...current]); 
          return;
      }

      // 3. Calculate "Bridge" targets for each deleted node
      const bridgeMap = new Map<string, string>(); // deletedUuid -> nextUuid (or "submit")

      deletedBlocks.forEach(block => {
          let nextId = "submit";
          
          // Priority 1: Explicit nextBlockId (if not deleted)
          if (block.nextBlockId && !deletedBlockUuids.has(block.nextBlockId)) {
              nextId = block.nextBlockId;
          } 
          // Priority 2: Sequential next (if not deleted)
          else {
              const currentIndex = items.findIndex(i => i.uuid === block.uuid);
              if (currentIndex !== -1 && currentIndex < items.length - 1) {
                  const nextItem = items[currentIndex + 1];
                  if (nextItem.uuid && !deletedBlockUuids.has(nextItem.uuid)) {
                      nextId = nextItem.uuid;
                  }
              }
          }
          bridgeMap.set(block.uuid!, nextId);
      });

      // 4. Filter out deleted items
      let updatedItems = items.filter(item => !deletedBlockUuids.has(item.uuid!));
      
      // 5. Update remaining items to bridge the gap
      updatedItems = updatedItems.map(item => {
          const newItem = { ...item };
          let modified = false;

          // Update nextBlockId
          if (newItem.nextBlockId && bridgeMap.has(newItem.nextBlockId)) {
              newItem.nextBlockId = bridgeMap.get(newItem.nextBlockId);
              modified = true;
              // Auto-clear isEndBlock if it was auto-set and nextBlockId now points to a real block
              if (newItem.nextBlockId !== "submit" && newItem.isEndBlock && !newItem.isEndBlockManual) {
                  newItem.isEndBlock = false;
              }
          }

          // Update navigationRules
          if (newItem.navigationRules && newItem.navigationRules.length > 0) {
              const newRules = newItem.navigationRules.map(rule => {
                  if (rule.target && bridgeMap.has(rule.target)) {
                      modified = true;
                      return { ...rule, target: bridgeMap.get(rule.target)! };
                  }
                  return rule;
              });
              if (modified) newItem.navigationRules = newRules;
          }
          
          return newItem;
      });

      // 6. Update state
      updateNode(state.rootNode.uuid!, {
        ...state.rootNode,
        items: updatedItems,
      });
    },
    [state.rootNode, updateNode, setNodes]
  );

  // Use refs for state values that event handlers need - this prevents listener recreation
  const stateRef = useRef(state);
  const updateNodeRef = useRef(updateNode);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
    updateNodeRef.current = updateNode;
  }, [state, updateNode]);

  // CONSOLIDATED EVENT LISTENERS - single effect, stable handlers via refs
  // This prevents constant listener add/remove which causes memory churn
  useEffect(() => {
    const handleEditEdge = (e: Event) => {
      const customEvent = e as CustomEvent<{ source: string; ruleIndex: number }>;
      const { source, ruleIndex } = customEvent.detail;
      const currentState = stateRef.current;

      if (!currentState.rootNode || !source) return;

      const items = currentState.rootNode.items as BlockData[];
      const sourceBlock = items.find(item => item.uuid === source || `block-${items.indexOf(item)}` === source);

      if (!sourceBlock) return;

      setConfigNodeId(sourceBlock.uuid || source);
      setConfigMode("navigation-only");
      setEditRuleIndex(ruleIndex);
      setHideRemoveButton(true);
      setShowNodeConfig(true);
    };

    const handleDeleteEdge = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; source: string; target: string; rule: any }>;
      const { source, rule } = customEvent.detail;
      const currentState = stateRef.current;

      if (!currentState.rootNode || !source || !rule) return;

      const items = currentState.rootNode.items as BlockData[];
      const sourceBlock = items.find(item => item.uuid === source || `block-${items.indexOf(item)}` === source);

      if (!sourceBlock || !sourceBlock.navigationRules) return;

      const updatedRules = sourceBlock.navigationRules.filter(r =>
          r.target !== rule.target || r.condition !== rule.condition
      );

      const updatedItems = items.map(item =>
          item.uuid === sourceBlock.uuid ? { ...item, navigationRules: updatedRules } : item
      );

      updateNodeRef.current(currentState.rootNode.uuid!, {
          ...currentState.rootNode,
          items: updatedItems
      });
    };

    const handleConfigEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string; blockUuid?: string }>;
      if (customEvent.detail?.blockUuid) {
        setConfigNodeId(customEvent.detail.blockUuid);
        setConfigMode("full");
        setEditRuleIndex(undefined);
        setHideRemoveButton(false);
        setShowNodeConfig(true);
      }
    };

    const handleAddBlock = (e: Event) => {
      const customEvent = e as CustomEvent<{ insertIndex: number; targetBlockId?: string; sourceBlockId?: string; rule?: any }>;
      setInsertIndex(customEvent.detail.insertIndex);
      setInsertTargetId(customEvent.detail.targetBlockId || null);
      setInsertSourceId(customEvent.detail.sourceBlockId || null);
      setInsertRule(customEvent.detail.rule || null);
    };

    const handleAddBranch = (e: Event) => {
      const customEvent = e as CustomEvent<{ sourceBlockId: string }>;
      setBranchSourceId(customEvent.detail.sourceBlockId);
      setShowBlockSelector(true);
    };

    // NEW: Handle block updates from SurveyNode (avoids state.rootNode dependency in node)
    const handleUpdateBlock = (e: Event) => {
      const customEvent = e as CustomEvent<{ blockUuid: string; data: BlockData }>;
      const { blockUuid, data } = customEvent.detail;
      const currentState = stateRef.current;

      if (!currentState.rootNode) return;

      const updatedItems = (currentState.rootNode.items || []).map((item) =>
        (item as BlockData).uuid === blockUuid ? data : item
      );

      updateNodeRef.current(currentState.rootNode.uuid!, {
        ...currentState.rootNode,
        items: updatedItems,
      });
    };

    // Handle edge reconnection from custom drag handle
    const handleReconnectEdge = (e: Event) => {
      const customEvent = e as CustomEvent<{
        edgeId: string;
        source: string;
        oldTarget: string;
        newTarget: string;
        rule?: any;
        ruleIndex?: number;
      }>;
      const { source, newTarget, rule, ruleIndex } = customEvent.detail;
      const currentState = stateRef.current;

      if (!currentState.rootNode || !source || !newTarget) return;

      const items = currentState.rootNode.items as BlockData[];
      const sourceBlock = items.find(b => b.uuid === source);

      if (!sourceBlock) return;

      const updatedBlock = { ...sourceBlock };

      if (rule && typeof ruleIndex === 'number') {
        // This is an explicit navigation rule - update the rule's target
        if (updatedBlock.navigationRules && updatedBlock.navigationRules[ruleIndex]) {
          const newRules = [...updatedBlock.navigationRules];
          newRules[ruleIndex] = { ...newRules[ruleIndex], target: newTarget };
          updatedBlock.navigationRules = newRules;
        }
      } else {
        // This is a sequential/nextBlockId edge
        if (newTarget === "submit") {
          updatedBlock.isEndBlock = true;
          updatedBlock.isEndBlockManual = false;
          updatedBlock.nextBlockId = undefined;
        } else {
          updatedBlock.isEndBlock = false;
          updatedBlock.isEndBlockManual = false;
          updatedBlock.nextBlockId = newTarget;
        }
      }

      // Update the state
      const updatedItems = items.map(item =>
        item.uuid === sourceBlock.uuid ? updatedBlock : item
      );

      updateNodeRef.current(currentState.rootNode.uuid!, {
        ...currentState.rootNode,
        items: updatedItems,
      });
    };

    // Add all listeners once
    window.addEventListener('flow-v3-edit-edge', handleEditEdge);
    window.addEventListener('flow-v3-delete-edge', handleDeleteEdge);
    window.addEventListener('flow-v3-configure-node', handleConfigEvent);
    window.addEventListener('flow-v3-add-block', handleAddBlock);
    window.addEventListener('flow-v3-add-branch', handleAddBranch);
    window.addEventListener('flow-v3-update-block', handleUpdateBlock);
    window.addEventListener('flow-v3-reconnect-edge', handleReconnectEdge);

    // Cleanup all listeners
    return () => {
      window.removeEventListener('flow-v3-edit-edge', handleEditEdge);
      window.removeEventListener('flow-v3-delete-edge', handleDeleteEdge);
      window.removeEventListener('flow-v3-configure-node', handleConfigEvent);
      window.removeEventListener('flow-v3-add-block', handleAddBlock);
      window.removeEventListener('flow-v3-add-branch', handleAddBranch);
      window.removeEventListener('flow-v3-update-block', handleUpdateBlock);
      window.removeEventListener('flow-v3-reconnect-edge', handleReconnectEdge);
    };
  }, []); // Empty deps - listeners are stable, use refs for current values


  const handleResetLayout = useCallback(() => {
    setNeedsLayout(true);
  }, []);

  // Handle Drag Over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Note: onDrop was removed - use onDropWithIndex instead which handles insert positions

  const handleBlockSelect = useCallback((blockType: string) => {
    if (!state.rootNode || !branchSourceId) return;

    const items = state.rootNode.items as BlockData[];
    const sourceBlock = items.find(b => b.uuid === branchSourceId);
    
    if (!sourceBlock) return;

    const blockDefinition = state.definitions.blocks[blockType];
    
    if (!blockDefinition) return;

    const newBlockData = blockDefinition.generateDefaultData
      ? blockDefinition.generateDefaultData()
      : { ...blockDefinition.defaultData };
    
    const newBlock: BlockData = {
      ...newBlockData,
      uuid: uuidv4(),
      isEndBlock: true, // Newly created branch end
      isEndBlockManual: false,
    };

    // Add Navigation Rule to Source Block
    const newRule = {
      condition: `${sourceBlock.fieldName || "field"} == "value"`, // Placeholder condition
      target: newBlock.uuid!,
      isDefault: false,
    };

    const updatedSourceBlock = {
      ...sourceBlock,
      navigationRules: [...(sourceBlock.navigationRules || []), newRule],
    };

    // Update Items List: replace source, append new block
    const updatedItems = items.map(item => 
      item.uuid === branchSourceId ? updatedSourceBlock : item
    ).concat(newBlock);

    // Update State
    updateNode(state.rootNode.uuid!, {
      ...state.rootNode,
      items: updatedItems,
    });

    // Pan to the newly added branch node after layout
    setPendingPanToNodeId(newBlock.uuid!);

    // Trigger Layout and Config
    setNeedsLayout(true);
    setShowBlockSelector(false);
    setBranchSourceId(null);

    // Open config for the source block to edit ONLY the newly added rule
    // The new rule is the last one in the array
    const newRuleIndex = (sourceBlock.navigationRules || []).length; // Index of the newly added rule
    setConfigNodeId(branchSourceId);
    setConfigMode("navigation-only");
    setEditRuleIndex(newRuleIndex);
    setHideRemoveButton(false); // Allow removing the newly created rule
    setShowNodeConfig(true);
  }, [state.rootNode, branchSourceId, state.definitions.blocks, updateNode]);

  // Modified onDrop to respect insertIndex if set
  const onDropWithIndex = useCallback(
    (event: React.DragEvent) => {
        event.preventDefault();
        const blockType = event.dataTransfer.getData("application/reactflow");
        if (!blockType || !state.rootNode) return;

        const blockDefinition = state.definitions.blocks[blockType];
        if (!blockDefinition) return;
        
        const currentItems = (state.rootNode.items || []) as BlockData[];
        const targetIndex = insertIndex !== null ? insertIndex : currentItems.length;

        const newBlockData = blockDefinition.generateDefaultData
            ? blockDefinition.generateDefaultData()
            : { ...blockDefinition.defaultData };

        const newBlock: BlockData = {
            ...newBlockData,
            uuid: uuidv4(),
            nextBlockId: insertTargetId === 'submit' ? undefined : (insertTargetId || undefined), // Set next step if target is provided and not submit
            isEndBlock: insertTargetId === 'submit', // Mark as end block if targeting submit
            isEndBlockManual: false,
        };

        // Create updated items array
        let updatedItems = [...currentItems];

        // If we are inserting between nodes, and we have a source
        if (insertSourceId) {
            const sourceIndex = updatedItems.findIndex(b => b.uuid === insertSourceId);
            if (sourceIndex !== -1) {
                const sourceBlock = { ...updatedItems[sourceIndex] };

                // Check for rule update
                if (insertRule && sourceBlock.navigationRules) {
                    const ruleIndex = sourceBlock.navigationRules.findIndex(r => 
                        r.condition === insertRule.condition && r.target === insertRule.target
                    );
                    
                    if (ruleIndex !== -1) {
                        const newRules = [...sourceBlock.navigationRules];
                        newRules[ruleIndex] = { ...newRules[ruleIndex], target: newBlock.uuid! };
                        sourceBlock.navigationRules = newRules;
                        updatedItems[sourceIndex] = sourceBlock;
                    }
                }
                // Check for nextBlockId update or End Block update
                else {
                     // If inserting before 'submit', and source was end block
                     if (insertTargetId === 'submit' && sourceBlock.isEndBlock) {
                         sourceBlock.isEndBlock = false;
                         sourceBlock.isEndBlockManual = false;
                         sourceBlock.nextBlockId = newBlock.uuid;
                         updatedItems[sourceIndex] = sourceBlock;
                     }
                     // If source explicitly pointed to target
                     else if (insertTargetId && sourceBlock.nextBlockId === insertTargetId) {
                        sourceBlock.nextBlockId = newBlock.uuid;
                        updatedItems[sourceIndex] = sourceBlock;
                    }
                }
            }
        }

        // Insert the new block
        updatedItems = [
            ...updatedItems.slice(0, targetIndex),
            newBlock,
            ...updatedItems.slice(targetIndex)
        ];

        updateNode(state.rootNode.uuid!, {
            ...state.rootNode,
            items: updatedItems,
        });

        // Pan to the newly added node after layout settles
        setPendingPanToNodeId(newBlock.uuid!);

        setInsertIndex(null); // Reset
        setInsertTargetId(null);
        setInsertSourceId(null);
        setInsertRule(null);
    },
    [state.rootNode, insertIndex, insertTargetId, insertSourceId, insertRule, state.definitions.blocks, updateNode]
  );

  // Track connection start for onConnectEnd
  const connectingNodeId = useRef<string | null>(null);
  // Track if we're currently reconnecting an edge (to prevent onConnectEnd from firing)
  const isReconnecting = useRef<boolean>(false);

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  // Track reconnection start to prevent onConnectEnd from firing
  const onReconnectStart = useCallback(() => {
    isReconnecting.current = true;
  }, []);

  // Reset reconnection state when reconnection ends
  const onReconnectEnd = useCallback(() => {
    isReconnecting.current = false;
  }, []);

  const handleAddRule = useCallback((sourceId: string, targetId: string) => {
      const sourceNode = getNodes().find((n) => n.id === sourceId);
      if (!sourceNode || sourceNode.type !== "survey-node") return;

      const blockData = (sourceNode.data as any).block as BlockData;
      
      // Target can be block or submit
      const targetNode = getNodes().find((n) => n.id === targetId);
      let targetString = "submit";
      if (targetNode && targetNode.type === "survey-node") {
          const targetBlock = (targetNode.data as any).block as BlockData;
          targetString = targetBlock.uuid || "";
      }

      // Add Navigation Rule
       const newRule = {
            condition: `${blockData.fieldName || "field"} == ""`,
            target: targetString,
            isDefault: false,
          };

          const updatedBlock = {
            ...blockData,
            navigationRules: [...(blockData.navigationRules || []), newRule],
          };

          const updatedItems = (state.rootNode?.items || []).map((item) =>
            (item as BlockData).uuid === blockData.uuid ? updatedBlock : item
          );

          updateNode(state.rootNode!.uuid!, {
            ...state.rootNode!,
            items: updatedItems,
          });

          // Open Config for ONLY the newly added rule
          const newRuleIndex = (blockData.navigationRules || []).length; // Index of the newly added rule
          setConfigNodeId(sourceNode.id);
          setConfigMode("navigation-only");
          setEditRuleIndex(newRuleIndex);
          setHideRemoveButton(false); // Allow removing the newly created rule
          setShowNodeConfig(true);
  }, [getNodes, state.rootNode, updateNode]);

  // Connect Handler
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === "start") return; // Start is fixed
      handleAddRule(params.source, params.target);
    }, 
    [handleAddRule]
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      // Skip if this is a reconnection (handled by onReconnect instead)
      if (isReconnecting.current) {
        connectingNodeId.current = null;
        return;
      }

      if (!connectingNodeId.current) return;

      const target = event.target as HTMLElement;
      const nodeElement = target.closest('.react-flow__node');

      if (nodeElement) {
        const targetId = nodeElement.getAttribute('data-id');
        if (targetId && targetId !== connectingNodeId.current) {
            handleAddRule(connectingNodeId.current, targetId);
        }
      }

      connectingNodeId.current = null;
    },
    [handleAddRule]
  );

  // Handle edge reconnection - allows moving edge target to a different node
  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (!state.rootNode || !newConnection.source || !newConnection.target) return;

      // Don't allow reconnecting edges from "start" node
      if (oldEdge.source === "start") return;

      // Don't allow reconnecting to the same target
      if (oldEdge.target === newConnection.target) return;

      // Don't allow connecting to self
      if (newConnection.source === newConnection.target) return;

      const items = state.rootNode.items as BlockData[];
      const sourceBlock = items.find(b => b.uuid === oldEdge.source);

      if (!sourceBlock) return;

      // Resolve the new target - could be a block UUID or "submit"
      const newTargetNode = getNodes().find(n => n.id === newConnection.target);
      let newTargetId = "submit";
      if (newTargetNode && newTargetNode.type === "survey-node") {
        const targetBlock = (newTargetNode.data as any).block as BlockData;
        newTargetId = targetBlock.uuid || "";
      }

      // Extract edge data to determine what type of edge this is
      const edgeData = oldEdge.data as { rule?: any; ruleIndex?: number } | undefined;

      const updatedBlock = { ...sourceBlock };

      if (edgeData?.rule && typeof edgeData.ruleIndex === 'number') {
        // This is an explicit navigation rule - update the rule's target
        const ruleIndex = edgeData.ruleIndex;
        if (updatedBlock.navigationRules && updatedBlock.navigationRules[ruleIndex]) {
          const newRules = [...updatedBlock.navigationRules];
          newRules[ruleIndex] = { ...newRules[ruleIndex], target: newTargetId };
          updatedBlock.navigationRules = newRules;
        }
      } else {
        // This is a sequential/nextBlockId edge
        // Update nextBlockId or isEndBlock based on new target
        if (newTargetId === "submit") {
          updatedBlock.isEndBlock = true;
          updatedBlock.isEndBlockManual = false;
          updatedBlock.nextBlockId = undefined;
        } else {
          updatedBlock.isEndBlock = false;
          updatedBlock.isEndBlockManual = false;
          updatedBlock.nextBlockId = newTargetId;
        }
      }

      // Update the state
      const updatedItems = items.map(item =>
        item.uuid === sourceBlock.uuid ? updatedBlock : item
      );

      updateNode(state.rootNode.uuid!, {
        ...state.rootNode,
        items: updatedItems,
      });
    },
    [state.rootNode, updateNode, getNodes]
  );

  // Handle Node Double Click
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "survey-node") {
        // Use the block UUID as the ID for config
        const blockData = (node.data as any).block;
        if (blockData && blockData.uuid) {
            setConfigNodeId(blockData.uuid);
            setConfigMode("full");
            setShowNodeConfig(true);
        }
    }
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: any) => {
      if (!state.rootNode) return;

      const updatedItems = (state.rootNode.items || []).map((item) =>
        (item as BlockData).uuid === nodeId ? { ...item, ...data } : item
      );

      updateNode(state.rootNode.uuid!, {
        ...state.rootNode,
        items: updatedItems,
      });
    },
    [state.rootNode, updateNode]
  );


  // Callbacks for sidebar drag events (kept as noop for sidebar compatibility)
  const handleDragStart = useCallback(() => {}, []);
  const handleDragEnd = useCallback(() => {}, []);

  // Handle selection changes to highlight connected edges and update z-index for selected edges
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    const newSelectedIds = new Set(selectedNodes.map(n => n.id));
    setSelectedNodeIds(newSelectedIds);

    // Update z-index for selected edges so they render above nodes
    const selectedEdgeIds = new Set(selectedEdges.map(e => e.id));
    setEdges(currentEdges =>
      currentEdges.map(edge => {
        const isSelected = selectedEdgeIds.has(edge.id);
        const currentZIndex = edge.zIndex ?? 0;
        const newZIndex = isSelected ? 1000 : 0;

        if (currentZIndex !== newZIndex) {
          return { ...edge, zIndex: newZIndex };
        }
        return edge;
      })
    );
  }, [setEdges]);

  // Create a stable key for node selection state that changes when selection changes
  const nodeSelectionKey = useMemo(() => {
    return nodes
      .filter(n => n.selected)
      .map(n => n.id)
      .sort()
      .join(',');
  }, [nodes]);

  // Update edges with highlighting based on selected nodes
  // This effect runs when selection changes and updates edge data
  // OPTIMIZED: Only creates new edge objects when they actually need to change
  // NOTE: This effect only manages isHighlighted state, not the edge's selected state
  // Edge selection is handled separately by React Flow and onSelectionChange
  useEffect(() => {
    // Build the set of selected node IDs from the key
    const selectedIds = new Set(nodeSelectionKey ? nodeSelectionKey.split(',') : []);

    // Also include any IDs from onSelectionChange
    selectedNodeIds.forEach(id => selectedIds.add(id));

    // Remove empty string if present
    selectedIds.delete('');

    setEdges(currentEdges => {
      let hasChanges = false;
      const updatedEdges = currentEdges.map(edge => {
        const isConnected = selectedIds.size > 0 && (selectedIds.has(edge.source) || selectedIds.has(edge.target));
        const currentHighlight = edge.data?.isHighlighted ?? false;

        // Only update isHighlighted, don't touch selected or zIndex
        // Edge selection and z-index are managed by onSelectionChange
        if (isConnected !== currentHighlight) {
          hasChanges = true;
          return {
            ...edge,
            data: { ...edge.data, isHighlighted: isConnected }
          };
        }
        return edge;
      });

      // Return same array reference if nothing changed to prevent re-render
      return hasChanges ? updatedEdges : currentEdges;
    });
  }, [nodeSelectionKey, selectedNodeIds, setEdges]);

  // Handle edge click to show tooltip
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();

    // Get position relative to the react flow wrapper
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const edgeData = edge.data as any;

    setEdgeTooltip({
      edgeId: edge.id,
      x,
      y,
      sourceId: edge.source,
      targetId: edge.target,
      label: edge.label as string | undefined,
      ruleIndex: edgeData?.ruleIndex,
      isExplicitRule: !!edgeData?.rule,
      // Insert block data
      insertIndex: edgeData?.insertIndex,
      sourceBlockId: edgeData?.sourceBlockId,
      targetBlockId: edgeData?.targetBlockId,
      rule: edgeData?.rule,
    });
  }, []);

  // Close edge tooltip
  const closeEdgeTooltip = useCallback(() => {
    setEdgeTooltip(null);
  }, []);

  // Handle pan to node from tooltip
  const handlePanToNode = useCallback((nodeId: string) => {
    const node = getNodes().find(n => n.id === nodeId);
    if (node) {
      fitView({
        nodes: [node],
        duration: 400,
        padding: 0.5,
        maxZoom: 0.85, // More relaxed zoom level
      });
    }
    closeEdgeTooltip();
  }, [getNodes, fitView, closeEdgeTooltip]);

  // Handle edit rule from tooltip
  const handleEditRuleFromTooltip = useCallback((sourceId: string, ruleIndex: number) => {
    if (!state.rootNode) return;

    const items = state.rootNode.items as BlockData[];
    const sourceBlock = items.find(item => item.uuid === sourceId);

    if (!sourceBlock) return;

    setConfigNodeId(sourceBlock.uuid || sourceId);
    setConfigMode("navigation-only");
    setEditRuleIndex(ruleIndex);
    setHideRemoveButton(true);
    setShowNodeConfig(true);
    closeEdgeTooltip();
  }, [state.rootNode, closeEdgeTooltip]);

  // Handle insert block from tooltip - dispatches the same event as the + button
  const handleInsertFromTooltip = useCallback(() => {
    if (!edgeTooltip || typeof edgeTooltip.insertIndex !== 'number') return;

    window.dispatchEvent(new CustomEvent('flow-v3-add-block', {
      detail: {
        insertIndex: edgeTooltip.insertIndex,
        targetBlockId: edgeTooltip.targetBlockId,
        sourceBlockId: edgeTooltip.sourceBlockId,
        rule: edgeTooltip.rule
      }
    }));

    closeEdgeTooltip();
  }, [edgeTooltip, closeEdgeTooltip]);

  // Get node display name
  const getNodeDisplayName = useCallback((nodeId: string) => {
    const node = getNodes().find(n => n.id === nodeId);
    if (!node) return nodeId;

    if (node.type === 'survey-node') {
      const block = (node.data as any)?.block;
      return block?.fieldName || block?.label || 'Block';
    }
    if (nodeId === 'start') return 'Start';
    if (nodeId === 'submit') return 'Submit';
    return nodeId;
  }, [getNodes]);

  // Close tooltip on click outside or scroll
  useEffect(() => {
    if (!edgeTooltip) return;

    const handleClickOutside = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;
      // Check if click is inside the tooltip
      if (target.closest('[data-edge-tooltip]')) return;
      closeEdgeTooltip();
    };

    const handleScroll = () => closeEdgeTooltip();

    // Handle pane click (ReactFlow canvas click)
    const handlePaneClick = () => closeEdgeTooltip();

    // Use capture phase to catch events before they're stopped
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('wheel', handleScroll, true);

    // Also listen to ReactFlow pane clicks
    const pane = document.querySelector('.react-flow__pane');
    if (pane) {
      pane.addEventListener('click', handlePaneClick);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('wheel', handleScroll, true);
      if (pane) {
        pane.removeEventListener('click', handlePaneClick);
      }
    };
  }, [edgeTooltip, closeEdgeTooltip]);

  return (
    <BlocksMapProvider value={blocksMap}>
    <div className="h-full flex flex-col">
       <FlowV2Toolbar
        mode={mode}
        onModeChange={setMode}
        onFitView={() => fitView({ padding: 0.3, maxZoom: 0.85 })}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetLayout={handleResetLayout}
        onClose={onClose}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <FlowV2Sidebar onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
        
        <div ref={reactFlowWrapper} className="flex-1 relative bg-slate-50 dark:bg-slate-950">
             {/* Visual indicator for Insert Mode */}
             {insertIndex !== null && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-50 flex items-center animate-bounce pointer-events-none">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Drag a block to insert at position {insertIndex + 1}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0 hover:bg-white/20 rounded-full text-current pointer-events-auto"
                        onClick={() => setInsertIndex(null)}
                    >
                        &times;
                    </Button>
                </div>
             )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onReconnect={onReconnect}
                onReconnectStart={onReconnectStart}
                onReconnectEnd={onReconnectEnd}
                edgesReconnectable={true}
                onDragOver={onDragOver}
                onDrop={onDropWithIndex}
                onNodeDoubleClick={onNodeDoubleClick}
                onEdgeClick={handleEdgeClick}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.1}
                maxZoom={1.5}
                panOnScroll
                selectionOnDrag
                // panOnDrag={mode === "pan" || mode === "select"}
                // selectionOnDrag={mode === "select"}
                connectOnClick={mode === "connect"}
                elevateEdgesOnSelect={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                <Controls showInteractive={false} position="bottom-right" />
                <Panel position="top-right" className="bg-white/80 dark:bg-slate-900/80 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                    Double-click nodes to edit. Click lines to see options.
                </Panel>
            </ReactFlow>

            {/* Edge Tooltip - rendered outside ReactFlow for proper positioning */}
            {edgeTooltip && (
              <div
                data-edge-tooltip="true"
                style={{
                  position: "absolute",
                  left: edgeTooltip.x,
                  top: edgeTooltip.y,
                  transform: "translate(-50%, -100%)",
                  zIndex: 9999,
                }}
                className="pointer-events-auto"
              >
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px] mb-2">
                  {/* Connection Info */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">From:</span>
                      <span className="truncate max-w-[150px]">{getNodeDisplayName(edgeTooltip.sourceId)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">To:</span>
                      <span className="truncate max-w-[150px]">{getNodeDisplayName(edgeTooltip.targetId)}</span>
                    </div>
                  </div>

                  {/* Rule Condition */}
                  {edgeTooltip.label && (
                    <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Condition</div>
                      <div className="text-xs font-medium text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded">
                        {edgeTooltip.label}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => handlePanToNode(edgeTooltip.sourceId)}
                      title={`Pan to ${getNodeDisplayName(edgeTooltip.sourceId)}`}
                    >
                      <ArrowUpToLine className="h-3 w-3 mr-1" />
                      Source
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => handlePanToNode(edgeTooltip.targetId)}
                      title={`Pan to ${getNodeDisplayName(edgeTooltip.targetId)}`}
                    >
                      <ArrowDownToLine className="h-3 w-3 mr-1" />
                      Target
                    </Button>

                    {/* Insert Block button */}
                    {typeof edgeTooltip.insertIndex === 'number' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                        onClick={handleInsertFromTooltip}
                        title="Insert a new block on this path"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Insert
                      </Button>
                    )}

                    {/* Edit button for explicit rules */}
                    {edgeTooltip.isExplicitRule && edgeTooltip.ruleIndex !== undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                        onClick={() => handleEditRuleFromTooltip(edgeTooltip.sourceId, edgeTooltip.ruleIndex!)}
                        title="Edit Rule"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      <NodeConfigPanel
          nodeId={configNodeId}
          open={showNodeConfig}
          onOpenChange={(open) => {
            setShowNodeConfig(open);
            if (!open) {
              // Reset edit mode state when dialog closes
              setEditRuleIndex(undefined);
              setHideRemoveButton(false);
            }
          }}
          onUpdate={handleNodeUpdate}
          mode={configMode}
          editRuleIndex={editRuleIndex}
          hideRemoveButton={hideRemoveButton}
        />

      <BlockSelectorDialog
        open={showBlockSelector}
        onOpenChange={setShowBlockSelector}
        onSelect={handleBlockSelect}
      />
    </div>
    </BlocksMapProvider>
  );
};

export const FlowV3Builder: React.FC<FlowV3BuilderProps> = ({ onClose }) => {
  return (
    <ReactFlowProvider>
      <FlowV3BuilderInner onClose={onClose} />
    </ReactFlowProvider>
  );
};