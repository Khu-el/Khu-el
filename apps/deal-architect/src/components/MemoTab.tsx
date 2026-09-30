import { DecisionMemo, ProfessionalReviewGate, knownFields, sumKnown, fmtPlain } from '@nte/governance-core';
import type { Deal } from '../types';
import { capRate, dscr, fmtCurrency, fmtPercent, fmtRatio, maxAllowableOffer, monthlyPayment, noi } from '../finance';

export function MemoTab({ deal }: { deal: Deal }) {
  const d = knownFields(deal.data);
  const mao = maxAllowableOffer(d.arv, d.moaRule, d.repairEstimate);
  const annualNoi = noi(d.monthlyRent, d.monthlyExpenses);
  const cr = capRate(annualNoi, d.askingPrice);
  const annualDebtService = monthlyPayment(d.loanAmount, d.loanRatePct, d.loanTermMonths) * 12;
  const coverage = dscr(annualNoi, annualDebtService);
  const stackTotal = sumKnown(d.capitalStack.map((c) => c.amount));
  const totalCost = d.askingPrice + d.repairEstimate;
  const diligenceDone = d.diligence.filter((i) => i.done).length;

  return (
    <div className="space-y-4">
      <ProfessionalReviewGate title="Before you act on this deal">
        This memo is a summary of your own inputs, not a legal opinion, appraisal, or lending decision. Title,
        zoning, and contract terms need review by a title company / real estate attorney before you're bound to
        anything.
      </ProfessionalReviewGate>

      <DecisionMemo
        title={`Deal summary — ${d.address || 'Unnamed property'}`}
        assumptions={[
          { label: 'ARV', value: fmtCurrency(d.arv) },
          { label: 'Repair estimate', value: fmtCurrency(d.repairEstimate) },
          { label: 'MAO rule', value: fmtPlain(Number.isFinite(d.moaRule) ? Math.round(d.moaRule * 100) : null, '%') },
          { label: 'Monthly rent (est.)', value: fmtCurrency(d.monthlyRent) },
          { label: 'Financing', value: `${fmtCurrency(d.loanAmount)} @ ${fmtPlain(d.loanRatePct, '%')} / ${fmtPlain(d.loanTermMonths, 'mo')}` },
        ]}
        lines={[
          { label: 'Asking price', value: fmtCurrency(d.askingPrice) },
          { label: 'Max allowable offer', value: fmtCurrency(mao) },
          { label: 'Annual NOI', value: fmtCurrency(annualNoi) },
          { label: 'Cap rate', value: fmtPercent(cr) },
          { label: 'DSCR', value: fmtRatio(coverage) },
          { label: 'Capital stack sourced', value: `${fmtCurrency(stackTotal)} of ${fmtCurrency(totalCost)}` },
          { label: 'Diligence complete', value: `${diligenceDone} / ${d.diligence.length}` },
        ]}
        notes={[
          d.notes || 'No additional notes recorded.',
          diligenceDone < d.diligence.length ? 'Diligence checklist is not yet complete.' : 'Diligence checklist is complete — verify each item against source documents, not just the checkbox.',
        ]}
      />
    </div>
  );
}
