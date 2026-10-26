import type React from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

/** A text answer in a grey box, keeping its line breaks. */
export function AnswerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('whitespace-pre-wrap rounded-md bg-muted p-3 text-sm', className)}>{children}</div>;
}

/** Shown for a question with no answer. */
export function NotProvided() {
  return <span className="text-sm text-muted-foreground">Not provided</span>;
}

/** A true or false answer as a Yes or No badge. */
export function BooleanAnswer({ value }: { value: boolean }) {
  return value ? (
    <Badge variant="default">
      <Check className="mr-1 h-3 w-3" /> Yes
    </Badge>
  ) : (
    <Badge variant="secondary">
      <X className="mr-1 h-3 w-3" /> No
    </Badge>
  );
}

/** Whether a saved value counts as no answer: nothing, an empty string, list or object. */
export function isEmptyAnswer(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value as object).length === 0;
  }
  return false;
}
