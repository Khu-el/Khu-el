/**
 * Modules 09 and 11 acceptance.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import capability from '../src/modules/capability-services'
import knowledge from '../src/modules/knowledge-canon'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { save, setSurface } from '../src/core/storage'
import {
  FORECAST_CRITERIA,
  FORECAST_STAGE,
  advance,
  availability,
  blockedByProtocol,
  emptyCriteria,
  type Deal,
  type ServiceProduct,
} from '../src/modules/capability-services/pipeline'
import services from '../seed/capability-services.json'
import canon from '../seed/knowledge-canon.json'
import { render, click, typeInto, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const open = freezeStatus(weekWith(40))
const caps = () =>
  render(<ModuleBody module={capability} surface="lane-a" status={open} />)
const know = () =>
  render(<ModuleBody module={knowledge} surface="lane-a" status={open} />)

// ── Module 09 ─────────────────────────────────────────────────────────────

describe('stage five is a gate, not a label', () => {
  const deal = (criteria: Partial<Deal['criteria']> = {}): Deal => ({
    id: 'D-001',
    name: 'Test deal',
    stage: FORECAST_STAGE,
    criteria: { ...emptyCriteria(), ...criteria },
  })

  it('refuses to advance past five with three of four', () => {
    const d = deal({
      realProblem: true,
      realConsequence: true,
      identifiedStakeholder: true,
    })
    const result = advance(d, 10)
    expect(result.ok).toBe(false)
    expect(result.deal.stage).toBe(FORECAST_STAGE)
    expect(result.message).toContain('scheduledNextStep')
    expect(result.message).toContain('Three of four is not a forecast')
  })

  it('refuses with each single criterion missing', () => {
    for (const missing of FORECAST_CRITERIA) {
      const criteria = { ...emptyCriteria() }
      for (const c of FORECAST_CRITERIA) criteria[c] = c !== missing
      const result = advance(deal(criteria), 10)
      expect(result.ok, `missing ${missing}`).toBe(false)
      expect(result.message).toContain(missing)
    }
  })

  it('advances with all four', () => {
    const criteria = { ...emptyCriteria() }
    for (const c of FORECAST_CRITERIA) criteria[c] = true
    const result = advance(deal(criteria), 10)
    expect(result.ok).toBe(true)
    expect(result.deal.stage).toBe(FORECAST_STAGE + 1)
  })

  it('gates only stage five — the other transitions are free', () => {
    for (const stage of [1, 2, 3, 4, 6, 7, 8, 9]) {
      const result = advance({ ...deal(), stage }, 10)
      expect(result.ok, `stage ${stage}`).toBe(true)
    }
  })

  it('refuses in the UI and says which criteria are missing', () => {
    const v = caps()
    typeInto(
      v.container.querySelector<HTMLInputElement>('input[aria-label="Deal name"]')!,
      'A deal',
    )
    click(
      Array.from(v.container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Add deal',
      )!,
    )
    const advanceButton = () =>
      v.container.querySelector<HTMLButtonElement>('[data-advance="D-001"]')!
    // Stages 1 to 5 are free.
    for (let i = 0; i < 4; i++) click(advanceButton())
    expect(v.container.querySelector('[data-deal="D-001"]')!.textContent).toContain(
      `Stage ${FORECAST_STAGE} of 10`,
    )

    click(advanceButton())
    const message = v.container.querySelector('[data-stage-message="true"]')!
    expect(message.textContent).toContain('stays at stage 5')
    expect(v.container.querySelector('[data-deal="D-001"]')!.textContent).toContain(
      `Stage ${FORECAST_STAGE} of 10`,
    )

    for (const c of FORECAST_CRITERIA) {
      click(v.container.querySelector(`[data-criterion="${c}"]`)!)
    }
    click(advanceButton())
    expect(v.container.querySelector('[data-deal="D-001"]')!.textContent).toContain(
      'Stage 6 of 10',
    )
    v.unmount()
  })
})

describe('the separation protocol blocks across the set', () => {
  const product = (over: Partial<ServiceProduct> = {}): ServiceProduct => ({
    id: 'P',
    name: 'p',
    ladderPosition: 1,
    price: 1,
    entityRouting: 'X',
    adjacency: 'TOUCHES',
    scopeReviewed: true,
    exclusionsReached: [],
    ...over,
  })

  it('blocks every product it touches while unsigned', () => {
    expect(availability(product(), false).available).toBe(false)
    expect(availability(product(), true).available).toBe(true)
  })

  it('treats an unclassified product as touched', () => {
    const unknown = product({ adjacency: 'UNKNOWN' })
    expect(availability(unknown, false).available).toBe(false)
    expect(availability(unknown, false).blockedBy.join(' ')).toContain(
      'unclassified',
    )
  })

  it('is computed from the set, not marked per product', () => {
    const set = [
      product({ id: 'a' }),
      product({ id: 'b', adjacency: 'CLEAR' }),
      product({ id: 'c', adjacency: 'UNKNOWN' }),
    ]
    expect(blockedByProtocol(set, false)).toEqual(['a', 'c'])
    expect(blockedByProtocol(set, true)).toEqual([])
    // Adding a product changes the answer without any per-product edit.
    expect(blockedByProtocol([...set, product({ id: 'd' })], false)).toEqual([
      'a', 'c', 'd',
    ])
  })

  it('blocks a product reaching the excluded register, and does not unblock it on signature', () => {
    const drifting = product({ exclusionsReached: ['X-05'] })
    for (const signed of [false, true]) {
      const state = availability(drifting, signed)
      expect(state.available).toBe(false)
      expect(state.blockedBy.join(' ')).toContain('X-05')
      expect(state.blockedBy.join(' ')).toContain('a closed line')
    }
  })

  it('leaves every seeded product blocked, because none has been checked', () => {
    expect(services.protocol.signed).toBe(false)
    const v = caps()
    const blocked = Array.from(v.container.querySelectorAll('.record')).filter(
      (r) => /^SP-\d\d/.test(r.textContent ?? '') && r.textContent!.includes('BLOCKED'),
    )
    expect(blocked.length).toBe(services.products.length)
    expect(v.text).toContain(
      `${services.products.length} of ${services.products.length} service products are blocked`,
    )
    v.unmount()
  })

  it('has seven clauses and needs a proof to sign', () => {
    expect(services.protocol.clauses.length).toBe(7)
    expect(services.protocol.proof).toBe(null)
  })
})

// ── Module 11 ─────────────────────────────────────────────────────────────

describe('quarantined material is listed and nothing else', () => {
  it('has no preview, open, copy or download affordance on any row', () => {
    const v = know()
    const rows = Array.from(
      v.container.querySelectorAll('[data-quarantined="true"]'),
    )
    expect(rows.length).toBe(canon.quarantine.length)
    expect(rows.length).toBe(8)

    for (const row of rows) {
      expect(row.querySelector('button')).toBe(null)
      expect(row.querySelector('a')).toBe(null)
      expect(row.querySelector('input, textarea, select')).toBe(null)
      expect(row.querySelector('details, summary')).toBe(null)
      expect(row.querySelector('iframe, embed, object, img')).toBe(null)
      expect(row.querySelector('[href], [src], [download]')).toBe(null)
      expect(row.querySelector('[contenteditable]')).toBe(null)
      // Nothing focusable at all — the row cannot even be tabbed into.
      expect(row.querySelector('[tabindex]')).toBe(null)
      // No content smuggled into an attribute.
      expect(row.querySelector('[title]')).toBe(null)
    }
    v.unmount()
  })

  it('holds no field in the seed that could carry the material', () => {
    for (const q of canon.quarantine) {
      expect(Object.keys(q).sort()).toEqual(['exclusion', 'id', 'title', 'why'])
    }
  })
})

describe('recovery actions', () => {
  it('are unreachable until all three pass steps carry proof', () => {
    const v = know()
    const actions = Array.from(
      v.container.querySelectorAll<HTMLElement>('[data-recovery-action="true"]'),
    )
    expect(actions.length).toBe(canon.doctrinePass.actions.length)
    for (const action of actions) {
      const button = action.querySelector('button')!
      expect(button.hasAttribute('disabled')).toBe(true)
      expect(button.textContent).toBe('Blocked')
      expect(action.textContent).toContain('3 of 3 steps carry no proof')
    }
    v.unmount()
  })

  it('every recovery action sits inside the gate — there is no ungated one', () => {
    const v = know()
    for (const action of Array.from(
      v.container.querySelectorAll('[data-recovery-action="true"]'),
    )) {
      const panel = action.closest('.panel')!
      expect(panel.textContent).toContain('Doctrine pass')
    }
    v.unmount()
  })

  it('open once all three carry proof', () => {
    const data = structuredClone(canon) as unknown as {
      doctrinePass: { steps: { passed: boolean; proof: unknown }[] }
    }
    for (const step of data.doctrinePass.steps) {
      step.passed = true
      step.proof = {
        source: 'Doctrine review memo',
        reference: 'DR-001',
        obtained: '2026-08-30',
        verifiedBy: 'Operator',
      }
    }
    save('knowledge-canon', data)
    const v = know()
    for (const action of Array.from(
      v.container.querySelectorAll('[data-recovery-action="true"]'),
    )) {
      const button = action.querySelector('button')!
      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.textContent).toBe('Run')
    }
    v.unmount()
  })

  it('needs proof on each step, not just a checkbox', () => {
    const data = structuredClone(canon) as unknown as {
      doctrinePass: { steps: { passed: boolean; proof: unknown }[] }
    }
    // Passed, but with nothing behind it. Authoring is not evidence.
    for (const step of data.doctrinePass.steps) step.passed = true
    save('knowledge-canon', data)
    const v = know()
    for (const action of Array.from(
      v.container.querySelectorAll('[data-recovery-action="true"]'),
    )) {
      expect(action.querySelector('button')!.hasAttribute('disabled')).toBe(true)
    }
    v.unmount()
  })
})

describe('genuinely missing evidence', () => {
  it('renders MISSING, never pending', () => {
    expect(canon.missing.length).toBe(5)
    const v = know()
    for (const item of canon.missing) {
      expect(item.state).toBe('MISSING')
      const row = Array.from(v.container.querySelectorAll('.record')).find((r) =>
        (r.textContent ?? '').includes(item.id),
      )!
      expect(row.textContent).toContain('MISSING')
    }
    expect(v.text.toLowerCase()).toContain('missing, not pending')
    v.unmount()
  })
})
