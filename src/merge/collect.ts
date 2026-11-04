import type { BlockData, NodeData } from '../types';
import type { ContainerEntry } from './types';
import { stableStringify } from './utils';

export const ROOT_KEY = '__root__';

export const sectionKey = (node: NodeData, parentKey: string): string => {
  if (node.uuid) return node.uuid;
  const { items, nodes, ...settings } = node;
  return `section:${parentKey}:${node.name || stableStringify(settings)}`;
};

/** Disambiguate anonymous siblings by content instead of matching unrelated positions. */
export function sectionChildren(node: NodeData, parentKey: string): Array<{ node: NodeData | string; key: string }> {
  const children = (node.nodes ?? []).filter((child): child is NodeData | string => !!child);
  const identities = children.map((child) => (typeof child === 'string' ? `ref:${child}` : sectionKey(child, parentKey)));
  const seen = new Map<string, number>();
  return children.map((child, index) => {
    let key = identities[index];
    if (typeof child !== 'string' && !child.uuid && identities.filter((identity) => identity === key).length > 1) {
      key += `:${stableStringify(child)}`;
      const occurrence = seen.get(key) ?? 0;
      seen.set(key, occurrence + 1);
      key += `:${occurrence}`;
    }
    return { node: child, key };
  });
}

export interface BlockLocation {
  key: string;
  block: BlockData;
  containerKey: string;
  index: number;
  isPage: boolean;
}

export interface CollectedSurvey {
  blocks: BlockLocation[];
  containers: Map<string, ContainerEntry>;
}

export const blockKey = (block: BlockData, containerKey: string, index: number): string =>
  block.uuid || (block.fieldName ? `field:${block.fieldName}` : `pos:${containerKey}:${index}`);

export const isPageBlock = (block: BlockData | null | undefined): boolean => !!block && block.type === 'set';

export const pageName = (page: BlockData): string =>
  (typeof page.name === 'string' && page.name) ||
  (typeof page.label === 'string' && page.label) ||
  (typeof page.title === 'string' && page.title) ||
  'Page';

/**
 * Flatten a survey into its blocks and pages with where each one lives. The root
 * container always has the same key so roots match across surveys whatever their uuid.
 */
export function collectSurvey(rootNode: NodeData | null | undefined): CollectedSurvey {
  const blocks: BlockLocation[] = [];
  const containers = new Map<string, ContainerEntry>();
  if (!rootNode) return { blocks, containers };
  containers.set(ROOT_KEY, { key: ROOT_KEY, kind: 'root', name: rootNode.name || 'Form' });

  const visitItems = (items: unknown, containerKey: string) => {
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const block = item as BlockData;
      const key = blockKey(block, containerKey, index);
      if (isPageBlock(block)) {
        blocks.push({ key, block, containerKey, index, isPage: true });
        containers.set(key, { key, kind: 'page', name: pageName(block), parentKey: containerKey });
        visitItems(block.items, key);
      } else {
        blocks.push({ key, block, containerKey, index, isPage: false });
      }
    });
  };

  const visitNode = (node: NodeData, containerKey: string) => {
    visitItems(node.items, containerKey);
    sectionChildren(node, containerKey).forEach(({ node: child, key }) => {
      if (typeof child === 'string') return;
      containers.set(key, { key, kind: 'section', name: child.name || 'Section', parentKey: containerKey });
      visitNode(child, key);
    });
  };

  visitNode(rootNode, ROOT_KEY);
  return { blocks, containers };
}

/** The flat list of real blocks (no pages) of a survey, for rule labels and lookups. */
export function flatBlocks(rootNode: NodeData | null | undefined): BlockData[] {
  return collectSurvey(rootNode)
    .blocks.filter((location) => !location.isPage)
    .map((location) => location.block);
}
