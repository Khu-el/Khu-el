export function NotConfigured() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-slate-800">
      <h1 className="text-xl font-semibold">🏛️ The Excellence District — Member Portal</h1>
      <p className="mt-4 text-sm">
        This build is not connected to a member database yet, so there is nothing to sign in to.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        For the administrator: set the repository variables <code>ED_SUPABASE_URL</code> and{' '}
        <code>ED_SUPABASE_PUBLISHABLE_KEY</code> and redeploy, or put <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>apps/member-portal/.env.local</code> for local development.
      </p>
    </div>
  );
}
