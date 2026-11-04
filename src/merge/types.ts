import type { BlockData, BlockDefinition, LocalizationMap, NodeData, ThemeDefinition } from '../types';

/** A whole survey as the builder exports it and the renderer takes it. */
export interface SurveySnapshot {
  rootNode: NodeData;
  localizations?: LocalizationMap;
  theme?: ThemeDefinition;
  [key: string]: unknown;
}

/** Which side a change is taken from. */
export type MergeSide = 'current' | 'incoming';

/**
 * Who made a change, when a base is known: the incoming side only, the current
 * side only, both (a conflict), or unknown when there is no base to compare with.
 */
export type ChangeOrigin = 'incoming' | 'current' | 'both' | 'unknown';

export type ChangeCategory =
  | 'block'
  | 'text'
  | 'options'
  | 'navigation'
  | 'validation'
  | 'visibility'
  | 'identity'
  | 'abTest'
  | 'lock'
  | 'order'
  | 'placement'
  | 'settings'
  | 'localization'
  | 'theme'
  | 'survey';

export type HunkKind =
  | 'block-added'
  | 'block-removed'
  | 'block-field'
  | 'page-added'
  | 'page-removed'
  | 'page-field'
  | 'order'
  | 'placement'
  | 'localization'
  | 'theme'
  | 'survey-field'
  | 'section-added'
  | 'section-removed'
  | 'section-field'
  | 'section-placement'
  | 'section-order';

export type BlockStatus = 'unchanged' | 'added' | 'removed' | 'changed' | 'moved';

/** How a field hunk is applied to a block. */
export interface HunkMeta {
  kind: 'key' | 'options' | 'next' | 'navRule' | 'validationRule';
  /** The block key for `key` hunks */
  key?: string;
  /** The rule identity for rule hunks */
  ruleKey?: string;
  sectionKey?: string;
  change?: 'added' | 'removed' | 'changed';
  currentRule?: unknown;
  incomingRule?: unknown;
  /** Readable renderings of each side, for rule and next-step hunks */
  currentText?: string;
  incomingText?: string;
}

/** One decidable difference between the two sides. */
export interface MergeHunk {
  id: string;
  kind: HunkKind;
  category: ChangeCategory;
  /** The block or page entry this belongs to (its diff key); a container key for order hunks */
  blockKey?: string;
  /** The field path inside the block, e.g. `label`, `options`, `navigationRules` */
  path?: string;
  label: string;
  detail?: string;
  current?: unknown;
  incoming?: unknown;
  base?: unknown;
  origin: ChangeOrigin;
  conflict: boolean;
  /** Forced to incoming by the block's lock; the decision can't be flipped */
  locked: boolean;
  defaultDecision: MergeSide;
  meta?: HunkMeta;
}

export interface BlockDiffEntry {
  /** Stable key used by hunks and decisions: the uuid when the block has one */
  key: string;
  currentUuid?: string;
  incomingUuid?: string;
  isPage: boolean;
  type: string;
  fieldName?: string;
  title: string;
  status: BlockStatus;
  matchedBy?: 'uuid' | 'fieldName' | 'name';
  locked: boolean;
  /** For added and removed entries: who added or removed the block */
  origin: ChangeOrigin;
  /** Canonical container key on the current side (or incoming side for added entries) */
  containerKey: string;
  /** Canonical container key on the incoming side, when the block exists there */
  incomingContainerKey?: string;
  currentIndex?: number;
  incomingIndex?: number;
  current?: BlockData;
  incoming?: BlockData;
  base?: BlockData;
  /** Keys of the entries inside this page, in display order */
  childKeys?: string[];
  hunks: MergeHunk[];
}

export interface ContainerEntry {
  key: string;
  kind: 'root' | 'section' | 'page';
  name: string;
  parentKey?: string;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  moved: number;
  unchanged: number;
  conflicts: number;
  locked: number;
  hunks: number;
  byCategory: Partial<Record<ChangeCategory, number>>;
}

export interface SurveyDiff {
  mode: 'two-way' | 'three-way';
  current: SurveySnapshot;
  incoming: SurveySnapshot;
  base?: SurveySnapshot;
  /** Every block and page, in display order; a page is followed by its blocks */
  blocks: BlockDiffEntry[];
  containers: Record<string, ContainerEntry>;
  /** Every hunk, block-level ones included */
  hunks: MergeHunk[];
  summary: DiffSummary;
}

/** Explicit decisions by hunk id; a hunk without one uses its default. */
export type MergeDecisions = Record<string, MergeSide>;

export interface MergeIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  blockKey?: string;
}

export interface DiffOptions {
  /** The version both sides started from, when known; enables three-way origins */
  base?: SurveySnapshot | null;
  definitions?: Record<string, BlockDefinition>;
  /** `current` keeps the current theme by default whatever changed; `auto` follows the origin */
  themeDefault?: 'auto' | 'current';
}
