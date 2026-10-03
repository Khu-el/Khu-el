// 30-day action plans: a list grouped by status, a form to start one, and a
// single-plan view with four editable weeks. Every "done" shown here is a
// `completed` value read back from the database -- nothing is ticked locally
// before the write succeeds.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Field, Select, Stat, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { createPlan, deletePlan, getPlan, listAllWeeks, listPathways, listPlans, setPlanStatus, updatePlan, updateWeek } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, Notice, TextArea, formatDateTime, useLoad } from '../components/common';
import { currentWeek, defaultWeeks, parseDay, planProgress, todayIn, weekRange } from '../logic/plans';
import { fmtPercent } from '../logic/progress';
import { href } from '../logic/routes';
import type { ActionPlan, ActionPlanWeek, OpportunityPathway, PlanStatus } from '../types';

const LINK = 'font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600';
const DEFAULT_TITLE = '30-Day District Action Plan';
const WEEK_NUMBERS = [1, 2, 3, 4] as const;

const STATUS_LABEL: Record<PlanStatus, string> = { active: 'Active', completed: 'Completed', archived: 'Archived' };
const STATUS_TONE: Record<PlanStatus, 'blue' | 'green' | 'slate'> = { active: 'blue', completed: 'green', archived: 'slate' };

/** "2026-10-03" -> "Oct 3, 2026", read as a calendar day (no timezone shift). */
function formatCalendarDay(day: string): string {
  const d = parseDay(day);
  if (!d) return day || '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
  } catch {
    return day;
  }
}

function formatRange(start: string, week: number): string | null {
  const r = weekRange(start, week);
  return r ? `${formatCalendarDay(r.from)} – ${formatCalendarDay(r.to)}` : null;
}

/** Plan progress with "nothing recorded" kept distinct from 0%. */
function progressOf(weeks: Pick<ActionPlanWeek, 'completed'>[]): { done: number; total: number; percent: number } {
  const p = planProgress(weeks);
  return { ...p, percent: p.total === 0 ? Number.NaN : p.percent };
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  if (!Number.isFinite(percent)) return null;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="h-full bg-slate-800" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ================================================================ plans list

interface ListData {
  plans: ActionPlan[];
  weeksByPlan: Map<string, ActionPlanWeek[]>;
}

export function PlansList() {
  const { userId, timezone } = usePortal();
  const today = todayIn(timezone);
  const { data, error, loading, reload } = useLoad<ListData>(async () => {
    const [plans, weeks] = await Promise.all([listPlans(userId), listAllWeeks(userId)]);
    const weeksByPlan = new Map<string, ActionPlanWeek[]>();
    for (const w of weeks) {
      const list = weeksByPlan.get(w.plan_id);
      if (list) list.push(w);
      else weeksByPlan.set(w.plan_id, [w]);
    }
    return { plans, weeksByPlan };
  }, [userId]);
  // Pathways only label plans and feed the optional picker; a failure here never blocks the plan list.
  const pathwaysLoad = useLoad(() => listPathways(), []);
  const pathwayById = useMemo(() => new Map((pathwaysLoad.data ?? []).map((p) => [p.id, p])), [pathwaysLoad.data]);

  const [formOpen, setFormOpen] = useState<boolean | null>(null);

  if (loading && !data) return <Loading label="Loading your action plans…" />;
  if (error && !data) {
    return (
      <div className="space-y-2">
        <ErrorNote error={error} />
        <Button type="button" variant="secondary" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  }

  const plans = data?.plans ?? [];
  const showForm = formOpen ?? plans.length === 0;
  const groups: { status: PlanStatus; title: string; empty: string }[] = [
    { status: 'active', title: 'Active', empty: 'No active plans.' },
    { status: 'completed', title: 'Completed', empty: 'No completed plans yet.' },
    { status: 'archived', title: 'Archived', empty: 'No archived plans.' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Action plans</h1>
          <p className="text-sm text-slate-600">
            A 30-day plan is four weekly actions you write for yourself. It is a personal planning tool — not financial, legal, tax or investment advice.
          </p>
        </div>
        {!showForm && (
          <Button type="button" onClick={() => setFormOpen(true)}>
            New plan
          </Button>
        )}
      </div>

      {showForm && (
        <NewPlanForm
          pathways={(pathwaysLoad.data ?? []).filter((p) => p.is_active)}
          pathwaysLoading={pathwaysLoad.loading && !pathwaysLoad.data}
          pathwaysError={pathwaysLoad.error}
          canCancel={plans.length > 0}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {error ? <ErrorNote error={error} /> : null}

      {plans.length === 0 ? (
        <Empty>
          You have not started an action plan yet. Use the form above, or{' '}
          <a className={LINK} href={href({ name: 'pathways' })}>
            find a pathway
          </a>{' '}
          and start a plan from a blueprint.
        </Empty>
      ) : (
        groups.map((g) => {
          const inGroup = plans.filter((p) => p.status === g.status);
          return (
            <Card key={g.status} title={g.title} subtitle={inGroup.length === 1 ? '1 plan' : `${inGroup.length} plans`}>
              {inGroup.length === 0 ? (
                <p className="text-sm text-slate-500">{g.empty}</p>
              ) : (
                <ul className="space-y-3">
                  {inGroup.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} weeks={data?.weeksByPlan.get(plan.id) ?? []} today={today} pathway={plan.pathway_key ? pathwayById.get(plan.pathway_key) ?? null : null} />
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function PlanRow({ plan, weeks, today, pathway }: { plan: ActionPlan; weeks: ActionPlanWeek[]; today: string; pathway: OpportunityPathway | null }) {
  const progress = progressOf(weeks);
  const startReadable = parseDay(plan.start_date) !== null;
  const week = startReadable ? currentWeek(plan.start_date, today) : 0;
  let timing: string;
  if (!startReadable) timing = 'Start date could not be read';
  else if (plan.status !== 'active') timing = `Started ${formatCalendarDay(plan.start_date)}`;
  else if (week === 0) timing = `Starts ${formatCalendarDay(plan.start_date)}`;
  else if (week === 5) timing = `Started ${formatCalendarDay(plan.start_date)} · the 30 days have ended`;
  else timing = `Started ${formatCalendarDay(plan.start_date)} · week ${week} of 4`;

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <a className={LINK} href={href({ name: 'plan', planId: plan.id })}>
              {plan.title}
            </a>
            <Badge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
          </div>
          <p className="text-sm text-slate-700">{plan.goal}</p>
          <p className="text-xs text-slate-500">
            {timing}
            {pathway ? ` · Pathway: ${pathway.title}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-sm text-slate-700 sm:text-right">
          {progress.total === 0 ? (
            <span className="text-slate-500">No weeks recorded</span>
          ) : (
            <span>
              {progress.done} of {progress.total} weeks done · {fmtPercent(progress.percent)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar percent={progress.percent} label={`Progress for ${plan.title}`} />
      </div>
    </li>
  );
}

function NewPlanForm({
  pathways,
  pathwaysLoading,
  pathwaysError,
  canCancel,
  onCancel,
}: {
  pathways: OpportunityPathway[];
  pathwaysLoading: boolean;
  pathwaysError: unknown;
  canCancel: boolean;
  onCancel: () => void;
}) {
  const { userId, timezone, navigate } = usePortal();
  const [goal, setGoal] = useState('');
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [startDate, setStartDate] = useState(() => todayIn(timezone));
  const [pathwayId, setPathwayId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const options = [{ value: '', label: 'No pathway' }, ...pathways.map((p) => ({ value: p.id, label: p.title }))];
  const hint = pathwaysLoading
    ? 'Loading pathways…'
    : pathwaysError
      ? 'Pathways could not be loaded. You can still start a plan without one.'
      : pathways.length === 0
        ? 'No pathways have been published yet.'
        : 'Links the plan to a pathway and uses it in the starter wording.';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const g = goal.trim();
    const t = title.trim();
    if (!g) return setError(new Error('Write your goal to start a plan.'));
    if (!t) return setError(new Error('Give the plan a title.'));
    if (!parseDay(startDate)) return setError(new Error('Choose a valid start date.'));
    const pathway = pathways.find((p) => p.id === pathwayId) ?? null;
    setSaving(true);
    setError(null);
    try {
      const plan = await createPlan(userId, { goal: g, title: t, pathway_key: pathway ? pathway.id : null, start_date: startDate }, defaultWeeks(g, pathway?.title ?? null));
      navigate({ name: 'plan', planId: plan.id });
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <Card title="New plan" subtitle="We start you with four weekly prompts. Edit each one into your own action after the plan is created.">
      <form onSubmit={(e) => void submit(e)} className="space-y-1">
        <Field label="Goal" hint="What do you want to have done in 30 days?">
          <TextInput value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={500} required />
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Plan title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Field>
        </div>
        <Field label="Pathway (optional)" hint={hint}>
          <Select value={pathwayId} onChange={setPathwayId} options={options} />
        </Field>
        <ErrorNote error={error} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating plan…' : 'Create plan'}
          </Button>
          {canCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

// ================================================================ single plan

export function PlanView({ planId }: { planId: string }) {
  const { timezone } = usePortal();
  const { data, error, loading, reload } = useLoad(() => getPlan(planId), [planId]);

  // A different plan's rows may still be on screen while the new one loads.
  if (loading && (!data || (data.plan && data.plan.id !== planId))) return <Loading label="Loading your plan…" />;
  if (error && !data) {
    return (
      <div className="space-y-2">
        <ErrorNote error={error} />
        <Button type="button" variant="secondary" onClick={reload}>
          Try again
        </Button>
        <p className="text-sm">
          <a className={LINK} href={href({ name: 'plans' })}>
            Back to your plans
          </a>
        </p>
      </div>
    );
  }
  if (!data?.plan) {
    return (
      <Card title="Plan not found">
        <p className="text-sm text-slate-700">We could not find this plan. It may have been deleted, or the link may be incomplete.</p>
        <p className="mt-3 text-sm">
          <a className={LINK} href={href({ name: 'plans' })}>
            Go to your action plans
          </a>
        </p>
      </Card>
    );
  }

  const { plan, weeks } = data;
  const today = todayIn(timezone);
  const startReadable = parseDay(plan.start_date) !== null;
  const nowWeek = startReadable ? currentWeek(plan.start_date, today) : 0;
  const progress = progressOf(weeks);

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <a className={LINK} href={href({ name: 'plans' })}>
          ← All action plans
        </a>
      </p>

      {error ? <ErrorNote error={error} /> : null}

      <PlanHeader key={plan.id} plan={plan} onSaved={reload} />

      <Card title="Progress">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Weeks done" value={progress.total === 0 ? '—' : `${progress.done} of ${progress.total}`} sub="Marked done in this plan" />
          <Stat label="Overall" value={fmtPercent(progress.percent)} sub={progress.total === 0 ? 'No weeks recorded yet' : undefined} />
        </div>
        <div className="mt-3">
          <ProgressBar percent={progress.percent} label="Plan progress" />
        </div>
        <div className="mt-3">
          <TimingNotice plan={plan} week={nowWeek} startReadable={startReadable} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {WEEK_NUMBERS.map((n) => {
          const row = weeks.find((w) => w.week_number === n);
          const isCurrent = plan.status === 'active' && nowWeek === n;
          return row ? (
            <WeekCard key={row.id} week={row} range={startReadable ? formatRange(plan.start_date, n) : null} isCurrent={isCurrent} timezone={timezone} onSaved={reload} />
          ) : (
            <div key={`missing-${n}`} className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Week {n}</p>
              <p className="mt-1">This week is not recorded in the plan.</p>
            </div>
          );
        })}
      </div>

      <PlanActions plan={plan} weeks={weeks} onChanged={reload} />
    </div>
  );
}

function TimingNotice({ plan, week, startReadable }: { plan: ActionPlan; week: number; startReadable: boolean }) {
  if (!startReadable) return <Notice tone="warn">This plan’s start date could not be read, so the current week is unknown.</Notice>;
  if (plan.status !== 'active') return null;
  if (week === 0) return <Notice>This plan starts on {formatCalendarDay(plan.start_date)}.</Notice>;
  if (week === 5) {
    const last = weekRange(plan.start_date, 4);
    return (
      <Notice>
        The 30 days {last ? `ended on ${formatCalendarDay(last.to)}` : 'have ended'}. Review the month, then mark the plan completed when you are ready.
      </Notice>
    );
  }
  return <Notice>You are in week {week} of 4. It is highlighted below.</Notice>;
}

// ---------------------------------------------------------------- header

function PlanHeader({ plan, onSaved }: { plan: ActionPlan; onSaved: () => void }) {
  const [title, setTitle] = useState(plan.title);
  const [goal, setGoal] = useState(plan.goal);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  // Fresh rows from the database replace the drafts.
  useEffect(() => setTitle(plan.title), [plan.title]);
  useEffect(() => setGoal(plan.goal), [plan.goal]);

  const titleDirty = title.trim() !== plan.title.trim();
  const goalDirty = goal.trim() !== plan.goal.trim();
  const dirty = titleDirty || goalDirty;

  const save = async () => {
    if (savingRef.current || !dirty) return;
    const t = title.trim();
    const g = goal.trim();
    if (!t) return setError(new Error('The plan needs a title before it can be saved.'));
    if (!g) return setError(new Error('The plan needs a goal before it can be saved.'));
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await updatePlan(plan.id, { ...(titleDirty ? { title: t } : {}), ...(goalDirty ? { goal: g } : {}) });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setSaved(false);
  };

  return (
    <Card
      title={plan.title}
      subtitle={`Starts ${formatCalendarDay(plan.start_date)}`}
      right={<Badge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>}
    >
      <Field label="Plan title">
        <TextInput value={title} onChange={edit(setTitle)} onBlur={() => void save()} maxLength={200} />
      </Field>
      <Field label="Goal">
        <TextArea value={goal} onChange={edit(setGoal)} onBlur={() => void save()} rows={2} maxLength={500} />
      </Field>
      <ErrorNote error={error} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save title and goal'}
        </Button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {saving ? '' : dirty ? 'Unsaved changes — they save when you leave the field.' : saved ? 'Saved.' : ''}
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- weeks

function WeekCard({
  week,
  range,
  isCurrent,
  timezone,
  onSaved,
}: {
  week: ActionPlanWeek;
  range: string | null;
  isCurrent: boolean;
  timezone: string | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(week.title);
  const [action, setAction] = useState(week.action_text);
  const [busy, setBusy] = useState<null | 'text' | 'done'>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  // Fresh rows from the database replace the drafts.
  useEffect(() => setTitle(week.title), [week.title]);
  useEffect(() => setAction(week.action_text), [week.action_text]);

  const titleDirty = title.trim() !== week.title.trim();
  const actionDirty = action.trim() !== week.action_text.trim();
  const dirty = titleDirty || actionDirty;

  const run = async (kind: 'text' | 'done', task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const saveText = () => {
    if (!dirty || busyRef.current) return;
    const t = title.trim();
    if (!t) {
      setError(new Error('Each week needs a title before it can be saved.'));
      return;
    }
    void run('text', async () => {
      await updateWeek(week.id, { ...(titleDirty ? { title: t } : {}), ...(actionDirty ? { action_text: action.trim() } : {}) });
      setSaved(true);
      onSaved();
    });
  };

  const toggleDone = () =>
    void run('done', async () => {
      await updateWeek(week.id, { completed: !week.completed });
      onSaved();
    });

  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setSaved(false);
  };

  return (
    <section
      aria-label={`Week ${week.week_number}`}
      className={`rounded-xl border p-5 shadow-sm ${isCurrent ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300' : 'border-slate-200 bg-white'}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Week {week.week_number} of 4</p>
          <p className="text-xs text-slate-500">{range ?? 'Dates unknown'}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {isCurrent && <Badge tone="amber">This week</Badge>}
          {week.completed ? <Badge tone="green">Done</Badge> : <Badge>Not done yet</Badge>}
        </div>
      </div>

      <Field label="Week title">
        <TextInput value={title} onChange={edit(setTitle)} onBlur={saveText} maxLength={200} />
      </Field>
      <Field label="Action for this week">
        <TextArea value={action} onChange={edit(setAction)} onBlur={saveText} rows={4} maxLength={2000} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={saveText} disabled={busy !== null || !dirty}>
          {busy === 'text' ? 'Saving…' : 'Save week'}
        </Button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {busy === 'text' ? '' : dirty ? 'Unsaved changes' : saved ? 'Saved.' : ''}
        </span>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <label className="flex items-start gap-2 text-sm text-slate-800">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={week.completed} onChange={toggleDone} disabled={busy !== null} />
          <span>
            I completed this week’s action
            {busy === 'done' && <span className="ml-2 text-xs text-slate-500">Saving…</span>}
          </span>
        </label>
        {week.completed && week.completed_at && <p className="mt-1 text-xs text-slate-500">Marked done {formatDateTime(week.completed_at, timezone)}</p>}
      </div>

      <div className="mt-2">
        <ErrorNote error={error} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- status and delete

function PlanActions({ plan, weeks, onChanged }: { plan: ActionPlan; weeks: ActionPlanWeek[]; onChanged: () => void }) {
  const { navigate } = usePortal();
  const [busy, setBusy] = useState<null | PlanStatus | 'delete'>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (kind: PlanStatus | 'delete', task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const changeStatus = (status: PlanStatus) => {
    if (status === 'completed') {
      const p = planProgress(weeks);
      if ((p.total === 0 || p.done < p.total) && !window.confirm(`${p.done} of ${p.total} weeks are marked done. Mark the whole plan completed anyway?`)) return;
    }
    void run(status, async () => {
      await setPlanStatus(plan.id, status);
      onChanged();
    });
  };

  const remove = () => {
    if (!window.confirm(`Delete “${plan.title}” and all four of its weeks? This cannot be undone.`)) return;
    void run('delete', async () => {
      await deletePlan(plan.id);
      navigate({ name: 'plans' });
    });
  };

  return (
    <Card title="Plan status" subtitle={`This plan is ${STATUS_LABEL[plan.status].toLowerCase()}.`}>
      <ErrorNote error={error} />
      <div className="mt-2 flex flex-wrap gap-2">
        {plan.status === 'active' && (
          <Button type="button" onClick={() => changeStatus('completed')} disabled={busy !== null}>
            {busy === 'completed' ? 'Saving…' : 'Mark plan completed'}
          </Button>
        )}
        {plan.status !== 'archived' && (
          <Button type="button" variant="secondary" onClick={() => changeStatus('archived')} disabled={busy !== null}>
            {busy === 'archived' ? 'Saving…' : 'Archive'}
          </Button>
        )}
        {plan.status !== 'active' && (
          <Button type="button" variant="secondary" onClick={() => changeStatus('active')} disabled={busy !== null}>
            {busy === 'active' ? 'Saving…' : 'Reactivate'}
          </Button>
        )}
        <Button type="button" variant="danger" onClick={remove} disabled={busy !== null}>
          {busy === 'delete' ? 'Deleting…' : 'Delete plan'}
        </Button>
      </div>
    </Card>
  );
}
