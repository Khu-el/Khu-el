// Resource library: published reading, tools and templates, with filters and a
// per-member "saved" list. Saving is the only write here, and it touches only
// the member's own saved_resources rows.
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { usePortal } from '../context';
import { listResources, listSaved, listTracks, saveResource, unsaveResource } from '../data/api';
import { Badge, Empty, ErrorNote, Loading, useLoad } from '../components/common';
import { hasOwnKey } from '../logic/progress';
import { href } from '../logic/routes';
import { safeUrl } from '../logic/text';
import { RESOURCE_TYPES, type LearningTrack, type Resource, type SavedResource } from '../types';

/** "template" -> "Template". Shared with the Learn pages for content-type badges. */
export function typeLabel(t: string): string {
  return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ') : t;
}

/** Staff can read drafts (RLS allows it); members only ever receive published rows. */
export function isVisibleToViewer(isPublished: boolean, staffViewer: boolean): boolean {
  return isPublished || staffViewer;
}

/**
 * Saved-state for resources. The recorded rows are the base; a local override
 * holds a change only once the database has accepted it, and nothing changes
 * on screen while the write is pending.
 */
export function useSavedResources(userId: string, recorded: SavedResource[] | null) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<unknown>(null);
  const base = useMemo(() => new Set((recorded ?? []).map((s) => s.resource_id)), [recorded]);

  // Fresh rows from the database replace any local overrides.
  useEffect(() => setOverrides({}), [recorded]);

  const isSaved = (resourceId: string): boolean => (hasOwnKey(overrides, resourceId) ? overrides[resourceId] : base.has(resourceId));

  const toggle = async (resourceId: string) => {
    if (pending[resourceId]) return;
    const after = !isSaved(resourceId);
    setError(null);
    setPending((p) => ({ ...p, [resourceId]: true }));
    try {
      if (after) await saveResource(userId, resourceId);
      else await unsaveResource(userId, resourceId);
      setOverrides((o) => ({ ...o, [resourceId]: after }));
    } catch (e) {
      setError(e);
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[resourceId];
        return next;
      });
    }
  };

  return { isSaved, toggle, isPending: (resourceId: string) => Boolean(pending[resourceId]), error };
}

export function ResourceCard({
  resource,
  track,
  saved,
  saving,
  onToggleSave,
  showTrack = true,
}: {
  resource: Resource;
  track: LearningTrack | null;
  saved: boolean;
  saving: boolean;
  onToggleSave: () => void;
  showTrack?: boolean;
}) {
  const link = safeUrl(resource.content_url);
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{resource.title}</h3>
            <Badge tone="blue">{typeLabel(resource.resource_type)}</Badge>
            {!resource.is_published && <Badge tone="amber">Draft — members cannot see this</Badge>}
            {saved && <Badge tone="green">Saved</Badge>}
          </div>
          {showTrack && (
            <p className="text-xs text-slate-500">
              {track ? (
                <>
                  Track:{' '}
                  <a className="underline" href={href({ name: 'track', trackId: track.id })}>
                    {track.title}
                  </a>
                </>
              ) : resource.track_id ? (
                'Track not currently listed'
              ) : (
                'General resource (not tied to a track)'
              )}
            </p>
          )}
          {resource.summary ? <p className="text-sm text-slate-700">{resource.summary}</p> : <p className="text-sm text-slate-500">No summary has been written for this resource yet.</p>}
          {resource.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Tags">
              {resource.tags.map((tag) => (
                <li key={tag}>
                  <Badge>{tag}</Badge>
                </li>
              ))}
            </ul>
          )}
          {link ? (
            <a className="inline-block text-sm font-medium text-sky-800 underline" href={link} target="_blank" rel="noopener noreferrer">
              Open resource (opens in a new tab)
            </a>
          ) : (
            resource.content_url && <p className="text-xs text-slate-500">This resource's link is not a web address, so it is not shown.</p>
          )}
        </div>
        <div className="shrink-0">
          <Button type="button" variant="secondary" disabled={saving} onClick={onToggleSave} aria-pressed={saved}>
            {saving ? 'Saving…' : saved ? 'Remove from saved' : 'Save for later'}
          </Button>
        </div>
      </div>
    </li>
  );
}

const ALL = '';
const NO_TRACK = '__none__';

function matchesSearch(r: Resource, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = [r.title, r.summary ?? '', ...r.tags].join(' ').toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function Resources() {
  const { userId, staffRole } = usePortal();
  const staffViewer = staffRole !== null;
  const { data, error, loading } = useLoad(
    () => Promise.all([listResources(), listTracks(), listSaved(userId)]).then(([resources, tracks, saved]) => ({ resources, tracks, saved })),
    [userId],
  );
  const savedState = useSavedResources(userId, data?.saved ?? null);

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [savedOnly, setSavedOnly] = useState(false);

  const resources = useMemo(() => (data?.resources ?? []).filter((r) => isVisibleToViewer(r.is_published, staffViewer)), [data, staffViewer]);
  const tracks = useMemo(() => (data?.tracks ?? []).filter((t) => isVisibleToViewer(t.is_published, staffViewer)), [data, staffViewer]);
  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  if (loading && !data) return <Loading label="Loading resources…" />;
  if (error && !data) return <ErrorNote error={error} />;

  const hasGeneral = resources.some((r) => !r.track_id || !trackById.has(r.track_id));
  const trackOptions = [
    { value: ALL, label: 'All tracks' },
    ...tracks.map((t) => ({ value: t.id, label: t.title })),
    ...(hasGeneral ? [{ value: NO_TRACK, label: 'General / other' }] : []),
  ];
  const typeOptions = [{ value: ALL, label: 'All types' }, ...RESOURCE_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))];

  const filtered = resources.filter((r) => {
    if (!matchesSearch(r, search)) return false;
    if (trackFilter === NO_TRACK && r.track_id && trackById.has(r.track_id)) return false;
    if (trackFilter !== ALL && trackFilter !== NO_TRACK && r.track_id !== trackFilter) return false;
    if (typeFilter !== ALL && r.resource_type !== typeFilter) return false;
    if (savedOnly && !savedState.isSaved(r.id)) return false;
    return true;
  });
  const filtersActive = search.trim() !== '' || trackFilter !== ALL || typeFilter !== ALL || savedOnly;
  const savedCount = resources.filter((r) => savedState.isSaved(r.id)).length;

  const clearFilters = () => {
    setSearch('');
    setTrackFilter(ALL);
    setTypeFilter(ALL);
    setSavedOnly(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resources</h1>
        <p className="text-sm text-slate-600">Reading, tools and templates for learning. These are educational materials, not financial, legal, tax or investment advice.</p>
      </div>

      <Card title="Find a resource">
        <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search" hint="Matches titles, summaries and tags.">
            <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. budget" />
          </Field>
          <Field label="Track">
            <Select value={trackFilter} onChange={setTrackFilter} options={trackOptions} />
          </Field>
          <Field label="Type">
            <Select value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />
            Saved only ({savedCount} saved)
          </label>
          {filtersActive && (
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      <ErrorNote error={savedState.error} />

      {resources.length === 0 ? (
        <Empty>No resources have been published yet. New material will appear here when it is added.</Empty>
      ) : filtered.length === 0 ? (
        <Empty>
          {savedOnly && savedCount === 0 ? 'You have not saved any resources yet. Use "Save for later" on a resource to keep it here.' : 'No resources match these filters.'}
        </Empty>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {filtered.length} of {resources.length} {resources.length === 1 ? 'resource' : 'resources'}.
          </p>
          <ul className="space-y-3">
            {filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                track={r.track_id ? trackById.get(r.track_id) ?? null : null}
                saved={savedState.isSaved(r.id)}
                saving={savedState.isPending(r.id)}
                onToggleSave={() => void savedState.toggle(r.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
