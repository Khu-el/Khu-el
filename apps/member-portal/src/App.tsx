import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NotLegalOrFinancialAdviceFooter } from '@nte/governance-core';
import { hasStoredSession, supabase } from './supabase';
import { useSession } from './auth/useSession';
import { PortalContext, can, type PortalContextValue } from './context';
import { countUnreadNotifications, getProfile, getStaffRole } from './data/api';
import { href, isAuthFragment, parseRoute, type Route } from './logic/routes';
import type { Profile, StaffRole } from './types';
import { ErrorNote, Loading, Notice } from './components/common';
import { NotConfigured } from './pages/NotConfigured';
import { AuthScreens, ResetPassword } from './pages/AuthScreens';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { LearnHome, ModuleView, TrackView } from './pages/Learn';
import { Resources } from './pages/Resources';
import { Pathways } from './pages/Pathways';
import { PlanView, PlansList } from './pages/Plans';
import { Support } from './pages/Support';
import { Notifications } from './pages/Notifications';
import { Account } from './pages/Account';
import { Status } from './pages/Status';
import { StaffConsole } from './staff/StaffConsole';

export default function App() {
  return <ErrorBoundary>{supabase ? <ConfiguredApp /> : <NotConfigured />}</ErrorBoundary>;
}

/**
 * A render error anywhere below shows a way back instead of unmounting the
 * whole portal to a blank page. Following the link, or any other change of
 * page, tries again.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.retry);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.retry);
  }

  retry = () => {
    if (this.state.failed) this.setState({ failed: false });
  };

  goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = '#/';
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-xl space-y-2 px-4 py-16 text-sm text-slate-800">
        <p className="text-lg font-semibold">Something went wrong showing this page.</p>
        <p>
          <a className="underline" href="#/" onClick={this.goHome}>
            Go to the portal home
          </a>
          , or reload the page.
        </p>
      </div>
    );
  }
}

function useHashRoute(): [Route, (r: Route) => void] {
  const read = () => (isAuthFragment(window.location.hash) ? parseRoute('') : parseRoute(window.location.hash));
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((r: Route) => {
    window.location.hash = href(r);
  }, []);
  return [route, navigate];
}

function ConfiguredApp() {
  const { loading, session, recovery, clearRecovery, refusedLink, clearRefusedLink } = useSession();
  if (loading) return <Shell><Loading /></Shell>;
  if (recovery) return <Shell email={session?.user.email}><ResetPassword onDone={clearRecovery} /></Shell>;
  if (!session) {
    return (
      <Shell>
        {refusedLink === 'signed-out' && <RefusedLinkNotice signedIn={false} email="" onDismiss={clearRefusedLink} />}
        <AuthScreens />
      </Shell>
    );
  }
  return (
    <SignedIn
      userId={session.user.id}
      email={session.user.email ?? ''}
      refusedLink={refusedLink === 'signed-in'}
      clearRefusedLink={clearRefusedLink}
    />
  );
}

/** A link's tokens were not used because this browser already held a session (see supabase.ts). */
function RefusedLinkNotice({ signedIn, email, onDismiss }: { signedIn: boolean; email: string; onDismiss: () => void }) {
  return (
    <Notice tone="warn">
      {signedIn ? (
        <>
          You are already signed in{email && <> as <strong>{email}</strong></>}, so the link you just opened was not used. If it was meant
          for a different account, sign out on the{' '}
          <a className="underline" href={href({ name: 'account' })}>
            Account
          </a>{' '}
          page, then sign in to that account; for a password reset, use “Forgot password” on the sign-in screen to get a new link.
        </>
      ) : hasStoredSession() ? (
        // The earlier sign-in is still saved (its refresh failed, e.g. offline), so a reload would refuse the link again.
        <>
          The link you just opened was not used, because this browser still has an earlier sign-in saved and we could not check
          it. Check your connection, then reload the page.
        </>
      ) : (
        <>
          The link you just opened was not used, because this browser still had an earlier sign-in saved. That sign-in is no longer
          active, so you can try the link again.{' '}
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Try the link again
          </button>
        </>
      )}{' '}
      <button type="button" className="underline" onClick={onDismiss}>
        Dismiss
      </button>
    </Notice>
  );
}

function SignedIn({
  userId,
  email,
  refusedLink,
  clearRefusedLink,
}: {
  userId: string;
  email: string;
  refusedLink: boolean;
  clearRefusedLink: () => void;
}) {
  const [route, navigate] = useHashRoute();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [error, setError] = useState<unknown>(null);
  // Null until a load succeeds, and again after one fails: unknown is not 0.
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  // Set only by a failed load, so the header can mark the count unknown without flashing during the first load.
  const [unreadFailed, setUnreadFailed] = useState(false);
  // Only the newest request may set the count, so a slow older one cannot overwrite it.
  const unreadSeq = useRef(0);

  const refreshProfile = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([getProfile(userId), getStaffRole()]);
      setProfile(p);
      setStaffRole(r);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [userId]);

  const refreshUnread = useCallback(() => {
    const seq = ++unreadSeq.current;
    countUnreadNotifications(userId)
      .then((count) => {
        if (seq !== unreadSeq.current) return;
        setUnreadCount(count);
        setUnreadFailed(false);
      })
      .catch(() => {
        if (seq !== unreadSeq.current) return;
        setUnreadCount(null);
        setUnreadFailed(true);
      });
  }, [userId]);

  const syncUnread = useCallback((count: number) => {
    unreadSeq.current += 1;
    setUnreadCount(count);
    setUnreadFailed(false);
  }, []);

  useEffect(() => {
    void refreshProfile();
    refreshUnread();
  }, [refreshProfile, refreshUnread]);

  const ctx: PortalContextValue | null = useMemo(
    () =>
      profile
        ? {
            userId,
            email,
            profile,
            staffRole,
            timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
            refreshProfile,
            unreadCount,
            refreshUnread,
            syncUnread,
            navigate,
          }
        : null,
    [userId, email, profile, staffRole, refreshProfile, unreadCount, refreshUnread, syncUnread, navigate],
  );

  if (error && !profile) return <Shell email={email}><ErrorNote error={error} /></Shell>;
  if (!ctx) return <Shell email={email}><Loading /></Shell>;

  return (
    <PortalContext.Provider value={ctx}>
      <Shell email={email} nav={<Nav route={route} unreadFailed={unreadFailed} />} >
        {refusedLink && <RefusedLinkNotice signedIn email={email} onDismiss={clearRefusedLink} />}
        {ctx.profile.onboarding_complete ? <Page route={route} /> : <Onboarding onDone={refreshProfile} />}
      </Shell>
    </PortalContext.Provider>
  );
}

function Page({ route }: { route: Route }) {
  // Keyed by href so a new id remounts the view: nothing carries over from the previous one.
  switch (route.name) {
    case 'dashboard': return <Dashboard />;
    case 'learn': return <LearnHome />;
    case 'track': return <TrackView key={href(route)} trackId={route.trackId} />;
    // Keyed by track only: Learn.tsx handles a module change in place, so Previous/Next does not reload the track.
    case 'module': return <ModuleView key={route.trackId} trackId={route.trackId} moduleId={route.moduleId} />;
    case 'resources': return <Resources />;
    case 'pathways': return <Pathways />;
    case 'plans': return <PlansList />;
    case 'plan': return <PlanView key={href(route)} planId={route.planId} />;
    case 'support': return <Support />;
    case 'notifications': return <Notifications />;
    case 'account': return <Account />;
    case 'status': return <Status />;
    case 'staff': return <StaffConsole section={route.section} />;
    default: return <p className="text-sm text-slate-600">That page does not exist. <a className="underline" href="#/">Go to your dashboard</a>.</p>;
  }
}

const NAV: { label: string; route: Route; match: Route['name'][] }[] = [
  { label: 'Dashboard', route: { name: 'dashboard' }, match: ['dashboard'] },
  { label: 'Learn', route: { name: 'learn' }, match: ['learn', 'track', 'module'] },
  { label: 'Resources', route: { name: 'resources' }, match: ['resources'] },
  { label: 'Pathways', route: { name: 'pathways' }, match: ['pathways'] },
  { label: 'Action plans', route: { name: 'plans' }, match: ['plans', 'plan'] },
  { label: 'Support', route: { name: 'support' }, match: ['support'] },
];

function Nav({ route, unreadFailed }: { route: Route; unreadFailed: boolean }) {
  return (
    <PortalContext.Consumer>
      {(ctx) =>
        ctx && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => (
              <a key={n.label} href={href(n.route)} className={`rounded px-3 py-1.5 ${n.match.includes(route.name) ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {n.label}
              </a>
            ))}
            {can.triageSupport(ctx.staffRole) && (
              <a href={href({ name: 'staff', section: can.manageInvites(ctx.staffRole) ? 'invites' : 'support' })} className={`rounded px-3 py-1.5 ${route.name === 'staff' ? 'bg-amber-700 text-white' : 'text-amber-800 hover:bg-amber-50'}`}>
                Staff
              </a>
            )}
            <span className="ml-auto flex items-center gap-1">
              <a href={href({ name: 'notifications' })} className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                Notifications
                {ctx.unreadCount !== null && ctx.unreadCount > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{ctx.unreadCount}</span>}
                {ctx.unreadCount === null && unreadFailed && (
                  <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600" title="Unread count unavailable" aria-label="Unread count unavailable">?</span>
                )}
              </a>
              <a href={href({ name: 'account' })} className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100">Account</a>
            </span>
          </nav>
        )
      }
    </PortalContext.Consumer>
  );
}

/** `email` is shown whenever a session exists, so a change of account is never silent. */
function Shell({ children, nav, email }: { children: React.ReactNode; nav?: React.ReactNode; email?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <a href="#/" className="text-lg font-semibold">🏛️ The Excellence District</a>
            <span className="min-w-0 text-right text-xs text-slate-500">
              Member Portal
              {email && (
                <span className="block break-all">
                  Signed in as <span className="font-medium text-slate-700">{email}</span>
                </span>
              )}
            </span>
          </div>
          {nav && <div className="mt-3">{nav}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500">
        <p className="mb-2">
          Educational content for members. Nothing in this portal sends email, posts, or contacts anyone on your behalf. <a className="underline" href="#/status">System status</a>
        </p>
        <NotLegalOrFinancialAdviceFooter />
      </footer>
    </div>
  );
}
