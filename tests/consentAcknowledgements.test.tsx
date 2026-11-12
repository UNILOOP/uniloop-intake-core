import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConsentAcknowledgementsBlock, getBlockDefinition } from '../src/blocks';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import type { BlockData } from '../src/types';

const consents: BlockData = {
  type: 'consentAcknowledgements',
  uuid: 'b-consents',
  fieldName: 'consents',
  label: 'Please review',
  acknowledgements: [
    { id: 'telehealth', accordionTitle: 'Telehealth', content: 'Text' },
    { id: 'terms', accordionTitle: 'Terms', content: 'Text', autoSelect: true },
    {
      id: 'pregnancy',
      accordionTitle: 'Pregnancy',
      content: 'Text',
      showIf: [{ field: 'sex', operator: 'equals', value: 'female' }],
    },
  ],
  required: true,
};

const survey = {
  rootNode: {
    type: 'section',
    uuid: 'root',
    items: [{ type: 'textfield', uuid: 'b-sex', fieldName: 'sex' }, consents],
  },
  mode: 'pageless' as const,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
});

// Renders the block inside a form, wired to the form's value as the renderer does.
function mount(values: Record<string, unknown>) {
  const form: { current: ReturnType<typeof useSurveyForm> | null } = { current: null };
  const Block = () => {
    form.current = useSurveyForm();
    return ConsentAcknowledgementsBlock.renderBlock!({
      block: consents,
      value: form.current.values.consents,
      onChange: (value) => form.current!.setValue('consents', value),
    });
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <SurveyFormProvider surveyData={survey as any} initialValues={values}>
        <Block />
      </SurveyFormProvider>,
    ),
  );
  return form;
}

const checkbox = (name: string) =>
  container!.querySelector<HTMLElement>(`[role="checkbox"][aria-label="${name}"]`)!;
const checkAll = () =>
  [...container!.querySelectorAll('label')].find((label) =>
    label.textContent?.includes('I acknowledge all'),
  )!;

describe('Consents block', () => {
  test('is a standard block with its own type', () => {
    expect(getBlockDefinition('consentAcknowledgements')?.name).toBe('Consents');
    expect(getBlockDefinition('acknowledgements')).toBeUndefined();
  });

  test('shows only the items whose conditions match, and autoSelect starts checked', () => {
    const form = mount({ sex: 'Male' });
    expect(checkbox('Pregnancy')).toBeNull();
    expect(form.current!.values.consents).toEqual({
      masterAcknowledged: false,
      items: { terms: true },
    });
  });

  test('checking every shown item acknowledges the block', () => {
    const form = mount({ sex: 'Male' });
    act(() => checkbox('Telehealth').click());
    expect(form.current!.values.consents.masterAcknowledged).toBe(true);
    expect(ConsentAcknowledgementsBlock.validateValue!(form.current!.values.consents, consents)).toBeNull();
  });

  test('check all covers the shown items only', () => {
    const form = mount({ sex: 'female' });
    act(() => checkAll().click());
    expect(form.current!.values.consents).toEqual({
      masterAcknowledged: true,
      items: { telehealth: true, terms: true, pregnancy: true },
    });
  });

  test('an item hidden by a changed answer leaves the saved answer', () => {
    const form = mount({ sex: 'Female' });
    act(() => checkAll().click());
    act(() => form.current!.setValue('sex', 'Male'));
    expect(form.current!.values.consents).toEqual({
      masterAcknowledged: true,
      items: { telehealth: true, terms: true },
    });
    act(() => form.current!.setValue('sex', 'Female'));
    expect(form.current!.values.consents.masterAcknowledged).toBe(false);
  });

  test('validation', () => {
    const { validate, validateValue } = ConsentAcknowledgementsBlock;
    expect(validateValue!(undefined, consents)).toBe('Please check every item to continue');
    expect(validateValue!(undefined, { ...consents, required: false })).toBeNull();
    expect(validate!(consents)).toBeNull();
    expect(validate!({ ...consents, acknowledgements: [] })).toBe('Add at least one item');
    expect(
      validate!({
        ...consents,
        acknowledgements: [
          { id: 'a', accordionTitle: 'A', content: '' },
          { id: 'a', accordionTitle: 'B', content: '' },
        ],
      }),
    ).toBe('Each item needs its own "Saved as" name');
  });

  test('new blocks start with one neutral item and no conditions', () => {
    const data = ConsentAcknowledgementsBlock.generateDefaultData!();
    expect(data.type).toBe('consentAcknowledgements');
    expect(data.acknowledgements).toHaveLength(1);
    expect(data.acknowledgements[0].showIf).toBeUndefined();
    expect(ConsentAcknowledgementsBlock.validate!(data)).toBeNull();
  });
});
