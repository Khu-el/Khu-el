import { scanTags, type Tag } from '../html/scan.ts';
import type { CheckResult, CheckStatus, ExportMeta, Severity } from './checks.ts';

// Website checks over pages the caller already has. Same four-state rule as the ad audit: a check that could not be
// measured is `unknown`, never `pass`. A page that was not fetched makes the checks that needed it unknown unless
// another page already failed them.

export interface PageInput {
  url: string;
  html: string | null; // null = not read
  note?: string; // why it was not read (refusal reason, status, ...)
  skipped?: string; // not an HTML page (PDF, image, ...): left out of every check and listed, never judged
}

export interface SiteFiles {
  robotsTxt?: string | null; // undefined = not looked up, null = looked up and absent/unreadable
  sitemapXml?: string | null;
}

const first = (tags: Tag[], name: string) => tags.find((t) => t.name === name);
const meta = (tags: Tag[], key: 'name' | 'property', value: string) =>
  tags.find((t) => t.name === 'meta' && t.a[key]?.toLowerCase() === value)?.a['content']?.trim();
const text = (html: string, tag: string) => html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.replace(/\s+/g, ' ').trim();
const path = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search || '/';
  } catch {
    return url;
  }
};

type PageCheck = { id: string; title: string; severity: Severity; why: string; run: (tags: Tag[], html: string, url: string) => string[] };

const PAGE_CHECKS: PageCheck[] = [
  {
    id: 'title', title: 'Every page has a title', severity: 'high', why: 'Search results and browser tabs show it.',
    run: (_t, html) => (text(html, 'title') ? [] : ['missing <title>']),
  },
  {
    id: 'title-length', title: 'Titles are 10-70 characters (heuristic: longer ones are usually cut off in results)', severity: 'low', why: 'A guideline, not a rule; search engines truncate by pixel width.',
    run: (_t, html) => {
      const t = text(html, 'title');
      return t && (t.length < 10 || t.length > 70) ? [`title is ${t.length} characters: "${t.slice(0, 90)}"`] : [];
    },
  },
  {
    id: 'meta-description', title: 'Every page has a meta description', severity: 'medium', why: 'Used as the search snippet.',
    run: (tags) => (meta(tags, 'name', 'description') ? [] : ['missing meta description']),
  },
  {
    id: 'description-length', title: 'Meta descriptions are 50-170 characters (heuristic)', severity: 'low', why: 'A guideline; snippets are cut near the upper end.',
    run: (tags) => {
      const d = meta(tags, 'name', 'description');
      return d && (d.length < 50 || d.length > 170) ? [`description is ${d.length} characters`] : [];
    },
  },
  {
    id: 'h1-single', title: 'Every page has exactly one H1', severity: 'medium', why: 'Gives the page one clear topic.',
    run: (tags) => {
      const n = tags.filter((t) => t.name === 'h1').length;
      return n === 1 ? [] : [`${n} H1 elements`];
    },
  },
  {
    id: 'lang', title: 'The <html> element declares a language', severity: 'low', why: 'Screen readers and translators use it.',
    run: (tags) => (first(tags, 'html')?.a['lang']?.trim() ? [] : ['no lang attribute on <html>']),
  },
  {
    id: 'viewport', title: 'Every page declares a mobile viewport', severity: 'high', why: 'Without it phones render a shrunken desktop page.',
    run: (tags) => (meta(tags, 'name', 'viewport') ? [] : ['no viewport meta']),
  },
  {
    id: 'noindex', title: 'No page asks search engines not to index it', severity: 'critical', why: 'A stray noindex removes a page from search.',
    run: (tags) => {
      const r = meta(tags, 'name', 'robots') ?? '';
      return /noindex/i.test(r) ? [`robots meta is "${r}"`] : [];
    },
  },
  {
    id: 'canonical', title: 'Every page names its canonical URL', severity: 'medium', why: 'Stops duplicate URLs competing with each other.',
    run: (tags) => (tags.some((t) => t.name === 'link' && t.a['rel']?.toLowerCase().split(/\s+/).includes('canonical') && t.a['href']) ? [] : ['no canonical link']),
  },
  {
    id: 'canonical-host', title: 'Canonical URLs point at the same host as the page', severity: 'medium', why: 'A canonical to another host hands the page\'s search credit to that host. Fine if this host is an intentional mirror.',
    run: (tags, _h, url) => {
      const c = tags.find((t) => t.name === 'link' && t.a['rel']?.toLowerCase().split(/\s+/).includes('canonical'))?.a['href'];
      if (!c) return [];
      try {
        const ch = new URL(c, url).host;
        return ch === new URL(url).host ? [] : [`canonical points to ${ch}`];
      } catch {
        return [`canonical "${c}" is not a valid URL`];
      }
    },
  },
  {
    id: 'img-alt', title: 'Every image has an alt attribute', severity: 'medium', why: 'Accessibility and image search. An empty alt="" is allowed for decorative images.',
    run: (tags) => {
      const missing = tags.filter((t) => t.name === 'img' && !('alt' in t.a)).length;
      return missing ? [`${missing} image(s) with no alt attribute`] : [];
    },
  },
  {
    id: 'open-graph', title: 'Every page has Open Graph title, description and image', severity: 'low', why: 'Controls how links look when shared.',
    run: (tags) => {
      const need = ['og:title', 'og:description', 'og:image'].filter((p) => !meta(tags, 'property', p));
      return need.length ? [`missing ${need.join(', ')}`] : [];
    },
  },
  {
    id: 'structured-data', title: 'The home page carries JSON-LD structured data', severity: 'low', why: 'Helps search and AI answers identify the organization.',
    run: (tags, _h, url) => {
      let home = false;
      try {
        home = new URL(url).pathname === '/';
      } catch {
        /* not a URL */
      }
      return !home || tags.some((t) => t.name === 'script' && /ld\+json/i.test(t.a['type'] ?? '')) ? [] : ['no application/ld+json block'];
    },
  },
  {
    id: 'mixed-content', title: 'No page loads resources over plain http', severity: 'high', why: 'Browsers block or warn on them.',
    run: (tags) => {
      const bad = tags.filter((t) => ['img', 'script', 'iframe', 'source', 'video', 'audio'].includes(t.name) && /^http:\/\//i.test(t.a['src'] ?? '')).length
        + tags.filter((t) => t.name === 'link' && /stylesheet/i.test(t.a['rel'] ?? '') && /^http:\/\//i.test(t.a['href'] ?? '')).length;
      return bad ? [`${bad} resource(s) loaded over http`] : [];
    },
  },
];

export function auditSite(pages: PageInput[], files: SiteFiles = {}): CheckResult[] {
  const out: CheckResult[] = [];
  const skipped = pages.filter((p) => p.skipped !== undefined);
  const considered = pages.filter((p) => p.skipped === undefined);
  const read = considered.filter((p) => p.html !== null);
  const unread = considered.filter((p) => p.html === null);
  const parsed = read.map((p) => ({ p, tags: scanTags(p.html!), html: p.html! }));

  out.push(
    read.length === 0
      ? { id: 'pages-read', title: 'Pages were read', status: 'unknown', severity: 'critical', findings: [], why: unread.length ? `None of ${unread.length} page(s) could be read: ${unread.map((u) => `${path(u.url)} (${u.note ?? 'no reason given'})`).join('; ')}` : 'No pages supplied.' }
      : { id: 'pages-read', title: 'Pages were read', status: unread.length ? 'unknown' : 'pass', severity: 'critical', findings: [`${read.length} page(s) analysed`, ...(skipped.length ? [`${skipped.length} non-HTML file(s) listed in the sitemap were not judged: ${skipped.slice(0, 5).map((s) => path(s.url)).join(', ')}${skipped.length > 5 ? ', ...' : ''}`] : [])], why: unread.length ? `${unread.length} page(s) not read: ${unread.map((u) => `${path(u.url)} (${u.note ?? 'no reason'})`).join('; ')}` : '' },
  );

  for (const c of PAGE_CHECKS) {
    if (read.length === 0) {
      out.push({ id: c.id, title: c.title, status: 'unknown', severity: c.severity, findings: [], why: 'No page could be read.' });
      continue;
    }
    const findings = parsed.flatMap(({ p, tags, html }) => c.run(tags, html, p.url).map((i) => `${path(p.url)}: ${i}`));
    const status: CheckStatus = findings.length ? 'fail' : unread.length ? 'unknown' : 'pass';
    out.push({ id: c.id, title: c.title, status, severity: c.severity, findings, why: findings.length ? c.why : unread.length ? `${unread.length} page(s) were not read, so "pass" cannot be claimed.` : '' });
  }

  // Duplicate titles across pages.
  const byTitle = new Map<string, string[]>();
  for (const { p, html } of parsed) {
    const t = text(html, 'title');
    if (t) byTitle.set(t, [...(byTitle.get(t) ?? []), path(p.url)]);
  }
  const dups = [...byTitle].filter(([, v]) => v.length > 1);
  out.push(
    read.length < 2
      ? { id: 'duplicate-titles', title: 'No two pages share a title', status: 'not_applicable', severity: 'medium', findings: [], why: 'Needs at least two pages.' }
      : { id: 'duplicate-titles', title: 'No two pages share a title', status: dups.length ? 'fail' : unread.length ? 'unknown' : 'pass', severity: 'medium', findings: dups.map(([t, v]) => `"${t.slice(0, 60)}" on ${v.join(', ')}`), why: dups.length ? 'Pages with identical titles compete with each other.' : unread.length ? 'Some pages were not read.' : '' },
  );

  // robots.txt and sitemap.
  if (files.robotsTxt === undefined) out.push({ id: 'robots-txt', title: 'robots.txt exists and declares a sitemap', status: 'unknown', severity: 'medium', findings: [], why: 'robots.txt was not looked up.' });
  else if (files.robotsTxt === null) out.push({ id: 'robots-txt', title: 'robots.txt exists and declares a sitemap', status: 'fail', severity: 'medium', findings: ['robots.txt not found or unreadable'], why: 'Crawlers look here first.' });
  else out.push(/^\s*sitemap\s*:/im.test(files.robotsTxt)
    ? { id: 'robots-txt', title: 'robots.txt exists and declares a sitemap', status: 'pass', severity: 'medium', findings: [], why: '' }
    : { id: 'robots-txt', title: 'robots.txt exists and declares a sitemap', status: 'fail', severity: 'medium', findings: ['robots.txt has no Sitemap: line'], why: 'Declaring the sitemap helps crawlers find every page.' });

  if (files.sitemapXml === undefined) out.push({ id: 'sitemap', title: 'A sitemap exists and lists pages', status: 'unknown', severity: 'medium', findings: [], why: 'sitemap.xml was not looked up.' });
  else if (files.sitemapXml === null) out.push({ id: 'sitemap', title: 'A sitemap exists and lists pages', status: 'fail', severity: 'medium', findings: ['sitemap.xml not found or unreadable'], why: '' });
  else {
    const n = (files.sitemapXml.match(/<loc>/gi) ?? []).length;
    out.push(n > 0
      ? { id: 'sitemap', title: 'A sitemap exists and lists pages', status: 'pass', severity: 'medium', findings: [`${n} URL(s) listed`], why: '' }
      : { id: 'sitemap', title: 'A sitemap exists and lists pages', status: 'fail', severity: 'medium', findings: ['sitemap has no <loc> entries'], why: '' });
  }
  return out;
}

export function siteMeta(baseUrl: string, source: string, date: string): ExportMeta {
  return { platform: `Website ${new URL(baseUrl).host}`, currency: null, window: { start: date, end: date }, source, kind: 'website' };
}
