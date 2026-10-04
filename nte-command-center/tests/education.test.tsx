/**
 * Module 03 acceptance, including the naming rule the state imposes.
 */
import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import education from '../src/modules/education-nvu'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { save, setSurface } from '../src/core/storage'
import { OUTWARD_FACING_BLOCKED, termPattern } from '../src/core/lane-guard'
import seed from '../seed/education.json'
import { render, click, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const open = freezeStatus(weekWith(40))
const view = () =>
  render(<ModuleBody module={education} surface="lane-a" status={open} />)

describe('outward-facing labels', () => {
  it('say Academy', () => {
    const v = view()
    const outward = Array.from(
      v.container.querySelectorAll('[data-outward="true"]'),
    )
    expect(outward.length).toBeGreaterThan(12)
    expect(outward.map((n) => n.textContent)).toContain('Academy')
    v.unmount()
  })

  it('carry no reserved term — this is the lint rule the spec asks for', () => {
    const v = view()
    for (const node of Array.from(
      v.container.querySelectorAll('[data-outward="true"]'),
    )) {
      for (const term of OUTWARD_FACING_BLOCKED) {
        expect(
          termPattern(term).test(node.textContent ?? ''),
          `"${term}" reached an outward-facing label: ${node.textContent}`,
        ).toBe(false)
      }
    }
    v.unmount()
  })

  it('refuses one at render rather than shipping it', () => {
    const bad = structuredClone(seed) as unknown as Record<string, unknown>
    ;(bad as { outwardName: string }).outwardName = 'Neterverse University'
    save('education-nvu', bad)
    // assertLane throws in DEV, which is where tests run. A reserved term in
    // an outward string is a build failure, not a warning. React logs a
    // component stack alongside the throw; the throw is the assertion.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => view()).toThrow(/University/)
    } finally {
      quiet.mockRestore()
    }
  })

  it('leaves internal vocabulary alone', () => {
    // The rule is about what a student or prospect reads, not about the
    // module's own name for itself.
    expect(seed.internalName).toBe('Education')
    expect(seed.outwardName).toBe('Academy')
  })
})

describe('the AUTHORED provenance flag', () => {
  it('renders on all six adoptions', () => {
    const authored = seed.courses.filter((c) => c.authored)
    expect(authored.length).toBe(6)
    const v = view()
    expect(
      v.container.querySelectorAll('[data-permanent="authored"]').length,
    ).toBe(6)
    expect(v.text).toContain('not recovered prior work')
    v.unmount()
  })

  it('has no dismiss control anywhere near it', () => {
    const v = view()
    for (const flag of Array.from(
      v.container.querySelectorAll('[data-permanent="authored"]'),
    )) {
      expect(flag.querySelector('button')).toBe(null)
      const row = flag.closest('.record')!
      const labels = Array.from(row.querySelectorAll('button')).map((b) =>
        (b.textContent ?? '').toLowerCase(),
      )
      for (const word of ['dismiss', 'hide', 'clear', 'remove', 'acknowledge']) {
        expect(labels.some((l) => l.includes(word))).toBe(false)
      }
    }
    v.unmount()
  })

  it('survives a filter change — there is no state without it', () => {
    const v = view()
    const built = Array.from(v.container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').startsWith('BUILT'),
    )!
    click(built)
    expect(
      v.container.querySelectorAll('[data-permanent="authored"]').length,
    ).toBe(6)
    v.unmount()
  })
})

describe('EVOP-201', () => {
  it('renders INOPERABLE with its dependency named', () => {
    const v = view()
    const row = Array.from(v.container.querySelectorAll('.record')).find((r) =>
      (r.textContent ?? '').includes('EVOP-201'),
    )!
    expect(row.textContent).toContain('INOPERABLE')
    expect(row.textContent).toContain('40-document practice file')
    expect(row.textContent).toContain('not built')
    v.unmount()
  })

  it('flags its status as an assumption of this console, not a sourced fact', () => {
    const row = seed.courses.find((c) => c.code === 'EVOP-201')!
    expect(row.statusAssumed).toBe(true)
    const v = view()
    expect(v.text).toContain('Status is an assumption of this console')
    v.unmount()
  })
})

describe('empty houses', () => {
  it('name the waiting specs as rows rather than a generic empty state', () => {
    // The seed does not know which four houses are empty, so the mechanism is
    // exercised against a house that does.
    const data = structuredClone(seed) as unknown as {
      houses: { numeral: string; builtCount: number | null }[]
      courses: { id: string; code: string | null; house: string | null; productionReady?: boolean }[]
    }
    data.houses[5]!.builtCount = 0
    const specs = data.courses.filter((c) => c.productionReady).slice(0, 3)
    for (const [i, s] of specs.entries()) {
      s.house = 'VI'
      s.code = `SPEC-${i + 1}`
    }
    save('education-nvu', data)

    const v = view()
    const row = Array.from(v.container.querySelectorAll('.record')).find((r) =>
      (r.textContent ?? '').includes('Nothing built in Hapi'),
    )!
    expect(row).toBeTruthy()
    expect(row.querySelectorAll('li').length).toBe(3)
    expect(row.textContent).toContain('SPEC-1')
    expect(row.textContent).toContain('SPEC-3')
    expect(row.textContent).not.toContain('nothing here')
    v.unmount()
  })

  it('lists the thirteen waiting specs when no house is known to be empty', () => {
    const v = view()
    expect(seed.courses.filter((c) => c.productionReady).length).toBe(13)
    expect(v.text).toContain(
      '4 houses have nothing built in them and 13 production-ready specs are waiting',
    )
    v.unmount()
  })
})

describe('the sourced counts', () => {
  it('holds 83 entries in the declared distribution', () => {
    expect(seed.courses.length).toBe(83)
    const counts: Record<string, number> = {}
    for (const c of seed.courses) counts[c.status] = (counts[c.status] ?? 0) + 1
    expect(counts).toEqual({ BUILT: 30, PARTIAL: 1, SPECIFIED: 49, PLANNED: 3 })
  })

  it('reconciles the deliverable gap and its type breakdown', () => {
    const d = seed.deliverables
    expect(d.filled + d.open).toBe(d.slots)
    expect(d.byType.reduce((s, t) => s + t.open, 0)).toBe(d.open)
    // 248 slots is eight against each BUILT or PARTIAL entry.
    expect((30 + 1) * d.slotsPerCourse).toBe(d.slots)
  })

  it('names all twelve houses', () => {
    expect(seed.houses.map((h) => h.name)).toEqual([
      "Ma'at", 'Auset', 'Ptah', 'Djehuti', 'Heru', 'Hapi',
      'Sekhmet', 'Amun', 'Seshat', 'Hu', 'Sia', 'Khepera',
    ])
  })
})

describe('the doctrine screen', () => {
  it('does not read an unrun screen as a clean result', () => {
    expect(seed.doctrineScreen.run).toBe(false)
    const v = view()
    expect(v.text).toContain('Screen not run')
    expect(v.text).toContain('An empty flagged list is not a clean result')
    v.unmount()
  })
})
