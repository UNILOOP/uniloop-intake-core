import { describe, expect, test } from 'bun:test';
import {
  DuplicateFieldNameError,
  assertUniqueFieldNames,
  describeFieldNameUse,
  findDuplicateFieldNames,
} from '../src/utils/duplicateFieldNames';
import type { BlockData } from '../src/types';

const symptoms: BlockData = {
  type: 'symptomCheck',
  fieldName: 'symptoms',
  label: 'Your symptoms',
  outputFields: {
    frequency: { fieldName: 'symptomDetail', question: 'How often?' },
    severity: { fieldName: 'symptomDetail', question: 'How severe?' },
  },
};

describe('duplicate field names', () => {
  test('two mapped keys sharing a name each show their own question', () => {
    const [duplicate] = findDuplicateFieldNames([symptoms]);
    expect(duplicate.fieldName).toBe('symptomDetail');
    expect(duplicate.uses.map(describeFieldNameUse)).toEqual(['How often?', 'How severe?']);
    expect(() => assertUniqueFieldNames([symptoms])).toThrow(
      'Used more than once: "symptomDetail" ("How often?", "How severe?")'
    );
  });

  test('a mapped key without a question falls back to the block label and its key', () => {
    const block: BlockData = {
      ...symptoms,
      outputFields: { frequency: { fieldName: 'symptomDetail' }, severity: { fieldName: 'symptomDetail' } },
    };
    expect(findDuplicateFieldNames([block])[0].uses.map(describeFieldNameUse)).toEqual([
      'Your symptoms (frequency)',
      'Your symptoms (severity)',
    ]);
  });

  test('a block field and another block\'s mapped key name both questions', () => {
    const other: BlockData = { type: 'radio', fieldName: 'symptomDetail', label: 'Any detail?' };
    const block: BlockData = { ...symptoms, outputFields: { severity: { fieldName: 'symptomDetail', question: 'How severe?' } } };
    try {
      assertUniqueFieldNames([other, block]);
      throw new Error('expected a DuplicateFieldNameError');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateFieldNameError);
      expect((error as DuplicateFieldNameError).duplicates[0].uses.map(describeFieldNameUse)).toEqual([
        'Any detail?',
        'How severe?',
      ]);
    }
  });

  test('a form with unique names passes', () => {
    const block: BlockData = {
      ...symptoms,
      outputFields: { frequency: { fieldName: 'symptomFrequency' }, severity: { fieldName: 'symptomSeverity' } },
    };
    expect(findDuplicateFieldNames([block])).toEqual([]);
    expect(() => assertUniqueFieldNames([block])).not.toThrow();
  });
});
