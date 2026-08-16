import { useState, type ReactNode } from 'react';
import { useAuth } from '../api/useAuth';
import { ROLES, ROLE_LABELS, type ApiUser, type Role } from '../api/types';
import { Button, Field, Select, TextInput } from './Ui';

export function AuthGate({ appName, children }: { appName: string; children: (ctx: { user: ApiUser; logout: () => void }) => ReactNode }) {
  const { user, loading, error, login, register, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">Loading…</div>;
  }

  if (!user) {
    return <LoginScreen appName={appName} error={error} onLogin={login} onRegister={register} />;
  }

  return <>{children({ user, logout })}</>;
}

function LoginScreen({
  appName,
  error,
  onLogin,
  onRegister,
}: {
  appName: string;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string, displayName: string, role: Role) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<Role>('FAMILY_COUNCIL_MEMBER');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'login') await onLogin(email, password);
    else await onRegister(email, password, displayName, role);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{appName}</h1>
          <p className="text-sm text-neutral-500">{mode === 'login' ? 'Sign in to sync your data.' : 'Create an account to get started.'}</p>
        </div>

        <Field label="Email">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" hint={mode === 'register' ? 'At least 8 characters' : undefined}>
          <TextInput type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </Field>

        {mode === 'register' && (
          <>
            <Field label="Display name">
              <TextInput required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label="Role" hint="You can change this later">
              <Select value={role} onChange={(v) => setRole(v as Role)} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
            </Field>
          </>
        )}

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm text-neutral-500 hover:text-neutral-800 underline w-full text-center"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
