import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readConfig } from './config';

const config = readConfig(import.meta.env as unknown as Record<string, string | undefined>);

/**
 * The single Supabase client, or null when the build has no project
 * configured (the app then renders a "not configured" screen instead of
 * failing).
 *
 * storageKey is app-specific: every app on khu-el.github.io shares one origin,
 * so the default key would let two Supabase apps read each other's session.
 * The implicit flow keeps email confirmation and password-reset links working
 * when they are opened on a different device from the one that requested them.
 */
export const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        storageKey: 'ed-member-portal-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;

export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('The member portal is not configured for a Supabase project.');
  return supabase;
}
