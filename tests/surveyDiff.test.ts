import { describe, expect, test } from 'bun:test';
import {
  applyMergeDecisions,
  bulkDecisions,
  cascadeDecision,
  describeSummary,
  diffSurveys,
  diffWords,
  resolveDecision,
  unresolvedConflicts,
  validateMergedSurvey,
} from '../src/merge';
import type { SurveySnapshot } from '../src/merge';
import type { BlockData, BlockDefinition, ThemeDefinition } from '../src/types';

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
const page = (uuid: string, name: string, items: BlockData[]): BlockData => ({ type: 'set', uuid, name, items });
const survey = (items: BlockData[], extra: Partial<SurveySnapshot> = {}): SurveySnapshot => ({
  rootNode: { type: 'section', uuid: 'root', items },
  localizations: { en: {} },
  ...extra,
});
const items = (merged: SurveySnapshot): BlockData[] => merged.rootNode.items ?? [];
const keys = (merged: SurveySnapshot): string[] => items(merged).map((block) => block.uuid as string);
const hunk = (diff: ReturnType<typeof diffSurveys>, id: string) => diff.hunks.find((candidate) => candidate.id === id);

describe('diffSurveys', () => {
  test('identical surveys have no hunks', () => {
    const base = survey([radio('a', 'smoker'), radio('b', 'drinker')]);
    const diff = diffSurveys(base, structuredClone(base), { base: structuredClone(base) });
    expect(diff.mode).toBe('three-way');
    expect(diff.hunks).toHaveLength(0);
    expect(diff.summary.unchanged).toBe(2);
    expect(describeSummary(diff.summary)).toBe('No changes');
  });

  test('a text change made upstream is taken by default', () => {
    const base = survey([radio('a', 'smoker')]);
    const incoming = survey([radio('a', 'smoker', { label: 'Do you smoke?' })]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    const change = hunk(diff, 'a:key:label');
    expect(change).toMatchObject({ category: 'text', origin: 'incoming', defaultDecision: 'incoming', conflict: false });
    expect(diff.blocks[0].status).toBe('changed');
    expect(items(applyMergeDecisions(diff))[0].label).toBe('Do you smoke?');
  });

  test('a field both sides changed is a conflict that keeps the current side until decided', () => {
    const base = survey([radio('a', 'smoker', { label: 'smoker?' })]);
    const current = survey([radio('a', 'smoker', { label: 'Smoker?' })]);
    const incoming = survey([radio('a', 'smoker', { label: 'Do you smoke?' })]);
    const diff = diffSurveys(current, incoming, { base });
    expect(hunk(diff, 'a:key:label')).toMatchObject({ origin: 'both', conflict: true, defaultDecision: 'current' });
    expect(unresolvedConflicts(diff)).toHaveLength(1);
    expect(items(applyMergeDecisions(diff))[0].label).toBe('Smoker?');
    expect(items(applyMergeDecisions(diff, { 'a:key:label': 'incoming' }))[0].label).toBe('Do you smoke?');
    expect(unresolvedConflicts(diff, { 'a:key:label': 'incoming' })).toHaveLength(0);
  });

  test('a merchant-only edit stays when the incoming side still matches the base', () => {
    const base = survey([radio('a', 'smoker')]);
    const current = survey([radio('a', 'smoker', { label: 'Smoker?', description: 'Be honest' })]);
    const diff = diffSurveys(current, structuredClone(base), { base });
    expect(hunk(diff, 'a:key:label')).toMatchObject({ origin: 'current', defaultDecision: 'current' });
    expect(hunk(diff, 'a:key:description')).toMatchObject({ origin: 'current', defaultDecision: 'current' });
    const merged = applyMergeDecisions(diff);
    expect(items(merged)[0]).toMatchObject({ label: 'Smoker?', description: 'Be honest' });
  });

  test('a block added upstream lands after its incoming neighbour', () => {
    const base = survey([radio('a', 'smoker'), radio('b', 'drinker')]);
    const incoming = survey([radio('a', 'smoker'), radio('c', 'vaper'), radio('b', 'drinker')]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    const added = diff.blocks.find((entry) => entry.key === 'c');
    expect(added).toMatchObject({ status: 'added', origin: 'incoming' });
    expect(hunk(diff, 'c:add')).toMatchObject({ kind: 'block-added', defaultDecision: 'incoming' });
    expect(diff.blocks.map((entry) => entry.key)).toEqual(['a', 'c', 'b']);
    expect(keys(applyMergeDecisions(diff))).toEqual(['a', 'c', 'b']);
    expect(keys(applyMergeDecisions(diff, { 'c:add': 'current' }))).toEqual(['a', 'b']);
  });

  test('a block the merchant added is kept', () => {
    const base = survey([radio('a', 'smoker'), radio('b', 'drinker')]);
    const current = survey([radio('a', 'smoker'), radio('b', 'drinker'), radio('m', 'marketing')]);
    const diff = diffSurveys(current, structuredClone(base), { base });
    expect(diff.blocks.find((entry) => entry.key === 'm')).toMatchObject({ status: 'removed', origin: 'current' });
    expect(hunk(diff, 'm:remove')).toMatchObject({ label: 'Block you added', defaultDecision: 'current' });
    expect(keys(applyMergeDecisions(diff))).toEqual(['a', 'b', 'm']);
  });

  test('a block removed upstream goes unless kept, and is a conflict when edited since the base', () => {
    const base = survey([radio('a', 'smoker'), radio('x', 'extra')]);
    const incoming = survey([radio('a', 'smoker')]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(hunk(diff, 'x:remove')).toMatchObject({ origin: 'incoming', defaultDecision: 'incoming', conflict: false });
    expect(keys(applyMergeDecisions(diff))).toEqual(['a']);
    expect(keys(applyMergeDecisions(diff, { 'x:remove': 'current' }))).toEqual(['a', 'x']);

    const edited = survey([radio('a', 'smoker'), radio('x', 'extra', { label: 'Edited by merchant' })]);
    const conflict = diffSurveys(edited, structuredClone(incoming), { base });
    expect(hunk(conflict, 'x:remove')).toMatchObject({ origin: 'both', conflict: true, defaultDecision: 'current' });
    expect(keys(applyMergeDecisions(conflict))).toEqual(['a', 'x']);
  });

  test('without a base every change is unknown and the current side stays unless taken in bulk', () => {
    const current = survey([radio('a', 'smoker', { label: 'Current label' })]);
    const incoming = survey([radio('a', 'smoker', { label: 'Incoming label' }), radio('n', 'new')]);
    const diff = diffSurveys(current, incoming);
    expect(diff.mode).toBe('two-way');
    expect(hunk(diff, 'a:key:label')).toMatchObject({ origin: 'unknown', defaultDecision: 'current' });
    expect(hunk(diff, 'n:add')).toMatchObject({ origin: 'unknown', defaultDecision: 'current' });
    expect(keys(applyMergeDecisions(diff))).toEqual(['a']);
    const merged = applyMergeDecisions(diff, bulkDecisions(diff, 'incoming'));
    expect(keys(merged)).toEqual(['a', 'n']);
    expect(items(merged)[0].label).toBe('Incoming label');
  });

  test('a provider-locked block follows the incoming side whatever is decided', () => {
    const current = survey([radio('a', 'smoker', { label: 'Mine' })]);
    const incoming = survey([radio('a', 'smoker_v2', { label: 'Theirs', locked: true })]);
    const diff = diffSurveys(current, incoming);
    const label = hunk(diff, 'a:key:label')!;
    expect(label.locked).toBe(true);
    expect(hunk(diff, 'a:key:fieldName')!.locked).toBe(true);
    expect(resolveDecision(label, { 'a:key:label': 'current' })).toBe('incoming');
    expect(diff.summary.locked).toBe(3);
    const merged = applyMergeDecisions(diff, { 'a:key:label': 'current' });
    expect(items(merged)[0]).toMatchObject({ label: 'Theirs', fieldName: 'smoker_v2', locked: true });
  });

  test('a lock only fixes the paths the block definition locks', () => {
    const definitions: Record<string, BlockDefinition> = {
      radio: {
        type: 'radio',
        name: 'Radio',
        description: '',
        defaultData: { type: 'radio' },
        lockAccess: { locked: ['options'] },
      } as BlockDefinition,
    };
    const current = survey([radio('a', 'smoker', { label: 'Mine', locked: true })]);
    const incoming = survey([
      radio('a', 'smoker', {
        label: 'Theirs',
        locked: true,
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Sometimes', value: 'sometimes' },
        ],
      }),
    ]);
    const diff = diffSurveys(current, incoming, { definitions });
    expect(hunk(diff, 'a:key:label')!.locked).toBe(false);
    expect(hunk(diff, 'a:options')).toMatchObject({ locked: true, category: 'options' });
    expect(hunk(diff, 'a:options')!.detail).toContain('Added: Sometimes');
    const merged = applyMergeDecisions(diff);
    expect(items(merged)[0].label).toBe('Mine');
    expect(items(merged)[0].options).toHaveLength(3);
  });

  test('navigation rules are diffed one by one and compose mixed decisions', () => {
    const rule = (condition: string, target: string) => ({ condition, target });
    const base = survey([radio('a', 'smoker', { navigationRules: [rule("smoker == 'yes'", 'b')] }), radio('b', 'packs'), radio('c', 'drinker')]);
    const incoming = survey([
      radio('a', 'smoker', { navigationRules: [rule("smoker == 'yes'", 'c'), rule("smoker == 'no'", 'b')] }),
      radio('b', 'packs'),
      radio('c', 'drinker'),
    ]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    const changed = hunk(diff, "a:nav:smoker == 'yes'")!;
    const added = hunk(diff, "a:nav:smoker == 'no'")!;
    expect(changed).toMatchObject({ category: 'navigation', label: 'Path changed', origin: 'incoming' });
    expect(added).toMatchObject({ label: 'New path', origin: 'incoming' });
    expect(added.detail).toContain('packs?');
    const merged = applyMergeDecisions(diff, { [changed.id]: 'current' });
    expect(items(merged)[0].navigationRules).toEqual([rule("smoker == 'yes'", 'b'), rule("smoker == 'no'", 'b')]);
    expect(items(applyMergeDecisions(diff))[0].navigationRules).toEqual(incoming.rootNode.items![0].navigationRules);
  });

  test('a block whose uuid changed is matched by field name and keeps its current uuid', () => {
    const current = survey([radio('a1', 'smoker')]);
    const incoming = survey([radio('a2', 'smoker', { label: 'New wording' })]);
    const diff = diffSurveys(current, incoming);
    expect(diff.blocks).toHaveLength(1);
    expect(diff.blocks[0]).toMatchObject({ key: 'a1', matchedBy: 'fieldName', status: 'changed' });
    const merged = applyMergeDecisions(diff, { 'a1:key:label': 'incoming' });
    expect(items(merged)[0]).toMatchObject({ uuid: 'a1', label: 'New wording' });
  });

  test('a page added upstream brings its blocks, and declining it declines them', () => {
    const base = survey([page('p1', 'Intro', [radio('a', 'smoker')])]);
    const incoming = survey([page('p1', 'Intro', [radio('a', 'smoker')]), page('p2', 'Lifestyle', [radio('b', 'drinker'), radio('c', 'vaper')])]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(diff.blocks.map((entry) => `${entry.key}:${entry.status}`)).toEqual(['p1:unchanged', 'a:unchanged', 'p2:added', 'b:added', 'c:added']);
    expect(diff.blocks.find((entry) => entry.key === 'p2')!.childKeys).toEqual(['b', 'c']);
    const merged = applyMergeDecisions(diff);
    expect(items(merged).map((block) => block.uuid)).toEqual(['p1', 'p2']);
    expect(items(merged)[1].items!.map((block) => block.uuid)).toEqual(['b', 'c']);
    const declined = cascadeDecision(diff, 'p2:add', 'current');
    expect(declined).toEqual({ 'p2:add': 'current', 'b:add': 'current', 'c:add': 'current' });
    expect(items(applyMergeDecisions(diff, declined)).map((block) => block.uuid)).toEqual(['p1']);
    expect(items(applyMergeDecisions(diff, { 'b:add': 'current' }))[1].items!.map((block) => block.uuid)).toEqual(['c']);
    expect(cascadeDecision(diff, 'b:add', 'incoming')).toEqual({ 'b:add': 'incoming', 'p2:add': 'incoming' });
  });

  test('a reorder upstream is one hunk for the container', () => {
    const base = survey([radio('a', 'smoker'), radio('b', 'drinker'), radio('c', 'vaper')]);
    const incoming = survey([radio('c', 'vaper'), radio('a', 'smoker'), radio('b', 'drinker')]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(hunk(diff, '__root__:order')).toMatchObject({ kind: 'order', origin: 'incoming', defaultDecision: 'incoming' });
    expect(keys(applyMergeDecisions(diff))).toEqual(['c', 'a', 'b']);
    expect(keys(applyMergeDecisions(diff, { '__root__:order': 'current' }))).toEqual(['a', 'b', 'c']);
  });

  test('a block moved to another page gets a placement hunk', () => {
    const base = survey([page('p1', 'Intro', [radio('a', 'smoker'), radio('b', 'drinker')]), page('p2', 'More', [radio('c', 'vaper')])]);
    const incoming = survey([page('p1', 'Intro', [radio('a', 'smoker')]), page('p2', 'More', [radio('b', 'drinker'), radio('c', 'vaper')])]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(diff.blocks.find((entry) => entry.key === 'b')!.status).toBe('moved');
    expect(hunk(diff, 'b:placement')).toMatchObject({ category: 'placement', origin: 'incoming', defaultDecision: 'incoming' });
    const merged = applyMergeDecisions(diff);
    expect(items(merged)[0].items!.map((block) => block.uuid)).toEqual(['a']);
    expect(items(merged)[1].items!.map((block) => block.uuid)).toEqual(['b', 'c']);
    const kept = applyMergeDecisions(diff, { 'b:placement': 'current' });
    expect(items(kept)[0].items!.map((block) => block.uuid)).toEqual(['a', 'b']);
  });

  test('translations merge per language and the theme can be pinned to the current side', () => {
    const theme = (name: string) => ({ name }) as unknown as ThemeDefinition;
    const base = survey([radio('a', 'smoker')], { localizations: { en: { hello: 'Hi' } }, theme: theme('uniloop') });
    const incoming = survey([radio('a', 'smoker')], { localizations: { en: { hello: 'Hello', bye: 'Bye' } }, theme: theme('default') });
    const pinned = diffSurveys(structuredClone(base), incoming, { base, themeDefault: 'current' });
    expect(pinned.hunks.map((candidate) => candidate.id).sort()).toEqual(['localization:en', 'theme']);
    expect(pinned.hunks.find((candidate) => candidate.id === 'localization:en')?.detail).toContain('1 added, 1 changed');
    const merged = applyMergeDecisions(pinned);
    expect(merged.localizations).toEqual({ en: { hello: 'Hello', bye: 'Bye' } });
    expect(merged.theme).toEqual(theme('uniloop'));
    const auto = diffSurveys(structuredClone(base), incoming, { base });
    expect(applyMergeDecisions(auto).theme).toEqual(theme('default'));
  });

  test('form-level fields and other top-level keys are diffed too', () => {
    const current = { ...survey([radio('a', 'smoker')]), mode: 'pageless' } as SurveySnapshot;
    current.rootNode.name = 'Intake';
    const incoming = { ...survey([radio('a', 'smoker')]), mode: 'paged' } as SurveySnapshot;
    incoming.rootNode.name = 'Intake v2';
    const diff = diffSurveys(current, incoming);
    expect(hunk(diff, 'survey:name')).toMatchObject({ category: 'text' });
    expect(hunk(diff, 'survey:$.mode')).toMatchObject({ category: 'survey' });
    const merged = applyMergeDecisions(diff, bulkDecisions(diff, 'incoming'));
    expect(merged.rootNode.name).toBe('Intake v2');
    expect(merged.mode).toBe('paged');
    expect(applyMergeDecisions(diff).mode).toBe('pageless');
  });
});

describe('validateMergedSurvey', () => {
  test('reports duplicate field names, dangling paths and missing locked blocks', () => {
    const merged = survey([
      radio('a', 'smoker', { navigationRules: [{ condition: "smoker == 'yes'", target: 'zzz' }] }),
      radio('b', 'smoker', { validationRules: [{ operator: 'required', message: 'Required', field: 'ghost' }] }),
    ]);
    const incoming = survey([radio('a', 'smoker'), radio('L', 'locked_one', { locked: true })]);
    const issues = validateMergedSurvey(merged, { incoming });
    expect(issues.map((issue) => issue.code).sort()).toEqual(['dangling-target', 'dangling-validation', 'duplicate-field', 'locked-missing']);
    expect(
      issues
        .filter((issue) => issue.level === 'error')
        .map((issue) => issue.code)
        .sort()
    ).toEqual(['duplicate-field', 'locked-missing']);
  });

  test('a clean merge has no issues', () => {
    const merged = survey([radio('a', 'smoker', { navigationRules: [{ condition: "smoker == 'yes'", target: 'b' }] }), radio('b', 'drinker')]);
    expect(validateMergedSurvey(merged, { incoming: merged })).toEqual([]);
  });
});

describe('describeSummary and diffWords', () => {
  test('summarises counts in one line', () => {
    const base = survey([radio('a', 'smoker'), radio('x', 'extra')]);
    const incoming = survey([radio('a', 'smoker', { label: 'Changed' }), radio('n', 'new')]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(describeSummary(diff.summary)).toBe('1 block changed, 1 added, 1 removed');
  });

  test('diffs words', () => {
    expect(diffWords('a b c', 'a x c')).toEqual([
      { type: 'equal', text: 'a ' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'x' },
      { type: 'equal', text: ' c' },
    ]);
  });
});

describe('section merging', () => {
  const section = (uuid: string, name: string, items: BlockData[], nodes: SurveySnapshot['rootNode']['nodes'] = []) => ({
    type: 'section',
    uuid,
    name,
    items,
    nodes,
  });
  const withSections = (nodes: SurveySnapshot['rootNode']['nodes']): SurveySnapshot => survey([], { rootNode: section('root', 'Form', [], nodes) });
  const takeAll = (current: SurveySnapshot, incoming: SurveySnapshot, base = current) => {
    const diff = diffSurveys(current, incoming, { base });
    return applyMergeDecisions(diff, bulkDecisions(diff, 'incoming'));
  };

  test('merges section settings while preserving locally edited questions', () => {
    const base = withSections([section('history', 'History', [radio('a', 'smoker')])]);
    const current = structuredClone(base);
    (current.rootNode.nodes![0] as any).items[0].label = 'Your smoking history?';
    const incoming = structuredClone(base);
    Object.assign(incoming.rootNode.nodes![0], { name: 'Medical history', navigationRules: [{ id: 'go', condition: 'true', target: 'end' }] });
    const diff = diffSurveys(current, incoming, { base });
    const merged = applyMergeDecisions(diff);
    expect((merged.rootNode.nodes![0] as any).name).toBe('Medical history');
    expect((merged.rootNode.nodes![0] as any).navigationRules).toEqual((incoming.rootNode.nodes![0] as any).navigationRules);
    expect((merged.rootNode.nodes![0] as any).items[0].label).toBe('Your smoking history?');
    expect(diff.hunks.some((h) => h.kind === 'section-field')).toBe(true);
  });

  test('adds nested sections without flattening their questions into the root', () => {
    const current = withSections([section('a', 'Existing', [radio('q1', 'first')])]);
    const incoming = withSections([
      section('a', 'Existing', [radio('q1', 'first')]),
      section('b', 'New', [radio('q2', 'second')], [section('c', 'Nested', [radio('q3', 'third')])]),
    ]);
    const merged = takeAll(current, incoming);
    expect(merged).toEqual(incoming);
    const diff = diffSurveys(current, incoming, { base: current });
    const declined = applyMergeDecisions(diff, cascadeDecision(diff, 'section:b:add', 'current'));
    expect(declined).toEqual(current);
    const restored = applyMergeDecisions(diff, { ...bulkDecisions(diff, 'current'), ...cascadeDecision(diff, 'q3:add', 'incoming') });
    expect((restored.rootNode.nodes![1] as any).nodes[0].items[0].uuid).toBe('q3');
    expect(restored.rootNode.items).toEqual([]);
  });

  test('removes sections or preserves their questions when kept', () => {
    const current = withSections([section('a', 'Existing', [radio('q1', 'first')]), section('b', 'Removed', [radio('q2', 'second')])]);
    const incoming = withSections([section('a', 'Existing', [radio('q1', 'first')])]);
    expect(takeAll(current, incoming)).toEqual(incoming);
    const diff = diffSurveys(current, incoming, { base: current });
    const kept = applyMergeDecisions(diff, cascadeDecision(diff, 'section:b:remove', 'current'));
    expect(kept).toEqual(current);
    const keptChild = applyMergeDecisions(diff, cascadeDecision(diff, 'q2:remove', 'current'));
    expect(keptChild).toEqual(current);
  });

  test('matches reordered sections by UUID and preserves their own local questions', () => {
    const base = withSections([section('a', 'First', [radio('q1', 'first')]), section('b', 'Second', [radio('q2', 'second')])]);
    const current = structuredClone(base);
    (current.rootNode.nodes![0] as any).items[0].label = 'Brand wording';
    const incoming = withSections([section('b', 'Second updated', [radio('q2', 'second')]), section('a', 'First', [radio('q1', 'first')])]);
    const merged = applyMergeDecisions(diffSurveys(current, incoming, { base }));
    expect((merged.rootNode.nodes![0] as any).uuid).toBe('b');
    expect((merged.rootNode.nodes![0] as any).name).toBe('Second updated');
    expect((merged.rootNode.nodes![1] as any).items[0].label).toBe('Brand wording');
  });

  test('preserves nested sections when moving them to a different parent', () => {
    const child = section('child', 'Child', [radio('q1', 'first')]);
    const current = withSections([section('a', 'First', [], [child]), section('b', 'Second', [])]);
    const incoming = withSections([section('a', 'First', []), section('b', 'Second', [], [child])]);
    expect(takeAll(current, incoming)).toEqual(incoming);
  });

  test('object key order never produces differences at any level', () => {
    const original = withSections([section('a', 'First', [radio('q1', 'first')])]);
    const reverseKeys = (value: any): any =>
      Array.isArray(value)
        ? value.map(reverseKeys)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .reverse()
                .map(([key, item]) => [key, reverseKeys(item)])
            )
          : value;
    const shuffled = reverseKeys(original);
    expect(diffSurveys(original, shuffled, { base: original }).hunks).toEqual([]);
    expect(applyMergeDecisions(diffSurveys(original, shuffled))).toEqual(original);
  });
});

test('anonymous sections match by name across reorders without losing duplicate-named siblings', () => {
  const first = { type: 'section', name: 'Repeated', items: [radio('first', 'first')] };
  const second = { type: 'section', name: 'Repeated', items: [radio('second', 'second')] };
  const current: SurveySnapshot = { rootNode: { type: 'section', uuid: 'root', items: [], nodes: [first, second] } };
  const incoming = structuredClone(current);
  incoming.rootNode.nodes!.reverse();
  const diff = diffSurveys(current, incoming, { base: current });
  expect(diff.hunks.filter((hunk) => hunk.kind === 'placement')).toEqual([]);
  expect(applyMergeDecisions(diff, bulkDecisions(diff, 'incoming'))).toEqual(incoming);
});

test('declining a new section preserves existing block placement and suppresses nested added questions', () => {
  const current: SurveySnapshot = {
    rootNode: {
      type: 'section',
      uuid: 'root',
      items: [],
      nodes: [{ type: 'section', uuid: 'existing', name: 'Existing', items: [radio('a', 'smoker')] }],
    },
  };
  const incoming: SurveySnapshot = {
    rootNode: {
      type: 'section',
      uuid: 'root',
      items: [],
      nodes: [
        { type: 'section', uuid: 'existing', name: 'Existing', items: [] },
        { type: 'section', uuid: 'new', name: 'New', items: [radio('a', 'smoker'), page('new-page', 'New page', [radio('b', 'other')])] },
      ],
    },
  };
  const diff = diffSurveys(current, incoming, { base: current });
  expect(applyMergeDecisions(diff, { 'section:new:add': 'current' })).toEqual(current);
});

describe('pages with show/hide rules', () => {
  const showIfSmoker = { initial: 'hidden' as const, conditions: ['smoker == "yes"'] };

  test('a show/hide rule set upstream on a page block is a visibility change that is taken', () => {
    const base = survey([radio('a', 'smoker'), page('p1', 'Habits', [radio('b', 'packs'), radio('c', 'years')])]);
    const incoming = survey([
      radio('a', 'smoker'),
      page('p1', 'Habits', [radio('b', 'packs', { visibility: showIfSmoker }), radio('c', 'years')]),
    ]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(hunk(diff, 'b:key:visibility')).toMatchObject({ category: 'visibility', origin: 'incoming', defaultDecision: 'incoming' });
    const merged = applyMergeDecisions(diff);
    expect(items(merged)[1].items?.[0].visibility).toEqual(showIfSmoker);
    expect(validateMergedSurvey(merged, { incoming })).toEqual([]);
  });

  test('a block moved from the root into a page keeps its show/hide rule', () => {
    const base = survey([radio('a', 'smoker'), radio('b', 'packs', { visibility: showIfSmoker }), page('p1', 'Habits', [radio('c', 'years')])]);
    const incoming = survey([radio('a', 'smoker'), page('p1', 'Habits', [radio('b', 'packs', { visibility: showIfSmoker }), radio('c', 'years')])]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    expect(hunk(diff, 'b:placement')).toMatchObject({ category: 'placement', defaultDecision: 'incoming' });
    const merged = applyMergeDecisions(diff);
    expect(keys(merged)).toEqual(['a', 'p1']);
    expect(items(merged)[1].items?.map((block) => [block.uuid, block.visibility])).toEqual([
      ['b', showIfSmoker],
      ['c', undefined],
    ]);
  });
});

describe('page settings from the builder', () => {
  test("a page's layout and its \"and\" navigation rule set upstream are page changes that are taken", () => {
    const rule = { condition: 'smoker == "yes" && packs > 1', target: 'd' };
    const base = survey([radio('a', 'smoker'), page('p1', 'Habits', [radio('b', 'packs')]), radio('d', 'advice')]);
    const incoming = survey([
      radio('a', 'smoker'),
      { ...page('p1', 'Habits', [radio('b', 'packs')]), pageLayout: 'twoColumns', navigationRules: [rule] },
      radio('d', 'advice'),
    ]);
    const diff = diffSurveys(structuredClone(base), incoming, { base });
    const pageHunks = diff.hunks.filter((candidate) => candidate.blockKey === 'p1');
    expect(pageHunks.map((candidate) => [candidate.kind, candidate.category, candidate.defaultDecision])).toEqual(
      expect.arrayContaining([
        ['page-field', 'settings', 'incoming'],
        ['page-field', 'navigation', 'incoming'],
      ])
    );
    const merged = items(applyMergeDecisions(diff))[1];
    expect(merged.pageLayout).toBe('twoColumns');
    expect(merged.navigationRules).toEqual([rule]);
    expect(merged.items?.map((block) => block.uuid)).toEqual(['b']);
  });
});
