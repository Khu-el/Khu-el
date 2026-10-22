// Website audit CLI. Read-only: it fetches public pages (or reads pages you saved) and writes a Markdown report.
// live:   node bin/site-audit.ts https://example.org --contact https://nvs.example/bot [--pages 10] [--delay-ms 2000] [--out report.md]
// saved:  node bin/site-audit.ts --from-dir ./saved --base-url https://example.org [--out report.md]
import { writeFileSync } from 'node:fs';
import { HostRateLimiter } from '../src/browse/policy.ts';
import { makeNodeFetch, resolveAll } from '../src/browse/nodeFetch.ts';
import { auditSite, siteMeta } from '../src/audit/site.ts';
import { fetchSite, loadSiteFromDir } from '../src/audit/siteRun.ts';
import { buildReport, renderMarkdown } from '../src/audit/report.ts';

const argv = process.argv.slice(2);
const opt = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const usage = () => {
  console.error('usage:\n  node bin/site-audit.ts <https://site> --contact <url> [--pages N] [--delay-ms N] [--out file.md]\n  node bin/site-audit.ts --from-dir <dir> --base-url <https://site> [--out file.md]');
  process.exit(2);
};
const posInt = (v: string | undefined, name: string, dflt: number) => {
  if (v === undefined) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`--${name} must be a positive integer, got "${v}"`);
    process.exit(2);
  }
  return n;
};

const fromDir = opt('from-dir');
const target = fromDir ? opt('base-url') : argv[0];
if (!target || target.startsWith('--')) usage();
let base: URL;
try {
  base = new URL(target!);
} catch {
  console.error(`not a valid URL: ${target}`);
  process.exit(2);
}

let snapshot;
let source: string;
if (fromDir) {
  snapshot = loadSiteFromDir(fromDir);
  source = `saved pages in ${fromDir}`;
} else {
  const contact = opt('contact');
  if (!contact) {
    console.error('live mode needs --contact <url>: the user agent must tell site owners who is fetching');
    process.exit(2);
  }
  const delay = posInt(opt('delay-ms'), 'delay-ms', 2000);
  snapshot = await fetchSite(
    base.origin,
    { fetchImpl: makeNodeFetch(), resolve: resolveAll, userAgent: `NVS-Agent-Desk/0.1 (+${contact})`, limiter: new HostRateLimiter(delay) },
    { maxPages: posInt(opt('pages'), 'pages', 10) },
  );
  source = 'live fetch with the compliant fetcher';
}

const meta = siteMeta(base.origin, source, new Date().toISOString().slice(0, 10));
const md = renderMarkdown(buildReport(meta, auditSite(snapshot.pages, snapshot.files)));
const out = opt('out');
if (out) writeFileSync(out, md + '\n');
else console.log(md);
