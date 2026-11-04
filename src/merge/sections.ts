import type { BlockData, NodeData } from '../types';
import { ROOT_KEY, sectionChildren } from './collect';
import { keyLabel } from './describe';
import { defaultFor, originOf } from './fields';
import type { MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from './types';
import { clone, isEqual } from './utils';

interface SectionLocation {
  key: string;
  node: NodeData;
  parent: string;
}

export function collectSections(root: NodeData): Map<string, SectionLocation> {
  const sections = new Map<string, SectionLocation>();
  const visit = (node: NodeData, parent: string) => {
    for (const { node: child, key } of sectionChildren(node, parent)) {
      if (typeof child === 'string') continue;
      sections.set(key, { key, node: child, parent });
      visit(child, key);
    }
  };
  visit(root, ROOT_KEY);
  return sections;
}

const settingsOf = (node: NodeData): Record<string, unknown> => {
  const { items, nodes, uuid, ...settings } = node;
  return settings;
};

const nodeOrder = (node: NodeData, parent: string): string[] => sectionChildren(node, parent).map(({ key }) => key);

/** Section identity follows its UUID (or name when absent), never its array position. */
export function diffSections(current: SurveySnapshot, incoming: SurveySnapshot, base?: SurveySnapshot): MergeHunk[] {
  const ours = collectSections(current.rootNode);
  const theirs = collectSections(incoming.rootNode);
  const ancestors = base ? collectSections(base.rootNode) : undefined;
  const hunks: MergeHunk[] = [];
  const add = (hunk: Omit<MergeHunk, 'origin' | 'conflict' | 'locked' | 'defaultDecision'>, hasBase = !!base) => {
    const origin = originOf(hunk.current, hunk.incoming, hunk.base, hasBase);
    hunks.push({ ...hunk, origin, conflict: origin === 'both', locked: false, defaultDecision: defaultFor(origin, false) });
  };
  for (const key of new Set([...ours.keys(), ...theirs.keys()])) {
    const before = ours.get(key);
    const after = theirs.get(key);
    const ancestor = ancestors?.get(key);
    const name = (after ?? before)!.node.name || 'Untitled section';
    if (!before || !after) {
      add({
        id: `section:${key}:${after ? 'add' : 'remove'}`,
        kind: after ? 'section-added' : 'section-removed',
        category: 'survey',
        label: `${after ? 'Add' : 'Remove'} section: ${name}`,
        detail: 'Includes the section’s questions and nested sections.',
        current: before?.node,
        incoming: after?.node,
        base: ancestor?.node,
        meta: { kind: 'key', sectionKey: key },
      });
      continue;
    }
    const beforeSettings = settingsOf(before.node);
    const afterSettings = settingsOf(after.node);
    for (const field of new Set([...Object.keys(beforeSettings), ...Object.keys(afterSettings)])) {
      if (isEqual(beforeSettings[field], afterSettings[field])) continue;
      add(
        {
          id: `section:${key}:key:${field}`,
          kind: 'section-field',
          category: 'survey',
          label: `Section ${name}: ${keyLabel(field)}`,
          path: field,
          current: beforeSettings[field],
          incoming: afterSettings[field],
          base: ancestor ? settingsOf(ancestor.node)[field] : undefined,
          meta: { kind: 'key', sectionKey: key, key: field },
        },
        !!ancestor
      );
    }
    if (before.parent !== after.parent) {
      add(
        {
          id: `section:${key}:placement`,
          kind: 'section-placement',
          category: 'placement',
          label: `Move section: ${name}`,
          current: before.parent,
          incoming: after.parent,
          base: ancestor?.parent,
          meta: { kind: 'key', sectionKey: key },
        },
        !!ancestor
      );
    }
  }
  const parents = new Set([ROOT_KEY, ...ours.keys(), ...theirs.keys()]);
  for (const key of parents) {
    const before = key === ROOT_KEY ? current.rootNode : ours.get(key)?.node;
    const after = key === ROOT_KEY ? incoming.rootNode : theirs.get(key)?.node;
    if (!before || !after) continue;
    const beforeOrder = nodeOrder(before, key);
    const afterOrder = nodeOrder(after, key);
    if (isEqual(beforeOrder, afterOrder)) continue;
    const ancestor = key === ROOT_KEY ? base?.rootNode : ancestors?.get(key)?.node;
    add(
      {
        id: `section:${key}:order`,
        kind: 'section-order',
        category: 'order',
        label: `Section order in ${before.name || 'the form'}`,
        current: beforeOrder,
        incoming: afterOrder,
        base: ancestor ? nodeOrder(ancestor, key) : undefined,
        meta: { kind: 'key', sectionKey: key },
      },
      !!ancestor
    );
  }
  return hunks;
}

/** Merge the section shells separately from their questions, preserving local edits. */
export function mergeSections(diff: SurveyDiff, decide: (hunk: MergeHunk) => MergeSide) {
  const current = collectSections(diff.current.rootNode);
  const incoming = collectSections(diff.incoming.rootNode);
  const sections = new Map<string, SectionLocation>();
  for (const key of new Set([...current.keys(), ...incoming.keys()])) {
    const ours = current.get(key);
    const theirs = incoming.get(key);
    const existence = diff.hunks.find((hunk) => hunk.meta?.sectionKey === key && (hunk.kind === 'section-added' || hunk.kind === 'section-removed'));
    const source = existence ? (decide(existence) === 'incoming' ? theirs : ours) : (ours ?? theirs);
    if (!source) continue;
    const node = clone(source.node);
    let parent = source.parent;
    for (const hunk of diff.hunks) {
      if (hunk.meta?.sectionKey !== key || decide(hunk) !== 'incoming') continue;
      if (hunk.kind === 'section-placement') parent = theirs!.parent;
      if (hunk.kind === 'section-field' && hunk.meta.key) {
        const field = hunk.meta.key;
        if (theirs?.node[field] === undefined) delete node[field];
        else node[field] = clone(theirs.node[field]);
      }
    }
    sections.set(key, { key, parent, node });
  }
  const present = (key: string, seen = new Set<string>()): boolean => {
    if (key === ROOT_KEY) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    const location = sections.get(key);
    return !!location && present(location.parent, seen);
  };
  for (const key of sections.keys()) if (!present(key)) sections.delete(key);

  const rebuild = (root: NodeData, buildItems: (key: string) => BlockData[]): NodeData => {
    const build = (node: NodeData, key: string): NodeData => {
      const orderHunk = diff.hunks.find((hunk) => hunk.kind === 'section-order' && hunk.meta?.sectionKey === key);
      const reference =
        orderHunk && decide(orderHunk) === 'incoming' ? (incoming.get(key)?.node ?? (key === ROOT_KEY ? diff.incoming.rootNode : node)) : node;
      const children = [...sections.values()].filter((section) => section.parent === key);
      const tokens = nodeOrder(reference, key).filter((token) => token.startsWith('ref:') || children.some((child) => child.key === token));
      // Insert new sections beside the closest surviving incoming neighbour.
      const incomingNode = key === ROOT_KEY ? diff.incoming.rootNode : incoming.get(key)?.node;
      const incomingOrder = incomingNode ? nodeOrder(incomingNode, key) : [];
      for (const child of children) {
        if (tokens.includes(child.key)) continue;
        const index = incomingOrder.indexOf(child.key);
        const previous = incomingOrder
          .slice(0, index)
          .reverse()
          .find((token) => tokens.includes(token));
        if (previous) tokens.splice(tokens.indexOf(previous) + 1, 0, child.key);
        else if (index === 0) tokens.unshift(child.key);
        else tokens.push(child.key);
      }
      const result: NodeData = { ...node, items: buildItems(key) };
      if (node.nodes || tokens.length)
        result.nodes = tokens.map((token) => (token.startsWith('ref:') ? token.slice(4) : build(sections.get(token)!.node, token)));
      return result;
    };
    return build(root, ROOT_KEY);
  };
  return { sections, rebuild };
}
