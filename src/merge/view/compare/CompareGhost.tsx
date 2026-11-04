import type { Node, NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { COMPARE_NODE_WIDTH, type CompareGhostData } from './compareColumns';

/** Keeps a row aligned in a column that has no such block. */
const CompareGhostInner = ({ data }: NodeProps<Node<CompareGhostData>>) => (
  <div
    style={{ width: COMPARE_NODE_WIDTH, height: data.height }}
    className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-transparent text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500"
  >
    {data.text}
  </div>
);

export const CompareGhost = memo(CompareGhostInner);
CompareGhost.displayName = 'CompareGhost';
