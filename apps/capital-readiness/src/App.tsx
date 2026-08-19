import { useState } from 'react';
import {
  AttachmentsPanel,
  AuthGate,
  Button,
  NoAutonomousExecutionBanner,
  NotLegalOrFinancialAdviceFooter,
  ROLE_LABELS,
  SyncStatusIndicator,
  Tabs,
  TextInput,
  useSyncedRecords,
} from '@nte/governance-core';
import type { Raise, RaiseData } from './types';
import { createRaise } from './store';
import { EntityTab } from './components/EntityTab';
import { CapTableTab } from './components/CapTableTab';
import { ProceedsTab } from './components/ProceedsTab';
import { DebtEquityTab } from './components/DebtEquityTab';
import { ReadinessTab } from './components/ReadinessTab';
import { MemoTab } from './components/MemoTab';

const TABS = [
  { id: 'entity', label: 'Entity' },
  { id: 'cap-table', label: 'Cap Table' },
  { id: 'proceeds', label: 'Use of Proceeds' },
  { id: 'debt-equity', label: 'Debt vs Equity' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'memo', label: 'Decision Memo' },
];

export default function App() {
  return (
    <AuthGate appName="Capital Readiness">
      {({ user, logout }) => <CapitalReadiness userLabel={`${user.displayName} · ${ROLE_LABELS[user.role]}`} onLogout={logout} />}
    </AuthGate>
  );
}

function CapitalReadiness({ userLabel, onLogout }: { userLabel: string; onLogout: () => void }) {
  const { records: raises, addRecord, updateRecord, removeRecord, status, syncError } = useSyncedRecords<RaiseData>('capital-readiness', 'nte-capital-readiness:raises', true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('entity');
  const [newName, setNewName] = useState('');

  const selected = raises.find((r) => r.id === selectedId) ?? raises[0] ?? null;

  const addRaise = () => {
    if (!newName.trim()) return;
    const raise = createRaise(newName.trim());
    addRecord(raise);
    setSelectedId(raise.id);
    setNewName('');
  };

  const updateRaise = (updated: Raise) => updateRecord(updated);
  const removeRaise = (id: string) => {
    removeRecord(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Capital Readiness</h1>
            <p className="text-sm text-neutral-500">Entity, cap table, and offering-readiness diligence — not an investor-solicitation tool.</p>
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">
            Specifically here: this app never contacts an investor, verifies accreditation, generates an offering
            document, or files anything with a regulator.
          </p>
        </NoAutonomousExecutionBanner>
        {syncError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{syncError}</p>}

        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <aside className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-3">
              <p className="text-sm font-medium mb-2">New raise / entity</p>
              <div className="flex gap-2">
                <TextInput placeholder="Entity name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRaise()} />
                <Button onClick={addRaise}>Add</Button>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              {raises.length === 0 && <p className="text-sm text-neutral-400 p-3">Nothing yet.</p>}
              {raises.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selected?.id === r.id ? 'bg-neutral-100 font-medium' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{r.data.entityName || 'Unnamed'}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRaise(r.id);
                      }}
                      className="text-neutral-300 hover:text-rose-600 px-1"
                    >
                      ×
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section>
            {!selected ? (
              <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-400">
                Add an entity/raise to get started.
              </div>
            ) : (
              <>
                <Tabs tabs={TABS} active={tab} onChange={setTab} />
                {tab === 'entity' && <EntityTab raise={selected} onChange={updateRaise} />}
                {tab === 'cap-table' && <CapTableTab raise={selected} onChange={updateRaise} />}
                {tab === 'proceeds' && <ProceedsTab raise={selected} onChange={updateRaise} />}
                {tab === 'debt-equity' && <DebtEquityTab raise={selected} onChange={updateRaise} />}
                {tab === 'readiness' && <ReadinessTab raise={selected} onChange={updateRaise} />}
                {tab === 'attachments' && <AttachmentsPanel recordId={selected.id} />}
                {tab === 'memo' && <MemoTab raise={selected} />}
              </>
            )}
          </section>
        </div>

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
