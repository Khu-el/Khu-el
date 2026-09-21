/**
 * Module 10's dependency graph, and the out-of-order clear it now refuses.
 *
 * Raised by review on PR #4. Both defects confirmed against the delivered seed
 * before fixing: nine edges were recorded in one direction only, and
 * clearCondition set cleared:true the moment a proof arrived without consulting
 * dependsOn at all.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import compliance from '../src/modules/compliance-cp'
import {
  asymmetries,
  canClearCondition,
  derivedDependsOn,
  openBlockers,
  typeBreakdown,
} from '../src/modules/compliance-cp/edges'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import type { ConditionPrecedent } from '../src/core/types'
import cpSeed from '../seed/compliance.json'
import { render, click, typeInto, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const conditions = cpSeed.conditions as unknown as ConditionPrecedent[]

const cp = (over: Partial<ConditionPrecedent>): ConditionPrecedent => ({
  id: 'Q-X',
  aliases: [],
  title: 't',
  critical: false,
  type: 'administrative',
  blocks: [],
  dependsOn: [],
  cleared: false,
  opened: '2026-01-01',
  ...over,
})

describe('the edge set is derived from both directions', () => {
  it('reads an edge declared only as blocks', () => {
    const set = derivedDependsOn([
      cp({ id: 'A', blocks: ['B'] }),
      cp({ id: 'B' }),
    ])
    expect(set.get('B')).toEqual(['A'])
  })

  it('reads an edge declared only as dependsOn', () => {
    const set = derivedDependsOn([
      cp({ id: 'A' }),
      cp({ id: 'B', dependsOn: ['A'] }),
    ])
    expect(set.get('B')).toEqual(['A'])
  })

  it('does not duplicate an edge declared from both ends', () => {
    const set = derivedDependsOn([
      cp({ id: 'A', blocks: ['B'] }),
      cp({ id: 'B', dependsOn: ['A'] }),
    ])
    expect(set.get('B')).toEqual(['A'])
  })

  it('gives every blocked condition in the real seed a non-empty wait set', () => {
    const set = derivedDependsOn(conditions)
    for (const c of conditions) {
      for (const blocked of c.blocks) {
        // Previously these rendered as "waits on nothing".
        expect(set.get(blocked) ?? [], `${blocked} blocked by ${c.id}`).toContain(c.id)
      }
    }
  })
})

describe('the register disagrees with itself, and says so', () => {
  it('finds the nine one-directional edges in the delivered seed', () => {
    const found = asymmetries(conditions)
    expect(found).toHaveLength(9)
    expect(found.filter((a) => a.declaredIn === 'blocks')).toHaveLength(7)
    expect(found.filter((a) => a.declaredIn === 'dependsOn')).toHaveLength(2)
  })

  it('reports none when both ends agree', () => {
    expect(
      asymmetries([cp({ id: 'A', blocks: ['B'] }), cp({ id: 'B', dependsOn: ['A'] })]),
    ).toEqual([])
  })

  it('renders the finding rather than papering over it', () => {
    const v = render(
      <ModuleBody module={compliance} surface="lane-a" status={freezeStatus(weekWith(0))} />,
    )
    expect(v.text).toContain('9 dependency edges are recorded in one direction only')
    expect(v.text).toContain('that is not reconciled here')
    v.unmount()
  })
})

describe('a condition cannot clear ahead of what it waits on', () => {
  it('refuses while a blocker is open, and names it', () => {
    const set = [
      cp({ id: 'A', blocks: ['B'] }),
      cp({ id: 'B' }),
    ]
    expect(openBlockers(set, 'B')).toEqual(['A'])
    const decision = canClearCondition(set, 'B')
    expect(decision.ok).toBe(false)
    expect(decision.blockers).toEqual(['A'])
    expect(decision.message).toContain('B waits on A')
    expect(decision.message).toContain('cannot clear ahead of')
  })

  it('permits it once the blocker has cleared', () => {
    const set = [
      cp({ id: 'A', blocks: ['B'], cleared: true }),
      cp({ id: 'B' }),
    ]
    expect(openBlockers(set, 'B')).toEqual([])
    expect(canClearCondition(set, 'B').ok).toBe(true)
  })

  it('enforces an edge the blocked row never declared', () => {
    // Q-11 has dependsOn: [] and is blocked by Q-01. Before the derivation it
    // had no blockers at all and cleared freely.
    expect(conditions.find((c) => c.id === 'Q-11')!.dependsOn).toEqual([])
    expect(openBlockers(conditions, 'Q-11')).toContain('Q-01')
    expect(canClearCondition(conditions, 'Q-11').ok).toBe(false)
  })

  it('disables the proof control on a blocked row in the UI', () => {
    const v = render(
      <ModuleBody module={compliance} surface="lane-a" status={freezeStatus(weekWith(0))} />,
    )
    // Q-05 waits on Q-01, which is open.
    const row = Array.from(v.container.querySelectorAll('.record')).find(
      (r) => (r.textContent ?? '').startsWith('Q-05'),
    )!
    expect(row.textContent).toContain('waits on Q-01')
    const button = row.querySelector('button')!
    expect(button.hasAttribute('disabled')).toBe(true)
    v.unmount()
  })

  it('still allows a clear on an unblocked row, with proof', () => {
    const v = render(
      <ModuleBody module={compliance} surface="lane-a" status={freezeStatus(weekWith(0))} />,
    )
    // Q-01 waits on nothing.
    expect(openBlockers(conditions, 'Q-01')).toEqual([])
    const row = Array.from(v.container.querySelectorAll('.record')).find(
      (r) => (r.textContent ?? '').startsWith('Q-01'),
    )!
    const button = row.querySelector('button')!
    expect(button.hasAttribute('disabled')).toBe(false)
    click(button)
    const inputs = v.container.querySelectorAll<HTMLInputElement>('input')
    typeInto(inputs[0]!, 'Written response')
    typeInto(inputs[1]!, 'REF-1')
    typeInto(inputs[2]!, 'Operator')
    click(
      Array.from(v.container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Clear condition',
      )!,
    )
    expect(v.container.querySelector('[data-clear-refusal="true"]')).toBe(null)
    v.unmount()
  })
})

describe('the critical panel describes the rows it introduces', () => {
  it('derives the type breakdown instead of stating a fixed count', () => {
    const v = render(
      <ModuleBody module={compliance} surface="lane-a" status={freezeStatus(weekWith(0))} />,
    )
    const open = conditions.filter((c) => c.critical && !c.cleared)
    expect(v.text).toContain(`${open.length} open, by type ${typeBreakdown(open)}`)
    // The old sentence claimed six, five administrative and one drafting.
    expect(v.text).not.toContain('Five are administrative and one is drafting')
    v.unmount()
  })

  it('counts by type from the data', () => {
    expect(
      typeBreakdown([
        cp({ type: 'administrative' }),
        cp({ type: 'administrative' }),
        cp({ type: 'drafting' }),
      ]),
    ).toBe('2 administrative, 1 drafting')
  })
})
