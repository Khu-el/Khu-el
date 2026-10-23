import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchPage, type FetcherDeps } from '../browse/fetcher.ts';
import type { PageInput, SiteFiles } from './site.ts';

export interface SiteSnapshot {
  pages: PageInput[];
  files: SiteFiles;
}

type Sleep = (ms: number) => Promise<void>;

/** The fetcher refuses instead of sleeping; the caller decides to wait. One bounded retry on a rate-limit refusal. */
async function polite(url: string, d: FetcherDeps, sleep: Sleep) {
  let r = await fetchPage(url, d);
  const wait = !r.ok ? r.reasons.join().match(/rate limited: retry in (\d+) ms/) : null;
  if (wait) {
    await sleep(Number(wait[1]) + 50);
    r = await fetchPage(url, d);
  }
  return r;
}

const NON_HTML_EXT = /\.(pdf|png|jpe?g|gif|webp|svg|ico|zip|mp4|mp3|mov|docx?|xlsx?|pptx?|csv|json|txt|xml)$/i;

const sameHostLocs = (xml: string, host: string) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((m) => m[1]!.replace(/&amp;/g, '&'))
    .filter((u) => {
      try {
        const x = new URL(u);
        return x.protocol === 'https:' && x.host === host;
      } catch {
        return false;
      }
    });

/** Home page plus the first pages the sitemap lists, fetched one at a time with the compliant fetcher. */
export async function fetchSite(baseUrl: string, d: FetcherDeps, opts: { maxPages?: number; sleep?: Sleep } = {}): Promise<SiteSnapshot> {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const max = opts.maxPages ?? 10;
  const base = new URL(baseUrl);
  const origin = `${base.protocol}//${base.host}`;

  const robots = await polite(`${origin}/robots.txt`, d, sleep);
  const sm = await polite(`${origin}/sitemap.xml`, d, sleep);
  const files: SiteFiles = { robotsTxt: robots.ok && robots.status === 200 ? robots.text : null, sitemapXml: sm.ok && sm.status === 200 ? sm.text : null };

  const urls = [`${origin}/`];
  if (files.sitemapXml) for (const u of sameHostLocs(files.sitemapXml, base.host)) if (!urls.includes(u) && urls.length < max) urls.push(u);

  const pages: PageInput[] = [];
  for (const url of urls) {
    if (NON_HTML_EXT.test(new URL(url).pathname)) {
      pages.push({ url, html: null, skipped: 'file type is not HTML' });
      continue;
    }
    const r = await polite(url, d, sleep);
    if (r.ok && r.status >= 200 && r.status < 300 && r.contentType && !/html|xml/i.test(r.contentType)) pages.push({ url, html: null, skipped: `content type ${r.contentType}` });
    else if (r.ok && r.status >= 200 && r.status < 300) pages.push({ url, html: r.text });
    else pages.push({ url, html: null, note: r.ok ? `HTTP ${r.status}` : r.reasons.join('; ') });
  }
  return { pages, files };
}

/** Saved pages: dir/manifest.json = { pages: [{ url, file }], robots?: file, sitemap?: file }. Nothing is fetched. */
export function loadSiteFromDir(dir: string): SiteSnapshot {
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { pages: { url: string; file: string; note?: string }[]; robots?: string; sitemap?: string };
  const rd = (f: string | undefined) => {
    if (f === undefined) return undefined;
    try {
      return readFileSync(join(dir, f), 'utf8');
    } catch {
      return null;
    }
  };
  return {
    pages: m.pages.map((p) => {
      try {
        return { url: p.url, html: readFileSync(join(dir, p.file), 'utf8') };
      } catch {
        return { url: p.url, html: null, note: p.note ?? 'saved file missing' };
      }
    }),
    files: { robotsTxt: rd(m.robots), sitemapXml: rd(m.sitemap) },
  };
}
