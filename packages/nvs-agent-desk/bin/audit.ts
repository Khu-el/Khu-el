// Pilot CLI: audit a local ad-platform CSV export and write a Markdown report. Read-only; no network, no account access.
// usage: node bin/audit.ts <export.csv> --platform "Google Ads" --start 2026-09-01 --end 2026-09-30 [--currency $] [--target-roas 4] [--out report.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { readExport, runChecks } from '../src/audit/checks.ts';
import { buildReport, draftChanges, renderMarkdown } from '../src/audit/report.ts';

const argv = process.argv.slice(2);
const file = argv[0];
const opt = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
if (!file || file.startsWith('--')) {
  console.error('usage: node bin/audit.ts <export.csv> --platform <name> [--start YYYY-MM-DD --end YYYY-MM-DD] [--currency $] [--target-roas N] [--out file.md]');
  process.exit(2);
}
const start = opt('start');
const end = opt('end');
const meta = {
  platform: opt('platform') ?? 'unspecified',
  currency: opt('currency') ?? null,
  window: start && end ? { start, end } : null,
  source: file,
};
const target = opt('target-roas');
if (target !== undefined && !(Number.isFinite(Number(target)) && Number(target) > 0)) {
  console.error(`--target-roas must be a positive number, got "${target}"`);
  process.exit(2);
}
const { rows, missingColumns } = readExport(readFileSync(file, 'utf8'));
const report = buildReport(meta, runChecks(rows, meta, { targetRoas: target ? Number(target) : null }));
let md = renderMarkdown(report);
if (missingColumns.length) md += `\n\n_Columns not found in export: ${missingColumns.join(', ')}._`;
const drafts = draftChanges(report);
if (drafts.length) md += `\n\n## Draft change proposals (not applied)\n${drafts.map((d) => `- ${d.campaign}: ${d.proposal} — ${d.rationale}`).join('\n')}\n`;
const out = opt('out');
if (out) writeFileSync(out, md + '\n'); else console.log(md);
