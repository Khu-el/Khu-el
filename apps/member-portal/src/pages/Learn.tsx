// Learning tracks, their modules, and a member's own completion record.
// Completion shown here comes from learning_progress; a change is shown only
// after the database accepts it, with "Saving…" until then. Lesson bodies are
// parsed into blocks and rendered as React text -- never as HTML.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Stat } from '@nte/governance-core';
import { usePortal } from '../context';
import { listModules, listProgress, listResources, listSaved, listTracks, setModuleCompleted } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, Notice, formatDateTime, useLoad } from '../components/common';
import { fmtPercent, hasOwnKey, latestByModule, trackProgress, type ProgressRow } from '../logic/progress';
import { href } from '../logic/routes';
import { parseBody, safeUrl, type Block } from '../logic/text';
import type { LearningModule, LearningProgress, LearningTrack } from '../types';
import { ResourceCard, isVisibleToViewer, typeLabel, useSavedResources } from './Resources';

const PREPARING = 'Lessons for this track are being prepared.';

function sortModules(modules: LearningModule[]): LearningModule[] {
  return [...modules].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

/**
 * Completion state for one track's modules. `recorded` is what the database
 * returned; overrides hold changes the database has since accepted. Nothing
 * changes on screen while a write is pending.
 */
function useCompletion(userId: string, trackId: string, recorded: LearningProgress[] | null, modules: LearningModule[] | null) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  // Tagged with its module, so a failure on one lesson is not shown under another.
  const [error, setError] = useState<{ moduleId: string; error: unknown } | null>(null);
  const clearError = useCallback(() => setError(null), []);

  // Fresh rows from the database replace any local overrides.
  useEffect(() => {
    setOverrides({});
    setError(null);
  }, [recorded, trackId]);

  // Matched by module id, not the row's track id: a lesson moved between tracks keeps its record.
  // A row older than its module (a re-created lesson that reused an id) is ignored.
  const recordedByModule = useMemo(() => latestByModule(recorded ?? [], modules ?? undefined), [recorded, modules]);

  const rows: ProgressRow[] = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const [moduleId, p] of recordedByModule) map.set(moduleId, { track_id: trackId, module_id: moduleId, completed: p.completed });
    for (const [moduleId, completed] of Object.entries(overrides)) map.set(moduleId, { track_id: trackId, module_id: moduleId, completed });
    return [...map.values()];
  }, [recordedByModule, overrides, trackId]);

  const isCompleted = (moduleId: string): boolean =>
    hasOwnKey(overrides, moduleId) ? overrides[moduleId] : Boolean(recordedByModule.get(moduleId)?.completed);

  /** When the database recorded completion. After a change made here the new date has not been read back, so none is shown. */
  const completedAt = (moduleId: string): string | null => {
    if (hasOwnKey(overrides, moduleId)) return null;
    const row = recordedByModule.get(moduleId);
    return row?.completed ? row.completed_at : null;
  };

  const toggle = async (moduleId: string) => {
    if (pending[moduleId]) return;
    const after = !isCompleted(moduleId);
    setError(null);
    setPending((p) => ({ ...p, [moduleId]: true }));
    try {
      await setModuleCompleted(userId, trackId, moduleId, after);
      setOverrides((o) => ({ ...o, [moduleId]: after }));
    } catch (e) {
      setError({ moduleId, error: e });
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[moduleId];
        return next;
      });
    }
  };

  return {
    rows,
    isCompleted,
    completedAt,
    toggle,
    isPending: (moduleId: string) => Boolean(pending[moduleId]),
    /** The last failed change, if it was to one of these modules. */
    errorFor: (moduleIds: string[]): unknown => (error && moduleIds.includes(error.moduleId) ? error.error : null),
    clearError,
  };
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  // Only a measured percentage gets a bar; unknown progress shows nothing rather than an empty 0% bar.
  if (!Number.isFinite(percent)) return null;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="h-full bg-emerald-600" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

function DraftBadge({ show }: { show: boolean }) {
  return show ? <Badge tone="amber">Draft — members cannot see this</Badge> : null;
}

function NotFound({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card title={title}>
      <div className="space-y-2 text-sm text-slate-700">{children}</div>
    </Card>
  );
}

// ---------------------------------------------------------------- Learn home

export function LearnHome() {
  const { userId, staffRole } = usePortal();
  const staffViewer = staffRole !== null;
  const { data, error, loading } = useLoad(
    () => Promise.all([listTracks(), listModules(), listProgress(userId)]).then(([tracks, modules, progress]) => ({ tracks, modules, progress })),
    [userId],
  );

  const groups = useMemo(() => {
    const out: { pillar: string; tracks: LearningTrack[] }[] = [];
    for (const t of data?.tracks ?? []) {
      if (!isVisibleToViewer(t.is_published, staffViewer)) continue;
      const pillar = t.pillar?.trim() || 'Other';
      let g = out.find((x) => x.pillar === pillar);
      if (!g) {
        g = { pillar, tracks: [] };
        out.push(g);
      }
      g.tracks.push(t);
    }
    return out;
  }, [data, staffViewer]);

  if (loading && !data) return <Loading label="Loading learning tracks…" />;
  if (error && !data) return <ErrorNote error={error} />;

  const publishedModules = (data?.modules ?? []).filter((m) => m.is_published);
  const progress = data?.progress ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Learn</h1>
        <p className="text-sm text-slate-600">
          Learning tracks grouped by pillar. Progress shows only the modules you have marked complete. This is education, not financial, legal, tax or investment advice.
        </p>
      </div>

      {groups.length === 0 ? (
        <Empty>No learning tracks have been published yet. They will appear here when they are added.</Empty>
      ) : (
        groups.map((g) => (
          // Pillar names contain spaces, which an id cannot; the section is named directly.
          <section key={g.pillar} className="space-y-3" aria-label={g.pillar}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {g.pillar}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {g.tracks.map((t) => {
                const tp = trackProgress(t.id, publishedModules, progress);
                return (
                  <li key={t.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <a className="font-semibold text-slate-900 underline-offset-2 hover:underline" href={href({ name: 'track', trackId: t.id })}>
                        {t.title}
                      </a>
                      <DraftBadge show={!t.is_published} />
                    </div>
                    {t.summary ? <p className="text-sm text-slate-700">{t.summary}</p> : <p className="text-sm text-slate-500">No summary has been written for this track yet.</p>}
                    {tp.total === 0 ? (
                      <p className="text-sm text-slate-500">{PREPARING}</p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">
                          {tp.total} {tp.total === 1 ? 'module' : 'modules'} · {tp.completed} completed · {fmtPercent(tp.percent)}
                        </p>
                        <ProgressBar percent={tp.percent} label={`${t.title} progress`} />
                        {tp.next ? (
                          <p className="text-sm">
                            <span className="text-slate-500">Up next: </span>
                            <a className="text-sky-800 underline" href={href({ name: 'module', trackId: t.id, moduleId: tp.next.id })}>
                              {tp.next.title}
                            </a>
                          </p>
                        ) : (
                          <p className="text-sm text-emerald-800">You have marked every module in this track complete.</p>
                        )}
                      </>
                    )}
                    <a className="mt-auto text-sm font-medium text-slate-900 underline" href={href({ name: 'track', trackId: t.id })}>
                      Open track
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Track view

export function TrackView({ trackId }: { trackId: string }) {
  const { userId, staffRole } = usePortal();
  const staffViewer = staffRole !== null;
  const { data: loaded, error, loading } = useLoad(
    () =>
      Promise.all([listTracks(), listModules(trackId), listProgress(userId), listResources(), listSaved(userId)]).then(([tracks, modules, progress, resources, saved]) => ({
        trackId,
        userId,
        tracks,
        modules,
        progress,
        resources,
        saved,
      })),
    [trackId, userId],
  );
  // useLoad keeps the previous track's rows while the next loads; never read them as this track's.
  const data = loaded && loaded.trackId === trackId && loaded.userId === userId ? loaded : null;
  const completion = useCompletion(userId, trackId, data?.progress ?? null, data?.modules ?? null);
  const savedState = useSavedResources(userId, data?.saved ?? null);

  if (!data) return error && !loading ? <ErrorNote error={error} /> : <Loading label="Loading track…" />;

  const track = (data?.tracks ?? []).find((t) => t.id === trackId && isVisibleToViewer(t.is_published, staffViewer));
  if (!track) {
    return (
      <NotFound title="We could not find that track">
        <p>It may have been renamed, or it is not published yet.</p>
        <p>
          <a className="underline" href={href({ name: 'learn' })}>
            Back to all learning tracks
          </a>
        </p>
      </NotFound>
    );
  }

  const modules = sortModules((data?.modules ?? []).filter((m) => m.track_id === trackId && isVisibleToViewer(m.is_published, staffViewer)));
  const tp = trackProgress(trackId, modules.filter((m) => m.is_published), completion.rows);
  const trackResources = (data?.resources ?? []).filter((r) => r.track_id === trackId && isVisibleToViewer(r.is_published, staffViewer));

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <a className="underline" href={href({ name: 'learn' })}>
          Learn
        </a>{' '}
        › <span aria-current="page">{track.title}</span>
      </nav>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{track.pillar}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{track.title}</h1>
          <DraftBadge show={!track.is_published} />
        </div>
        {track.summary && <p className="text-sm text-slate-700">{track.summary}</p>}
      </div>

      {modules.length === 0 ? (
        <Notice>{PREPARING}</Notice>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Modules" value={String(tp.total)} />
            <Stat label="Completed" value={String(tp.completed)} sub="Marked complete by you" />
            <Stat label="Progress" value={fmtPercent(tp.percent)} />
          </div>
          <ProgressBar percent={tp.percent} label={`${track.title} progress`} />

          {tp.next ? (
            <Notice>
              Up next:{' '}
              <a className="font-medium underline" href={href({ name: 'module', trackId, moduleId: tp.next.id })}>
                {tp.next.title}
              </a>
            </Notice>
          ) : (
            tp.total > 0 && <Notice tone="success">You have marked every module in this track complete.</Notice>
          )}

          <ErrorNote error={completion.errorFor(modules.map((m) => m.id))} />

          <section aria-labelledby="modules-heading" className="space-y-2">
            <h2 id="modules-heading" className="text-lg font-semibold text-slate-900">
              Modules
            </h2>
            <ol className="space-y-2">
              {modules.map((m, i) => {
                const done = completion.isCompleted(m.id);
                const saving = completion.isPending(m.id);
                const isNext = tp.next?.id === m.id;
                const inputId = `module-done-${m.id}`;
                return (
                  <li key={m.id} className={`rounded-lg border p-4 ${isNext ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">{i + 1}.</span>
                          <a className="font-medium text-slate-900 underline-offset-2 hover:underline" href={href({ name: 'module', trackId, moduleId: m.id })}>
                            {m.title}
                          </a>
                          <Badge tone="blue">{typeLabel(m.content_type)}</Badge>
                          {isNext && <Badge tone="amber">Up next</Badge>}
                          <DraftBadge show={!m.is_published} />
                        </div>
                        {m.summary && <p className="text-sm text-slate-700">{m.summary}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          className="h-5 w-5 rounded border-slate-300"
                          checked={done}
                          disabled={saving}
                          onChange={() => void completion.toggle(m.id)}
                        />
                        <label htmlFor={inputId} className={`text-sm ${saving ? 'text-slate-500' : done ? 'font-medium text-emerald-800' : 'text-slate-700'}`}>
                          {saving ? 'Saving…' : 'Completed'}
                          <span className="sr-only">: {m.title}</span>
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}

      <section aria-labelledby="track-resources-heading" className="space-y-2">
        <h2 id="track-resources-heading" className="text-lg font-semibold text-slate-900">
          Resources for this track
        </h2>
        <ErrorNote error={savedState.error} />
        {trackResources.length === 0 ? (
          <p className="text-sm text-slate-500">
            No resources are linked to this track yet.{' '}
            <a className="underline" href={href({ name: 'resources' })}>
              Browse all resources
            </a>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {trackResources.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                track={track}
                showTrack={false}
                saved={savedState.isSaved(r.id)}
                saving={savedState.isPending(r.id)}
                onToggleSave={() => void savedState.toggle(r.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Module view

function BodyBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 text-slate-800">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          if (b.level === 1) return <h2 key={i} className="pt-2 text-xl font-semibold text-slate-900">{b.text}</h2>;
          if (b.level === 2) return <h3 key={i} className="pt-2 text-lg font-semibold text-slate-900">{b.text}</h3>;
          return <h4 key={i} className="pt-1 text-base font-semibold text-slate-900">{b.text}</h4>;
        }
        if (b.kind === 'list') {
          const items = b.items.map((item, j) => <li key={j}>{item}</li>);
          return b.ordered ? (
            <ol key={i} className="list-decimal space-y-1 pl-6 text-sm leading-relaxed">
              {items}
            </ol>
          ) : (
            <ul key={i} className="list-disc space-y-1 pl-6 text-sm leading-relaxed">
              {items}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export function ModuleView({ trackId, moduleId }: { trackId: string; moduleId: string }) {
  const { userId, staffRole, timezone } = usePortal();
  const staffViewer = staffRole !== null;
  const { data: loaded, error, loading } = useLoad(
    () =>
      Promise.all([listTracks(), listModules(trackId), listProgress(userId)]).then(([tracks, modules, progress]) => ({ trackId, userId, tracks, modules, progress })),
    [trackId, userId],
  );
  // useLoad keeps the previous track's rows while the next loads; never read them as this track's.
  const data = loaded && loaded.trackId === trackId && loaded.userId === userId ? loaded : null;
  const completion = useCompletion(userId, trackId, data?.progress ?? null, data?.modules ?? null);
  const { clearError } = completion;

  // Previous/Next links change only the hash; start each module at the top,
  // without the last lesson's error.
  useEffect(() => {
    window.scrollTo(0, 0);
    clearError();
  }, [moduleId, clearError]);

  const track = (data?.tracks ?? []).find((t) => t.id === trackId && isVisibleToViewer(t.is_published, staffViewer)) ?? null;
  const modules = useMemo(
    () => sortModules((data?.modules ?? []).filter((m) => m.track_id === trackId && isVisibleToViewer(m.is_published, staffViewer))),
    [data, trackId, staffViewer],
  );
  const index = modules.findIndex((m) => m.id === moduleId);
  const mod = index >= 0 ? modules[index] : null;
  const blocks = useMemo(() => parseBody(mod?.body), [mod]);

  if (!data) return error && !loading ? <ErrorNote error={error} /> : <Loading label="Loading lesson…" />;

  if (!track || !mod) {
    return (
      <NotFound title="We could not find that lesson">
        <p>It may have been moved, or it is not published yet.</p>
        <p>
          {track ? (
            <a className="underline" href={href({ name: 'track', trackId: track.id })}>
              Back to {track.title}
            </a>
          ) : (
            <a className="underline" href={href({ name: 'learn' })}>
              Back to all learning tracks
            </a>
          )}
        </p>
      </NotFound>
    );
  }

  const prev = index > 0 ? modules[index - 1] : null;
  const next = index < modules.length - 1 ? modules[index + 1] : null;
  const link = safeUrl(mod.content_url);
  const done = completion.isCompleted(mod.id);
  const saving = completion.isPending(mod.id);
  const completedAt = completion.completedAt(mod.id);

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <a className="underline" href={href({ name: 'learn' })}>
              Learn
            </a>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <a className="underline" href={href({ name: 'track', trackId })}>
              {track.title}
            </a>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-slate-700">
            {mod.title}
          </li>
        </ol>
      </nav>

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="space-y-2">
          <p className="text-xs text-slate-500">
            Module {index + 1} of {modules.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{mod.title}</h1>
            <Badge tone="blue">{typeLabel(mod.content_type)}</Badge>
            <DraftBadge show={!mod.is_published} />
          </div>
          {mod.summary && <p className="text-sm text-slate-700">{mod.summary}</p>}
        </header>

        {link ? (
          <p>
            <a className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-slate-50" href={link} target="_blank" rel="noopener noreferrer">
              Open material (opens in a new tab)
            </a>
          </p>
        ) : (
          mod.content_url && <p className="text-xs text-slate-500">This module's material link is not a web address, so it is not shown.</p>
        )}

        {blocks.length > 0 ? <BodyBlocks blocks={blocks} /> : !link && <Empty>Written material for this module is being prepared.</Empty>}
      </article>

      <Card title="Your progress">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700" aria-live="polite">
            {saving
              ? 'Saving…'
              : done
                ? completedAt
                  ? `Marked complete on ${formatDateTime(completedAt, timezone)}.`
                  : 'Marked complete.'
                : 'Not marked complete yet.'}
          </p>
          <Button type="button" variant={done ? 'secondary' : 'primary'} disabled={saving} onClick={() => void completion.toggle(mod.id)}>
            {done ? 'Mark as not complete' : 'Mark complete'}
          </Button>
        </div>
        <div className="mt-3">
          <ErrorNote error={completion.errorFor([mod.id])} />
        </div>
      </Card>

      <nav aria-label="Module navigation" className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          {prev && (
            <a className="underline" href={href({ name: 'module', trackId, moduleId: prev.id })}>
              ← Previous: {prev.title}
            </a>
          )}
        </div>
        <a className="underline" href={href({ name: 'track', trackId })}>
          Back to {track.title}
        </a>
        <div className="sm:text-right">
          {next && (
            <a className="underline" href={href({ name: 'module', trackId, moduleId: next.id })}>
              Next: {next.title} →
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}
