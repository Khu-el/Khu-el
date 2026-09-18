/**
 * The blocked-term lists. One copy, imported by both halves of the firewall.
 *
 * This file exists because the two halves had diverged. scripts/check-lanes.mjs
 * carried its own ENTERPRISE array that omitted PMA, Lane A, Lane B and lane,
 * so a practice-surface file containing any of those four reported
 * "Lane firewall: clear." at build time and was then blocked by guardText at
 * render. docs/SPEC-CHANGES.md SC-04 claimed both halves applied the same rule,
 * which was true of the matcher and false of the term lists. A firewall with a
 * false negative is worse than no firewall: it answers the question.
 *
 * It is .mjs rather than .ts or .json deliberately. The build scan reads
 * .ts/.tsx/.json/.css/.html, so a terms list in any of those extensions would
 * flag itself and need an EXEMPT entry. Neither guard script's EXEMPT list has
 * been touched; both are identical to the delivered scaffold.
 */

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
]

/** Terms that must never reach the enterprise surfaces. */
export const PRACTICE_TERMS = [
  'Primerica',
  'H.O.P.E. Dealers',
  'Agent Growth Series',
]

/**
 * Terms that must never reach any outward-facing label anywhere.
 *
 * O.C.G.A. 20-3-250.7(b): "University" cannot be used publicly in Georgia
 * without commission authorization. Internal views may say it; anything a
 * prospect or student sees says Academy.
 */
export const OUTWARD_FACING_BLOCKED = ['University']

/**
 * Code identifiers that contain a blocked term but are not an occurrence of it.
 *
 * `lane` is a blocked word on the practice surface, and it is also the stem of
 * this codebase's own surface identifiers. `Surface` in src/core/types.ts is
 * the union 'lane-a' | 'lane-b' | 'practice', and the guard itself lives in
 * lane-guard.ts. A practice-path test that asserts "this module does not appear
 * on lane-a" has to name the surface to assert it.
 *
 * So the term matches prose and not these three identifiers. This is a
 * narrowing of what counts as an occurrence, not an exemption for a file: the
 * word still fires anywhere it is used as a word, and the separate terms
 * `Lane A` and `Lane B` — the prose spellings — are untouched. Keep this list
 * to identifiers that exist in this repository; it is not a place to park a
 * phrase somebody wants to keep.
 */
const CODE_IDENTIFIERS = {
  lane: ['a', 'b', 'guard'],
}

/**
 * Build the matcher for one term.
 *
 * Word boundaries, not bare substrings: the terms are names and acronyms, and a
 * substring scan fires on "interface", "documented", "content" and "plane". The
 * boundary is alphanumeric rather than \b so a document code still matches on
 * its hyphen and a term carrying dots still matches at all.
 *
 * Returns a fresh RegExp every call. A /g expression carries lastIndex, and a
 * shared instance makes the scanner skip the start of every other string.
 */
export function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const identifiers = CODE_IDENTIFIERS[term.toLowerCase()]
  const notIdentifier = identifiers
    ? `(?!-(?:${identifiers.join('|')})(?![A-Za-z0-9]))`
    : ''
  return new RegExp(
    `(?<![A-Za-z0-9])${escaped}${notIdentifier}(?![A-Za-z0-9])`,
    'gi',
  )
}

/** Does this path belong to the practice surface? Any component naming it. */
export function isPracticePath(file) {
  return file.split('/').some((part) => part.toLowerCase().includes('practice'))
}
