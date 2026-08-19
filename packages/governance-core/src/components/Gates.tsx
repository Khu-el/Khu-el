import type { ReactNode } from 'react';

/**
 * Persistent, unavoidable statement of what this software is and is not.
 * Every app renders this once near the top of the shell.
 */
export function NoAutonomousExecutionBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="border border-neutral-300 bg-neutral-50 text-neutral-700 text-sm rounded-lg px-4 py-3 flex gap-3">
      <span aria-hidden className="text-lg leading-none">i</span>
      <div>
        <p className="font-medium text-neutral-900">This tool drafts, calculates, and organizes. It does not act.</p>
        <p>
          It never contacts a third party, sends money, signs anything, files anything with a government
          agency, or executes a transaction. Everything here is a scenario, a checklist, or a private
          record until a human takes it to the appropriate licensed professional.
        </p>
        {children}
      </div>
    </div>
  );
}

export function ProfessionalReviewGate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-2 border-rose-300 bg-rose-50 rounded-lg px-4 py-3">
      <p className="font-semibold text-rose-900">{title}</p>
      <div className="text-sm text-rose-800 mt-1">{children}</div>
    </div>
  );
}

export function NotLegalOrFinancialAdviceFooter() {
  return (
    <p className="text-xs text-neutral-500 border-t border-neutral-200 pt-3 mt-6">
      Educational / internal-planning tool only. Nothing generated here is legal, tax, securities, or
      investment advice, and no figure here is guaranteed. Verify every material fact with the
      appropriate licensed professional before relying on it.
    </p>
  );
}
