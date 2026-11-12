import type React from 'react';
import { forwardRef, useEffect, useId, useMemo, useState } from 'react';
import type {
  AnswerViewProps,
  BlockData,
  BlockDefinition,
  BlockRendererProps,
  ContentBlockItemProps,
  ThemeDefinition,
} from '../types';
import { BooleanAnswer } from '../renderer/answers/AnswerText';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { useSurveyForm } from '../context/SurveyFormContext';
import { useBlockLock } from '../context/BlockLockContext';
import { Check, ChevronDown, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import { generateFieldName } from './utils/GenFieldName';

// ============= TYPES =============

export type ConsentRuleOperator = 'equals' | 'notEquals' | 'contains';

export interface ConsentRule {
  /** Field name of an earlier question */
  field: string;
  operator: ConsentRuleOperator;
  value: string;
}

export interface ConsentItem {
  /** Key of the item in the saved answer */
  id: string;
  accordionTitle: string;
  /** Plain text; a line starting with ## is a section heading */
  content: string;
  /** Every rule must match for the item to show; none means always shown */
  showIf?: ConsentRule[];
  /** Starts checked the first time it shows */
  autoSelect?: boolean;
}

export interface ConsentAcknowledgementsValue {
  /** True when every shown item is checked */
  masterAcknowledged: boolean;
  /** Checked state per item id */
  items: Record<string, boolean>;
}

const TYPE = 'consentAcknowledgements';

// New blocks start with neutral text and one example item, so no brand
// inherits another brand's consents.
const DEFAULTS = {
  label: 'Please review and acknowledge',
  description: 'Open each item to read it, then check it to continue.',
  masterLabel: 'I acknowledge all of the information below.',
  item: {
    title: 'Consent title',
    content:
      'Write the consent text here.\n## A section heading\nStart a line with ## to show it as a section heading.',
  },
};

const OPERATOR_LABELS: Record<ConsentRuleOperator, string> = {
  equals: 'is',
  notEquals: 'is not',
  contains: 'contains',
};

// ============= HELPERS =============

const newItemId = () => `consent_${Date.now().toString(36)}`;

const getItems = (data: BlockData): ConsentItem[] =>
  Array.isArray(data.acknowledgements) ? data.acknowledgements : [];

const normalizeAnswer = (answer: unknown) =>
  (typeof answer === 'object' && answer !== null
    ? JSON.stringify(answer)
    : String(answer ?? '')
  )
    .trim()
    .toLowerCase();

// Single-choice questions save a string, multi-choice ones a list of strings.
const getAnswers = (raw: unknown): string[] => {
  if (raw === undefined || raw === null || raw === '') return [];
  return (Array.isArray(raw) ? raw : [raw]).map(normalizeAnswer);
};

const matchesRule = (rule: ConsentRule, values: Record<string, unknown>) => {
  const field = rule.field?.trim();
  if (!field) return true;
  const answers = getAnswers(values[field]);
  const expected = normalizeAnswer(rule.value);
  if (rule.operator === 'notEquals') return !answers.includes(expected);
  if (rule.operator === 'contains') {
    return answers.some((answer) => answer.includes(expected));
  }
  return answers.includes(expected);
};

const isItemShown = (item: ConsentItem, values: Record<string, unknown>) =>
  !item.showIf?.length || item.showIf.every((rule) => matchesRule(rule, values));

const fromValue = (value: unknown): ConsentAcknowledgementsValue => {
  const saved = (value ?? {}) as Partial<ConsentAcknowledgementsValue>;
  return {
    masterAcknowledged: saved.masterAcknowledged === true,
    items:
      saved.items && typeof saved.items === 'object' ? { ...saved.items } : {},
  };
};

// A line starting with ## is a section heading; other lines are paragraphs.
const parseContent = (content: string) =>
  (content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith('##')
        ? { heading: true, text: line.replace(/^##\s*/, '') }
        : { heading: false, text: line },
    );

// ============= PATIENT UI =============

// Class names for each part of the block. Patients see the survey theme's
// Selectable Box classes; the builder canvas uses the Selectable Box
// Question's canvas card, so the two blocks look alike in both places.
interface Look {
  /** The patient view uses core's Label for the title, as the Selectable Box Question does */
  titleAsLabel: boolean;
  title: string;
  description: string;
  list: string;
  box: (selected: boolean) => string;
  text: (selected: boolean) => string;
  indicator: (checked: boolean) => string;
  indicatorIcon: string;
  error: string;
}

const themeLook = (theme: ThemeDefinition, disabled?: boolean): Look => ({
  titleAsLabel: true,
  title: cn('text-lg font-bold block', theme.field.label, 'text-left'),
  description: cn('text-sm text-muted-foreground', theme.field.description, 'text-left'),
  list: cn('my-8', theme.field.selectableBoxContainer || 'space-y-3'),
  box: (selected) =>
    cn(
      theme.field.selectableBox ||
        'p-5 transition-all duration-200 cursor-pointer rounded-lg',
      selected
        ? theme.field.selectableBoxSelected || 'border border-gray-400 bg-gray-50'
        : theme.field.selectableBoxDefault ||
            'border border-gray-300 bg-white hover:bg-gray-50',
      !disabled && (theme.field.selectableBoxHover || 'hover:border-gray-400'),
      theme.field.selectableBoxFocus ||
        'focus-within:ring-2 focus-within:ring-gray-500 focus-within:ring-offset-2',
      disabled &&
        (theme.field.selectableBoxDisabled || 'opacity-50 cursor-not-allowed'),
    ),
  text: (selected) =>
    cn(
      theme.field.selectableBoxText || 'text-gray-900 text-base font-normal',
      selected &&
        (theme.field.selectableBoxTextSelected || 'text-gray-900 font-normal'),
    ),
  indicator: (checked) =>
    checked
      ? theme.field.selectableBoxIndicator || 'bg-gray-600 text-white'
      : 'border border-gray-300 bg-white',
  indicatorIcon: theme.field.selectableBoxIndicatorIcon || 'text-white',
  error: cn('text-sm font-medium text-destructive', theme.field.error),
});

const CANVAS_LOOK: Look = {
  titleAsLabel: false,
  title: 'text-2xl font-bold',
  description: 'text-sm text-muted-foreground',
  list: 'space-y-4',
  box: (selected) =>
    cn(
      'rounded-xl border bg-card p-4 text-card-foreground shadow transition-colors',
      selected
        ? 'border-primary bg-primary/5 dark:bg-primary/20'
        : 'hover:bg-accent dark:hover:bg-accent/50',
    ),
  // The size core's Label gives the Selectable Box Question's options
  text: () => 'text-2xl font-medium leading-none text-foreground',
  indicator: (checked) =>
    checked ? 'bg-primary text-primary-foreground' : 'border border-gray-300 bg-white',
  indicatorIcon: '',
  error: 'text-sm font-medium text-destructive',
};

// A square box in the indicator colours of the Selectable Box Question.
const CheckIndicator: React.FC<{ checked: boolean; look: Look }> = ({ checked, look }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
      look.indicator(checked),
    )}
  >
    {checked && <Check className={cn('h-3.5 w-3.5', look.indicatorIcon)} />}
  </span>
);

interface ConsentUiProps {
  data: BlockData;
  items: ConsentItem[];
  checked: Record<string, boolean>;
  look: Look;
  disabled?: boolean;
  error?: string;
  /** Builder canvas: marks items that only show for some answers */
  showRuleBadges?: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleItem: (id: string, checked: boolean) => void;
}

const ConsentUi: React.FC<ConsentUiProps> = ({
  data,
  items,
  checked,
  look,
  disabled,
  error,
  showRuleBadges,
  onToggleAll,
  onToggleItem,
}) => {
  const idPrefix = useId();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const allChecked = items.every((item) => checked[item.id] === true);
  const masterLabel = data.masterLabel || DEFAULTS.masterLabel;

  return (
    <div className="survey-consent-acknowledgements w-full min-w-0 space-y-4 text-left">
      {data.label &&
        (look.titleAsLabel ? (
          <Label className={look.title}>{data.label}</Label>
        ) : (
          <h3 className={look.title}>{data.label}</h3>
        ))}

      {data.description && (
        <div className={look.description}>{data.description}</div>
      )}

      <div className={look.list}>
        <div className={look.box(allChecked)}>
          <Checkbox
            id={`${idPrefix}-all`}
            checked={allChecked}
            onCheckedChange={(value) => onToggleAll(value === true)}
            disabled={disabled}
            className="sr-only"
            aria-invalid={!!error}
          />
          <Label
            htmlFor={`${idPrefix}-all`}
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 text-left',
              disabled && 'cursor-not-allowed',
            )}
          >
            <CheckIndicator checked={allChecked} look={look} />
            <span className={cn('flex-1', look.text(allChecked))}>
              {masterLabel}
            </span>
          </Label>
        </div>

        {items.map((item) => {
          const isChecked = checked[item.id] === true;
          const isOpen = openItems[item.id] === true;
          const contentId = `${idPrefix}-${item.id}`;

          return (
            <div key={item.id} className={look.box(isChecked)}>
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`${contentId}-check`}
                  checked={isChecked}
                  onCheckedChange={(value) => onToggleItem(item.id, value === true)}
                  disabled={disabled}
                  className="sr-only"
                  aria-label={item.accordionTitle}
                  aria-invalid={!!error}
                />
                <Label
                  htmlFor={`${contentId}-check`}
                  className={cn('flex cursor-pointer items-center', disabled && 'cursor-not-allowed')}
                >
                  <CheckIndicator checked={isChecked} look={look} />
                </Label>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  disabled={disabled}
                  onClick={() =>
                    setOpenItems((open) => ({ ...open, [item.id]: !open[item.id] }))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none disabled:cursor-not-allowed"
                >
                  <span className={cn('flex-1', look.text(isChecked))}>
                    {item.accordionTitle}
                  </span>
                  {showRuleBadges && item.showIf?.length ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Conditional
                    </span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 opacity-50 transition-transform duration-300 motion-reduce:transition-none',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
              </div>

              {/* Stays mounted so it can animate; the 0fr/1fr rows are inline
                  so they don't depend on the host app's CSS. */}
              <div
                id={contentId}
                aria-hidden={!isOpen}
                className="grid transition-all duration-300 ease-out motion-reduce:transition-none"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-3 space-y-2 border-t pt-3 pl-8 text-sm">
                    {parseContent(item.content).map((part, index) => (
                      <p
                        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs have no id, and lines can repeat
                        key={index}
                        className={part.heading ? 'font-medium' : 'text-muted-foreground'}
                      >
                        {part.text}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className={look.error}>
          {error}
        </div>
      )}
    </div>
  );
};

// ============= RENDERER =============

const ConsentAcknowledgementsRenderer = forwardRef<HTMLDivElement, BlockRendererProps>(
  ({ block, value, onChange, error, disabled, theme: themeProp }, ref) => {
    const theme = themeProp ?? themes.default;
    const items = getItems(block);
    const { values, computedValues } = useSurveyForm();
    const shownItems = useMemo(() => {
      const formValues = { ...(values || {}), ...(computedValues || {}) };
      return items.filter((item) => isItemShown(item, formValues));
    }, [items, values, computedValues]);
    const shownKey = shownItems.map((item) => item.id).join(',');
    const answer = fromValue(value);

    // The answer keeps only the items the patient can see, so an item hidden by
    // a later change of answer isn't reported as acknowledged.
    const save = (itemsMap: Record<string, boolean>) => {
      const items: Record<string, boolean> = {};
      for (const item of shownItems) {
        if (itemsMap[item.id] !== undefined) items[item.id] = itemsMap[item.id];
      }
      onChange?.({
        masterAcknowledged: shownItems.every((item) => items[item.id] === true),
        items,
      });
    };

    // Validation only sees the saved value, so masterAcknowledged must always say
    // whether every shown item is checked. Items that show with autoSelect start
    // checked, and hidden items are dropped; all in one update.
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the shown items or the saved value change, not on every new onChange
    useEffect(() => {
      const itemsMap = { ...answer.items };
      let changed = Object.keys(itemsMap).some(
        (id) => !shownItems.some((item) => item.id === id),
      );
      for (const item of shownItems) {
        if (item.autoSelect && itemsMap[item.id] === undefined) {
          itemsMap[item.id] = true;
          changed = true;
        }
      }
      const allChecked = shownItems.every((item) => itemsMap[item.id] === true);
      if (changed || answer.masterAcknowledged !== allChecked) {
        save(itemsMap);
      }
    }, [shownKey, JSON.stringify(value ?? null)]);

    return (
      <div ref={ref}>
        <ConsentUi
          data={block}
          items={shownItems}
          checked={answer.items}
          look={themeLook(theme, disabled)}
          disabled={disabled}
          error={error}
          onToggleAll={(checked) => {
            const itemsMap = { ...answer.items };
            for (const item of shownItems) itemsMap[item.id] = checked;
            save(itemsMap);
          }}
          onToggleItem={(id, checked) => save({ ...answer.items, [id]: checked })}
        />
      </div>
    );
  },
);

ConsentAcknowledgementsRenderer.displayName = 'ConsentAcknowledgementsRenderer';

// ============= BUILDER COMPONENTS =============

const ConsentAcknowledgementsForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const { isLocked } = useBlockLock();
  // Item ids are the keys of the saved answer, so a locked block keeps them,
  // and with them the list's length and order.
  const idsLocked = isLocked('acknowledgements[].id');
  const items = getItems(data);

  const handleChange = (field: string, value: unknown) =>
    onUpdate?.({ ...data, [field]: value });

  const setItems = (next: ConsentItem[]) => handleChange('acknowledgements', next);

  const updateItem = (index: number, patch: Partial<ConsentItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const setRules = (index: number, rules: ConsentRule[]) =>
    updateItem(index, { showIf: rules.length ? rules : undefined });

  const updateRule = (index: number, ruleIndex: number, patch: Partial<ConsentRule>) =>
    setRules(
      index,
      (items[index].showIf || []).map((rule, i) =>
        i === ruleIndex ? { ...rule, ...patch } : rule,
      ),
    );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm" htmlFor="label">
          Title
        </Label>
        <Input
          id="label"
          value={data.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder={DEFAULTS.label}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">
          Description (optional)
        </Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Shown below the title"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="masterLabel">
          Check-all label
        </Label>
        <Input
          id="masterLabel"
          value={data.masterLabel || ''}
          onChange={(e) => handleChange('masterLabel', e.target.value)}
          placeholder={DEFAULTS.masterLabel}
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={idsLocked}
            onClick={() =>
              setItems([
                ...items,
                { id: newItemId(), accordionTitle: DEFAULTS.item.title, content: '' },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>

        {items.map((item, index) => (
          <Card
            // biome-ignore lint/suspicious/noArrayIndexKey: the id is edited here, so keying on it would remount the card on every keystroke
            key={index}
            className="relative space-y-4 p-4"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${item.accordionTitle}`}
              disabled={idsLocked || items.length === 1}
              className="absolute right-2 top-2 h-6 w-6 text-destructive"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-2 gap-4 pr-6">
              <div className="space-y-2">
                <Label className="block text-xs">Title</Label>
                <Input
                  value={item.accordionTitle}
                  onChange={(e) => updateItem(index, { accordionTitle: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="block text-xs">Saved as</Label>
                <Input
                  value={item.id}
                  disabled={idsLocked}
                  onChange={(e) => updateItem(index, { id: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs">Text</Label>
              <Textarea
                value={item.content}
                onChange={(e) => updateItem(index, { content: e.target.value })}
                placeholder={DEFAULTS.item.content}
                rows={3}
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Start a line with ## to show it as a section heading.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs">Show only when</Label>
              {(item.showIf || []).map((rule, ruleIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: conditions have no id and are edited in place
                <div key={ruleIndex} className="flex items-center gap-2">
                  <Input
                    value={rule.field}
                    onChange={(e) => updateRule(index, ruleIndex, { field: e.target.value })}
                    placeholder="Question field name"
                    className="h-8 text-xs"
                  />
                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      updateRule(index, ruleIndex, {
                        operator: e.target.value as ConsentRuleOperator,
                      })
                    }
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    {(Object.keys(OPERATOR_LABELS) as ConsentRuleOperator[]).map(
                      (operator) => (
                        <option key={operator} value={operator}>
                          {OPERATOR_LABELS[operator]}
                        </option>
                      ),
                    )}
                  </select>
                  <Input
                    value={rule.value}
                    onChange={(e) => updateRule(index, ruleIndex, { value: e.target.value })}
                    placeholder="Answer"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove condition"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() =>
                      setRules(
                        index,
                        (item.showIf || []).filter((_, i) => i !== ruleIndex),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRules(index, [
                    ...(item.showIf || []),
                    { field: '', operator: 'equals', value: '' },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add condition
              </Button>
              <p className="text-xs text-muted-foreground">
                Use an earlier question&apos;s field name. Every condition must
                match, and answers ignore upper and lower case. With no
                conditions the item always shows.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`autoSelect-${index}`}
                checked={item.autoSelect === true}
                onCheckedChange={(checked) => updateItem(index, { autoSelect: checked })}
              />
              <Label htmlFor={`autoSelect-${index}`} className="text-xs">
                Checked by default
              </Label>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={data.required !== false}
          onCheckedChange={(checked) => handleChange('required', checked)}
        />
        <Label htmlFor="required" className="text-sm">
          Every shown item must be checked to continue
        </Label>
      </div>
    </div>
  );
};

// The canvas shows the block as patients see it, every item included, and can
// be clicked through without saving anything.
const ConsentAcknowledgementsItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  const items = getItems(data);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <ConsentUi
      data={data}
      items={items}
      checked={checked}
      look={CANVAS_LOOK}
      showRuleBadges
      onToggleAll={(all) =>
        setChecked(Object.fromEntries(items.map((item) => [item.id, all])))
      }
      onToggleItem={(id, value) => setChecked((prev) => ({ ...prev, [id]: value }))}
    />
  );
};

const ConsentAcknowledgementsPreview: React.FC = () => (
  <div className="flex w-full items-center justify-center py-1">
    <div className="flex w-4/5 items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
      <ShieldCheck className="h-3 w-3" /> Consents
    </div>
  </div>
);

// Each item the patient saw, with whether they checked it
const ConsentAcknowledgementsView = ({ block, value }: AnswerViewProps) => {
  const answer = fromValue(value);
  const rows = getItems(block).filter((item) => item.id in answer.items);
  return (
    <div className="space-y-2 text-sm">
      {rows.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3">
          <span>{item.accordionTitle}</span>
          <BooleanAnswer value={answer.items[item.id] === true} />
        </div>
      ))}
      {rows.length === 0 && <BooleanAnswer value={answer.masterAcknowledged} />}
    </div>
  );
};

// ============= BLOCK DEFINITION =============

const createDefaultData = (fieldName: string): BlockData => ({
  type: TYPE,
  fieldName,
  label: DEFAULTS.label,
  description: DEFAULTS.description,
  masterLabel: DEFAULTS.masterLabel,
  acknowledgements: [
    {
      id: 'consent_1',
      accordionTitle: DEFAULTS.item.title,
      content: DEFAULTS.item.content,
    },
  ] satisfies ConsentItem[],
  required: true,
});

export const ConsentAcknowledgementsBlock: BlockDefinition = {
  type: TYPE,
  name: 'Consents',
  description: 'Consent items to read and check, each shown only for the answers you pick',
  icon: <ShieldCheck className="w-4 h-4" />,
  defaultData: createDefaultData(''),
  generateDefaultData: () => createDefaultData(generateFieldName(TYPE)),
  renderItem: (props) => <ConsentAcknowledgementsItem {...props} />,
  renderFormFields: (props) => <ConsentAcknowledgementsForm {...props} />,
  renderPreview: () => <ConsentAcknowledgementsPreview />,
  renderBlock: (props) => <ConsentAcknowledgementsRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    const items = getItems(data);
    if (items.length === 0) return 'Add at least one item';
    const ids = items.map((item) => item.id?.trim());
    if (ids.some((id) => !id)) return 'Every item needs a "Saved as" name';
    if (new Set(ids).size !== ids.length) return 'Each item needs its own "Saved as" name';
    return null;
  },
  // The renderer keeps masterAcknowledged equal to "every shown item is checked",
  // so the saved value is enough here.
  validateValue: (value, data) => {
    if (data.required === false) return null;
    if (fromValue(value).masterAcknowledged) return null;
    return 'Please check every item to continue';
  },
  answerView: (props) => <ConsentAcknowledgementsView {...props} />,
  // Rules can test whether everything was acknowledged; the per-item map stays
  // out of them.
  outputSchema: {
    type: 'object',
    properties: {
      masterAcknowledged: {
        type: 'boolean',
        description: 'every shown item is checked',
      },
      items: {
        type: 'object',
        description: 'checked state per item',
        excludeFromRules: true,
      },
    },
  },
  fieldConfig: {
    enabled: true,
    label: 'Field Name',
    required: true,
  },
  lockAccess: {
    locked: ['fieldName', 'acknowledgements[].id'],
  },
};
