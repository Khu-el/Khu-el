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
import type { Estate, EstateData } from './types';
import { createEstate } from './store';
import { OverviewTab } from './components/OverviewTab';
import { AssetsTab } from './components/AssetsTab';
import { DocumentsTab } from './components/DocumentsTab';
import { BeneficiariesTab } from './components/BeneficiariesTab';
import { InsuranceTab } from './components/InsuranceTab';
import { BusinessInterestsTab } from './components/BusinessInterestsTab';
import { DistributionsTab } from './components/DistributionsTab';
import { ContinuityArchiveTab } from './components/ContinuityArchiveTab';
import { DigestTab } from './components/DigestTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets & Title' },
  { id: 'documents', label: 'Documents' },
  { id: 'beneficiaries', label: 'Beneficiaries' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'business', label: 'Business Interests' },
  { id: 'distributions', label: 'Distributions' },
  { id: 'continuity', label: 'Continuity & Archive' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'digest', label: 'Needs Attention' },
];

export default function App() {
  return (
    <AuthGate appName="Legacy & Estate Coordination">
      {({ user, logout }) => <LegacyEstate userLabel={`${user.displayName} · ${ROLE_LABELS[user.role]}`} onLogout={logout} />}
    </AuthGate>
  );
}

function LegacyEstate({ userLabel, onLogout }: { userLabel: string; onLogout: () => void }) {
  const { records: estates, addRecord, updateRecord, removeRecord, status, syncError } = useSyncedRecords<EstateData>('legacy-estate', 'ccrlt-legacy-estate:estates', true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [newName, setNewName] = useState('');

  const selected = estates.find((e) => e.id === selectedId) ?? estates[0] ?? null;

  const addEstate = () => {
    if (!newName.trim()) return;
    const estate = createEstate(newName.trim());
    addRecord(estate);
    setSelectedId(estate.id);
    setNewName('');
  };

  const updateEstate = (updated: Estate) => updateRecord(updated);
  const removeEstate = (id: string) => {
    removeRecord(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Legacy & Estate Coordination</h1>
            <p className="text-sm text-neutral-500">Shared family workspace — CCRLT, House of Ransom, and related family records. Lane B only.</p>
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
            Records here are stored on your backend and visible to every signed-in family member (this app's
            workspace is shared, unlike the other three). Nothing is synced to any enterprise (Lane A) system
            automatically.
          </p>
        </NoAutonomousExecutionBanner>
        {syncError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{syncError}</p>}

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
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selected?.id === e.id ? 'bg-neutral-100 font-medium' : ''}`}
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
                {tab === 'attachments' && <AttachmentsPanel recordId={selected.id} />}
                {tab === 'digest' && <DigestTab />}
              </>
            )}
          </section>
        </div>

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
