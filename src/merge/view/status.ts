import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpDown,
  Blocks,
  Eye,
  FileText,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Languages,
  ListChecks,
  Lock,
  Move,
  Palette,
  Settings2,
  ShieldCheck,
  Type,
} from 'lucide-react';
import type { ChangeOrigin, MergeHunk } from '../types';
import type { MergeLabels } from './MergeContext';

export type NodeStatus = 'unchanged' | 'changed' | 'added' | 'removed' | 'moved' | 'declined-add' | 'kept-removed';
export type EdgeStatus = 'kept' | 'added' | 'removed' | 'declined';

export const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  unchanged: 'Same',
  changed: 'Changed',
  added: 'New',
  removed: 'Removed',
  moved: 'Moved',
  'declined-add': 'Not added',
  'kept-removed': 'Kept',
};

/** Stripe, badge and dot classes per node status, readable in light and dark mode. */
export const NODE_STATUS_CLASSES: Record<NodeStatus, { stripe: string; badge: string; dot: string }> = {
  unchanged: { stripe: 'border-l-slate-300 dark:border-l-slate-600', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  changed: { stripe: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200', dot: 'bg-amber-400' },
  added: { stripe: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200', dot: 'bg-emerald-500' },
  removed: { stripe: 'border-l-rose-400', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200', dot: 'bg-rose-400' },
  moved: { stripe: 'border-l-sky-400', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200', dot: 'bg-sky-400' },
  'declined-add': { stripe: 'border-l-emerald-300', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-300' },
  'kept-removed': { stripe: 'border-l-rose-300', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-300' },
};

export const EDGE_COLORS: Record<EdgeStatus, { light: string; dark: string; dashed: boolean }> = {
  kept: { light: '#94a3b8', dark: '#64748b', dashed: false },
  added: { light: '#10b981', dark: '#34d399', dashed: false },
  removed: { light: '#f43f5e', dark: '#fb7185', dashed: true },
  declined: { light: '#a3a3a3', dark: '#737373', dashed: true },
};

/** Who changed a hunk, in the host's words for each side. */
export const originText = (origin: ChangeOrigin, labels: MergeLabels): string => {
  if (origin === 'incoming') return `${labels.incoming} changed this`;
  if (origin === 'current') return 'You changed this';
  if (origin === 'both') return 'Both changed this';
  return 'Differs';
};

export const ORIGIN_CLASSES: Record<ChangeOrigin, string> = {
  incoming: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  current: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  both: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const CATEGORY_LABEL: Record<string, string> = {
  block: 'Block',
  text: 'Text',
  options: 'Options',
  navigation: 'Paths',
  validation: 'Validation',
  visibility: 'Visibility',
  identity: 'Field',
  abTest: 'A/B test',
  lock: 'Lock',
  order: 'Order',
  placement: 'Page',
  settings: 'Settings',
  localization: 'Translation',
  theme: 'Theme',
  survey: 'Form',
};

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  block: Blocks,
  text: Type,
  options: ListChecks,
  navigation: GitBranch,
  validation: ShieldCheck,
  visibility: Eye,
  identity: Fingerprint,
  abTest: FlaskConical,
  lock: Lock,
  order: ArrowUpDown,
  placement: Move,
  settings: Settings2,
  localization: Languages,
  theme: Palette,
  survey: FileText,
};

export const isDecidable = (hunk: MergeHunk): boolean => !hunk.locked;

/** The change chips a block shows on the canvas: one per category, in a fixed order. */
export const changeChips = (hunks: MergeHunk[]): string[] => {
  const order = ['text', 'options', 'navigation', 'validation', 'visibility', 'identity', 'abTest', 'lock', 'placement', 'settings'];
  const present = new Set(hunks.map((hunk) => hunk.category));
  return order.filter((category) => present.has(category as MergeHunk['category'])).map((category) => CATEGORY_LABEL[category]);
};
