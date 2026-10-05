// System status: the integration registry as the portal team recorded it.
// These rows are written by staff, not measured -- the page says so, and never
// presents a recorded state as a live health check.
import { Card } from '@nte/governance-core';
import { usePortal } from '../context';
import { listIntegrationStatus } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, Notice, useLoad } from '../components/common';
import type { IntegrationStatus } from '../types';

type Tone = 'green' | 'blue' | 'slate' | 'amber';

const STATE_TONES: Record<string, Tone> = {
  connected: 'green',
  backend_ready: 'blue',
  not_connected: 'slate',
};

const STATE_LABELS: Record<string, string> = {
  connected: 'Connected',
  backend_ready: 'Backend ready',
  not_connected: 'Not connected',
  planned: 'Planned',
};

function stateTone(state: string): Tone {
  return STATE_TONES[state] ?? 'amber';
}

function stateLabel(state: string): string {
  if (STATE_LABELS[state]) return STATE_LABELS[state];
  const s = state.replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
}

function formatDate(iso: string | null | undefined, timeZone?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: timeZone || undefined }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function Status() {
  const { timezone } = usePortal();
  const rows = useLoad(() => listIntegrationStatus(), []);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">System status</h1>
        <p className="text-sm text-slate-600">What the portal is connected to today, and what is not connected yet.</p>
      </header>

      <Notice tone="warn">
        <strong>Statuses are recorded by the portal team, not live health checks.</strong> A row shows what was last written down and when; it does
        not test whether a service is working right now.
      </Notice>

      <Card title="Integrations">
        <StatusBody rows={rows.data} loading={rows.loading} error={rows.error} timezone={timezone} />
      </Card>
    </div>
  );
}

function StatusBody({ rows, loading, error, timezone }: { rows: IntegrationStatus[] | null; loading: boolean; error: unknown; timezone: string | null }) {
  if (error) return <ErrorNote error={error} />;
  if (loading && !rows) return <Loading />;
  if (!rows || rows.length === 0) return <Empty>No integration statuses have been recorded yet.</Empty>;
  return (
    <>
      {/* Phones: one card per integration. */}
      <ul className="divide-y divide-slate-200 sm:hidden">
        {rows.map((r) => (
          <li key={r.integration_key} className="space-y-1 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-slate-900">{r.display_name}</p>
              <Badge tone={stateTone(r.state)}>{stateLabel(r.state)}</Badge>
            </div>
            {r.public_note && <p className="text-sm text-slate-700">{r.public_note}</p>}
            <p className="text-xs text-slate-500">Recorded {formatDate(r.updated_at, timezone)}</p>
          </li>
        ))}
      </ul>

      {/* Wider screens: a table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Integration statuses as recorded by the portal team</caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-4 font-medium">Integration</th>
              <th scope="col" className="py-2 pr-4 font-medium">State</th>
              <th scope="col" className="py-2 pr-4 font-medium">Note</th>
              <th scope="col" className="whitespace-nowrap py-2 font-medium">Last recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.integration_key} className="align-top">
                <th scope="row" className="py-2 pr-4 font-medium text-slate-900">{r.display_name}</th>
                <td className="whitespace-nowrap py-2 pr-4">
                  <Badge tone={stateTone(r.state)}>{stateLabel(r.state)}</Badge>
                </td>
                <td className="py-2 pr-4 text-slate-700">{r.public_note ?? '—'}</td>
                <td className="whitespace-nowrap py-2 text-slate-600">{formatDate(r.updated_at, timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
