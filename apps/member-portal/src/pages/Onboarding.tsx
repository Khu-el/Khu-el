// First-run setup, shown until profile.onboarding_complete. One page, three
// steps: about you, what you want to work on, and an optional 30-day plan.
// Nothing here contacts anyone; every write is to the member's own rows.
import { useMemo, useRef, useState } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { createBlueprint, createPlan, getPreferences, listPathways, savePreferences, updateProfile } from '../data/api';
import { refPerContent } from '../logic/ids';
import { matchPathways, pathwaySnapshot } from '../logic/pathways';
import { defaultWeeks, todayIn } from '../logic/plans';
import { Badge, ErrorNote, Loading, Notice, TextArea, useLoad } from '../components/common';
import type { OpportunityPathway } from '../types';

const PLAN_TITLE = '30-Day District Action Plan';

/** Every update channel starts off; the member opts in from Account. */
const DEFAULT_PREFERENCES = {
  email_updates: false,
  push_updates: false,
  product_updates: false,
  analytics_consent: false,
};

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * IANA zones from Intl.supportedValuesOf when the browser has it (ES2022, so
 * it is reached through a guarded cast), plus any zone we must be able to
 * show (the saved one and the browser's own) so the Select never loses them.
 */
function timeZoneOptions(...include: (string | null | undefined)[]): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  let zones: string[] = [];
  try {
    zones = typeof intl.supportedValuesOf === 'function' ? intl.supportedValuesOf('timeZone') : [];
  } catch {
    zones = [];
  }
  const set = new Set(zones);
  for (const z of include) if (z) set.add(z);
  if (set.size === 0) set.add('UTC');
  return [...set].sort((a, b) => a.localeCompare(b));
}

interface SavedSteps {
  prefs: boolean;
  blueprint: boolean;
  plan: boolean;
}

export function Onboarding({ onDone }: { onDone: () => Promise<void> }) {
  const { userId, profile } = usePortal();

  const browserZone = useMemo(() => browserTimeZone(), []);
  const initialZone = profile.timezone || browserZone || 'UTC';
  const zones = useMemo(() => timeZoneOptions(initialZone, browserZone), [initialZone, browserZone]);

  const [name, setName] = useState(profile.display_name ?? '');
  const [timeZone, setTimeZone] = useState(initialZone);
  const [goal, setGoal] = useState('');
  const [chosenId, setChosenId] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [startPlan, setStartPlan] = useState(true);
  const [saving, setSaving] = useState<'finish' | 'skip' | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Idempotency key for the plan: a retry with the same answers cannot create a second plan.
  const [planRefFor] = useState(refPerContent);

  // Steps that already succeeded, so a retry after a partial failure does not
  // create a second blueprint or plan.
  const saved = useRef<SavedSteps>({ prefs: false, blueprint: false, plan: false });
  const [savedView, setSavedView] = useState<SavedSteps>(saved.current);

  const pathways = useLoad(() => listPathways(), []);
  const active = useMemo(() => (pathways.data ?? []).filter((p) => p.is_active), [pathways.data]);
  const matches = useMemo(() => matchPathways(goal, active), [goal, active]);
  const matchIds = useMemo(() => new Set(matches.map((m) => m.pathway.id)), [matches]);
  const others = useMemo(() => active.filter((p) => !matchIds.has(p.id)), [active, matchIds]);
  const chosen: OpportunityPathway | null = active.find((p) => p.id === chosenId) ?? null;

  const goalText = goal.trim();
  const displayName = name.trim() || null;
  const needsGoal = (startPlan || chosen !== null) && goalText === '';
  const busy = saving !== null || finished;
  // Keep the full list open when the chosen pathway is not among the suggestions.
  const othersOpen = matches.length === 0 || showAll || (chosen !== null && !matchIds.has(chosen.id));

  async function finish() {
    if (needsGoal || busy) return;
    setSaving('finish');
    setError(null);
    try {
      await updateProfile(userId, { display_name: displayName, timezone: timeZone });
      if (!saved.current.prefs) {
        const existing = await getPreferences(userId);
        if (!existing) await savePreferences(userId, DEFAULT_PREFERENCES);
        saved.current = { ...saved.current, prefs: true };
      }
      if (chosen && !saved.current.blueprint) {
        await createBlueprint(userId, {
          goal: goalText,
          pathway_key: chosen.id,
          pathway_snapshot: pathwaySnapshot(chosen),
          notes: null,
        });
        saved.current = { ...saved.current, blueprint: true };
      }
      if (startPlan && !saved.current.plan) {
        const planInput = { goal: goalText, title: PLAN_TITLE, pathway_key: chosen?.id ?? null, start_date: todayIn(timeZone) };
        await createPlan(planInput, defaultWeeks(goalText, chosen?.title), planRefFor(JSON.stringify(planInput)));
        saved.current = { ...saved.current, plan: true };
      }
      await updateProfile(userId, { onboarding_complete: true });
      setFinished(true);
      await onDone();
    } catch (e) {
      setError(e);
    } finally {
      setSavedView(saved.current);
      setSaving(null);
    }
  }

  async function skip() {
    if (busy) return;
    setSaving('skip');
    setError(null);
    try {
      await updateProfile(userId, { display_name: displayName, timezone: timeZone, onboarding_complete: true });
      setFinished(true);
      await onDone();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  }

  const alreadySaved = [savedView.blueprint && 'your pathway choice', savedView.plan && 'your action plan'].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome to The Excellence District</h1>
        <p className="text-sm text-slate-600">
          A few quick questions to set up your portal. You can change any of this later, or skip it for now.
        </p>
      </header>

      <Card title="1. About you">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Display name" hint="Shown to you in the portal. You can change it later in Account.">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="nickname" disabled={busy} />
          </Field>
          <Field label="Time zone" hint="Used for dates, and for when each week of a plan begins.">
            <Select value={timeZone} onChange={setTimeZone} options={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))} />
          </Field>
        </div>
      </Card>

      <Card title="2. What do you want to work on?" subtitle="In your own words. We use it to suggest a learning pathway.">
        <Field label="Your goal">
          <TextArea
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={500}
            placeholder="For example: learn how to plan a household budget"
            disabled={busy}
          />
        </Field>

        {pathways.loading && <Loading label="Loading pathways…" />}
        {pathways.error != null && (
          <div className="space-y-2">
            <ErrorNote error={pathways.error} />
            <p className="text-sm text-slate-600">You can still finish setup without choosing a pathway.</p>
            <Button variant="secondary" type="button" onClick={pathways.reload}>
              Try loading pathways again
            </Button>
          </div>
        )}

        {!pathways.loading && pathways.error == null && (
          <fieldset className="space-y-3" disabled={busy}>
            <legend className="mb-2 text-sm font-medium text-slate-700">Choose a pathway (optional)</legend>

            {active.length === 0 ? (
              <Notice>No pathways have been published yet. You can finish setup now and explore Pathways later.</Notice>
            ) : (
              <>
                {matches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">Suggested for your goal:</p>
                    {matches.map((m) => (
                      <PathwayOption key={m.pathway.id} pathway={m.pathway} matched={m.matched} checked={chosenId === m.pathway.id} onSelect={() => setChosenId(m.pathway.id)} />
                    ))}
                  </div>
                )}

                {matches.length === 0 && (
                  <p className="text-sm text-slate-600">
                    {goalText ? 'None of the pathways matched those words. Choose one below, or skip this step.' : 'Describe your goal above to see suggestions, or choose from every pathway below.'}
                  </p>
                )}

                {matches.length > 0 && others.length > 0 && !othersOpen && (
                  <Button variant="secondary" type="button" onClick={() => setShowAll(true)}>
                    Show all pathways ({others.length} more)
                  </Button>
                )}

                {othersOpen && others.length > 0 && (
                  <div className="space-y-2">
                    {matches.length > 0 && <p className="text-sm text-slate-600">Other pathways:</p>}
                    {others.map((p) => (
                      <PathwayOption key={p.id} pathway={p} checked={chosenId === p.id} onSelect={() => setChosenId(p.id)} />
                    ))}
                  </div>
                )}

                <label className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm ${chosenId === '' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                  <input type="radio" name="onboarding-pathway" className="mt-1" checked={chosenId === ''} onChange={() => setChosenId('')} />
                  <span>No pathway for now</span>
                </label>
              </>
            )}
          </fieldset>
        )}
      </Card>

      <Card title="3. Your first 30 days">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={startPlan} onChange={(e) => setStartPlan(e.target.checked)} disabled={busy} />
          <span>
            <span className="block font-medium text-slate-900">Start a 30-day action plan</span>
            <span className="block text-slate-600">
              Four weekly prompts, starting today ({todayIn(timeZone)}), that you edit into your own actions. You can change or delete the plan at any time.
            </span>
          </span>
        </label>
      </Card>

      <p className="text-xs text-slate-500">
        Pathways and plans are educational starting points. They are not financial, legal, tax or investment advice. Update emails and other optional
        preferences start switched off; you can change them in Account.
      </p>

      {needsGoal && <Notice>To finish with a plan or a pathway, write a goal in step 2. To finish without them, untick the plan and choose “No pathway for now”.</Notice>}
      {alreadySaved.length > 0 && error != null && (
        <Notice>Already saved: {alreadySaved.join(' and ')}. Finishing again will not save {alreadySaved.length > 1 ? 'them' : 'it'} twice.</Notice>
      )}
      <ErrorNote error={error} />
      {finished && error == null && <Notice tone="success">Your answers are saved. Opening your dashboard… If nothing changes, refresh the page.</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void finish()} disabled={busy || needsGoal}>
          {saving === 'finish' ? 'Saving…' : 'Finish setup'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void skip()} disabled={busy}>
          {saving === 'skip' ? 'Saving…' : 'Skip for now'}
        </Button>
      </div>
      <p className="text-xs text-slate-500">“Skip for now” saves only your name and time zone.</p>
    </div>
  );
}

function PathwayOption({
  pathway,
  matched,
  checked,
  onSelect,
}: {
  pathway: OpportunityPathway;
  matched?: string[];
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}>
      <input type="radio" name="onboarding-pathway" className="mt-1" checked={checked} onChange={onSelect} />
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-medium text-slate-900">{pathway.title}</span>
        {pathway.summary && <span className="block text-sm text-slate-600">{pathway.summary}</span>}
        {matched && matched.length > 0 && (
          <span className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-slate-500">Matched words:</span>
            {matched.map((k) => (
              <Badge key={k} tone="blue">
                {k}
              </Badge>
            ))}
          </span>
        )}
      </span>
    </label>
  );
}
