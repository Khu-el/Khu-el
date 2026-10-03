// Signed-out screens: sign in, create an account (invite only), and request a
// password reset; plus the "choose a new password" screen shown after a
// recovery link. The only email the portal ever causes is Supabase Auth's own
// confirmation / reset message, and it goes only to the address the member
// typed here. The portal never emails, sends or shares invitation codes.
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Field, Tabs, TextInput } from '@nte/governance-core';
import { requireClient } from '../supabase';
import { appBaseUrl } from '../config';
import { isValidEmail, isValidInviteCode, normalizeEmail, normalizeInviteCode } from '../logic/invites';
import { signInErrorMessage, signUpErrorMessage, type ErrorLike } from '../logic/errors';
import { ErrorNote, Notice } from '../components/common';

const MIN_PASSWORD = 10;
const MAX_DISPLAY_NAME = 80;

type Mode = 'signin' | 'signup' | 'forgot';

const MODES: { id: Mode; label: string }[] = [
  { id: 'signin', label: 'Sign in' },
  { id: 'signup', label: 'Create account' },
  { id: 'forgot', label: 'Forgot password' },
];

/** ErrorNote renders `message` verbatim for anything that is not an RLS refusal. */
function asError(message: string): ErrorLike {
  return { message };
}

/** A request that never reached the server (offline, DNS, blocked). Says nothing about any account. */
function isNetworkFailure(err: ErrorLike | null | undefined): boolean {
  return Boolean(err && err.name === 'AuthRetryableFetchError' && (err.status === 0 || err.status === undefined));
}

function newPasswordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use a password of at least ${MIN_PASSWORD} characters.`;
  if (password !== confirm) return 'The two passwords do not match.';
  return null;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md space-y-4">{children}</div>;
}

export function AuthScreens() {
  const [mode, setMode] = useState<Mode>('signin');
  // Shared across modes so switching from "sign in" to "forgot password" keeps what was typed.
  const [email, setEmail] = useState('');

  return (
    <AuthFrame>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Welcome to the Member Portal</h1>
        <p className="mt-1 text-sm text-slate-600">
          Learning tracks, resources and action plans for members of The Excellence District. Membership is by invitation.
        </p>
      </div>
      <Tabs tabs={MODES} active={mode} onChange={(id) => setMode(id as Mode)} />
      {mode === 'signin' && <SignInForm email={email} setEmail={setEmail} onForgot={() => setMode('forgot')} />}
      {mode === 'signup' && <SignUpForm email={email} setEmail={setEmail} onSignIn={() => setMode('signin')} />}
      {mode === 'forgot' && <ForgotForm email={email} setEmail={setEmail} onSignIn={() => setMode('signin')} />}
    </AuthFrame>
  );
}

interface EmailProps {
  email: string;
  setEmail: (v: string) => void;
}

function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-slate-700 underline hover:text-slate-900">
      {children}
    </button>
  );
}

function SignInForm({ email, setEmail, onForgot }: EmailProps & { onForgot: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!isValidEmail(email)) return setError(asError('Enter a valid email address.'));
    if (!password) return setError(asError('Enter your password.'));
    setBusy(true);
    try {
      const { error: err } = await requireClient().auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (err) {
        setError(asError(signInErrorMessage(err)));
        setBusy(false);
      }
      // On success the session listener in App replaces this screen.
    } catch (err) {
      setError(asError(signInErrorMessage(err as ErrorLike)));
      setBusy(false);
    }
  }

  return (
    <Card title="Sign in" subtitle="Use the email and password you created your account with.">
      <form onSubmit={submit} noValidate>
        <Field label="Email">
          <TextInput type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <TextInput type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <TextLink onClick={onForgot}>Forgot your password?</TextLink>
        </div>
      </form>
    </Card>
  );
}

function SignUpForm({ email, setEmail, onSignIn }: EmailProps & { onSignIn: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);
  // The address the confirmation was requested for, once Supabase accepted the sign-up.
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const [signedInDirectly, setSignedInDirectly] = useState(false);

  function problem(): string | null {
    if (!isValidEmail(email)) return 'Enter a valid email address — the same one your invitation was made for.';
    if (!displayName.trim()) return 'Enter a display name.';
    if (displayName.trim().length > MAX_DISPLAY_NAME) return `Keep your display name to ${MAX_DISPLAY_NAME} characters or fewer.`;
    const pw = newPasswordProblem(password, confirm);
    if (pw) return pw;
    if (!isValidInviteCode(code)) {
      return 'That invitation code does not look right. It is 18 characters long, using the numbers 0–9 and the letters a–f. Spaces and dashes are fine.';
    }
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const p = problem();
    if (p) return setError(asError(p));
    setBusy(true);
    const address = normalizeEmail(email);
    try {
      const { data, error: err } = await requireClient().auth.signUp({
        email: address,
        password,
        options: {
          data: { display_name: displayName.trim(), invite_code: normalizeInviteCode(code) },
          emailRedirectTo: appBaseUrl(window.location),
        },
      });
      if (err) {
        setError(asError(signUpErrorMessage(err)));
        return;
      }
      setPassword('');
      setConfirm('');
      setCode('');
      if (data.session === null) setConfirmSentTo(address);
      else setSignedInDirectly(true); // the session listener in App takes over
    } catch (err) {
      setError(asError(signUpErrorMessage(err as ErrorLike)));
    } finally {
      setBusy(false);
    }
  }

  if (confirmSentTo) {
    return (
      <Card title="Check your email to confirm your account">
        <div className="space-y-3 text-sm text-slate-700">
          <Notice tone="success">
            We asked for a confirmation link to be sent to <strong>{confirmSentTo}</strong>. It goes only to the address you entered.
          </Notice>
          <p>Open the link in that email to finish creating your account, then sign in. The link works on any device.</p>
          <p className="text-slate-600">
            Nothing after a few minutes? Check your spam or junk folder, and make sure the address above is the one your invitation was made for.
          </p>
          <Button type="button" variant="secondary" onClick={onSignIn}>
            Back to sign in
          </Button>
        </div>
      </Card>
    );
  }

  if (signedInDirectly) {
    return (
      <Card title="Account created">
        <Notice tone="success">Your account is ready. Signing you in…</Notice>
      </Card>
    );
  }

  return (
    <Card title="Create your account" subtitle="Membership is by invitation only.">
      <div className="mb-4">
        <Notice>
          To join, you need an invitation code from the person who invited you. They give it to you directly — the portal never emails
          codes. Use the same email address your invitation was made for; a code works once.
        </Notice>
      </div>
      <form onSubmit={submit} noValidate>
        <Field label="Email" hint="The address your invitation was made for.">
          <TextInput type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Display name" hint="How your name appears in the portal.">
          <TextInput autoComplete="name" required maxLength={MAX_DISPLAY_NAME} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
          <TextInput type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <TextInput type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Field label="Invitation code" hint="18 characters. Spaces, dashes and capital letters are fine.">
          <TextInput
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
          />
        </Field>
        {error && (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
          <TextLink onClick={onSignIn}>Already a member? Sign in</TextLink>
        </div>
      </form>
    </Card>
  );
}

const RESET_NEUTRAL = 'If an account exists for that email, a reset link is on its way.';

function ForgotForm({ email, setEmail, onSignIn }: EmailProps & { onSignIn: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!isValidEmail(email)) return setError(asError('Enter a valid email address.'));
    setBusy(true);
    try {
      const { error: err } = await requireClient().auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: appBaseUrl(window.location),
      });
      // Every answer from the server gets the same message, so this screen never
      // reveals whether an account exists. Only a request that never left the
      // browser is reported, because claiming a link is on its way would be false.
      if (isNetworkFailure(err)) setError(asError('We could not reach the portal. Check your connection and try again.'));
      else setDone(true);
    } catch (err) {
      if (isNetworkFailure(err as ErrorLike)) setError(asError('We could not reach the portal. Check your connection and try again.'));
      else setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card title="Check your email">
        <div className="space-y-3 text-sm text-slate-700">
          <Notice tone="success">{RESET_NEUTRAL}</Notice>
          <p>The link goes only to the address you entered. Open it to choose a new password. It works on any device.</p>
          <p className="text-slate-600">Nothing after a few minutes? Check your spam or junk folder, or try again a little later.</p>
          <Button type="button" variant="secondary" onClick={onSignIn}>
            Back to sign in
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Reset your password" subtitle="We will ask for a reset link to be sent to your own email address.">
      <form onSubmit={submit} noValidate>
        <Field label="Email">
          <TextInput type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {error && (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Requesting…' : 'Send me a reset link'}
          </Button>
          <TextLink onClick={onSignIn}>Back to sign in</TextLink>
        </div>
      </form>
    </Card>
  );
}

function updatePasswordErrorMessage(err: ErrorLike | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.';
  const msg = (err.message ?? '').toLowerCase();
  if (err.code === 'same_password' || msg.includes('different from the old password')) {
    return 'Choose a password that is different from your old one.';
  }
  if (err.code === 'weak_password' || (msg.includes('password') && (msg.includes('least') || msg.includes('weak')))) {
    return `That password is too weak. Use at least ${MIN_PASSWORD} characters.`;
  }
  if (msg.includes('session') && (msg.includes('missing') || msg.includes('expired') || msg.includes('not found'))) {
    return 'This reset link has expired or was already used. Request a new one from the sign-in screen.';
  }
  if (err.status === 429 || msg.includes('rate limit')) return 'Too many attempts. Wait a few minutes and try again.';
  if (isNetworkFailure(err)) return 'We could not reach the portal. Check your connection and try again.';
  return err.message || 'Something went wrong. Please try again.';
}

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorLike | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const p = newPasswordProblem(password, confirm);
    if (p) return setError(asError(p));
    setBusy(true);
    try {
      const { error: err } = await requireClient().auth.updateUser({ password });
      if (err) {
        setError(asError(updatePasswordErrorMessage(err)));
        return;
      }
      setPassword('');
      setConfirm('');
      setSaved(true);
    } catch (err) {
      setError(asError(updatePasswordErrorMessage(err as ErrorLike)));
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <AuthFrame>
        <Card title="Password updated">
          <div className="space-y-3">
            <Notice tone="success">Your new password is saved. Use it the next time you sign in.</Notice>
            <Button type="button" onClick={onDone}>
              Continue to the portal
            </Button>
          </div>
        </Card>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Card title="Choose a new password" subtitle="You opened a password-reset link. Set a new password to continue.">
        <form onSubmit={submit} noValidate>
          <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
            <TextInput type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && (
            <div className="mb-3">
              <ErrorNote error={error} />
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </Card>
    </AuthFrame>
  );
}
