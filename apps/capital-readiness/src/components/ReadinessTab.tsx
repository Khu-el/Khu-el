import { Card, ProfessionalReviewGate, Select } from '@nte/governance-core';
import type { Raise, ReadinessItem } from '../types';

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done (self-assessed)' },
  { value: 'VERIFIED', label: 'Verified by a professional' },
];

function StatusChecklist({ items, onUpdate }: { items: ReadinessItem[]; onUpdate: (id: string, status: ReadinessItem['status']) => void }) {
  const verified = items.filter((i) => i.status === 'VERIFIED').length;
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-3">{verified} / {items.length} professionally verified</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-neutral-800">{item.label}</span>
            <div className="w-56 shrink-0">
              <Select value={item.status} onChange={(v) => onUpdate(item.id, v as ReadinessItem['status'])} options={STATUS_OPTIONS} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReadinessTab({ raise, onChange }: { raise: Raise; onChange: (r: Raise) => void }) {
  const d = raise.data;
  const updateReadiness = (id: string, status: ReadinessItem['status']) =>
    onChange({ ...raise, data: { ...d, readiness: d.readiness.map((i) => (i.id === id ? { ...i, status } : i)) }, updatedAt: new Date().toISOString() });
  const updateOffering = (id: string, status: ReadinessItem['status']) =>
    onChange({ ...raise, data: { ...d, offeringReadiness: d.offeringReadiness.map((i) => (i.id === id ? { ...i, status } : i)) }, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-4">
      <Card title="Entity readiness">
        <StatusChecklist items={d.readiness} onUpdate={updateReadiness} />
      </Card>

      <ProfessionalReviewGate title="Offering readiness — this is a checklist, not permission to solicit">
        This app does not verify accredited-investor status, generate offering documents, contact any investor, or
        file anything with the SEC or a state regulator. Every item below needs a securities attorney before it's
        acted on.
      </ProfessionalReviewGate>

      <Card title="Offering readiness (Reg D style)">
        <StatusChecklist items={d.offeringReadiness} onUpdate={updateOffering} />
      </Card>
    </div>
  );
}
