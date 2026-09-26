import { useState } from 'react';
import { Button, Card, Stat } from '@nte/governance-core';
import { contactsToRows, parseContacts, planImport, type ImportPlan, type ParsedContacts } from '../importer';
import { parseCsv, readXlsx, toCsv } from '../sheets';
import { createRecord, patchRecord } from '../store';
import type { Contact } from '../types';

interface Props {
  contacts: Contact[];
  onAdd: (c: Contact) => Promise<void>;
  onUpdate: (c: Contact) => Promise<void>;
}

type Stage = { kind: 'idle' } | { kind: 'reading' } | { kind: 'preview'; file: string; parsed: ParsedContacts; plan: ImportPlan } | { kind: 'applying'; done: number; total: number } | { kind: 'done'; created: number; updated: number; file: string };

/** Run `tasks` with at most `limit` in flight, reporting progress. */
async function pooled(tasks: (() => Promise<void>)[], limit: number, onProgress: (n: number) => void) {
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      await task();
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

export function ImportTab({ contacts, onAdd, onUpdate }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setStage({ kind: 'reading' });
    try {
      const book = /\.csv$/i.test(file.name) ? [{ name: file.name, rows: parseCsv(await file.text()) }] : await readXlsx(await file.arrayBuffer());
      const parsed = parseContacts(book);
      const plan = planImport(
        contacts.map((c) => ({ id: c.id, data: c.data })),
        parsed.contacts
      );
      setStage({ kind: 'preview', file: file.name, parsed, plan });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
      setStage({ kind: 'idle' });
    }
  };

  const apply = async (file: string, plan: ImportPlan) => {
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const importedOn = new Date().toISOString().slice(0, 10);
    const tasks: (() => Promise<void>)[] = [
      ...plan.creates.map((data) => () =>
        onAdd(
          createRecord('contact', data, {
            sourceRef: `Contact import · ${file} · ${importedOn}`,
            evidence: { sourceSystem: 'UPLOAD', sourceDate: importedOn, description: `Imported from ${file}`, classification: 'CONFIDENTIAL' },
          })
        )
      ),
      ...plan.updates.flatMap((u) => {
        const existing = byId.get(u.id);
        return existing ? [() => onUpdate(patchRecord(existing, u.data))] : [];
      }),
    ];
    setStage({ kind: 'applying', done: 0, total: tasks.length });
    await pooled(tasks, 4, (done) => setStage({ kind: 'applying', done, total: tasks.length }));
    setStage({ kind: 'done', created: plan.creates.length, updated: plan.updates.length, file });
  };

  const exportCsv = () => {
    const rows = contactsToRows([...contacts].sort((a, b) => a.data.contactId.localeCompare(b.data.contactId)).map((c) => c.data));
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `excellence-district-crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card title="Import contacts" subtitle="The CRM workbook (.xlsx, reads its “CRM Contact Master” sheet) or a Google Contacts CSV export. The file is read in your browser.">
        <ul className="text-sm text-neutral-600 list-disc pl-5 mb-4 space-y-1">
          <li>New contacts enter neutral — Unqualified, consent Not Established, interest Not Assessed — unless the file already carries a valid classification.</li>
          <li>Matching is by Google Resource Name. Rows are never merged on a name alone; possible duplicates are flagged for you to review.</li>
          <li>Re-importing refreshes identity (names, emails, phones, company) and never overwrites a lane, consent, note, or follow-up you set.</li>
          <li>Nothing is ever deleted by an import. Contacts missing from the file stay.</li>
        </ul>
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={stage.kind === 'reading' || stage.kind === 'applying'}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
          className="text-sm"
        />
        {error && <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-md px-3 py-2 mt-3">{error}</p>}
        {stage.kind === 'reading' && <p className="text-sm text-neutral-500 mt-3">Reading…</p>}

        {stage.kind === 'preview' && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-neutral-700">
              <strong>{stage.file}</strong> → sheet “{stage.parsed.sheetName}”, header on row {stage.parsed.headerRow}, {stage.parsed.mappedColumns.length} columns recognized.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="New contacts" value={String(stage.plan.creates.length)} />
              <Stat label="Identity updates" value={String(stage.plan.updates.length)} />
              <Stat label="Already current" value={String(stage.plan.unchanged)} />
              <Stat label="Rows skipped" value={String(stage.parsed.skippedEmpty + stage.plan.repeatedInFile)} sub="no name/email/phone, or repeated" />
            </div>
            {stage.parsed.unrecognizedValues > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                {stage.parsed.unrecognizedValues} value(s) were not on their field’s list and will use the neutral default instead.
              </p>
            )}
            {stage.parsed.flaggedSensitive > 0 && (
              <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-md px-3 py-2">
                {stage.parsed.flaggedSensitive} contact(s) have notes that look like regulated data and will be flagged “Sensitive data present” for you to clean up.
              </p>
            )}
            {stage.plan.updates.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-neutral-600">Show identity changes</summary>
                <ul className="mt-2 text-xs text-neutral-600 space-y-0.5">
                  {stage.plan.updates.slice(0, 50).map((u) => (
                    <li key={u.id}>
                      {u.data.displayName}: {u.changed.join(', ')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex gap-2">
              <Button disabled={stage.plan.creates.length + stage.plan.updates.length === 0} onClick={() => apply(stage.file, stage.plan)}>
                Import {stage.plan.creates.length + stage.plan.updates.length} change(s)
              </Button>
              <Button variant="secondary" onClick={() => setStage({ kind: 'idle' })}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {stage.kind === 'applying' && (
          <p className="text-sm text-neutral-600 mt-3 tabular-nums">
            Saving {stage.done} / {stage.total}…
          </p>
        )}
        {stage.kind === 'done' && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md px-3 py-2 mt-3">
            Imported from {stage.file}: {stage.created} created, {stage.updated} updated. If you are offline, they are saved on this device and will sync when the server is reachable.
          </p>
        )}
      </Card>

      <Card title="Export contacts" subtitle="Download the contact master as CSV, in the workbook’s column order. It re-imports cleanly.">
        <Button variant="secondary" onClick={exportCsv} disabled={contacts.length === 0}>
          Download CSV ({contacts.length})
        </Button>
        <p className="text-xs text-neutral-400 mt-2">The file holds personal contact details. Keep it somewhere private.</p>
      </Card>
    </div>
  );
}
