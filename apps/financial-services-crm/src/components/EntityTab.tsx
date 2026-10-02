import { useMemo, useState } from 'react';
import { Button, Card, Field, NumberInput, Select, TextInput, fromInputValue, toInputValue, type GovernedRecord } from '@nte/governance-core';
import { followUpState, outreachGate, parseDay } from '../crm';
import type { EntityConfig, FieldDef, PipelineKind } from '../entities';
import { patchRecord } from '../store';
import type { Contact, EntityDataMap, YesNo } from '../types';
import { ContactPicker, EnumSelect, FollowUpBadge, GateBadge, YesNoSelect, optionsOf } from './common';

type Row = Record<string, unknown>;
/** The generic editor reads fields by key; the configs in entities.ts name only real keys. */
const rowOf = (d: unknown) => d as Row;

interface Props<K extends PipelineKind> {
  config: EntityConfig<K>;
  records: GovernedRecord<EntityDataMap[K]>[];
  contacts: Contact[];
  now: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onUpdate: (r: GovernedRecord<EntityDataMap[K]>) => void;
  onRemove: (id: string) => void;
  onOpenContact: (id: string) => void;
}

function display(f: FieldDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (f.kind === 'number') return typeof v === 'number' && Number.isFinite(v) ? String(v) : '—';
  return String(v);
}

/** One generic table + editor for every pipeline sheet (Activity, Appointments, Recruiting, …). */
export function EntityTab<K extends PipelineKind>({ config, records, contacts, now, selectedId, onSelect, onAdd, onUpdate, onRemove, onOpenContact }: Props<K>) {
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const columns = config.fields.filter((f) => f.column);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => !statusFilter || rowOf(r.data)[config.statusKey] === statusFilter)
      .filter((r) => !q || Object.values(rowOf(r.data)).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)))
      .sort((a, b) => {
        const ta = parseDay(String(rowOf(a.data)[config.dateKey] ?? ''));
        const tb = parseDay(String(rowOf(b.data)[config.dateKey] ?? ''));
        // Undated rows first: they are the ones someone still has to fill in.
        return (Number.isNaN(tb) ? Infinity : tb) - (Number.isNaN(ta) ? Infinity : ta);
      });
  }, [records, statusFilter, query, config.statusKey, config.dateKey]);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Card
        title={config.title}
        subtitle={config.subtitle}
        right={
          <Button onClick={onAdd} className="shrink-0">
            + {config.addLabel}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="w-56">
            <TextInput placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="w-48">
            <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'All statuses' }, ...optionsOf(config.statusOptions, false)]} />
          </div>
          <p className="text-sm text-neutral-500 self-center">
            {rows.length} of {records.length}
          </p>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-neutral-400 py-6 text-center">Nothing here yet. Use “{config.addLabel}” to add the first row.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = rowOf(r.data);
                  return (
                    <tr key={r.id} onClick={() => onSelect(r.id === selectedId ? null : r.id)} className={`border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 ${r.id === selectedId ? 'bg-neutral-100' : ''}`}>
                      {columns.map((c) => {
                        if (config.followUpKey === c.key) {
                          return (
                            <td key={c.key} className="px-3 py-2">
                              <FollowUpBadge state={followUpState(String(d[c.key] ?? ''), now)} date={String(d[c.key] ?? '')} />
                            </td>
                          );
                        }
                        const linked = c.kind === 'contact' ? contactById.get(String(d.contactRecordId ?? '')) : undefined;
                        return (
                          <td key={c.key} className="px-3 py-2 whitespace-nowrap max-w-[16rem] truncate">
                            {display(c, d[c.key])}
                            {linked && outreachGate(linked.data) === 'blocked' && <span className="ml-1" title="Contact is marked do-not-contact">⛔</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Editor
          config={config}
          record={selected}
          contacts={contacts}
          contactById={contactById}
          onUpdate={onUpdate}
          onRemove={() => {
            if (window.confirm(`Delete this ${config.title} row? This cannot be undone.`)) {
              onRemove(selected.id);
              onSelect(null);
            }
          }}
          onClose={() => onSelect(null)}
          onOpenContact={onOpenContact}
        />
      )}
    </div>
  );
}

function Editor<K extends PipelineKind>({
  config,
  record,
  contacts,
  contactById,
  onUpdate,
  onRemove,
  onClose,
  onOpenContact,
}: {
  config: EntityConfig<K>;
  record: GovernedRecord<EntityDataMap[K]>;
  contacts: Contact[];
  contactById: Map<string, Contact>;
  onUpdate: (r: GovernedRecord<EntityDataMap[K]>) => void;
  onRemove: () => void;
  onClose: () => void;
  onOpenContact: (id: string) => void;
}) {
  const d = rowOf(record.data);
  const set = (patch: Row) => onUpdate(patchRecord(record, patch as Partial<EntityDataMap[K]>));
  const linked = contactById.get(String(d.contactRecordId ?? ''));
  const gate = linked ? outreachGate(linked.data) : null;

  return (
    <Card
      title={config.label(record.data)}
      subtitle={`${config.title} · edits save as you type`}
      right={
        <div className="flex gap-2">
          <Button variant="danger" onClick={onRemove}>
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {linked && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span className="text-neutral-500">Linked contact:</span>
          <button className="underline text-neutral-800" onClick={() => onOpenContact(linked.id)}>
            {linked.data.displayName} ({linked.data.contactId})
          </button>
          {gate && <GateBadge gate={gate} />}
        </div>
      )}
      {gate === 'blocked' && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-md px-3 py-2 mb-4">
          This contact is marked <strong>{linked!.data.consentStatus === 'Do Not Contact' || linked!.data.consentStatus === 'Withdrawn' ? linked!.data.consentStatus : 'Suppressed'}</strong>. Do not
          reach out. Record an attempt here only if it already happened, and note why.
        </p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
        {config.fields.map((f) => (
          <div key={f.key} className={f.kind === 'longtext' ? 'sm:col-span-2 lg:col-span-3' : ''}>
            <Field label={f.label} hint={f.hint}>
              {f.kind === 'text' && <TextInput value={String(d[f.key] ?? '')} onChange={(e) => set({ [f.key]: e.target.value })} />}
              {f.kind === 'date' && <TextInput type="date" value={String(d[f.key] ?? '')} onChange={(e) => set({ [f.key]: e.target.value })} />}
              {f.kind === 'number' && <NumberInput value={toInputValue(d[f.key] as number | null)} onChange={(e) => set({ [f.key]: fromInputValue(e.target.value) })} />}
              {f.kind === 'select' && <EnumSelect value={String(d[f.key] ?? '')} options={f.options ?? []} onChange={(v) => set({ [f.key]: v })} />}
              {f.kind === 'yesno' && <YesNoSelect value={(d[f.key] as YesNo) ?? ''} onChange={(v) => set({ [f.key]: v })} />}
              {f.kind === 'contact' && <ContactPicker value={String(d.prospect ?? '')} contacts={contacts} onChange={(prospect, contactRecordId) => set({ prospect, contactRecordId })} />}
              {f.kind === 'longtext' && (
                <textarea
                  value={String(d[f.key] ?? '')}
                  onChange={(e) => set({ [f.key]: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              )}
            </Field>
          </div>
        ))}
      </div>
    </Card>
  );
}
