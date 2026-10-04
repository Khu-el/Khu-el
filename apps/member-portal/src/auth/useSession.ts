import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, takeUrlSessionRefused } from '../supabase';
import { isAuthFragment } from '../logic/routes';

export type AuthEvent = 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' | null;

export interface SessionState {
  loading: boolean;
  session: Session | null;
  /** Set when the member arrived through a password-reset link. */
  recovery: boolean;
  clearRecovery: () => void;
  /**
   * Set when a sign-in link was opened here but not used, because a session was
   * already saved: 'signed-in' if that session is still active, 'signed-out' if
   * it had expired by the time it was restored.
   */
  refusedLink: 'signed-in' | 'signed-out' | null;
  clearRefusedLink: () => void;
}

/** Removes a refused link's tokens from the address bar without adding a history entry. */
function clearAuthFragment() {
  if (!isAuthFragment(window.location.hash)) return;
  try {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  } catch {
    // Leaving the fragment in place is harmless: the router reads it as the dashboard.
  }
}

export function useSession(): SessionState {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [refusedLink, setRefusedLink] = useState<SessionState['refusedLink']>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (takeUrlSessionRefused()) {
        // Signed in: the link must not be used here, so drop its tokens. Signed
        // out (the saved session had expired): keep them, so a reload can use it.
        if (data.session) clearAuthFragment();
        setRefusedLink(data.session ? 'signed-in' : 'signed-out');
      }
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // A refused-link notice is moot once the member signs out of, or into, an account themselves.
      if (event === 'SIGNED_OUT') {
        setRecovery(false);
        setRefusedLink((r) => (r === 'signed-in' ? null : r));
      }
      if (event === 'SIGNED_IN') setRefusedLink((r) => (r === 'signed-out' ? null : r));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    session,
    recovery,
    clearRecovery: () => setRecovery(false),
    refusedLink,
    clearRefusedLink: () => setRefusedLink(null),
  };
}
