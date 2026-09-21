/**
 * Module 02 acceptance, plus module 10's changes ledger.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import ventures from '../src/modules/ventures-revenue'
import compliance from '../src/modules/compliance-cp'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import {
  governing,
  rollUp,
  tranchesReconcile,
  type Projection,
} from '../src/modules/ventures-revenue/rollup'
import seed from '../seed/ventures.json'
import { render, click, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const open = freezeStatus(weekWith(40))
const frozen = freezeStatus(weekWith(0))

const view = () =>
  render(<ModuleBody module={ventures} surface="lane-a" status={open} />)

describe('base-case figures match the model exactly', () => {
  it('renders the four figures the acceptance names', () => {
    const v = view()
    expect(v.text).toContain('USD 260,351')
    expect(v.text).toContain('USD 238,861')
    expect(v.text).toContain('USD 142,221')
    // Q1 is negative and renders in parentheses, as a result does.
    expect(v.text).toContain('(USD 10,813)')
    v.unmount()
  })

  it('carries a scenario label on every projection', () => {
    for (const p of seed.projections) {
      expect(['conservative', 'base', 'aggressive']).toContain(p.scenario)
    }
    const v = view()
    const rows = Array.from(v.container.querySelectorAll('.record')).filter(
      (r) => (r.textContent ?? '').includes('MODEL-TOP5-001'),
    )
    const projectionRows = rows.filter((r) =>
      (r.textContent ?? '').includes('scenario:'),
    )
    expect(projectionRows.length).toBe(seed.projections.length)
    v.unmount()
  })

  it('shows no figure under a scenario it does not hold', () => {
    const v = view()
    expect(v.text).toContain('Conservative · UNKNOWN')
    expect(v.text).toContain('Aggressive · UNKNOWN')
    v.unmount()
  })
})

describe('the placeholder is flagged and never enters a total', () => {
  it('flags the 600 average case value as not a real figure', () => {
    const v = view()
    expect(v.text).toContain('B1 · Average case value · 600')
    expect(v.text).toContain('unverified, not a real figure')
    v.unmount()
  })

  it('excludes it from the roll-up and names the exclusion', () => {
    const v = view()
    expect(v.text).toContain('MODEL-TOP5-001:B1 (600) — unverified')
    // The roll-up is the sum of the four verified base-case figures and
    // nothing else. 600 nowhere in it.
    const expected = 260351 + 238861 + 142221 - 10813
    expect(v.text).toContain(
      `USD ${expected.toLocaleString('en-US')}`,
    )
    expect(expected + 600).not.toBe(expected)
    v.unmount()
  })

  it('excludes it at the rule, not at the call site', () => {
    const placeholder: Projection = {
      id: 'p',
      label: 'placeholder',
      scenario: 'base',
      modelValue: 600,
      planValue: null,
      model: 'M',
      verified: false,
    }
    const real: Projection = { ...placeholder, id: 'r', modelValue: 100, verified: true }
    const result = rollUp([real, placeholder], 'base')
    expect(result.total).toBe(100)
    expect(result.included).toEqual(['r'])
    expect(result.excluded).toEqual([
      { id: 'p', value: 600, reason: 'unverified — not a real figure' },
    ])
  })

  it('excludes it from a subtotal too — a filtered roll-up is still a roll-up', () => {
    const rows: Projection[] = [
      { id: 'a', label: 'a', scenario: 'base', modelValue: 10, planValue: null, model: 'M', verified: true },
      { id: 'b', label: 'b', scenario: 'base', modelValue: 600, planValue: null, model: 'M', verified: false },
      { id: 'c', label: 'c', scenario: 'aggressive', modelValue: 99, planValue: null, model: 'M', verified: true },
    ]
    expect(rollUp(rows, 'base').total).toBe(10)
    expect(rollUp(rows, 'aggressive').total).toBe(99)
  })
})

describe('where a plan and a model disagree, the model governs and says so', () => {
  it('renders the model figure and records the plan figure beside it', () => {
    const g = governing({
      id: 'x',
      label: 'x',
      scenario: 'base',
      modelValue: 260351,
      planValue: 250000,
      model: 'MODEL-TOP5-001',
      verified: true,
    })
    expect(g.value).toBe(260351)
    expect(g.disagrees).toBe(true)
    expect(g.note).toContain('Plan states 250000')
    expect(g.note).toContain('model governs')
    expect(g.note).toContain('not been averaged')
    // Never the mean, never the plan.
    expect(g.value).not.toBe((260351 + 250000) / 2)
    expect(g.value).not.toBe(250000)
  })

  it('says nothing where they agree or where no plan figure exists', () => {
    const base = { id: 'x', label: 'x', scenario: 'base' as const, modelValue: 5, model: 'M', verified: true }
    expect(governing({ ...base, planValue: null }).disagrees).toBe(false)
    expect(governing({ ...base, planValue: 5 }).source).toBe('agreed')
  })
})

describe('the class A discrepancy is surfaced, not resolved', () => {
  it('renders twelve against nine with three unaccounted for', () => {
    const v = view()
    expect(v.text).toContain(
      '12 entries on the near-term revenue line against 9 declared Class A ventures · 3 unaccounted for',
    )
    expect(v.text).toContain('OPEN')
    v.unmount()
  })

  it('does not invent the twelve line labels to make the counts agree', () => {
    expect(seed.classARevenue.lines.length).toBe(12)
    expect(seed.classARevenue.lines.every((l) => l.label === null)).toBe(true)
    expect(seed.classARevenue.declaredCount).toBe(9)
  })
})

describe('the register and the capital position', () => {
  it('holds 51 ventures in the declared class distribution', () => {
    expect(seed.ventures.length).toBe(51)
    const byClass: Record<string, number> = {}
    for (const v of seed.ventures) byClass[v.class] = (byClass[v.class] ?? 0) + 1
    expect(byClass).toEqual({ A: 9, B: 16, C: 14, D: 11, E: 1 })
    for (const c of seed.classes) expect(byClass[c.code]).toBe(c.declared)
  })

  it('filters the register by class', () => {
    const v = view()
    const classD = Array.from(v.container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Class D (11)',
    )!
    click(classD)
    const rows = Array.from(v.container.querySelectorAll('.record')).filter(
      (r) => /^[A-E]-\d\d/.test(r.textContent ?? ''),
    )
    expect(rows.length).toBe(11)
    v.unmount()
  })

  it('reconciles the ask against its four tranches', () => {
    expect(seed.capital.ask).toBe(28500)
    expect(seed.capital.tranches.map((t) => t.amount)).toEqual([8500, 6000, 8000, 6000])
    expect(tranchesReconcile(seed.capital.ask, seed.capital.tranches)).toBe(true)
    expect(tranchesReconcile(28500, [{ amount: 1 }])).toBe(false)
  })

  it('locks every tranche until its event carries proof, and marks the unnamed ones defective', () => {
    const v = view()
    const rows = Array.from(v.container.querySelectorAll('.record')).filter(
      (r) => /^T-\d/.test(r.textContent ?? ''),
    )
    expect(rows.length).toBe(4)
    expect(rows.filter((r) => r.textContent!.includes('LOCKED')).length).toBe(2)
    expect(rows.filter((r) => r.textContent!.includes('DEFECTIVE')).length).toBe(2)
    for (const r of rows.filter((r) => r.textContent!.includes('DEFECTIVE'))) {
      expect(r.querySelector('button')!.hasAttribute('disabled')).toBe(true)
    }
    v.unmount()
  })
})

describe('the freeze', () => {
  it('locks the module but leaves the plans board readable', () => {
    const v = render(
      <ModuleBody module={ventures} surface="lane-a" status={frozen} />,
    )
    expect(v.text).toContain('Build freeze')
    expect(v.text).toContain('Plans')
    expect(v.text).toContain('Licensed practice plan and proposal')
    expect(v.text).not.toContain('Venture register')
    expect(v.text).not.toContain('Capital position')
    expect(v.text).not.toContain('Class A count discrepancy')
    v.unmount()
  })
})

describe('module 10 carries a changes ledger', () => {
  it('renders CL-001 onward with no edit or delete control', () => {
    const v = render(
      <ModuleBody module={compliance} surface="lane-a" status={open} />,
    )
    expect(v.text).toContain('Changes ledger')
    expect(v.text).toContain('CL-001')
    expect(v.text).toContain('CL-008')

    const panel = Array.from(v.container.querySelectorAll('.panel')).find((p) =>
      (p.textContent ?? '').includes('Changes ledger'),
    )!
    const labels = Array.from(panel.querySelectorAll('button')).map((b) =>
      (b.textContent ?? '').toLowerCase(),
    )
    for (const word of ['edit', 'delete', 'remove', 'amend']) {
      expect(labels.some((l) => l.includes(word))).toBe(false)
    }
    expect(panel.querySelector('input, textarea, select')).toBe(null)
    v.unmount()
  })
})
