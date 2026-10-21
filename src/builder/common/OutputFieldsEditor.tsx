import React from "react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData, OutputFieldMapping } from "../../types";
import { sanitizeFieldName } from "../../blocks/utils/GenFieldName";
import { getObjectOutputSchema } from "../../utils/outputSchema";
import { getDefaultFieldQuestion } from "../../utils/blockFields";

/**
 * OutputFieldsEditor
 * ------------------
 * Lets a block whose answer is an object save each output key under its own
 * field name (`BlockData.outputFields`), with the question that key answers.
 * Rules, validation and the flow builder then use each mapped key like any
 * other field. Renders nothing for blocks without an object output.
 */

interface OutputFieldsEditorProps {
  data: BlockData;
  onUpdate?: (data: BlockData) => void;
}

interface OutputFieldRowProps {
  outputKey: string;
  type: string;
  mapping: OutputFieldMapping;
  defaultQuestion: string;
  clashes: boolean;
  onChange: (change: OutputFieldMapping) => void;
}

const OutputFieldRow: React.FC<OutputFieldRowProps> = ({
  outputKey,
  type,
  mapping,
  defaultQuestion,
  clashes,
  onChange,
}) => {
  const [fieldName, setFieldName] = React.useState(mapping.fieldName ?? "");
  const [question, setQuestion] = React.useState(mapping.question ?? "");

  // Keep the drafts in sync when the mapping is changed outside this row.
  React.useEffect(() => setFieldName(mapping.fieldName ?? ""), [mapping.fieldName]);
  React.useEffect(() => setQuestion(mapping.question ?? ""), [mapping.question]);

  const commitFieldName = () => {
    const clean = sanitizeFieldName(fieldName);
    setFieldName(clean);
    if (clean !== (mapping.fieldName ?? "")) onChange({ ...mapping, fieldName: clean });
  };

  const commitQuestion = () => {
    const clean = question.trim();
    setQuestion(clean);
    if (clean !== (mapping.question ?? "")) onChange({ ...mapping, question: clean });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        <span className="font-mono">{outputKey}</span>{" "}
        <span className="text-xs text-muted-foreground">({type})</span>
      </Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label={`Field name for ${outputKey}`}
          value={fieldName}
          onChange={(event) => setFieldName(event.target.value)}
          onBlur={commitFieldName}
          placeholder="Not saved on its own"
        />
        <Input
          aria-label={`Question for ${outputKey}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onBlur={commitQuestion}
          placeholder={defaultQuestion}
          disabled={!mapping.fieldName}
        />
      </div>
      {clashes && (
        <p className="text-xs text-destructive">
          Another field in this form already uses this name. Pick a unique name so the answers don't overwrite each other.
        </p>
      )}
    </div>
  );
};

export const OutputFieldsEditor: React.FC<OutputFieldsEditorProps> = ({ data, onUpdate }) => {
  const { state, getAvailableFieldsExcludingCurrent } = useSurveyBuilder();
  const definition = state.definitions?.blocks?.[data.type];
  const schema = definition ? getObjectOutputSchema(definition, data) : undefined;
  const outputFields = data.outputFields ?? {};
  // A mapping whose key the block no longer outputs keeps its row, so it can be cleared
  const rows = [
    ...Object.entries(schema?.properties ?? {}).map(([key, property]) => ({ key, type: property.type })),
    ...Object.keys(outputFields)
      .filter((key) => !schema?.properties[key])
      .map((key) => ({ key, type: "no longer in the answer" })),
  ];
  if (!definition || rows.length === 0) {
    return null;
  }

  // Names used anywhere else: other blocks' fields, this block's own field, and its other rows
  const otherNames = new Set(getAvailableFieldsExcludingCurrent(data.uuid || data.fieldName || ""));
  if (data.fieldName) otherNames.add(data.fieldName);
  const clashesFor = (key: string): boolean => {
    const name = outputFields[key]?.fieldName;
    if (!name) return false;
    return otherNames.has(name) ||
      Object.entries(outputFields).some(([otherKey, mapping]) => otherKey !== key && mapping?.fieldName === name);
  };

  const handleChange = (key: string, mapping: OutputFieldMapping) => {
    const next = { ...outputFields };
    if (mapping.fieldName || mapping.question) {
      next[key] = mapping;
    } else {
      delete next[key];
    }
    onUpdate?.({ ...data, outputFields: Object.keys(next).length > 0 ? next : undefined });
  };

  return (
    <div className="space-y-4 p-4 mt-4 border rounded-lg bg-card">
      <div className="space-y-1">
        <Label className="text-base font-semibold">Output Field Names</Label>
        <p className="text-xs text-muted-foreground">
          Save a key of this block's answer under its own field name, so navigation and validation rules can use it.
          Leave the name empty to keep the key inside the block's answer only.
        </p>
      </div>
      {data.fieldName ? (
        <div className="space-y-3">
          {rows.map(({ key, type }) => (
            <OutputFieldRow
              key={key}
              outputKey={key}
              type={type}
              mapping={outputFields[key] ?? {}}
              defaultQuestion={getDefaultFieldQuestion(data, key, definition)}
              clashes={clashesFor(key)}
              onChange={(mapping) => handleChange(key, mapping)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Give this block a field name first. Its keys are saved only with the block's answer.
        </p>
      )}
    </div>
  );
};
