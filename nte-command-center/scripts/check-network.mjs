#!/usr/bin/env node
/**
 * Zero-external-origin scan.
 *
 * The console has to work with the network off and must not leak a single
 * request. Anything that could reach an outside origin is a failure, including
 * a CDN font, an analytics beacon, or a remote image.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const PATTERNS = [
  { re: /https?:\/\/(?!localhost|127\.0\.0\.1)/g, what: 'remote URL' },
  { re: /\bfetch\s*\(/g, what: 'fetch()' },
  { re: /XMLHttpRequest/g, what: 'XMLHttpRequest' },
  { re: /navigator\.sendBeacon/g, what: 'sendBeacon' },
  { re: /new\s+WebSocket/g, what: 'WebSocket' },
  { re: /new\s+EventSource/g, what: 'EventSource' },
  { re: /@import\s+url\(/g, what: 'CSS remote import' },
]

const EXTS = new Set(['.ts', '.tsx', '.css', '.html'])
const EXEMPT = ['check-network.mjs']

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (EXTS.has(extname(path))) out.push(path)
  }
  return out
}

const findings = []
for (const file of walk('.')) {
  if (EXEMPT.some((e) => file.endsWith(e))) continue
  readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    if (text.trimStart().startsWith('*') || text.trimStart().startsWith('//')) return
    for (const p of PATTERNS) {
      p.re.lastIndex = 0
      if (p.re.test(text)) findings.push({ file, line: i + 1, what: p.what, text: text.trim() })
    }
  })
}

if (findings.length === 0) {
  console.log('External origins: none. Runs offline.')
  process.exit(0)
}

console.error(`External origins: ${findings.length} finding(s).\n`)
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.what}`)
  console.error(`    ${f.text}\n`)
}
process.exit(1)
