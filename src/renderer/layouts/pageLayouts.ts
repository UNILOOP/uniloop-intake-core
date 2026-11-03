import type { PageLayoutDefinition } from '../../types';

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
}

// Helper function to unregister a page layout
export function unregisterPageLayout(name: string): void {
  delete pageLayoutRegistry[name];
}
