// The table + create/edit form + delete + publish toggle that every content
// studio tab shares. Each tab supplies a config describing its own columns,
// draft fields and validation; this component owns the saving, the
// confirmations and the error handling.
//
// Writes: a new row is INSERTed (src/data/staff.ts) so a taken id is refused
// rather than overwritten; an edit UPDATEs the editable columns of the
// existing row (created_at/updated_at are left to the database), so saving
// never re-creates a row another editor deleted -- it says the item no longer
// exists instead; the publish toggle updates only the visibility column. RLS
// (private.is_content_editor) is the real gate for all three.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Field, Select, TextInput } from '@nte/governance-core';
import { staffDelete } from '../data/api';
import { staffInsert, staffSetVisibility, staffUpdate, type CatalogTable } from '../data/staff';
import { Badge, Empty, ErrorNote, Loading, Notice } from '../components/common';
import { slugify } from '../logic/text';
import { CheckboxField, ID_MAX, asError, catalogErrorMessage, isValidId } from './shared';

export const TITLE_MAX = 200;

export interface DraftBase {
  id: string;
  /** True once the editor typed an id; until then it follows the title. */
  idTouched: boolean;
  title: string;
  /** is_published, or is_active for pathways. */
  visible: boolean;
}

export interface CatalogRowBase {
  id: string;
  title: string;
}

export interface CatalogConfig<Row extends CatalogRowBase, D extends DraftBase> {
  table: CatalogTable;
  /** Singular, lowercase: "track". */
  noun: string;
  /** Card title: "Tracks". */
  plural: string;
  visibility: {
    column: 'is_published' | 'is_active';
    get: (r: Row) => boolean;
    /** Badge text when visible / hidden. */
    on: string;
    off: string;
    /** Button text to make visible / hidden. */
    show: string;
    hide: string;
    /** Checkbox label and hint in the form. */
    field: string;
    hint: string;
  };
  columns: { label: string; cell: (r: Row) => ReactNode }[];
  /** A new draft; `filterValue` is the current filter selection, if any. */
  blank: (filterValue: string) => D;
  fromRow: (r: Row) => D;
  /** The editable columns other than id, title and visibility -- or a message saying what to fix. */
  build: (d: D) => { error: string } | { values: Record<string, unknown> };
  renderFields: (d: D, set: (patch: Partial<D>) => void, disabled: boolean) => ReactNode;
  deleteWarning?: (r: Row) => string;
  filter?: { label: string; options: { value: string; label: string }[]; match: (r: Row, value: string) => boolean };
  /** When set, "New" is disabled and this explains why. */
  createBlocked?: string | null;
  intro?: ReactNode;
}

// visibleAtOpen: the row's visibility when the form opened, so an edit writes the
// visibility column only when this form changed it -- never another editor's toggle back.
type Mode = { kind: 'new' } | { kind: 'edit'; id: string; visibleAtOpen: boolean } | null;

export function CatalogEditor<Row extends CatalogRowBase, D extends DraftBase>({
  config,
  rows,
  loading,
  error,
  reload,
}: {
  config: CatalogConfig<Row, D>;
  rows: Row[] | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState<D | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [mode]);

  const all = rows ?? [];
  // A filter value whose option has gone (its track was deleted) falls back to "all".
  const activeFilter = config.filter && filterValue && config.filter.options.some((o) => o.value === filterValue) ? filterValue : '';
  const shown = config.filter && activeFilter ? all.filter((r) => config.filter!.match(r, activeFilter)) : all;

  const confirmDiscard = () => !dirty || window.confirm('Discard the changes you have not saved?');

  const openNew = () => {
    if (!confirmDiscard()) return;
    setMode({ kind: 'new' });
    setDraft(config.blank(activeFilter));
    setDirty(false);
    setFormError(null);
    setNotice(null);
  };

  const openEdit = (r: Row) => {
    if (!confirmDiscard()) return;
    const fromRow = config.fromRow(r);
    setMode({ kind: 'edit', id: r.id, visibleAtOpen: fromRow.visible });
    setDraft(fromRow);
    setDirty(false);
    setFormError(null);
    setNotice(null);
  };

  const close = () => {
    setMode(null);
    setDraft(null);
    setDirty(false);
    setFormError(null);
  };

  const cancel = () => {
    if (confirmDiscard()) close();
  };

  const set = (patch: Partial<D>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const setTitle = (title: string) => {
    if (!draft) return;
    const follow = mode?.kind === 'new' && !draft.idTouched;
    set({ title, ...(follow ? { id: slugify(title) } : {}) } as Partial<D>);
  };

  const setId = (id: string) => {
    set({ id: id.toLowerCase(), idTouched: id !== '' } as Partial<D>);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !mode || saving) return;
    const title = draft.title.trim();
    if (!title) {
      setFormError(asError('Enter a title.'));
      return;
    }
    if (title.length > TITLE_MAX) {
      setFormError(asError(`Keep the title under ${TITLE_MAX} characters.`));
      return;
    }
    const id = mode.kind === 'new' ? draft.id.trim() : mode.id;
    if (mode.kind === 'new') {
      if (!isValidId(id)) {
        setFormError(asError(`The ID must be 1–${ID_MAX} lowercase letters or numbers joined by single dashes, like "budget-basics".`));
        return;
      }
      if (rows?.some((r) => r.id === id)) {
        setFormError(asError(`Something with the ID "${id}" already exists. Change the ID and try again.`));
        return;
      }
    }
    const built = config.build(draft);
    if ('error' in built) {
      setFormError(asError(built.error));
      return;
    }
    const writesVisibility = mode.kind === 'new' || draft.visible !== mode.visibleAtOpen;
    const values: Record<string, unknown> = { title, ...built.values };
    if (writesVisibility) values[config.visibility.column] = draft.visible;
    setSaving(true);
    setFormError(null);
    try {
      if (mode.kind === 'new') await staffInsert(config.table, { id, ...values });
      else await staffUpdate(config.table, id, values);
      const visibilityNote = !writesVisibility
        ? ''
        : draft.visible
          ? ` It is ${config.visibility.on.toLowerCase()}.`
          : ` It is ${config.visibility.off.toLowerCase()} — members cannot see it.`;
      setNotice(`${mode.kind === 'new' ? 'Created' : 'Saved'} the ${config.noun} "${title}".${visibilityNote}`);
      close();
      reload();
    } catch (err) {
      setFormError(catalogErrorMessage(err, id));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: Row) => {
    if (busyId) return;
    const next = !config.visibility.get(r);
    setBusyId(r.id);
    setListError(null);
    setNotice(null);
    try {
      await staffSetVisibility(config.table, r.id, config.visibility.column, next);
      // An open form for this row must not save the old visibility back.
      if (mode?.kind === 'edit' && mode.id === r.id) setDraft((d) => (d ? { ...d, visible: next } : d));
      setMode((m) => (m?.kind === 'edit' && m.id === r.id ? { ...m, visibleAtOpen: next } : m));
      setNotice(`"${r.title}" is now ${next ? config.visibility.on.toLowerCase() : `${config.visibility.off.toLowerCase()} — members cannot see it`}.`);
      reload();
    } catch (err) {
      setListError(catalogErrorMessage(err, r.id));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: Row) => {
    if (busyId) return;
    const warning = config.deleteWarning?.(r);
    const message = [
      `Delete the ${config.noun} "${r.title}"?`,
      warning,
      'This cannot be undone.',
      config.visibility.get(r) ? `To hide it from members but keep it, use "${config.visibility.hide}" instead.` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    if (!window.confirm(message)) return;
    setBusyId(r.id);
    setListError(null);
    setNotice(null);
    try {
      await staffDelete(config.table, r.id);
      if (mode?.kind === 'edit' && mode.id === r.id) close();
      setNotice(`Deleted the ${config.noun} "${r.title}".`);
      reload();
    } catch (err) {
      setListError(catalogErrorMessage(err, r.id));
    } finally {
      setBusyId(null);
    }
  };

  const visibleCount = all.filter((r) => config.visibility.get(r)).length;

  return (
    <div className="space-y-4">
      {config.intro}

      {mode && draft && (
        <div ref={formRef}>
          <Card title={mode.kind === 'new' ? `New ${config.noun}` : `Edit ${config.noun}`} subtitle={mode.kind === 'edit' ? `ID: ${mode.id}` : undefined}>
            <form onSubmit={save} noValidate>
              <Field label="Title">
                <TextInput value={draft.title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} disabled={saving} required />
              </Field>
              {mode.kind === 'new' ? (
                <Field label="ID" hint={`Used in links. Filled in from the title; you can change it now. It cannot be changed after the first save. Lowercase letters, numbers and dashes, up to ${ID_MAX}.`}>
                  <TextInput value={draft.id} onChange={(e) => setId(e.target.value)} maxLength={ID_MAX} disabled={saving} className="font-mono" spellCheck={false} autoCapitalize="off" />
                </Field>
              ) : (
                <Field label="ID" hint="The ID cannot be changed after the first save.">
                  <TextInput value={mode.id} readOnly aria-readonly="true" className="bg-slate-100 font-mono text-slate-600" />
                </Field>
              )}

              {config.renderFields(draft, set, saving)}

              <CheckboxField label={config.visibility.field} hint={config.visibility.hint} checked={draft.visible} onChange={(v) => set({ visible: v } as Partial<D>)} disabled={saving} />

              {formError != null && (
                <div className="mb-3">
                  <ErrorNote error={formError} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : mode.kind === 'new' ? `Create ${config.noun}` : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" onClick={cancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Card
        title={config.plural}
        subtitle={rows ? `${all.length} in total · ${visibleCount} ${config.visibility.on.toLowerCase()} · ${all.length - visibleCount} ${config.visibility.off.toLowerCase()}` : undefined}
        right={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={reload} disabled={loading}>
              Refresh
            </Button>
            <Button type="button" onClick={openNew} disabled={Boolean(config.createBlocked) || saving}>
              New {config.noun}
            </Button>
          </div>
        }
      >
        {config.createBlocked && (
          <div className="mb-3">
            <Notice tone="warn">{config.createBlocked}</Notice>
          </div>
        )}
        {notice && (
          <div className="mb-3">
            <Notice tone="success">{notice}</Notice>
          </div>
        )}
        {listError != null && (
          <div className="mb-3">
            <ErrorNote error={listError} />
          </div>
        )}
        {error != null && rows && (
          <div className="mb-3">
            <ErrorNote error={error} />
          </div>
        )}
        {config.filter && all.length > 0 && (
          <div className="max-w-sm">
            <Field label={config.filter.label}>
              <Select value={activeFilter} onChange={setFilterValue} options={config.filter.options} />
            </Field>
          </div>
        )}

        {loading && !rows ? (
          <Loading />
        ) : error != null && !rows ? (
          <ErrorNote error={error} />
        ) : all.length === 0 ? (
          <Empty>No {config.plural.toLowerCase()} exist yet.</Empty>
        ) : shown.length === 0 ? (
          <Empty>Nothing matches this filter yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Title</th>
                  {config.columns.map((c) => (
                    <th key={c.label} scope="col" className="py-2 pr-3 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const on = config.visibility.get(r);
                  const busy = busyId === r.id;
                  const editingThis = mode?.kind === 'edit' && mode.id === r.id;
                  return (
                    <tr key={r.id} className={`align-top ${editingThis ? 'bg-amber-50' : ''}`}>
                      <td className="py-2 pr-3">
                        <span className="block font-medium text-slate-900">{r.title}</span>
                        <span className="block break-all font-mono text-xs text-slate-500">{r.id}</span>
                      </td>
                      {config.columns.map((c) => (
                        <td key={c.label} className="py-2 pr-3 text-slate-700">
                          {c.cell(r)}
                        </td>
                      ))}
                      <td className="py-2 pr-3">
                        <Badge tone={on ? 'green' : 'slate'}>{on ? config.visibility.on : config.visibility.off}</Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button type="button" variant="secondary" onClick={() => openEdit(r)} disabled={busy || saving}>
                            Edit
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => toggle(r)} disabled={busyId !== null || saving}>
                            {busy ? 'Working…' : on ? config.visibility.hide : config.visibility.show}
                          </Button>
                          <Button type="button" variant="danger" onClick={() => remove(r)} disabled={busyId !== null || saving}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
