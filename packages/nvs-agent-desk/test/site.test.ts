import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditSite, siteMeta, type PageInput } from '../src/audit/site.ts';
import { fetchSite, loadSiteFromDir } from '../src/audit/siteRun.ts';
import { buildReport, renderMarkdown } from '../src/audit/report.ts';
import { HostRateLimiter } from '../src/browse/policy.ts';
import type { FetcherDeps } from '../src/browse/fetcher.ts';

const GOOD = (title = 'The Excellence District — Home of Events and Community', extra = '') => `<!doctype html><html lang="en"><head>
<title>${title}</title><meta name="description" content="A community hub for events, members and learning across the Excellence District network of programs.">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://excellencedistrict.org/">
<meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="https://excellencedistrict.org/i.png">
<script type="application/ld+json">{"@type":"Organization"}</script>${extra}</head><body><h1>Welcome</h1><img src="a.png" alt="logo"><img src="b.png" alt=""></body></html>`;
const page = (path: string, html: string | null, note?: string): PageInput => ({ url: `https://excellencedistrict.org${path}`, html, note });
const by = (rs: ReturnType<typeof auditSite>, id: string) => rs.find((r) => r.id === id)!;
const SITEMAP = '<urlset><url><loc>https://excellencedistrict.org/</loc></url><url><loc>https://excellencedistrict.org/about</loc></url></urlset>';

test('a well-formed page passes every page check', () => {
  const rs = auditSite([page('/', GOOD())], { robotsTxt: 'User-agent: *\nSitemap: https://excellencedistrict.org/sitemap.xml', sitemapXml: SITEMAP });
  const bad = rs.filter((r) => r.status === 'fail' || r.status === 'unknown');
  assert.deepEqual(bad.map((r) => r.id), [], JSON.stringify(bad));
});

test('a bare page fails each check it should, and names the page', () => {
  const rs = auditSite([page('/x', '<html><head></head><body><h1>a</h1><h1>b</h1><img src="http://cdn.example/a.png"></body></html>')], {});
  for (const id of ['title', 'meta-description', 'h1-single', 'lang', 'viewport', 'canonical', 'img-alt', 'open-graph', 'mixed-content']) {
    assert.equal(by(rs, id).status, 'fail', id);
    assert.match(by(rs, id).findings[0]!, /^\/x: /);
  }
  assert.equal(by(rs, 'structured-data').status, 'pass', 'JSON-LD is only required on the home page');
});

test('noindex is critical; a canonical on another host is flagged (mirror hosts expected to show this)', () => {
  const rs = auditSite([page('/', GOOD('Valid title for the page here', '<meta name="robots" content="noindex,follow">'))], {});
  assert.equal(by(rs, 'noindex').status, 'fail');
  assert.equal(by(rs, 'noindex').severity, 'critical');
  const mirror = auditSite([{ url: 'https://events.excellencedistrict.org/', html: GOOD() }], {});
  assert.equal(by(mirror, 'canonical-host').status, 'fail');
  assert.match(by(mirror, 'canonical-host').findings[0]!, /excellencedistrict\.org/);
});

test('an unread page makes "pass" impossible (unknown), but a real failure still shows as fail', () => {
  const pages = [page('/', GOOD()), page('/gone', null, 'HTTP 404')];
  const rs = auditSite(pages, {});
  assert.equal(by(rs, 'title').status, 'unknown');
  assert.match(by(rs, 'pages-read').why, /\/gone \(HTTP 404\)/);
  const withFail = auditSite([page('/', GOOD()), page('/b', '<html></html>'), page('/gone', null, 'refused')], {});
  assert.equal(by(withFail, 'title').status, 'fail');
});

test('nothing read means everything is unknown, not pass', () => {
  const rs = auditSite([page('/', null, 'refused by robots.txt')], {});
  assert.ok(rs.filter((r) => ['title', 'viewport', 'noindex'].includes(r.id)).every((r) => r.status === 'unknown'));
});

test('duplicate titles are found; robots and sitemap states are explicit', () => {
  const same = 'Same title on two pages here';
  const rs = auditSite([page('/a', GOOD(same)), page('/b', GOOD(same))], { robotsTxt: 'User-agent: *', sitemapXml: null });
  assert.equal(by(rs, 'duplicate-titles').status, 'fail');
  assert.equal(by(rs, 'robots-txt').status, 'fail');
  assert.equal(by(rs, 'sitemap').status, 'fail');
  assert.equal(by(auditSite([page('/a', GOOD())], {}), 'robots-txt').status, 'unknown');
  assert.equal(by(auditSite([page('/a', GOOD())], {}), 'duplicate-titles').status, 'not_applicable');
});

test('the website report says it is a website audit and withholds the score while anything is unknown', () => {
  const meta = siteMeta('https://excellencedistrict.org', 'unit test', '2026-10-22');
  const partial = renderMarkdown(buildReport(meta, auditSite([page('/', GOOD())], {})));
  assert.match(partial, /^# Website audit — Website excellencedistrict\.org/);
  assert.match(partial, /UNSCORED/);
  assert.doesNotMatch(partial, /Currency|ad account/i);
});

// ---- runner --------------------------------------------------------------------------------------------

function deps(site: Record<string, { status: number; body: string }>, over: Partial<FetcherDeps> = {}) {
  const hits: string[] = [];
  const d: FetcherDeps = {
    userAgent: 'NVS-Agent-Desk/0.1 (+https://nvs.example/bot)',
    limiter: new HostRateLimiter(0),
    resolve: async () => ['93.184.216.34'],
    fetchImpl: async (url) => {
      hits.push(url);
      const hit = site[new URL(url).pathname] ?? { status: 404, body: 'nope' };
      return { status: hit.status, headers: { get: () => null }, text: async () => hit.body };
    },
    ...over,
  };
  return { d, hits };
}

test('fetchSite reads home + sitemap pages up to the cap, and records refusals as unread with the reason', async () => {
  const sm = '<urlset>' + ['/', '/a', '/b', '/c'].map((p) => `<url><loc>https://excellencedistrict.org${p}</loc></url>`).join('') + '<url><loc>https://other.example/x</loc></url></urlset>';
  const { d } = deps({ '/robots.txt': { status: 200, body: 'User-agent: *\nDisallow: /b' }, '/sitemap.xml': { status: 200, body: sm }, '/': { status: 200, body: GOOD() }, '/a': { status: 200, body: GOOD() }, '/b': { status: 200, body: GOOD() } });
  const snap = await fetchSite('https://excellencedistrict.org', d, { maxPages: 3, sleep: async () => {} });
  assert.deepEqual(snap.pages.map((p) => p.url), ['https://excellencedistrict.org/', 'https://excellencedistrict.org/a', 'https://excellencedistrict.org/b']);
  assert.equal(snap.pages[2]!.html, null);
  assert.match(snap.pages[2]!.note!, /robots\.txt/);
  assert.ok(snap.files.sitemapXml);
});

test('fetchSite waits out one rate-limit refusal; missing robots/sitemap become null (looked up, absent)', async () => {
  let t = 0;
  const sleeps: number[] = [];
  const { d } = deps({ '/': { status: 200, body: GOOD() } }, { limiter: new HostRateLimiter(1000, () => t) });
  const snap = await fetchSite('https://excellencedistrict.org', d, { maxPages: 1, sleep: async (ms) => { sleeps.push(ms); t += ms; } });
  assert.ok(sleeps.length >= 1);
  assert.equal(snap.files.robotsTxt, null);
  assert.equal(snap.files.sitemapXml, null);
  assert.equal(snap.pages[0]!.html, GOOD());
});

test('loadSiteFromDir reads a manifest and marks missing files unread instead of failing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nvs-site-'));
  writeFileSync(join(dir, 'home.html'), GOOD());
  writeFileSync(join(dir, 'robots.txt'), 'Sitemap: x');
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ pages: [{ url: 'https://excellencedistrict.org/', file: 'home.html' }, { url: 'https://excellencedistrict.org/x', file: 'missing.html' }], robots: 'robots.txt', sitemap: 'sitemap.xml' }));
  const snap = loadSiteFromDir(dir);
  assert.equal(snap.pages[0]!.html, GOOD());
  assert.equal(snap.pages[1]!.html, null);
  assert.equal(snap.files.robotsTxt, 'Sitemap: x');
  assert.equal(snap.files.sitemapXml, null);
});

test('non-HTML files are skipped and listed, never judged as pages', () => {
  const rs = auditSite([page('/', GOOD()), { url: 'https://excellencedistrict.org/files/guide.pdf', html: null, skipped: 'file type is not HTML' }], { robotsTxt: 'Sitemap: x', sitemapXml: SITEMAP });
  assert.equal(by(rs, 'pages-read').status, 'pass');
  assert.match(by(rs, 'pages-read').findings.join(' '), /1 non-HTML file.*guide\.pdf/);
  assert.equal(rs.filter((r) => r.status === 'fail' || r.status === 'unknown').length, 0);
});

test('title/description length are separate low-severity checks from presence', () => {
  const long = 'A title that is much longer than seventy characters so that it would be cut off in results';
  const rs = auditSite([page('/a', GOOD(long))], {});
  assert.equal(by(rs, 'title').status, 'pass');
  assert.equal(by(rs, 'title-length').status, 'fail');
  assert.equal(by(rs, 'title-length').severity, 'low');
});

test('fetchSite does not fetch files by extension and skips non-HTML content types', async () => {
  const sm = '<urlset><url><loc>https://excellencedistrict.org/</loc></url><url><loc>https://excellencedistrict.org/g.pdf</loc></url><url><loc>https://excellencedistrict.org/feed</loc></url></urlset>';
  const hits: string[] = [];
  const d: FetcherDeps = {
    userAgent: 'NVS-Agent-Desk/0.1 (+https://nvs.example/bot)',
    limiter: new HostRateLimiter(0),
    resolve: async () => ['93.184.216.34'],
    fetchImpl: async (url) => {
      hits.push(new URL(url).pathname);
      const p = new URL(url).pathname;
      const ct = p === '/feed' ? 'application/octet-stream' : 'text/html; charset=utf-8';
      const body = p === '/sitemap.xml' ? sm : p === '/robots.txt' ? 'User-agent: *' : GOOD();
      return { status: 200, headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? ct : null) }, text: async () => body };
    },
  };
  const snap = await fetchSite('https://excellencedistrict.org', d, { maxPages: 10, sleep: async () => {} });
  assert.ok(!hits.includes('/g.pdf'), 'a PDF is never requested');
  assert.deepEqual(snap.pages.map((p) => [new URL(p.url).pathname, p.html !== null, p.skipped ?? null]), [['/', true, null], ['/g.pdf', false, 'file type is not HTML'], ['/feed', false, 'content type application/octet-stream']]);
});

test('rendered explanations are labelled by what they mean (fail vs unknown)', () => {
  const meta = siteMeta('https://excellencedistrict.org', 'unit test', '2026-10-22');
  const md = renderMarkdown(buildReport(meta, auditSite([page('/', GOOD(undefined, '<meta name="robots" content="noindex">')), page('/gone', null, 'HTTP 404')], {})));
  assert.match(md, /Why it matters: A stray noindex/);
  assert.match(md, /Not measured: /);
  assert.doesNotMatch(md, /Missing: A stray/);
});
