import { useSyncExternalStore } from 'react';
import type { PageLayoutDefinition, PageOverrides } from '../../types';

// Registry of page layouts: how a page step places its blocks
export const pageLayoutRegistry: Record<string, PageLayoutDefinition> = {
  stacked: {
    name: 'stacked',
    label: 'Stacked',
    description: 'Every visible block, one under the other',
    component: ({ renderBlocks }) => renderBlocks(),
  },
};

// Helper function to get a page layout definition by name
export function getPageLayoutDefinition(name: string): PageLayoutDefinition | undefined {
  return pageLayoutRegistry[name];
}

// Helper function to get all page layout definitions
export function getAllPageLayoutDefinitions(): PageLayoutDefinition[] {
  return Object.values(pageLayoutRegistry);
}

// Helper function to register a page layout
export function registerPageLayout(layout: PageLayoutDefinition): void {
  pageLayoutRegistry[layout.name] = layout;
  // A layout registered again is tried again in place of the pages it overrides
  clearPageOverrideFailures(layout.name);
}

// Helper function to unregister a page layout
export function unregisterPageLayout(name: string): void {
  delete pageLayoutRegistry[name];
}

const warnedOverrides = new Set<string>();

// Overrides that have thrown while rendering, as "name->overrideName".
const failedOverrides = new Set<string>();
const failureListeners = new Set<() => void>();
let failureVersion = 0;

function notifyFailureListeners() {
  failureVersion++;
  for (const listener of failureListeners) listener();
}

function subscribeToFailures(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

const getFailureVersion = () => failureVersion;

/**
 * Re-renders the calling component when a page override fails or is
 * registered again, so it resolves the page's layout afresh.
 */
export function usePageOverrideFailures(): number {
  return useSyncExternalStore(subscribeToFailures, getFailureVersion, getFailureVersion);
}

/** Records that `overrideName` threw in place of `name`. Returns false if it was already recorded. */
export function markPageOverrideFailed(name: string, overrideName: string): boolean {
  const key = `${name}->${overrideName}`;
  if (failedOverrides.has(key)) return false;
  failedOverrides.add(key);
  notifyFailureListeners();
  return true;
}

function clearPageOverrideFailures(overrideName: string): void {
  let cleared = false;
  for (const key of failedOverrides) {
    if (key.endsWith(`->${overrideName}`)) {
      failedOverrides.delete(key);
      cleared = true;
    }
  }
  if (cleared) notifyFailureListeners();
}

/**
 * The layout that draws pages saved as `name`: the one `overrides` maps it to,
 * else the one registered as `name`. `system` is the one registered as `name`,
 * which draws the page if the override throws. An override that isn't
 * registered is warned about once and left out, and one that has thrown is
 * left out until it is registered again.
 */
export function resolvePageLayout(
  name: string | undefined,
  overrides?: PageOverrides
): { definition?: PageLayoutDefinition; system?: PageLayoutDefinition; overrideName?: string } {
  if (!name) return {};
  const system = getPageLayoutDefinition(name);
  const overrideName = overrides && Object.prototype.hasOwnProperty.call(overrides, name) ? overrides[name] : undefined;
  if (!overrideName) return { definition: system, system };
  const override = getPageLayoutDefinition(overrideName);
  if (!override) {
    const key = `${name}->${overrideName}`;
    if (!warnedOverrides.has(key)) {
      warnedOverrides.add(key);
      console.warn(`[pageOverrides] "${overrideName}" isn't registered, so "${name}" pages use the system page.`);
    }
    return { definition: system, system };
  }
  if (failedOverrides.has(`${name}->${overrideName}`)) return { definition: system, system };
  return { definition: override, system, overrideName };
}

/** Whether `name` only stands in for another page, so the builder doesn't offer it. */
export function isPageOverrideTarget(name: string, overrides?: PageOverrides): boolean {
  return !!overrides && Object.values(overrides).includes(name);
}
