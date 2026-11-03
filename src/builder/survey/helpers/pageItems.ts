import { v4 as uuidv4 } from "uuid";
import type { BlockData } from "../../../types";
import { standardRuleToEnhanced } from "../../common/navigation-rules-types";
import { splitConditions } from "../../../utils/conditionGroups";

/** A page among a form's single blocks: a `set` that shows its blocks together */
export const isPageItem = (item: BlockData): boolean => item.type === "set";

/** Removes the page at `index` and puts its blocks in its place */
export function removePageKeepingBlocks(items: BlockData[], index: number): BlockData[] {
  const next = [...items];
  const [page] = next.splice(index, 1);
  next.splice(index, 0, ...(page?.items || []));
  return next;
}

/**
 * Moves a block into a page (`page:<uuid>`, at its end) or out of its page
 * (`root`, just after that page). Returns the items unchanged when either end
 * isn't found.
 */
export function moveBlock(items: BlockData[], blockUuid: string, target: string): BlockData[] {
  const next = [...items];
  let block: BlockData | undefined;
  let fromPageUuid: string | undefined;

  const rootIndex = next.findIndex((item) => item.uuid === blockUuid);
  if (rootIndex >= 0) {
    [block] = next.splice(rootIndex, 1);
  } else {
    for (let i = 0; i < next.length; i++) {
      const pageItems: BlockData[] = next[i].items || [];
      const blockIndex = pageItems.findIndex((item) => item.uuid === blockUuid);
      if (isPageItem(next[i]) && blockIndex >= 0) {
        block = pageItems[blockIndex];
        fromPageUuid = next[i].uuid;
        next[i] = { ...next[i], items: pageItems.filter((_, j) => j !== blockIndex) };
        break;
      }
    }
  }
  if (!block) return items;

  if (target === "root") {
    if (!fromPageUuid) return items;
    const pageIndex = next.findIndex((item) => item.uuid === fromPageUuid);
    next.splice(pageIndex + 1, 0, block);
    return next;
  }

  const pageUuid = target.replace(/^page:/, "");
  const pageIndex = next.findIndex((item) => isPageItem(item) && item.uuid === pageUuid);
  if (pageIndex < 0 || isPageItem(block)) return items;
  next[pageIndex] = { ...next[pageIndex], items: [...(next[pageIndex].items || []), block] };
  return next;
}

/**
 * Adds an empty page, at `index` or at the end. A page layout name sets how the
 * page places its blocks; without one the page is stacked.
 */
export function addPage(items: BlockData[], layoutName?: string, index = items.length): BlockData[] {
  const pageCount = items.filter(isPageItem).length;
  const page: BlockData = { type: "set", name: `Page ${pageCount + 1}`, uuid: uuidv4(), items: [] };
  if (layoutName) page.pageLayout = layoutName;
  const next = [...items];
  next.splice(index, 0, page);
  return next;
}

/**
 * Show/hide conditions that read a field of the same block or a later one, by
 * block uuid. A block asked before that field is answered can't use it, which
 * happens most often after a move. Fields that no block saves (external keys)
 * and conditions the rule parser can't read aren't reported.
 */
export function findForwardVisibilityRefs(items: BlockData[]): Record<string, string[]> {
  const order: BlockData[] = [];
  const walk = (list: BlockData[]) =>
    list.forEach((item) => {
      order.push(item);
      if (isPageItem(item)) walk(item.items || []);
    });
  walk(items);

  const ownerIndex = (field: string) =>
    order.findIndex((block) => block.fieldName && (field === block.fieldName || field.startsWith(`${block.fieldName}.`)));

  const found: Record<string, string[]> = {};
  order.forEach((block, index) => {
    const fields = (block.visibility?.conditions || [])
      .flatMap(splitConditions)
      .map((condition) => standardRuleToEnhanced(condition).field)
      .filter((field): field is string => !!field && ownerIndex(field) >= index);
    if (block.uuid && fields.length > 0) found[block.uuid] = [...new Set(fields)];
  });
  return found;
}
