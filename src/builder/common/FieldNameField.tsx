import React from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import type { BlockData, BlockDefinition, FieldNameConfig } from "../../types";
import { sanitizeFieldName } from "../../blocks/utils/GenFieldName";

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

export const FieldNameField: React.FC<FieldNameFieldProps> = ({ data, onUpdate, config }) => {
  const resolved = config ?? DEFAULT_FIELD_CONFIG;
  const field = useFieldName({ data, onUpdate });

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
      />
      <p className="text-xs text-muted-foreground">{resolved.description}</p>
    </div>
  );
};
