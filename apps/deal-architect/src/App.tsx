import { useState } from 'react';
import { Button, NoAutonomousExecutionBanner, NotLegalOrFinancialAdviceFooter, Tabs, TextInput, useLocalStorage } from '@nte/governance-core';
import type { Deal } from './types';
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
  { id: 'memo', label: 'Decision Memo' },
];

export default function App() {
  const [deals, setDeals] = useLocalStorage<Deal[]>('nte-deal-architect:deals', []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>('nte-deal-architect:selected', null);
  const [tab, setTab] = useState('intake');
  const [newAddress, setNewAddress] = useState('');

  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const addDeal = () => {
    if (!newAddress.trim()) return;
    const deal = createDeal(newAddress.trim());
    setDeals([deal, ...deals]);
    setSelectedId(deal.id);
    setNewAddress('');
  };

  const updateDeal = (updated: Deal) => setDeals(deals.map((d) => (d.id === updated.id ? updated : d)));
  const removeDeal = (id: string) => {
    setDeals(deals.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId(deals.find((d) => d.id !== id)?.id ?? null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">Deal Architect</h1>
          <p className="text-sm text-neutral-500">Real estate deal-intelligence: wholesaling, seller-finance, and hold analysis in one place.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner />

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
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selectedId === d.id ? 'bg-neutral-100 font-medium' : ''}`}
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
