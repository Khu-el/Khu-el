import { useState } from 'react';
import { Button, NoAutonomousExecutionBanner, NotLegalOrFinancialAdviceFooter, Tabs, TextInput, useLocalStorage } from '@nte/governance-core';
import type { Estate } from './types';
import { createEstate } from './store';
import { OverviewTab } from './components/OverviewTab';
import { AssetsTab } from './components/AssetsTab';
import { DocumentsTab } from './components/DocumentsTab';
import { BeneficiariesTab } from './components/BeneficiariesTab';
import { InsuranceTab } from './components/InsuranceTab';
import { BusinessInterestsTab } from './components/BusinessInterestsTab';
import { DistributionsTab } from './components/DistributionsTab';
import { ContinuityArchiveTab } from './components/ContinuityArchiveTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets & Title' },
  { id: 'documents', label: 'Documents' },
  { id: 'beneficiaries', label: 'Beneficiaries' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'business', label: 'Business Interests' },
  { id: 'distributions', label: 'Distributions' },
  { id: 'continuity', label: 'Continuity & Archive' },
];

export default function App() {
  const [estates, setEstates] = useLocalStorage<Estate[]>('ccrlt-legacy-estate:estates', []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>('ccrlt-legacy-estate:selected', null);
  const [tab, setTab] = useState('overview');
  const [newName, setNewName] = useState('');

  const selected = estates.find((e) => e.id === selectedId) ?? null;

  const addEstate = () => {
    if (!newName.trim()) return;
    const estate = createEstate(newName.trim());
    setEstates([estate, ...estates]);
    setSelectedId(estate.id);
    setNewName('');
  };

  const updateEstate = (updated: Estate) => setEstates(estates.map((e) => (e.id === updated.id ? updated : e)));
  const removeEstate = (id: string) => {
    setEstates(estates.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(estates.find((e) => e.id !== id)?.id ?? null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">Legacy & Estate Coordination</h1>
          <p className="text-sm text-neutral-500">Private family/estate workspace — CCRLT, House of Ransom, and related family records. Lane B only.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">
            Everything here stays in your browser's local storage. Nothing is uploaded, shared, or synced to any
            enterprise (Lane A) system automatically.
          </p>
        </NoAutonomousExecutionBanner>

        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <aside className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-3">
              <p className="text-sm font-medium mb-2">New family estate record</p>
              <div className="flex gap-2">
                <TextInput placeholder="Family name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEstate()} />
                <Button onClick={addEstate}>Add</Button>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              {estates.length === 0 && <p className="text-sm text-neutral-400 p-3">Nothing yet.</p>}
              {estates.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selectedId === e.id ? 'bg-neutral-100 font-medium' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{e.data.familyName || 'Unnamed'}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeEstate(e.id);
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
                Add a family estate record to get started.
              </div>
            ) : (
              <>
                <Tabs tabs={TABS} active={tab} onChange={setTab} />
                {tab === 'overview' && <OverviewTab estate={selected} onChange={updateEstate} />}
                {tab === 'assets' && <AssetsTab estate={selected} onChange={updateEstate} />}
                {tab === 'documents' && <DocumentsTab estate={selected} onChange={updateEstate} />}
                {tab === 'beneficiaries' && <BeneficiariesTab estate={selected} onChange={updateEstate} />}
                {tab === 'insurance' && <InsuranceTab estate={selected} onChange={updateEstate} />}
                {tab === 'business' && <BusinessInterestsTab estate={selected} onChange={updateEstate} />}
                {tab === 'distributions' && <DistributionsTab estate={selected} onChange={updateEstate} />}
                {tab === 'continuity' && <ContinuityArchiveTab estate={selected} onChange={updateEstate} />}
              </>
            )}
          </section>
        </div>

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
