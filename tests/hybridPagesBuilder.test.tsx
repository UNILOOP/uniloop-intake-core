import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyBuilderProvider, useSurveyBuilder } from '../src/context/SurveyBuilderContext';
import { NavigationRulesEditor } from '../src/builder/common/NavigationRulesEditor';
import { VisibilityEditor } from '../src/builder/common/VisibilityEditor';
import { enhancedRuleToStandard } from '../src/builder/common/navigation-rules-types';
import { addPage, findForwardVisibilityRefs, moveBlock, removePageKeepingBlocks } from '../src/builder/survey/helpers/pageItems';
import { SectionNode } from '../src/builder/survey/nodes/SectionNode';
import { ContentBlockPage } from '../src/builder/survey/blocks/ContentBlockPage';
import { ContentBlockItem } from '../src/builder/survey/blocks/ContentBlockItem';
import { SurveyBuilder } from '../src/builder/survey/SurveyBuilder';
import { TextInputBlock } from '../src/blocks';
import { getPageLayoutDefinition, registerPageLayout, unregisterPageLayout } from '../src/renderer/layouts/pageLayouts';
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

function mount(children: React.ReactNode, data: any = rootNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(<SurveyBuilderProvider initialData={{ rootNode: data }}>{children}</SurveyBuilderProvider>)
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

const twoColumn = {
  name: 'two-column',
  label: 'Two columns',
  description: 'Two blocks side by side',
  component: () => null,
};

// Radix tabs switch on mouse down
const pressTab = (label: string) => {
  const tab = [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent === label) as HTMLElement;
  act(() => tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })));
};

describe('page layouts in the builder', () => {
  afterEach(() => unregisterPageLayout('two-column'));

  test('the Pages tab lists a layout passed to the builder, and clicking it adds a page that uses it', () => {
    let saved: any = rootNode;
    const Section = () => {
      const [node, setNode] = React.useState<any>(rootNode);
      return (
        <SectionNode
          data={node}
          onUpdate={(next) => {
            saved = next;
            setNode(next);
          }}
          onRemove={() => {}}
        />
      );
    };
    // The builder registers the layouts it's given
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<SurveyBuilder pageLayoutDefinitions={[twoColumn]} />));
    expect(getPageLayoutDefinition('two-column')).toBe(twoColumn);
    act(() => root!.unmount());
    container.remove();

    mount(<Section />);
    pressTab('Pages');
    const buttons = [...container!.querySelectorAll('button')];
    expect(buttons.some((button) => button.textContent?.includes('Stacked'))).toBe(true);
    const twoColumnButton = buttons.find((button) => button.textContent?.includes('Two columns'))!;
    expect(twoColumnButton.textContent).toContain('Two blocks side by side');

    act(() => twoColumnButton.click());
    const added = saved.items[saved.items.length - 1];
    expect(added).toMatchObject({ type: 'set', name: 'Page 2', pageLayout: 'two-column', items: [] });

    act(() => buttons.find((button) => button.textContent?.includes('Stacked'))!.click());
    expect('pageLayout' in saved.items[saved.items.length - 1]).toBe(false);
  });

  test('the Edit dialog changes the layout, Stacked clears it, and an unknown name is kept', () => {
    registerPageLayout(twoColumn);
    let saved: BlockData = page;
    const Page = () => {
      const [data, setData] = React.useState<BlockData>({ ...page, pageLayout: 'retired-layout' });
      return (
        <ContentBlockPage
          hybrid
          data={data}
          onUpdate={(next) => {
            saved = next;
            setData(next);
          }}
          onRemove={() => {}}
        />
      );
    };
    mount(<Page />);
    expect(container!.textContent).toContain('retired-layout (not available)');

    const edit = [...container!.querySelectorAll('button')].find((button) => button.textContent === 'Edit')!;
    act(() => edit.click());
    const select = document.querySelector('select[aria-label="Page layout"]') as HTMLSelectElement;
    expect(select.value).toBe('retired-layout');
    const choose = (value: string) =>
      act(() => {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

    choose('two-column');
    expect(saved.pageLayout).toBe('two-column');
    choose('stacked');
    expect('pageLayout' in saved).toBe(false);
  });

  test('addPage inserts at a position and numbers the page', () => {
    const next = addPage(items, 'two-column', 1);
    expect(next.map((item) => item.type)).toEqual(['textfield', 'set', 'set', 'textfield']);
    expect(next[1]).toMatchObject({ name: 'Page 2', pageLayout: 'two-column' });
    expect('pageLayout' in addPage(items)[3]).toBe(false);
  });
});

describe('show/hide rules that read a later field', () => {
  const hiddenUntil = (field: string): BlockData['visibility'] => ({ initial: 'hidden', conditions: [condition(field, 'yes')] });

  test('an earlier field passes; the own field and a later field are flagged; unreadable rules are skipped', () => {
    const form: BlockData[] = [
      { type: 'textfield', uuid: 'b-a', fieldName: 'a' },
      {
        type: 'set',
        uuid: 'p-1',
        items: [
          { type: 'textfield', uuid: 'b-earlier', fieldName: 'b', visibility: hiddenUntil('a') },
          { type: 'textfield', uuid: 'b-own', fieldName: 'c', visibility: hiddenUntil('c') },
          { type: 'textfield', uuid: 'b-later', fieldName: 'd', visibility: hiddenUntil('e') },
        ],
      },
      { type: 'textfield', uuid: 'b-e', fieldName: 'e' },
      { type: 'textfield', uuid: 'b-odd', fieldName: 'f', visibility: { initial: 'hidden', conditions: ['someFn(e)'] } },
      { type: 'textfield', uuid: 'b-external', fieldName: 'g', visibility: hiddenUntil('patient.state') },
    ];
    expect(findForwardVisibilityRefs(form)).toEqual({ 'b-own': ['c'], 'b-later': ['e'] });
  });

  test('a block moved above the field its rule uses shows the flag, and moving it back clears it', () => {
    const asked: BlockData[] = [
      { type: 'textfield', uuid: 'b-a', fieldName: 'a' },
      page,
      { type: 'textfield', uuid: 'b-b', fieldName: 'b', visibility: hiddenUntil('a') },
    ];
    const show = (form: BlockData[]) => {
      const Card = () => {
        const { addBlockDefinition } = useSurveyBuilder();
        // addBlockDefinition is a new function each render, so register once.
        const added = React.useRef(false);
        React.useEffect(() => {
          if (added.current) return;
          added.current = true;
          addBlockDefinition('textfield', TextInputBlock);
        }, [addBlockDefinition]);
        return <ContentBlockItem data={form.find((item) => item.uuid === 'b-b')!} onUpdate={() => {}} onRemove={() => {}} />;
      };
      mount(<Card />, { type: 'section', uuid: 'root', items: form });
      const note = container!.querySelector('[role="note"]')?.textContent ?? null;
      act(() => root!.unmount());
      container!.remove();
      return note;
    };

    expect(show(asked)).toBeNull();
    // b goes above a: its rule now reads a field asked after it
    const movedUp = [asked[2], asked[0], asked[1]];
    expect(show(movedUp)).toBe('This rule uses a, which comes after this block');
    expect(show(asked)).toBeNull();
  });
});
