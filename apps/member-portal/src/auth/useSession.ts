import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type AuthEvent = 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' | null;

export interface SessionState {
  loading: boolean;
  session: Session | null;
  /** Set when the member arrived through a password-reset link. */
  recovery: boolean;
  clearRecovery: () => void;
}

export function useSession(): SessionState {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [session, setSession] = useState<Session | null>(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, recovery, clearRecovery: () => setRecovery(false) };
}
