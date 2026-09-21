/**
 * Modules 01 and 10 acceptance — the two reference modules.
 *
 * Their boxes were never written as checks. The build order says not to mark a
 * box passed on inspection, and that applies to the modules that arrived built
 * as much as to the nine that did not.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import governance from '../src/modules/gov-infrastructure'
import compliance from '../src/modules/compliance-cp'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import { canClear } from '../src/core/types'
import govSeed from '../seed/governance.json'
import cpSeed from '../seed/compliance.json'
import { render, click, typeInto, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const status = freezeStatus(weekWith(0))
const gov = () =>
  render(<ModuleBody module={governance} surface="lane-a" status={status} />)
const cp = () =>
  render(<ModuleBody module={compliance} surface="lane-a" status={status} />)

// ── Module 01 ─────────────────────────────────────────────────────────────

describe('01 · no entity renders without a name status', () => {
  it('holds one on every entity in the seed', () => {
    expect(govSeed.entities.length).toBe(9)
    for (const e of govSeed.entities) {
      expect(['CONFIRMED', 'PROVISIONAL'], e.code).toContain(e.nameStatus)
    }
  })

  it('renders one on every entity row', () => {
    const v = gov()
    for (const e of govSeed.entities) {
      const row = Array.from(v.container.querySelectorAll('.record')).find((r) =>
        (r.textContent ?? '').startsWith(e.code),
      )!
      expect(row, e.code).toBeTruthy()
      expect(row.textContent).toContain(e.nameStatus)
    }
    v.unmount()
  })
})

describe('01 · the excluded register cannot be edited or dismissed', () => {
  it('renders all twelve with no control of any kind', () => {
    const v = gov()
    const panel = Array.from(v.container.querySelectorAll('.panel')).find((p) =>
      (p.textContent ?? '').includes('Excluded register'),
    )!
    expect(govSeed.exclusions.length).toBe(12)
    for (const x of govSeed.exclusions) {
      expect(panel.textContent).toContain(x.id)
    }
    expect(panel.querySelector('button')).toBe(null)
    expect(panel.querySelector('input, textarea, select')).toBe(null)
    expect(panel.querySelector('[contenteditable]')).toBe(null)
    v.unmount()
  })
})

describe('01 · the supersession ledger has no edit or delete affordance', () => {
  it('renders C-01 through C-07 read only', () => {
    const v = gov()
    const panel = Array.from(v.container.querySelectorAll('.panel')).find((p) =>
      (p.textContent ?? '').includes('Supersession'),
    )!
    for (const e of govSeed.supersession) expect(panel.textContent).toContain(e.id)
    expect(panel.querySelector('button')).toBe(null)
    expect(panel.querySelector('input, textarea, select')).toBe(null)
    v.unmount()
  })
})

describe('01 · the head licence is a prerequisite, not a peer', () => {
  it('renders one head above seven indented sublicences', () => {
    const v = gov()
    const panel = Array.from(v.container.querySelectorAll('.panel')).find((p) =>
      (p.textContent ?? '').includes('Licence chain'),
    )!
    const head = govSeed.licences.filter((l) => l.prerequisite === null)
    const subs = govSeed.licences.filter((l) => l.prerequisite !== null)
    expect(head.length).toBe(1)
    expect(subs.length).toBe(7)

    // The head carries the prerequisite marker; a flat list of eight would not.
    expect(panel.textContent).toContain('Head licence')
    expect(panel.textContent).toContain('PREREQUISITE')

    const rows = Array.from(panel.querySelectorAll('.record'))
    const headRow = rows.find((r) => (r.textContent ?? '').includes('PREREQUISITE'))!
    for (const sub of subs) {
      const row = rows.find((r) => (r.textContent ?? '').startsWith(sub.id))!
      expect(row, sub.id).toBeTruthy()
      // Every sublicence sits inside the indented group, not beside the head.
      expect(headRow.contains(row)).toBe(false)
      expect(rows.indexOf(row)).toBeGreaterThan(rows.indexOf(headRow))
    }
    // And every sublicence names the head as its prerequisite.
    for (const sub of subs) expect(sub.prerequisite).toBe(head[0]!.id)
    v.unmount()
  })
})

// ── Module 10 ─────────────────────────────────────────────────────────────

describe('10 · every condition row shows its alias set', () => {
  it('renders aliases inline, and says so where a row has none', () => {
    const v = cp()
    for (const c of cpSeed.conditions) {
      const rows = Array.from(v.container.querySelectorAll('.record')).filter(
        (r) => (r.textContent ?? '').startsWith(c.id),
      )
      expect(rows.length, c.id).toBeGreaterThan(0)
      for (const row of rows) {
        if (c.aliases.length > 0) {
          for (const alias of c.aliases) expect(row.textContent).toContain(alias)
        } else {
          // Silence would read as "no alias recorded", which is a different
          // claim from "no alias exists".
          expect(row.textContent).toContain('no alias in the other three systems')
        }
      }
    }
    v.unmount()
  })
})

describe('10 · clear is disabled until a proof source is entered', () => {
  it('refuses at the type level and at the control', () => {
    for (const c of cpSeed.conditions) {
      expect(canClear(c as never), c.id).toBe(false)
    }

    const v = cp()
    const row = Array.from(v.container.querySelectorAll('.record')).find((r) =>
      (r.textContent ?? '').startsWith('Q-01'),
    )!
    click(
      Array.from(row.querySelectorAll('button')).find(
        (b) => b.textContent === 'Record proof',
      )!,
    )
    const submit = () =>
      Array.from(
        v.container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent === 'Clear condition')!

    expect(submit().hasAttribute('disabled')).toBe(true)

    const inputs = v.container.querySelectorAll<HTMLInputElement>('input')
    typeInto(inputs[0]!, 'Written response')
    expect(submit().hasAttribute('disabled')).toBe(true)
    typeInto(inputs[1]!, 'REF-1')
    expect(submit().hasAttribute('disabled')).toBe(true)
    typeInto(inputs[2]!, 'Operator')
    expect(submit().hasAttribute('disabled')).toBe(false)
    v.unmount()
  })
})

describe('10 · the critical set is labelled by type and none is build work', () => {
  it('types every declared name and flags none as build', () => {
    const set = cpSeed.criticalSet
    expect(set.declared.length).toBe(7)
    expect(set.resolution.length).toBe(7)
    for (const r of set.resolution) {
      expect(['administrative', 'drafting', 'review'], r.name).toContain(r.type)
      expect(r.type).not.toBe('build')
    }
    expect(set.buildWorkCount).toBe(0)

    // And no condition anywhere in the register is typed build work.
    for (const c of cpSeed.conditions) {
      expect(c.type, c.id).not.toBe('build')
    }
  })

  it('renders the declared-versus-resolved discrepancy rather than hiding it', () => {
    const v = cp()
    expect(v.text).toContain('7 declared names · 6 distinct conditions')
    expect(v.text).toContain('8 flagged critical in the register')
    expect(v.text).toContain('CP-2 and R-02 both resolve to Q-01')
    expect(v.text).toContain('R-02 names both a condition alias and a remediation row')
    expect(v.text).toContain('Rendered, not reconciled')
    v.unmount()
  })

  it('does not silently pick a resolution', () => {
    // Every discrepancy is stated; none is resolved in the data.
    expect(cpSeed.criticalSet.discrepancies.length).toBe(4)
    expect(cpSeed.criticalSet.note).toContain('not reconciled')
  })
})

describe('10 · neither module locks under the freeze', () => {
  it('stays open at zero contacts — governance and conditions are never build work', () => {
    expect(governance.buildWork).toBe(false)
    expect(compliance.buildWork).toBe(false)
    for (const view of [gov(), cp()]) {
      expect(view.text).not.toContain('Build freeze')
      view.unmount()
    }
  })
})
