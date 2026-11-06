import type React from "react";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { useBlockLock } from "../../context/BlockLockContext";
import { ActionTypes, useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData, BlockDefinition } from "../../types";
import { isBlockLocked } from "../../utils/blockLock";
import {
  findPathGroupRoot,
  getOrderedBlocks,
  lockPathGroup,
  releasePathGroup,
} from "../../utils/pathGroupLock";

const fieldsetReset: React.CSSProperties = { border: 0, margin: 0, padding: 0, minWidth: 0 };

/**
 * Disables the settings inside while the lock fixes any of `paths`, or while
 * the block is fully locked when `paths` is left out.
 */
export const BlockLockFieldset: React.FC<{
  paths?: string[];
  className?: string;
  children: ReactNode;
}> = ({ paths, className, children }) => {
  const { fullyLocked, isLocked } = useBlockLock();
  const disabled = paths ? paths.some(isLocked) : fullyLocked;
  return (
    <fieldset disabled={disabled} className={className} style={fieldsetReset}>
      {children}
    </fieldset>
  );
};

/** Why a block in a path group can't change: "Locked with <first block>'s path", or its position is fixed by it. */
export const usePathGroupNote = (data: BlockData): string | null => {
  const { state } = useSurveyBuilder();
  const group = data.lockGroup;
  if (!group || group.role === "root") return null;
  const root = findPathGroupRoot(state.rootNode, group.id);
  const name = root?.name || root?.label || root?.fieldName || "another block";
  return group.role === "member"
    ? `Locked with ${name}'s path. Unlock ${name} to release it.`
    : `Its position is fixed by ${name}'s path: it can't be removed or moved, and nothing can be added next to it.`;
};

/** The "Lock block" and "Lock its path" checkboxes in block settings, unless the builder hides them. */
export const BlockLockControl: React.FC<{
  data: BlockData;
  definition: BlockDefinition | undefined;
  onUpdate: (data: BlockData) => void;
}> = ({ data, definition, onUpdate }) => {
  const { hideBlockLockControls, state, dispatch } = useSurveyBuilder();
  const groupNote = usePathGroupNote(data);
  if (hideBlockLockControls) return null;

  const locked = isBlockLocked(data);
  const lockedPaths = definition?.lockAccess?.locked;
  const id = `block-lock-${data.uuid || "new"}`;
  const role = data.lockGroup?.role;
  const isRoot = role === "root";
  // A block another group locks unlocks only with that group.
  const lockFixedByGroup = role === "member";
  const canLockPath = locked && !!data.uuid && (!data.lockGroup || isRoot);

  const setRootNode = (rootNode: typeof state.rootNode) => {
    dispatch({ type: ActionTypes.SET_ROOT_NODE, payload: rootNode });
  };

  // Unlocking writes `false` instead of dropping the key: the flow view merges
  // updates into the saved block, so a missing key would keep the old value.
  const handleChange = (checked: boolean) => {
    // Unlocking the first block of a path releases the whole path
    if (!checked && isRoot && state.rootNode && data.uuid) {
      setRootNode(releasePathGroup(state.rootNode, data.uuid, true));
      return;
    }
    onUpdate({ ...data, locked: checked });
  };

  const handlePathChange = (checked: boolean) => {
    if (!state.rootNode || !data.uuid) return;
    setRootNode(checked ? lockPathGroup(state.rootNode, data.uuid) : releasePathGroup(state.rootNode, data.uuid));
  };

  const pathCount = isRoot
    ? getOrderedBlocks(state.rootNode).filter((block) => block.lockGroup?.id === data.uuid && block.lockGroup.role === "member").length
    : 0;

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={locked}
          disabled={lockFixedByGroup}
          onCheckedChange={(checked) => handleChange(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Lock block
          </Label>
          <p className="text-xs text-muted-foreground">
            {lockedPaths
              ? `A locked block can't be removed or replaced, and these settings can't change: ${lockedPaths.join(", ")}, and the A/B test.`
              : "A locked block can't be removed or replaced, and its settings can't change."}
          </p>
          {groupNote && <p className="text-xs font-medium text-foreground">{groupNote}</p>}
        </div>
      </div>
      {canLockPath && (
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-path`}
            checked={isRoot}
            onCheckedChange={(checked) => handlePathChange(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor={`${id}-path`} className="text-sm font-medium">
              Lock its path
            </Label>
            <p className="text-xs text-muted-foreground">
              {isRoot
                ? `Also locks the ${pathCount} ${pathCount === 1 ? "block" : "blocks"} its rules and links lead to, until the paths join again. Where they join, and the blocks next to the path, keep their place.`
                : "Also locks the blocks its rules and links lead to, until the paths join again. Where they join, and the blocks next to the path, keep their place."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
