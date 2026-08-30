#!/usr/bin/env node
/**
 * Firewall scan. Run before every commit; wired into `npm run build`.
 *
 * Directory decides surface. Anything under surfaces/practice/ or in a
 * module directory prefixed practice- must contain no enterprise vocabulary;
 * everything else must contain no practice vocabulary.
 *
 * This is a blunt string scan on purpose. A clever scanner that understands
 * context is a scanner that can be argued with.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ENTERPRISE = [
  'NTE', 'Neterverse', 'CCRLT', 'EDM', 'trustee', 'ministry',
  'Private Administrator', 'Sui Generis', 'Event ID', 'Release Gate',
  'House of Ransom', 'GodMode',
]
const PRACTICE = ['Primerica', 'H.O.P.E. Dealers', 'Agent Growth Series']

const EXEMPT = ['lane-guard.ts', 'check-lanes.mjs', 'CLAUDE.md']
const EXTS = new Set(['.ts', '.tsx', '.json', '.css', '.html'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (EXTS.has(extname(path))) out.push(path)
  }
  return out
}

const violations = []
for (const file of walk('.')) {
  if (EXEMPT.some((e) => file.endsWith(e))) continue
  const isPractice =
    file.includes('/surfaces/practice/') || file.includes('/practice-')
  const terms = isPractice ? ENTERPRISE : PRACTICE
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((text, i) => {
    if (text.trimStart().startsWith('//') || text.trimStart().startsWith('*')) return
    for (const term of terms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        violations.push({ file, line: i + 1, term, text: text.trim() })
      }
    }
  })
}

if (violations.length === 0) {
  console.log('Lane firewall: clear.')
  process.exit(0)
}

console.error(`Lane firewall: ${violations.length} breach(es).\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  "${v.term}"`)
  console.error(`    ${v.text}\n`)
}
console.error('A firewall breach is not a lint warning. Fix it, do not suppress it.')
process.exit(1)
