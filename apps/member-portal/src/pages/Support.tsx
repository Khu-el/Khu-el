// Support: a member files a request to the portal team and follows its status.
// Requests are rows in the member's own support_requests; staff answer inside
// the portal. Nothing here emails, posts or contacts anyone -- the contact
// email is stored for staff to reply manually, and only if they choose to.
import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { fileSupportRequest, listMySupport } from '../data/api';
import { isValidEmail, normalizeEmail } from '../logic/invites';
import type { ErrorLike } from '../logic/errors';
import { Badge, Empty, ErrorNote, Loading, Notice, TextArea, formatDateTime, useLoad } from '../components/common';
import { SUPPORT_CATEGORIES, type SupportRequest, type SupportStatus } from '../types';

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;
const NAME_MAX = 80;

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General question',
  account: 'My account',
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

const STATUS_TONES: Record<SupportStatus, 'slate' | 'amber' | 'green'> = {
  submitted: 'slate',
  in_review: 'amber',
  in_progress: 'amber',
  resolved: 'green',
  closed: 'slate',
};

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ');
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s as SupportStatus] ?? s.replace(/_/g, ' ');
}

function statusTone(s: string): 'slate' | 'amber' | 'green' {
  return STATUS_TONES[s as SupportStatus] ?? 'slate';
}

/** ErrorNote renders `message` verbatim for anything that is not an RLS refusal. */
function asError(message: string): ErrorLike {
  return { message };
}

/**
 * A fresh idempotency key for one filled-in form. crypto.randomUUID needs a
 * secure context; the fallback builds a v4 UUID from getRandomValues.
 */
function newRef(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function Support() {
  const { userId, email, profile, timezone } = usePortal();
  const requests = useLoad(() => listMySupport(userId), [userId]);

  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(profile.display_name ?? '');
  const [contactEmail, setContactEmail] = useState(email);
  // One key per filled-in form: a double-click, or a retry after an error,
  // reuses it, so the database inserts the request once. Any edit starts a new
  // key -- a resubmission with changed text after a lost response would
  // otherwise match the first row, and the edits would be dropped while the
  // member is told the request was saved.
  const [externalRef, setExternalRef] = useState(newRef);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [filed, setFiled] = useState(false);

  function edited() {
    setFiled(false);
    setExternalRef(newRef());
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError(null);
    setFiled(false);
    const s = subject.trim();
    const m = message.trim();
    const contact = contactEmail.trim() ? normalizeEmail(contactEmail) : '';
    if (!s) return setError(asError('Add a short subject.'));
    if (!m) return setError(asError('Describe what you need help with.'));
    if (contact && !isValidEmail(contact)) return setError(asError('That contact email does not look right. Check it, or leave it blank.'));

    inFlight.current = true;
    setSaving(true);
    try {
      await fileSupportRequest(userId, {
        category,
        subject: s,
        message: m,
        requester_name: name.trim() || null,
        contact_email: contact || null,
        external_ref: externalRef,
      });
      setSubject('');
      setMessage('');
      setCategory(SUPPORT_CATEGORIES[0]);
      setExternalRef(newRef());
      setFiled(true);
      requests.reload();
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="text-sm text-slate-600">
          Ask the portal team about your account, the learning content, or a problem with the portal. Your request is saved here, and you will see a
          notification in the portal when staff update it.
        </p>
      </header>

      <Card title="File a support request">
        <form onSubmit={submit} noValidate className="space-y-1">
          <Notice>
            The portal team can help with your account and the educational content. They cannot give personal financial, legal, tax or investment advice.
            Please do not include passwords, account numbers or Social Security numbers.
          </Notice>
          <div className="grid gap-x-4 pt-3 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={category}
                onChange={(v) => {
                  // Select takes no `disabled`; refusing the change keeps it
                  // locked like the other fields while a submit is in flight.
                  if (saving) return;
                  setCategory(v);
                  edited();
                }}
                options={SUPPORT_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
              />
            </Field>
            <Field label="Subject">
              <TextInput
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  edited();
                }}
                maxLength={SUBJECT_MAX}
                required
                disabled={saving}
              />
            </Field>
          </div>
          <Field label="Message" hint={`${message.length} / ${MESSAGE_MAX} characters`}>
            <TextArea
              rows={6}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                edited();
              }}
              maxLength={MESSAGE_MAX}
              required
              disabled={saving}
            />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Your name" hint="Optional. So staff know who they are helping.">
              <TextInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  edited();
                }}
                maxLength={NAME_MAX}
                autoComplete="name"
                disabled={saving}
              />
            </Field>
            <Field
              label="Contact email"
              hint="Optional. Only used by staff if they decide to reply to you by hand. The portal itself never sends email."
            >
              <TextInput
                type="email"
                inputMode="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  edited();
                }}
                disabled={saving}
              />
            </Field>
          </div>
          {error ? (
            <div className="pb-3">
              <ErrorNote error={error} />
            </div>
          ) : null}
          {filed && (
            <div className="pb-3">
              <Notice tone="success">Your request was saved. It appears in the list below.</Notice>
            </div>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </Button>
        </form>
      </Card>

      <Card title="Your requests" subtitle="Newest first.">
        <RequestList requests={requests.data} loading={requests.loading} error={requests.error} timezone={timezone} />
      </Card>
    </div>
  );
}

function RequestList({ requests, loading, error, timezone }: { requests: SupportRequest[] | null; loading: boolean; error: unknown; timezone: string | null }) {
  if (error) return <ErrorNote error={error} />;
  if (loading && !requests) return <Loading />;
  if (!requests || requests.length === 0) return <Empty>You have not filed any support requests yet.</Empty>;
  return (
    <ul className="divide-y divide-slate-200">
      {requests.map((r) => (
        <li key={r.id} className="space-y-2 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-900">{r.subject}</p>
              <p className="text-xs text-slate-500">
                {categoryLabel(r.category)} · Filed {formatDateTime(r.created_at, timezone)}
              </p>
            </div>
            <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600">Your message</summary>
            <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{r.message}</p>
          </details>
          {r.staff_note && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Note from staff</p>
              <p className="whitespace-pre-wrap break-words text-slate-800">{r.staff_note}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
