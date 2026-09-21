#!/usr/bin/env node
/**
 * Public-repository scan.
 *
 * The root CLAUDE.md is explicit: this repository is public, and an account,
 * workspace or file identifier, a calendar address, or record content must
 * never be committed. `npm run bus -- audit` enforces that — but it walks only
 * the committed bus directories under `.neterverse/`, so it never reaches this
 * project. Verified by reading its source, not inferred from its description.
 *
 * So nothing was checking this project, and something needed to: seed/
 * carried a real Google Drive file identifier in a defect record. A Drive ID
 * is close to a capability — where a file is shared to anyone with the link,
 * the identifier is the credential — and the defect it documented reads
 * perfectly well without it.
 *
 * Two shapes are flagged:
 *
 *   - an opaque identifier: a long token mixing cases with digits or
 *     underscores, which is what a Drive, calendar or account id looks like
 *     and what neither English nor a document code looks like
 *   - an email address
 *
 * Document codes are the console's own vocabulary and are meant to be legible,
 * so NTE-TECH-2026-CCENTER-001 is not an identifier in this sense.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOTS = ['seed', 'src', 'scripts', 'docs', 'tests']
const FILES = ['README.md', 'CLAUDE.md', 'index.html', 'package.json']
const EXTS = new Set(['.json', '.ts', '.tsx', '.mts', '.mjs', '.md', '.css', '.html'])
const EXEMPT = ['check-public.mjs']

/**
 * A long token that mixes upper and lower case and carries a digit or an
 * underscore. Opaque identifiers look like this; prose and document codes do
 * not. Length 22 is below the shortest Drive file id and above any English
 * word or hyphenated code in this tree.
 */
const OPAQUE = /\b(?=[A-Za-z0-9_-]{22,}\b)(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[0-9_])[A-Za-z0-9_-]+\b/g
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (EXTS.has(extname(path))) out.push(path)
  }
  return out
}

const targets = [...ROOTS.flatMap((r) => walk(r)), ...FILES]
const findings = []

for (const file of targets) {
  if (EXEMPT.some((e) => file.endsWith(e))) continue
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  text.split('\n').forEach((line, i) => {
    for (const token of line.match(OPAQUE) ?? []) {
      findings.push({ file, line: i + 1, what: `opaque identifier ${token}` })
    }
    for (const address of line.match(EMAIL) ?? []) {
      findings.push({ file, line: i + 1, what: `email address ${address}` })
    }
  })
}

if (findings.length === 0) {
  console.log(
    `Public-repo scan: no identifier or address across ${targets.length} files.`,
  )
  process.exit(0)
}

console.error(`Public-repo scan: ${findings.length} finding(s).\n`)
for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.what}`)
console.error(
  '\nThis repository is public. Hold the value outside it and reference it by a label.',
)
process.exit(1)
