import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "../../components/ui/select";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData, NavigationRule } from "../../types";
import { NavigationRuleValueInput } from "./NavigationRuleValueInput";
import { getOutputPropertyOptions } from "../../utils/outputSchema";
import {
  OPERATORS,
  enhancedRuleToStandard,
  standardRuleToEnhanced,
  type EnhancedNavigationRule
} from "./navigation-rules-types";
import { Plus, GripVertical } from "lucide-react";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "../../components/ui/sortable";

interface Props {
  data: BlockData;
  onUpdate?: (data: BlockData) => void;
  /** If provided, only show and edit this specific rule index (0-based). Used for single-rule editing mode. */
  editRuleIndex?: number;
  /** If true, hides the "Remove Rule" button. Used when editing an existing rule from the edge. */
  hideRemoveButton?: boolean;
}

interface RuleState extends EnhancedNavigationRule {
  id: string;
}

function parseRule(rule: NavigationRule & { id?: string }): RuleState {
  const parsed = standardRuleToEnhanced(rule.condition);
  return {
    id: rule.id || uuidv4(),
    field: parsed.field || "",
    operator: parsed.operator || "==",
    value: parsed.value || "",
    target: String(rule.target),
    isPage: rule.isPage,
  };
}

function buildRule(state: RuleState): NavigationRule {
  const condition = enhancedRuleToStandard(state);
  return {
    condition,
    target: state.target,
    isPage: state.isPage,
  };
}

export const NavigationRulesEditor: React.FC<Props> = ({ data, onUpdate, editRuleIndex, hideRemoveButton }) => {
  const { state, getAvailableFieldsUptoCurrent } = useSurveyBuilder();

  // Initialize rules state early, before any conditional returns
  const [rules, setRules] = React.useState<RuleState[]>(() => {
    return (data.navigationRules || []).map(parseRule);
  });

  // Helper function to find a block by field name
  const findBlockByFieldName = React.useCallback((fieldName: string): BlockData | null => {
    if (!state.rootNode || !fieldName) return null;

    const traverse = (node: any): BlockData | null => {
      // Check if this node matches
      if (node.fieldName === fieldName) {
        return node as BlockData;
      }

      // Check items array
      if (Array.isArray(node.items)) {
        for (const item of node.items) {
          const result = traverse(item);
          if (result) return result;
        }
      }

      // Check nodes array
      if (Array.isArray(node.nodes)) {
        for (const childNode of node.nodes) {
          if (typeof childNode !== "string") {
            const result = traverse(childNode);
            if (result) return result;
          }
        }
      }

      return null;
    };

    return traverse(state.rootNode);
  }, [state.rootNode]);

  // Helper function to extract options from a block
  const getBlockOptions = React.useCallback((block: BlockData | null): Array<{ label: string; value: string }> => {
    if (!block) return [];

    // Check for options array (new format used by radio, select, checkbox blocks)
    if (Array.isArray(block.options)) {
      return block.options.map((opt: any) => ({
        label: opt.label || opt.value || String(opt),
        value: opt.value || opt.label || String(opt),
      }));
    }

    // Check for labels/values arrays (legacy format)
    if (Array.isArray(block.labels)) {
      return block.labels.map((label: string, index: number) => ({
        label,
        value: Array.isArray(block.values) ? String(block.values[index]) : label,
      }));
    }

    return [];
  }, []);

  // Options for a rule's field: the block's own options, or for `fieldName.<key>`
  // the options its output schema lists for that key
  const getFieldOptions = React.useCallback((field: string): Array<{ label: string; value: string }> => {
    const block = findBlockByFieldName(field);
    if (block) return getBlockOptions(block);

    const dot = field.indexOf(".");
    if (dot === -1) return [];

    const parent = findBlockByFieldName(field.slice(0, dot));
    const definition = parent ? state.definitions?.blocks?.[parent.type] : undefined;
    if (!parent || !definition) return [];

    return getOutputPropertyOptions(definition, parent, field.slice(dot + 1));
  }, [findBlockByFieldName, getBlockOptions, state.definitions?.blocks]);

  const findBlockPath = React.useCallback((node: any, targetUuid: string, currentPath: any[] = []): any[] | null => {
    if (!node) return null;
    
    const newPath = [...currentPath, node];
    
    // Check if this node has the target block in its items
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        if (item.uuid === targetUuid || item.fieldName === targetUuid) {
          return [...newPath, item];
        }
      }
    }
    
    // Check if this node has items and recurse into them
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        const result = findBlockPath(item, targetUuid, newPath);
        if (result) return result;
      }
    }
    
    // Check if this node has child nodes and recurse into them
    if (Array.isArray(node.nodes)) {
      for (const childNode of node.nodes) {
        if (typeof childNode !== "string") {
          const result = findBlockPath(childNode, targetUuid, newPath);
          if (result) return result;
        }
      }
    }
    
    return null;
  }, []);

  const detectNavigationCycles = React.useCallback((rootNode: any): string[] => {
    if (!rootNode) return [];
    
    try {
      const cycles: string[] = [];
      
      const getNodeName = (nodeId: string): string => {
        const node = findNodeById(rootNode, nodeId);
        return node?.name || node?.fieldName || node?.label || nodeId;
      };
      
      // Build a simple navigation graph
      const navigationGraph = new Map<string, string[]>();
      const allNodes = getAllNodes(rootNode);
      
      // Collect all navigation rules
      for (const node of allNodes) {
        if (node.uuid && node.navigationRules) {
          const targets: string[] = [];
          for (const rule of node.navigationRules) {
            if (rule.target && rule.target !== 'submit') {
              targets.push(rule.target);
            }
          }
          if (targets.length > 0) {
            navigationGraph.set(node.uuid, targets);
          }
        }
      }
      
      // Simple cycle detection using DFS
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const hasCycle = (nodeId: string, path: string[]): boolean => {
        if (recursionStack.has(nodeId)) {
          // Found a cycle - extract the cycle part
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart >= 0) {
            const cyclePath = path.slice(cycleStart).concat(nodeId);
            const cycleNames = cyclePath.map(getNodeName);
            const cycleString = cycleNames.join(' → ');
            if (!cycles.includes(cycleString)) {
              cycles.push(cycleString);
            }
          }
          return true;
        }
        
        if (visited.has(nodeId)) {
          return false;
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const targets = navigationGraph.get(nodeId) || [];
        for (const target of targets) {
          if (hasCycle(target, [...path, nodeId])) {
            // Continue to find all cycles, don't return early
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      };
      
      // Check each node for cycles
      for (const [nodeId] of navigationGraph) {
        visited.clear();
        recursionStack.clear();
        hasCycle(nodeId, []);
      }
      
      return cycles;
    } catch (error) {
      console.error('Error detecting cycles:', error);
      return [];
    }
  }, []);

  const findNodeById = React.useCallback((node: any, targetId: string): any => {
    if (!node) return null;
    
    if (node.uuid === targetId) return node;
    
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        if (item.uuid === targetId) return item;
        const result = findNodeById(item, targetId);
        if (result) return result;
      }
    }
    
    if (Array.isArray(node.nodes)) {
      for (const childNode of node.nodes) {
        if (typeof childNode !== "string") {
          const result = findNodeById(childNode, targetId);
          if (result) return result;
        }
      }
    }
    
    return null;
  }, []);

  const getAllNodes = React.useCallback((node: any): any[] => {
    if (!node) return [];
    
    let nodes: any[] = [];
    
    if (node.uuid) {
      nodes.push(node);
    }
    
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        nodes = nodes.concat(getAllNodes(item));
      }
    }
    
    if (Array.isArray(node.nodes)) {
      for (const childNode of node.nodes) {
        if (typeof childNode !== "string") {
          nodes = nodes.concat(getAllNodes(childNode));
        }
      }
    }
    
    return nodes;
  }, []);


  const collectPages = React.useCallback((node: any) => {
    if (!node) return [] as Array<{ uuid: string; name: string }>;
    let pages: Array<{ uuid: string; name: string }> = [];
    if (node.type === "set") {
      pages.push({ uuid: node.uuid || "", name: node.name || node.uuid || "Page" });
    }
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        pages = pages.concat(collectPages(item));
      }
    }
    if (Array.isArray(node.nodes)) {
      for (const n of node.nodes) {
        if (typeof n !== "string") {
          pages = pages.concat(collectPages(n));
        }
      }
    }
    return pages;
  }, []);

  const collectBlocks = React.useCallback((node: any) => {
    if (!node) return [] as Array<{ uuid: string; name: string }>;
    let blocks: Array<{ uuid: string; name: string }> = [];
    if (node.type !== "set" && node.type !== "section") {
      blocks.push({
        uuid: node.uuid || "",
        name: node.name || node.fieldName || node.uuid || "Block",
      });
    }
    if (Array.isArray(node.items)) {
      for (const item of node.items) {
        blocks = blocks.concat(collectBlocks(item));
      }
    }
    if (Array.isArray(node.nodes)) {
      for (const n of node.nodes) {
        if (typeof n !== "string") {
          blocks = blocks.concat(collectBlocks(n));
        }
      }
    }
    return blocks;
  }, []);

  const fieldOptions = React.useMemo(() => {
    // Get current block identifier (UUID or fieldName)
    const currentBlockId = data.uuid || data.fieldName;

    if (!currentBlockId) {
      return [];
    }

    // Get fields that exist before the current block (for navigation conditions)
    return getAvailableFieldsUptoCurrent(currentBlockId);
  }, [data.uuid, data.fieldName, getAvailableFieldsUptoCurrent]);
  const pageOptions = React.useMemo(() => collectPages(state.rootNode), [state.rootNode]);
  const allBlockOptions = React.useMemo(() => collectBlocks(state.rootNode), [state.rootNode]);
  
  // Filter out current block from target options (can't navigate to self)
  const blockOptions = React.useMemo(() => {
    const currentBlockId = data.uuid || data.fieldName;
    return allBlockOptions.filter(block => block.uuid !== currentBlockId);
  }, [allBlockOptions, data.uuid, data.fieldName]);
  
  // Only show navigation rules editor if there are multiple pages or blocks to navigate to
  const shouldShowEditor = React.useMemo(() => {
    if (state.enableDebug) {
      console.log('NavigationRulesEditor debug:', {
        pageOptions: pageOptions.length,
        blockOptions: blockOptions.length,
        allBlockOptions: allBlockOptions.length,
        shouldShow: pageOptions.length > 1 || allBlockOptions.length > 1
      });
    }
    return pageOptions.length > 1 || allBlockOptions.length > 1;
  }, [pageOptions.length, blockOptions.length, allBlockOptions.length, state.enableDebug]);

  const navigationCycles = React.useMemo(() => {
    return detectNavigationCycles(state.rootNode);
  }, [state.rootNode, detectNavigationCycles]);

  // Track if we're internally updating to prevent sync loops
  const isInternalUpdateRef = React.useRef(false);
  
  // Sync rules when data.navigationRules changes externally
  React.useEffect(() => {
    if (!isInternalUpdateRef.current) {
      setRules((data.navigationRules || []).map(parseRule));
    }
    isInternalUpdateRef.current = false;
  }, [data.navigationRules]);

  React.useEffect(() => {
    const converted = rules.map(buildRule);
    isInternalUpdateRef.current = true;
    onUpdate?.({ ...data, navigationRules: converted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  const handleRuleChange = React.useCallback((index: number, field: keyof RuleState, value: any) => {
    setRules((prev) => {
      const newRules = [...prev];
      newRules[index] = { ...newRules[index], [field]: value };
      return newRules;
    });
  }, []);

  const handleTargetChange = React.useCallback((index: number, val: string) => {
    if (val === "submit") {
      setRules((prev) => {
        const newRules = [...prev];
        newRules[index] = { ...newRules[index], target: "submit", isPage: false };
        return newRules;
      });
      return;
    }
    const [kind, uuid] = val.split(":");
    setRules((prev) => {
      const newRules = [...prev];
      newRules[index] = { ...newRules[index], target: uuid, isPage: kind === "page" };
      return newRules;
    });
  }, []);

  const addRule = React.useCallback(() => {
    setRules((prev) => [
      ...prev,
      { id: uuidv4(), field: "", operator: "==", value: "", target: "", isPage: true },
    ]);
  }, []);

  const removeRule = React.useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReorderRules = React.useCallback((newRules: RuleState[]) => {
    setRules(newRules);
  }, []);

  const renderRuleEditor = React.useCallback((rule: RuleState, index: number, isSortable: boolean = false) => {
    if (isSortable) {
      return (
          <SortableItem key={rule.id} value={rule.id} className="border rounded-md p-3 space-y-3 my-2 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <SortableItemHandle className="cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1">
                <GripVertical className="h-4 w-4" />
              </SortableItemHandle>
              <span className="text-xs font-medium text-muted-foreground">Rule {index + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Variable</Label>
                <Select
                  value={rule.field}
                  onValueChange={(val) => handleRuleChange(index, "field", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                    {fieldOptions.map((name) => (
                      <SelectItem key={name} value={name} className="pl-2">
                        <span className="text-sm">{name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Operator</Label>
                <Select
                  value={rule.operator}
                  onValueChange={(val) => handleRuleChange(index, "operator", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Comparison</SelectLabel>
                      {OPERATORS.filter(op => op.category === 'comparison').map((op) => (
                        <SelectItem key={op.value} value={op.value} className="pl-4">
                          <span className="text-sm">{op.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Text</SelectLabel>
                      {OPERATORS.filter(op => op.category === 'string').map((op) => (
                        <SelectItem key={op.value} value={op.value} className="pl-4">
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{op.label}</span>
                            {op.description && (
                              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {op.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Array/List</SelectLabel>
                      {OPERATORS.filter(op => op.category === 'array').map((op) => (
                        <SelectItem key={op.value} value={op.value} className="pl-4">
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{op.label}</span>
                            {op.description && (
                              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {op.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Logical</SelectLabel>
                      {OPERATORS.filter(op => op.category === 'logical').map((op) => (
                        <SelectItem key={op.value} value={op.value} className="pl-4">
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{op.label}</span>
                            {op.description && (
                              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {op.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Date</SelectLabel>
                      {OPERATORS.filter(op => op.category === 'date').map((op) => (
                        <SelectItem key={op.value} value={op.value} className="pl-4">
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{op.label}</span>
                            {op.description && (
                              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {op.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Value</Label>
                <NavigationRuleValueInput
                  value={rule.value as any}
                  onChange={(val) => handleRuleChange(index, "value", val)}
                  operator={OPERATORS.find(op => op.value === rule.operator) || OPERATORS[0]}
                  availableVariables={fieldOptions}
                  fieldType={data.type === 'number' ? 'number' : 'text'}
                  fieldOptions={getFieldOptions(rule.field)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Target</Label>
                <Select
                  value={
                    rule.target === "submit"
                      ? "submit"
                      : rule.isPage
                        ? `page:${rule.target}`
                        : `block:${rule.target}`
                  }
                  onValueChange={(val) => handleTargetChange(index, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Pages</SelectLabel>
                      {pageOptions.map((p) => (
                        <SelectItem key={`page-${p.uuid}`} value={`page:${p.uuid}`} className="pl-4">
                          <span className="text-sm">{p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Blocks</SelectLabel>
                      {blockOptions.map((b) => (
                        <SelectItem key={`block-${b.uuid}`} value={`block:${b.uuid}`} className="pl-4">
                          <span className="text-sm">{b.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectItem value="submit" className="font-medium">
                      <span className="text-sm">Submit Form</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!hideRemoveButton && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRule(index)}
                >
                  Remove Rule
                </Button>
              </div>
            )}
          </SortableItem>
      );
    }
    return (
        <div key={rule.id} className="border rounded-md p-3 space-y-3 my-2 bg-background">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Variable</Label>
              <Select
                value={rule.field}
                onValueChange={(val) => handleRuleChange(index, "field", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                  {fieldOptions.map((name) => (
                    <SelectItem key={name} value={name} className="pl-2">
                      <span className="text-sm">{name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Operator</Label>
              <Select
                value={rule.operator}
                onValueChange={(val) => handleRuleChange(index, "operator", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Comparison</SelectLabel>
                    {OPERATORS.filter(op => op.category === 'comparison').map((op) => (
                      <SelectItem key={op.value} value={op.value} className="pl-4">
                        <span className="text-sm">{op.label}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Text</SelectLabel>
                    {OPERATORS.filter(op => op.category === 'string').map((op) => (
                      <SelectItem key={op.value} value={op.value} className="pl-4">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{op.label}</span>
                          {op.description && (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {op.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Array/List</SelectLabel>
                    {OPERATORS.filter(op => op.category === 'array').map((op) => (
                      <SelectItem key={op.value} value={op.value} className="pl-4">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{op.label}</span>
                          {op.description && (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {op.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Logical</SelectLabel>
                    {OPERATORS.filter(op => op.category === 'logical').map((op) => (
                      <SelectItem key={op.value} value={op.value} className="pl-4">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{op.label}</span>
                          {op.description && (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {op.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Date</SelectLabel>
                    {OPERATORS.filter(op => op.category === 'date').map((op) => (
                      <SelectItem key={op.value} value={op.value} className="pl-4">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{op.label}</span>
                          {op.description && (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {op.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Value</Label>
              <NavigationRuleValueInput
                value={rule.value as any}
                onChange={(val) => handleRuleChange(index, "value", val)}
                operator={OPERATORS.find(op => op.value === rule.operator) || OPERATORS[0]}
                availableVariables={fieldOptions}
                fieldType={data.type === 'number' ? 'number' : 'text'}
                fieldOptions={getFieldOptions(rule.field)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Target</Label>
              <Select
                value={
                  rule.target === "submit"
                    ? "submit"
                    : rule.isPage
                      ? `page:${rule.target}`
                      : `block:${rule.target}`
                }
                onValueChange={(val) => handleTargetChange(index, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Pages</SelectLabel>
                    {pageOptions.map((p) => (
                      <SelectItem key={`page-${p.uuid}`} value={`page:${p.uuid}`} className="pl-4">
                        <span className="text-sm">{p.name}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Blocks</SelectLabel>
                    {blockOptions.map((b) => (
                      <SelectItem key={`block-${b.uuid}`} value={`block:${b.uuid}`} className="pl-4">
                        <span className="text-sm">{b.name}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectItem value="submit" className="font-medium">
                    <span className="text-sm">Submit Form</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!hideRemoveButton && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeRule(index)}
              >
                Remove Rule
              </Button>
            </div>
          )}
        </div>
    );
  }, [fieldOptions, pageOptions, blockOptions, handleRuleChange, handleTargetChange, removeRule, data.type, getFieldOptions, hideRemoveButton]);

  // Don't render the editor if there's only one page or one block
  if (!shouldShowEditor) {
    return null;
  }

  return (
    <div className="space-y-4 mt-4 border rounded-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Navigation Rules</h3>
          <p className="text-xs text-muted-foreground">
          Define conditions to control survey flow
          </p>
        </div>
      </div>

      {navigationCycles.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2 my-2">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 font-medium text-sm">⚠️ Circular Navigation Detected</span>
          </div>
          <div className="text-sm text-yellow-700">
            The following navigation cycles were detected:
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {navigationCycles.map((cycle, idx) => (
              <li key={idx} className="font-mono">• {cycle}</li>
            ))}
          </ul>
          <div className="text-xs text-yellow-600">
            Circular navigation may cause users to get stuck in loops. Consider adding conditions or alternative exit paths.
          </div>
        </div>
      )}

      {/* Single rule editing mode when editRuleIndex is provided */}
      {editRuleIndex !== undefined ? (
        <div className="space-y-4">
          {rules[editRuleIndex] && renderRuleEditor(rules[editRuleIndex], editRuleIndex)}
          {!rules[editRuleIndex] && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Rule not found</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No Navigation rules defined</p>
              <p className="text-xs">Click "Add Rule" to create custom navigation flows</p>
            </div>
          ) : (
            <Sortable
              value={rules}
              onValueChange={handleReorderRules}
              getItemValue={(rule) => rule.id}
              orientation="vertical"
            >
              <SortableContent className="space-y-2">
                {rules.map((rule, index) => renderRuleEditor(rule, index, true))}
              </SortableContent>
              <SortableOverlay>
                {({ value }) => {
                  const rule = rules.find((r) => r.id === value);
                  const index = rules.findIndex((r) => r.id === value);
                  return rule ? renderRuleEditor(rule, index, true) : null;
                }}
              </SortableOverlay>
            </Sortable>
          )}
          <div className="flex items-center justify-between">
            <Button type="button" onClick={addRule} size="sm" variant="outline">
              <Plus className="h-3 w-3 mr-1" />
              Add Rule
            </Button>
          </div>
        </>
      )}

    </div>
  );
};
