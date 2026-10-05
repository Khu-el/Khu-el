// Staff → Content studio (editor, admin, owner). Tracks, lessons
// (learning_modules), resources and pathways, including unpublished rows.
// Every tab is a CatalogEditor with its own config; the database's RLS
// (private.is_content_editor) decides whether a write is allowed.
import { useState } from 'react';
import { Field, Select, Tabs, TextInput } from '@nte/governance-core';
import { listModules, listPathways, listResources, listTracks } from '../data/api';
import { Notice, TextArea, useLoad } from '../components/common';
import { safeUrl } from '../logic/text';
import {
  DESTINATION_TYPES,
  MODULE_CONTENT_TYPES,
  RESOURCE_TYPES,
  type DestinationType,
  type LearningModule,
  type LearningTrack,
  type ModuleContentType,
  type OpportunityPathway,
  type Resource,
  type ResourceType,
} from '../types';
import { CatalogEditor, type CatalogConfig, type DraftBase } from './CatalogEditor';
import { BodyPreview, parseList, parseSortOrder, textOrNull } from './shared';

const SUMMARY_MAX = 2000;
const PILLAR_MAX = 100;
const BODY_MAX = 50000; // learning_modules.body check constraint
const URL_MAX = 2000;
const DEST_ID_MAX = 200;
const SORT_ERROR = 'Sort order must be a whole number (or leave it empty for 0).';
const URL_ERROR = 'The link must be a full web address starting with https:// or http://, or left empty.';

type Sub = 'tracks' | 'lessons' | 'resources' | 'pathways';

interface Catalog {
  tracks: LearningTrack[];
  modules: LearningModule[];
  resources: Resource[];
  pathways: OpportunityPathway[];
}

const PUBLISHED = {
  column: 'is_published' as const,
  on: 'Published',
  off: 'Unpublished',
  show: 'Publish',
  hide: 'Unpublish',
  field: 'Published — visible to members',
};

const CONTENT_TYPE_LABELS: Record<ModuleContentType, string> = {
  lesson: 'Lesson',
  video: 'Video',
  document: 'Document',
  exercise: 'Exercise',
  assessment: 'Assessment',
};

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  article: 'Article',
  video: 'Video',
  document: 'Document',
  tool: 'Tool',
  template: 'Template',
  course: 'Course',
  link: 'Link',
};

const DESTINATION_LABELS: Record<DestinationType, string> = {
  learning_track: 'Learning track',
  resource: 'Resource',
  service: 'Service',
  community: 'Community',
  external: 'External',
};

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function trackLabel(tracks: LearningTrack[], id: string | null): string {
  if (!id) return 'None';
  const t = tracks.find((x) => x.id === id);
  if (!t) return `${id} (track not found)`;
  return t.is_published ? t.title : `${t.title} (unpublished)`;
}

function trackOptions(tracks: LearningTrack[], current: string, empty: { value: string; label: string } | null): { value: string; label: string }[] {
  const opts = tracks.map((t) => ({ value: t.id, label: t.is_published ? t.title : `${t.title} (unpublished)` }));
  // Keep a dangling value visible rather than silently showing another track.
  if (current && !tracks.some((t) => t.id === current)) opts.unshift({ value: current, label: `${current} (track not found — choose another)` });
  return empty ? [empty, ...opts] : opts;
}

/** An empty URL is fine (null); anything else must be http(s). */
function checkUrl(input: string): { ok: true; value: string | null } | { ok: false } {
  const t = input.trim();
  if (t === '') return { ok: true, value: null };
  if (t.length > URL_MAX || !safeUrl(t)) return { ok: false };
  return { ok: true, value: t };
}

function SortField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <Field label="Sort order" hint="Lower numbers come first. Leave empty for 0.">
      <TextInput inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="max-w-[10rem]" />
    </Field>
  );
}

function UrlField({ value, onChange, disabled, hint }: { value: string; onChange: (v: string) => void; disabled: boolean; hint: string }) {
  const t = value.trim();
  const safe = safeUrl(t);
  return (
    <Field label="Content URL" hint={hint}>
      <TextInput type="url" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} maxLength={URL_MAX} spellCheck={false} autoCapitalize="off" />
      {t !== '' &&
        (safe ? (
          <a href={safe} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-sky-800 underline">
            Open this link in a new tab to check it
          </a>
        ) : (
          <span className="mt-1 block text-xs text-red-700">Not a usable link yet. It must start with https:// or http://.</span>
        ))}
    </Field>
  );
}

function SummaryField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <Field label="Summary" hint="Optional. One or two plain-language sentences.">
      <TextArea rows={3} value={value} maxLength={SUMMARY_MAX} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </Field>
  );
}

// ---------------------------------------------------------------- tracks

interface TrackDraft extends DraftBase {
  pillar: string;
  summary: string;
  sort_order: string;
}

function trackConfig(c: Catalog): CatalogConfig<LearningTrack, TrackDraft> {
  const pillars = Array.from(new Set(c.tracks.map((t) => t.pillar).filter(Boolean))).sort();
  return {
    table: 'learning_tracks',
    noun: 'track',
    plural: 'Tracks',
    visibility: {
      ...PUBLISHED,
      get: (r) => r.is_published,
      hint: 'An unpublished track, and every lesson in it, is hidden from members.',
    },
    columns: [
      { label: 'Pillar', cell: (r) => r.pillar },
      {
        label: 'Lessons',
        cell: (r) => {
          const lessons = c.modules.filter((m) => m.track_id === r.id);
          if (lessons.length === 0) return 'None yet';
          return `${lessons.length} (${lessons.filter((m) => m.is_published).length} published)`;
        },
      },
      { label: 'Order', cell: (r) => r.sort_order },
    ],
    blank: () => ({ id: '', idTouched: false, title: '', visible: false, pillar: '', summary: '', sort_order: '' }),
    fromRow: (r) => ({ id: r.id, idTouched: true, title: r.title, visible: r.is_published, pillar: r.pillar, summary: r.summary ?? '', sort_order: String(r.sort_order) }),
    build: (d) => {
      const pillar = d.pillar.trim();
      if (!pillar) return { error: 'Enter a pillar — the theme this track is grouped under.' };
      if (pillar.length > PILLAR_MAX) return { error: `Keep the pillar under ${PILLAR_MAX} characters.` };
      const sort = parseSortOrder(d.sort_order);
      if (sort === null) return { error: SORT_ERROR };
      return { values: { pillar, summary: textOrNull(d.summary), sort_order: sort } };
    },
    renderFields: (d, set, disabled) => (
      <>
        <Field label="Pillar" hint="The theme the track is grouped under on the Learn page. Pick an existing one or type a new one.">
          <TextInput list="staff-track-pillars" value={d.pillar} onChange={(e) => set({ pillar: e.target.value })} maxLength={PILLAR_MAX} disabled={disabled} />
        </Field>
        <datalist id="staff-track-pillars">
          {pillars.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <SummaryField value={d.summary} onChange={(v) => set({ summary: v })} disabled={disabled} />
        <SortField value={d.sort_order} onChange={(v) => set({ sort_order: v })} disabled={disabled} />
      </>
    ),
    deleteWarning: (r) => {
      const lessons = c.modules.filter((m) => m.track_id === r.id).length;
      const resources = c.resources.filter((x) => x.track_id === r.id).length;
      const pathways = c.pathways.filter((p) => p.destination_type === 'learning_track' && p.destination_id === r.id).length;
      const parts: string[] = [];
      if (lessons > 0) parts.push(`${plural(lessons, 'lesson')} in this track will be deleted with it.`);
      if (resources > 0) parts.push(`${plural(resources, 'resource')} linked to it will be kept but no longer linked to any track.`);
      if (pathways > 0) parts.push(`${plural(pathways, 'pathway')} point to this track and will lead nowhere until you change them.`);
      if (lessons > 0) parts.push("Members' progress records are kept, but the lessons will no longer show.");
      return parts.join(' ');
    },
  };
}

// ---------------------------------------------------------------- lessons

interface LessonDraft extends DraftBase {
  track_id: string;
  summary: string;
  content_type: ModuleContentType;
  content_url: string;
  body: string;
  sort_order: string;
}

function lessonConfig(c: Catalog, tracksLoaded: boolean): CatalogConfig<LearningModule, LessonDraft> {
  return {
    table: 'learning_modules',
    noun: 'lesson',
    plural: 'Lessons',
    visibility: {
      ...PUBLISHED,
      get: (r) => r.is_published,
      hint: 'Members see a published lesson only when its track is published too.',
    },
    columns: [
      { label: 'Track', cell: (r) => trackLabel(c.tracks, r.track_id) },
      { label: 'Type', cell: (r) => CONTENT_TYPE_LABELS[r.content_type] ?? r.content_type },
      { label: 'Order', cell: (r) => r.sort_order },
    ],
    filter: {
      label: 'Show lessons in',
      options: [{ value: '', label: 'All tracks' }, ...c.tracks.map((t) => ({ value: t.id, label: t.is_published ? t.title : `${t.title} (unpublished)` }))],
      match: (r, v) => r.track_id === v,
    },
    createBlocked: tracksLoaded && c.tracks.length === 0 ? 'Create a track first. Every lesson belongs to a track.' : null,
    blank: (filterValue) => ({
      id: '',
      idTouched: false,
      title: '',
      visible: false,
      track_id: filterValue || (c.tracks.length === 1 ? c.tracks[0].id : ''),
      summary: '',
      content_type: 'lesson',
      content_url: '',
      body: '',
      sort_order: '',
    }),
    fromRow: (r) => ({
      id: r.id,
      idTouched: true,
      title: r.title,
      visible: r.is_published,
      track_id: r.track_id,
      summary: r.summary ?? '',
      content_type: r.content_type,
      content_url: r.content_url ?? '',
      body: r.body ?? '',
      sort_order: String(r.sort_order),
    }),
    build: (d) => {
      if (!d.track_id) return { error: 'Choose the track this lesson belongs to.' };
      if (!c.tracks.some((t) => t.id === d.track_id)) return { error: 'That track no longer exists. Choose another track.' };
      if (!(MODULE_CONTENT_TYPES as readonly string[]).includes(d.content_type)) return { error: 'Choose a content type.' };
      const url = checkUrl(d.content_url);
      if (!url.ok) return { error: URL_ERROR };
      const body = d.body.replace(/\s+$/, '');
      if (body.length > BODY_MAX) return { error: `The lesson body is over the ${BODY_MAX.toLocaleString()}-character limit. Shorten it or split it into two lessons.` };
      const sort = parseSortOrder(d.sort_order);
      if (sort === null) return { error: SORT_ERROR };
      return {
        values: {
          track_id: d.track_id,
          summary: textOrNull(d.summary),
          content_type: d.content_type,
          content_url: url.value,
          body: body.trim() === '' ? null : body,
          sort_order: sort,
        },
      };
    },
    renderFields: (d, set, disabled) => (
      <>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Track">
            <Select value={d.track_id} onChange={(v) => set({ track_id: v })} options={trackOptions(c.tracks, d.track_id, d.track_id ? null : { value: '', label: 'Choose a track' })} />
          </Field>
          <Field label="Content type">
            <Select
              value={d.content_type}
              onChange={(v) => set({ content_type: v as ModuleContentType })}
              options={MODULE_CONTENT_TYPES.map((t) => ({ value: t, label: CONTENT_TYPE_LABELS[t] }))}
            />
          </Field>
        </div>
        <SummaryField value={d.summary} onChange={(v) => set({ summary: v })} disabled={disabled} />
        <UrlField
          value={d.content_url}
          onChange={(v) => set({ content_url: v })}
          disabled={disabled}
          hint="Optional. A video, document or page members open in a new tab. Must start with https:// or http://."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Lesson body"
            hint={`Plain text. "# " starts a heading ("## ", "### " for smaller ones), "- " a bullet, "1. " a numbered item; a blank line starts a new paragraph. No HTML. Web addresses show as plain text — use Content URL for a link. ${d.body.length.toLocaleString()} / ${BODY_MAX.toLocaleString()} characters.`}
          >
            <TextArea rows={18} value={d.body} maxLength={BODY_MAX} onChange={(e) => set({ body: e.target.value })} disabled={disabled} className="font-mono" />
          </Field>
          <div className="mb-3 text-sm">
            <p className="mb-1 font-medium text-slate-700">Preview</p>
            <div className="max-h-[28rem] overflow-y-auto rounded border border-slate-200 bg-white px-4 py-3" aria-live="off">
              <BodyPreview body={d.body} />
            </div>
          </div>
        </div>
        <SortField value={d.sort_order} onChange={(v) => set({ sort_order: v })} disabled={disabled} />
      </>
    ),
    deleteWarning: () => "Members' progress records for it are kept, but the lesson will no longer show.",
  };
}

// ---------------------------------------------------------------- resources

interface ResourceDraft extends DraftBase {
  resource_type: ResourceType;
  summary: string;
  content_url: string;
  track_id: string; // '' = no track
  tags: string;
  sort_order: string;
}

function resourceConfig(c: Catalog): CatalogConfig<Resource, ResourceDraft> {
  return {
    table: 'resources',
    noun: 'resource',
    plural: 'Resources',
    visibility: {
      ...PUBLISHED,
      get: (r) => r.is_published,
      hint: 'An unpublished resource is hidden from members.',
    },
    columns: [
      { label: 'Type', cell: (r) => RESOURCE_TYPE_LABELS[r.resource_type] ?? r.resource_type },
      { label: 'Track', cell: (r) => trackLabel(c.tracks, r.track_id) },
      { label: 'Tags', cell: (r) => (r.tags.length ? r.tags.join(', ') : 'None') },
      { label: 'Order', cell: (r) => r.sort_order },
    ],
    blank: () => ({ id: '', idTouched: false, title: '', visible: false, resource_type: 'article', summary: '', content_url: '', track_id: '', tags: '', sort_order: '' }),
    fromRow: (r) => ({
      id: r.id,
      idTouched: true,
      title: r.title,
      visible: r.is_published,
      resource_type: r.resource_type,
      summary: r.summary ?? '',
      content_url: r.content_url ?? '',
      track_id: r.track_id ?? '',
      tags: r.tags.join(', '),
      sort_order: String(r.sort_order),
    }),
    build: (d) => {
      if (!(RESOURCE_TYPES as readonly string[]).includes(d.resource_type)) return { error: 'Choose a resource type.' };
      const url = checkUrl(d.content_url);
      if (!url.ok) return { error: URL_ERROR };
      if (d.track_id && !c.tracks.some((t) => t.id === d.track_id)) return { error: 'That track no longer exists. Choose another track or "No track".' };
      const sort = parseSortOrder(d.sort_order);
      if (sort === null) return { error: SORT_ERROR };
      return {
        values: {
          resource_type: d.resource_type,
          summary: textOrNull(d.summary),
          content_url: url.value,
          track_id: d.track_id || null,
          tags: parseList(d.tags),
          sort_order: sort,
        },
      };
    },
    renderFields: (d, set, disabled) => (
      <>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Resource type">
            <Select
              value={d.resource_type}
              onChange={(v) => set({ resource_type: v as ResourceType })}
              options={RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABELS[t] }))}
            />
          </Field>
          <Field label="Track" hint="Optional. Shows the resource alongside that track.">
            <Select value={d.track_id} onChange={(v) => set({ track_id: v })} options={trackOptions(c.tracks, d.track_id, { value: '', label: 'No track' })} />
          </Field>
        </div>
        <SummaryField value={d.summary} onChange={(v) => set({ summary: v })} disabled={disabled} />
        <UrlField value={d.content_url} onChange={(v) => set({ content_url: v })} disabled={disabled} hint="Optional. Opens in a new tab for members. Must start with https:// or http://." />
        <Field label="Tags" hint={`Separate tags with commas, for example: budgeting, credit. ${parseList(d.tags).length} tag(s).`}>
          <TextInput value={d.tags} onChange={(e) => set({ tags: e.target.value })} disabled={disabled} maxLength={500} />
        </Field>
        <SortField value={d.sort_order} onChange={(v) => set({ sort_order: v })} disabled={disabled} />
      </>
    ),
    deleteWarning: () => 'Members who saved it keep their saved record, but the resource will no longer show.',
  };
}

// ---------------------------------------------------------------- pathways

interface PathwayDraft extends DraftBase {
  summary: string;
  keywords: string;
  destination_type: DestinationType;
  destination_id: string;
  sort_order: string;
}

function pathwayConfig(c: Catalog): CatalogConfig<OpportunityPathway, PathwayDraft> {
  return {
    table: 'opportunity_pathways',
    noun: 'pathway',
    plural: 'Pathways',
    visibility: {
      column: 'is_active',
      get: (r) => r.is_active,
      on: 'Active',
      off: 'Inactive',
      show: 'Activate',
      hide: 'Deactivate',
      field: 'Active — members can see this pathway and match goals to it',
      hint: 'An inactive pathway is hidden from members and never matched.',
    },
    columns: [
      { label: 'Keywords', cell: (r) => (r.keywords.length ? r.keywords.join(', ') : 'None — never matched') },
      {
        label: 'Destination',
        cell: (r) => (
          <>
            <span className="block">{DESTINATION_LABELS[r.destination_type] ?? r.destination_type}</span>
            <span className="block text-xs text-slate-500">
              {r.destination_type === 'learning_track' ? (r.destination_id ? trackLabel(c.tracks, r.destination_id) : 'Not linked yet') : r.destination_id || 'Not linked yet'}
            </span>
          </>
        ),
      },
      { label: 'Order', cell: (r) => r.sort_order },
    ],
    blank: () => ({ id: '', idTouched: false, title: '', visible: false, summary: '', keywords: '', destination_type: 'learning_track', destination_id: '', sort_order: '' }),
    fromRow: (r) => ({
      id: r.id,
      idTouched: true,
      title: r.title,
      visible: r.is_active,
      summary: r.summary ?? '',
      keywords: r.keywords.join(', '),
      destination_type: r.destination_type,
      destination_id: r.destination_id ?? '',
      sort_order: String(r.sort_order),
    }),
    build: (d) => {
      if (!(DESTINATION_TYPES as readonly string[]).includes(d.destination_type)) return { error: 'Choose a destination type.' };
      const dest = d.destination_id.trim();
      if (d.destination_type === 'learning_track' && dest && !c.tracks.some((t) => t.id === dest)) {
        return { error: 'That track no longer exists. Choose another track or "Not linked yet".' };
      }
      if (dest.length > DEST_ID_MAX) return { error: `Keep the destination under ${DEST_ID_MAX} characters.` };
      const sort = parseSortOrder(d.sort_order);
      if (sort === null) return { error: SORT_ERROR };
      return {
        values: {
          summary: textOrNull(d.summary),
          keywords: parseList(d.keywords, true),
          destination_type: d.destination_type,
          destination_id: dest === '' ? null : dest,
          sort_order: sort,
        },
      };
    },
    renderFields: (d, set, disabled) => {
      const keywords = parseList(d.keywords, true);
      return (
        <>
          <SummaryField value={d.summary} onChange={(v) => set({ summary: v })} disabled={disabled} />
          <Field
            label="Keywords"
            hint={
              keywords.length
                ? `Separate with commas. Saved in lowercase: ${keywords.join(', ')}. A member's goal that mentions one of these is matched to this pathway.`
                : 'Separate with commas, for example: budget, credit, savings. With no keywords the pathway is never matched to a goal, though members can still browse it.'
            }
          >
            <TextInput value={d.keywords} onChange={(e) => set({ keywords: e.target.value })} disabled={disabled} maxLength={1000} />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Destination type">
              <Select
                value={d.destination_type}
                onChange={(v) => {
                  const next = v as DestinationType;
                  // A track id means nothing to another destination type, and vice versa.
                  const crosses = (next === 'learning_track') !== (d.destination_type === 'learning_track');
                  set(crosses ? { destination_type: next, destination_id: '' } : { destination_type: next });
                }}
                options={DESTINATION_TYPES.map((t) => ({ value: t, label: DESTINATION_LABELS[t] }))}
              />
            </Field>
            {d.destination_type === 'learning_track' ? (
              <Field label="Destination track">
                <Select value={d.destination_id} onChange={(v) => set({ destination_id: v })} options={trackOptions(c.tracks, d.destination_id, { value: '', label: 'Not linked yet' })} />
              </Field>
            ) : (
              <Field label="Destination ID" hint="Optional. An identifier for where this pathway leads, for example a resource ID. Leave empty if it is not linked yet.">
                <TextInput value={d.destination_id} onChange={(e) => set({ destination_id: e.target.value })} disabled={disabled} maxLength={DEST_ID_MAX} spellCheck={false} />
              </Field>
            )}
          </div>
          <SortField value={d.sort_order} onChange={(v) => set({ sort_order: v })} disabled={disabled} />
        </>
      );
    },
    deleteWarning: () => 'Blueprints members already saved keep their own copy of this pathway.',
  };
}

// ---------------------------------------------------------------- studio

const SUB_TABS: { id: Sub; label: string }[] = [
  { id: 'tracks', label: 'Tracks' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'resources', label: 'Resources' },
  { id: 'pathways', label: 'Pathways' },
];

export function ContentStudio() {
  const [tab, setTab] = useState<Sub>('tracks');
  const tracks = useLoad(() => listTracks(), []);
  const modules = useLoad(() => listModules(), []);
  const resources = useLoad(() => listResources(), []);
  const pathways = useLoad(() => listPathways(), []);

  // A change in one table can change another (deleting a track deletes its
  // lessons and unlinks resources), so every save reloads all four.
  const reloadAll = () => {
    tracks.reload();
    modules.reload();
    resources.reload();
    pathways.reload();
  };

  const catalog: Catalog = {
    tracks: tracks.data ?? [],
    modules: modules.data ?? [],
    resources: resources.data ?? [],
    pathways: pathways.data ?? [],
  };

  return (
    <div className="space-y-4">
      <Notice>
        Published items are live for members as soon as you save. Keep content educational and in plain language: no financial, legal, tax or investment
        advice, and no income or return claims. New items start unpublished.
      </Notice>
      <Tabs tabs={SUB_TABS} active={tab} onChange={(id) => setTab(id as Sub)} />
      {/* All four stay mounted so an unsaved form survives switching tabs. */}
      <div hidden={tab !== 'tracks'}>
        <CatalogEditor config={trackConfig(catalog)} rows={tracks.data} loading={tracks.loading} error={tracks.error} reload={reloadAll} />
      </div>
      <div hidden={tab !== 'lessons'}>
        <CatalogEditor config={lessonConfig(catalog, tracks.data !== null)} rows={modules.data} loading={modules.loading} error={modules.error} reload={reloadAll} />
      </div>
      <div hidden={tab !== 'resources'}>
        <CatalogEditor config={resourceConfig(catalog)} rows={resources.data} loading={resources.loading} error={resources.error} reload={reloadAll} />
      </div>
      <div hidden={tab !== 'pathways'}>
        <CatalogEditor config={pathwayConfig(catalog)} rows={pathways.data} loading={pathways.loading} error={pathways.error} reload={reloadAll} />
      </div>
    </div>
  );
}
