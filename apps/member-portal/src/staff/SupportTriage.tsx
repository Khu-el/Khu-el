// Staff → Support triage. Staff read every member's support requests, set a
// status and leave a note the member sees. Saving writes an in-app
// notification for the member (database trigger) -- nothing is emailed. The
// contact email is shown as plain text so staff can reply by their own means
// if they choose; the portal never contacts anyone.
import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Field, Select } from '@nte/governance-core';
import { usePortal } from '../context';
import { staffListSupport, staffUpdateSupport } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, Notice, TextArea, formatDateTime, useLoad } from '../components/common';
import { SUPPORT_STATUSES, type SupportRequest, type SupportStatus } from '../types';
import { asError, textOrNull } from './shared';

const NOTE_MAX = 4000;
const LIST_LIMIT = 500; // staffListSupport returns at most this many, newest first.

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General question',
  account: 'Account',
  learning: 'Learning content',
  technical: 'Technical problem',
  feedback: 'Feedback',
};

const STATUS_LABELS: Record<SupportStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_TONES: Record<SupportStatus, 'slate' | 'amber' | 'green' | 'blue'> = {
  submitted: 'blue',
  in_review: 'amber',
  in_progress: 'amber',
  resolved: 'green',
  closed: 'slate',
};

const OPEN_STATUSES: SupportStatus[] = ['submitted', 'in_review', 'in_progress'];

type Filter = 'open' | 'all' | SupportStatus;

function statusLabel(s: string): string {
  return STATUS_LABELS[s as SupportStatus] ?? s.replace(/_/g, ' ');
}

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ');
}

export function SupportTriage() {
  const load = useLoad(() => staffListSupport(), []);
  const [filter, setFilter] = useState<Filter>('open');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const rows = load.data ?? [];
  const count = (f: Filter) => rows.filter((r) => matches(r, f)).length;
  const visible = rows.filter((r) => matches(r, filter));

  const filterOptions: { value: string; label: string }[] = [
    { value: 'open', label: `Open — submitted, in review or in progress (${count('open')})` },
    { value: 'all', label: `All (${rows.length})` },
    ...SUPPORT_STATUSES.map((s) => ({ value: s, label: `${STATUS_LABELS[s]} (${count(s)})` })),
  ];

  return (
    <div className="space-y-4">
      <Notice>
        Saving a status or note sends the member an <strong>in-app notification only</strong>. Nothing is emailed, texted or posted. If you want to
        reply outside the portal, use the contact email shown on the request, by your own means.
      </Notice>

      <Card
        title="Support requests"
        subtitle={load.data ? `${rows.length} loaded, newest first` : undefined}
        right={
          <Button type="button" variant="secondary" onClick={load.reload} disabled={load.loading}>
            Refresh
          </Button>
        }
      >
        <div className="max-w-md">
          <Field label="Show">
            <Select value={filter} onChange={(v) => setFilter(v as Filter)} options={filterOptions} />
          </Field>
        </div>

        {load.error != null && load.data && <ErrorNote error={load.error} />}
        {lastSaved && load.data && !visible.some((r) => r.id === lastSaved) && rows.some((r) => r.id === lastSaved) && (
          <div className="mb-3">
            <Notice tone="success">Your update was saved. That request no longer matches this filter; choose “All” to see it.</Notice>
          </div>
        )}
        {load.data && rows.length >= LIST_LIMIT && (
          <div className="mb-3">
            <Notice tone="warn">Only the {LIST_LIMIT} most recent requests are shown. Older requests exist in the database but are not listed here.</Notice>
          </div>
        )}

        {load.loading && !load.data ? (
          <Loading />
        ) : load.error && !load.data ? (
          <ErrorNote error={load.error} />
        ) : rows.length === 0 ? (
          <Empty>No support requests have been filed yet.</Empty>
        ) : visible.length === 0 ? (
          <Empty>No requests match this filter.</Empty>
        ) : (
          <ul className="space-y-2">
            {visible.map((r) => (
              <RequestItem
                key={r.id}
                request={r}
                open={expanded === r.id}
                onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                onSaved={() => {
                  setLastSaved(r.id);
                  load.reload();
                }}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function matches(r: SupportRequest, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'open') return OPEN_STATUSES.includes(r.status);
  return r.status === f;
}

function RequestItem({ request: r, open, onToggle, onSaved }: { request: SupportRequest; open: boolean; onToggle: () => void; onSaved: () => void }) {
  const { timezone } = usePortal();
  const [status, setStatus] = useState<SupportStatus>(r.status);
  const [note, setNote] = useState(r.staff_note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  // When the list reloads with a newer copy of this request, start from it.
  useEffect(() => {
    setStatus(r.status);
    setNote(r.staff_note ?? '');
  }, [r.status, r.staff_note, r.updated_at]);

  const statusChanged = status !== r.status;
  const noteChanged = textOrNull(note) !== textOrNull(r.staff_note ?? '');
  const dirty = statusChanged || noteChanged;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || !dirty) return;
    if (note.length > NOTE_MAX) {
      setError(asError(`Keep the note under ${NOTE_MAX.toLocaleString()} characters.`));
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: { status?: SupportStatus; staff_note?: string | null } = {};
      if (statusChanged) patch.status = status;
      if (noteChanged) patch.staff_note = textOrNull(note);
      await staffUpdateSupport(r.id, patch);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const panelId = `support-${r.id}`;

  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <Badge tone={STATUS_TONES[r.status] ?? 'slate'}>{statusLabel(r.status)}</Badge>
        <span className="min-w-0 flex-1 break-words font-medium text-slate-900">{r.subject}</span>
        <span className="text-xs text-slate-500">
          {categoryLabel(r.category)} · {formatDateTime(r.created_at, timezone)}
        </span>
        <span className="text-xs text-slate-500" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-slate-200 px-4 py-4">
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-slate-500">Requester name</dt>
            <dd className="break-words text-slate-900">{r.requester_name?.trim() || 'Not given'}</dd>
            <dt className="text-slate-500">Contact email</dt>
            <dd className="break-all text-slate-900">
              {r.contact_email?.trim() ? <span className="select-all">{r.contact_email}</span> : 'Not given'}
              <span className="block text-xs text-slate-500">Shown for reference. The portal does not email anyone.</span>
            </dd>
            <dt className="text-slate-500">Category</dt>
            <dd className="text-slate-900">{categoryLabel(r.category)}</dd>
            <dt className="text-slate-500">Filed</dt>
            <dd className="text-slate-900">{formatDateTime(r.created_at, timezone)}</dd>
            <dt className="text-slate-500">Last updated</dt>
            <dd className="text-slate-900">{formatDateTime(r.updated_at, timezone)}</dd>
          </dl>

          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Message</p>
            <p className="whitespace-pre-wrap break-words rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{r.message}</p>
          </div>

          <form onSubmit={save} className="space-y-1">
            <div className="max-w-xs">
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(v) => {
                    setStatus(v as SupportStatus);
                    setSaved(false);
                  }}
                  options={SUPPORT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                />
              </Field>
            </div>
            <Field label="Note the member will see" hint={`Optional. Plain language; no advice. ${note.length.toLocaleString()} / ${NOTE_MAX.toLocaleString()} characters.`}>
              <TextArea
                rows={4}
                value={note}
                maxLength={NOTE_MAX}
                disabled={saving}
                onChange={(e) => {
                  setNote(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? 'Saving…' : 'Save update'}
              </Button>
              <span className="text-xs text-slate-500">Saving sends the member an in-app notification only.</span>
            </div>
            {saved && !dirty && (
              <div className="pt-2">
                <Notice tone="success">Saved. The member will see an in-app notification about this update.</Notice>
              </div>
            )}
            {error != null && (
              <div className="pt-2">
                <ErrorNote error={error} />
              </div>
            )}
          </form>
        </div>
      )}
    </li>
  );
}
