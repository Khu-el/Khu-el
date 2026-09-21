/**
 * Module 10 · the dependency graph, derived rather than transcribed.
 *
 * `types.ts` documents `dependsOn` as "Q-ids that must clear first" and
 * `blocks` as "Q-ids this condition blocks". The two arrays describe the same
 * edge from opposite ends, and in the delivered seed most edges appear in only
 * one of them — nine of them, counted by `asymmetries` below.
 *
 * That mattered, because the panel rendered each row's `dependsOn` as
 * "waits on …". A condition another row blocks therefore rendered as waiting
 * on nothing, which is the false-cleared shape this register exists to prevent.
 *
 * So the graph is derived from both directions and the union governs. That is
 * not inventing data: both arrays are statements about the same edge set, and
 * the union is that set. The asymmetry is still reported, because a register
 * that disagrees with itself is a finding about the register.
 */

import type { ConditionPrecedent } from '../../core/types'

export interface Asymmetry {
  from: string
  to: string
  /** Which array carries the edge, so the missing side is nameable. */
  declaredIn: 'blocks' | 'dependsOn'
}

/** Every edge, from both directions. Keyed by the id that must wait. */
export function derivedDependsOn(
  conditions: ConditionPrecedent[],
): Map<string, string[]> {
  const waits = new Map<string, Set<string>>()
  const add = (waiter: string, blocker: string) => {
    if (waiter === blocker) return
    if (!waits.has(waiter)) waits.set(waiter, new Set())
    waits.get(waiter)!.add(blocker)
  }

  for (const c of conditions) {
    for (const blocker of c.dependsOn) add(c.id, blocker)
    for (const waiter of c.blocks) add(waiter, c.id)
  }

  return new Map(
    [...waits].map(([id, set]) => [id, [...set].sort()] as [string, string[]]),
  )
}

/** Edges present in one array and absent from its mirror. */
export function asymmetries(conditions: ConditionPrecedent[]): Asymmetry[] {
  const byId = new Map(conditions.map((c) => [c.id, c]))
  const found: Asymmetry[] = []

  for (const c of conditions) {
    for (const to of c.blocks) {
      if (!byId.get(to)?.dependsOn.includes(c.id)) {
        found.push({ from: c.id, to, declaredIn: 'blocks' })
      }
    }
    for (const on of c.dependsOn) {
      if (!byId.get(on)?.blocks.includes(c.id)) {
        found.push({ from: c.id, to: on, declaredIn: 'dependsOn' })
      }
    }
  }
  return found
}

/** The derived blockers of one condition that have not cleared. */
export function openBlockers(
  conditions: ConditionPrecedent[],
  id: string,
): string[] {
  const byId = new Map(conditions.map((c) => [c.id, c]))
  return (derivedDependsOn(conditions).get(id) ?? []).filter(
    (blocker) => !byId.get(blocker)?.cleared,
  )
}

export interface ClearDecision {
  ok: boolean
  blockers: string[]
  message: string
}

/**
 * May this condition be cleared?
 *
 * The proof requirement stops an unevidenced clear. It does not stop an
 * out-of-order one: `clearCondition` used to set `cleared: true` the moment a
 * proof arrived, so Q-05 could clear while Q-01 — which it waits on — was
 * still open, and the reconciled register then showed it CLEARED. A hold
 * written into a structured field is only a hold if something checks it.
 */
export function canClearCondition(
  conditions: ConditionPrecedent[],
  id: string,
): ClearDecision {
  const target = conditions.find((c) => c.id === id)
  if (!target) {
    return { ok: false, blockers: [], message: `No condition ${id}.` }
  }
  const blockers = openBlockers(conditions, id)
  if (blockers.length > 0) {
    return {
      ok: false,
      blockers,
      message:
        `${id} waits on ${blockers.join(', ')}. Clear those first — a ` +
        `condition cannot clear ahead of what must clear before it.`,
    }
  }
  return { ok: true, blockers: [], message: `${id} may be cleared.` }
}

/** The critical set's composition, for a sentence that cannot drift. */
export function typeBreakdown(conditions: ConditionPrecedent[]): string {
  const counts = new Map<string, number>()
  for (const c of conditions) {
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, n]) => `${n} ${type}`)
    .join(', ')
}
