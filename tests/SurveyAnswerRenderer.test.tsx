import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { registerBlock, unregisterBlock } from '../src/blocks';
import { SurveyAnswerRenderer, type SurveyAnswerRendererProps } from '../src/renderer/answers';
import type { AnswerViewProps, BlockData, BlockDefinition } from '../src/types';

const symptomsBlock: BlockDefinition = {
  type: 'testSymptoms',
  name: 'Symptoms',
  description: 'A block whose answer is an object',
  icon: null,
  defaultData: { type: 'testSymptoms', fieldName: 'symptoms' },
  renderItem: () => null,
  renderBlock: () => null,
  outputSchema: {
    type: 'object',
    properties: {
      frequency: {
        type: 'string',
        description: 'How often?',
        options: [
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
        ],
      },
      severity: {
        type: 'string',
        options: [
          { label: 'Mild', value: 'mild' },
          { label: 'Severe', value: 'severe' },
        ],
      },
    },
  },
  // A view with a hook, which throws on an answer without a frequency
  answerView: ({ value }: AnswerViewProps) => {
    const [label] = React.useState('Reported');
    if (!value?.frequency) throw new Error('no frequency');
    return <span>{`${label}: ${value.frequency}`}</span>;
  },
};

const symptoms: BlockData = {
  type: 'testSymptoms',
  uuid: 'b1',
  fieldName: 'symptoms',
  label: 'Your symptoms',
  outputFields: {
    frequency: { fieldName: 'symptomFrequency' },
    severity: { fieldName: 'symptomSeverity', question: 'How severe?' },
  },
};

let root: Root | undefined;
let container: HTMLElement;

function render(props: SurveyAnswerRendererProps) {
  act(() => {
    if (!root) {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    }
    root.render(<SurveyAnswerRenderer {...props} />);
  });
  return container.textContent ?? '';
}

beforeAll(() => registerBlock(symptomsBlock));
afterAll(() => unregisterBlock(symptomsBlock.type));

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
});

describe('SurveyAnswerRenderer', () => {
  test('shows a registered block\'s answer view without blockDefinitions', () => {
    const text = render({ form: [symptoms], answers: { symptoms: { frequency: 'daily' } } });
    expect(text).toContain('Your symptoms');
    expect(text).toContain('Reported: daily');
  });

  test('shows mapped-only answers with their questions and option labels', () => {
    const text = render({
      form: [symptoms],
      answers: { symptomFrequency: 'weekly', symptomSeverity: 'severe' },
    });
    expect(text).not.toContain('No responses recorded.');
    expect(text).not.toContain('Your symptoms');
    expect(text).toContain('How often?');
    expect(text).toContain('How severe?');
    expect(text).toContain('Weekly');
    expect(text).toContain('Severe');
    expect(text).not.toContain('weekly');
  });

  test('lists each mapped key after its block, read from the block\'s answer', () => {
    const text = render({ form: [symptoms], answers: { symptoms: { frequency: 'daily', severity: 'mild' } } });
    const order = ['Your symptoms', 'Reported: daily', 'How often?', 'Daily', 'How severe?', 'Mild'].map((part) =>
      text.indexOf(part)
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('uses option labels saved with the form when the block definition has none', () => {
    const saved: BlockData = {
      ...symptoms,
      type: 'unknownSymptoms',
      outputFields: {
        severity: { fieldName: 'symptomSeverity', question: 'How severe?', options: [{ label: 'Severe', value: 'level3' }] },
      },
    };
    const text = render({ form: [saved], answers: { symptomSeverity: 'level3' } });
    expect(text).toContain('How severe?');
    expect(text).toContain('Severe');
    expect(text).not.toContain('level3');
  });

  test('gives a failed answer view another try when the answer changes', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const broken = render({ form: [symptoms], answers: { symptoms: { severity: 'mild' } } });
      expect(broken).not.toContain('Reported');
      expect(broken).toContain('"severity": "mild"');

      const fixed = render({ form: [symptoms], answers: { symptoms: { frequency: 'weekly' } } });
      expect(fixed).toContain('Reported: weekly');
      expect(fixed).not.toContain('"frequency"');
    } finally {
      error.mockRestore();
    }
  });

  test('gives a failed answer view another try when the view changes', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const answers = { symptoms: { severity: 'mild' } };
      expect(render({ form: [symptoms], answers })).not.toContain('Reported');

      const fixedView = { ...symptomsBlock, answerView: () => <span>Fixed view</span> };
      expect(render({ form: [symptoms], answers, blockDefinitions: { testSymptoms: fixedView } })).toContain(
        'Fixed view'
      );
    } finally {
      error.mockRestore();
    }
  });
});

