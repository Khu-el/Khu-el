/**
 * Local-first storage. localStorage when available, in-memory otherwise —
 * private browsing and locked-down iOS home-screen contexts both drop it.
 *
 * Keys are namespaced per surface. A Lane B key is not readable by a Lane A
 * module even in the same browser profile, which keeps the firewall true at
 * the persistence layer and not only in the UI.
 */

import type { Surface } from './types'

const PREFIX = 'ccenter'
let activeSurface: Surface | null = null

/**
 * Keys that are deliberately NOT namespaced by surface.
 *
 * There is exactly one, and it is the contact counter behind the build freeze.
 * The freeze is a single rule across the whole portfolio; a counter per
 * surface would mean switching surfaces resets it, which is a bypass, and a
 * gate with a bypass is not a gate. It is also required by § 04, whose two
 * instances must read the same underlying count.
 *
 * What crosses is a week date and an integer. No record, no name, no
 * vocabulary, nothing a surface could read the other's content from. Adding a
 * second entry to this set is a firewall change and needs the same scrutiny as
 * one — see docs/SPEC-CHANGES.md SC-03.
 */
const CROSS_SURFACE: ReadonlySet<string> = new Set(['build-freeze'])

const memory = new Map<string, string>()

let backing: Storage | null = null
try {
  const probe = '__ccenter_probe__'
  window.localStorage.setItem(probe, '1')
  window.localStorage.removeItem(probe)
  backing = window.localStorage
} catch {
  backing = null
}

export function setSurface(surface: Surface): void {
  activeSurface = surface
}

function namespaced(key: string): string {
  if (CROSS_SURFACE.has(key)) return `${PREFIX}:shared:${key}`
  if (!activeSurface) {
    throw new Error(
      'storage used before setSurface(). A surface must be established ' +
        'before any read or write, or the firewall does not hold.',
    )
  }
  return `${PREFIX}:${activeSurface}:${key}`
}

/**
 * Does a stored value still have the shape the module expects?
 *
 * `load` only parsed JSON and handed back the result, so a syntactically valid
 * value of the wrong shape reached the module and threw on first render —
 * `data.commands.filter(...)` on a value with no `commands`. That is worse than
 * a normal crash here: after first load the stored value wins, and the
 * `Reset to seed` control lives inside the module that will not render, so the
 * module is unrecoverable without developer tools.
 *
 * The check is deliberately shallow. It asks whether the top-level keys the
 * module reads are present and of the right broad kind, not whether every row
 * is well formed. A deep schema would be a second description of the seed, and
 * two descriptions drift.
 */
export function hasShape(
  value: unknown,
  shape: Record<string, 'array' | 'object' | 'string' | 'number' | 'boolean'>,
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  for (const [key, kind] of Object.entries(shape)) {
    const actual = row[key]
    if (kind === 'array' && !Array.isArray(actual)) return false
    if (kind === 'object' && (!actual || typeof actual !== 'object' || Array.isArray(actual))) {
      return false
    }
    if (kind !== 'array' && kind !== 'object' && typeof actual !== kind) return false
  }
  return true
}

/**
 * Read a value, or the fallback.
 *
 * `isValid` is checked against the stored value before it is returned. A stored
 * value that fails it is discarded in favour of the fallback and left in place
 * for inspection — the same treatment as a corrupt one, for the same reason.
 */
export function load<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  const k = namespaced(key)
  // Memory first. `save` falls back to memory when setItem throws — quota, or
  // private mode — and this read used to consult only `backing` whenever
  // `backing` existed, so a fallback write was silently unreadable and the
  // change disappeared on the next load.
  const raw = memory.get(k) ?? backing?.getItem(k) ?? null
  if (raw == null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isValid && !isValid(parsed)) return fallback
    return parsed as T
  } catch {
    // Corrupt value. Return the fallback rather than crashing the surface,
    // and leave the bad value in place for inspection.
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  const k = namespaced(key)
  const raw = JSON.stringify(value)
  if (backing) {
    try {
      backing.setItem(k, raw)
      // Drop any earlier fallback copy, or it would shadow this one forever.
      memory.delete(k)
      return
    } catch {
      // Quota or private mode. Fall through to memory.
    }
  }
  memory.set(k, raw)
}

export function clear(key: string): void {
  const k = namespaced(key)
  backing?.removeItem(k)
  memory.delete(k)
}

/** Restore a module to its seed. Every module exposes this control. */
export function resetToSeed(keys: string[]): void {
  keys.forEach(clear)
}

export function isPersistent(): boolean {
  return backing !== null
}
