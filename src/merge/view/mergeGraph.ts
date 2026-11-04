import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { ReactNode } from 'react';
import { buildFlowGraph } from '../../builder/flowv3/utils/flowGraph';
import type { BlockData, BlockDefinition, NodeData } from '../../types';
import { collectSurvey, pageName } from '../collect';
import { describeCondition, describeOptions, type OptionsChange } from '../describe';
import type { BlockDiffEntry, MergeDecisions, MergeHunk, MergeSide, SurveyDiff, SurveySnapshot } from '../types';
import { entryStatus } from './entryStatus';
import { changeChips, type EdgeStatus, type NodeStatus } from './status';

export interface MergeChildSummary {
  key: string;
  title: string;
  status: NodeStatus;
}

export interface MergeNodeData extends Record<string, unknown> {
  entryKey: string;
  status: NodeStatus;
  present: boolean;
  isPage: boolean;
  title: string;
  typeName: string;
  icon?: ReactNode;
  fieldName?: string;
  hunkCount: number;
  conflicts: number;
  locked: boolean;
  /** What kinds of settings changed on this block, e.g. Text, Options, Paths */
  chips: string[];
  children?: MergeChildSummary[];
  optionsChange?: OptionsChange;
  /** For an added or removed block: the hunk that takes or leaves it */
  toggleHunkId?: string;
  toggleSide?: MergeSide;
  /** Narrower card for side-by-side columns */
  compact?: boolean;
}

export interface MergeEdgeData extends Record<string, unknown> {
  status: EdgeStatus;
  /** The path's identity across columns: source, target and label */
  key?: string;
  edgeType?: string;
  label?: string;
  /** Side-by-side columns: a straight drop to the next row, or a lane to the right of the column */
  direct?: boolean;
  lane?: number;
  /** How many lanes the column uses */
  lanes?: number;
  /** Position among the paths leaving the same block */
  edgeIndex?: number;
  weight?: number;
  totalParallelEdges?: number;
}

export interface MergeTerminalData extends Record<string, unknown> {
  label: string;
  kind: 'start' | 'end';
}

export type MergeFlowNode = Node<MergeNodeData, 'merge-node'> | Node<MergeTerminalData, 'merge-terminal'>;
export type MergeFlowEdge = Edge<MergeEdgeData, 'merge-edge'>;

type KeyOf = (block: BlockData, isPage: boolean) => string;

/**
 * One block per step of a survey, keyed the way the diff keys it, with its
 * navigation targets pointing at step keys. In a paged form every page is one
 * step that carries the paths of the blocks inside it.
 */
export function pseudoSteps(rootNode: NodeData | null | undefined, keyOf: KeyOf): BlockData[] {
  const collected = collectSurvey(rootNode);
  const paged = collected.blocks.some((location) => location.isPage);
  const keyByUuid = new Map<string, string>();
  const keyByField = new Map<string, string>();
  const pageKeyOfContainer = new Map<string, string>();
  const keyOfLocation = new Map<typeof collected.blocks[number], string>();
  for (const location of collected.blocks) {
    const key = keyOf(location.block, location.isPage);
    keyOfLocation.set(location, key);
    if (location.block.uuid) keyByUuid.set(location.block.uuid, key);
    if (!location.isPage && location.block.fieldName) keyByField.set(location.block.fieldName, key);
    if (location.isPage) pageKeyOfContainer.set(location.key, key);
  }
  const stepOfKey = new Map<string, string>();
  for (const location of collected.blocks) {
    const key = keyOfLocation.get(location)!;
    const pageKey = pageKeyOfContainer.get(location.containerKey);
    stepOfKey.set(key, paged && pageKey ? pageKey : key);
  }
  const remapTarget = (target: unknown): string | undefined => {
    if (typeof target !== 'string' || !target || target === 'submit' || target === 'end') return typeof target === 'string' ? target : undefined;
    const key = keyByUuid.get(target) ?? keyByField.get(target);
    return key ? (stepOfKey.get(key) ?? key) : target;
  };
  const remapRules = (block: BlockData) =>
    (Array.isArray(block.navigationRules) ? block.navigationRules : []).map((rule) => ({ ...rule, target: remapTarget(rule.target) ?? rule.target }));

  const steps: BlockData[] = [];
  for (const location of collected.blocks) {
    const key = keyOfLocation.get(location)!;
    if (location.isPage) {
      const inner = collected.blocks.filter((candidate) => candidate.containerKey === location.key);
      steps.push({
        ...location.block,
        items: undefined,
        uuid: key,
        name: pageName(location.block),
        navigationRules: [...remapRules(location.block), ...inner.flatMap((candidate) => remapRules(candidate.block))],
        nextBlockId: remapTarget(location.block.nextBlockId),
        isEndBlock: location.block.isEndBlock === true || inner.some((candidate) => candidate.block.isEndBlock === true),
      });
      continue;
    }
    if (paged && pageKeyOfContainer.has(location.containerKey)) continue;
    steps.push({ ...location.block, uuid: key, navigationRules: remapRules(location.block), nextBlockId: remapTarget(location.block.nextBlockId) });
  }
  return steps;
}

export interface SideGraphs {
  merged: ReturnType<typeof buildFlowGraph>;
  current: ReturnType<typeof buildFlowGraph>;
  incoming: ReturnType<typeof buildFlowGraph>;
}

/** The flow graphs of the current, incoming and merged forms, all keyed by diff entry key. */
export function buildSideGraphs(diff: SurveyDiff, merged: SurveySnapshot, definitions: Record<string, BlockDefinition>): SideGraphs {
  const byCurrentUuid = new Map<string, string>();
  const byIncomingUuid = new Map<string, string>();
  const byField = new Map<string, string>();
  const byPageName = new Map<string, string>();
  for (const entry of diff.blocks) {
    if (entry.currentUuid) byCurrentUuid.set(entry.currentUuid, entry.key);
    if (entry.incomingUuid) byIncomingUuid.set(entry.incomingUuid, entry.key);
    if (!entry.isPage && entry.fieldName && !byField.has(entry.fieldName)) byField.set(entry.fieldName, entry.key);
    if (entry.isPage) {
      for (const page of [entry.current, entry.incoming]) if (page && !byPageName.has(pageName(page))) byPageName.set(pageName(page), entry.key);
    }
  }
  const fallbackKey = (block: BlockData, isPage: boolean) =>
    (block.uuid as string) || (isPage ? `page:${pageName(block)}` : block.fieldName ? `field:${block.fieldName}` : 'unknown');
  const keyFor = (uuidMap: Map<string, string>): KeyOf => (block, isPage) =>
    (block.uuid && uuidMap.get(block.uuid)) ||
    (isPage ? byPageName.get(pageName(block)) : block.fieldName ? byField.get(block.fieldName) : undefined) ||
    fallbackKey(block, isPage);
  const mergedKey: KeyOf = (block, isPage) =>
    (block.uuid && (byCurrentUuid.get(block.uuid) ?? byIncomingUuid.get(block.uuid))) ||
    (isPage ? byPageName.get(pageName(block)) : block.fieldName ? byField.get(block.fieldName) : undefined) ||
    fallbackKey(block, isPage);
  // Rule labels name the question, not its field name
  const graphOf = (steps: BlockData[]) => {
    const graph = buildFlowGraph(steps, definitions);
    for (const edge of graph.edges) {
      const rule = edge.data?.rule as { condition?: string; isDefault?: boolean } | undefined;
      if (rule && !rule.isDefault && rule.condition) edge.label = describeCondition(rule.condition, steps, definitions);
    }
    return graph;
  };
  return {
    merged: graphOf(pseudoSteps(merged.rootNode, mergedKey)),
    current: graphOf(pseudoSteps(diff.current.rootNode, keyFor(byCurrentUuid))),
    incoming: graphOf(pseudoSteps(diff.incoming.rootNode, keyFor(byIncomingUuid))),
  };
}

/** Whether an entry is drawn as its own step: every block in a pageless form, pages and root-level blocks in a paged one. */
export const isStepEntry = (diff: SurveyDiff, entry: BlockDiffEntry): boolean => {
  const paged = diff.blocks.some((candidate) => candidate.isPage);
  if (!paged) return !entry.isPage;
  const container = diff.containers[entry.containerKey];
  return entry.isPage || !container || container.kind !== 'page';
};

export interface NodeDataContext {
  diff: SurveyDiff;
  definitions: Record<string, BlockDefinition>;
  resolve: (hunk: MergeHunk) => MergeSide;
}

/** The data a canvas node shows for an entry. */
export function entryNodeData(entry: BlockDiffEntry, status: NodeStatus, present: boolean, context: NodeDataContext): MergeNodeData {
  const { diff, definitions, resolve } = context;
  const entries = new Map(diff.blocks.map((candidate) => [candidate.key, candidate]));
  const definition = definitions[entry.type];
  const decidable = entry.hunks.filter((hunk) => !hunk.locked);
  const toggleHunk = entry.status === 'added' ? `${entry.key}:add` : entry.status === 'removed' ? `${entry.key}:remove` : undefined;
  const toggleHunkObject = toggleHunk ? entry.hunks.find((hunk) => hunk.id === toggleHunk) : undefined;
  const children = entry.isPage
    ? (entry.childKeys ?? []).map((childKey) => {
        const child = entries.get(childKey);
        const childStatus = child ? entryStatus(child, resolve) : { status: 'unchanged' as NodeStatus };
        return { key: childKey, title: child?.title ?? childKey, status: childStatus.status };
      })
    : undefined;
  const optionsHunk = entry.hunks.find((hunk) => hunk.category === 'options');
  return {
    entryKey: entry.key,
    status,
    present,
    isPage: entry.isPage,
    title: entry.title,
    typeName: entry.isPage ? 'Page' : definition?.name ?? entry.type,
    icon: definition?.icon,
    fieldName: entry.fieldName,
    hunkCount: decidable.length,
    conflicts: entry.hunks.filter((hunk) => hunk.conflict).length,
    locked: entry.locked,
    chips: changeChips(entry.hunks),
    children,
    optionsChange: optionsHunk ? describeOptions(entry.current, entry.incoming) : undefined,
    toggleHunkId: toggleHunkObject && !toggleHunkObject.locked ? toggleHunk : undefined,
    toggleSide: toggleHunkObject ? resolve(toggleHunkObject) : undefined,
  };
}

export const edgeKey = (edge: Edge): string =>
  `${edge.source}|${edge.target}|${edge.data?.edgeType === 'sequential' ? 'seq' : String(edge.label ?? '')}`;

/** A short id-safe digest, since edge keys carry rule text with quotes and pipes */
export const digest = (text: string): string => {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
};

export interface BuildMergeGraphOptions {
  diff: SurveyDiff;
  merged: SurveySnapshot;
  decisions: MergeDecisions;
  resolve: (hunk: MergeHunk) => MergeSide;
  definitions: Record<string, BlockDefinition>;
  showDeclined: boolean;
}

/** The nodes and edges of the merge canvas: the merged flow, with removed and declined paths as ghosts. */
export function buildMergeGraph(options: BuildMergeGraphOptions): { nodes: MergeFlowNode[]; edges: MergeFlowEdge[] } {
  const { diff, merged, resolve, definitions, showDeclined } = options;
  const graphs = buildSideGraphs(diff, merged, definitions);
  const context: NodeDataContext = { diff, definitions, resolve };

  const nodes: MergeFlowNode[] = [{ id: 'start', type: 'merge-terminal', data: { label: 'Start', kind: 'start' }, position: { x: 0, y: 0 } }];
  const nodeIds = new Set<string>(['start', 'submit']);
  for (const entry of diff.blocks) {
    if (!isStepEntry(diff, entry)) continue;
    const { status, present } = entryStatus(entry, resolve);
    if (!present && status === 'declined-add' && !showDeclined) continue;
    nodeIds.add(entry.key);
    nodes.push({ id: entry.key, type: 'merge-node', data: entryNodeData(entry, status, present, context), position: { x: 0, y: 0 } });
  }
  nodes.push({ id: 'submit', type: 'merge-terminal', data: { label: 'Submit', kind: 'end' }, position: { x: 0, y: 0 } });

  const mergedKeys = new Set(graphs.merged.edges.map(edgeKey));
  const currentKeys = new Set(graphs.current.edges.map(edgeKey));
  const edges: MergeFlowEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: Edge, status: EdgeStatus) => {
    const key = edgeKey(edge);
    if (seen.has(key) || edge.source === edge.target || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    seen.add(key);
    edges.push({
      id: `${status}-${digest(key)}`,
      source: edge.source,
      target: edge.target,
      type: 'merge-edge',
      label: edge.label,
      data: { status, key, edgeType: typeof edge.data?.edgeType === 'string' ? edge.data.edgeType : undefined, label: typeof edge.label === 'string' ? edge.label : undefined },
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  };
  for (const edge of graphs.merged.edges) add(edge, currentKeys.has(edgeKey(edge)) ? 'kept' : 'added');
  for (const edge of graphs.current.edges) if (!mergedKeys.has(edgeKey(edge))) add(edge, 'removed');
  if (showDeclined) {
    for (const edge of graphs.incoming.edges) if (!mergedKeys.has(edgeKey(edge)) && !currentKeys.has(edgeKey(edge))) add(edge, 'declined');
  }
  return { nodes, edges };
}
