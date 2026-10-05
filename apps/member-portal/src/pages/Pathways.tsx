// Opportunity pathways: a member states a goal in their own words, the keyword
// router suggests pathways, and a chosen pathway can be saved as a blueprint
// and turned into a 30-day action plan. Every write touches only the member's
// own opportunity_blueprints and action_plans rows (RLS enforces that).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Field, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { createBlueprint, createPlan, deleteBlueprint, listBlueprints, listPathways, updateBlueprint } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, Notice, TextArea, formatDateTime, useLoad } from '../components/common';
import { refPerContent } from '../logic/ids';
import { matchPathways, pathwaySnapshot, type PathwayMatch } from '../logic/pathways';
import { defaultWeeks, todayIn } from '../logic/plans';
import { href } from '../logic/routes';
import type { DestinationType, OpportunityBlueprint, OpportunityPathway } from '../types';

const LINK = 'font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600';
const PLAN_TITLE = '30-Day District Action Plan';

const DESTINATION_LABEL: Record<DestinationType, string> = {
  learning_track: 'Learning track',
  resource: 'Resource',
  service: 'Service',
  community: 'Community',
  external: 'Outside the portal',
};

function destinationLabel(t: unknown): string {
  return typeof t === 'string' && t in DESTINATION_LABEL ? DESTINATION_LABEL[t as DestinationType] : 'Not specified';
}

/** The pathway title recorded with a blueprint, or null when the snapshot has none. */
function snapshotTitle(snapshot: Record<string, unknown> | null | undefined): string | null {
  const t = snapshot?.title;
  return typeof t === 'string' && t.trim() ? t.trim() : null;
}

/** The learning-track id a snapshot points to, when it points to one. */
function snapshotTrackId(snapshot: Record<string, unknown> | null | undefined): string | null {
  if (snapshot?.destination_type !== 'learning_track') return null;
  const id = snapshot.destination_id;
  return typeof id === 'string' && id ? id : null;
}

export function Pathways() {
  const { userId } = usePortal();
  const pathwaysLoad = useLoad(() => listPathways(), []);
  const blueprintsLoad = useLoad(() => listBlueprints(userId), [userId]);
  const [goal, setGoal] = useState('');

  const active = useMemo(() => (pathwaysLoad.data ?? []).filter((p) => p.is_active), [pathwaysLoad.data]);
  const trimmedGoal = goal.trim();
  const matches = useMemo(() => (trimmedGoal ? matchPathways(trimmedGoal, active) : []), [trimmedGoal, active]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pathways</h1>
        <p className="text-sm text-slate-600">
          Describe what you want to work on, and we will point you to the parts of the portal that cover it. Pathways are learning suggestions to help you plan — not
          financial, legal, tax or investment advice.
        </p>
      </div>

      <Card title="Find your pathway" subtitle="Matching looks for the words in your goal. Nothing you type here is saved until you choose “Save as blueprint”.">
        <Field label="Your goal" hint="In your own words, for example: “build a monthly budget” or “learn how business credit works”.">
          <TextInput value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={500} placeholder="What do you want to work on?" />
        </Field>

        {pathwaysLoad.loading && !pathwaysLoad.data ? (
          <Loading label="Loading pathways…" />
        ) : pathwaysLoad.error && !pathwaysLoad.data ? (
          <div className="space-y-2">
            <ErrorNote error={pathwaysLoad.error} />
            <Button type="button" variant="secondary" onClick={pathwaysLoad.reload}>
              Try again
            </Button>
          </div>
        ) : active.length === 0 ? (
          <Empty>No pathways have been published yet. They will appear here when they are added.</Empty>
        ) : (
          <PathwayResults goal={trimmedGoal} matches={matches} active={active} onBlueprintSaved={blueprintsLoad.reload} />
        )}
      </Card>

      <BlueprintsCard load={blueprintsLoad} />
    </div>
  );
}

// ---------------------------------------------------------------- pathway results

function PathwayResults({
  goal,
  matches,
  active,
  onBlueprintSaved,
}: {
  goal: string;
  matches: PathwayMatch[];
  active: OpportunityPathway[];
  onBlueprintSaved: () => void;
}) {
  if (!goal) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Type a goal above to see the closest matches. Meanwhile, here are all {active.length} pathways.</p>
        <PathwayList pathways={active.map((p) => ({ pathway: p, matched: [] }))} goal={goal} onBlueprintSaved={onBlueprintSaved} />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="space-y-3">
        <Notice>None of the pathway keywords appear in your goal, so here are all {active.length} pathways. Pick the one that fits best, or try different words.</Notice>
        <PathwayList pathways={active.map((p) => ({ pathway: p, matched: [] }))} goal={goal} onBlueprintSaved={onBlueprintSaved} />
      </div>
    );
  }

  const matchedIds = new Set(matches.map((m) => m.pathway.id));
  const others = active.filter((p) => !matchedIds.has(p.id));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {matches.length === 1 ? '1 pathway matches' : `${matches.length} pathways match`} words in your goal, closest first.
      </p>
      <PathwayList pathways={matches.map((m) => ({ pathway: m.pathway, matched: m.matched }))} goal={goal} onBlueprintSaved={onBlueprintSaved} />
      {others.length > 0 && (
        <details className="rounded border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            Browse the other {others.length} {others.length === 1 ? 'pathway' : 'pathways'}
          </summary>
          <div className="mt-3">
            <PathwayList pathways={others.map((p) => ({ pathway: p, matched: [] }))} goal={goal} onBlueprintSaved={onBlueprintSaved} />
          </div>
        </details>
      )}
    </div>
  );
}

function PathwayList({
  pathways,
  goal,
  onBlueprintSaved,
}: {
  pathways: { pathway: OpportunityPathway; matched: string[] }[];
  goal: string;
  onBlueprintSaved: () => void;
}) {
  return (
    <ul className="space-y-3">
      {pathways.map(({ pathway, matched }) => (
        <PathwayCard key={pathway.id} pathway={pathway} matched={matched} goal={goal} onBlueprintSaved={onBlueprintSaved} />
      ))}
    </ul>
  );
}

function PathwayCard({
  pathway,
  matched,
  goal,
  onBlueprintSaved,
}: {
  pathway: OpportunityPathway;
  matched: string[];
  goal: string;
  onBlueprintSaved: () => void;
}) {
  const { userId } = usePortal();
  const [open, setOpen] = useState(false);
  const [bpGoal, setBpGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const openForm = () => {
    setBpGoal(goal);
    setNotes('');
    setError(null);
    setSavedMsg(false);
    setOpen(true);
  };

  const save = async () => {
    const g = bpGoal.trim();
    if (!g) {
      setError(new Error('Write your goal before saving the blueprint.'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBlueprint(userId, {
        goal: g,
        pathway_key: pathway.id,
        pathway_snapshot: pathwaySnapshot(pathway),
        notes: notes.trim() || null,
      });
      setOpen(false);
      setSavedMsg(true);
      onBlueprintSaved();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  const isTrack = pathway.destination_type === 'learning_track';

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{pathway.title}</h3>
          <Badge tone="blue">{destinationLabel(pathway.destination_type)}</Badge>
        </div>
        {pathway.summary ? (
          <p className="text-sm text-slate-700">{pathway.summary}</p>
        ) : (
          <p className="text-sm text-slate-500">No summary has been written for this pathway yet.</p>
        )}
        {matched.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
            <span>Matched words:</span>
            <ul className="flex flex-wrap gap-1" aria-label="Matched words">
              {matched.map((k, i) => (
                <li key={`${k}-${i}`}>
                  <Badge tone="green">{k}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
          {isTrack &&
            (pathway.destination_id ? (
              <a className={LINK} href={href({ name: 'track', trackId: pathway.destination_id })}>
                Go to the learning track
              </a>
            ) : (
              <span className="text-xs text-slate-500">The learning track for this pathway has not been linked yet.</span>
            ))}
          {!open && (
            <Button type="button" variant="secondary" onClick={openForm}>
              Save as blueprint
            </Button>
          )}
        </div>
        {savedMsg && !open && <Notice tone="success">Saved. You will find it under “Your blueprints” below.</Notice>}
      </div>

      {open && (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm text-slate-700">A blueprint keeps your goal with this pathway so you can come back to it or start a 30-day plan from it.</p>
          <Field label="Goal">
            <TextInput value={bpGoal} onChange={(e) => setBpGoal(e.target.value)} maxLength={500} required />
          </Field>
          <Field label="Notes (optional)" hint="Anything you want to remember — only you can see this.">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} />
          </Field>
          <ErrorNote error={error} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save blueprint'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- blueprints

function BlueprintsCard({ load }: { load: { data: OpportunityBlueprint[] | null; error: unknown; loading: boolean; reload: () => void } }) {
  const { data, error, loading, reload } = load;
  return (
    <Card title="Your blueprints" subtitle="Goals you have saved with a pathway. Only you can see these.">
      {loading && !data ? (
        <Loading label="Loading your blueprints…" />
      ) : error && !data ? (
        <div className="space-y-2">
          <ErrorNote error={error} />
          <Button type="button" variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <Empty>You have not saved any blueprints yet. Find a pathway above and choose “Save as blueprint”.</Empty>
      ) : (
        <div className="space-y-3">
          {error ? <ErrorNote error={error} /> : null}
          <ul className="space-y-3">
            {data.map((bp) => (
              <BlueprintItem key={bp.id} blueprint={bp} onChanged={reload} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function BlueprintItem({ blueprint, onChanged }: { blueprint: OpportunityBlueprint; onChanged: () => void }) {
  const { userId, timezone, navigate } = usePortal();
  const [notes, setNotes] = useState(blueprint.notes ?? '');
  const [busy, setBusy] = useState<null | 'notes' | 'delete' | 'plan'>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState<unknown>(null);
  // Idempotency key for "Start 30-day plan": a retry cannot create a second plan.
  const [planRefFor] = useState(refPerContent);
  const [notesSaved, setNotesSaved] = useState(false);

  // Fresh rows from the database replace the draft.
  useEffect(() => setNotes(blueprint.notes ?? ''), [blueprint.notes]);

  const title = snapshotTitle(blueprint.pathway_snapshot);
  const trackId = snapshotTrackId(blueprint.pathway_snapshot);
  const notesDirty = notes.trim() !== (blueprint.notes ?? '').trim();

  const run = async (kind: 'notes' | 'delete' | 'plan', action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const saveNotes = () =>
    run('notes', async () => {
      await updateBlueprint(blueprint.id, { notes: notes.trim() || null });
      setNotesSaved(true);
      onChanged();
    });

  const remove = () => {
    if (!window.confirm(`Delete the blueprint “${blueprint.goal}”? This cannot be undone. Any plan you already started from it is kept.`)) return;
    void run('delete', async () => {
      await deleteBlueprint(blueprint.id);
      onChanged();
    });
  };

  const startPlan = () =>
    run('plan', async () => {
      const planInput = { goal: blueprint.goal, title: PLAN_TITLE, pathway_key: blueprint.pathway_key, start_date: todayIn(timezone) };
      const plan = await createPlan(planInput, defaultWeeks(blueprint.goal, title), planRefFor(JSON.stringify(planInput)));
      navigate({ name: 'plan', planId: plan.id });
    });

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">{blueprint.goal}</p>
        <p className="text-sm text-slate-600">
          Pathway:{' '}
          {title ? (
            trackId ? (
              <a className={LINK} href={href({ name: 'track', trackId })}>
                {title}
              </a>
            ) : (
              <span className="text-slate-800">{title}</span>
            )
          ) : (
            <span className="text-slate-500">not recorded</span>
          )}
        </p>
        <p className="text-xs text-slate-500">Saved {formatDateTime(blueprint.created_at, timezone)}</p>

        <Field label="Notes" hint="Only you can see these.">
          <TextArea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesSaved(false);
            }}
            rows={3}
            maxLength={4000}
            placeholder="No notes yet."
          />
        </Field>
        {notesSaved && !notesDirty && <p className="text-xs text-emerald-700">Notes saved.</p>}

        <ErrorNote error={error} />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void startPlan()} disabled={busy !== null}>
            {busy === 'plan' ? 'Starting plan…' : 'Start 30-day plan'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void saveNotes()} disabled={busy !== null || !notesDirty}>
            {busy === 'notes' ? 'Saving…' : 'Save notes'}
          </Button>
          <Button type="button" variant="danger" onClick={remove} disabled={busy !== null}>
            {busy === 'delete' ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </li>
  );
}
