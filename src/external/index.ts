import { useRef } from 'react';
import type { BlockData } from '../types';

/**
 * External fields: values that live outside the survey (a patient record, a CRM
 * contact, app state) but that rules can read and blocks can be bound to.
 *
 * The package knows nothing about where these values come from. The host:
 *  - lists the keys with `ExternalField` (builder pickers show them next to block fields),
 *  - holds the values in an `ExternalStore` (`createExternalStore` / `useExternalStore`),
 *  - says which block keys are bound to which external keys with an `ExternalSyncAdapter`.
 */

/** An external key that rules and bindings can refer to, e.g. `patient.firstName` */
export interface ExternalField {
  key: string;
  label?: string;
  description?: string;
  /** Value type, for editors that care (`string`, `number`, `boolean`, `date`, ...) */
  type?: string;
  /** Known values, offered as choices in rule value pickers */
  options?: Array<{ label: string; value: string }>;
  /** Heading to group keys under, e.g. "Patient" */
  group?: string;
}

/** Where a change to the external values came from */
export type ExternalChangeSource = 'host' | 'form';

export type ExternalValues = Record<string, any>;

export type ExternalListener = (
  values: ExternalValues,
  changes: ExternalValues,
  source: ExternalChangeSource
) => void;

/** A small subscribable store of external values, keyed by external key */
export interface ExternalStore {
  getSnapshot: () => ExternalValues;
  /** Merges `patch` in. Keys whose value didn't change are dropped; nothing fires if none changed. */
  setValues: (patch: ExternalValues, source?: ExternalChangeSource) => void;
  subscribe: (listener: ExternalListener) => () => void;
}

/** One internal key bound to one external key */
export interface ExternalBinding {
  /** A key the form saves: a block field name, a mapped output key, or `fieldName.<key>` */
  internalKey: string;
  externalKey: string;
  /** Defaults to `both` */
  direction?: 'both' | 'toInternal' | 'toExternal';
}

export interface ExternalSyncContext {
  values: Record<string, any>;
  externalValues: ExternalValues;
}

/**
 * Host-supplied logic that ties blocks to external keys. Every method is optional
 * except `getBindings`; the package calls these and never reads host-specific block data itself.
 */
export interface ExternalSyncAdapter {
  /** The bindings a block declares (read them from whatever the host's custom field saved) */
  getBindings: (block: BlockData) => ExternalBinding[];
  /** Converts an external value before it is saved under the internal key */
  toInternal?: (value: any, binding: ExternalBinding, block: BlockData) => any;
  /** Converts an internal value before it is written to the external key */
  toExternal?: (value: any, binding: ExternalBinding, block: BlockData) => any;
  /**
   * Whether the form moves past this block when the user reaches it going forward
   * (and steps over it going back). The block's answer is still validated first.
   */
  shouldSkipBlock?: (block: BlockData, context: ExternalSyncContext & { bindings: ExternalBinding[] }) => boolean;
}

/** Everything `SurveyForm` needs to work with external values */
export interface ExternalConfig {
  store: ExternalStore;
  sync?: ExternalSyncAdapter;
  /** Fires whenever external values change, from the host or from the form */
  onChange?: ExternalListener;
}

/** Value equality used to drop no-op updates */
export const isSameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export function createExternalStore(initial: ExternalValues = {}): ExternalStore {
  let values: ExternalValues = { ...initial };
  const listeners = new Set<ExternalListener>();

  return {
    getSnapshot: () => values,
    setValues(patch, source = 'host') {
      const changes: ExternalValues = {};
      for (const [key, value] of Object.entries(patch || {})) {
        if (!isSameValue(values[key], value)) changes[key] = value;
      }
      if (Object.keys(changes).length === 0) return;
      values = { ...values, ...changes };
      for (const listener of [...listeners]) {
        try {
          listener(values, changes, source);
        } catch (error) {
          console.error('[ExternalStore] listener failed:', error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Creates one external store for the life of the component. Update it with
 * `store.setValues(...)`: a mounted `SurveyForm` picks the change up in place.
 */
export function useExternalStore(initial?: ExternalValues): ExternalStore {
  const ref = useRef<ExternalStore | null>(null);
  if (!ref.current) ref.current = createExternalStore(initial);
  return ref.current;
}

/**
 * Builds the object rules evaluate against. Dotted keys become nested objects,
 * so `patient.firstName` resolves as a path (and never appears as a flat key,
 * which expression rules can't use as an identifier).
 */
export function toRuleContext(values: ExternalValues): Record<string, any> {
  const context: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    const parts = key.split('.');
    let target = context;
    for (const part of parts.slice(0, -1)) {
      const next = target[part];
      // Copy, so a host value that is itself an object is never mutated
      target[part] = next !== null && typeof next === 'object' && !Array.isArray(next) ? { ...next } : {};
      target = target[part];
    }
    target[parts[parts.length - 1]] = value;
  }
  return context;
}

/** True when a value counts as answered */
export function hasExternalValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
