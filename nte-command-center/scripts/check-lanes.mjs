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
// One copy of the term lists, the matcher and the practice-path rule, shared
// with src/core/lane-guard.ts. This script used to restate all three, and its
// ENTERPRISE list was missing PMA, Lane A, Lane B and lane — so those four
// reported "clear." here and were blocked at render. See SC-07.
import {
  ENTERPRISE_TERMS,
  PRACTICE_TERMS,
  isPracticePath,
  termPattern,
} from '../src/core/firewall-terms.mjs'

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
  const isPractice = isPracticePath(file)
  const terms = isPractice ? ENTERPRISE_TERMS : PRACTICE_TERMS
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((text, i) => {
    // Comments are exempt everywhere except the practice surface, where the
    // rule is that the vocabulary does not exist in the file at all —
    // comments reach the bundle, and a term in a comment is still a term.
    const trimmed = text.trimStart()
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*')
    if (isComment && !isPractice) return
    for (const term of terms) {
      if (termPattern(term).test(text)) {
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
