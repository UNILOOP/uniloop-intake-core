import React from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { BlockData, BlockDefinition, FieldNameConfig, NodeData } from "../../types";
import { sanitizeFieldName } from "../../blocks/utils/GenFieldName";
import { useBlockLock } from "../../context/BlockLockContext";
import { SurveyBuilderContext } from "../../context/SurveyBuilderContext";
import { describeFieldNameUse, getFieldNameUses } from "../../utils/duplicateFieldNames";

/**
 * FieldNameField
 * --------------
 * Shared "Field Name" editor for value blocks. A block opts in by declaring
 * `fieldConfig` on its {@link BlockDefinition}; the builder then injects this
 * input automatically (see ContentBlockItem / NodeConfigPanel) so individual
 * blocks no longer hand-roll their own field name input.
 *
 * The field name is treated as a variable-style identifier: the user may type
 * freely (spaces included) and the value is sanitized into a no-spaces,
 * camelCase identifier on blur via {@link sanitizeFieldName}.
 */

const DEFAULT_FIELD_CONFIG: Required<FieldNameConfig> = {
  enabled: true,
  label: "Field Name",
  placeholder: "question1",
  description: "Unique identifier for storing responses",
  required: true,
};

/**
 * Normalise the `BlockDefinition.fieldConfig` shorthand into a fully resolved
 * config, or `null` when the block does not support field values.
 */
export const resolveFieldConfig = (
  fieldConfig: BlockDefinition["fieldConfig"],
): Required<FieldNameConfig> | null => {
  if (!fieldConfig) {
    return null;
  }
  const config = fieldConfig === true ? {} : fieldConfig;
  if (config.enabled === false) {
    return null;
  }
  return { ...DEFAULT_FIELD_CONFIG, ...config, enabled: true };
};

interface UseFieldNameOptions {
  data: BlockData;
  onUpdate?: (data: BlockData) => void;
}

/**
 * Wire a block's `fieldName` to a text input while keeping it a valid
 * variable-style identifier. Users type freely; the value is sanitized and
 * committed to `data.fieldName` on blur (or imperatively via `commit`).
 *
 * Works for both legacy blocks (which already store `data.fieldName`) and
 * future blocks driven by `fieldConfig` — both share the same storage key.
 */
export const useFieldName = ({ data, onUpdate }: UseFieldNameOptions) => {
  const committed = data.fieldName ?? "";
  const [draft, setDraft] = React.useState(committed);

  // Keep the draft in sync when the field name is changed outside this input.
  React.useEffect(() => {
    setDraft(committed);
  }, [committed]);

  const commit = React.useCallback(
    (value: string) => {
      const clean = sanitizeFieldName(value);
      setDraft(clean);
      if (clean !== committed) {
        onUpdate?.({ ...data, fieldName: clean });
      }
    },
    [committed, data, onUpdate],
  );

  return {
    value: draft,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    onBlur: () => commit(draft),
    /** Imperatively sanitize and commit a value (e.g. on Enter). */
    commit,
  };
};

interface FieldNameFieldProps {
  data: BlockData;
  onUpdate?: (data: BlockData) => void;
  /** Resolved config; falls back to defaults when omitted. */
  config?: Required<FieldNameConfig>;
}

/**
 * The questions that already save `name` elsewhere in the form, or undefined when it's free.
 * The block itself is in the form under its saved field name, so that one use is its own.
 */
const findOtherUses = (rootNode: NodeData | null | undefined, data: BlockData, name: string): string[] | undefined => {
  if (!rootNode || !name) return undefined;
  const uses = getFieldNameUses(rootNode).get(name) ?? [];
  const isOwnField = name === (data.fieldName ?? "").trim();
  if (uses.length < (isOwnField ? 2 : 1)) return undefined;

  let skippedOwn = false;
  const others = uses.filter((use) => {
    const ownBlock = use.block === data || (!!data.uuid && use.block.uuid === data.uuid);
    if (isOwnField && !skippedOwn && ownBlock && !use.outputKey) {
      skippedOwn = true;
      return false;
    }
    return true;
  });
  return others.map((use) =>
    use.block === data || (!!data.uuid && use.block.uuid === data.uuid)
      ? "this block's output fields"
      : `"${describeFieldNameUse(use, name)}"`,
  );
};

export const FieldNameField: React.FC<FieldNameFieldProps> = ({ data, onUpdate, config }) => {
  const resolved = config ?? DEFAULT_FIELD_CONFIG;
  const field = useFieldName({ data, onUpdate });
  const { isLocked } = useBlockLock();
  const locked = isLocked("fieldName");
  // Outside the builder there is no form to check against
  const rootNode = React.useContext(SurveyBuilderContext)?.state.rootNode;
  const takenBy = findOtherUses(rootNode, data, sanitizeFieldName(field.value));

  return (
    <div className="space-y-2">
      <Label className="text-sm" htmlFor="fieldName">
        {resolved.label}
      </Label>
      <Input
        id="fieldName"
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        placeholder={resolved.placeholder}
        disabled={locked}
        aria-invalid={takenBy ? true : undefined}
      />
      {takenBy ? (
        <p className="text-xs text-destructive">
          Already used by {takenBy.slice(0, 3).join(", ")}
          {takenBy.length > 3 ? ` and ${takenBy.length - 3} more` : ""}.{" "}
          {locked
            ? "This field name is locked, so give the other one a unique name instead."
            : "Pick a unique name so the answers don't overwrite each other."}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{resolved.description}</p>
      )}
    </div>
  );
};
