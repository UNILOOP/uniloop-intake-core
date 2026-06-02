import type React from "react";
import { useState, Suspense, lazy } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Label } from "../../../components/ui/label";
import { useSurveyBuilder } from "../../../context/SurveyBuilderContext";
import { BlockData } from "../../../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import {CommonBlockRules} from "../../common/CommonBlockRules";
import { FieldNameField, resolveFieldConfig } from "../../common/FieldNameField";
import { PieChart } from "lucide-react";

// Lazy load heavy rule editors - they're only used when dialog is open
const NavigationRulesEditor = lazy(() => import("../../common/NavigationRulesEditor").then(m => ({ default: m.NavigationRulesEditor })));
const ValidationRulesEditor = lazy(() => import("../../common/ValidationRulesEditor").then(m => ({ default: m.ValidationRulesEditor })));
const ABTestEditor = lazy(() => import("../../common/ABTestEditor").then(m => ({ default: m.ABTestEditor })));

interface ContentBlockItemProps {
  data: BlockData;
  onUpdate: (data: BlockData) => void;
  onRemove: () => void;
}

export const ContentBlockItem: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
  onRemove,
}) => {
  const { state } = useSurveyBuilder();
  const [isEditing, setIsEditing] = useState(false);
  const blockDefinition = state.definitions.blocks[data.type];

  if (!blockDefinition) {
    return (
      <Card className="mb-4 content-block-item border-destructive">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex gap-2 items-center">
            <span className="text-destructive">Unknown block type: {data.type}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-4 content-block-item">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="flex gap-2 items-center flex-wrap">
          {blockDefinition.icon && <span>{blockDefinition.icon}</span>}
          <span className="font-medium">{data.name || blockDefinition.name}</span>
          {data.fieldName && (
            <span className="text-xs bg-muted px-2 py-1 rounded-md">
              {data.fieldName}
            </span>
          )}
          {data.abTest?.enabled && (
            <Badge variant="secondary" className="gap-1">
              <PieChart className="h-3 w-3" />
              A/B Testing ({data.abTest.variants.length} variants)
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button type="button"
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-4xl overflow-y-scroll max-h-screen">
              <DialogHeader>
                <DialogTitle>Edit {blockDefinition.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4 p-4 mt-4 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Block Configuration</Label>
                  </div>
                  {(() => {
                    const fieldConfig = resolveFieldConfig(blockDefinition.fieldConfig);
                    return fieldConfig ? (
                      <FieldNameField data={data} onUpdate={onUpdate} config={fieldConfig} />
                    ) : null;
                  })()}
                  {blockDefinition.renderFormFields?.({
                    data,
                    onUpdate,
                    onRemove: () => {
                      setIsEditing(false);
                      onRemove();
                    },
                  })}
                </div>
                <CommonBlockRules data={data} onUpdate={onUpdate} />
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading editors...</div>}>
                  <ABTestEditor data={data} onUpdate={onUpdate} />
                  <NavigationRulesEditor data={data} onUpdate={onUpdate} />
                  <ValidationRulesEditor data={data} onUpdate={onUpdate} />
                </Suspense>
              </div>
            </DialogContent>
          </Dialog>

          <Button type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {blockDefinition.renderItem?.({
          data,
          onUpdate,
          onRemove,
        })}
      </CardContent>

      <CardFooter className="bg-muted/50 flex justify-end">
        <div className="text-xs text-muted-foreground">
          {data.uuid ? `ID: ${data.uuid.substring(0, 8)}` : "New Item"}
        </div>
      </CardFooter>
    </Card>
  );
};
