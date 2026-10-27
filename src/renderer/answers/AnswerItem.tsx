import type React from 'react';
import { Badge } from '../../components/ui/badge';

export interface AnswerItemProps {
  question: React.ReactNode;
  description?: React.ReactNode;
  /** Shown as a tag beside the question when given */
  blockType?: string;
  children: React.ReactNode;
  className?: string;
}

/** One answer: the question, its description, then the answer indented. */
export function AnswerItem({ question, description, blockType, children, className }: AnswerItemProps) {
  return (
    <div className={className}>
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{question}</p>
          {blockType && (
            <Badge variant="secondary" className="font-normal">
              {blockType}
            </Badge>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="pl-4">{children}</div>
    </div>
  );
}
