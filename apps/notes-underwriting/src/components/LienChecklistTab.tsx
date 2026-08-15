import { Card, Checklist, ProfessionalReviewGate } from '@nte/governance-core';
import type { Note } from '../types';

export function LienChecklistTab({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const items = note.data.lienChecklist;
  const toggle = (id: string) =>
    onChange({
      ...note,
      data: { ...note.data, lienChecklist: items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) },
      updatedAt: new Date().toISOString(),
    });

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="Collection & foreclosure activity is regulated">
        This checklist is diligence only. Any actual contact with a borrower, collection action, or foreclosure
        step is governed by the FDCPA and state-specific rules (and possibly licensing requirements for whoever
        is servicing the note). This app does not contact anyone and does not track compliance for you.
      </ProfessionalReviewGate>
      <Card title="Lien & perfection checklist">
        <Checklist items={items} onToggle={toggle} />
      </Card>
    </div>
  );
}
