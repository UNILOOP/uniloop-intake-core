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
import { OutputFieldsEditor } from "../../common/OutputFieldsEditor";
import { ReplaceBlockDialog } from "../../common/ReplaceBlockDialog";
import { BlockLockControl, BlockLockFieldset } from "../../common/BlockLock";
import { BlockLockProvider } from "../../../context/BlockLockContext";
import { isBlockLocked, isBlockUpdateAllowed } from "../../../utils/blockLock";
import { Lock, PieChart } from "lucide-react";

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
  const [isReplacing, setIsReplacing] = useState(false);
  const blockDefinition = state.definitions.blocks[data.type];
  const locked = isBlockLocked(data);

  // Every edit to this block goes through here, so its lock holds for the
  // settings dialog, the block's own inline editing and replace.
  const update = (next: BlockData) => {
    if (isBlockUpdateAllowed(data, next, blockDefinition)) onUpdate(next);
  };
  const remove = () => {
    if (!locked) onRemove();
  };

  if (!blockDefinition) {
    return (
      <Card className="mb-4 content-block-item border-destructive">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex gap-2 items-center">
            <span className="text-destructive">Unknown block type: {data.type}</span>
          </div>
          {!locked && (
            <div className="flex gap-2">
              <Button type="button"
                variant="destructive"
                size="sm"
                onClick={remove}
              >
                Remove
              </Button>
            </div>
          )}
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
          {locked && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
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
              <BlockLockProvider block={data} definition={blockDefinition}>
                <div className="py-4">
                  <BlockLockControl data={data} definition={blockDefinition} onUpdate={update} />
                  <div className="space-y-4 p-4 mt-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-semibold">Block Configuration</Label>
                    </div>
                    <BlockLockFieldset className="space-y-4">
                      {(() => {
                        const fieldConfig = resolveFieldConfig(blockDefinition.fieldConfig);
                        return fieldConfig ? (
                          <FieldNameField data={data} onUpdate={update} config={fieldConfig} />
                        ) : null;
                      })()}
                      {blockDefinition.renderFormFields?.({
                        data,
                        onUpdate: update,
                        onRemove: () => {
                          if (locked) return;
                          setIsEditing(false);
                          onRemove();
                        },
                      })}
                    </BlockLockFieldset>
                  </div>
                  <OutputFieldsEditor data={data} onUpdate={update} />
                  <BlockLockFieldset paths={["isEndBlock", "isEndBlockManual", "nextBlockId", "autoContinueOnSelect", "showContinueButton"]}>
                    <CommonBlockRules data={data} onUpdate={update} />
                  </BlockLockFieldset>
                  <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading editors...</div>}>
                    <BlockLockFieldset paths={["abTest"]}>
                      <ABTestEditor data={data} onUpdate={update} />
                    </BlockLockFieldset>
                    <BlockLockFieldset paths={["navigationRules"]}>
                      <NavigationRulesEditor data={data} onUpdate={update} />
                    </BlockLockFieldset>
                    <BlockLockFieldset paths={["validationRules"]}>
                      <ValidationRulesEditor data={data} onUpdate={update} />
                    </BlockLockFieldset>
                  </Suspense>
                </div>
              </BlockLockProvider>
            </DialogContent>
          </Dialog>

          {!locked && (
            <>
              <Button type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReplacing(true)}
              >
                Replace
              </Button>
              <ReplaceBlockDialog
                block={data}
                open={isReplacing}
                onOpenChange={setIsReplacing}
                onReplace={update}
              />

              <Button type="button"
                variant="outline"
                size="sm"
                onClick={remove}
              >
                Remove
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {blockDefinition.renderItem?.({
          data,
          onUpdate: update,
          onRemove: remove,
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
