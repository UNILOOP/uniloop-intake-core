import type React from 'react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export interface AnswerGridProps {
  rows: Array<{ id: string; label: React.ReactNode }>;
  columns: Array<{ id?: string; label: React.ReactNode; value: unknown }>;
  /** The picked column value per row id */
  value: Record<string, unknown>;
  className?: string;
}

/**
 * Rows down the side and options across the top, with the picked option marked
 * in each row. A saved row or value the form no longer has is shown as saved.
 */
export function AnswerGrid({ rows, columns, value, className }: AnswerGridProps) {
  const rowIds = new Set(rows.map((row) => row.id));
  const allRows = [
    ...rows,
    ...Object.keys(value)
      .filter((id) => !rowIds.has(id))
      .map((id) => ({ id, label: id })),
  ];
  const columnValues = new Set(columns.map((column) => String(column.value)));

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2" />
            {columns.map((column, index) => (
              <th
                key={column.id ?? `${String(column.value)}-${index}`}
                className="p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allRows.map((row) => {
            const saved = value[row.id];
            const picked = saved === undefined || saved === null || saved === '' ? undefined : String(saved);
            return (
              <tr key={row.id} className="border-t">
                <td className="p-2">
                  <span>{row.label}</span>
                  {picked !== undefined && !columnValues.has(picked) && (
                    <Badge variant="default" className="ml-2">
                      {picked}
                    </Badge>
                  )}
                </td>
                {columns.map((column, index) => {
                  const selected = picked === String(column.value);
                  return (
                    <td key={column.id ?? `${String(column.value)}-${index}`} className="p-2 text-center">
                      <span
                        role="img"
                        aria-label={selected ? 'Picked' : 'Not picked'}
                        className={cn(
                          'inline-block h-4 w-4 rounded-full border',
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
