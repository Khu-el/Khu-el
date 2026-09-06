/**
 * Lane guard — the firewall, made mechanical.
 *
 * Lane A and Lane B may never share an instrument. The licensed practice is
 * separately firewalled and carries no enterprise vocabulary. These are
 * structural rules, not branding preferences, so they are enforced in code
 * rather than left to discipline.
 *
 * Used two ways:
 *   1. At runtime, `guardText` on any string bound for a surface.
 *   2. At build time, `scanSource` via `npm run check:lanes`.
 */

import type { Surface } from './types'

/** Terms that must never reach the licensed-practice surface. */
export const ENTERPRISE_TERMS = [
  'NTE',
  'Neterverse',
  'CCRLT',
  'EDM',
  'trustee',
  'ministry',
  'Private Administrator',
  'Sui Generis',
  'PMA',
  'Event ID',
  'Release Gate',
  'House of Ransom',
  'GodMode',
  'Lane A',
  'Lane B',
  'lane',
] as const

/** Terms that must never reach the enterprise surfaces. */
export const PRACTICE_TERMS = [
  'Primerica',
  'H.O.P.E. Dealers',
  'Agent Growth Series',
] as const

/** Terms that must never reach any outward-facing label anywhere. */
export const OUTWARD_FACING_BLOCKED = [
  // O.C.G.A. 20-3-250.7(b): "University" cannot be used publicly in Georgia
  // without commission authorization. Internal views may say it; anything a
  // prospect or student sees says Academy.
  'University',
] as const

export interface GuardResult {
  ok: boolean
  blocked: string[]
}

/**
 * Terms are names and acronyms, so they match on word boundaries rather than
 * as bare substrings — otherwise "NTE" fires inside "interface" and
 * "documented", and "lane" fires inside "plane". The boundary is alphanumeric
 * rather than \b so a document code like NTE-GOV-2026-001 still matches on
 * the hyphen, and a term carrying dots still matches at all.
 *
 * This is the same rule scripts/check-lanes.mjs applies. The two have to
 * agree, or the build-time scan and the runtime guard disagree about what a
 * breach is. See docs/SPEC-CHANGES.md SC-04.
 */
export function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi')
}

function findTerms(text: string, terms: readonly string[]): string[] {
  return terms.filter((t) => termPattern(t).test(text))
}

/**
 * Check a string against the firewall for a given surface.
 * `outwardFacing` tightens the check for anything a third party will read.
 */
export function guardText(
  text: string,
  surface: Surface,
  outwardFacing = false,
): GuardResult {
  const blocked: string[] = []

  if (surface === 'practice') {
    blocked.push(...findTerms(text, ENTERPRISE_TERMS))
  } else {
    blocked.push(...findTerms(text, PRACTICE_TERMS))
  }

  if (outwardFacing) {
    blocked.push(...findTerms(text, OUTWARD_FACING_BLOCKED))
  }

  return { ok: blocked.length === 0, blocked }
}

/**
 * Throwing variant for development. In production the guard degrades to
 * redaction rather than a crash — a console that will not render is worse
 * than one that renders with a visible redaction mark.
 */
export function assertLane(
  text: string,
  surface: Surface,
  context: string,
  outwardFacing = false,
): string {
  const result = guardText(text, surface, outwardFacing)
  if (result.ok) return text

  if (import.meta.env.DEV) {
    throw new Error(
      `Lane firewall breach in ${context} on surface ${surface}: ` +
        `blocked terms [${result.blocked.join(', ')}]`,
    )
  }

  let redacted = text
  for (const term of result.blocked) {
    redacted = redacted.replace(termPattern(term), '[redacted]')
  }
  return redacted
}

/**
 * A module may only mount on a surface it declares. Enforced at render, not
 * only at routing, so a direct import cannot smuggle a module across.
 */
export function assertSurface(
  moduleId: string,
  declared: Surface[],
  actual: Surface,
): void {
  if (!declared.includes(actual)) {
    throw new Error(
      `Module ${moduleId} is not permitted on surface ${actual}. ` +
        `Declared: ${declared.join(', ')}.`,
    )
  }
}

// ── Build-time scan (used by scripts/check-lanes.mjs) ──────────────────────

export interface SourceViolation {
  file: string
  line: number
  term: string
  text: string
}

/**
 * Does this path belong to the practice surface?
 *
 * Any path component that names it counts — `surfaces/practice/`,
 * `modules/practice-desk/`, `practice-instance.tsx`,
 * `marketing-practice.json`. Matching only a leading `/practice-` left a
 * practice-surface seed file unscanned. See docs/SPEC-CHANGES.md SC-05.
 *
 * scripts/check-lanes.mjs applies the identical rule; the two have to agree.
 */
export function isPracticePath(file: string): boolean {
  return file
    .split('/')
    .some((part) => part.toLowerCase().includes('practice'))
}

/**
 * Scan source text for terms that must not appear given the directory the file
 * lives in. Directory decides surface.
 */
export function scanSource(
  file: string,
  contents: string,
): SourceViolation[] {
  const terms = isPracticePath(file) ? ENTERPRISE_TERMS : PRACTICE_TERMS

  const violations: SourceViolation[] = []
  contents.split('\n').forEach((text, i) => {
    // Comments and the guard module itself are exempt — they have to name the
    // terms in order to block them.
    if (text.trimStart().startsWith('//')) return
    if (file.endsWith('lane-guard.ts')) return

    for (const term of terms) {
      if (termPattern(term).test(text)) {
        violations.push({ file, line: i + 1, term, text: text.trim() })
      }
    }
  })
  return violations
}
