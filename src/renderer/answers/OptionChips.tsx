import type React from 'react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export interface OptionChoice {
  id?: string;
  label: React.ReactNode;
  value: unknown;
}

export interface OptionChipsProps {
  options: OptionChoice[];
  /** The picked value, or a list of them */
  value: unknown;
  className?: string;
}

/** A block's options as `OptionChoice`s, reading `label`, or `text` as Matrix columns use. */
export function toOptionChoices(options: unknown): OptionChoice[] {
  if (!Array.isArray(options)) return [];
  return options.map((option) =>
    option && typeof option === 'object'
      ? { id: option.id, label: option.label ?? option.text ?? String(option.value), value: option.value }
      : { label: String(option), value: option }
  );
}

/**
 * Every option as a badge, the picked ones filled and the rest faded. A picked
 * value that isn't an option any more is added as it was saved, so no answer
 * is hidden when the form changes.
 */
export function OptionChips({ options, value, className }: OptionChipsProps) {
  const values = Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value];
  const picked = values.map(String);
  const known = new Set(options.map((option) => String(option.value)));
  const unknown = picked.filter((item) => !known.has(item));

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option, index) => {
        const selected = picked.includes(String(option.value));
        return (
          <Badge
            key={option.id ?? `${String(option.value)}-${index}`}
            variant={selected ? 'default' : 'outline'}
            className={selected ? undefined : 'opacity-40'}
          >
            {option.label}
          </Badge>
        );
      })}
      {unknown.map((item) => (
        <Badge key={`saved-${item}`} variant="default">
          {item}
        </Badge>
      ))}
    </div>
  );
}
