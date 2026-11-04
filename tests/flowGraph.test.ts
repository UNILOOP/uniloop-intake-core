import { describe, expect, test } from 'bun:test';
import { buildFlowGraph } from '../src/builder/flowv3/utils/flowGraph';
import type { BlockData } from '../src/types';

const radio = (uuid: string, fieldName: string, extra: Partial<BlockData> = {}): BlockData => ({
  type: 'radio',
  uuid,
  fieldName,
  options: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ],
  ...extra,
});

describe('buildFlowGraph', () => {
  test('draws start, one node per block, submit, rule edges and sequential fallbacks', () => {
    const blocks = [
      radio('a', 'smoker', { navigationRules: [{ condition: "smoker == 'yes'", target: 'c' }] }),
      radio('b', 'drinker', { isEndBlock: true }),
      radio('c', 'vaper'),
    ];
    const graph = buildFlowGraph(blocks);
    expect(graph.nodes.map((node) => node.id)).toEqual(['start', 'a', 'b', 'c', 'submit']);
    expect(graph.nodes[1]).toMatchObject({ type: 'survey-node', data: { block: blocks[0], index: 0 } });
    expect(graph.edges.map((edge) => [edge.id, edge.source, edge.target, edge.data?.edgeType])).toEqual([
      ['start-to-first', 'start', 'a', 'start'],
      ['a-nav-0', 'a', 'c', 'conditional'],
      ['a-seq-b', 'a', 'b', 'sequential'],
      ['b-seq-submit', 'b', 'submit', 'sequential'],
      ['c-seq-submit', 'c', 'submit', 'sequential'],
    ]);
    expect(String(graph.edges[1].label).toLowerCase()).toContain('yes');
    expect(graph.edges[1].data).toMatchObject({ ruleIndex: 0, sourceBlockId: 'a', targetBlockId: 'c', totalParallelEdges: 2 });
  });

  test('resolves targets by field name and skips the fallback when a default rule exists', () => {
    const blocks = [
      radio('a', 'smoker', { navigationRules: [{ condition: '', target: 'vaper', isDefault: true }] }),
      radio('b', 'drinker'),
      radio('c', 'vaper'),
    ];
    const graph = buildFlowGraph(blocks);
    const fromA = graph.edges.filter((edge) => edge.source === 'a');
    expect(fromA).toHaveLength(1);
    expect(fromA[0]).toMatchObject({ target: 'c', label: 'Default', data: { edgeType: 'default' } });
  });

  test('an empty form links start straight to submit', () => {
    const graph = buildFlowGraph([]);
    expect(graph.edges.map((edge) => edge.id)).toEqual(['start-to-submit']);
  });
});
