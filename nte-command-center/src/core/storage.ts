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
  if (!activeSurface) {
    throw new Error(
      'storage used before setSurface(). A surface must be established ' +
        'before any read or write, or the firewall does not hold.',
    )
  }
  return `${PREFIX}:${activeSurface}:${key}`
}

export function load<T>(key: string, fallback: T): T {
  const k = namespaced(key)
  const raw = backing ? backing.getItem(k) : memory.get(k) ?? null
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
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
