/**
 * The Build Freeze Rule.
 *
 *   No build work in any week that missed 40 documented outbound contacts.
 *
 * Adopted as an absolute across the whole portfolio because the register held
 * 51 concepts, 80 course entries, 185 deliverables, 6 plans and 857 model
 * formulas against zero confirmed closed revenue events. The rule exists to
 * stop that inversion, so it has no override, no dev-mode escape, and no
 * settings toggle. Do not add one.
 *
 * What is never build work, and therefore never locked:
 *   selling · signatures · conditions precedent · register review · governance
 */

import { load, save } from './storage'

export const CONTACT_THRESHOLD = 40

export interface ContactWeek {
  /** ISO date of the Monday. */
  weekOf: string
  /** Documented outbound contacts. Documented means logged, not remembered. */
  count: number
}

export interface FreezeState {
  weeks: ContactWeek[]
}

/**
 * Held across every surface on purpose. See storage.CROSS_SURFACE: one rule,
 * one counter, no way to reset it by switching surfaces.
 */
export const FREEZE_KEY = 'build-freeze'

export function loadFreeze(): FreezeState {
  return load<FreezeState>(FREEZE_KEY, { weeks: [] })
}

export function saveFreeze(state: FreezeState): void {
  save(FREEZE_KEY, state)
}

export function mondayOf(d: Date): string {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy.toISOString().slice(0, 10)
}

export function currentWeek(state: FreezeState, now = new Date()): ContactWeek {
  const weekOf = mondayOf(now)
  return state.weeks.find((w) => w.weekOf === weekOf) ?? { weekOf, count: 0 }
}

export interface FreezeStatus {
  count: number
  threshold: number
  /** true when build-work modules are locked. */
  frozen: boolean
  shortfall: number
  weekOf: string
}

export function freezeStatus(
  state: FreezeState,
  now = new Date(),
): FreezeStatus {
  const week = currentWeek(state, now)
  const shortfall = Math.max(0, CONTACT_THRESHOLD - week.count)
  return {
    count: week.count,
    threshold: CONTACT_THRESHOLD,
    frozen: week.count < CONTACT_THRESHOLD,
    shortfall,
    weekOf: week.weekOf,
  }
}

/**
 * The only question the rest of the app asks. A module that declares
 * buildWork: false is never locked, whatever the count.
 */
export function isModuleLocked(
  buildWork: boolean,
  status: FreezeStatus,
): boolean {
  return buildWork && status.frozen
}

/** Log contacts for the current week. Counts only go up within a week. */
export function logContacts(
  state: FreezeState,
  added: number,
  now = new Date(),
): FreezeState {
  if (added <= 0) return state
  const weekOf = mondayOf(now)
  const existing = state.weeks.find((w) => w.weekOf === weekOf)
  const weeks = existing
    ? state.weeks.map((w) =>
        w.weekOf === weekOf ? { ...w, count: w.count + added } : w,
      )
    : [...state.weeks, { weekOf, count: added }]
  return { weeks }
}

/** Copy for the freeze stamp. Plain, no scolding, states the way out. */
export function freezeMessage(status: FreezeStatus): string {
  return (
    `Build work is closed this week. ${status.count} of ${status.threshold} ` +
    `documented contacts logged — ${status.shortfall} to go. ` +
    `Selling, signatures, conditions precedent and register review stay open.`
  )
}
