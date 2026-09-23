import { DecisionMemo, ProfessionalReviewGate, known, knownFields, fmtPlain } from '@nte/governance-core';
import type { Note } from '../types';
import { fmtCurrency, fmtPercent, impliedAnnualizedReturn, probabilityWeightedMonths, probabilityWeightedRecovery } from '../finance';

export function MemoTab({ note }: { note: Note }) {
  const d = knownFields(note.data);
  const weighted = d.scenarios.map((s) => ({ probabilityPct: s.probabilityPct ?? 0, recoveryAmount: known(s.recoveryAmount), monthsToResolve: known(s.monthsToResolve) }));
  const weightedRecovery = probabilityWeightedRecovery(weighted);
  const weightedMonths = probabilityWeightedMonths(weighted);
  const irr = impliedAnnualizedReturn(d.acquisitionPrice, weightedRecovery, weightedMonths);
  const lienDone = d.lienChecklist.filter((i) => i.done).length;

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="Before acquiring or acting on this note">
        This memo summarizes your own inputs. It does not confirm lien priority, note ownership, or the legality
        of any collection/foreclosure step in the applicable state — that needs review by counsel licensed where
        the collateral sits.
      </ProfessionalReviewGate>

      <DecisionMemo
        title={`Note underwriting summary — ${d.obligorRef || 'Unreferenced'}`}
        assumptions={[
          { label: 'UPB', value: fmtCurrency(d.upb) },
          { label: 'Contract rate', value: fmtPlain(d.contractRatePct, '%') },
          { label: 'Discount rate', value: fmtPlain(d.discountRatePct, '%') },
          { label: 'Status', value: d.workoutStatus.replace('_', ' ') },
        ]}
        lines={[
          { label: 'Acquisition price', value: fmtCurrency(d.acquisitionPrice) },
          { label: 'Price as % of UPB', value: fmtPercent(d.upb > 0 ? d.acquisitionPrice / d.upb : NaN) },
          { label: 'Probability-weighted recovery', value: fmtCurrency(weightedRecovery) },
          { label: 'Probability-weighted timeline', value: Number.isFinite(weightedMonths) ? `${weightedMonths.toFixed(1)} months` : '—' },
          { label: 'Implied annualized return', value: fmtPercent(irr) },
          { label: 'Lien/perfection checklist', value: `${lienDone} / ${d.lienChecklist.length}` },
        ]}
        notes={[
          d.notes || 'No additional notes recorded.',
          lienDone < d.lienChecklist.length ? 'Lien/perfection diligence is not complete — treat recovery scenarios as provisional.' : 'Lien checklist complete — confirm each item against the actual recorded documents, not just this checkbox.',
        ]}
      />
    </div>
  );
}
