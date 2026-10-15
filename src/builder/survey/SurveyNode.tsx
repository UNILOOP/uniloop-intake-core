import type React from "react";
import { SectionNode } from "./nodes/SectionNode";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { NodeData } from "../../types";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import { containsLockedBlock } from "../../utils/blockLock";

interface SurveyNodeProps {
  data: NodeData;
}

export const SurveyNode: React.FC<SurveyNodeProps> = ({ data }) => {
  const { state, updateNode, removeNode } = useSurveyBuilder();

  // Get the appropriate node component based on the node type
  const getNodeComponent = () => {
    const nodeDefinition = state.definitions.nodes[data.type];

    if (!nodeDefinition) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unknown Node Type</AlertTitle>
          <AlertDescription>
            No definition found for node type: {data.type}
          </AlertDescription>
        </Alert>
      );
    }

    return nodeDefinition.renderNode({
      data,
      onUpdate: (updatedData) => {
        updateNode(data.uuid!, updatedData);
      },
      onRemove: () => {
        // Removing a section that holds a locked block would delete that block
        if (data.uuid && !containsLockedBlock(data)) {
          removeNode(data.uuid);
        }
      },
    });
  };

  // Render child nodes
  const renderChildNodes = () => {
    if (!data.nodes || data.nodes.length === 0) return null;

    return (
      <div className="ml-8 mt-2 border-l-2 border-muted pl-4">
        {data.nodes.map((nodeRef, index) => {
          // If the node reference is a string (uuid), we need to find the actual node
          if (typeof nodeRef === "string") {
            const childNode = state.rootNode
              ? findNodeByUuid(state.rootNode, nodeRef)
              : null;

            if (!childNode) {
              return (
                <Alert key={nodeRef} variant="destructive">
                  <AlertTitle>Missing Node</AlertTitle>
                  <AlertDescription>
                    Cannot find node with reference: {nodeRef}
                  </AlertDescription>
                </Alert>
              );
            }

            return <SurveyNode key={nodeRef} data={childNode} />;
          }

          // If it's a direct node object
          return <SurveyNode key={nodeRef.uuid || index} data={nodeRef} />;
        })}
      </div>
    );
  };

  return (
    <div className="survey-node">
      {getNodeComponent()}
      {renderChildNodes()}
    </div>
  );
};

// Helper function to find a node by UUID in the tree
const findNodeByUuid = (rootNode: NodeData, uuid: string): NodeData | null => {
  if (rootNode.uuid === uuid) return rootNode;

  if (!rootNode.nodes) return null;

  for (const childNode of rootNode.nodes) {
    if (typeof childNode === "string") {
      continue; // Skip string references
    }

    if (childNode.uuid === uuid) return childNode;

    const foundNode = findNodeByUuid(childNode, uuid);
    if (foundNode) return foundNode;
  }

  return null;
};
