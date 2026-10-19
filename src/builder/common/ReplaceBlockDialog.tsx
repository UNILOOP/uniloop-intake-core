import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData } from "../../types";
import { getReplacementBlockTypes, replaceBlock } from "../../utils/blockReplacement";
import type { BlockReplacement } from "../../utils/blockReplacement";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { BlockSelectorDialog } from "../flowv3/BlockSelectorDialog";

/**
 * ReplaceBlockDialog
 * ------------------
 * Lists the blocks that can replace `block` (those whose answer has the same
 * shape, see getReplacementBlockTypes) and hands the replacement to `onReplace`.
 * When the new block can't take some of this block's settings, it lists them
 * and replaces only once the user confirms.
 * Used by the survey builder's block cards and the flow builder's nodes.
 */

interface ReplaceBlockDialogProps {
  block: BlockData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplace: (data: BlockData) => void;
}

/** A setting's key as words, e.g. showSelectionIndicator as "Show selection indicator" */
const toWords = (field: string) => {
  const words = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const ReplaceBlockDialog: React.FC<ReplaceBlockDialogProps> = ({
  block,
  open,
  onOpenChange,
  onReplace,
}) => {
  const { state } = useSurveyBuilder();
  const blocks = state.definitions.blocks;
  // Global custom fields can be set on every block, so a replacement keeps them
  const globalFields = useMemo(
    () => (state.globalCustomFields ?? []).map((field) => field.key),
    [state.globalCustomFields]
  );
  const [pending, setPending] = useState<{ type: string; replacement: BlockReplacement } | null>(null);

  useEffect(() => {
    if (!open) setPending(null);
  }, [open]);

  const blockTypes = useMemo(
    () => (open ? getReplacementBlockTypes(block, blocks) : []),
    [open, block, blocks]
  );

  const replace = useCallback(
    (data: BlockData) => {
      onReplace(data);
      onOpenChange(false);
    },
    [onReplace, onOpenChange]
  );

  const handleSelect = useCallback(
    (type: string) => {
      const replacement = replaceBlock(block, type, blocks, globalFields);
      if (!replacement) return;
      if (replacement.droppedFields.length > 0) {
        setPending({ type, replacement });
        return;
      }
      replace(replacement.data);
    },
    [block, blocks, globalFields, replace]
  );

  const name = blocks[block.type]?.name || block.type;

  if (pending) {
    const nextName = blocks[pending.type]?.name || pending.type;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{`Replace ${name} with ${nextName}?`}</DialogTitle>
            <DialogDescription>
              {nextName} has no place for these settings of this block, or takes them in another
              shape, so they'll be removed:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {pending.replacement.droppedFields.map((field) => (
              <li key={field}>
                {toWords(field)} <code className="text-xs text-slate-500">{field}</code>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Everything else carries over: the field name, rules and connections, and the settings
            both blocks have.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Back
            </Button>
            <Button type="button" onClick={() => replace(pending.replacement.data)}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <BlockSelectorDialog
      open={open}
      onOpenChange={onOpenChange}
      onSelect={handleSelect}
      blockTypes={blockTypes}
      title={`Replace ${name}`}
      description={
        <div className="space-y-1">
          <p>
            Only blocks that save their answer in the same shape are listed, so rules that read
            this block keep working.
          </p>
          <p>
            The new block keeps this block's field name, rules and connections, and every setting
            it also has, such as the question and its options. Its other settings start from its
            defaults. If this block has settings the new block can't take, you'll see them before
            anything changes.
          </p>
          {block.abTest?.enabled && (
            <p>This block's A/B test is removed, because its variants are copies of this block.</p>
          )}
        </div>
      }
    />
  );
};
