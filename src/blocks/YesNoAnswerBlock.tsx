import type React from 'react';
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type {
  BlockData,
  BlockDefinition,
  BlockRendererProps,
  ContentBlockItemProps,
  ThemeDefinition,
} from '../types';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Card } from '../components/ui/card';
import { useSurveyForm } from '../context/SurveyFormContext';
import { CheckSquare, MessageSquareText } from 'lucide-react';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import { generateFieldName } from './utils/GenFieldName';

// The saved answer values stay fixed so rules and integrations can rely on them.
// The labels the patient sees can be changed in the builder.
const YES = 'Yes';
const NO = 'No';

type Choice = typeof YES | typeof NO;

// The value saved under the block's field name
interface YesNoAnswerValue {
  answer: Choice;
  details: string;
}

interface YesNoAnswerState {
  choice: Choice | null;
  details: string;
}

const DEFAULTS = {
  label: 'Have you ever had weight loss surgery (bariatric or gastric)?',
  detailsPrompt:
    "Please list your weight loss surgery(s) and the date(s). Don't worry about typos.",
  detailsPlaceholder: 'Type your answer here',
  buttonText: 'Next',
};

// Long enough for the patient to see the selection before the step changes.
const ADVANCE_DELAY_MS = 150;
// The layout keeps the old step on screen for its exit animation. If the step hasn't
// changed after this long, moving on failed and the block takes clicks again.
const LEAVE_TIMEOUT_MS = 1000;
const OPEN_TRANSITION =
  'grid-template-rows 0.5s ease, opacity 0.5s ease, margin-top 0.5s ease';
const CLOSE_TRANSITION =
  'grid-template-rows 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease';

const getNoLabel = (data: BlockData) => data.noLabel || NO;
const getYesLabel = (data: BlockData) => data.yesLabel || YES;
const detailsRequired = (data: BlockData) => data.detailsRequired !== false;

// Details are only saved with Yes; No saves them as an empty string.
const toValue = (state: YesNoAnswerState): YesNoAnswerValue | undefined => {
  if (state.choice === NO) return { answer: NO, details: '' };
  if (state.choice === YES) return { answer: YES, details: state.details };

  return undefined;
};

const fromValue = (value: unknown): YesNoAnswerState => {
  if (!value || typeof value !== 'object') return { choice: null, details: '' };

  const { answer, details } = value as Partial<YesNoAnswerValue>;
  return {
    choice: answer === YES || answer === NO ? answer : null,
    details: typeof details === 'string' ? details : '',
  };
};

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const isAnswerComplete = (state: YesNoAnswerState, data: BlockData) =>
  state.choice === NO ||
  (state.choice === YES &&
    (!detailsRequired(data) || state.details.trim().length > 0));

interface AnswerBoxProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  theme: ThemeDefinition;
}

// Same theme classes as the Selectable Box Question, so the block matches the
// survey's other questions.
const AnswerBox: React.FC<AnswerBoxProps> = ({
  label,
  selected,
  disabled,
  theme,
}) => (
  <div
    className={cn(
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
    )}
  >
    <div className="flex items-center justify-between">
      <span
        className={cn(
          theme.field.selectableBoxText || 'text-gray-900 text-base font-normal',
          selected &&
            (theme.field.selectableBoxTextSelected || 'text-gray-900 font-normal'),
        )}
      >
        {label}
      </span>
      {selected && (
        <div
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full',
            theme.field.selectableBoxIndicator || 'bg-gray-600 text-white',
          )}
        >
          <CheckSquare
            className={cn(
              'h-3 w-3',
              theme.field.selectableBoxIndicatorIcon || 'text-white',
            )}
          />
        </div>
      )}
    </div>
  </div>
);

interface YesNoAnswerUiProps {
  data: BlockData;
  state: YesNoAnswerState;
  theme: ThemeDefinition;
  disabled?: boolean;
  showButton: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  onChoose?: (choice: Choice) => void;
  onDetailsChange?: (details: string) => void;
  onContinue?: () => void;
}

const YesNoAnswerUi: React.FC<YesNoAnswerUiProps> = ({
  data,
  state,
  theme,
  disabled,
  showButton,
  textareaRef,
  onChoose,
  onDetailsChange,
  onContinue,
}) => {
  const idPrefix = useId();
  const questionId = `${idPrefix}-question`;
  const detailsId = `${idPrefix}-details`;
  const open = state.choice === YES;
  const canContinue = isAnswerComplete(state, data);
  const choices: { choice: Choice; label: string }[] = [
    { choice: NO, label: getNoLabel(data) },
    { choice: YES, label: getYesLabel(data) },
  ];

  return (
    <div className="survey-yes-no-answer w-full min-w-0 space-y-4 text-left">
      {data.label && (
        <Label
          id={questionId}
          className={cn('block text-lg font-bold', theme.field.label, 'text-left')}
        >
          {data.label}
        </Label>
      )}

      {data.description && (
        <div
          className={cn(
            'text-sm text-muted-foreground',
            theme.field.description,
            'text-left',
          )}
        >
          {data.description}
        </div>
      )}

      <RadioGroup
        value={state.choice ?? ''}
        onValueChange={(choice) => onChoose?.(choice as Choice)}
        disabled={disabled}
        aria-labelledby={data.label ? questionId : undefined}
        className={cn(
          'my-8 space-y-4',
          theme.field.selectableBoxContainer || 'space-y-3',
        )}
      >
        {choices.map(({ choice, label }) => {
          const id = `${idPrefix}-${choice}`;
          const selected = state.choice === choice;

          return (
            <div key={choice} className="relative">
              <RadioGroupItem
                value={choice}
                id={id}
                className="sr-only"
                onClick={(e) => {
                  // Picking the chosen answer again still counts, so No moves
                  // on again after the patient comes back to this step.
                  if (selected) {
                    e.preventDefault();
                    onChoose?.(choice);
                  }
                }}
              />
              <Label
                htmlFor={id}
                className={cn(
                  'block w-full cursor-pointer',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <AnswerBox
                  label={label}
                  selected={selected}
                  disabled={disabled}
                  theme={theme}
                />
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* The details area grows from zero height when Yes is picked. */}
      <div
        aria-hidden={!open}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          marginTop: open ? undefined : 0,
          transition: open ? OPEN_TRANSITION : CLOSE_TRANSITION,
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div className="space-y-4 pb-1">
            {data.detailsPrompt && (
              <Label
                htmlFor={detailsId}
                className={cn('block', theme.field.label, 'text-left')}
              >
                {data.detailsPrompt}
              </Label>
            )}
            <Textarea
              ref={textareaRef}
              id={detailsId}
              rows={4}
              value={state.details}
              placeholder={data.detailsPlaceholder}
              disabled={disabled || !open}
              tabIndex={open ? undefined : -1}
              onChange={(event) => onDetailsChange?.(event.target.value)}
              className={theme.field.textarea}
            />
            {showButton && (
              <button
                type="button"
                disabled={disabled || !open || !canContinue}
                tabIndex={open ? undefined : -1}
                onClick={onContinue}
                className={cn(
                  'w-full',
                  theme.button.primary,
                  (disabled || !canContinue) && 'cursor-not-allowed opacity-60',
                )}
              >
                {data.buttonText || DEFAULTS.buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= BUILDER COMPONENTS =============

const YesNoAnswerBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const handleChange = (field: string, value: unknown) => {
    onUpdate?.({ ...data, [field]: value });
  };

  const textField = (
    field: string,
    label: string,
    placeholder: string,
    help?: string,
  ) => (
    <div className="space-y-2">
      <Label className="text-sm" htmlFor={field}>
        {label}
      </Label>
      <Input
        id={field}
        value={data[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {textField('label', 'Question Label', DEFAULTS.label)}

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">
          Description (optional)
        </Label>
        <Textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Shown below the question"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {textField(
          'noLabel',
          'No label (moves on)',
          NO,
          `Always saved as "${NO}"`,
        )}
        {textField(
          'yesLabel',
          'Yes label (opens details)',
          YES,
          `Always saved as "${YES}"`,
        )}
      </div>

      <div className="space-y-2 rounded-md border p-4">
        <Label className="text-sm">Details (shown after Yes)</Label>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground" htmlFor="detailsPrompt">
            Prompt
          </Label>
          <Textarea
            id="detailsPrompt"
            value={data.detailsPrompt || ''}
            onChange={(e) => handleChange('detailsPrompt', e.target.value)}
            placeholder={DEFAULTS.detailsPrompt}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {textField(
            'detailsPlaceholder',
            'Placeholder',
            DEFAULTS.detailsPlaceholder,
          )}
          {textField(
            'buttonText',
            'Button text',
            DEFAULTS.buttonText,
            "Hidden when the layout's continue button is on",
          )}
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="detailsRequired"
            checked={detailsRequired(data)}
            onCheckedChange={(checked) => handleChange('detailsRequired', checked)}
          />
          <Label htmlFor="detailsRequired" className="text-sm">
            Details required
          </Label>
        </div>
      </div>
    </div>
  );
};

const YesNoAnswerBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => (
  <Card className="space-y-3 p-4">
    <YesNoAnswerUi
      data={data}
      state={{ choice: YES, details: '' }}
      theme={themes.default}
      showButton={data.showContinueButton === false}
      disabled
    />
  </Card>
);

const YesNoAnswerBlockPreview: React.FC = () => (
  <div className="w-full space-y-2 py-1">
    <AnswerBox label={NO} selected={false} theme={themes.default} />
    <AnswerBox label={YES} selected theme={themes.default} />
  </div>
);

// ============= RENDERER COMPONENT =============

const YesNoAnswerRenderer = forwardRef<HTMLDivElement, BlockRendererProps>(
  ({ block, value, onChange, disabled, theme: themeProp }, ref) => {
    const theme = themeProp ?? themes.default;
    const { goToNextBlock } = useSurveyForm();
    const [state, setState] = useState<YesNoAnswerState>(() =>
      fromValue(value ?? block.defaultValue),
    );
    const lastSaved = useRef<unknown>(toValue(state));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    // Set once the block moves on, so a second click during the exit animation
    // can't move the patient past the next step too.
    const leaving = useRef(false);

    // Follow outside changes to the value (for example a reset), but not our own.
    useEffect(() => {
      if (!sameValue(value, lastSaved.current)) {
        lastSaved.current = value;
        setState(fromValue(value));
      }
    }, [value]);

    useEffect(() => {
      const pending = timers.current;
      return () => pending.forEach(clearTimeout);
    }, []);

    const save = (next: YesNoAnswerState) => {
      setState(next);
      const saved = toValue(next);
      lastSaved.current = saved;
      onChange?.(saved);
      return saved;
    };

    const leave = (saved: YesNoAnswerValue | undefined, delay: number) => {
      const fieldName = block.fieldName;
      if (!fieldName) return;

      leaving.current = true;
      timers.current.push(
        setTimeout(() => goToNextBlock({ [fieldName]: saved }), delay),
        setTimeout(() => {
          leaving.current = false;
        }, delay + LEAVE_TIMEOUT_MS),
      );
    };

    const handleChoose = (choice: Choice) => {
      if (disabled || leaving.current) return;

      if (choice === NO) {
        // Keep the typed details on screen in case the patient comes back to Yes.
        leave(save({ choice: NO, details: state.details }), ADVANCE_DELAY_MS);
        return;
      }

      if (state.choice !== YES) save({ choice: YES, details: state.details });
      // Focus once the area has started to open, so the page scrolls to it.
      timers.current.push(
        setTimeout(() => textareaRef.current?.focus(), ADVANCE_DELAY_MS),
      );
    };

    const handleDetailsChange = (details: string) => {
      if (disabled || leaving.current) return;
      save({ choice: YES, details });
    };

    const handleContinue = () => {
      if (disabled || leaving.current || !isAnswerComplete(state, block)) return;
      leave(toValue(state), 0);
    };

    return (
      <div ref={ref}>
        <YesNoAnswerUi
          data={block}
          state={state}
          theme={theme}
          disabled={disabled}
          showButton={block.showContinueButton === false}
          textareaRef={textareaRef}
          onChoose={handleChoose}
          onDetailsChange={handleDetailsChange}
          onContinue={handleContinue}
        />
      </div>
    );
  },
);

YesNoAnswerRenderer.displayName = 'YesNoAnswerRenderer';

// ============= UNIFIED BLOCK DEFINITION =============

const createDefaultData = (fieldName: string): BlockData => ({
  type: 'yesNoAnswer',
  fieldName,
  label: DEFAULTS.label,
  description: '',
  noLabel: NO,
  yesLabel: YES,
  detailsPrompt: DEFAULTS.detailsPrompt,
  detailsPlaceholder: DEFAULTS.detailsPlaceholder,
  detailsRequired: true,
  buttonText: DEFAULTS.buttonText,
  // The block moves on by itself after No, and draws its own button after Yes.
  showContinueButton: false,
});

export const YesNoAnswerBlock: BlockDefinition = {
  type: 'yesNoAnswer',
  name: 'Yes/No Answer',
  description: 'No moves on; Yes opens a text area for details',
  icon: <MessageSquareText className="w-4 h-4" />,
  defaultData: createDefaultData(''),
  generateDefaultData: () => createDefaultData(generateFieldName('yesNoAnswer')),
  renderItem: (props) => <YesNoAnswerBlockItem {...props} />,
  renderFormFields: (props) => <YesNoAnswerBlockForm {...props} />,
  renderPreview: () => <YesNoAnswerBlockPreview />,
  renderBlock: (props) => <YesNoAnswerRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    if (!data.label) return 'Label is required';
    if (getNoLabel(data) === getYesLabel(data)) {
      return 'The two answers must be different';
    }

    return null;
  },
  // The block doesn't show this message: the disabled button already tells the
  // patient that details are needed.
  validateValue: (value, data) => {
    const state = fromValue(value);
    if (!state.choice) return 'Please choose an answer';
    if (!isAnswerComplete(state, data)) return 'Please add the details';

    return null;
  },
  // Rules test the Yes/No answer; the free-text details stay out of them.
  outputSchema: {
    type: 'object',
    properties: {
      answer: {
        type: 'string',
        description: 'yes/no answer',
        options: [
          { label: YES, value: YES },
          { label: NO, value: NO },
        ],
      },
      details: {
        type: 'string',
        description: 'details for the yes answer',
        excludeFromRules: true,
      },
    },
  },
  fieldConfig: {
    enabled: true,
    label: 'Field Name',
    required: true,
  },
};
