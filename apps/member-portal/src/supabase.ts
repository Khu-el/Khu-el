import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readConfig } from './config';
import { acceptUrlSession } from './logic/routes';

const config = readConfig(import.meta.env as unknown as Record<string, string | undefined>);

const STORAGE_KEY = 'ed-member-portal-auth';

/** Whether this browser already holds a saved session. Unreadable storage holds none. */
export function hasStoredSession(): boolean {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

let urlSessionRefused = false;

/**
 * True, once per page load, when the page opened with a sign-in link whose
 * tokens were not used because a session was already saved here. Call it after
 * getSession() resolves; the check runs while the client initialises.
 */
export function takeUrlSessionRefused(): boolean {
  const refused = urlSessionRefused;
  urlSessionRefused = false;
  return refused;
}

/**
 * The single Supabase client, or null when the build has no project
 * configured (the app then renders a "not configured" screen instead of
 * failing).
 *
 * storageKey is app-specific: every app on khu-el.github.io shares one origin,
 * so the default key would let two Supabase apps read each other's session.
 * The implicit flow keeps email confirmation and password-reset links working
 * when they are opened on a different device from the one that requested them.
 * Its tokens arrive in the URL, so a link is taken only when no session is
 * saved here: otherwise a forwarded link could silently replace the member's
 * session with someone else's account.
 */
export const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: (_url, params) => {
          const accept = acceptUrlSession(params, hasStoredSession());
          if (params.access_token && !accept) urlSessionRefused = true;
          return accept;
        },
        flowType: 'implicit',
      },
    })
  : null;

export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('The member portal is not configured for a Supabase project.');
  return supabase;
}
