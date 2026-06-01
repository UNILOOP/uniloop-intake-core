import React, { Suspense } from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import { NodeData, BlockData } from "../../types";
import { Settings } from "lucide-react";
import { NavigationRulesEditor } from "../common/NavigationRulesEditor";
import { ValidationRulesEditor } from "../common/ValidationRulesEditor";
import { CommonBlockRules } from "../common/CommonBlockRules";
import { FieldNameField, resolveFieldConfig } from "../common/FieldNameField";
import { ABTestEditor } from "../common/ABTestEditor";

interface NodeConfigPanelProps {
  nodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (nodeId: string, data: any) => void;
  mode?: "full" | "navigation-only"; // Add mode prop to control what's shown
  /** If provided in navigation-only mode, only edit this specific rule index */
  editRuleIndex?: number;
  /** If true, hides the remove button for the rule being edited */
  hideRemoveButton?: boolean;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  nodeId,
  open,
  onOpenChange,
  onUpdate,
  mode = "full",
  editRuleIndex,
  hideRemoveButton
}) => {
  const { state } = useSurveyBuilder();
  
  // Find the node data - improved to handle flow node IDs
  const findNodeData = (node: NodeData | null, id: string): { data: NodeData | BlockData, path: string } | null => {
    if (!node) return null;
    
    // Direct node match
    if (node.uuid === id) return { data: node, path: id };
    
    // Check for block IDs in format: pageUuid-block-index
    const blockMatch = id.match(/^(.+)-block-(\d+)$/);
    if (blockMatch) {
      const [, pageUuid, blockIndexStr] = blockMatch;
      const blockIndex = parseInt(blockIndexStr, 10);
      
      // Find the page with matching UUID
      const findPageWithBlock = (searchNode: NodeData): { data: BlockData, path: string } | null => {
        if (searchNode.uuid === pageUuid && searchNode.items && searchNode.items[blockIndex]) {
          return { data: searchNode.items[blockIndex], path: `${pageUuid}.items[${blockIndex}]` };
        }
        
        // Search in items (for nested pages)
        if (searchNode.items) {
          for (const item of searchNode.items) {
            if (item.type === 'set' && typeof item !== 'string') {
              const found = findPageWithBlock(item as NodeData);
              if (found) return found;
            }
          }
        }
        
        // Search in child nodes
        if (searchNode.nodes) {
          for (const childNode of searchNode.nodes) {
            if (typeof childNode !== 'string') {
              const found = findPageWithBlock(childNode);
              if (found) return found;
            }
          }
        }
        
        return null;
      };
      
      const blockResult = findPageWithBlock(node);
      if (blockResult) return blockResult;
    }
    
    // Check in items (blocks) - fallback
    if (node.items) {
      for (let i = 0; i < node.items.length; i++) {
        const item = node.items[i];
        if ((item as any).uuid === id || (item as any).fieldName === id) {
          return { data: item, path: `${node.uuid}.items[${i}]` };
        }
      }
    }
    
    // Check in child nodes
    if (node.nodes) {
      for (const childNode of node.nodes) {
        if (typeof childNode !== 'string') {
          const found = findNodeData(childNode, id);
          if (found) return found;
        }
      }
    }
    
    return null;
  };

  // Don't render anything if no nodeId
  if (!nodeId) {
    return null;
  }

  const nodeResult = findNodeData(state.rootNode, nodeId);
  const nodeData = nodeResult?.data;

  const isBlockData = (data: any): data is BlockData => {
    // A block is anything that's not a section or set type
    return data && typeof data === 'object' && data.type && data.type !== 'section' && data.type !== 'set';
  };

  const handleUpdateField = (field: string, value: any) => {
    const updatedData = { ...nodeData, [field]: value };
    onUpdate(nodeId, updatedData);
  };

  const handleBlockUpdate = (updatedData: BlockData) => {
    onUpdate(nodeId, updatedData);
  };

  const renderBlockConfig = (blockData: BlockData) => {
    const definition = state.definitions.blocks[blockData.type];
    
    // If in navigation-only mode, only show NavigationRulesEditor
    if (mode === "navigation-only") {
      const isEditing = hideRemoveButton && editRuleIndex !== undefined;
      return (
        <div className="space-y-4">
          <div className={`border rounded-md p-3 mb-4 ${isEditing ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className={`text-sm font-medium ${isEditing ? 'text-amber-800' : 'text-blue-800'}`}>
              {isEditing ? 'Editing Navigation Rule' : 'Creating Navigation Rule'}
            </div>
            <div className={`text-xs mt-1 ${isEditing ? 'text-amber-600' : 'text-blue-600'}`}>
              {isEditing
                ? 'Modify the condition for this navigation rule.'
                : 'Configure when this block should navigate to the connected target.'}
            </div>
          </div>

          <NavigationRulesEditor
            data={blockData}
            onUpdate={handleBlockUpdate}
            editRuleIndex={editRuleIndex}
            hideRemoveButton={hideRemoveButton}
          />
        </div>
      );
    }
    
    // Full mode shows all sections
    return (
      <div className="space-y-4">
        {/* Block-specific configuration using renderFormFields */}
        <div className="space-y-4 p-4 mt-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Block Configuration</Label>
          </div>
          {definition && definition.renderFormFields && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Block Configuration</Label>
              {(() => {
                const fieldConfig = resolveFieldConfig(definition.fieldConfig);
                return fieldConfig ? (
                  <FieldNameField data={blockData} onUpdate={handleBlockUpdate} config={fieldConfig} />
                ) : null;
              })()}
              {definition.renderFormFields({
                data: blockData,
                onUpdate: handleBlockUpdate,
                onRemove: () => {}
              })}
            </div>
          )}
        </div>


        {/* Common Block Rules */}
        <CommonBlockRules 
          data={blockData} 
          onUpdate={handleBlockUpdate} 
        />

        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading editors...</div>}>
          <ABTestEditor data={blockData} onUpdate={handleBlockUpdate} />
          <NavigationRulesEditor data={blockData} onUpdate={handleBlockUpdate} />
          <ValidationRulesEditor data={blockData} onUpdate={handleBlockUpdate} />
        </Suspense>

      </div>
    );
  };

  const renderNodeConfig = (nodeData: NodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="node-name">Name</Label>
          <Input
            id="node-name"
            value={nodeData.name || ''}
            onChange={(e) => handleUpdateField('name', e.target.value)}
            placeholder="Enter node name"
          />
        </div>

        <div>
          <Label htmlFor="node-type">Type</Label>
          <Input
            id="node-type"
            value={nodeData.type}
            disabled
            className="bg-muted"
          />
        </div>

        {nodeData.type === 'section' && (
          <div>
            <Label htmlFor="navigation-logic">Navigation Logic</Label>
            <Textarea
              id="navigation-logic"
              value={nodeData.navigationLogic || ''}
              onChange={(e) => handleUpdateField('navigationLogic', e.target.value)}
              placeholder="Enter navigation logic"
              rows={4}
            />
          </div>
        )}

        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Structure</div>
          <div className="text-xs text-muted-foreground space-y-1">
            {nodeData.items && (
              <div>Blocks: {nodeData.items.length}</div>
            )}
            {nodeData.nodes && (
              <div>Child Nodes: {nodeData.nodes.length}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-4xl overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            {nodeData ? (
              <>
                {mode === "navigation-only" && isBlockData(nodeData) ? (
                  <>
                    {hideRemoveButton && editRuleIndex !== undefined ? 'Edit Navigation Rule' : 'Create Navigation Rule'}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      From: {nodeData.fieldName || nodeData.label || "Block"}
                    </span>
                  </>
                ) : (
                  <>
                    {isBlockData(nodeData) ? `Edit ${nodeData.type} Block` : `Edit ${nodeData.type} Node`}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ID: {nodeId}
                    </span>
                  </>
                )}
              </>
            ) : (
              "Node Configuration"
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {nodeData ? (
            isBlockData(nodeData) ? (
              renderBlockConfig(nodeData)
            ) : mode === "navigation-only" ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Navigation rules can only be created for blocks</p>
                <p className="text-xs text-muted-foreground mt-2">This node type does not support navigation rules</p>
              </div>
            ) : (
              renderNodeConfig(nodeData)
            )
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Node not found</p>
              <p className="text-xs text-muted-foreground mt-2">ID: {nodeId}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};