import { Node, Edge, Position } from "@xyflow/react";

const defaultWidth = 400;
const defaultHeight = 150;

type Dagre = typeof import("@dagrejs/dagre");

// Lazy-loaded dagre instance to avoid SSR issues
let dagreInstance: Dagre | null = null;

async function getDagre() {
  if (!dagreInstance) {
    // dagre 2's ESM build only has a default export, although its types declare
    // named ones. Its CommonJS build puts everything on the module itself.
    const dagreModule = (await import("@dagrejs/dagre")) as Dagre & { default?: Dagre };
    dagreInstance = dagreModule.default ?? dagreModule;
  }
  return dagreInstance;
}

// Cache for layout results to avoid redundant calculations
let layoutCache: {
  key: string;
  result: { nodes: Node[]; edges: Edge[] };
} | null = null;

// Generate a cache key based on node IDs, connections, and sizes
const generateLayoutCacheKey = (nodes: Node[], edges: Edge[]): string => {
  const nodeKey = nodes.map(n =>
    `${n.id}:${n.measured?.width ?? defaultWidth}x${n.measured?.height ?? defaultHeight}`
  ).join('|');
  const edgeKey = edges.map(e => `${e.source}->${e.target}`).join('|');
  return `${nodeKey}::${edgeKey}`;
};

const NODE_PADDING = 25;

/**
 * After dagre layout, detect edges that will need routing (bent paths around
 * intermediate nodes) and push target nodes further out horizontally so
 * they don't cover the routed edge's label.
 */
const adjustNodesForRoutedEdges = (nodes: Node[], edges: Edge[]): Node[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  // Accumulate the largest needed adjustment per node
  const adjustments = new Map<string, number>();

  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;

    const srcW = src.measured?.width ?? defaultWidth;
    const srcH = src.measured?.height ?? defaultHeight;
    const tgtW = tgt.measured?.width ?? defaultWidth;

    const srcCx = src.position.x + srcW / 2;
    const srcCy = src.position.y + srcH / 2;
    const tgtCx = tgt.position.x + tgtW / 2;
    const tgtCy = tgt.position.y + (tgt.measured?.height ?? defaultHeight) / 2;

    // Only check edges that span multiple ranks (significant Y distance)
    if (Math.abs(tgtCy - srcCy) < srcH + 50) continue;

    const midY = (srcCy + tgtCy) / 2;

    // Check if any intermediate node would block a smooth-step path
    const isBlocked = nodes.some(n => {
      if (n.id === edge.source || n.id === edge.target) return false;

      const nw = n.measured?.width ?? defaultWidth;
      const nh = n.measured?.height ?? defaultHeight;
      const nTop = n.position.y - NODE_PADDING;
      const nBot = n.position.y + nh + NODE_PADDING;
      const nLeft = n.position.x - NODE_PADDING;
      const nRight = n.position.x + nw + NODE_PADDING;

      // Must be vertically between source and target
      if (nBot < Math.min(srcCy, tgtCy) || nTop > Math.max(srcCy, tgtCy)) return false;

      // Check the three segments of a smooth-step path:
      // 1) Vertical from source down to midY
      if (srcCx >= nLeft && srcCx <= nRight && nTop <= midY && nBot >= srcCy) return true;
      // 2) Horizontal from sourceX to targetX at midY
      if (midY >= nTop && midY <= nBot) {
        const segL = Math.min(srcCx, tgtCx);
        const segR = Math.max(srcCx, tgtCx);
        if (nRight > segL && nLeft < segR) return true;
      }
      // 3) Vertical from midY down to target
      if (tgtCx >= nLeft && tgtCx <= nRight && nTop <= tgtCy && nBot >= midY) return true;

      return false;
    });

    if (isBlocked) {
      const minDist = 200; // Minimum horizontal distance for routed-edge label space
      const currentDist = Math.abs(tgtCx - srcCx);

      if (currentDist < minDist) {
        // Push target further in whichever direction it's already offset
        const dir = tgtCx >= srcCx ? 1 : -1;
        const needed = dir * (minDist - currentDist);
        const current = adjustments.get(tgt.id) ?? 0;

        // Keep the larger magnitude adjustment if multiple edges affect the same node
        if (Math.abs(needed) > Math.abs(current)) {
          adjustments.set(tgt.id, needed);
        }
      }
    }
  }

  if (adjustments.size === 0) return nodes;

  return nodes.map(node => {
    const adj = adjustments.get(node.id);
    if (adj) {
      return { ...node, position: { ...node.position, x: node.position.x + adj } };
    }
    return node;
  });
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[], direction = "TB") => {
  // Check cache first
  const cacheKey = generateLayoutCacheKey(nodes, edges);
  if (layoutCache && layoutCache.key === cacheKey) {
    return layoutCache.result;
  }

  const dagre = await getDagre();
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";

  // OPTIMIZED: Reduced nodesep from 1200 to 100 for better performance
  // Large nodesep values cause the layout algorithm to work harder
  // and create unnecessarily spread out graphs
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 100,  // Reduced from 1200 - much better performance
    ranksep: 200,  // Slightly reduced for tighter layouts
    ranker: 'tight-tree',  // Faster than network-simplex for most cases
    align: 'DL'  // Align child nodes to the left instead of right
  });

  nodes.forEach((node) => {
    // Prefer measured dimensions from React Flow v12
    const width = node.measured?.width ?? defaultWidth;
    const height = node.measured?.height ?? defaultHeight;

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    // Use weight from edge data if available to guide layout (higher weight = straighter/shorter edge)
    const weight = (edge.data?.weight as number) || 1;
    dagreGraph.setEdge(edge.source, edge.target, { weight });
  });

  dagre.layout(dagreGraph);

  // Calculate min and max x to mirror the layout horizontally
  // This shifts child nodes to the left instead of right
  let minX = Infinity;
  let maxX = -Infinity;
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    minX = Math.min(minX, nodeWithPosition.x);
    maxX = Math.max(maxX, nodeWithPosition.x);
  });
  const centerX = (minX + maxX) / 2;

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Dagre returns center point, React Flow wants top-left
    // Use the dimensions we gave Dagre
    const width = node.measured?.width ?? defaultWidth;
    const height = node.measured?.height ?? defaultHeight;

    // Mirror x position around center to shift children left instead of right
    const mirroredX = centerX - (nodeWithPosition.x - centerX);

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: mirroredX - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  // Post-layout: push nodes further apart when their edges will be routed (bent),
  // so the routed edge labels aren't covered by the target node.
  const adjustedNodes = adjustNodesForRoutedEdges(layoutedNodes, edges);

  const result = { nodes: adjustedNodes, edges };

  // Cache the result
  layoutCache = { key: cacheKey, result };

  return result;
};

// Export function to invalidate cache if needed
export const invalidateLayoutCache = () => {
  layoutCache = null;
};