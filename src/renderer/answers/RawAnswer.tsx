import { Badge } from '../../components/ui/badge';
import { AnswerText, BooleanAnswer, NotProvided, isEmptyAnswer } from './AnswerText';

const asText = (value: unknown) => (typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));

/**
 * Shows a saved value as it is, for blocks without an answer view: a list as
 * badges, true or false as Yes or No, an object as JSON, anything else as text.
 */
export function RawAnswer({ value }: { value: unknown }) {
  if (isEmptyAnswer(value)) return <NotProvided />;
  if (Array.isArray(value)) {
    const repeats = new Map<string, number>();
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item) => {
          const text = asText(item);
          const repeat = (repeats.get(text) ?? 0) + 1;
          repeats.set(text, repeat);
          return (
            <Badge key={`${text}-${repeat}`} variant="outline">
              {text}
            </Badge>
          );
        })}
      </div>
    );
  }
  if (typeof value === 'boolean') return <BooleanAnswer value={value} />;
  if (typeof value === 'object') {
    return (
      <AnswerText>
        <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
      </AnswerText>
    );
  }
  return <span className="text-sm">{String(value)}</span>;
}
