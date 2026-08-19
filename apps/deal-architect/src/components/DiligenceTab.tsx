import { Card, Checklist } from '@nte/governance-core';
import type { Deal } from '../types';

export function DiligenceTab({ deal, onChange }: { deal: Deal; onChange: (d: Deal) => void }) {
  const items = deal.data.diligence;
  const toggle = (id: string) =>
    onChange({
      ...deal,
      data: { ...deal.data, diligence: items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) },
      updatedAt: new Date().toISOString(),
    });

  return (
    <Card title="Diligence checklist" subtitle="Standard items before you'd rely on this deal's numbers. None of this substitutes for your title company, inspector, or attorney.">
      <Checklist items={items} onToggle={toggle} />
    </Card>
  );
}
