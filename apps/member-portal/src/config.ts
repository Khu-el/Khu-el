// The project URL and publishable key are supplied at build time (GitHub
// Actions variables ED_SUPABASE_URL / ED_SUPABASE_PUBLISHABLE_KEY, or a local
// .env.local). They are deliberately not committed: this repository is public
// and keeps project identifiers out of it. The publishable key is designed to
// ship in a browser bundle -- every row is still guarded by RLS.

export interface PortalConfig {
  supabaseUrl: string;
  publishableKey: string;
}

export function readConfig(env: Record<string, string | undefined>): PortalConfig | null {
  const supabaseUrl = (env.VITE_SUPABASE_URL ?? '').trim();
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) return null;
  if (publishableKey.length < 20) return null;
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), publishableKey };
}

/** Where auth emails should send people back to: this app's own URL. */
export function appBaseUrl(location: { origin: string; pathname: string }): string {
  const path = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]*$/, '');
  return `${location.origin}${path}`;
}
