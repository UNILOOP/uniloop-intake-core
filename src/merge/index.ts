export type {
  BlockDiffEntry,
  BlockStatus,
  ChangeCategory,
  ChangeOrigin,
  ContainerEntry,
  DiffOptions,
  DiffSummary,
  HunkKind,
  HunkMeta,
  MergeDecisions,
  MergeHunk,
  MergeIssue,
  MergeSide,
  SurveyDiff,
  SurveySnapshot,
} from './types';
export { diffSurveys, unionOrder } from './diff';
export { applyMergeDecisions } from './merge';
export { validateMergedSurvey, LOCKED_IDENTITY_KEYS } from './validate';
export { summarizeDiff, describeSummary } from './summary';
export { resolveDecision, defaultDecisions, bulkDecisions, cascadeDecision, unresolvedConflicts } from './decisions';
export { blockTitle, optionList, describeOptions, optionsChangeText, describeNavRule, keyLabel } from './describe';
export type { OptionItem, OptionsChange } from './describe';
export { collectSurvey, flatBlocks, ROOT_KEY } from './collect';
export type { BlockLocation } from './collect';
export { categorizeKey, originOf, defaultFor } from './fields';
export { diffWords } from './textDiff';
export type { DiffSegment } from './textDiff';
export { stableStringify, isEqual } from './utils';
