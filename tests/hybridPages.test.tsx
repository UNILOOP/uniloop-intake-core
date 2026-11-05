import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import { CurrentBlock } from '../src/renderer/layouts/helpers/CurrentBlock';
import { detectSurveyMode, getSurveyPageIds, getSurveyPages } from '../src/utils/surveyUtils';
import { evaluateRuleCondition, isBlockVisible } from '../src/utils/conditionalUtils';
import { joinConditions, splitConditions } from '../src/utils/conditionGroups';
import type { BlockData } from '../src/types';

const required = [{ operator: 'isNotEmpty', message: 'Required' }];

// A single block, a page of three, then a single block
const page: BlockData = {
  type: 'set',
  uuid: 'p-health',
  name: 'Health',
  items: [
    { type: 'textfield', uuid: 'b-sex', fieldName: 'sex' },
    {
      type: 'textfield',
      uuid: 'b-pregnant',
      fieldName: 'pregnant',
      validationRules: required,
      visibility: { initial: 'hidden', conditions: ['sex == "female"'] },
    },
    { type: 'textfield', uuid: 'b-smoker', fieldName: 'smoker' },
  ],
};
const items: BlockData[] = [
  { type: 'textfield', uuid: 'b-name', fieldName: 'name' },
  page,
  { type: 'textfield', uuid: 'b-notes', fieldName: 'notes' },
];
const survey = (rootItems: BlockData[] = items) => ({
  rootNode: { type: 'section', uuid: 'root', items: rootItems },
  mode: 'pageless' as const,
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
});

function mount(
  data: ReturnType<typeof survey>,
  props: { onSubmit?: (values: Record<string, any>) => void; initialValues?: Record<string, any>; flattenPages?: boolean } = {},
  children?: React.ReactNode
) {
  const probe: { current: ReturnType<typeof useSurveyForm> | null } = { current: null };
  const Probe = () => {
    probe.current = useSurveyForm();
    return null;
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <SurveyFormProvider surveyData={data as any} {...props}>
        <Probe />
        {children}
      </SurveyFormProvider>
    )
  );
  return probe;
}

describe('steps', () => {
  test('a root set is one page step next to single blocks', () => {
    const { rootNode } = survey();
    expect(detectSurveyMode(rootNode)).toBe('pageless');
    expect(detectSurveyMode({ type: 'section', items: [page] })).toBe('paged');

    const pages = getSurveyPages(rootNode, 'pageless', { groupPages: true });
    expect(pages.map(step => step.map(block => block.uuid))).toEqual([
      ['b-name'],
      ['b-sex', 'b-pregnant', 'b-smoker'],
      ['b-notes'],
    ]);
    expect(getSurveyPageIds(rootNode, 'pageless', { groupPages: true })).toEqual(['b-name', 'p-health', 'b-notes']);
    // Without grouping (chat, voice, answer views) a page is still one step per block
    expect(getSurveyPages(rootNode, 'pageless')).toHaveLength(5);
  });

  test('chat and voice layouts ask a page one block at a time', () => {
    const form = mount(survey(), { flattenPages: true });
    expect(form.current!.totalPages).toBe(5);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    expect(form.current!.isPageStep).toBe(false);
  });
});

describe('conditions', () => {
  test('joined conditions all have to match, and a single condition stays whole', () => {
    const joined = joinConditions(['q1 == "a"', 'q2 >= 1 && q2 <= 5']);
    expect(joined).toBe('(q1 == "a") && (q2 >= 1 && q2 <= 5)');
    expect(splitConditions(joined)).toEqual(['q1 == "a"', 'q2 >= 1 && q2 <= 5']);
    expect(splitConditions('q2 >= 1 && q2 <= 5')).toEqual(['q2 >= 1 && q2 <= 5']);
    expect(splitConditions('(() => { const d = new Date(x); return true; })()')).toHaveLength(1);
    expect(splitConditions('(a == ")") && (b == "(")')).toEqual(['a == ")"', 'b == "("']);

    expect(evaluateRuleCondition(joined, { q1: 'a', q2: 3 })).toBe(true);
    expect(evaluateRuleCondition(joined, { q1: 'a', q2: 9 })).toBe(false);
    expect(evaluateRuleCondition(joined, { q1: 'b', q2: 3 })).toBe(false);
  });

  test('hidden until and visible unless', () => {
    const hiddenUntil = { visibility: { initial: 'hidden' as const, conditions: ['sex == "female"'] } };
    expect(isBlockVisible(hiddenUntil, {})).toBe(false);
    expect(isBlockVisible(hiddenUntil, { sex: 'female' })).toBe(true);

    const visibleUnless = { visibility: { initial: 'visible' as const, conditions: ['a == "x"', 'b == "y"'], match: 'any' as const } };
    expect(isBlockVisible(visibleUnless, {})).toBe(true);
    expect(isBlockVisible(visibleUnless, { b: 'y' })).toBe(false);

    // No conditions: the setting does nothing
    expect(isBlockVisible({ visibility: { initial: 'hidden', conditions: [] } }, {})).toBe(true);
  });
});

describe('pages at runtime', () => {
  test('a page shows its visible blocks together and updates as answers change', () => {
    const form = mount(survey(), {}, <CurrentBlock />);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    expect(form.current!.currentPage).toBe(1);
    expect(form.current!.isPageStep).toBe(true);
    expect(form.current!.currentStepBlocks!.map(block => block.fieldName)).toEqual(['sex', 'smoker']);
    expect(container!.querySelectorAll('input').length).toBe(2);

    act(() => form.current!.setValue('sex', 'female'));
    expect(form.current!.currentStepBlocks!.map(block => block.fieldName)).toEqual(['sex', 'pregnant', 'smoker']);
    expect(container!.querySelectorAll('input').length).toBe(3);
  });

  test('Continue checks every visible block, and a hidden required block does not block it', () => {
    const form = mount(survey());
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));

    // Pregnant is hidden, so its required rule doesn't apply
    act(() => form.current!.goToNextBlock({ sex: 'male' }));
    expect(form.current!.currentPage).toBe(2);

    act(() => form.current!.goToPreviousBlock());
    expect(form.current!.currentPage).toBe(1);

    // Shown and empty: Continue stops on the page
    act(() => form.current!.goToNextBlock({ sex: 'female' }));
    expect(form.current!.currentPage).toBe(1);
    expect(form.current!.errors.pregnant).toBe('Required');

    act(() => form.current!.goToNextBlock({ pregnant: 'no' }));
    expect(form.current!.currentPage).toBe(2);
  });

  test("a page leaves through its own rules, which can combine answers, and ignores its blocks' rules", () => {
    const routed: BlockData = {
      ...page,
      items: page.items!.map(block =>
        block.uuid === 'b-sex' ? { ...block, navigationRules: [{ condition: 'sex == "male"', target: 'b-name' }] } : block
      ),
      navigationRules: [{ condition: joinConditions(['sex == "male"', 'smoker == "yes"']), target: 'b-end' }],
    };
    const data = survey([...items.slice(0, 1), routed, ...items.slice(2), { type: 'textfield', uuid: 'b-end', fieldName: 'end' }]);

    const form = mount(data);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    act(() => form.current!.goToNextBlock({ sex: 'male', smoker: 'yes' }));
    expect(form.current!.currentPage).toBe(3);

    act(() => form.current!.goToPreviousBlock());
    act(() => form.current!.goToNextBlock({ smoker: 'no' }));
    expect(form.current!.currentPage).toBe(2);
  });

  test('a rule can jump to a page by its UUID', () => {
    const data = survey([
      { type: 'textfield', uuid: 'b-name', fieldName: 'name', navigationRules: [{ condition: 'name == "Ada"', target: 'p-health' }] },
      { type: 'textfield', uuid: 'b-skipped', fieldName: 'skipped' },
      page,
    ]);
    const form = mount(data);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    expect(form.current!.currentPage).toBe(2);
    expect(form.current!.isPageStep).toBe(true);
  });

  test('a block inside a page saves on auto-continue without leaving the page', () => {
    const autoPage: BlockData = {
      ...page,
      items: [{ type: 'textfield', uuid: 'b-auto', fieldName: 'auto', autoContinueOnSelect: true }, ...page.items!.slice(2)],
    };
    const form = mount(survey([items[0], autoPage]), {}, <CurrentBlock />);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    const input = container!.querySelector('input')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'yes');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(form.current!.values.auto).toBe('yes');
    expect(form.current!.currentPage).toBe(1);
  });

  test('a hidden single block is skipped', () => {
    const data = survey([
      { type: 'textfield', uuid: 'b-name', fieldName: 'name' },
      { type: 'textfield', uuid: 'b-hidden', fieldName: 'hidden', validationRules: required, visibility: { initial: 'hidden', conditions: ['name == "Grace"'] } },
      { type: 'textfield', uuid: 'b-notes', fieldName: 'notes' },
    ]);
    const form = mount(data);
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    expect(form.current!.currentPage).toBe(2);

    // Back passes over it too
    act(() => form.current!.goToPreviousBlock());
    expect(form.current!.currentPage).toBe(0);
  });

  test('progress counts a page as one step', () => {
    const form = mount(survey());
    expect(form.current!.getTotalVisibleSteps()).toBe(3);

    // Entering a page is one history entry, so progress moves one step and one Back leaves it
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    expect(form.current!.navigationHistory).toHaveLength(2);
    expect(form.current!.getCurrentStepPosition()).toBe(1);

    act(() => form.current!.goToPreviousBlock());
    expect(form.current!.currentPage).toBe(0);
  });
});

describe('submit sends the final path', () => {
  // q1 "a" leads to A then the end; anything else to B then the end
  const branching = survey([
    {
      type: 'textfield',
      uuid: 'b-q1',
      fieldName: 'q1',
      navigationRules: [{ condition: 'q1 == "a"', target: 'b-a' }, { condition: 'q1 != "a"', target: 'b-b' }],
    },
    { type: 'textfield', uuid: 'b-a', fieldName: 'a', navigationRules: [{ condition: 'a != ""', target: 'b-end' }] },
    { type: 'textfield', uuid: 'b-b', fieldName: 'b' },
    { type: 'textfield', uuid: 'b-end', fieldName: 'end', isEndBlock: true },
  ]);

  test('answers from a branch the patient backed out of are dropped; keys no block saves stay', () => {
    const submitted: Record<string, any>[] = [];
    const form = mount(branching, { onSubmit: values => submitted.push(values), initialValues: { utm_source: 'mail' } });
    act(() => form.current!.goToNextBlock({ q1: 'a' }));
    act(() => form.current!.goToNextBlock({ a: 'from A' }));
    act(() => form.current!.goToPreviousBlock());
    act(() => form.current!.goToPreviousBlock());
    act(() => form.current!.goToNextBlock({ q1: 'b' }));
    act(() => form.current!.goToNextBlock({ b: 'from B' }));
    act(() => form.current!.goToNextBlock({ end: 'done' }));

    expect(submitted).toEqual([{ q1: 'b', b: 'from B', end: 'done', utm_source: 'mail' }]);
  });

  test('a form walked straight through sends every answer', () => {
    const submitted: Record<string, any>[] = [];
    const form = mount(branching, { onSubmit: values => submitted.push(values) });
    act(() => form.current!.goToNextBlock({ q1: 'a' }));
    act(() => form.current!.goToNextBlock({ a: 'from A' }));
    act(() => form.current!.goToNextBlock({ end: 'done' }));
    expect(submitted).toEqual([{ q1: 'a', a: 'from A', end: 'done' }]);
  });

  test('answers of blocks hidden at submit are dropped', () => {
    const submitted: Record<string, any>[] = [];
    const form = mount(survey(), { onSubmit: values => submitted.push(values) });
    act(() => form.current!.goToNextBlock({ name: 'Ada' }));
    act(() => form.current!.goToNextBlock({ sex: 'female', pregnant: 'no', smoker: 'no' }));
    act(() => form.current!.goToPreviousBlock());
    act(() => form.current!.goToNextBlock({ sex: 'male' }));
    act(() => form.current!.goToNextBlock({ notes: 'none' }));

    expect(submitted).toEqual([{ name: 'Ada', sex: 'male', smoker: 'no', notes: 'none' }]);
  });
});
