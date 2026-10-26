import React from 'react';
import { resolveBlockDefinition } from '../../blocks';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../lib/utils';
import type { AnswerViewProps, BlockData, BlockDefinition, BlockOverrides } from '../../types';
import { getFieldQuestion, getMappedFields } from '../../utils/blockFields';
import { DEFAULT_LANGUAGE_CODE } from '../../utils/languages';
import { getObjectOutputSchema } from '../../utils/outputSchema';
import { getLocalized } from '../../utils/surveyUtils';
import { RenderWith } from '../renderers/BlockOverrideBoundary';
import { AnswerItem } from './AnswerItem';
import { NotProvided, isEmptyAnswer } from './AnswerText';
import { type AnswerForm, collectAnswerBlocks, pickAnswerBlocks } from './collectAnswerBlocks';
import { OptionChips, toOptionChoices } from './OptionChips';
import { RawAnswer } from './RawAnswer';

export interface SurveyAnswerRendererProps {
  /** The form's data (`{ rootNode, localizations }`), its root node, or its blocks */
  form: AnswerForm;
  /** The saved answers, by field name */
  answers: Record<string, any>;
  /**
   * Block definitions to use before the registry. Blocks registered with `registerBlock`
   * already show their `answerView`, so this is only for explicit overrides.
   */
  blockDefinitions?: Record<string, BlockDefinition>;
  /** The form's block overrides, so overridden blocks show their override's view */
  blockOverrides?: BlockOverrides;
  /** Shows questions and descriptions in this language when the form has localizations for it */
  language?: string;
  /** Lists questions with no answer as "Not provided"; hidden by default */
  showUnanswered?: boolean;
  /** Shows each block's type beside its question */
  showBlockType?: boolean;
  className?: string;
}

interface AnswerViewBoundaryProps {
  type: string;
  /** The answer and the view it shows; a new one gives the view another try */
  value: unknown;
  view: unknown;
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

/** Shows the raw answer when a block's answer view throws, until the answer or the view changes. */
class AnswerViewBoundary extends React.Component<AnswerViewBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[answerView] "${this.props.type}" failed to render, so its raw answer is shown instead.`, error);
  }

  componentDidUpdate(prevProps: AnswerViewBoundaryProps) {
    if (this.state.failed && (prevProps.value !== this.props.value || prevProps.view !== this.props.view)) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const textOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);

/** One question in the list: a block's own field, or one of its mapped output keys */
interface AnswerEntry {
  block: BlockData;
  fieldName: string;
  value: unknown;
  /** Set for a mapped output key */
  outputKey?: string;
}

/**
 * Every answered question in a form, in form order, each shown by its block's
 * `answerView` under the question. Blocks without a view show the raw value.
 * Each output key a block saves under its own field name follows the block,
 * with its own question and option labels. The Auth block's answer is never
 * shown, only whether the patient signed in.
 */
export function SurveyAnswerRenderer({
  form,
  answers,
  blockDefinitions,
  blockOverrides,
  language = DEFAULT_LANGUAGE_CODE,
  showUnanswered = false,
  showBlockType = false,
  className,
}: SurveyAnswerRendererProps) {
  const localizations = form && !Array.isArray(form) && 'rootNode' in form ? form.localizations : undefined;

  const definitionFor = (type: string): BlockDefinition | undefined =>
    (blockDefinitions && Object.prototype.hasOwnProperty.call(blockDefinitions, type)
      ? blockDefinitions[type]
      : undefined) ?? resolveBlockDefinition(type, blockOverrides);

  // A mapped key's answer is saved under its own name, else read from the block's answer.
  // The Auth block's keys hold its login, so they're never listed.
  const entries: AnswerEntry[] = pickAnswerBlocks(collectAnswerBlocks(form), answers ?? {}).flatMap((block) => {
    const value = answers?.[block.fieldName as string];
    const parent = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
    const mapped = block.type === 'auth' ? [] : getMappedFields(block);
    return [
      { block, fieldName: block.fieldName as string, value },
      ...mapped.map(({ key, fieldName }) => ({
        block,
        fieldName,
        outputKey: key,
        value: isEmptyAnswer(answers?.[fieldName]) ? parent?.[key] : answers[fieldName],
      })),
    ];
  });
  const items = entries.filter((entry) => showUnanswered || !isEmptyAnswer(entry.value));

  const renderAnswer = ({ block, value }: AnswerEntry, question: string) => {
    if (isEmptyAnswer(value)) return <NotProvided />;
    if (block.type === 'auth') return <Badge variant="default">Authenticated User</Badge>;

    const definition = definitionFor(block.type);
    if (!definition?.answerView) return <RawAnswer value={value} />;

    const props: AnswerViewProps = { block, value, answers, question, language };
    return (
      <AnswerViewBoundary
        type={block.type}
        value={value}
        view={definition.answerView}
        fallback={<RawAnswer value={value} />}
      >
        <RenderWith render={definition.answerView} props={props} />
      </AnswerViewBoundary>
    );
  };

  // A mapped key lists its output property's options, from the definition or as saved with the form
  const renderMappedAnswer = ({ block, value, outputKey }: AnswerEntry) => {
    if (isEmptyAnswer(value)) return <NotProvided />;
    const definition = definitionFor(block.type);
    const property = definition ? getObjectOutputSchema(definition, block)?.properties[outputKey as string] : undefined;
    const options = property?.options?.length ? property.options : block.outputFields?.[outputKey as string]?.options;
    if (!options?.length) return <RawAnswer value={value} />;
    return <OptionChips options={toOptionChoices(options)} value={value} />;
  };

  if (items.length === 0) {
    return <p className={cn('py-4 text-center text-muted-foreground', className)}>No responses recorded.</p>;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {items.map((entry, index) => {
        const { block, fieldName, outputKey } = entry;
        const question = outputKey
          ? getFieldQuestion(block, fieldName, definitionFor(block.type))
          : (textOf(getLocalized(block, 'label', language, localizations)) ??
            textOf(getLocalized(block, 'name', language, localizations)) ??
            fieldName);
        const description = outputKey ? undefined : textOf(getLocalized(block, 'description', language, localizations));
        return (
          <div key={`${block.uuid ?? block.fieldName}:${outputKey ?? ''}`}>
            <AnswerItem question={question} description={description} blockType={showBlockType ? block.type : undefined}>
              {outputKey ? renderMappedAnswer(entry) : renderAnswer(entry, question)}
            </AnswerItem>
            {index < items.length - 1 && <Separator className="mt-4" />}
          </div>
        );
      })}
    </div>
  );
}
