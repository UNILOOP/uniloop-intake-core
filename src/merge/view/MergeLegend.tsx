import { useMergeActions } from './MergeContext';

/** What the colours on the canvas mean, with the toggle for paths that were not taken. */
export const MergeLegend = ({ showDeclined, onShowDeclined }: { showDeclined: boolean; onShowDeclined: (value: boolean) => void }) => {
  const { labels } = useMergeActions();
  const rows: Array<{ swatch: string; text: string }> = [
    { swatch: 'bg-emerald-500', text: `New from ${labels.incoming}` },
    { swatch: 'bg-amber-400', text: 'Changed' },
    { swatch: 'bg-rose-400', text: `Removed by ${labels.incoming}` },
    { swatch: 'bg-sky-400', text: 'Moved' },
  ];
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 w-56 rounded-lg border border-slate-200 bg-white/95 p-2.5 text-[11px] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.text} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.swatch}`} />
            {row.text}
          </li>
        ))}
        <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <span className="h-0 w-2.5 shrink-0 border-t-2 border-dashed border-rose-400" /> Removed path
        </li>
        <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <span className="h-0 w-2.5 shrink-0 border-t-2 border-dashed border-slate-400" /> Path not taken
        </li>
      </ul>
      <label className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={showDeclined} onChange={(event) => onShowDeclined(event.target.checked)} /> Show what was not taken
      </label>
    </div>
  );
};
