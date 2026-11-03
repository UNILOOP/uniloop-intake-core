import type React from "react";
import { useState, useMemo, Suspense, lazy } from "react";
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
import { VisibilityEditor } from "../../common/VisibilityEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Lock, PieChart, EyeOff } from "lucide-react";
import { findForwardVisibilityRefs } from "../helpers/pageItems";

// Lazy load heavy rule editors - they're only used when dialog is open
const NavigationRulesEditor = lazy(() => import("../../common/NavigationRulesEditor").then(m => ({ default: m.NavigationRulesEditor })));
const ValidationRulesEditor = lazy(() => import("../../common/ValidationRulesEditor").then(m => ({ default: m.ValidationRulesEditor })));
const ABTestEditor = lazy(() => import("../../common/ABTestEditor").then(m => ({ default: m.ABTestEditor })));

interface ContentBlockItemProps {
  data: BlockData;
  onUpdate: (data: BlockData) => void;
  onRemove: () => void;
  /** The block sits on a page, whose own rules decide where Continue goes */
  inPage?: boolean;
  /** Where the block can move: pages, or out of its page */
  moveTargets?: Array<{ value: string; label: string }>;
  onMove?: (target: string) => void;
}

export const ContentBlockItem: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
  onRemove,
  inPage = false,
  moveTargets = [],
  onMove,
}) => {
  const { state } = useSurveyBuilder();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const blockDefinition = state.definitions.blocks[data.type];
  const locked = isBlockLocked(data);
  const forwardFields = useMemo(
    () => (data.visibility && data.uuid ? findForwardVisibilityRefs(state.rootNode?.items || [])[data.uuid] : undefined),
    [data.visibility, data.uuid, state.rootNode],
  );

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
          {data.visibility && (
            <Badge variant="secondary" className="gap-1">
              <EyeOff className="h-3 w-3" />
              {data.visibility.initial === "hidden" ? "Hidden until" : "Visible unless"}
            </Badge>
          )}
          {forwardFields && (
            <span role="note" className="text-xs rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">
              This rule uses {forwardFields.join(", ")}, which comes after this block
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          {onMove && moveTargets.length > 0 && (
            <Select value="" onValueChange={onMove}>
              <SelectTrigger className="h-8 w-[140px] text-sm" aria-label="Move block">
                <SelectValue placeholder="Move to…" />
              </SelectTrigger>
              <SelectContent>
                {moveTargets.map((target) => (
                  <SelectItem key={target.value} value={target.value}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
                    <BlockLockFieldset paths={["visibility"]}>
                      <VisibilityEditor data={data} onUpdate={update} />
                    </BlockLockFieldset>
                    {inPage ? (
                      <p className="mt-4 border rounded-md p-4 text-sm text-muted-foreground">
                        This block is on a page. The page's navigation rules decide where Continue goes.
                      </p>
                    ) : (
                      <BlockLockFieldset paths={["navigationRules"]}>
                        <NavigationRulesEditor data={data} onUpdate={update} />
                      </BlockLockFieldset>
                    )}
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
