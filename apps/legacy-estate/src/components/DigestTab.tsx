import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, Button, Card } from '@nte/governance-core';

interface DigestItem {
  appId: string;
  recordId: string;
  recordLabel: string;
  message: string;
}

export function DigestTab() {
  const [items, setItems] = useState<DigestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: DigestItem[] }>('/api/digest');
      setItems(res.items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the backend for the digest.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const emailDigest = async () => {
    setSending(true);
    setEmailStatus(null);
    try {
      const res = await api.post<{ sent: boolean; to: string; itemCount: number }>('/api/digest/email');
      setEmailStatus(`Sent ${res.itemCount} item(s) to ${res.to}.`);
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Could not send the digest email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card
      title="Needs attention"
      subtitle="Stale beneficiary designations and incomplete checklists across every app you can see — computed on the backend, refreshed on load."
      right={
        <Button variant="secondary" onClick={emailDigest} disabled={sending}>
          {sending ? 'Sending…' : 'Email me this'}
        </Button>
      }
    >
      {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mb-3">{error}</p>}
      {emailStatus && <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 mb-3">{emailStatus}</p>}
      {items === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing needs attention right now.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((item, i) => (
            <li key={i} className="py-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-neutral-400">{item.appId}</span>
              <p className="text-neutral-800">
                <span className="font-medium">{item.recordLabel}</span> — {item.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
