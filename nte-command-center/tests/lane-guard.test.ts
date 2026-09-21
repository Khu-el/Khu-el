/**
 * The firewall matcher.
 *
 * This file is allowed to write blocked terms out in full, because a scanner
 * you cannot test is a scanner you are trusting on faith. It deliberately does
 * not live under a practice- path, where the rule is that the vocabulary does
 * not appear in the file at all.
 *
 * Both directions matter. A matcher that never fires is decoration; a matcher
 * that fires on "interface" gets suppressed within a week.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ENTERPRISE_TERMS,
  OUTWARD_FACING_BLOCKED,
  PRACTICE_TERMS,
  guardText,
  termPattern,
} from '../src/core/lane-guard'

describe('every blocked term still fires on a real use', () => {
  it('fires on the enterprise vocabulary at the practice surface', () => {
    for (const term of ENTERPRISE_TERMS) {
      expect(
        guardText(`a sentence mentioning ${term} in passing`, 'practice').ok,
        term,
      ).toBe(false)
    }
  })

  it('fires inside a document code, where the boundary is a hyphen', () => {
    const result = guardText('NTE-GOV-2026-MASTERPLAY-001', 'practice')
    expect(result.ok).toBe(false)
    expect(result.blocked).toContain('NTE')
  })

  it('fires on a term carrying dots', () => {
    for (const term of PRACTICE_TERMS) {
      expect(guardText(`we use ${term} for this`, 'lane-a').ok, term).toBe(false)
    }
  })

  it('fires on the outward-facing term only when outward-facing', () => {
    for (const term of OUTWARD_FACING_BLOCKED) {
      expect(guardText(`the ${term} catalog`, 'lane-a', true).ok).toBe(false)
      expect(guardText(`the ${term} catalog`, 'lane-a', false).ok).toBe(true)
    }
  })

  it('is case-insensitive', () => {
    expect(guardText('nte', 'practice').ok).toBe(false)
    expect(guardText('HOUSE OF RANSOM', 'practice').ok).toBe(false)
  })
})

describe('no blocked term fires on an ordinary word that contains it', () => {
  const innocent = [
    'interface',
    'documented contacts',
    'content calendar',
    'counted twice',
    'intention',
    'the plane landed',
    'planetary',
    'a clean slate',
    'entered',
    'presentation',
  ]

  it('leaves them alone at the practice surface', () => {
    for (const text of innocent) {
      expect(guardText(text, 'practice'), text).toEqual({ ok: true, blocked: [] })
    }
  })

  it('leaves them alone at the enterprise surfaces', () => {
    for (const text of innocent) {
      for (const surface of ['lane-a', 'lane-b'] as const) {
        expect(guardText(text, surface).ok, `${text} @ ${surface}`).toBe(true)
      }
    }
  })
})

describe('the two halves of the firewall agree', () => {
  it('uses one pattern for the runtime guard and the build scan', () => {
    // scripts/check-lanes.mjs builds the same expression. If these ever
    // diverge, a breach passes the build and fails at runtime, or the reverse.
    expect(termPattern('NTE').source).toBe(
      '(?<![A-Za-z0-9])NTE(?![A-Za-z0-9])',
    )
    // A term-shaped input rather than a real blocked term: this file is
    // scanned too, and the assertion is about escaping dots, not about which
    // term carries them.
    expect(termPattern('A.B.C. Partners').source).toBe(
      '(?<![A-Za-z0-9])A\\.B\\.C\\. Partners(?![A-Za-z0-9])',
    )
  })

  it('is stateless between calls despite the global flag', () => {
    // A /g regex carries lastIndex. Reusing one instance across calls makes
    // the second call skip the start of the string, which is exactly how a
    // scanner starts missing every other breach.
    for (let i = 0; i < 3; i++) {
      expect(guardText('NTE', 'practice').ok).toBe(false)
    }
  })
})

describe('the build scan and the runtime guard cannot diverge', () => {
  it('shares one copy of every term list', async () => {
    // The script used to restate these. Its ENTERPRISE list omitted PMA,
    // Lane A, Lane B and lane, so a practice-path file containing any of the
    // four reported "Lane firewall: clear." and was then blocked at render.
    const shared = await import('../src/core/firewall-terms.mjs')
    expect([...shared.ENTERPRISE_TERMS]).toEqual([...ENTERPRISE_TERMS])
    expect([...shared.PRACTICE_TERMS]).toEqual([...PRACTICE_TERMS])
    expect([...shared.OUTWARD_FACING_BLOCKED]).toEqual([...OUTWARD_FACING_BLOCKED])
  })

  it('carries the four terms the script was missing', () => {
    for (const term of ['PMA', 'Lane A', 'Lane B', 'lane']) {
      expect(ENTERPRISE_TERMS, term).toContain(term)
      expect(guardText(`a sentence naming ${term} plainly`, 'practice').ok).toBe(false)
    }
  })

  it('reads the term lists from a file the scan does not scan', () => {
    // A terms list in .ts/.tsx/.json/.css/.html would flag itself and need an
    // EXEMPT entry. Neither guard script's EXEMPT list has been touched.
    const script = readFileSync('scripts/check-lanes.mjs', 'utf8')
    expect(script).toContain("from '../src/core/firewall-terms.mjs'")
    expect(script).toContain(
      "const EXEMPT = ['lane-guard.ts', 'check-lanes.mjs', 'CLAUDE.md']",
    )
    // And the script no longer restates the lists or the matcher.
    expect(script).not.toMatch(/const ENTERPRISE = \[/)
    expect(script).not.toMatch(/function matches\(/)
  })
})

describe('the lane term matches prose, not this repo’s own identifiers', () => {
  it('leaves the surface identifiers and the guard filename alone', () => {
    for (const identifier of [
      "['lane-a', 'lane-b']",
      "from '../src/core/lane-guard'",
      'tests/lane-guard.test.ts',
      'surfaces/lane-b/',
    ]) {
      expect(guardText(identifier, 'practice').blocked, identifier).not.toContain('lane')
    }
  })

  it('still fires on the word, and on the prose spellings', () => {
    for (const prose of [
      'switches lane without saying so',
      'the lane rule',
      'lane.',
      'one lane, two consoles',
    ]) {
      expect(guardText(prose, 'practice').blocked, prose).toContain('lane')
    }
    expect(guardText('Lane A', 'practice').ok).toBe(false)
    expect(guardText('Lane B', 'practice').ok).toBe(false)
  })

  it('narrows only the three identifiers that exist here', () => {
    // lane-c is not one of ours, so it is prose as far as the guard knows.
    expect(guardText('lane-c', 'practice').blocked).toContain('lane')
    expect(guardText('lane-guardian', 'practice').blocked).toContain('lane')
  })
})
