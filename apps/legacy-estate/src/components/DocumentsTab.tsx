import { Button, Card, Select, TextInput, newId } from '@nte/governance-core';
import type { EstateDocument, Estate } from '../types';

const DOC_TYPES = [
  { value: 'LIVING_TRUST', label: 'Living trust' },
  { value: 'POUR_OVER_WILL', label: 'Pour-over will' },
  { value: 'FINANCIAL_POA', label: 'Financial POA' },
  { value: 'HEALTHCARE_DIRECTIVE', label: 'Healthcare directive' },
  { value: 'HIPAA_RELEASE', label: 'HIPAA release' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFTED', label: 'Drafted' },
  { value: 'EXECUTED', label: 'Executed' },
  { value: 'NOTARIZED', label: 'Notarized' },
  { value: 'RECORDED', label: 'Recorded' },
];

export function DocumentsTab({ estate, onChange }: { estate: Estate; onChange: (e: Estate) => void }) {
  const docs = estate.data.documents;
  const setDocs = (next: EstateDocument[]) => onChange({ ...estate, data: { ...estate.data, documents: next }, updatedAt: new Date().toISOString() });
  const add = () =>
    setDocs([...docs, { id: newId('doc'), docType: 'LIVING_TRUST', name: '', status: 'DRAFTED', dateOfAction: new Date().toISOString().slice(0, 10), attorneyOfRecord: '', locationOfOriginal: '' }]);
  const update = (id: string, patch: Partial<EstateDocument>) => setDocs(docs.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => setDocs(docs.filter((d) => d.id !== id));

  return (
    <Card title="Trust / will / POA / directive coordination" subtitle="Track what exists, its execution status, and where the original lives" right={<Button onClick={add}>Add document</Button>}>
      <div className="space-y-3">
        {docs.map((doc) => (
          <div key={doc.id} className="border border-neutral-200 rounded-lg p-3 grid md:grid-cols-6 gap-2 items-end">
            <Select value={doc.docType} onChange={(v) => update(doc.id, { docType: v as EstateDocument['docType'] })} options={DOC_TYPES} />
            <TextInput placeholder="Document name" value={doc.name} onChange={(e) => update(doc.id, { name: e.target.value })} />
            <Select value={doc.status} onChange={(v) => update(doc.id, { status: v as EstateDocument['status'] })} options={STATUS_OPTIONS} />
            <TextInput type="date" value={doc.dateOfAction} onChange={(e) => update(doc.id, { dateOfAction: e.target.value })} />
            <TextInput placeholder="Attorney of record" value={doc.attorneyOfRecord} onChange={(e) => update(doc.id, { attorneyOfRecord: e.target.value })} />
            <Button variant="danger" onClick={() => remove(doc.id)}>
              Remove
            </Button>
            <div className="md:col-span-6">
              <TextInput placeholder="Location of original" value={doc.locationOfOriginal} onChange={(e) => update(doc.id, { locationOfOriginal: e.target.value })} />
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-neutral-400">No documents recorded yet.</p>}
      </div>
    </Card>
  );
}
