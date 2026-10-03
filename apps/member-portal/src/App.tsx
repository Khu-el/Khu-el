import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotLegalOrFinancialAdviceFooter } from '@nte/governance-core';
import { supabase } from './supabase';
import { useSession } from './auth/useSession';
import { PortalContext, can, type PortalContextValue } from './context';
import { getProfile, getStaffRole, listNotifications } from './data/api';
import { href, isAuthFragment, parseRoute, type Route } from './logic/routes';
import type { Profile, StaffRole } from './types';
import { ErrorNote, Loading } from './components/common';
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
  if (!supabase) return <NotConfigured />;
  return <ConfiguredApp />;
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
  const { loading, session, recovery, clearRecovery } = useSession();
  if (loading) return <Shell><Loading /></Shell>;
  if (recovery) return <Shell><ResetPassword onDone={clearRecovery} /></Shell>;
  if (!session) return <Shell><AuthScreens /></Shell>;
  return <SignedIn userId={session.user.id} email={session.user.email ?? ''} />;
}

function SignedIn({ userId, email }: { userId: string; email: string }) {
  const [route, navigate] = useHashRoute();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
    listNotifications(userId)
      .then((n) => setUnreadCount(n.filter((x) => !x.read_at).length))
      .catch(() => undefined);
  }, [userId]);

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
            navigate,
          }
        : null,
    [userId, email, profile, staffRole, refreshProfile, unreadCount, refreshUnread, navigate],
  );

  if (error && !profile) return <Shell><ErrorNote error={error} /></Shell>;
  if (!ctx) return <Shell><Loading /></Shell>;

  return (
    <PortalContext.Provider value={ctx}>
      <Shell nav={<Nav route={route} />} >
        {ctx.profile.onboarding_complete ? <Page route={route} /> : <Onboarding onDone={refreshProfile} />}
      </Shell>
    </PortalContext.Provider>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'dashboard': return <Dashboard />;
    case 'learn': return <LearnHome />;
    case 'track': return <TrackView trackId={route.trackId} />;
    case 'module': return <ModuleView trackId={route.trackId} moduleId={route.moduleId} />;
    case 'resources': return <Resources />;
    case 'pathways': return <Pathways />;
    case 'plans': return <PlansList />;
    case 'plan': return <PlanView planId={route.planId} />;
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

function Nav({ route }: { route: Route }) {
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
                Notifications{ctx.unreadCount > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{ctx.unreadCount}</span>}
              </a>
              <a href={href({ name: 'account' })} className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100">Account</a>
            </span>
          </nav>
        )
      }
    </PortalContext.Consumer>
  );
}

function Shell({ children, nav }: { children: React.ReactNode; nav?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <a href="#/" className="text-lg font-semibold">🏛️ The Excellence District</a>
            <span className="text-xs text-slate-500">Member Portal</span>
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
