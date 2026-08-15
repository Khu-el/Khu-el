import { Button, Card, TextInput, newId } from '@nte/governance-core';
import type { ArchiveNote, ContinuityContact, Estate } from '../types';

export function ContinuityArchiveTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const contacts = estate.data.continuityContacts;
  const archive = estate.data.archive;

  const setContacts = (next: ContinuityContact[]) => onChange({ ...estate, data: { ...estate.data, continuityContacts: next }, updatedAt: new Date().toISOString() });
  const addContact = () => setContacts([...contacts, { id: newId('cont'), role: '', name: '', contactInfo: '' }]);
  const updateContact = (id: string, patch: Partial<ContinuityContact>) => setContacts(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeContact = (id: string) => setContacts(contacts.filter((c) => c.id !== id));

  const setArchive = (next: ArchiveNote[]) => onChange({ ...estate, data: { ...estate.data, archive: next }, updatedAt: new Date().toISOString() });
  const addNote = () => setArchive([{ id: newId('arc'), title: '', body: '', date: new Date().toISOString().slice(0, 10) }, ...archive]);
  const updateNote = (id: string, patch: Partial<ArchiveNote>) => setArchive(archive.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeNote = (id: string) => setArchive(archive.filter((a) => a.id !== id));

  return (
    <div className="space-y-4">
      <Card title="Emergency & continuity contacts" subtitle="Who to call, and who has authority, if you're suddenly unavailable" right={<Button onClick={addContact}>Add contact</Button>}>
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <TextInput placeholder="Role (e.g. successor trustee)" value={c.role} onChange={(e) => updateContact(c.id, { role: e.target.value })} />
              </div>
              <div className="col-span-4">
                <TextInput placeholder="Name" value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} />
              </div>
              <div className="col-span-4">
                <TextInput placeholder="Contact info" value={c.contactInfo} onChange={(e) => updateContact(c.id, { contactInfo: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Button variant="danger" onClick={() => removeContact(c.id)}>
                  ×
                </Button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-sm text-neutral-400">No continuity contacts recorded yet.</p>}
        </div>
      </Card>

      <Card title="Family archive" subtitle="Private notes — history, context, decisions worth remembering" right={<Button onClick={addNote}>New note</Button>}>
        <div className="space-y-3">
          {archive.map((a) => (
            <div key={a.id} className="border border-neutral-200 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <TextInput placeholder="Title" value={a.title} onChange={(e) => updateNote(a.id, { title: e.target.value })} />
                <TextInput type="date" value={a.date} onChange={(e) => updateNote(a.id, { date: e.target.value })} />
                <Button variant="danger" onClick={() => removeNote(a.id)}>
                  Remove
                </Button>
              </div>
              <textarea className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm min-h-20" value={a.body} onChange={(e) => updateNote(a.id, { body: e.target.value })} />
            </div>
          ))}
          {archive.length === 0 && <p className="text-sm text-neutral-400">No archive notes yet.</p>}
        </div>
      </Card>
    </div>
  );
}
