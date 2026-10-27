import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SurveyFormProvider, useSurveyForm } from '../src/context/SurveyFormContext';
import { createExternalStore, type ExternalSyncAdapter } from '../src/external';
import { readInternalValue, writeInternalValue } from '../src/external/sync';
import { toRuleContext } from '../src/external';
import type { BlockData } from '../src/types';

const blocks: BlockData[] = [
  { type: 'textfield', uuid: 'b-first', fieldName: 'firstName', bind: 'patient.firstName', skip: true },
  { type: 'auth', uuid: 'b-contact', fieldName: 'contact', bind: 'patient.email', bindKey: 'contact.email' },
  { type: 'textfield', uuid: 'b-notes', fieldName: 'notes' },
];
const survey = { rootNode: { type: 'section', uuid: 'root', items: blocks }, mode: 'pageless' as const };

// The host decides where bindings live on a block; the package only calls this
const sync: ExternalSyncAdapter = {
  getBindings: block =>
    block.bind ? [{ internalKey: block.bindKey ?? block.fieldName, externalKey: block.bind }] : [],
  shouldSkipBlock: (block, { values, bindings }) =>
    !!block.skip && bindings.every(binding => !!readInternalValue(values, binding.internalKey)),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
});

function mount(store = createExternalStore(), onChange?: (values: any) => void) {
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
      <SurveyFormProvider surveyData={survey as any} external={{ store, sync, onChange }}>
        <Probe />
      </SurveyFormProvider>
    )
  );
  return probe;
}

describe('external values', () => {
  test('rule context nests dotted keys', () => {
    expect(toRuleContext({ 'patient.firstName': 'Ada', 'patient.age': 40, plain: 1 })).toEqual({
      patient: { firstName: 'Ada', age: 40 },
      plain: 1,
    });
  });

  test('writing an object output key updates the block answer', () => {
    const next = writeInternalValue({ contact: { phone: '1' } }, 'contact.email', 'a@b.c', blocks);
    expect(next.contact).toEqual({ phone: '1', email: 'a@b.c' });
    expect(readInternalValue(next, 'contact.email')).toBe('a@b.c');
  });

  test('prefills bound keys and skips a block already answered from outside', () => {
    const store = createExternalStore({ 'patient.firstName': 'Ada' });
    const form = mount(store);
    expect(form.current!.values.firstName).toBe('Ada');
    // The first block is filled and marked skippable, so the form moved past it
    expect(form.current!.currentPage).toBe(1);

    // Going back with only skipped steps behind returns to the skipped block instead of leaving the form
    act(() => form.current!.goToPreviousBlock());
    expect(form.current!.currentPage).toBe(0);
  });

  test('host updates reach a mounted form and form answers reach the host', () => {
    const store = createExternalStore();
    const seen: any[] = [];
    const form = mount(store, (_values, changes, source) => seen.push({ changes, source }));
    expect(form.current!.currentPage).toBe(0);

    act(() => store.setValues({ 'patient.email': 'ada@example.com' }));
    expect(form.current!.values.contact).toEqual({ email: 'ada@example.com' });

    act(() => form.current!.setValue('firstName', 'Grace'));
    expect(store.getSnapshot()['patient.firstName']).toBe('Grace');
    expect(seen).toEqual([
      { changes: { 'patient.email': 'ada@example.com' }, source: 'host' },
      { changes: { 'patient.firstName': 'Grace' }, source: 'form' },
    ]);
    // Typing into a bound field doesn't move the user on
    expect(form.current!.currentPage).toBe(0);
  });

  test('rules can read external keys', () => {
    const form = mount(createExternalStore({ 'patient.weight': 180 }));
    expect(form.current!.evaluateCondition('patient.weight > 150')).toBe(true);
    expect(form.current!.evaluateCondition('patient.weight > 200')).toBe(false);
  });

  test('navigation rules can branch on external keys', () => {
    const store = createExternalStore({ 'patient.state': 'CA' });
    const branching = {
      ...survey,
      rootNode: {
        ...survey.rootNode,
        items: [
          { type: 'textfield', uuid: 'b-a', fieldName: 'a', navigationRules: [{ condition: 'patient.state == "CA"', target: 'b-c' }] },
          { type: 'textfield', uuid: 'b-b', fieldName: 'b' },
          { type: 'textfield', uuid: 'b-c', fieldName: 'c' },
        ],
      },
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
        <SurveyFormProvider surveyData={branching as any} external={{ store }}>
          <Probe />
        </SurveyFormProvider>
      )
    );
    act(() => probe.current!.goToNextBlock({ a: 'x' }));
    expect(probe.current!.currentPage).toBe(2);
  });
});

describe('external fields in the builder', () => {
  test('rule editors list external keys after block fields, and custom fields receive them', async () => {
    const { SurveyBuilderProvider, useSurveyBuilder } = await import('../src/context/SurveyBuilderContext');
    const { GlobalCustomFields } = await import('../src/builder/common/GlobalCustomFields');
    const externalFields = [{ key: 'patient.firstName' }, { key: 'patient.gender', options: [{ label: 'Female', value: 'female' }] }];
    let listed: string[] = [];
    let received: any = null;
    const Probe = () => {
      listed = useSurveyBuilder().getAvailableFieldsUptoCurrent('b-contact');
      return (
        <GlobalCustomFields
          data={blocks[0]}
          customFields={[{ key: 'patientMapping', label: 'Map', component: props => { received = props; return null; } }]}
        />
      );
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <SurveyBuilderProvider initialData={{ rootNode: survey.rootNode as any }} externalFields={externalFields}>
          <Probe />
        </SurveyBuilderProvider>
      )
    );
    expect(listed).toEqual(['firstName', 'contact', 'patient.firstName', 'patient.gender']);
    expect(received.fieldNames).toEqual(['firstName']);
    expect(received.externalFields).toBe(externalFields);
  });
});
