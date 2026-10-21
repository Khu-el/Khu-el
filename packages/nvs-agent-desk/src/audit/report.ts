import type { Ledger } from '../core/ledger.ts';
import type { Actor, ActionContext } from '../core/types.ts';
import type { CheckResult, ExportMeta } from './checks.ts';

export interface AuditReport {
  meta: ExportMeta;
  results: CheckResult[];
  counts: Record<CheckResult['status'], number>;
  /** 0-100, or null. Null whenever any check is unknown: an unmeasured item is not a pass. */
  score: number | null;
  scoreNote: string;
}

const WEIGHT = { critical: 5, high: 3, medium: 2, low: 1 } as const;

export function buildReport(meta: ExportMeta, results: CheckResult[]): AuditReport {
  const counts = { pass: 0, fail: 0, unknown: 0, not_applicable: 0 };
  for (const r of results) counts[r.status]++;
  if (counts.unknown > 0) {
    return { meta, results, counts, score: null, scoreNote: `UNSCORED: ${counts.unknown} check(s) unknown. Supply the missing data; do not read this as a pass.` };
  }
  const scored = results.filter((r) => r.status !== 'not_applicable');
  const max = scored.reduce((a, r) => a + WEIGHT[r.severity], 0);
  const got = scored.filter((r) => r.status === 'pass').reduce((a, r) => a + WEIGHT[r.severity], 0);
  return { meta, results, counts, score: max > 0 ? Math.round((got / max) * 100) : null, scoreNote: 'Weighted by severity over applicable checks. A heuristic, not a benchmark.' };
}

const ICON = { pass: '✅', fail: '🔴', unknown: '❓', not_applicable: '➖' } as const;

export function renderMarkdown(r: AuditReport): string {
  const L: string[] = [];
  L.push(`# Ad account audit — ${r.meta.platform}`);
  L.push(`Source: ${r.meta.source} · Window: ${r.meta.window ? `${r.meta.window.start} to ${r.meta.window.end}` : '❓ not stated'} · Currency: ${r.meta.currency ?? '❓ not stated'}`);
  L.push('');
  L.push(`**Result:** ${r.counts.pass} passed · ${r.counts.fail} failed · ${r.counts.unknown} unknown · ${r.counts.not_applicable} n/a`);
  L.push(`**Score:** ${r.score === null ? '—' : r.score} — ${r.scoreNote}`);
  L.push('');
  for (const c of r.results) {
    L.push(`## ${ICON[c.status]} ${c.title} (${c.severity})`);
    for (const f of c.findings) L.push(`- ${f}`);
    if (c.why) L.push(`- Missing: ${c.why}`);
    L.push('');
  }
  L.push('_Read-only audit. No account was changed. Any change below is a draft needing named human approval._');
  return L.join('\n');
}

export interface ChangeDraft {
  platform: string;
  campaign: string;
  proposal: 'review_for_pause';
  rationale: string;
  checkId: string;
}

/** Turn failed wasted-spend findings into drafts. Nothing here can touch an ad account: no executor exists. */
export function draftChanges(r: AuditReport): ChangeDraft[] {
  const wasted = r.results.find((c) => c.id === 'wasted-spend' && c.status === 'fail');
  if (!wasted) return [];
  return wasted.findings.map((f) => ({
    platform: r.meta.platform,
    campaign: f.slice(0, f.lastIndexOf(': ')), // names may contain colons; the amount never contains ": "
    proposal: 'review_for_pause',
    rationale: f,
    checkId: 'wasted-spend',
  }));
}

/** Queue drafts for a human. They enter the ledger as CONSEQUENTIAL "ads.change" and stay there until approved. */
export function queueDrafts(ledger: Ledger, context: ActionContext, actor: Actor, drafts: ChangeDraft[]) {
  return drafts.map((d) => ledger.propose({ kind: 'ads.change', context, payload: d, actor }));
}
