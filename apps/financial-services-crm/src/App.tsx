import { useEffect, useMemo, useState } from 'react';
import {
  AuthGate,
  NoAutonomousExecutionBanner,
  NotLegalOrFinancialAdviceFooter,
  ROLE_LABELS,
  SyncStatusIndicator,
  Tabs,
  useSyncedRecords,
  type GovernedRecord,
} from '@nte/governance-core';
import { duplicateIds, toDay, weekStartOf } from './crm';
import { ENTITY_CONFIGS, type PipelineKind } from './entities';
import { createBlank, createRecord, kindOf } from './store';
import type { AnyEntityData, Contact, EntityKind, EntityRecord } from './types';
import { CommandCenter } from './components/CommandCenter';
import { ContactsTab } from './components/ContactsTab';
import { EntityTab } from './components/EntityTab';
import { ImportTab } from './components/ImportTab';
import { PlaybookTab } from './components/PlaybookTab';
import { ScoreboardTab } from './components/ScoreboardTab';

const TABS = [
  { id: 'command', label: 'Command Center' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'recruit', label: 'Recruiting' },
  { id: 'licensing', label: 'Licensing' },
  { id: 'training', label: 'Field Training' },
  { id: 'referral', label: 'Referrals' },
  { id: 'scoreboard', label: 'Weekly Scoreboard' },
  { id: 'playbook', label: 'Playbook' },
  { id: 'import', label: 'Import / Export' },
];

const PIPELINES: PipelineKind[] = ['activity', 'appointment', 'recruit', 'licensing', 'training', 'referral'];

export default function App() {
  return (
    <AuthGate appName="Excellence District Financial Services CRM">
      {({ user, logout }) => <Crm userLabel={`${user.displayName} · ${ROLE_LABELS[user.role]}`} userId={user.id} onLogout={logout} />}
    </AuthGate>
  );
}

/** Re-render once a minute so "due today" and the scoreboard roll over at midnight without a reload. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function Crm({ userLabel, userId, onLogout }: { userLabel: string; userId: string; onLogout: () => void }) {
  const { records, addRecord, updateRecord, removeRecord, status, syncError } = useSyncedRecords<AnyEntityData>('financial-services-crm', 'nte-financial-services-crm:records', true, userId);
  const now = useNow();
  const [tab, setTab] = useState('command');
  const [selected, setSelected] = useState<Partial<Record<EntityKind, string | null>>>({});

  const byKind = useMemo(() => {
    const out = { contact: [], activity: [], appointment: [], recruit: [], licensing: [], training: [], referral: [], weekly: [] } as { [K in EntityKind]: EntityRecord<K>[] };
    for (const r of records) {
      const kind = kindOf(r.type);
      if (kind) (out[kind] as GovernedRecord<AnyEntityData>[]).push(r);
    }
    return out;
  }, [records]);

  const contacts = byKind.contact as Contact[];
  const duplicates = useMemo(() => duplicateIds(contacts), [contacts]);

  const add = (r: GovernedRecord<AnyEntityData>) => addRecord(r);
  const update = (r: GovernedRecord<AnyEntityData>) => updateRecord(r);
  const select = (kind: EntityKind, id: string | null) => setSelected((s) => ({ ...s, [kind]: id }));
  const open = (kind: EntityKind, id: string) => {
    select(kind, id);
    setTab(kind === 'contact' ? 'contacts' : kind);
  };
  const addBlank = <K extends EntityKind>(kind: K) => {
    const r = createBlank(kind, toDay(now), weekStartOf(now));
    add(r as GovernedRecord<AnyEntityData>);
    select(kind, r.id);
  };

  const pipeline = <K extends PipelineKind>(kind: K) => (
    <EntityTab<K>
      key={kind}
      config={ENTITY_CONFIGS[kind]}
      records={byKind[kind]}
      contacts={contacts}
      now={now}
      selectedId={selected[kind] ?? null}
      onSelect={(id) => select(kind, id)}
      onAdd={() => addBlank(kind)}
      onUpdate={update}
      onRemove={removeRecord}
      onOpenContact={(id) => open('contact', id)}
    />
  );

  const logAttempt = (c: Contact) => {
    const base = createBlank('activity', toDay(now), weekStartOf(now));
    const r = createRecord('activity', { ...base.data, prospect: c.data.displayName, contactRecordId: c.id, source: c.data.source });
    add(r as GovernedRecord<AnyEntityData>);
    open('activity', r.id);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">The Excellence District Financial Services — CRM</h1>
            <p className="text-sm text-neutral-500">Contacts, activity, pipeline, licensing, field training and the leadership scoreboard.</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-neutral-600">{userLabel}</p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <SyncStatusIndicator status={status} error={syncError} />
              <button onClick={onLogout} className="text-xs text-neutral-400 hover:text-neutral-800 underline">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">
            Specifically here: this CRM never calls, texts, or emails a contact, and never creates tasks elsewhere. It records what people do. Regulated client,
            application, product and policy records stay in company-approved systems — keep only a reference here.
          </p>
        </NoAutonomousExecutionBanner>
        {syncError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{syncError}</p>}

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'command' && (
          <CommandCenter
            contacts={contacts}
            activities={byKind.activity}
            appointments={byKind.appointment}
            recruits={byKind.recruit}
            licensing={byKind.licensing}
            training={byKind.training}
            referrals={byKind.referral}
            duplicates={duplicates}
            now={now}
            onOpenContact={(id) => open('contact', id)}
          />
        )}

        {tab === 'contacts' && (
          <ContactsTab
            contacts={contacts}
            activities={byKind.activity}
            duplicates={duplicates}
            now={now}
            selectedId={selected.contact ?? null}
            onSelect={(id) => select('contact', id)}
            onAdd={() => addBlank('contact')}
            onUpdate={update}
            onRemove={removeRecord}
            onLogAttempt={logAttempt}
            onOpenActivity={(id) => open('activity', id)}
          />
        )}

        {PIPELINES.map((kind) => tab === kind && pipeline(kind))}

        {tab === 'scoreboard' && (
          <ScoreboardTab
            activities={byKind.activity}
            appointments={byKind.appointment}
            recruits={byKind.recruit}
            licensing={byKind.licensing}
            reviews={byKind.weekly}
            now={now}
            onAdd={add}
            onUpdate={update}
          />
        )}

        {tab === 'playbook' && <PlaybookTab />}

        {tab === 'import' && <ImportTab contacts={contacts} onAdd={add} onUpdate={update} />}

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
