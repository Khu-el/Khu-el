import { DecisionMemo, ProfessionalReviewGate } from '@nte/governance-core';
import type { Raise } from '../types';
import { fmtCurrency } from '../finance';

export function MemoTab({ raise }: { raise: Raise }) {
  const d = raise.data;
  const proceedsTotal = d.useOfProceeds.reduce((s, l) => s + l.amount, 0);
  const readinessVerified = d.readiness.filter((i) => i.status === 'VERIFIED').length;
  const offeringVerified = d.offeringReadiness.filter((i) => i.status === 'VERIFIED').length;

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="Do not use this memo to solicit anyone">
        This is an internal readiness snapshot for you and your advisors. It is not an offering document, and
        distributing it to a prospective investor as one would defeat the entire point of the checklist above.
      </ProfessionalReviewGate>

      <DecisionMemo
        title={`Capital readiness — ${d.entityName || 'Unnamed entity'}`}
        assumptions={[
          { label: 'Entity formed?', value: d.entityFormed },
          { label: 'Exemption track (unconfirmed)', value: d.exemptionTrack },
          { label: 'Target raise', value: fmtCurrency(d.targetRaise) },
          { label: 'Minimum raise', value: fmtCurrency(d.minimumRaise) },
        ]}
        lines={[
          { label: 'Cap table holders', value: String(d.capTable.length) },
          { label: 'Use-of-proceeds allocated', value: fmtCurrency(proceedsTotal) },
          { label: 'Entity readiness verified', value: `${readinessVerified} / ${d.readiness.length}` },
          { label: 'Offering readiness verified', value: `${offeringVerified} / ${d.offeringReadiness.length}` },
        ]}
        notes={[
          d.notes || 'No additional notes recorded.',
          offeringVerified < d.offeringReadiness.length
            ? 'Offering readiness is not fully verified — do not treat this entity as capital-raise ready.'
            : 'All offering-readiness items are marked verified — confirm that verification actually came from counsel, not self-assessment.',
        ]}
      />
    </div>
  );
}
