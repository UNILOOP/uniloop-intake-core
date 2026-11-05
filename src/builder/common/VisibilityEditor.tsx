import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Plus } from "lucide-react";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData, BlockVisibility } from "../../types";
import { ConditionFields, useRuleFieldOptions, type ConditionState } from "./ConditionFields";
import { enhancedRuleToStandard, standardRuleToEnhanced } from "./navigation-rules-types";

interface Props {
  data: BlockData;
  onUpdate: (data: BlockData) => void;
}

interface RowState extends ConditionState {
  id: string;
}

const emptyRow = (): RowState => ({ id: uuidv4(), field: "", operator: "==", value: "" });

function parseRow(condition: string): RowState {
  const parsed = standardRuleToEnhanced(condition);
  return {
    id: uuidv4(),
    field: parsed.field || "",
    operator: parsed.operator || "==",
    value: parsed.value || "",
  };
}

/**
 * "Hidden until" or "visible unless" conditions on one block. A hidden block on a
 * page isn't shown or checked, and a hidden block on its own is skipped.
 */
export const VisibilityEditor: React.FC<Props> = ({ data, onUpdate }) => {
  const { getAvailableFieldsBefore } = useSurveyBuilder();
  const getFieldOptions = useRuleFieldOptions();
  const visibility = data.visibility;
  const [rows, setRows] = React.useState<RowState[]>(() => (visibility?.conditions || []).map(parseRow));

  const fieldOptions = React.useMemo(
    () => getAvailableFieldsBefore(data.uuid || data.fieldName || ""),
    [data.uuid, data.fieldName, getAvailableFieldsBefore],
  );

  const save = (next: Partial<BlockVisibility>, nextRows: RowState[] = rows) => {
    setRows(nextRows);
    onUpdate({
      ...data,
      visibility: {
        initial: visibility?.initial ?? "hidden",
        match: visibility?.match ?? "all",
        ...next,
        conditions: nextRows
          .filter((row) => row.field)
          .map((row) => enhancedRuleToStandard({ ...row, target: "" })),
      },
    });
  };

  const setEnabled = (enabled: boolean) => {
    if (enabled) {
      save({}, rows.length > 0 ? rows : [emptyRow()]);
      return;
    }
    const { visibility: _removed, ...rest } = data;
    setRows([]);
    onUpdate(rest);
  };

  const changeRow = (index: number, key: keyof ConditionState, value: any) =>
    save({}, rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-4 mt-4 border rounded-md p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Visibility</h3>
          <p className="text-xs text-muted-foreground">
            Show or hide this block from earlier answers
          </p>
        </div>
        <Switch checked={!!visibility} onCheckedChange={setEnabled} aria-label="Visibility conditions" />
      </div>

      {visibility && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Block is</Label>
              <Select
                value={visibility.initial}
                onValueChange={(val) => save({ initial: val as BlockVisibility["initial"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden until</SelectItem>
                  <SelectItem value="visible">Visible unless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Conditions</Label>
              <Select
                value={visibility.match ?? "all"}
                onValueChange={(val) => save({ match: val as BlockVisibility["match"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All match</SelectItem>
                  <SelectItem value="any">Any matches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.map((row, index) => (
            <div key={row.id} className="border rounded-md p-3 space-y-3 bg-background">
              <ConditionFields
                condition={row}
                onChange={(key, value) => changeRow(index, key, value)}
                fieldOptions={fieldOptions}
                getFieldOptions={getFieldOptions}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => save({}, rows.filter((_, i) => i !== index))}
                >
                  Remove Condition
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={() => save({}, [...rows, emptyRow()])}>
            <Plus className="h-3 w-3 mr-1" />
            Add Condition
          </Button>
        </>
      )}
    </div>
  );
};
