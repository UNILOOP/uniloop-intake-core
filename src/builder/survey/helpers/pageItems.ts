import type { BlockData } from "../../../types";

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
