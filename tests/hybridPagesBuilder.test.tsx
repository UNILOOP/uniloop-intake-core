import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyBuilderProvider, useSurveyBuilder } from '../src/context/SurveyBuilderContext';
import { NavigationRulesEditor } from '../src/builder/common/NavigationRulesEditor';
import { VisibilityEditor } from '../src/builder/common/VisibilityEditor';
import { enhancedRuleToStandard } from '../src/builder/common/navigation-rules-types';
import { moveBlock, removePageKeepingBlocks } from '../src/builder/survey/helpers/pageItems';
import { convertPagelessToPaged } from '../src/builder/survey/helpers/JsonEditor';
import { joinConditions } from '../src/utils/conditionGroups';
import { detectSurveyMode } from '../src/utils/surveyUtils';
import type { BlockData, NavigationRule } from '../src/types';

const page: BlockData = {
  type: 'set',
  uuid: 'p-health',
  name: 'Health',
  items: [
    { type: 'textfield', uuid: 'b-sex', fieldName: 'sex' },
    { type: 'textfield', uuid: 'b-pregnant', fieldName: 'pregnant' },
  ],
};
const items: BlockData[] = [
  { type: 'textfield', uuid: 'b-name', fieldName: 'name' },
  page,
  { type: 'textfield', uuid: 'b-notes', fieldName: 'notes' },
];
const rootNode = { type: 'section', uuid: 'root', items };

const condition = (field: string, value: string) =>
  enhancedRuleToStandard({ field, operator: '==', value, target: '' });

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
});

function mount(children: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(<SurveyBuilderProvider initialData={{ rootNode: rootNode as any }}>{children}</SurveyBuilderProvider>)
  );
}

describe('page rules in the builder', () => {
  test('a page lists the fields before it and on it', () => {
    let listed: string[] = [];
    const Probe = () => {
      listed = useSurveyBuilder().getAvailableFieldsUptoCurrent('p-health');
      return null;
    };
    mount(<Probe />);
    expect(listed).toEqual(['name', 'sex', 'pregnant']);
  });

  test('a rule that combines answers keeps every condition', () => {
    const joined = joinConditions([condition('sex', 'female'), condition('pregnant', 'yes')]);
    let saved: NavigationRule[] | undefined;
    mount(
      <NavigationRulesEditor
        data={{ ...page, navigationRules: [{ condition: joined, target: 'b-notes', isPage: false }] }}
        onUpdate={(next) => {
          saved = next.navigationRules;
        }}
      />
    );
    expect(saved).toEqual([{ condition: joined, target: 'b-notes', isPage: false }]);
    expect(container!.textContent).toContain('And');
  });

  test('a single condition saves as before', () => {
    const single = condition('name', 'Ann');
    let saved: NavigationRule[] | undefined;
    mount(
      <NavigationRulesEditor
        data={{ ...items[2], navigationRules: [{ condition: single, target: 'submit', isPage: false }] }}
        onUpdate={(next) => {
          saved = next.navigationRules;
        }}
      />
    );
    expect(saved?.[0].condition).toBe(single);
  });
});

describe('visibility in the builder', () => {
  test('turning it on saves "hidden until", and off removes it', () => {
    let saved: BlockData = page.items[1];
    const Editor = () => {
      const [data, setData] = React.useState<BlockData>(saved);
      return (
        <VisibilityEditor
          data={data}
          onUpdate={(next) => {
            saved = next;
            setData(next);
          }}
        />
      );
    };
    mount(<Editor />);
    const toggle = () => act(() => (container!.querySelector('[role="switch"]') as HTMLElement).click());

    toggle();
    expect(saved.visibility).toEqual({ initial: 'hidden', match: 'all', conditions: [] });
    expect(container!.textContent).toContain('Hidden until');

    toggle();
    expect('visibility' in saved).toBe(false);
  });

  test('saved conditions load back as rows', () => {
    const block = { ...page.items[1], visibility: { initial: 'visible' as const, conditions: [condition('sex', 'male')] } };
    let saved: BlockData | null = null;
    mount(<VisibilityEditor data={block} onUpdate={(next) => (saved = next)} />);
    expect(container!.textContent).toContain('Visible unless');
    expect(container!.textContent).toContain('Remove Condition');
    expect(saved).toBeNull();
  });
});

describe('pages in the list view', () => {
  test('a block moves into a page and back out after it', () => {
    const moved = moveBlock(items, 'b-name', 'page:p-health');
    expect(moved.map((item) => item.uuid)).toEqual(['p-health', 'b-notes']);
    expect(moved[0].items.map((item: BlockData) => item.uuid)).toEqual(['b-sex', 'b-pregnant', 'b-name']);

    const back = moveBlock(moved, 'b-sex', 'root');
    expect(back.map((item) => item.uuid)).toEqual(['p-health', 'b-sex', 'b-notes']);
  });

  test('a page doesn\'t move into a page', () => {
    const twoPages = [...items, { type: 'set', uuid: 'p-other', items: [] }];
    expect(moveBlock(twoPages, 'p-health', 'page:p-other')).toBe(twoPages);
  });

  test('removing a page puts its blocks in its place', () => {
    expect(removePageKeepingBlocks(items, 1).map((item) => item.uuid)).toEqual(['b-name', 'b-sex', 'b-pregnant', 'b-notes']);
  });
});

describe('JSON import and export', () => {
  test('a mixed form stays mixed, and converting to paged keeps its pages', () => {
    const exported = JSON.parse(JSON.stringify({ rootNode }));
    expect(detectSurveyMode(exported.rootNode)).toBe('pageless');
    expect(exported.rootNode).toEqual(rootNode);

    const paged = convertPagelessToPaged(exported.rootNode);
    expect(paged.items.map((item: BlockData) => item.type)).toEqual(['set', 'set', 'set']);
    expect(paged.items[1]).toEqual(page);
  });
});
