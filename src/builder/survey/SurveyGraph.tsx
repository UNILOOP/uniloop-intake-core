import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { NodeData, NavigationRule } from "../../types";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import { Plus, Trash2, Edit2, Save, X, ChevronRight, ChevronLeft, Settings, Link2, Unlink, ZoomIn, ZoomOut, Maximize2, Move, MousePointer, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { NavigationRulesEditorDialog } from "../common/NavigationRulesEditorDialog";

interface SurveyGraphProps {
  rootNode: NodeData | null;
  zoomable?: boolean;
  height?: string;
}

interface FlowNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    label: string;
    description?: string;
    nodeType: string;
    itemType: string;
    originalData: any;
    hasConditionalFlow: boolean;
    isPageNode: boolean;
    isNavigationNode: boolean;
    pageItems?: any[];
    parentPageId?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  isConditional: boolean;
  waypoints?: Array<{ x: number; y: number }>;
}

export const SurveyGraph: React.FC<SurveyGraphProps> = ({
  rootNode,
  zoomable = true,
  height = "600px",
}) => {
  const { state, updateNode } = useSurveyBuilder();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [editingRules, setEditingRules] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorMode, setCursorMode] = useState<'select' | 'pan'>('select');

  // Improved layout constants
  const LAYOUT_CONFIG = {
    NODE_SPACING_X: 400,
    NODE_SPACING_Y: 200,
    LEVEL_SPACING: 500,
    PAGE_CONTAINER_PADDING: 60,
    NAV_NODE_OFFSET_X: 80,
    NAV_NODE_OFFSET_Y: 100,
    NAV_NODE_SPACING: 140,
    MIN_NODE_WIDTH: 280,
    MIN_NODE_HEIGHT: 120,
    PAGE_NODE_MIN_HEIGHT: 160,
  };

  // Color scheme for different node types
  const getNodeColorByType = (type: string, isPageNode: boolean = false, isNavigationNode: boolean = false) => {
    if (isPageNode) {
      return { 
        fill: '#f8fafc', 
        stroke: '#64748b', 
        darkFill: '#334155', 
        darkStroke: '#94a3b8' 
      };
    }
    
    if (isNavigationNode) {
      return { 
        fill: '#fef3c7', 
        stroke: '#f59e0b', 
        darkFill: '#78350f', 
        darkStroke: '#fbbf24' 
      };
    }
    
    const colorMap: Record<string, any> = {
      'section': { fill: '#f0f9ff', stroke: '#0ea5e9', darkFill: '#0c4a6e', darkStroke: '#38bdf8' },
      'set': { fill: '#f0fdf4', stroke: '#22c55e', darkFill: '#14532d', darkStroke: '#4ade80' },
      'selectablebox': { fill: '#fefce8', stroke: '#eab308', darkFill: '#713f12', darkStroke: '#facc15' },
      'textfield': { fill: '#faf5ff', stroke: '#a855f7', darkFill: '#581c87', darkStroke: '#c084fc' },
      'html': { fill: '#fdf2f8', stroke: '#ec4899', darkFill: '#831843', darkStroke: '#f472b6' },
      'button': { fill: '#f3e8ff', stroke: '#8b5cf6', darkFill: '#5b21b6', darkStroke: '#a78bfa' },
      'checkbox': { fill: '#ecfdf5', stroke: '#10b981', darkFill: '#064e3b', darkStroke: '#34d399' },
      'radio': { fill: '#fff7ed', stroke: '#f97316', darkFill: '#7c2d12', darkStroke: '#fb923c' },
      'textarea': { fill: '#f0f9ff', stroke: '#0ea5e9', darkFill: '#0c4a6e', darkStroke: '#38bdf8' },
      'date': { fill: '#fef2f2', stroke: '#ef4444', darkFill: '#7f1d1d', darkStroke: '#f87171' },
      'time': { fill: '#f5f3ff', stroke: '#8b5cf6', darkFill: '#5b21b6', darkStroke: '#a78bfa' },
      'number': { fill: '#fefce8', stroke: '#eab308', darkFill: '#713f12', darkStroke: '#facc15' },
    };

    return colorMap[type] || { fill: '#f8fafc', stroke: '#64748b', darkFill: '#334155', darkStroke: '#94a3b8' };
  };

  // Collision detection helper
  const checkNodeCollision = (x: number, y: number, width: number, height: number, existingNodes: FlowNode[], excludeId?: string): boolean => {
    const padding = 20;
    return existingNodes.some(node => {
      if (node.id === excludeId) return false;
      return !(
        x + width + padding < node.x ||
        x > node.x + node.width + padding ||
        y + height + padding < node.y ||
        y > node.y + node.height + padding
      );
    });
  };

  // Find next available position
  const findAvailablePosition = (
    preferredX: number, 
    preferredY: number, 
    width: number, 
    height: number, 
    existingNodes: FlowNode[],
    excludeId?: string
  ): { x: number; y: number } => {
    // Try preferred position first
    if (!checkNodeCollision(preferredX, preferredY, width, height, existingNodes, excludeId)) {
      return { x: preferredX, y: preferredY };
    }

    // Try positions in expanding search pattern
    const searchRadius = 50;
    const maxAttempts = 50;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const radius = attempt * searchRadius;
      
      // Try positions in a circle around preferred position
      for (let angle = 0; angle < 360; angle += 45) {
        const radian = (angle * Math.PI) / 180;
        const x = preferredX + Math.cos(radian) * radius;
        const y = preferredY + Math.sin(radian) * radius;
        
        if (!checkNodeCollision(x, y, width, height, existingNodes, excludeId)) {
          return { x, y };
        }
      }
    }

    // Fallback to preferred position if no collision-free spot found
    return { x: preferredX, y: preferredY };
  };

  // Toggle page expansion
  const togglePageExpansion = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  // Collect all field names and targets for navigation rules
  const collectFieldNames = useCallback((node: any): string[] => {
    if (!node) return [];
    let names: string[] = [];
    if (node.fieldName) names.push(node.fieldName);
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        names = names.concat(collectFieldNames(item));
      }
    }
    if (Array.isArray(node.nodes)) {
      for (const n of node.nodes) {
        if (typeof n !== "string") {
          names = names.concat(collectFieldNames(n));
        }
      }
    }
    return names;
  }, []);

  const collectTargets = useCallback((node: any): { pages: Array<{ uuid: string; name: string }>, blocks: Array<{ uuid: string; name: string }> } => {
    if (!node) return { pages: [], blocks: [] };
    let pages: Array<{ uuid: string; name: string }> = [];
    let blocks: Array<{ uuid: string; name: string }> = [];
    
    if (node.uuid) {
      if (node.type === "set" || node.type === "section") {
        pages.push({ uuid: node.uuid, name: node.name || node.uuid });
      } else {
        blocks.push({ 
          uuid: node.uuid, 
          name: node.name || node.fieldName || node.uuid 
        });
      }
    }
    
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        const subTargets = collectTargets(item);
        pages = pages.concat(subTargets.pages);
        blocks = blocks.concat(subTargets.blocks);
      }
    }

    if (Array.isArray(node.nodes)) {
      for (const n of node.nodes) {
        if (typeof n !== "string") {
          const subTargets = collectTargets(n);
          pages = pages.concat(subTargets.pages);
          blocks = blocks.concat(subTargets.blocks);
        }
      }
    }
    
    return { pages, blocks };
  }, []);

  // Improved layout algorithm with better spacing and collision avoidance
  const layoutNodes = useCallback((rootNode: any): { nodes: FlowNode[], edges: FlowEdge[] } => {
    const flowNodes: FlowNode[] = [];
    const flowEdges: FlowEdge[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map<string, any>();
    const levelNodes = new Map<number, FlowNode[]>();

    // First pass: collect all nodes and build lookup map
    const collectAllNodes = (node: any) => {
      if (!node || !node.uuid) return;
      nodeMap.set(node.uuid, node);
      
      if (node.items && Array.isArray(node.items)) {
        node.items.forEach((item: any) => {
          if (item.uuid) {
            collectAllNodes(item);
          }
        });
      }
      
      if (node.nodes) {
        node.nodes.forEach((childNode: any) => {
          if (typeof childNode !== "string" && childNode.uuid) {
            collectAllNodes(childNode);
          }
        });
      }
    };

    collectAllNodes(rootNode);

    const processNode = (
      node: any, 
      x: number = 0, 
      y: number = 0, 
      level: number = 0,
      parentLevel: number = -1
    ) => {
      if (!node.uuid || visited.has(node.uuid)) return { width: 0, height: 0 };
      visited.add(node.uuid);

      const isRootSection = node.type === "section" && level === 0;
      const isPageNode = node.type === "set";
      
      // Determine if this page/section has items with navigation rules
      const itemsWithNavRules = [];
      if (node.items) {
        node.items.forEach((item: any) => {
          if (item.navigationRules && item.navigationRules.length > 0) {
            itemsWithNavRules.push(item);
          }
        });
      }

      // Calculate node dimensions
      let nodeWidth = LAYOUT_CONFIG.MIN_NODE_WIDTH;
      let nodeHeight = LAYOUT_CONFIG.MIN_NODE_HEIGHT;
      
      if (isRootSection) {
        nodeWidth = 400;
        nodeHeight = 100;
      } else if (isPageNode) {
        const itemCount = node.items ? node.items.length : 0;
        nodeHeight = Math.max(LAYOUT_CONFIG.PAGE_NODE_MIN_HEIGHT, 100 + (itemCount * 25));
      }

      // Find available position for this node
      const preferredPosition = findAvailablePosition(x, y, nodeWidth, nodeHeight, flowNodes);

      const flowNode: FlowNode = {
        id: node.uuid,
        x: preferredPosition.x,
        y: preferredPosition.y,
        width: nodeWidth,
        height: nodeHeight,
        data: {
          label: node.name || 'Unnamed',
          description: node.description || '',
          nodeType: node.type,
          itemType: node.type,
          originalData: node,
          hasConditionalFlow: itemsWithNavRules.length > 0,
          isPageNode: isPageNode || isRootSection,
          isNavigationNode: false,
          pageItems: node.items || [],
          parentPageId: undefined,
        },
      };
      
      flowNodes.push(flowNode);

      // Track nodes by level for better organization
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(flowNode);

      // Process navigation rule items
      if (isPageNode && itemsWithNavRules.length > 0) {
        const navNodeX = flowNode.x + LAYOUT_CONFIG.NAV_NODE_OFFSET_X;
        const navNodeY = flowNode.y + flowNode.height + LAYOUT_CONFIG.NAV_NODE_OFFSET_Y;
        
        itemsWithNavRules.forEach((item, index) => {
          const navNodeId = `${item.uuid}_nav`;
          
          const navPosition = findAvailablePosition(
            navNodeX, 
            navNodeY + (index * LAYOUT_CONFIG.NAV_NODE_SPACING), 
            280, 
            80, 
            flowNodes
          );
          
          const navFlowNode: FlowNode = {
            id: navNodeId,
            x: navPosition.x,
            y: navPosition.y,
            width: 280,
            height: 80,
            data: {
              label: item.fieldName || item.label || 'Navigation Item',
              description: item.label || item.description || '',
              nodeType: item.type,
              itemType: item.type,
              originalData: item,
              hasConditionalFlow: true,
              isPageNode: false,
              isNavigationNode: true,
              parentPageId: node.uuid,
            },
          };
          
          flowNodes.push(navFlowNode);
          
          // Create edge from page to navigation item
          flowEdges.push({
            id: `${node.uuid}-${navNodeId}`,
            source: node.uuid,
            target: navNodeId,
            isConditional: false,
          });

          // Create edges from navigation item to targets
          if (item.navigationRules) {
            item.navigationRules.forEach((rule: NavigationRule) => {
              const edge: FlowEdge = {
                id: `${navNodeId}-${rule.target}`,
                source: navNodeId,
                target: rule.target,
                label: rule.condition === 'true' ? 'default' : rule.condition,
                isConditional: rule.condition !== 'true' && !rule.isDefault,
              };
              flowEdges.push(edge);
            });
          }
        });
      }

      // Process child pages/sections with improved spacing
      if (node.items && Array.isArray(node.items)) {
        if (isRootSection) {
          // For root section, lay out pages horizontally with proper spacing
          let pageX = flowNode.x + flowNode.width + LAYOUT_CONFIG.NODE_SPACING_X;
          const pageY = flowNode.y;
          
          node.items.forEach((item: any, index) => {
            if (item.type === "set" && item.uuid && !visited.has(item.uuid)) {
              const itemDimensions = processNode(item, pageX, pageY, level + 1, level);
              pageX += LAYOUT_CONFIG.NODE_SPACING_X + nodeWidth;
            }
          });
        }
      }

      // Process navigation rule targets with better positioning
      if (itemsWithNavRules.length > 0) {
        const allTargets = new Set<string>();
        itemsWithNavRules.forEach(item => {
          if (item.navigationRules) {
            item.navigationRules.forEach((rule: NavigationRule) => {
              allTargets.add(rule.target);
            });
          }
        });

        const targetX = flowNode.x + LAYOUT_CONFIG.LEVEL_SPACING;
        const targetY = flowNode.y;
        
        Array.from(allTargets).forEach((targetId, index) => {
          const targetNode = nodeMap.get(targetId);
          if (targetNode && !visited.has(targetId)) {
            const childPosition = findAvailablePosition(
              targetX, 
              targetY + (index * LAYOUT_CONFIG.NODE_SPACING_Y), 
              nodeWidth, 
              nodeHeight, 
              flowNodes
            );
            
            processNode(targetNode, childPosition.x, childPosition.y, level + 1, level);
          }
        });
      }

      return {
        width: flowNode.width,
        height: flowNode.height
      };
    };

    if (rootNode) {
      processNode(rootNode, 100, 100, 0);
    }
    
    return { nodes: flowNodes, edges: flowEdges };
  }, []);

  // Convert survey data to flow nodes and edges
  useEffect(() => {
    if (!rootNode) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutNodes(rootNode);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [rootNode, layoutNodes]);

  // Mouse event handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!zoomable) return;
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
  }, [zoomable]);

  const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
    if (!zoomable) return;
    e.preventDefault();
    
    if (e.button === 0) { // Left click
      if (nodeId && cursorMode === 'select') {
        setSelectedNode(nodeId);
        setDragNode(nodeId);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            const x = (e.clientX - rect.left - pan.x) / zoom;
            const y = (e.clientY - rect.top - pan.y) / zoom;
            setDragStart({ x: x - node.x, y: y - node.y });
          }
        }
      } else if (!nodeId || cursorMode === 'pan') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedNode(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!zoomable) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x, y });

    if (dragNode && cursorMode === 'select') {
      setNodes(prev => prev.map(node => 
        node.id === dragNode 
          ? { ...node, x: x - dragStart.x, y: y - dragStart.y }
          : node
      ));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setDragNode(null);
    setIsPanning(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setCursorMode('pan');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setCursorMode('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Zoom controls
  const handleZoom = (delta: number) => {
    if (!zoomable) return;
    setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
  };

  const handleFitView = () => {
    if (!zoomable || nodes.length === 0) return;

    const padding = 100;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect) {
      const scaleX = containerRect.width / width;
      const scaleY = containerRect.height / height;
      const newZoom = Math.min(scaleX, scaleY, 1);

      setZoom(newZoom);
      setPan({ 
        x: (containerRect.width - width * newZoom) / 2 - minX * newZoom + padding * newZoom,
        y: (containerRect.height - height * newZoom) / 2 - minY * newZoom + padding * newZoom
      });
    }
  };

  // Improved edge path generation with better routing
  const generateEdgePath = (edge: FlowEdge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    
    if (!source || !target) return '';

    // Calculate connection points
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height;
    const tx = target.x + target.width / 2;
    const ty = target.y;

    // Calculate control points for better curve routing
    const dx = Math.abs(tx - sx);
    const dy = Math.abs(ty - sy);
    
    // Adaptive curve strength based on distance
    const curveStrength = Math.min(dy * 0.5, 150);
    
    // Create more natural curves
    const cp1x = sx;
    const cp1y = sy + curveStrength;
    const cp2x = tx;
    const cp2y = ty - curveStrength;

    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
  };

  const saveNavigationRules = useCallback((nodeId: string, rules: NavigationRule[]) => {
    // Update edges for visual representation
    setEdges(prev => {
      const otherEdges = prev.filter(e => e.source !== nodeId);
      const newEdges = rules.map(rule => ({
        id: `${nodeId}-${rule.target}`,
        source: nodeId,
        target: rule.target,
        label: rule.condition === 'true' ? 'default' : rule.condition,
        isConditional: rule.condition !== 'true' && !rule.isDefault,
      }));
      return [...otherEdges, ...newEdges];
    });

    // Find the node data
    const selectedNodeData = nodes.find(n => n.id === nodeId);
    if (!selectedNodeData?.data.originalData || !updateNode) return;

    const originalData = selectedNodeData.data.originalData;
    const updatedNodeData = {
      ...originalData,
      navigationRules: rules
    };

    try {
      updateNode(nodeId, updatedNodeData);
    } catch (error) {
      console.error('Error updating node in context:', error);
    }

    // Update visual nodes
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            hasConditionalFlow: rules.length > 0,
            originalData: updatedNodeData,
          },
        };
      }
      return node;
    }));
  }, [nodes, updateNode]);

  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const fieldNames = useMemo(() => collectFieldNames(rootNode), [rootNode, collectFieldNames]);
  const targets = useMemo(() => collectTargets(rootNode), [rootNode, collectTargets]);

  if (!rootNode) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-md"
        style={{ height }}
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Survey Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Create a survey to see the graph visualization.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-gray-50 dark:bg-gray-900 relative rounded-md"
      style={{ height, overflow: 'hidden' }}
      ref={containerRef}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className={`w-full h-full ${cursorMode === 'pan' ? 'cursor-move' : 'cursor-default'}`}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isDarkMode ? '#9ca3af' : '#6b7280'}
            />
          </marker>
          
          <marker
            id="arrowhead-conditional"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isDarkMode ? '#fb923c' : '#f97316'}
            />
          </marker>
          
          <marker
            id="arrowhead-highlighted"
            markerWidth="12"
            markerHeight="9"
            refX="12"
            refY="4.5"
            orient="auto"
          >
            <polygon
              points="0 0, 12 4.5, 0 9"
              fill={isDarkMode ? '#3b82f6' : '#2563eb'}
            />
          </marker>
          
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feFlood floodColor="#000000" floodOpacity="0.1"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

          {/* Edges - Rendered with improved visibility */}
          {edges.map((edge, index) => {
            const path = generateEdgePath(edge);
            const pathId = `path-${edge.id}`;
            const isHighlighted = hoveredEdge === edge.id || 
              (selectedNode && (edge.source === selectedNode || edge.target === selectedNode));
            const key = `key-${edge.id}-${index}`;
            return (
              <g key={key}>
                <defs>
                  <path id={pathId} d={path} />
                </defs>
                
                {/* Edge background for better visibility */}
                <path
                  d={path}
                  fill="none"
                  stroke="white"
                  strokeWidth={isHighlighted ? "6" : "4"}
                  opacity="0.8"
                />
                
                {/* Main edge */}
                <path
                  d={path}
                  fill="none"
                  stroke={
                    isHighlighted 
                      ? (isDarkMode ? '#3b82f6' : '#2563eb')
                      : edge.isConditional 
                        ? (isDarkMode ? '#fb923c' : '#f97316') 
                        : (isDarkMode ? '#9ca3af' : '#6b7280')
                  }
                  strokeWidth={isHighlighted ? "3" : "2"}
                  strokeDasharray={edge.isConditional ? '5,5' : ''}
                  markerEnd={
                    isHighlighted 
                      ? 'url(#arrowhead-highlighted)'
                      : edge.isConditional 
                        ? 'url(#arrowhead-conditional)' 
                        : 'url(#arrowhead)'
                  }
                  filter={isHighlighted ? 'url(#glow)' : ''}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge(null)}
                />
                
                {/* Edge label with background */}
                {edge.label && (
                  <g>
                    {/* Label background */}
                    <rect
                      x="0"
                      y="0"
                      width={edge.label.length * 6 + 8}
                      height="16"
                      rx="8"
                      fill={isDarkMode ? '#1f2937' : 'white'}
                      stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                      strokeWidth="1"
                      opacity="0.95"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,-8;0,-8"
                        dur="1s"
                      />
                    </rect>
                    
                    {/* Label text */}
                    <text 
                      className="text-xs font-medium"
                      fill={isHighlighted ? (isDarkMode ? '#60a5fa' : '#2563eb') : (isDarkMode ? '#d1d5db' : '#6b7280')}
                      dy="4"
                      dx="4"
                    >
                      <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                        {edge.label.length > 20 ? edge.label.substring(0, 17) + '...' : edge.label}
                      </textPath>
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes - Rendered with improved spacing and collision avoidance */}
          {nodes.map(node => {
            const colors = getNodeColorByType(node.data.itemType, node.data.isPageNode, node.data.isNavigationNode);
            const isSelected = selectedNode === node.id;
            const isConnected = edges.some(e => e.source === node.id || e.target === node.id);
            
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={cursorMode === 'select' ? 'cursor-pointer' : ''}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(e, node.id);
                }}
              >
                {/* Node shadow and selection glow */}
                {isSelected && (
                  <rect
                    x="-6"
                    y="-6"
                    width={node.width + 12}
                    height={node.height + 12}
                    rx="12"
                    fill="none"
                    stroke={isDarkMode ? '#3b82f6' : '#2563eb'}
                    strokeWidth="2"
                    opacity="0.6"
                    filter="url(#shadow)"
                  />
                )}
                
                {/* Connection indicator */}
                {isConnected && !isSelected && (
                  <circle
                    cx={node.width + 15}
                    cy="15"
                    r="4"
                    fill={isDarkMode ? '#10b981' : '#059669'}
                    opacity="0.7"
                  />
                )}
                
                {/* Node main background */}
                <rect
                  width={node.width}
                  height={node.height}
                  rx="8"
                  fill={isDarkMode ? colors.darkFill : colors.fill}
                  stroke={isDarkMode ? colors.darkStroke : colors.stroke}
                  strokeWidth={isSelected ? "2" : "1"}
                  filter="url(#shadow)"
                />
                
                {/* Gradient overlay for depth */}
                <defs>
                  <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
                  </linearGradient>
                </defs>
                <rect
                  width={node.width}
                  height={node.height}
                  rx="8"
                  fill={`url(#gradient-${node.id})`}
                />
                
                {/* Node header bar */}
                <rect
                  width={node.width}
                  height="32"
                  rx="8"
                  fill={isDarkMode ? colors.darkStroke : colors.stroke}
                  opacity="0.15"
                />
                
                {/* Node type badge */}
                <rect
                  x="8"
                  y="8"
                  width="auto"
                  height="16"
                  rx="8"
                  fill={isDarkMode ? colors.darkStroke : colors.stroke}
                  opacity="0.8"
                />
                
                {/* Node type text */}
                <text
                  x="12"
                  y="19"
                  className="text-xs font-semibold"
                  fill="white"
                >
                  {node.data.isNavigationNode ? 'RULE' : 
                   node.data.isPageNode ? 'PAGE' : 
                   node.data.itemType.toUpperCase()}
                </text>
                
                {/* Node title */}
                <text
                  x="12"
                  y="50"
                  className="text-sm font-bold"
                  fill={isDarkMode ? '#f8fafc' : '#1e293b'}
                >
                  {node.data.label.length > 30 
                    ? node.data.label.substring(0, 27) + '...' 
                    : node.data.label}
                </text>
                
                {/* Page items list */}
                {node.data.isPageNode && node.data.pageItems && node.data.pageItems.length > 0 && (
                  <g>
                    {/* Separator line */}
                    <line
                      x1="12"
                      y1="68"
                      x2={node.width - 12}
                      y2="68"
                      stroke={isDarkMode ? colors.darkStroke : colors.stroke}
                      strokeOpacity="0.3"
                    />
                    
                    {/* Items list */}
                    {node.data.pageItems.slice(0, 4).map((item: any, index: number) => (
                      <g key={item.uuid || index}>
                        <text
                          x="16"
                          y={85 + index * 20}
                          className="text-xs"
                          fill={isDarkMode ? '#cbd5e1' : '#64748b'}
                        >
                          {`${index + 1}. ${(item.label || item.fieldName || item.type || 'Item').substring(0, 35)}${
                            (item.label || item.fieldName || item.type || 'Item').length > 35 ? '...' : ''
                          }`}
                        </text>
                        {item.navigationRules && item.navigationRules.length > 0 && (
                          <circle
                            cx={node.width - 20}
                            cy={82 + index * 20}
                            r="3"
                            fill={isDarkMode ? '#fb923c' : '#f97316'}
                          />
                        )}
                      </g>
                    ))}
                    
                    {node.data.pageItems.length > 4 && (
                      <text
                        x="16"
                        y={85 + 4 * 20}
                        className="text-xs font-medium"
                        fill={isDarkMode ? '#94a3b8' : '#6b7280'}
                      >
                        +{node.data.pageItems.length - 4} more items...
                      </text>
                    )}
                  </g>
                )}
                
                {/* Navigation node description */}
                {node.data.isNavigationNode && node.data.description && (
                  <text
                    x="12"
                    y="70"
                    className="text-xs"
                    fill={isDarkMode ? '#cbd5e1' : '#64748b'}
                  >
                    {node.data.description.length > 35 
                      ? node.data.description.substring(0, 32) + '...' 
                      : node.data.description}
                  </text>
                )}
                
                {/* Status indicators */}
                <g transform={`translate(${node.width - 40}, 8)`}>
                  {/* Navigation rules indicator */}
                  {node.data.hasConditionalFlow && (
                    <g>
                      <circle 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        fill={isDarkMode ? '#fb7185' : '#f43f5e'} 
                        opacity="0.2" 
                      />
                      <path
                        d="M8 12l3 3 6-6"
                        stroke={isDarkMode ? '#fb7185' : '#f43f5e'}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </g>
                
                {/* Node ID for debugging */}
                {isSelected && (
                  <text
                    x={node.width / 2}
                    y={node.height + 20}
                    textAnchor="middle"
                    className="text-xs"
                    fill={isDarkMode ? '#94a3b8' : '#64748b'}
                  >
                    {node.data.isNavigationNode ? 'Click settings to edit rules' : 'Page overview'}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controls */}
      {zoomable && (
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(0.1)}
              className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button
              onClick={handleFitView}
              className="flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <button
              onClick={() => setCursorMode(cursorMode === 'select' ? 'pan' : 'select')}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                cursorMode === 'pan' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={cursorMode === 'select' ? 'Switch to Pan Mode (or hold Space)' : 'Switch to Select Mode'}
            >
              {cursorMode === 'select' ? <Move className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Zoom level indicator */}
          <div className="text-center mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-3">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900 border border-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Page</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Navigation Rule</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-px bg-gray-400"></div>
            <span className="text-gray-600 dark:text-gray-400">Sequential Flow</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-px bg-orange-500 border-dashed border-b"></div>
            <span className="text-gray-600 dark:text-gray-400">Conditional Flow</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {selectedNode && selectedNodeData && (
        <div className="absolute top-4 right-4 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-t-xl border-b border-gray-200/50 dark:border-gray-600/50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedNodeData.data.isNavigationNode ? 'Navigation Rule' : 
                   selectedNodeData.data.isPageNode ? 'Page Details' : 'Item Details'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedNodeData.data.isNavigationNode ? 'Controls flow between pages' : 'Survey content'}
                </p>
              </div>
              {selectedNodeData.data.isNavigationNode && (
                <button
                  onClick={() => setEditingRules(selectedNode)}
                  className="flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{selectedNodeData.data.label}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</label>
              <div className="flex gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border">
                  {selectedNodeData.data.nodeType}
                </span>
                {selectedNodeData.data.isPageNode && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    PAGE
                  </span>
                )}
                {selectedNodeData.data.isNavigationNode && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                    NAVIGATION
                  </span>
                )}
              </div>
            </div>
            
            {selectedNodeData.data.isPageNode && selectedNodeData.data.pageItems && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Items ({selectedNodeData.data.pageItems.length})</label>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {selectedNodeData.data.pageItems.map((item: any, index: number) => (
                    <div key={item.uuid || index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">
                        {item.fieldName || item.label || item.type || 'Item'}
                      </span>
                      {item.navigationRules && item.navigationRules.length > 0 && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" title="Has navigation rules"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedNodeData.data.description && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {selectedNodeData.data.description.length > 120 ? selectedNodeData.data.description.substring(0, 117) + '...' : selectedNodeData.data.description}
                </p>
              </div>
            )}
            
            {/* Connection info */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Connections</label>
              <div className="mt-1 space-y-1">
                {edges.filter(e => e.source === selectedNode || e.target === selectedNode).map(edge => (
                  <div key={edge.id} className="text-xs text-gray-600 dark:text-gray-300">
                    {edge.source === selectedNode ? '→' : '←'} {edge.label || 'Connection'}
                  </div>
                ))}
                {edges.filter(e => e.source === selectedNode || e.target === selectedNode).length === 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">No connections</span>
                )}
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
              <div className="flex items-center gap-2 mt-1">
                {selectedNodeData.data.hasConditionalFlow ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Has Rules
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Sequential
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Rule Editor Modal */}
      {editingRules && selectedNodeData && (
        <NavigationRulesEditorDialog
          data={selectedNodeData.data.originalData}
          nodeId={editingRules}
          nodeName={selectedNodeData.data.label}
          navigationRules={selectedNodeData.data.originalData.navigationRules || []}
          // availableFields={fieldNames}
          availableTargets={targets}
          onSave={(rules: NavigationRule[]) => saveNavigationRules(editingRules, rules)}
          onClose={() => setEditingRules(null)}
        />
      )}
    </div>
  );
};