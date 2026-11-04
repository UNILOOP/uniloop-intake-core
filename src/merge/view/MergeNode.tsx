import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { AlertTriangle, CircleDot, FileText, Lock } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../lib/utils';
import { useMergeActions } from './MergeContext';
import type { MergeNodeData, MergeTerminalData } from './mergeGraph';
import { NODE_STATUS_CLASSES, NODE_STATUS_LABEL } from './status';

const stop = (event: React.MouseEvent) => event.stopPropagation();

const MergeNodeInner = ({ data, selected }: NodeProps<Node<MergeNodeData>>) => {
  const { decide, labels, readOnly, select, highlightedPath } = useMergeActions();
  const classes = NODE_STATUS_CLASSES[data.status];
  const ghost = !data.present;
  const onPath = !!highlightedPath && (highlightedPath.source === data.entryKey || highlightedPath.target === data.entryKey);
  const change = data.optionsChange;
  const addLike = data.status === 'added' || data.status === 'declined-add';

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900',
        data.compact ? 'w-[300px]' : 'w-[340px]',
        classes.stripe,
        selected ? 'border-primary ring-2 ring-primary/20' : onPath ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-200 dark:border-slate-700',
        ghost && 'border-dashed opacity-75'
      )}
      data-entry-key={data.entryKey}
      data-status={data.status}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400 dark:!border-slate-900" />
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {data.isPage ? <FileText className="h-3.5 w-3.5" /> : data.icon || <CircleDot className="h-3.5 w-3.5" />}
        </span>
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{data.typeName}</span>
        <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold', classes.badge)}>{NODE_STATUS_LABEL[data.status]}</span>
        {data.locked && (
          <span className="inline-flex items-center rounded-full bg-slate-100 p-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300" title={`Locked by the provider: follows ${labels.incoming}`}>
            <Lock className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="space-y-2 px-3 pb-3 pt-1.5">
        <div className={cn('text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100', data.status === 'removed' && 'line-through decoration-rose-400')}>{data.title}</div>
        {data.fieldName && <code className="block truncate text-[11px] text-slate-400">{data.fieldName}</code>}
        {data.chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.chips.map((chip) => (
              <span key={chip} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {chip}
              </span>
            ))}
          </div>
        )}
        {change && (change.added.length > 0 || change.removed.length > 0 || change.renamed.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {change.added.map((option) => (
              <span key={`add-${option.value}`} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                + {option.label || option.value}
              </span>
            ))}
            {change.removed.map((option) => (
              <span key={`rm-${option.value}`} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700 line-through dark:bg-rose-900/40 dark:text-rose-300">
                {option.label || option.value}
              </span>
            ))}
            {change.renamed.map((item) => (
              <span key={`rn-${item.value}`} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {item.from} → {item.to}
              </span>
            ))}
          </div>
        )}
        {data.children && data.children.length > 0 && (
          <ul className="space-y-1 rounded-md bg-slate-50 p-2 dark:bg-slate-800/60">
            {data.children.map((child) => (
              <li key={child.key} className="flex items-center gap-2 text-xs">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', NODE_STATUS_CLASSES[child.status].dot)} />
                <button
                  type="button"
                  className="nodrag truncate text-left text-slate-700 hover:underline dark:text-slate-200"
                  onClick={(event) => {
                    stop(event);
                    select(child.key);
                  }}
                >
                  {child.title}
                </button>
                <span className="ml-auto shrink-0 text-[10px] text-slate-400">{NODE_STATUS_LABEL[child.status]}</span>
              </li>
            ))}
          </ul>
        )}
        {data.conflicts > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" /> {data.conflicts === 1 ? '1 change needs your decision' : `${data.conflicts} changes need your decision`}
          </div>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          {data.toggleHunkId && !readOnly ? (
            <div className="nodrag inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                aria-pressed={data.toggleSide === 'current'}
                title={addLike ? `Leave this block out of ${labels.current}` : `Keep this block in ${labels.current} even though ${labels.incoming} removed it`}
                className={cn('rounded-md px-2 py-1 font-medium', data.toggleSide === 'current' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300')}
                onClick={(event) => {
                  stop(event);
                  decide(data.toggleHunkId!, 'current');
                }}
              >
                {addLike ? "Don't add" : 'Keep it'}
              </button>
              <button
                type="button"
                aria-pressed={data.toggleSide === 'incoming'}
                title={addLike ? `Add this block to ${labels.current}, as in ${labels.incoming}` : `Remove this block from ${labels.current}, as ${labels.incoming} did`}
                className={cn('rounded-md px-2 py-1 font-medium', data.toggleSide === 'incoming' ? (addLike ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-slate-600 dark:text-slate-300')}
                onClick={(event) => {
                  stop(event);
                  decide(data.toggleHunkId!, 'incoming');
                }}
              >
                {addLike ? 'Add it' : 'Remove it'}
              </button>
            </div>
          ) : data.hunkCount > 0 ? (
            <button
              type="button"
              className="nodrag rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={(event) => {
                stop(event);
                select(data.entryKey);
              }}
            >
              Review {data.hunkCount} change{data.hunkCount === 1 ? '' : 's'}
            </button>
          ) : null}
          {data.locked && data.status !== 'unchanged' && <span className="text-[11px] text-slate-500 dark:text-slate-400">Follows {labels.incoming}</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400 dark:!border-slate-900" />
    </div>
  );
};

export const MergeNode = memo(MergeNodeInner);
MergeNode.displayName = 'MergeNode';

const MergeTerminalInner = ({ data }: NodeProps<Node<MergeTerminalData>>) => (
  <div
    className={cn(
      'rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm',
      data.kind === 'start'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
        : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
    )}
  >
    {data.kind === 'end' && <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400" />}
    {data.label}
    {data.kind === 'start' && <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400" />}
  </div>
);

export const MergeTerminal = memo(MergeTerminalInner);
MergeTerminal.displayName = 'MergeTerminal';
