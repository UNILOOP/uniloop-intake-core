import type React from "react";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { useBlockLock } from "../../context/BlockLockContext";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData, BlockDefinition } from "../../types";
import { isBlockLocked } from "../../utils/blockLock";

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

/** The "Lock block" checkbox in block settings, unless the builder hides it. */
export const BlockLockControl: React.FC<{
  data: BlockData;
  definition: BlockDefinition | undefined;
  onUpdate: (data: BlockData) => void;
}> = ({ data, definition, onUpdate }) => {
  const { hideBlockLockControls } = useSurveyBuilder();
  if (hideBlockLockControls) return null;

  const locked = isBlockLocked(data);
  const lockedPaths = definition?.lockAccess?.locked;
  const id = `block-lock-${data.uuid || "new"}`;

  // Unlocking writes `false` instead of dropping the key: the flow view merges
  // updates into the saved block, so a missing key would keep the old value.
  const handleChange = (checked: boolean) => {
    onUpdate({ ...data, locked: checked });
  };

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
      <Checkbox
        id={id}
        checked={locked}
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
      </div>
    </div>
  );
};
