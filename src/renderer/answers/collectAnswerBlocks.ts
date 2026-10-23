import type { BlockData, LocalizationMap, NodeData } from '../../types';
import { getSurveyPages } from '../../utils/surveyUtils';

/** A form's data (`{ rootNode }`), its root node, or its blocks. */
export type AnswerForm = { rootNode: NodeData; localizations?: LocalizationMap } | NodeData | BlockData[];

// Blocks that show content or run logic and save no answer of their own
const NO_ANSWER_TYPES = new Set(['markdown', 'html', 'script']);

function flattenSets(blocks: BlockData[], into: BlockData[]): BlockData[] {
  for (const block of blocks) {
    if (block.type === 'set') flattenSets(block.items ?? [], into);
    else into.push(block);
  }
  return into;
}

/**
 * The blocks in a form that save an answer, in form order. A conditional
 * block stands for its child block, saved under the conditional's field name.
 */
export function collectAnswerBlocks(form: AnswerForm | null | undefined): BlockData[] {
  if (!form) return [];
  const blocks = Array.isArray(form)
    ? flattenSets(form, [])
    : flattenSets(getSurveyPages('rootNode' in form && form.rootNode ? form.rootNode : (form as NodeData)).flat(), []);

  return blocks
    .map((block) =>
      block.type === 'conditional' && block.childBlock
        ? { ...block.childBlock, fieldName: block.fieldName || block.childBlock.fieldName }
        : block
    )
    .filter((block) => block.fieldName && !NO_ANSWER_TYPES.has(block.type));
}

const hasOption = (block: BlockData, value: unknown) =>
  Array.isArray(block.options) && block.options.some((option) => String(option?.value) === String(value));

/**
 * One block per field name, at the first block's place. When several blocks
 * save the same name, the answer belongs to the one whose options hold every
 * saved value, else to the first.
 */
export function pickAnswerBlocks(blocks: BlockData[], answers: Record<string, unknown>): BlockData[] {
  const byName = new Map<string, BlockData[]>();
  for (const block of blocks) {
    const name = block.fieldName as string;
    byName.set(name, [...(byName.get(name) ?? []), block]);
  }
  const result: BlockData[] = [];
  for (const [name, candidates] of byName) {
    const value = answers?.[name];
    const values = Array.isArray(value) ? value : [value];
    const match = candidates.find((block) => values.length > 0 && values.every((item) => hasOption(block, item)));
    result.push(match ?? candidates[0]);
  }
  return result;
}
