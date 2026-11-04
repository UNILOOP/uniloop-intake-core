import { describe, expect, test } from 'bun:test';
import { applyMergeDecisions, diffSurveys, resolveDecision, type SurveySnapshot } from '../src/merge';
import { buildCompareColumns, compareBounds, layoutCompareColumn, synchronizedViewport } from '../src/merge/view/compare/compareColumns';
import { getLayoutedElements, invalidateLayoutCache } from '../src/builder/flowv3/utils/layout';
import { Position, type Node, type Edge } from '@xyflow/react';
import type { BlockData } from '../src/types';

const radio = (uuid: string, fieldName: string, extra: Partial<BlockData> = {}): BlockData => ({
  type: 'radio',
  uuid,
  fieldName,
  label: `${fieldName}?`,
  options: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ],
  ...extra,
});
const survey = (items: BlockData[]): SurveySnapshot => ({ rootNode: { type: 'section', uuid: 'root', items }, localizations: { en: {} } });
const labels = { current: 'Original', incoming: 'UniEMR v5', base: 'v4' };

describe('buildCompareColumns', () => {
  const base = survey([radio('a', 'smoker'), radio('b', 'drinker'), radio('x', 'extra')]);
  const current = survey([radio('a', 'smoker', { label: 'Smoker (edited)?' }), radio('b', 'drinker'), radio('x', 'extra'), radio('m', 'marketing')]);
  const incoming = survey([radio('a', 'smoker', { label: 'Do you smoke?' }), radio('n', 'new'), radio('b', 'drinker')]);
  const diff = diffSurveys(current, incoming, { base });
  const merged = applyMergeDecisions(diff, {});
  const resolve = (hunk: Parameters<typeof resolveDecision>[0]) => resolveDecision(hunk, {});
  const build = (showResult: boolean, heights = {}) =>
    buildCompareColumns({ diff, merged, resolve, definitions: {}, labels, showResult, heights, selectedKey: null });
  const ids = (column: ReturnType<typeof build>[number]) => column.nodes.map((node) => node.id);

  test('each column contains its own real flow without artificial placeholder rows', () => {
    const [currentColumn, incomingColumn, resultColumn] = build(true);
    expect(ids(currentColumn)).toEqual(['start', 'a', 'b', 'x', 'm', 'submit']);
    expect(ids(incomingColumn)).toEqual(['start', 'a', 'n', 'b', 'submit']);
    expect(ids(resultColumn)).toEqual(['start', 'a', 'n', 'b', 'm', 'submit']);
    expect(build(false).map((column) => column.id)).toEqual(['current', 'incoming']);
  });

  test('each column shows its own wording and the result follows the decision', () => {
    const [currentColumn, incomingColumn, resultColumn] = build(true);
    const title = (column: ReturnType<typeof build>[number], id: string) =>
      (column.nodes.find((node) => node.id === id)!.data as { title: string }).title;
    expect(title(currentColumn, 'a')).toBe('Smoker (edited)?');
    expect(title(incomingColumn, 'a')).toBe('Do you smoke?');
    expect(title(resultColumn, 'a')).toBe('Smoker (edited)?');
    expect(incomingColumn.nodes.some((node) => node.id === 'x')).toBe(false);
  });

  test('paths are marked against the other side and direct drops are straight', () => {
    const [currentColumn, incomingColumn] = build(false);
    const edge = (column: ReturnType<typeof build>[number], source: string, target: string) =>
      column.edges.find((candidate) => candidate.source === source && candidate.target === target)!;
    expect(edge(currentColumn, 'a', 'b').data).toMatchObject({ status: 'removed', direct: true });
    expect(edge(incomingColumn, 'a', 'n').data).toMatchObject({ status: 'added', direct: true });
    expect(edge(incomingColumn, 'n', 'b').data).toMatchObject({ status: 'added', direct: true });
    expect(edge(currentColumn, 'start', 'a').data).toMatchObject({ status: 'kept', direct: true });
  });

  test('uses the flow builder Dagre layout and each column’s measured block sizes', async () => {
    const columns = build(false, { current: { a: 220 }, incoming: { a: 140 } });
    for (const column of columns) {
      const expected = await getLayoutedElements(column.nodes, column.edges, 'TB');
      const actual = await layoutCompareColumn(column);
      expect(actual.nodes.map((node) => node.position)).toEqual(expected.nodes.map((node) => node.position));
      expect(actual.nodes.find((node) => node.id === 'a')!.measured!.height).toBe(column.id === 'current' ? 220 : 140);
      for (const node of actual.nodes) {
        expect(Number.isFinite(node.position.x) && Number.isFinite(node.position.y)).toBe(true);
      }
    }
  });

  test('lays out branches horizontally rather than forcing every block into one column', async () => {
    const branched = survey([
      radio('question', 'question', { navigationRules: [{ condition: 'question == "yes"', target: 'branch' }] }),
      radio('main', 'main', { nextBlockId: 'submit' }),
      radio('branch', 'branch', { nextBlockId: 'submit' }),
    ]);
    const branchDiff = diffSurveys(branched, branched);
    const [column] = buildCompareColumns({
      diff: branchDiff,
      merged: branched,
      resolve,
      definitions: {},
      labels,
      showResult: false,
      heights: {},
      selectedKey: null,
    });
    const layout = await layoutCompareColumn(column);
    const main = layout.nodes.find((node) => node.id === 'main')!;
    const branch = layout.nodes.find((node) => node.id === 'branch')!;
    const rulePath = column.edges.find((edge) => edge.data?.edgeType === 'conditional')!;
    expect(typeof rulePath.label).toBe('string');
    expect(String(rulePath.label).length).toBeGreaterThan(0);
    expect(rulePath.hidden).toBe(false);
    expect(main.position.x).not.toBe(branch.position.x);
    expect(Math.abs(main.position.x - branch.position.x)).toBeGreaterThanOrEqual(300);
    expect(main.position.y).toBeGreaterThan(layout.nodes.find((node) => node.id === 'question')!.position.y);
    const hidden = buildCompareColumns({
      diff: branchDiff,
      merged: branched,
      resolve,
      definitions: {},
      labels,
      showResult: false,
      showUnchangedPaths: false,
      heights: {},
      selectedKey: null,
    })[0];
    const hiddenLayout = await layoutCompareColumn(hidden);
    expect(hiddenLayout.nodes.map((node) => node.position)).toEqual(layout.nodes.map((node) => node.position));
    expect(hidden.edges.find((edge) => edge.target === 'branch')!.hidden).toBe(true);
  });
});

describe('shared Dagre layout cache', () => {
  const nodes: Node[] = [
    { id: 'a', position: { x: 0, y: 0 }, data: { title: 'Original' }, measured: { width: 300, height: 100 } },
    { id: 'b', position: { x: 0, y: 0 }, data: { title: 'Original second' }, measured: { width: 300, height: 100 } },
  ];
  const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b', data: { weight: 2, status: 'removed' } }];

  test('reuses geometry while retaining each version’s live wording, selection and edge status', async () => {
    invalidateLayoutCache();
    const original = await getLayoutedElements(nodes, edges);
    const incoming = await getLayoutedElements(
      nodes.map((node) => ({ ...node, selected: true, data: { title: 'Provider' } })),
      edges.map((edge) => ({ ...edge, data: { weight: 2, status: 'added' } }))
    );
    expect(incoming.nodes[0].data.title).toBe('Provider');
    expect(incoming.nodes[0].selected).toBe(true);
    expect(incoming.edges[0].data!.status).toBe('added');
    expect(incoming.nodes[0].position).toEqual(original.nodes[0].position);
  });

  test('does not reuse a top-to-bottom layout for a horizontal flow', async () => {
    invalidateLayoutCache();
    await getLayoutedElements(nodes, edges, 'TB');
    const horizontal = await getLayoutedElements(nodes, edges, 'LR');
    expect(horizontal.nodes[0].sourcePosition).toBe(Position.Right);
    expect(horizontal.nodes[0].targetPosition).toBe(Position.Left);
  });
});

describe('synchronized comparison navigation', () => {
  test('moves the other canvas by the same screen-space distance in either direction', () => {
    const left = { x: -200, y: 32, zoom: 0.85 };
    const right = { x: -700, y: 32, zoom: 0.85 };
    const movedRight = { ...right, x: right.x - 120, y: right.y + 240 };
    expect(synchronizedViewport(left, right, movedRight)).toEqual({ ...left, x: left.x - 120, y: left.y + 240 });
    expect(synchronizedViewport(right, left, { ...left, x: left.x + 80, y: left.y - 100 })).toEqual({ ...right, x: right.x + 80, y: right.y - 100 });
  });

  test('keeps zoom linked without losing the relative offset between different layouts', () => {
    const left = { x: -200, y: 32, zoom: 0.5 };
    const right = { x: -700, y: 32, zoom: 0.5 };
    const movedRight = { x: -1500, y: -50, zoom: 1 };
    const movedLeft = synchronizedViewport(left, right, movedRight);
    expect(movedLeft.zoom).toBe(1);
    expect(movedRight.x - movedLeft.x).toBe((right.x - left.x) * 2);
    expect(movedLeft.y).toBe(movedRight.y);
  });
});

test('common fit bounds contain every column’s nodes and measured dimensions', async () => {
  const current = survey([radio('a', 'a')]);
  const incoming = survey([radio('a', 'a'), radio('b', 'b')]);
  const diff = diffSurveys(current, incoming);
  const columns = await Promise.all(
    buildCompareColumns({
      diff,
      merged: current,
      resolve: (h) => resolveDecision(h),
      definitions: {},
      labels,
      showResult: true,
      heights: { incoming: { b: 320 } },
      selectedKey: null,
    }).map(layoutCompareColumn)
  );
  const bounds = compareBounds(columns);
  for (const node of columns.flatMap((column) => column.nodes)) {
    expect(node.position.x).toBeGreaterThanOrEqual(bounds.x);
    expect(node.position.y).toBeGreaterThanOrEqual(bounds.y);
    expect(node.position.x + node.measured!.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(node.position.y + node.measured!.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
});
