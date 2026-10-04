// Small shared UI pieces for the portal. Larger primitives (Card, Field,
// TextInput, Select, Button, Stat, Tabs) come from @nte/governance-core.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { dataErrorMessage, type ErrorLike } from '../logic/errors';

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{dataErrorMessage(error as ErrorLike)}</div>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warn' }) {
  const cls = {
    info: 'border-slate-300 bg-slate-50 text-slate-800',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
  }[tone];
  return <div className={`rounded border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{label}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none ${props.className ?? ''}`} />;
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const cls = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-sky-100 text-sky-800',
  }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

/**
 * Load-once data hook: `useLoad(() => listTracks(), [])`. Returns the data, an
 * error, a loading flag and a reload function. The latest call wins.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; error: unknown; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload };
}

export function formatDateTime(iso: string | null | undefined, timeZone?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone || undefined }).format(d);
  } catch {
    return d.toLocaleString();
  }
}
