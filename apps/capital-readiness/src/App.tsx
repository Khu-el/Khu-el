import { useState } from 'react';
import { Button, NoAutonomousExecutionBanner, NotLegalOrFinancialAdviceFooter, Tabs, TextInput, useLocalStorage } from '@nte/governance-core';
import type { Raise } from './types';
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
  { id: 'memo', label: 'Decision Memo' },
];

export default function App() {
  const [raises, setRaises] = useLocalStorage<Raise[]>('nte-capital-readiness:raises', []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>('nte-capital-readiness:selected', null);
  const [tab, setTab] = useState('entity');
  const [newName, setNewName] = useState('');

  const selected = raises.find((r) => r.id === selectedId) ?? null;

  const addRaise = () => {
    if (!newName.trim()) return;
    const raise = createRaise(newName.trim());
    setRaises([raise, ...raises]);
    setSelectedId(raise.id);
    setNewName('');
  };

  const updateRaise = (updated: Raise) => setRaises(raises.map((r) => (r.id === updated.id ? updated : r)));
  const removeRaise = (id: string) => {
    setRaises(raises.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(raises.find((r) => r.id !== id)?.id ?? null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">Capital Readiness</h1>
          <p className="text-sm text-neutral-500">Entity, cap table, and offering-readiness diligence — not an investor-solicitation tool.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">
            Specifically here: this app never contacts an investor, verifies accreditation, generates an offering
            document, or files anything with a regulator.
          </p>
        </NoAutonomousExecutionBanner>

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
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selectedId === r.id ? 'bg-neutral-100 font-medium' : ''}`}
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
