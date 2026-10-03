// The signed-in home page: the member's current plan, learning progress,
// notifications and quick links. Every status shown here comes from a row in
// the database; anything not recorded is shown as "—" or "not done yet".
import { useEffect } from 'react';
import { Button, Card, Stat } from '@nte/governance-core';
import { usePortal } from '../context';
import { listAllWeeks, listModules, listPlans, listProgress, listTracks } from '../data/api';
import { href } from '../logic/routes';
import { currentWeek, parseDay, planProgress, todayIn, weekRange } from '../logic/plans';
import { fmtPercent, trackProgress } from '../logic/progress';
import { Badge, Empty, ErrorNote, Loading, Notice, formatDateTime, useLoad } from '../components/common';
import type { ActionPlan, ActionPlanWeek } from '../types';

const LINK = 'font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600';
const MAX_TRACKS = 5;

/** "2026-10-03" -> "Saturday, October 3, 2026", read as a calendar day (no timezone shift). */
function formatCalendarDay(day: string, style: 'full' | 'medium' = 'medium'): string {
  const d = parseDay(day);
  if (!d) return day || '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: style, timeZone: 'UTC' }).format(d);
  } catch {
    return day;
  }
}

export function Dashboard() {
  const { userId, profile, timezone, refreshUnread } = usePortal();
  const today = todayIn(timezone);
  const name = profile.display_name?.trim();

  // The header badge is loaded once at sign-in; refresh it when the member lands here.
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{name ? `Welcome back, ${name}` : 'Welcome back'}</h1>
        <p className="text-sm text-slate-600">
          {formatCalendarDay(today, 'full')}
          {timezone ? ` · ${timezone.replace(/_/g, ' ')}` : ''}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard userId={userId} today={today} timezone={timezone} />
        <LearningCard userId={userId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NotificationsCard />
        <QuickLinksCard />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- action plan

interface PlanData {
  plan: ActionPlan | null;
  weeks: ActionPlanWeek[];
  activeCount: number;
}

function PlanCard({ userId, today, timezone }: { userId: string; today: string; timezone: string | null }) {
  const { data, error, loading, reload } = useLoad<PlanData>(async () => {
    const [plans, weeks] = await Promise.all([listPlans(userId), listAllWeeks(userId)]);
    // listPlans is newest first, so the first active plan is the newest one.
    const active = plans.filter((p) => p.status === 'active');
    const plan = active[0] ?? null;
    return {
      plan,
      weeks: plan ? weeks.filter((w) => w.plan_id === plan.id).sort((a, b) => a.week_number - b.week_number) : [],
      activeCount: active.length,
    };
  }, [userId]);

  return (
    <Card title="Current action plan" subtitle={data?.plan ? data.plan.title : undefined}>
      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <div className="space-y-2">
          <ErrorNote error={error} />
          <Button type="button" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !data?.plan ? (
        <div className="space-y-2 text-sm">
          <Empty>You do not have an active action plan yet.</Empty>
          <p className="text-center">
            <a className={LINK} href={href({ name: 'pathways' })}>
              Explore pathways to start one
            </a>
            {' · '}
            <a className={LINK} href={href({ name: 'plans' })}>
              See all plans
            </a>
          </p>
        </div>
      ) : (
        <PlanSummary plan={data.plan} weeks={data.weeks} activeCount={data.activeCount} today={today} timezone={timezone} />
      )}
    </Card>
  );
}

function PlanSummary({
  plan,
  weeks,
  activeCount,
  today,
  timezone,
}: {
  plan: ActionPlan;
  weeks: ActionPlanWeek[];
  activeCount: number;
  today: string;
  timezone: string | null;
}) {
  const startReadable = parseDay(plan.start_date) !== null;
  const n = startReadable ? currentWeek(plan.start_date, today) : 0;
  const progress = planProgress(weeks);
  // No week rows means nothing is measurable: show "—", never 0%.
  const percent = progress.total === 0 ? Number.NaN : progress.percent;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-slate-700">
        <span className="font-medium text-slate-900">Goal: </span>
        {plan.goal}
      </p>

      <CurrentWeek plan={plan} weeks={weeks} week={n} startReadable={startReadable} timezone={timezone} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Weeks done" value={progress.total === 0 ? '—' : `${progress.done} of ${progress.total}`} sub="Marked done in your plan" />
        <Stat label="Overall" value={fmtPercent(percent)} sub={progress.total === 0 ? 'No weeks recorded yet' : undefined} />
      </div>
      {Number.isFinite(percent) && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Plan progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full bg-slate-800" style={{ width: `${percent}%` }} />
        </div>
      )}

      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <a className={LINK} href={href({ name: 'plan', planId: plan.id })}>
          Open this plan
        </a>
        {activeCount > 1 && (
          <a className={LINK} href={href({ name: 'plans' })}>
            You have {activeCount} active plans — see all
          </a>
        )}
      </p>
    </div>
  );
}

function CurrentWeek({
  plan,
  weeks,
  week,
  startReadable,
  timezone,
}: {
  plan: ActionPlan;
  weeks: ActionPlanWeek[];
  week: number;
  startReadable: boolean;
  timezone: string | null;
}) {
  if (!startReadable) {
    return <Notice tone="warn">This plan’s start date could not be read, so the current week is unknown. Open the plan to review it.</Notice>;
  }
  if (week === 0) {
    return <Notice>This plan starts on {formatCalendarDay(plan.start_date)}.</Notice>;
  }
  if (week === 5) {
    const last = weekRange(plan.start_date, 4);
    return (
      <Notice>
        The 30 days {last ? `ended on ${formatCalendarDay(last.to)}` : 'have ended'}. Open the plan to review the month and mark it complete when you are ready.
      </Notice>
    );
  }

  const range = weekRange(plan.start_date, week);
  const row = weeks.find((w) => w.week_number === week);
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Week {week} of 4{range ? ` · ${formatCalendarDay(range.from)} – ${formatCalendarDay(range.to)}` : ''}
      </p>
      {row ? (
        <>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="whitespace-pre-line text-slate-700">{row.action_text}</p>
          <p className="flex flex-wrap items-center gap-2">
            {row.completed ? (
              <>
                <Badge tone="green">Done</Badge>
                {row.completed_at && <span className="text-xs text-slate-500">Marked done {formatDateTime(row.completed_at, timezone)}</span>}
              </>
            ) : (
              <Badge tone="amber">Not done yet</Badge>
            )}
          </p>
        </>
      ) : (
        <p className="text-slate-600">This week’s action is not recorded in the plan.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- learning

function LearningCard({ userId }: { userId: string }) {
  const { data, error, loading, reload } = useLoad(async () => {
    const [tracks, modules, progress] = await Promise.all([listTracks(), listModules(), listProgress(userId)]);
    return { tracks, modules, progress };
  }, [userId]);

  const tracks = (data?.tracks ?? []).filter((t) => t.is_published);
  const modules = (data?.modules ?? []).filter((m) => m.is_published);
  const shown = tracks.slice(0, MAX_TRACKS);

  return (
    <Card
      title="Learning"
      right={
        <a className={`text-sm ${LINK}`} href={href({ name: 'learn' })}>
          All tracks
        </a>
      }
    >
      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <div className="space-y-2">
          <ErrorNote error={error} />
          <Button type="button" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : tracks.length === 0 ? (
        <Empty>No learning tracks have been published yet.</Empty>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-slate-200">
            {shown.map((t) => {
              const tp = trackProgress(t.id, modules, data?.progress ?? []);
              return (
                <li key={t.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <a className={LINK} href={href({ name: 'track', trackId: t.id })}>
                      {t.title}
                    </a>
                    <span className="shrink-0 font-semibold text-slate-900" aria-label={`${t.title} progress`}>
                      {fmtPercent(tp.percent)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t.pillar}
                    {' · '}
                    {tp.total === 0 ? 'No modules published yet' : `${tp.completed} of ${tp.total} modules completed`}
                  </p>
                  {tp.next ? (
                    <p className="text-slate-700">
                      Next:{' '}
                      <a className={LINK} href={href({ name: 'module', trackId: t.id, moduleId: tp.next.id })}>
                        {tp.next.title}
                      </a>
                    </p>
                  ) : (
                    tp.total > 0 && <p className="text-slate-700">Every published module in this track is marked complete.</p>
                  )}
                </li>
              );
            })}
          </ul>
          {tracks.length > shown.length && (
            <p className="text-sm">
              <a className={LINK} href={href({ name: 'learn' })}>
                See {tracks.length - shown.length} more {tracks.length - shown.length === 1 ? 'track' : 'tracks'}
              </a>
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- notifications and links

function NotificationsCard() {
  const { unreadCount } = usePortal();
  return (
    <Card title="Notifications">
      <div className="space-y-2 text-sm">
        <p className="text-slate-700">
          {unreadCount === 0
            ? 'No unread notifications right now.'
            : unreadCount === 1
              ? 'You have 1 unread notification.'
              : `You have ${unreadCount} unread notifications.`}
        </p>
        <a className={LINK} href={href({ name: 'notifications' })}>
          Open notifications
        </a>
      </div>
    </Card>
  );
}

function QuickLinksCard() {
  const links: { label: string; description: string; to: string }[] = [
    { label: 'Resources', description: 'Articles, tools and templates to learn from.', to: href({ name: 'resources' }) },
    { label: 'Support', description: 'Ask a question or tell us something is not working.', to: href({ name: 'support' }) },
    { label: 'Pathways', description: 'Find a learning pathway for a goal.', to: href({ name: 'pathways' }) },
  ];
  return (
    <Card title="Quick links">
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a className={LINK} href={l.to}>
              {l.label}
            </a>
            <span className="block text-slate-600">{l.description}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
