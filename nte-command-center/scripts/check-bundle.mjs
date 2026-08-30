#!/usr/bin/env node
/**
 * Zero-external-origin scan of the BUILT output.
 *
 * scripts/check-network.mjs scans what we wrote. This scans what actually
 * ships, which is a different question: a dependency can put a request into
 * the bundle without appearing in any source file of ours.
 *
 * Two classes of finding, treated differently and on purpose:
 *
 *   - A request-capable call — fetch, XHR, sendBeacon, WebSocket, EventSource,
 *     importScripts — fails the check. No exceptions and no list.
 *   - A remote URL string. Most are inert: an XML namespace URI is an
 *     identifier the browser never dereferences, and a documentation link
 *     inside an error message is text. Those two families are named below with
 *     the reason, and anything outside them fails.
 *
 * The named families are a judgement about vendored library code, not a relief
 * valve for ours. Nothing here relaxes check-network.mjs, whose EXEMPT list is
 * unchanged from the delivered scaffold.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = 'dist'

if (!existsSync(DIST)) {
  console.error(`No ${DIST}/ to scan. Run the build first.`)
  process.exit(1)
}

const REQUESTING = [
  { re: /\bfetch\s*\(/g, what: 'fetch()' },
  { re: /XMLHttpRequest/g, what: 'XMLHttpRequest' },
  { re: /sendBeacon/g, what: 'sendBeacon' },
  { re: /new [A-Za-z_$]{0,3}WebSocket|\bWebSocket\s*\(/g, what: 'WebSocket' },
  { re: /EventSource\s*\(/g, what: 'EventSource' },
  { re: /importScripts\s*\(/g, what: 'importScripts' },
]

/**
 * Remote URL strings that are present but never dereferenced.
 * Each needs a reason, and the reason has to be about why no request happens.
 */
const INERT = [
  {
    match: (url) => url.startsWith('http://www.w3.org/'),
    why: 'XML/SVG namespace URI. Used as an identifier in createElementNS and setAttributeNS. The browser never dereferences a namespace.',
  },
  {
    match: (url) => url.startsWith('https://reactjs.org/'),
    why: "Documentation link inside React's error-decoder message. It is text in a thrown Error, not a target.",
  },
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

const failures = []
const accounted = new Map()

for (const file of walk(DIST)) {
  if (!['.js', '.jsx', '.css', '.html'].includes(extname(file))) continue
  const text = readFileSync(file, 'utf8')

  for (const p of REQUESTING) {
    p.re.lastIndex = 0
    const hits = text.match(p.re)
    if (hits) {
      failures.push(`${file}: ${hits.length} × ${p.what}`)
    }
  }

  for (const url of text.match(/https?:\/\/[a-zA-Z0-9./_-]+/g) ?? []) {
    const inert = INERT.find((i) => i.match(url))
    if (inert) {
      accounted.set(url, inert.why)
    } else {
      failures.push(`${file}: unaccounted remote URL ${url}`)
    }
  }
}

// An external origin in an HTML attribute is a request the browser makes
// before any script runs, so it is checked separately and strictly.
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
for (const attr of html.match(/(src|href)="https?:\/\/[^"]+"/g) ?? []) {
  failures.push(`dist/index.html: remote ${attr}`)
}
if (!/name="robots"\s+content="noindex/.test(html)) {
  failures.push('dist/index.html: robots noindex missing from the built page')
}

if (accounted.size > 0) {
  console.log(`Accounted-for URL strings (${accounted.size}), none dereferenced:`)
  for (const [url, why] of accounted) console.log(`  ${url}\n    ${why}`)
  console.log('')
}

if (failures.length === 0) {
  console.log('Built bundle: no request-capable call, no unaccounted origin.')
  process.exit(0)
}

console.error(`Built bundle: ${failures.length} finding(s).\n`)
for (const f of failures) console.error(`  ${f}`)
process.exit(1)
