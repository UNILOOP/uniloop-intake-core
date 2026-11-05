import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import { RenderPageSurveyLayout } from '../src/renderer/layouts/RenderPageSurveyLayout';
import type { BlockData } from '../src/types';

const blocks: BlockData[] = [
  { type: 'textfield', uuid: 'b-one', fieldName: 'one' },
  { type: 'textfield', uuid: 'b-two', fieldName: 'two' },
];
const survey = { rootNode: { type: 'section', uuid: 'root', items: blocks }, mode: 'pageless' as const };

const proto = HTMLElement.prototype as any;
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
  root = createRoot(container);
  act(() =>
    root!.render(
      <SurveyFormProvider surveyData={survey as any}>
        <Probe />
        <RenderPageSurveyLayout autoFocus={false} autoScroll={autoScroll} />
      </SurveyFormProvider>
    )
  );
  return { probe, scrolled };
}

describe('page scroll', () => {
  test('a new step scrolled out of view is brought back to its top', () => {
    const { probe, scrolled } = mount(-400);
    scrolled.length = 0;
    act(() => probe.current!.goToNextBlock({ one: 'x' }));
    expect(probe.current!.currentBlockIndex + probe.current!.currentPage).toBeGreaterThan(0);
    expect(scrolled).toHaveLength(1);
    expect((scrolled[0] as HTMLElement).className).toContain('medvi-layout');
  });

  test('a step already in view, or autoScroll off, leaves the scroll alone', () => {
    const inView = mount(0);
    act(() => inView.probe.current!.goToNextBlock({ one: 'x' }));
    expect(inView.scrolled).toHaveLength(0);
    act(() => root?.unmount());

    const off = mount(-400, false);
    act(() => off.probe.current!.goToNextBlock({ one: 'x' }));
    expect(off.scrolled).toHaveLength(0);
  });
});
