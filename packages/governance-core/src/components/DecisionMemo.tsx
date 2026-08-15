import { useRef } from 'react';
import { Button, Card } from './Ui';

export interface MemoLine {
  label: string;
  value: string;
}

/**
 * Renders a plain-text summary the user can copy or print. Deliberately
 * has no "send" / "email" / "submit" action -- getting the memo out of
 * the app and to a professional or counterparty is a human step.
 */
export function DecisionMemo({ title, assumptions, lines, notes }: { title: string; assumptions: MemoLine[]; lines: MemoLine[]; notes?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const copyToClipboard = async () => {
    const text = [
      title,
      '',
      'Assumptions:',
      ...assumptions.map((a) => `- ${a.label}: ${a.value}`),
      '',
      'Summary:',
      ...lines.map((l) => `- ${l.label}: ${l.value}`),
      ...(notes && notes.length ? ['', 'Notes:', ...notes.map((n) => `- ${n}`)] : []),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard permission denied -- user can still select/copy manually
    }
  };

  return (
    <Card
      title="Decision memo (draft)"
      subtitle="Copy this into your own notes, or print it. Nothing here is sent anywhere automatically."
      right={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyToClipboard}>
            Copy to clipboard
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      }
    >
      <div ref={ref} className="text-sm space-y-4">
        <h4 className="font-semibold">{title}</h4>
        <div>
          <p className="font-medium text-neutral-700 mb-1">Assumptions</p>
          <ul className="list-disc pl-5 space-y-0.5 text-neutral-600">
            {assumptions.map((a, i) => (
              <li key={i}>
                {a.label}: <span className="font-medium text-neutral-900">{a.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-neutral-700 mb-1">Summary</p>
          <ul className="list-disc pl-5 space-y-0.5 text-neutral-600">
            {lines.map((l, i) => (
              <li key={i}>
                {l.label}: <span className="font-medium text-neutral-900">{l.value}</span>
              </li>
            ))}
          </ul>
        </div>
        {notes && notes.length > 0 && (
          <div>
            <p className="font-medium text-neutral-700 mb-1">Notes</p>
            <ul className="list-disc pl-5 space-y-0.5 text-neutral-600">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
