// Account: the member's own profile, preferences, password, sign-out and
// account deletion. Every write here touches only the signed-in member's own
// rows or their own auth user; nothing is sent to anyone else.
import { useMemo, useState, type FormEvent } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { deleteMyAccount, getPreferences, savePreferences, updateProfile } from '../data/api';
import { requireClient } from '../supabase';
import type { ErrorLike } from '../logic/errors';
import { ErrorNote, Loading, Notice, formatDateTime, useLoad } from '../components/common';
import type { MemberPreferences } from '../types';

const MIN_PASSWORD = 10;
const NAME_MAX = 80;
const DELETE_WORD = 'DELETE';

type PreferenceKey = 'email_updates' | 'push_updates' | 'product_updates' | 'analytics_consent';
type PreferenceValues = Pick<MemberPreferences, PreferenceKey>;

const PREFERENCE_FIELDS: { key: PreferenceKey; label: string; hint: string }[] = [
  { key: 'email_updates', label: 'Email updates', hint: 'Updates sent to your own email address.' },
  { key: 'push_updates', label: 'Push notifications', hint: 'Notifications sent to your device.' },
  { key: 'product_updates', label: 'Product news', hint: 'News about new portal features and content.' },
  { key: 'analytics_consent', label: 'Usage analytics', hint: 'Anonymous measurement of how the portal is used.' },
];

/** Every channel is off until the member turns it on. */
const ALL_OFF: PreferenceValues = {
  email_updates: false,
  push_updates: false,
  product_updates: false,
  analytics_consent: false,
};

/** ErrorNote renders `message` verbatim for anything that is not an RLS refusal. */
function asError(message: string): ErrorLike {
  return { message };
}

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * IANA zones from Intl.supportedValuesOf when the browser has it, plus any zone
 * that must stay selectable (the saved one and the browser's own).
 */
function timeZoneOptions(...include: (string | null | undefined)[]): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  let zones: string[] = [];
  try {
    zones = typeof intl.supportedValuesOf === 'function' ? intl.supportedValuesOf('timeZone') : [];
  } catch {
    zones = [];
  }
  const set = new Set(zones);
  for (const z of include) if (z) set.add(z);
  if (set.size === 0) set.add('UTC');
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function Account() {
  const { email } = usePortal();
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-slate-600">Your profile, your choices, and your sign-in.</p>
      </header>

      <Card title="Account email">
        <Field label="Email" hint="The address you sign in with. It cannot be changed here.">
          <TextInput type="email" value={email} readOnly aria-readonly="true" className="bg-slate-50 text-slate-700" />
        </Field>
      </Card>

      <ProfileSection />
      <PreferencesSection />
      <PasswordSection />
      <SignOutSection />
      <DeleteAccountSection />
    </div>
  );
}

// ---------------------------------------------------------------- profile

function ProfileSection() {
  const { userId, profile, refreshProfile } = usePortal();
  const browserZone = useMemo(() => browserTimeZone(), []);
  const initialZone = profile.timezone || browserZone || 'UTC';
  const zones = useMemo(() => timeZoneOptions(profile.timezone, browserZone, 'UTC'), [profile.timezone, browserZone]);

  const [name, setName] = useState(profile.display_name ?? '');
  const [timeZone, setTimeZone] = useState(initialZone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(userId, { display_name: name.trim() || null, timezone: timeZone });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Profile">
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Display name" hint="Shown to you in the portal. Leave blank if you prefer.">
            <TextInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              disabled={saving}
            />
          </Field>
          <Field
            label="Time zone"
            hint={profile.timezone ? 'Used for dates, and for when each week of a plan begins.' : 'Not saved yet — showing your browser’s time zone. Save to keep it.'}
          >
            <Select
              value={timeZone}
              onChange={(v) => {
                setTimeZone(v);
                setSaved(false);
              }}
              options={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))}
            />
          </Field>
        </div>
        {error ? (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        ) : null}
        {saved && (
          <div className="mb-3">
            <Notice tone="success">Profile saved.</Notice>
          </div>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- preferences

function PreferencesSection() {
  const { userId, timezone } = usePortal();
  const prefs = useLoad(() => getPreferences(userId), [userId]);
  const [justSaved, setJustSaved] = useState(false);

  return (
    <Card title="Preferences" subtitle="Your choices about updates and measurement.">
      <div className="space-y-3">
        <Notice>
          The portal does not send email or push messages and has no analytics today. These record your choices for if those are ever connected.
        </Notice>
        {prefs.error ? (
          <ErrorNote error={prefs.error} />
        ) : prefs.loading && prefs.data === null ? (
          <Loading />
        ) : (
          // Keyed on the saved row so a reload starts the form from what is stored.
          <PreferencesForm
            key={prefs.data?.updated_at ?? 'none'}
            stored={prefs.data}
            timezone={timezone}
            onEdit={() => setJustSaved(false)}
            onSaved={() => {
              setJustSaved(true);
              prefs.reload();
            }}
          />
        )}
        {justSaved && <Notice tone="success">Preferences saved.</Notice>}
      </div>
    </Card>
  );
}

function PreferencesForm({
  stored,
  timezone,
  onEdit,
  onSaved,
}: {
  stored: MemberPreferences | null;
  timezone: string | null;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const { userId } = usePortal();
  const [values, setValues] = useState<PreferenceValues>(() =>
    stored
      ? {
          email_updates: stored.email_updates,
          push_updates: stored.push_updates,
          product_updates: stored.product_updates,
          analytics_consent: stored.analytics_consent,
        }
      : ALL_OFF,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    onEdit();
    try {
      await savePreferences(userId, values);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="sr-only">Preferences</legend>
        {PREFERENCE_FIELDS.map((f) => (
          <label key={f.key} className="flex items-start gap-3 rounded border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              checked={values[f.key]}
              onChange={(e) => {
                const checked = e.target.checked;
                setValues((v) => ({ ...v, [f.key]: checked }));
                onEdit();
              }}
              disabled={saving}
            />
            <span>
              <span className="block font-medium text-slate-800">{f.label}</span>
              <span className="block text-xs text-slate-500">{f.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-slate-500">
        {stored ? `Last saved ${formatDateTime(stored.updated_at, timezone)}.` : 'You have not saved preferences yet. Until you do, every choice is off.'}
      </p>
      <ErrorNote error={error} />
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save preferences'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------- password

function updatePasswordErrorMessage(err: ErrorLike | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.';
  const msg = (err.message ?? '').toLowerCase();
  if (err.code === 'same_password' || msg.includes('different from the old password')) {
    return 'Choose a password that is different from your current one.';
  }
  if (err.code === 'weak_password' || (msg.includes('password') && (msg.includes('least') || msg.includes('weak')))) {
    return `That password is too weak. Use at least ${MIN_PASSWORD} characters.`;
  }
  if (err.code === 'reauthentication_needed' || msg.includes('reauthenticat')) {
    return 'For your security, sign out and sign back in, then change your password straight away.';
  }
  if (err.status === 429 || msg.includes('rate limit')) return 'Too many attempts. Wait a few minutes and try again.';
  return err.message || 'Something went wrong. Please try again.';
}

function PasswordSection() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaved(false);
    if (password.length < MIN_PASSWORD) return setError(asError(`Use a password of at least ${MIN_PASSWORD} characters.`));
    if (password !== confirm) return setError(asError('The two passwords do not match.'));
    setSaving(true);
    try {
      const { error: err } = await requireClient().auth.updateUser({ password });
      if (err) {
        setError(asError(updatePasswordErrorMessage(err as ErrorLike)));
        return;
      }
      setPassword('');
      setConfirm('');
      setSaved(true);
    } catch (err) {
      setError(asError(updatePasswordErrorMessage(err as ErrorLike)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Change password" subtitle={`At least ${MIN_PASSWORD} characters.`}>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="New password">
            <TextInput
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
            />
          </Field>
          <Field label="Confirm new password">
            <TextInput
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
            />
          </Field>
        </div>
        {error && (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        )}
        {saved && (
          <div className="mb-3">
            <Notice tone="success">Your password was changed. Use the new one next time you sign in.</Notice>
          </div>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------- sign out

function SignOutSection() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await requireClient().auth.signOut();
      if (err) throw err;
      // The session listener returns the app to the sign-in screen.
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <Card title="Sign out" subtitle="Ends your session in this browser and on your other devices.">
      <div className="space-y-3">
        <ErrorNote error={error} />
        <Button variant="secondary" onClick={signOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- delete account

function DeleteAccountSection() {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ready = typed.trim() === DELETE_WORD;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !ready) return;
    if (!window.confirm('Permanently delete your account? This cannot be undone.')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      // deleteMyAccount ends the session; the app returns to the sign-in screen.
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-300 bg-white p-5 shadow-sm" aria-labelledby="delete-account-heading">
      <h3 id="delete-account-heading" className="font-semibold text-red-800">
        Delete account
      </h3>
      <div className="mt-2 space-y-2 text-sm text-slate-700">
        <p>
          This permanently deletes your account and everything saved under it: your profile, learning progress, saved resources, pathway choices, action
          plans, support requests, notifications and preferences.
        </p>
        <p className="font-medium text-red-800">It cannot be undone. The portal team cannot restore a deleted account.</p>
      </div>
      <form onSubmit={submit} noValidate className="mt-4">
        <Field label={`Type ${DELETE_WORD} to confirm`}>
          <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
        </Field>
        {error ? (
          <div className="mb-3 space-y-2">
            <ErrorNote error={error} />
            <p className="text-xs text-slate-600">Your account may not have been deleted. Try again, or file a support request if it keeps failing.</p>
          </div>
        ) : null}
        <Button type="submit" variant="danger" disabled={busy || !ready}>
          {busy ? 'Deleting…' : 'Permanently delete my account'}
        </Button>
      </form>
    </section>
  );
}
