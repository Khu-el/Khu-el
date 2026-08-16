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
import type { Note, NoteData } from './types';
import { createNote } from './store';
import { IntakeTab } from './components/IntakeTab';
import { ValuationTab } from './components/ValuationTab';
import { ScenariosTab } from './components/ScenariosTab';
import { LienChecklistTab } from './components/LienChecklistTab';
import { MemoTab } from './components/MemoTab';

const TABS = [
  { id: 'intake', label: 'Intake' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'scenarios', label: 'Recovery Scenarios' },
  { id: 'lien', label: 'Lien Checklist' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'memo', label: 'Decision Memo' },
];

export default function App() {
  return (
    <AuthGate appName="Notes Underwriting">
      {({ user, logout }) => <NotesUnderwriting userLabel={`${user.displayName} · ${ROLE_LABELS[user.role]}`} onLogout={logout} />}
    </AuthGate>
  );
}

function NotesUnderwriting({ userLabel, onLogout }: { userLabel: string; onLogout: () => void }) {
  const { records: notes, addRecord, updateRecord, removeRecord, status, syncError } = useSyncedRecords<NoteData>('notes-underwriting', 'nte-notes-underwriting:notes', true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('intake');
  const [newRef, setNewRef] = useState('');

  const selected = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  const addNote = () => {
    if (!newRef.trim()) return;
    const note = createNote(newRef.trim());
    addRecord(note);
    setSelectedId(note.id);
    setNewRef('');
  };

  const updateNote = (updated: Note) => updateRecord(updated);
  const removeNote = (id: string) => {
    removeRecord(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Notes Underwriting</h1>
            <p className="text-sm text-neutral-500">Distressed-debt analysis: valuation, scenarios, and lien diligence — analysis only, no collections.</p>
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
          <p className="mt-1">Specifically here: this app never contacts a borrower/obligor, initiates collection, or takes any foreclosure step.</p>
        </NoAutonomousExecutionBanner>
        {syncError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{syncError}</p>}

        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <aside className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-3">
              <p className="text-sm font-medium mb-2">New note</p>
              <div className="flex gap-2">
                <TextInput placeholder="Obligor reference" value={newRef} onChange={(e) => setNewRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
                <Button onClick={addNote}>Add</Button>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              {notes.length === 0 && <p className="text-sm text-neutral-400 p-3">No notes yet.</p>}
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${selected?.id === n.id ? 'bg-neutral-100 font-medium' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{n.data.obligorRef || 'Unreferenced'}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNote(n.id);
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
                Add a note to get started.
              </div>
            ) : (
              <>
                <Tabs tabs={TABS} active={tab} onChange={setTab} />
                {tab === 'intake' && <IntakeTab note={selected} onChange={updateNote} />}
                {tab === 'valuation' && <ValuationTab note={selected} onChange={updateNote} />}
                {tab === 'scenarios' && <ScenariosTab note={selected} onChange={updateNote} />}
                {tab === 'lien' && <LienChecklistTab note={selected} onChange={updateNote} />}
                {tab === 'attachments' && <AttachmentsPanel recordId={selected.id} />}
                {tab === 'memo' && <MemoTab note={selected} />}
              </>
            )}
          </section>
        </div>

        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
