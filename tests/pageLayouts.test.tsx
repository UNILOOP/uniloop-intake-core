import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import { CurrentBlock } from '../src/renderer/layouts/helpers/CurrentBlock';
import { NavigationButtons } from '../src/renderer/layouts/helpers/NavigationButtons';
import { registerPageLayout, unregisterPageLayout } from '../src/renderer/layouts/pageLayouts';
import type { BlockData, PageLayoutProps, PageOverrides } from '../src/types';

const required = [{ operator: 'isNotEmpty', message: 'Required' }];

// A page of three blocks: height, weight (shown when height is "tall"), and a required goal
const page = (pageLayout?: string): BlockData => ({
  type: 'set',
  uuid: 'p-body',
  name: 'Body',
  pageLayout,
  items: [
    { type: 'textfield', uuid: 'b-height', fieldName: 'height' },
    {
      type: 'textfield',
      uuid: 'b-weight',
      fieldName: 'weight',
      visibility: { initial: 'hidden', conditions: ['height == "tall"'] },
    },
    { type: 'textfield', uuid: 'b-goal', fieldName: 'goal', validationRules: required },
  ],
});
const survey = (pageLayout?: string) => ({
  rootNode: { type: 'section', uuid: 'root', items: [page(pageLayout), { type: 'textfield', uuid: 'b-notes', fieldName: 'notes' }] },
  mode: 'pageless' as const,
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const registered: string[] = [];
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  registered.splice(0).forEach(unregisterPageLayout);
});

function register(name: string, component: React.FC<PageLayoutProps>, ownsNavigation?: boolean) {
  registered.push(name);
  registerPageLayout({ name, component, ownsNavigation });
}

function mount(data: ReturnType<typeof survey>, current: React.ReactNode = <CurrentBlock />, props: { isPreview?: boolean; initialValues?: Record<string, any>; pageOverrides?: PageOverrides } = {}) {
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
        {current}
      </SurveyFormProvider>
    )
  );
  return probe;
}

describe('page layouts', () => {
  test('renderBlock places a block, then renderBlocks draws the rest once each', () => {
    register('two-column', ({ renderBlock, renderBlocks }) => (
      <>
        <div data-column="left">{renderBlock(2)}</div>
        <div data-column="right">{renderBlocks()}</div>
      </>
    ));
    mount(survey('two-column'), <CurrentBlock />, { initialValues: { height: 'tall' } });
    expect(container!.querySelectorAll('input').length).toBe(3);
    const left = container!.querySelector('[data-column="left"]')!;
    const right = container!.querySelector('[data-column="right"]')!;
    expect(left.querySelectorAll('input').length).toBe(1);
    expect(right.querySelectorAll('input').length).toBe(2);
  });

  test('renderBlock finds a block by its fieldName', () => {
    register('by-name', ({ renderBlock, renderBlocks }) => (
      <>
        <section data-column="first">{renderBlock('goal')}</section>
        {renderBlocks()}
      </>
    ));
    mount(survey('by-name'));
    expect(container!.querySelector('[data-column="first"]')!.querySelectorAll('input').length).toBe(1);
    // weight is hidden, so height and goal draw
    expect(container!.querySelectorAll('input').length).toBe(2);
  });

  test("positions don't shift when a rule hides a block, and a hidden or drawn block draws nothing", () => {
    const calls: Array<{ weight: boolean; again: boolean }> = [];
    register('probe', ({ renderBlock, renderBlocks }) => {
      const weight = renderBlock(1);
      const again = renderBlock('weight');
      calls.push({ weight: weight !== null, again: again !== null });
      return (
        <>
          <div data-column="weight">{weight}</div>
          {renderBlocks()}
        </>
      );
    });
    const form = mount(survey('probe'));
    expect(calls[calls.length - 1]).toEqual({ weight: false, again: false });
    expect(container!.querySelector('[data-column="weight"]')!.children.length).toBe(0);

    act(() => form.current!.setValue('height', 'tall'));
    expect(calls[calls.length - 1]).toEqual({ weight: true, again: false });
    expect(container!.querySelector('[data-column="weight"]')!.querySelectorAll('input').length).toBe(1);
    expect(container!.querySelectorAll('input').length).toBe(3);
  });

  test('a visible block the layout never draws stays undrawn, with a warning, and a notice in the preview', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    register('skips', ({ renderBlock }) => <>{renderBlock(0)}</>);
    mount(survey('skips'));
    expect(container!.querySelectorAll('input').length).toBe(1);
    expect(warn.mock.calls.some(call => String(call[0]).includes('goal'))).toBe(true);
    expect(container!.querySelector('[role="alert"]')).toBeNull();
    act(() => root!.unmount());
    container!.remove();

    mount(survey('skips'), <CurrentBlock />, { isPreview: true });
    expect(container!.querySelector('[role="alert"]')!.textContent).toContain('goal');
    warn.mockRestore();
  });

  test('lookup order: the page layout, then renderPage, then stacked', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    const RenderPage: React.FC<PageLayoutProps> = ({ renderBlocks }) => <div data-column="renderPage">{renderBlocks()}</div>;
    register('own', ({ renderBlocks }) => <div data-column="own">{renderBlocks()}</div>);

    // Unknown name: warns and falls through to renderPage
    mount(survey('missing-layout'), <CurrentBlock renderPage={RenderPage} />);
    expect(warn.mock.calls.some(call => String(call[0]).includes('missing-layout'))).toBe(true);
    expect(container!.querySelector('[data-column="renderPage"]')).not.toBeNull();
    act(() => root!.unmount());
    container!.remove();

    // The page's own layout wins over renderPage
    mount(survey('own'), <CurrentBlock renderPage={RenderPage} />);
    expect(container!.querySelector('[data-column="own"]')).not.toBeNull();
    expect(container!.querySelector('[data-column="renderPage"]')).toBeNull();
    act(() => root!.unmount());
    container!.remove();

    // Neither: stacked
    mount(survey());
    expect(container!.querySelector('[data-column]')).toBeNull();
    expect(container!.querySelectorAll('input').length).toBe(2);
    warn.mockRestore();
  });

  test('Continue still checks a required block the layout placed', () => {
    register('goal-first', ({ renderBlock, renderBlocks }) => (
      <>
        {renderBlock('goal')}
        {renderBlocks()}
      </>
    ));
    const form = mount(survey('goal-first'));
    act(() => form.current!.goToNextBlock({ height: 'tall' }));
    expect(form.current!.currentPage).toBe(0);
    expect(form.current!.errors.goal).toBe('Required');

    act(() => form.current!.goToNextBlock({ goal: 'energy' }));
    expect(form.current!.currentPage).toBe(1);
  });

  test('a memo layout draws its blocks as an element', () => {
    register('memo', React.memo(({ renderBlocks }: PageLayoutProps) => <div data-column="memo">{renderBlocks()}</div>) as any);
    mount(survey('memo'));
    expect(container!.querySelector('[data-column="memo"]')!.querySelectorAll('input').length).toBe(2);
  });

  test('a child component that draws a block on its own render keeps drawing it', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    let show: (tab: number) => void = () => {};
    const Tabs = ({ renderBlock }: { renderBlock: PageLayoutProps['renderBlock'] }) => {
      const [tab, setTab] = React.useState(0);
      show = setTab;
      return <div data-column="tab">{renderBlock(tab === 0 ? 0 : 2)}</div>;
    };
    register('tabs', ({ renderBlock }) => <Tabs renderBlock={renderBlock} />);
    mount(survey('tabs'));
    const inTab = () => container!.querySelector('[data-column="tab"]')!.querySelectorAll('input').length;
    expect(inTab()).toBe(1);
    act(() => show(1));
    expect(inTab()).toBe(1);
    act(() => show(0));
    expect(inTab()).toBe(1);
    warn.mockRestore();
  });

  test('by fieldName, the visible one of two blocks that save the same field is drawn', () => {
    const twins: BlockData = {
      type: 'set',
      uuid: 'p-twins',
      pageLayout: 'twins',
      items: [
        { type: 'textfield', uuid: 'b-x-a', fieldName: 'x', visibility: { initial: 'hidden', conditions: ['mode == "a"'] } },
        { type: 'textfield', uuid: 'b-x-b', fieldName: 'x', visibility: { initial: 'hidden', conditions: ['mode == "b"'] } },
      ],
    };
    register('twins', ({ renderBlock, renderBlocks }) => (
      <>
        <div data-column="top">{renderBlock('x')}</div>
        {renderBlocks()}
      </>
    ));
    mount({ rootNode: { type: 'section', uuid: 'root', items: [twins] }, mode: 'pageless' }, <CurrentBlock />, { initialValues: { mode: 'b' } });
    expect(container!.querySelector('[data-column="top"]')!.querySelectorAll('input').length).toBe(1);
    expect(container!.querySelectorAll('input').length).toBe(1);
  });
});

describe('page overrides', () => {
  // The form layout's Continue sits under the page, as in createLayout
  const form = (
    <>
      <CurrentBlock />
      <NavigationButtons nextText="Form next" />
    </>
  );
  const continueButtons = () =>
    Array.from(container!.querySelectorAll('button[type="submit"]')).map((button) => button.textContent);

  test('an override draws pages saved under the system name, and the saved name stays', () => {
    register('system', ({ renderBlocks }) => <div data-page="system">{renderBlocks()}</div>);
    register('custom', ({ renderBlocks }) => <div data-page="custom">{renderBlocks()}</div>);
    const data = survey('system');
    mount(data, <CurrentBlock />, { pageOverrides: { system: 'custom' } });
    expect(container!.querySelector('[data-page="custom"]')!.querySelectorAll('input').length).toBe(2);
    expect(container!.querySelector('[data-page="system"]')).toBeNull();
    expect((data.rootNode.items[0] as BlockData).pageLayout).toBe('system');
  });

  test("an override that isn't registered warns once and draws the system page", () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    register('system', ({ renderBlocks }) => <div data-page="system">{renderBlocks()}</div>);
    mount(survey('system'), <CurrentBlock />, { pageOverrides: { system: 'missing' } });
    expect(container!.querySelector('[data-page="system"]')!.querySelectorAll('input').length).toBe(2);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('"missing"')).length).toBe(1);
    warn.mockRestore();
  });

  test("an override that throws falls back to the system page, and the form layout's Continue comes back", () => {
    const error = spyOn(console, 'error').mockImplementation(() => {});
    register('system', ({ renderBlocks }) => <div data-page="system">{renderBlocks()}</div>);
    register('broken', () => {
      throw new Error('broken page');
    }, true);
    mount(survey('system'), form, { pageOverrides: { system: 'broken' } });
    expect(container!.querySelector('[data-page="system"]')!.querySelectorAll('input').length).toBe(2);
    // The form layout draws its own Continue again
    expect(continueButtons()).toEqual(['Form next']);
    const logged = () => error.mock.calls.filter(([message]) => String(message).includes('[pageOverrides] "broken"')).length;
    expect(logged()).toBe(1);

    // Coming back to the page draws the system page straight away, without another log
    act(() => root!.unmount());
    container!.remove();
    mount(survey('system'), form, { pageOverrides: { system: 'broken' } });
    expect(container!.querySelector('[data-page="system"]')).not.toBeNull();
    expect(logged()).toBe(1);
    error.mockRestore();
  });

  test('an override that threw is tried again once it is registered again', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {});
    register('system', ({ renderBlocks }) => <div data-page="system">{renderBlocks()}</div>);
    register('flaky', () => {
      throw new Error('flaky page');
    });
    mount(survey('system'), <CurrentBlock />, { pageOverrides: { system: 'flaky' } });
    expect(container!.querySelector('[data-page="system"]')).not.toBeNull();

    act(() => register('flaky', ({ renderBlocks }) => <div data-page="flaky">{renderBlocks()}</div>));
    expect(container!.querySelector('[data-page="flaky"]')).not.toBeNull();
    error.mockRestore();
  });

  test('a page that owns its Continue draws it where it wants, and the form leaves its own out', () => {
    register('system', ({ renderBlocks }) => <div data-page="system">{renderBlocks()}</div>);
    register('owner', ({ renderBlocks, renderNavigation }) => (
      <>
        <div data-slot="top">{renderNavigation({ nextText: 'Page next' })}</div>
        {renderBlocks()}
      </>
    ), true);
    mount(survey('system'), form, { pageOverrides: { system: 'owner' } });
    expect(continueButtons()).toEqual(['Page next']);
    expect(container!.querySelector('[data-slot="top"] button[type="submit"]')).not.toBeNull();
  });

  test("the page's Continue checks its answers like the form's", () => {
    register('owner', ({ renderBlocks, renderNavigation }) => (
      <>
        {renderBlocks()}
        {renderNavigation({ nextText: 'Page next' })}
      </>
    ), true);
    const probe = mount(survey('owner'), form);
    const next = () => (container!.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    // goal is required and empty
    act(next);
    expect(probe.current!.currentPage).toBe(0);
    expect(probe.current!.errors.goal).toBe('Required');
    act(() => probe.current!.setValue('goal', 'energy'));
    act(next);
    expect(probe.current!.currentPage).toBe(1);
  });

  test('a page without ownsNavigation keeps the form Continue', () => {
    register('plain', ({ renderBlocks }) => <>{renderBlocks()}</>);
    mount(survey('plain'), form);
    expect(continueButtons()).toEqual(['Form next']);
  });

  test("an owner that never draws its Continue warns, with a notice in the preview", () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    register('forgetful', ({ renderBlocks }) => <>{renderBlocks()}</>, true);
    mount(survey('forgetful'), form, { isPreview: true });
    expect(continueButtons()).toEqual([]);
    expect(container!.querySelector('[role="alert"]')!.textContent).toContain("doesn't draw its Continue");
    expect(warn.mock.calls.some(([message]) => String(message).includes('renderNavigation'))).toBe(true);
    warn.mockRestore();
  });
});
