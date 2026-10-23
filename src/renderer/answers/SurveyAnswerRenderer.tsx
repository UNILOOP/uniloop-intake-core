import React from 'react';
import { resolveBlockDefinition } from '../../blocks';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../lib/utils';
import type { AnswerViewProps, BlockData, BlockDefinition, BlockOverrides } from '../../types';
import { DEFAULT_LANGUAGE_CODE } from '../../utils/languages';
import { getLocalized } from '../../utils/surveyUtils';
import { RenderWith } from '../renderers/BlockOverrideBoundary';
import { AnswerItem } from './AnswerItem';
import { NotProvided, isEmptyAnswer } from './AnswerText';
import { type AnswerForm, collectAnswerBlocks, pickAnswerBlocks } from './collectAnswerBlocks';
import { RawAnswer } from './RawAnswer';

export interface SurveyAnswerRendererProps {
  /** The form's data (`{ rootNode, localizations }`), its root node, or its blocks */
  form: AnswerForm;
  /** The saved answers, by field name */
  answers: Record<string, any>;
  /** Block definitions to use before the registry, e.g. custom blocks the host hasn't registered */
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
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

/** Shows the raw answer when a block's answer view throws. */
class AnswerViewBoundary extends React.Component<AnswerViewBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[answerView] "${this.props.type}" failed to render, so its raw answer is shown instead.`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const textOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);

/**
 * Every answered question in a form, in form order, each shown by its block's
 * `answerView` under the question. Blocks without a view show the raw value.
 * The Auth block's answer is never shown, only whether the patient signed in.
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
  const items = pickAnswerBlocks(collectAnswerBlocks(form), answers).filter(
    (block) => showUnanswered || !isEmptyAnswer(answers?.[block.fieldName as string])
  );

  const renderAnswer = (block: BlockData, question: string) => {
    const value = answers?.[block.fieldName as string];
    if (isEmptyAnswer(value)) return <NotProvided />;
    if (block.type === 'auth') return <Badge variant="default">Authenticated User</Badge>;

    const definition =
      (blockDefinitions && Object.prototype.hasOwnProperty.call(blockDefinitions, block.type)
        ? blockDefinitions[block.type]
        : undefined) ?? resolveBlockDefinition(block.type, blockOverrides);
    if (!definition?.answerView) return <RawAnswer value={value} />;

    const props: AnswerViewProps = { block, value, answers, question, language };
    return (
      <AnswerViewBoundary type={block.type} fallback={<RawAnswer value={value} />}>
        <RenderWith render={definition.answerView} props={props} />
      </AnswerViewBoundary>
    );
  };

  if (items.length === 0) {
    return <p className={cn('py-4 text-center text-muted-foreground', className)}>No responses recorded.</p>;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {items.map((block, index) => {
        const question =
          textOf(getLocalized(block, 'label', language, localizations)) ??
          textOf(getLocalized(block, 'name', language, localizations)) ??
          (block.fieldName as string);
        const description = textOf(getLocalized(block, 'description', language, localizations));
        return (
          <div key={block.uuid ?? block.fieldName}>
            <AnswerItem question={question} description={description} blockType={showBlockType ? block.type : undefined}>
              {renderAnswer(block, question)}
            </AnswerItem>
            {index < items.length - 1 && <Separator className="mt-4" />}
          </div>
        );
      })}
    </div>
  );
}

