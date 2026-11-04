/**
 * Merge entry point: compare two versions of a form and build a third from them.
 *
 * @example
 * import { SurveyMergeView, diffSurveys, applyMergeDecisions } from '@/packages/survey-form-package/src/merge';
 */
export * from './merge/index';
export { SurveyMergeView } from './merge/view/SurveyMergeView';
export type { SurveyMergeViewProps, MergeTab } from './merge/view/SurveyMergeView';
export type { MergeView } from './merge/view/MergeTopBar';
export { useSurveyMerge } from './merge/view/useSurveyMerge';
export type { UseSurveyMergeOptions, SurveyMergeState } from './merge/view/useSurveyMerge';
export { entryStatus } from './merge/view/entryStatus';
export type { MergeNodeData, MergeEdgeData, MergeFlowNode, MergeFlowEdge } from './merge/view/mergeGraph';
export type { MergeLabels } from './merge/view/MergeContext';
export type { NodeStatus, EdgeStatus } from './merge/view/status';
