import { useState } from 'react';
import { Button, Card, Stat, type SaveOutcome } from '@nte/governance-core';
import { contactsToRows, parseContacts, planImport, type ImportPlan, type ParsedContacts } from '../importer';
import { parseCsv, readXlsx, toCsv } from '../sheets';
import { createRecord, patchRecord } from '../store';
import type { Contact, ContactData } from '../types';

interface Props {
  contacts: Contact[];
  onAdd: (c: Contact) => Promise<SaveOutcome>;
  onUpdate: (c: Contact) => Promise<SaveOutcome>;
}

type Stage = { kind: 'idle' } | { kind: 'reading' } | { kind: 'preview'; file: string; parsed: ParsedContacts; plan: ImportPlan } | { kind: 'applying'; done: number; total: number } | { kind: 'done'; file: string; tally: Tally };

/** Per-outcome counts, so the result reports what was saved rather than what was planned. */
type Tally = { created: number; updated: number; pending: number; refused: number; skipped: number };

/** Run `tasks` with at most `limit` in flight, reporting progress. */
async function pooled<R>(tasks: (() => Promise<R>)[], limit: number, onProgress: (n: number) => void): Promise<R[]> {
  const results: R[] = new Array(tasks.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
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

  /**
   * Re-plan against the contacts as they are now, not as they were at preview:
   * someone may have edited a contact in the meantime. An update then patches
   * only the identity fields the file changed onto the live record, so a lane,
   * consent or note set after the preview is never overwritten by a stale copy.
   */
  const apply = async (file: string, parsed: ParsedContacts) => {
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const plan = planImport(
      contacts.map((c) => ({ id: c.id, data: c.data })),
      parsed.contacts
    );
    const importedOn = new Date().toISOString().slice(0, 10);
    type Result = { kind: 'create' | 'update'; outcome: SaveOutcome } | { kind: 'skip' };
    const tasks: (() => Promise<Result>)[] = [
      ...plan.creates.map((data) => async (): Promise<Result> => ({
        kind: 'create',
        outcome: await onAdd(
          createRecord('contact', data, {
            sourceRef: `Contact import · ${file} · ${importedOn}`,
            evidence: { sourceSystem: 'UPLOAD', sourceDate: importedOn, description: `Imported from ${file}`, classification: 'CONFIDENTIAL' },
          })
        ),
      })),
      ...plan.updates.map((u) => async (): Promise<Result> => {
        const live = byId.get(u.id);
        if (!live) return { kind: 'skip' };
        const patch: Partial<ContactData> = { syncStatus: u.data.syncStatus, syncError: u.data.syncError };
        for (const f of u.changed) patch[f] = u.data[f];
        return { kind: 'update', outcome: await onUpdate(patchRecord(live, patch)) };
      }),
    ];
    setStage({ kind: 'applying', done: 0, total: tasks.length });
    const results = await pooled(tasks, 4, (done) => setStage({ kind: 'applying', done, total: tasks.length }));
    const tally: Tally = { created: 0, updated: 0, pending: 0, refused: 0, skipped: 0 };
    for (const r of results) {
      if (r.kind === 'skip') tally.skipped++;
      else if (r.outcome === 'refused') tally.refused++;
      else if (r.outcome === 'pending') tally.pending++;
      else if (r.kind === 'create') tally.created++;
      else tally.updated++;
    }
    setStage({ kind: 'done', file, tally });
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
                {stage.parsed.flaggedSensitive} contact(s) had notes that look like regulated data. Those notes will not be imported; the contacts are flagged “Sensitive data present” so you can confirm the record lives in the company-approved system.
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
              <Button disabled={stage.plan.creates.length + stage.plan.updates.length === 0} onClick={() => apply(stage.file, stage.parsed)}>
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
          <div className="mt-3 space-y-2">
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md px-3 py-2">
              Imported from {stage.file}: {stage.tally.created} created and {stage.tally.updated} updated on the server.
            </p>
            {stage.tally.pending > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                {stage.tally.pending} saved on this device only — the server could not be reached. They will sync automatically when it can.
              </p>
            )}
            {stage.tally.refused > 0 && (
              <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-md px-3 py-2">
                {stage.tally.refused} refused by the server and not saved. They will not be retried; run the import again once the cause is fixed.
              </p>
            )}
            {stage.tally.skipped > 0 && (
              <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2">
                {stage.tally.skipped} contact(s) were deleted while the import ran and were not recreated.
              </p>
            )}
          </div>
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
