import { parseCsv, parseNumber } from './csv.ts';

export type CheckStatus = 'pass' | 'fail' | 'unknown' | 'not_applicable';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** An empty cell is null, never 0. */
export interface CampaignRow {
  campaign: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  convValue: number | null;
}

export interface ExportMeta {
  platform: string;
  currency: string | null;
  window: { start: string; end: string } | null; // ISO dates. Required for any time-dependent claim.
  source: string; // file name or description of the export
}

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  severity: Severity;
  findings: string[];
  why: string; // for unknown / not_applicable: what is missing
}

export interface AuditOptions {
  minWastedSpend?: number; // in account currency
  targetRoas?: number | null;
  concentrationLimit?: number; // 0..1
}

const COLUMN_ALIASES: Record<keyof CampaignRow, string[]> = {
  campaign: ['campaign', 'campaign name'],
  spend: ['cost', 'spend', 'amount spent'],
  impressions: ['impr.', 'impressions', 'impr'],
  clicks: ['clicks', 'link clicks'],
  conversions: ['conversions', 'conv.', 'results', 'purchases'],
  convValue: ['conv. value', 'conversion value', 'purchase conversion value', 'revenue'],
};

/** Read an ad-platform export. Columns that are absent stay null for every row (so checks report "unknown"). */
export function readExport(csv: string): { rows: CampaignRow[]; missingColumns: (keyof CampaignRow)[] } {
  const table = parseCsv(csv);
  if (table.length < 2) return { rows: [], missingColumns: Object.keys(COLUMN_ALIASES) as (keyof CampaignRow)[] };
  const header = table[0]!.map((h) => h.trim().toLowerCase());
  const idx = {} as Record<keyof CampaignRow, number>;
  const missing: (keyof CampaignRow)[] = [];
  for (const key of Object.keys(COLUMN_ALIASES) as (keyof CampaignRow)[]) {
    const i = header.findIndex((h) => COLUMN_ALIASES[key].includes(h));
    idx[key] = i;
    if (i < 0) missing.push(key);
  }
  const rows = table
    .slice(1)
    .filter((r) => idx.campaign >= 0 && (r[idx.campaign] ?? '').trim() !== '' && !/^total/i.test(r[idx.campaign]!.trim()))
    .map((r) => ({
      campaign: r[idx.campaign]!.trim(),
      spend: idx.spend >= 0 ? parseNumber(r[idx.spend]) : null,
      impressions: idx.impressions >= 0 ? parseNumber(r[idx.impressions]) : null,
      clicks: idx.clicks >= 0 ? parseNumber(r[idx.clicks]) : null,
      conversions: idx.conversions >= 0 ? parseNumber(r[idx.conversions]) : null,
      convValue: idx.convValue >= 0 ? parseNumber(r[idx.convValue]) : null,
    }));
  return { rows, missingColumns: missing };
}

const known = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const money = (n: number, cur: string | null) => `${cur ?? ''}${n.toFixed(2)}`.trim();

export function runChecks(rows: CampaignRow[], meta: ExportMeta, opts: AuditOptions = {}): CheckResult[] {
  const out: CheckResult[] = [];
  const cur = meta.currency;
  const res = (r: Omit<CheckResult, 'findings' | 'why'> & Partial<Pick<CheckResult, 'findings' | 'why'>>): CheckResult => ({
    findings: [],
    why: '',
    ...r,
  });

  // 1. Without a date window nothing is comparable to anything else.
  const w = meta.window;
  const windowOk = !!w && /^\d{4}-\d{2}-\d{2}$/.test(w.start) && /^\d{4}-\d{2}-\d{2}$/.test(w.end) && w.start <= w.end;
  out.push(
    windowOk
      ? res({ id: 'data-window', title: 'Export states a valid date range', status: 'pass', severity: 'medium', findings: [`${w!.start} to ${w!.end}`] })
      : res({ id: 'data-window', title: 'Export states a valid date range', status: 'unknown', severity: 'medium', why: 'No valid start/end dates supplied with the export.' }),
  );

  if (rows.length === 0) {
    out.push(res({ id: 'rows', title: 'Export has campaign rows', status: 'unknown', severity: 'critical', why: 'No readable campaign rows.' }));
    return out;
  }

  const spend = known(rows.map((r) => r.spend));
  const conv = known(rows.map((r) => r.conversions));
  const totalSpend = sum(spend);

  // 2. Tracking. All-zero conversions on real spend usually means broken measurement, not worthless ads.
  let trackingStatus: CheckStatus;
  if (spend.length === 0) {
    trackingStatus = 'unknown';
    out.push(res({ id: 'tracking-present', title: 'Conversion tracking is recording', status: 'unknown', severity: 'critical', why: 'No spend column.' }));
  } else if (conv.length === 0) {
    trackingStatus = 'unknown';
    out.push(res({ id: 'tracking-present', title: 'Conversion tracking is recording', status: 'unknown', severity: 'critical', why: 'No conversions column in the export.' }));
  } else if (totalSpend > 0 && sum(conv) === 0) {
    trackingStatus = 'fail';
    out.push(
      res({
        id: 'tracking-present',
        title: 'Conversion tracking is recording',
        status: 'fail',
        severity: 'critical',
        findings: [`${money(totalSpend, cur)} spent with zero conversions across ${rows.length} campaigns. Verify the tag/offline-import before judging any campaign.`],
      }),
    );
  } else {
    trackingStatus = 'pass';
    out.push(res({ id: 'tracking-present', title: 'Conversion tracking is recording', status: 'pass', severity: 'critical', findings: [`${sum(conv)} conversions recorded.`] }));
  }

  // 3. Wasted spend: only judged when tracking is known-good, otherwise we would blame campaigns for a tag.
  const min = opts.minWastedSpend ?? 50;
  if (trackingStatus !== 'pass') {
    out.push(res({ id: 'wasted-spend', title: 'No campaign spends meaningfully with zero conversions', status: 'unknown', severity: 'high', why: `Tracking check is ${trackingStatus}; per-campaign conversion claims are not reliable.` }));
  } else {
    const wasted = rows.filter((r) => r.spend !== null && r.spend >= min && r.conversions === 0);
    const unreadable = rows.filter((r) => r.conversions === null && r.spend !== null && r.spend >= min);
    out.push(
      wasted.length
        ? res({ id: 'wasted-spend', title: 'No campaign spends meaningfully with zero conversions', status: 'fail', severity: 'high', findings: wasted.map((r) => `${r.campaign}: ${money(r.spend!, cur)}, 0 conversions`), why: unreadable.length ? `${unreadable.length} other campaign(s) with spend have no readable conversions value and were not judged.` : '' })
        : unreadable.length
          ? res({ id: 'wasted-spend', title: 'No campaign spends meaningfully with zero conversions', status: 'unknown', severity: 'high', why: `${unreadable.length} campaign(s) have spend but no readable conversions value.` })
          : res({ id: 'wasted-spend', title: 'No campaign spends meaningfully with zero conversions', status: 'pass', severity: 'high' }),
    );
  }

  // 4. Budget concentration.
  const limit = opts.concentrationLimit ?? 0.7;
  if (spend.length === 0) out.push(res({ id: 'budget-concentration', title: 'Spend is not concentrated in one campaign', status: 'unknown', severity: 'medium', why: 'No spend column.' }));
  else if (rows.length < 2) out.push(res({ id: 'budget-concentration', title: 'Spend is not concentrated in one campaign', status: 'not_applicable', severity: 'medium', why: 'Single campaign.' }));
  else {
    const top = rows.reduce((a, b) => ((b.spend ?? -1) > (a.spend ?? -1) ? b : a));
    const share = totalSpend > 0 ? top.spend! / totalSpend : NaN;
    out.push(
      !Number.isFinite(share)
        ? res({ id: 'budget-concentration', title: 'Spend is not concentrated in one campaign', status: 'unknown', severity: 'medium', why: 'Total spend is zero.' })
        : share > limit
          ? res({ id: 'budget-concentration', title: 'Spend is not concentrated in one campaign', status: 'fail', severity: 'medium', findings: [`${top.campaign} takes ${(share * 100).toFixed(0)}% of spend (limit ${(limit * 100).toFixed(0)}%).`] })
          : res({ id: 'budget-concentration', title: 'Spend is not concentrated in one campaign', status: 'pass', severity: 'medium' }),
    );
  }

  // 5. CTR outliers against the account's own median.
  const ctrRows = rows.filter((r) => r.impressions !== null && r.impressions >= 1000 && r.clicks !== null);
  if (ctrRows.length < 3) {
    out.push(res({ id: 'ctr-outlier', title: 'No campaign has CTR far below the account median', status: 'unknown', severity: 'medium', why: 'Needs at least 3 campaigns with >=1000 impressions and a clicks value.' }));
  } else {
    const ctr = (r: CampaignRow) => r.clicks! / r.impressions!;
    const med = median(ctrRows.map(ctr));
    const low = ctrRows.filter((r) => ctr(r) < med * 0.5);
    out.push(
      low.length
        ? res({ id: 'ctr-outlier', title: 'No campaign has CTR far below the account median', status: 'fail', severity: 'medium', findings: low.map((r) => `${r.campaign}: CTR ${(ctr(r) * 100).toFixed(2)}% vs median ${(med * 100).toFixed(2)}%`) })
        : res({ id: 'ctr-outlier', title: 'No campaign has CTR far below the account median', status: 'pass', severity: 'medium' }),
    );
  }

  // 6. ROAS floor, only if the principal gave a target.
  if (opts.targetRoas == null) {
    out.push(res({ id: 'roas-floor', title: 'Blended ROAS meets the stated target', status: 'not_applicable', severity: 'high', why: 'No ROAS target supplied.' }));
  } else {
    const value = known(rows.map((r) => r.convValue));
    if (value.length === 0 || totalSpend <= 0) out.push(res({ id: 'roas-floor', title: 'Blended ROAS meets the stated target', status: 'unknown', severity: 'high', why: 'No conversion-value column, or zero spend.' }));
    else {
      const roas = sum(value) / totalSpend;
      out.push(
        roas >= opts.targetRoas
          ? res({ id: 'roas-floor', title: 'Blended ROAS meets the stated target', status: 'pass', severity: 'high', findings: [`ROAS ${roas.toFixed(2)} vs target ${opts.targetRoas}`] })
          : res({ id: 'roas-floor', title: 'Blended ROAS meets the stated target', status: 'fail', severity: 'high', findings: [`ROAS ${roas.toFixed(2)} below target ${opts.targetRoas}`] }),
      );
    }
  }
  return out;
}
