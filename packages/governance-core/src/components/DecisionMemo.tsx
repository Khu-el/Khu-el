import { useState } from 'react';
import { apiPostBlob, ApiError, api } from '../api/client';
import { Button, Card } from './Ui';

export interface MemoLine {
  label: string;
  value: string;
}

/**
 * Renders a plain-text summary the user can copy, print, download as a
 * PDF, or email to their own account inbox. There is deliberately no way
 * to enter a different recipient here or anywhere in this component --
 * the backend's /api/memo/email endpoint hard-codes the recipient to the
 * signed-in user's own address, so getting this in front of a
 * professional or counterparty is still always a human, out-of-band step.
 */
export function DecisionMemo({ title, assumptions, lines, notes }: { title: string; assumptions: MemoLine[]; lines: MemoLine[]; notes?: string[] }) {
  const [pending, setPending] = useState<'pdf' | 'email' | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const memoText = () =>
    [
      title,
      '',
      'Assumptions:',
      ...assumptions.map((a) => `- ${a.label}: ${a.value}`),
      '',
      'Summary:',
      ...lines.map((l) => `- ${l.label}: ${l.value}`),
      ...(notes && notes.length ? ['', 'Notes:', ...notes.map((n) => `- ${n}`)] : []),
    ].join('\n');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(memoText());
    } catch {
      // clipboard permission denied -- user can still select/copy manually
    }
  };

  const downloadPdf = async () => {
    setPending('pdf');
    setStatus(null);
    try {
      const blob = await apiPostBlob('/api/memo/pdf', { title, assumptions, lines, notes });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60) || 'memo'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : 'Could not reach the backend to generate a PDF.');
    } finally {
      setPending(null);
    }
  };

  const emailToSelf = async () => {
    setPending('email');
    setStatus(null);
    try {
      const res = await api.post<{ sent: boolean; to: string }>('/api/memo/email', { title, assumptions, lines, notes });
      setStatus(`Sent to ${res.to}.`);
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : 'Could not reach the backend to send the email.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Card
      title="Decision memo (draft)"
      subtitle="Copy, print, download, or email a PDF to your own inbox. Nothing here can be sent to anyone but you."
      right={
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" onClick={copyToClipboard}>
            Copy to clipboard
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" onClick={downloadPdf} disabled={pending === 'pdf'}>
            {pending === 'pdf' ? 'Generating…' : 'Download PDF'}
          </Button>
          <Button variant="secondary" onClick={emailToSelf} disabled={pending === 'email'}>
            {pending === 'email' ? 'Sending…' : 'Email me this'}
          </Button>
        </div>
      }
    >
      {status && <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3">{status}</p>}
      <div className="text-sm space-y-4">
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
