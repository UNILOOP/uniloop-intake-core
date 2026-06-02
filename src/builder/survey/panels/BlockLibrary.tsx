import type React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";

export const BlockLibrary: React.FC = () => {
  const { state } = useSurveyBuilder();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Available Block Types</h3>
        <p className="text-sm text-muted-foreground mb-4">
          These are the content blocks that can be added to survey pages.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(state.definitions.blocks).map(([type, definition]) => (
            <Card
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-block-type", type);
              }}
              className="hover:bg-accent/10 cursor-pointer transition-colors"
            >
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {definition.icon && <span>{definition.icon}</span>}
                  {definition.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {definition.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="border rounded-md p-2 bg-muted/50">
                  {definition.renderPreview?.()}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(state.definitions.blocks).length === 0 && (
            <div className="col-span-1 sm:col-span-2 p-4 bg-muted rounded-md text-center">
              <p className="text-muted-foreground">
                No block definitions available. Add block definitions to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Available Node Types</h3>
        <p className="text-sm text-muted-foreground mb-4">
          These are the node types that can be added to the survey structure.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(state.definitions.nodes).map(([type, definition]) => (
            <Card key={type} className="hover:bg-accent/10 cursor-pointer transition-colors">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {definition.icon && <span>{definition.icon}</span>}
                  {definition.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {definition.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}

          {Object.keys(state.definitions.nodes).length === 0 && (
            <div className="col-span-1 sm:col-span-2 p-4 bg-muted rounded-md text-center">
              <p className="text-muted-foreground">
                No node definitions available. Add node definitions to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
