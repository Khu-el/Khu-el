// Checks the live GitHub Pages site, not the build: the landing page, every
// app's HTML, and every script and stylesheet that HTML references must
// return 200.
//
// A green deploy job is not evidence the site works. The first live deploy
// "succeeded" while serving four blank apps -- each page returned 200 and
// every asset it named 404'd, because the apps were built for the wrong base
// path. And the deploy carrying that fix (#19) was later cancelled without the
// site changing at all. Both were found by fetching the site by hand. This is
// that fetch, run after every deploy.
//
// The app list is apps/*, because every workspace there is built and
// published by deploy-pages.yml. An app that is added to apps/ but left out of
// the workflow fails here as a 404, which is the point.
//
// Usage: node scripts/check-live-pages.mjs [base-url]
//   base-url defaults to $PAGES_URL, then https://khu-el.github.io/Khu-el/
// Env:   LIVE_CHECK_ATTEMPTS (default 1), LIVE_CHECK_DELAY_SECONDS (default 20)
//        A just-finished deploy can take a while to reach the CDN, so CI
//        retries the whole check rather than failing on the first stale read.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const base = new URL(
  process.argv[2] || process.env.PAGES_URL || 'https://khu-el.github.io/Khu-el/',
);
if (!base.pathname.endsWith('/')) base.pathname += '/';

const attempts = Math.max(1, Number(process.env.LIVE_CHECK_ATTEMPTS) || 1);
const delaySeconds = Math.max(0, Number(process.env.LIVE_CHECK_DELAY_SECONDS) || 20);

const apps = readdirSync(join(ROOT, 'apps'))
  .filter((name) => statSync(join(ROOT, 'apps', name)).isDirectory())
  .sort();

// A query string the CDN has not seen, so a cached copy of the previous
// deploy's HTML -- which names the previous deploy's asset hashes -- is not
// what gets checked.
const bust = `live-check=${Date.now()}`;

async function status(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    await res.arrayBuffer();
    return res.status;
  } catch (err) {
    return `error: ${err.cause?.code ?? err.message}`;
  }
}

function assetsIn(html, pageUrl) {
  const refs = new Set();
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+\.(?:js|css))"/g)) {
    refs.add(new URL(m[1], pageUrl).href);
  }
  return [...refs];
}

async function checkOnce() {
  const lines = [];
  let failed = 0;

  const landing = new URL(`?${bust}`, base).href;
  const landingStatus = await status(landing);
  lines.push(`${landingStatus} ${base.pathname}`);
  if (landingStatus !== 200) failed++;

  for (const app of apps) {
    const pageUrl = new URL(`${app}/`, base);
    let html = '';
    let pageStatus;
    try {
      const res = await fetch(`${pageUrl.href}?${bust}`, { redirect: 'follow' });
      pageStatus = res.status;
      html = await res.text();
    } catch (err) {
      pageStatus = `error: ${err.cause?.code ?? err.message}`;
    }
    lines.push(`${pageStatus} ${pageUrl.pathname}`);
    if (pageStatus !== 200) {
      failed++;
      continue;
    }

    const assets = assetsIn(html, pageUrl);
    if (assets.length === 0) {
      lines.push('  no script or stylesheet referenced -- the page would render blank');
      failed++;
    }
    for (const asset of assets) {
      const s = await status(asset);
      lines.push(`  ${s} ${new URL(asset).pathname}`);
      if (s !== 200) failed++;
    }
  }
  return { lines, failed };
}

for (let attempt = 1; attempt <= attempts; attempt++) {
  const { lines, failed } = await checkOnce();
  console.log(`Live check of ${base.href} (${apps.length} apps), attempt ${attempt}/${attempts}`);
  console.log(lines.join('\n'));
  if (failed === 0) {
    console.log('PASS: the landing page, every app and every asset they reference return 200.');
    process.exit(0);
  }
  console.log(`${failed} check(s) failed.`);
  if (attempt < attempts) {
    console.log(`Retrying in ${delaySeconds}s -- a fresh deploy can lag at the CDN.\n`);
    await new Promise((r) => setTimeout(r, delaySeconds * 1000));
  }
}
console.error('FAIL: the live site is not serving every app and asset.');
process.exit(1);
