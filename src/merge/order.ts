import type { BlockDiffEntry } from './types';

export interface SideOrders {
  /** Entry keys per canonical container, in current-side order */
  currentOrder: Map<string, string[]>;
  /** Entry keys per canonical container, in incoming-side order */
  incomingOrder: Map<string, string[]>;
}

const orderBy = (
  entries: BlockDiffEntry[],
  index: 'currentIndex' | 'incomingIndex',
  container: (entry: BlockDiffEntry) => string | undefined
): Map<string, string[]> => {
  const groups = new Map<string, BlockDiffEntry[]>();
  for (const entry of entries) {
    const containerKey = container(entry);
    if (entry[index] === undefined || !containerKey) continue;
    const group = groups.get(containerKey) ?? [];
    group.push(entry);
    groups.set(containerKey, group);
  }
  const orders = new Map<string, string[]>();
  for (const [containerKey, group] of groups) {
    orders.set(
      containerKey,
      [...group].sort((a, b) => (a[index] ?? 0) - (b[index] ?? 0)).map((entry) => entry.key)
    );
  }
  return orders;
};

export function sideOrders(entries: BlockDiffEntry[]): SideOrders {
  return {
    currentOrder: orderBy(entries, 'currentIndex', (entry) => (entry.current ? entry.containerKey : undefined)),
    incomingOrder: orderBy(entries, 'incomingIndex', (entry) => entry.incomingContainerKey),
  };
}
