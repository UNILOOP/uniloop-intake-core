import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyMergeView } from '../src/merge/view/SurveyMergeView';
import type { SurveySnapshot } from '../src/merge';
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

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
});

const click = (button: Element) => act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const buttonNamed = (label: string): HTMLButtonElement => {
  const button = container!.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;
  if (!button) throw new Error(`No button labelled ${label}`);
  return button;
};

describe('SurveyMergeView', () => {
  test('lists the changes, applies decisions and reports the merged form', async () => {
    const base = survey([radio('a', 'smoker', { label: 'smoker?' }), radio('x', 'extra')]);
    const current = survey([radio('a', 'smoker', { label: 'Smoker?' }), radio('x', 'extra')]);
    const incoming = survey([radio('a', 'smoker', { label: 'Do you smoke?' }), radio('n', 'new')]);
    const mergedForms: SurveySnapshot[] = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <SurveyMergeView
          current={current}
          incoming={incoming}
          base={base}
          blockDefinitions={[]}
          initialTab="changes"
          labels={{ current: 'your form', incoming: 'provider update' }}
          onMergedChange={(merged) => mergedForms.push(merged)}
        />
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Label');
    expect(text).toContain('Both changed this');
    expect(text).toContain('New block');
    expect(text).toContain('Block removed upstream');
    expect(text).toContain('1 conflict needs your decision');
    expect(text).toContain('Compared with base');

    // The conflict keeps the current wording until the incoming one is taken
    let latest = mergedForms[mergedForms.length - 1];
    expect(latest.rootNode.items![0].label).toBe('Smoker?');
    expect(latest.rootNode.items!.map((block) => block.uuid)).toEqual(['a', 'n']);

    click(buttonNamed('Use for Label'));
    latest = mergedForms[mergedForms.length - 1];
    expect(latest.rootNode.items![0].label).toBe('Do you smoke?');
    expect(container.textContent).toContain('All conflicts decided');

    click(buttonNamed('Keep for Block removed upstream'));
    latest = mergedForms[mergedForms.length - 1];
    expect(latest.rootNode.items!.map((block) => block.uuid)).toEqual(['a', 'n', 'x']);

    // Bulk: keep the current side everywhere
    const keepAll = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Keep everything'));
    expect(keepAll).toBeDefined();
    click(keepAll!);
    latest = mergedForms[mergedForms.length - 1];
    expect(latest.rootNode.items!.map((block) => block.uuid)).toEqual(['a', 'x']);
    expect(latest.rootNode.items![0].label).toBe('Smoker?');
  });

  test('a read-only view shows decisions but takes none', async () => {
    const current = survey([radio('a', 'smoker', { label: 'A' })]);
    const incoming = survey([radio('a', 'smoker', { label: 'B' })]);
    const decisions: Record<string, string>[] = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<SurveyMergeView current={current} incoming={incoming} blockDefinitions={[]} initialTab="changes" readOnly onDecisionsChange={(next) => decisions.push(next)} />);
    });
    expect(container.textContent).toContain('No earlier version');
    const take = buttonNamed('Use for Label');
    expect(take.disabled).toBe(true);
    expect(decisions).toHaveLength(0);
  });
});
