import { afterEach, describe, expect, test } from 'bun:test';
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import { RenderPageSurveyLayout } from '../src/renderer/layouts/RenderPageSurveyLayout';
import type { BlockData } from '../src/types';

const blocks: BlockData[] = [
  { type: 'textfield', uuid: 'b-one', fieldName: 'one' },
  { type: 'textfield', uuid: 'b-two', fieldName: 'two' },
];
const survey: ComponentProps<typeof SurveyFormProvider>['surveyData'] = { rootNode: { type: 'section', uuid: 'root', items: blocks }, mode: 'pageless' as const };

const proto = HTMLElement.prototype;
const original = { scrollIntoView: proto.scrollIntoView, getBoundingClientRect: proto.getBoundingClientRect };

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  proto.scrollIntoView = original.scrollIntoView;
  proto.getBoundingClientRect = original.getBoundingClientRect;
});

// Mounts the layout with the layout's container `top` px from the top of the viewport
function mount(top: number, autoScroll?: boolean) {
  const scrolled: Element[] = [];
  proto.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
  proto.getBoundingClientRect = function (this: Element) {
    return { top, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: top } as DOMRect;
  };
  const probe: { current: ReturnType<typeof useSurveyForm> | null } = { current: null };
  const Probe = () => {
    probe.current = useSurveyForm();
    return null;
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  const mountedRoot = createRoot(container);
  root = mountedRoot;
  act(() =>
    mountedRoot.render(
      <SurveyFormProvider surveyData={survey}>
        <Probe />
        <RenderPageSurveyLayout autoFocus={false} autoScroll={autoScroll} />
      </SurveyFormProvider>
    )
  );
  return {
    get context() {
      if (!probe.current) throw new Error('Survey context was not mounted');
      return probe.current;
    },
    scrolled,
  };
}

describe('page scroll', () => {
  test('a new step scrolled out of view is brought back to its top', () => {
    const mounted = mount(-400);
    const { scrolled } = mounted;
    scrolled.length = 0;
    act(() => mounted.context.goToNextBlock({ one: 'x' }));
    expect(mounted.context.currentBlockIndex + mounted.context.currentPage).toBeGreaterThan(0);
    expect(scrolled).toHaveLength(1);
    expect((scrolled[0] as HTMLElement).className).toContain('medvi-layout');
  });

  test('a step already in view, or autoScroll off, leaves the scroll alone', () => {
    const inView = mount(0);
    act(() => inView.context.goToNextBlock({ one: 'x' }));
    expect(inView.scrolled).toHaveLength(0);
    act(() => root?.unmount());

    const off = mount(-400, false);
    act(() => off.context.goToNextBlock({ one: 'x' }));
    expect(off.scrolled).toHaveLength(0);
  });
});
