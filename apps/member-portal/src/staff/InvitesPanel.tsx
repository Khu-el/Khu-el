// Staff → Invites (admin/owner). Issues a single-use, per-email invite code
// and shows it ONCE. The portal sends nothing: the staff member passes the
// code on themselves. The database (create_signup_invite) is the real gate.
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { staffCreateInvite, staffListInvites, staffRevokeInvite } from '../data/api';
import { appBaseUrl } from '../config';
import { formatInviteCode, isValidEmail, normalizeEmail } from '../logic/invites';
import type { ErrorLike } from '../logic/errors';
import { Badge, Empty, ErrorNote, Loading, Notice, formatDateTime, useLoad } from '../components/common';
import type { SignupInvite } from '../types';
import { asError } from './shared';

const STATUS: Record<SignupInvite['status'], { label: string; tone: 'slate' | 'green' | 'amber' | 'red' }> = {
  pending: { label: 'Pending', tone: 'amber' },
  used: { label: 'Used', tone: 'green' },
  revoked: { label: 'Revoked', tone: 'red' },
  expired: { label: 'Expired', tone: 'slate' },
};

const USED_MESSAGE = 'This email has already used an invite to create an account. A used invite cannot be issued again.';

export function InvitesPanel() {
  const { timezone } = usePortal();
  const invites = useLoad(() => staffListInvites(), []);

  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [issued, setIssued] = useState<{ email: string; code: string } | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const [revoking, setRevoking] = useState<string | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [listNotice, setListNotice] = useState<string | null>(null);

  const portalLink = appBaseUrl(window.location);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setFormError(asError('Enter a valid email address, like name@example.org.'));
      return;
    }
    const existing = invites.data?.find((i) => i.email === normalized);
    if (existing?.status === 'used') {
      setFormError(asError(USED_MESSAGE));
      return;
    }
    if (
      existing?.status === 'pending' &&
      !window.confirm(`${normalized} already has a pending invite. Issuing a new code replaces the old one, and the old code stops working. Continue?`)
    ) {
      return;
    }
    setSaving(true);
    setFormError(null);
    setIssued(null);
    setCopyState('idle');
    setListNotice(null);
    try {
      const code = await staffCreateInvite(normalized);
      setIssued({ email: normalized, code });
      setEmail('');
      invites.reload();
    } catch (err) {
      const msg = ((err as ErrorLike | null)?.message ?? '').toLowerCase();
      setFormError(msg.includes('invite already used') ? asError(USED_MESSAGE) : err);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(formatInviteCode(issued.code));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const revoke = async (inv: SignupInvite) => {
    if (revoking) return;
    if (!window.confirm(`Revoke the invite for ${inv.email}? Its code stops working immediately. You can issue a new code later if needed.`)) return;
    setRevoking(inv.email);
    setListError(null);
    setListNotice(null);
    try {
      await staffRevokeInvite(inv.email);
      if (issued?.email === inv.email) setIssued(null);
      setListNotice(`The invite for ${inv.email} was revoked.`);
      invites.reload();
    } catch (err) {
      setListError(err);
    } finally {
      setRevoking(null);
    }
  };

  const rows = invites.data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-4">
      <Card title="Issue an invite" subtitle="Sign-up is invite-only. Each code works once, for one email address, for 14 days.">
        <form onSubmit={submit} noValidate>
          <Field label="Invitee's email address" hint="Issuing a code for an email that already has a pending invite replaces the old code.">
            <TextInput type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} maxLength={254} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || email.trim() === ''}>
              {saving ? 'Issuing…' : 'Issue invite code'}
            </Button>
            <span className="text-xs text-slate-500">Nothing is emailed. You pass the code on yourself.</span>
          </div>
          {formError != null && (
            <div className="mt-3">
              <ErrorNote error={formError} />
            </div>
          )}
        </form>

        {issued && (
          <div className="mt-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4" role="status" aria-live="polite">
            <p className="text-sm text-amber-900">
              Invite code for <span className="font-semibold">{issued.email}</span>
            </p>
            <p className="my-2 select-all break-all font-mono text-2xl font-semibold tracking-wider text-slate-900">{formatInviteCode(issued.code)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={copy}>
                Copy code
              </Button>
              {copyState === 'copied' && <span className="text-xs text-emerald-800">Copied.</span>}
              {copyState === 'failed' && <span className="text-xs text-red-800">Copying did not work in this browser. Select the code and copy it by hand.</span>}
            </div>
            <p className="mt-3 text-sm text-amber-900">
              Share this code with the invitee yourself, together with the portal link. The portal does not send it. It expires in 14 days and works once, for this email only.
            </p>
            <p className="mt-2 text-sm text-amber-900">
              Portal link: <span className="select-all break-all font-mono">{portalLink}</span>
            </p>
            <p className="mt-2 text-xs text-amber-900">
              This is the only time this code is shown; the database keeps only a hash of it. If it is lost, issue a new code for the same email.
            </p>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => setIssued(null)}>
                I have recorded it — hide the code
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Invites"
        subtitle={
          invites.data
            ? `${rows.length} in total${rows.length ? ` · ${(['pending', 'used', 'revoked', 'expired'] as const).filter((s) => counts[s]).map((s) => `${counts[s]} ${STATUS[s].label.toLowerCase()}`).join(' · ')}` : ''}`
            : undefined
        }
        right={
          <Button type="button" variant="secondary" onClick={invites.reload} disabled={invites.loading}>
            Refresh
          </Button>
        }
      >
        {listNotice && (
          <div className="mb-3">
            <Notice tone="success">{listNotice}</Notice>
          </div>
        )}
        {listError != null && (
          <div className="mb-3">
            <ErrorNote error={listError} />
          </div>
        )}
        {invites.error != null && invites.data && (
          <div className="mb-3">
            <ErrorNote error={invites.error} />
          </div>
        )}
        {invites.loading && !invites.data ? (
          <Loading />
        ) : invites.error && !invites.data ? (
          <ErrorNote error={invites.error} />
        ) : rows.length === 0 ? (
          <Empty>No invites have been issued yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Created</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Expires</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Used</th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((inv) => {
                  const s = STATUS[inv.status] ?? { label: inv.status, tone: 'slate' as const };
                  return (
                    <tr key={inv.email} className="align-top">
                      <td className="break-all py-2 pr-3 text-slate-900">{inv.email}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {inv.status === 'revoked' && inv.revoked_at && <span className="mt-1 block text-xs text-slate-500">{formatDateTime(inv.revoked_at, timezone)}</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-slate-700">{formatDateTime(inv.created_at, timezone)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-slate-700">{formatDateTime(inv.expires_at, timezone)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-slate-700">{inv.consumed_at ? formatDateTime(inv.consumed_at, timezone) : 'Not used'}</td>
                      <td className="py-2 text-right">
                        {inv.status === 'pending' && (
                          <Button type="button" variant="danger" onClick={() => revoke(inv)} disabled={revoking !== null}>
                            {revoking === inv.email ? 'Revoking…' : 'Revoke'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
