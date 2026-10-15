import type React from "react";
import { useCallback, useMemo } from "react";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData } from "../../types";
import { getReplacementBlockTypes, replaceBlock } from "../../utils/blockReplacement";
import { BlockSelectorDialog } from "../flowv3/BlockSelectorDialog";

/**
 * ReplaceBlockDialog
 * ------------------
 * Lists the blocks that can replace `block` (those whose answer has the same
 * shape, see getReplacementBlockTypes) and hands the replacement to `onReplace`.
 * Used by the survey builder's block cards and the flow builder's nodes.
 */

interface ReplaceBlockDialogProps {
  block: BlockData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplace: (data: BlockData) => void;
}

export const ReplaceBlockDialog: React.FC<ReplaceBlockDialogProps> = ({
  block,
  open,
  onOpenChange,
  onReplace,
}) => {
  const { state } = useSurveyBuilder();
  const blocks = state.definitions.blocks;

  const blockTypes = useMemo(
    () => (open ? getReplacementBlockTypes(block, blocks) : []),
    [open, block, blocks]
  );

  const handleSelect = useCallback(
    (type: string) => {
      const replacement = replaceBlock(block, type, blocks);
      if (!replacement) return;
      onReplace(replacement);
      onOpenChange(false);
    },
    [block, blocks, onReplace, onOpenChange]
  );

  const name = blocks[block.type]?.name || block.type;

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
            The new block keeps this block's field name, rules and connections, and its label and
            description when it has them. Its other settings start from its defaults.
          </p>
          {block.abTest?.enabled && (
            <p>This block's A/B test is removed, because its variants are copies of this block.</p>
          )}
        </div>
      }
    />
  );
};
