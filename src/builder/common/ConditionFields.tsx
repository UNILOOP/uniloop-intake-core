import React from "react";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "../../components/ui/select";
import { useSurveyBuilder } from "../../context/SurveyBuilderContext";
import type { BlockData } from "../../types";
import { NavigationRuleValueInput } from "./NavigationRuleValueInput";
import { getOutputPropertyOptions } from "../../utils/outputSchema";
import { getMappedFields } from "../../utils/blockFields";
import { OPERATORS, type EnhancedNavigationRule } from "./navigation-rules-types";

export type ConditionState = Pick<EnhancedNavigationRule, "field" | "operator" | "value">;

type FieldOption = { label: string; value: string };

const OPERATOR_GROUPS: Array<{ category: string; label: string }> = [
  { category: "comparison", label: "Comparison" },
  { category: "string", label: "Text" },
  { category: "array", label: "Array/List" },
  { category: "logical", label: "Logical" },
  { category: "date", label: "Date" },
];

// The options a block offers: `options`, or the legacy labels/values arrays
function getBlockOptions(block: BlockData | null): FieldOption[] {
  if (!block) return [];

  if (Array.isArray(block.options)) {
    return block.options.map((opt: any) => ({
      label: opt.label || opt.value || String(opt),
      value: opt.value || opt.label || String(opt),
    }));
  }

  if (Array.isArray(block.labels)) {
    return block.labels.map((label: string, index: number) => ({
      label,
      value: Array.isArray(block.values) ? String(block.values[index]) : label,
    }));
  }

  return [];
}

/**
 * Options for a rule's field: the block's own options, or for `fieldName.<key>`
 * the options its output schema lists for that key, or an external key's options
 */
export function useRuleFieldOptions(): (field: string) => FieldOption[] {
  const { state, getExternalField } = useSurveyBuilder();

  return React.useCallback((field: string): FieldOption[] => {
    if (!state.rootNode || !field) return [];

    const findBlock = (match: (node: BlockData) => boolean): BlockData | null => {
      const traverse = (node: BlockData): BlockData | null => {
        if (match(node)) return node;
        for (const child of [...(node.items || []), ...(node.nodes || [])]) {
          if (typeof child === "string") continue;
          const result = traverse(child);
          if (result) return result;
        }
        return null;
      };
      return traverse(state.rootNode as BlockData);
    };

    const block = findBlock((node) => node.fieldName === field);
    if (block) return getBlockOptions(block);

    // A key a block saves under its own field name lists its output schema's options
    const mappedBlock = findBlock((node) => getMappedFields(node).some((mapped) => mapped.fieldName === field));
    if (mappedBlock) {
      const key = getMappedFields(mappedBlock).find((mapped) => mapped.fieldName === field)?.key ?? "";
      const definition = state.definitions?.blocks?.[mappedBlock.type];
      return definition ? getOutputPropertyOptions(definition, mappedBlock, key) : [];
    }

    const dot = field.indexOf(".");
    const parent = dot === -1 ? null : findBlock((node) => node.fieldName === field.slice(0, dot));
    const definition = parent ? state.definitions?.blocks?.[parent.type] : undefined;
    if (parent && definition) return getOutputPropertyOptions(definition, parent, field.slice(dot + 1));

    // An external key lists the options it was passed with
    return getExternalField(field)?.options ?? [];
  }, [state.rootNode, state.definitions?.blocks, getExternalField]);
}

interface ConditionFieldsProps {
  condition: ConditionState;
  onChange: (key: keyof ConditionState, value: any) => void;
  fieldOptions: string[];
  getFieldOptions: (field: string) => FieldOption[];
  fieldType?: "text" | "number";
}

/** Variable, operator and value of one condition */
export const ConditionFields: React.FC<ConditionFieldsProps> = ({
  condition,
  onChange,
  fieldOptions,
  getFieldOptions,
  fieldType = "text",
}) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label className="text-sm">Variable</Label>
      <Select value={condition.field} onValueChange={(val) => onChange("field", val)}>
        <SelectTrigger>
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
          {fieldOptions.map((name) => (
            <SelectItem key={name} value={name} className="pl-2">
              <span className="text-sm">{name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-sm">Operator</Label>
      <Select value={condition.operator} onValueChange={(val) => onChange("operator", val)}>
        <SelectTrigger>
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto z-50" side="bottom" align="start" sideOffset={5}>
          {OPERATOR_GROUPS.map((group) => (
            <SelectGroup key={group.category}>
              <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">{group.label}</SelectLabel>
              {OPERATORS.filter((op) => op.category === group.category).map((op) => (
                <SelectItem key={op.value} value={op.value} className="pl-4">
                  {op.description ? (
                    <div className="flex flex-col items-start">
                      <span className="text-sm">{op.label}</span>
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {op.description}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm">{op.label}</span>
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-sm">Value</Label>
      <NavigationRuleValueInput
        value={condition.value as any}
        onChange={(val) => onChange("value", val)}
        operator={OPERATORS.find((op) => op.value === condition.operator) || OPERATORS[0]}
        availableVariables={fieldOptions}
        fieldType={fieldType}
        fieldOptions={getFieldOptions(condition.field)}
      />
    </div>
  </div>
);
