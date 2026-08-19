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
import type { Deal, DealData } from './types';
import { createDeal } from './store';
import { IntakeTab } from './components/IntakeTab';
import { CalculatorsTab } from './components/CalculatorsTab';
import { SellerFinanceTab } from './components/SellerFinanceTab';
import { CapitalStackTab } from './components/CapitalStackTab';
import { ExitScenariosTab } from './components/ExitScenariosTab';
import { DiligenceTab } from './components/DiligenceTab';
import { MemoTab } from './components/MemoTab';

const TABS = [
  { id: 'intake', label: 'Intake' },
  { id: 'calculators', label: 'Calculators' },
  { id: 'seller-finance', label: 'Seller Finance' },
  { id: 'capital-stack', label: 'Capital Stack' },
  { id: 'exits', label: 'Exit Scenarios' },
  { id: 'diligence', label: 'Diligence' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'memo', label: 'Decision Memo' },
];

export default function App() {
  return (
    <AuthGate appName="Deal Architect">
      {({ user, logout }) => <DealArchitect userLabel={`${user.displayName} · ${ROLE_LABELS[user.role]}`} onLogout={logout} />}
    </AuthGate>
  );
}

function DealArchitect({ userLabel, onLogout }: { userLabel: string; onLogout: () => void }) {
  const { records: deals, addRecord, updateRecord, removeRecord, status, syncError } = useSyncedRecords<DealData>('deal-architect', 'nte-deal-architect:deals', true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('intake');
  const [newAddress, setNewAddress] = useState('');

  const selected = deals.find((d) => d.id === selectedId) ?? deals[0] ?? null;

  const addDeal = () => {
    if (!newAddress.trim()) return;
    const deal = createDeal(newAddress.trim());
    addRecord(deal);
    setSelectedId(deal.id);
    setNewAddress('');
  };

  const updateDeal = (updated: Deal) => updateRecord(updated);
  const removeDeal = (id: string) => {
    removeRecord(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Deal Architect</h1>
            <p className="text-sm text-neutral-500">Real estate deal-intelligence: wholesaling, seller-finance, and hold analysis in one place.</p>
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
        <NoAutonomousExecutionBanner />
        {syncError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{syncError}</p>}

        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <aside className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-3">
              <p className="text-sm font-medium mb-2">New deal</p>
              <div className="flex gap-2">
                <TextInput placeholder="Property address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDeal()} />
                <Button onClick={addDeal}>Add</Button>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              {deals.length === 0 && <p className="text-sm text-neutral-400 p-3">No deals yet.</p>}
              {deals.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selected?.id === d.id ? 'bg-neutral-100 font-medium' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{d.data.address || 'Unnamed'}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDeal(d.id);
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
                Add a deal to get started.
              </div>
            ) : (
              <>
                <Tabs tabs={TABS} active={tab} onChange={setTab} />
                {tab === 'intake' && <IntakeTab deal={selected} onChange={updateDeal} />}
                {tab === 'calculators' && <CalculatorsTab deal={selected} onChange={updateDeal} />}
                {tab === 'seller-finance' && <SellerFinanceTab deal={selected} onChange={updateDeal} />}
                {tab === 'capital-stack' && <CapitalStackTab deal={selected} onChange={updateDeal} />}
                {tab === 'exits' && <ExitScenariosTab deal={selected} />}
                {tab === 'diligence' && <DiligenceTab deal={selected} onChange={updateDeal} />}
                {tab === 'attachments' && <AttachmentsPanel recordId={selected.id} />}
                {tab === 'memo' && <MemoTab deal={selected} />}
              </>
            )}
          </section>
        </div>

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
